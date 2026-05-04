import type { Edge } from "../model/edges";
import {
  asActionNodeId,
  asEdgeId,
  asMediaNodeId,
  asSatelliteNodeId,
  asSceneNodeId,
  type ActionNodeId,
  type AnyNodeId,
  type MediaNodeId,
  type SatelliteNodeId,
  type SceneBoxNodeId,
  type SceneNodeId,
} from "../model/ids";
import type { NodeLayout } from "../model/layout";
import type { ActionNode, MediaNode, SatelliteNode, SceneBoxNode, SceneNode } from "../model/nodes";
import type { NodalProject } from "../model/project";
import { attachMediaToMetaSource } from "./mediaMetaLayout";
import { sboxIdFromScene } from "./reconcileSceneBoxes";
import { absoluteFlowPositionInPane, buildChildrenByParent, collectDescendantNodeIds } from "../view/nesting/containerBounds";

export type ClipboardSubgraph = {
  scenes: Record<string, SceneNode>;
  sceneBoxes: Record<string, SceneBoxNode>;
  actions: Record<string, ActionNode>;
  satellites: Record<string, SatelliteNode>;
  media: Record<string, MediaNode>;
  edges: Edge[];
  layout: Record<string, NodeLayout>;
  /** Coin supérieur gauche du bloc collé (positions absolues flow au moment de la copie). */
  originAbs: { x: number; y: number };
};

let runtimeClipboard: ClipboardSubgraph | null = null;

export function getNodalClipboard(): ClipboardSubgraph | null {
  return runtimeClipboard;
}

export function setNodalClipboard(c: ClipboardSubgraph | null): void {
  runtimeClipboard = c;
}

export function isNodalClipboardEmpty(): boolean {
  return runtimeClipboard == null;
}

function deepClone<T>(v: T): T {
  return typeof structuredClone === "function" ? structuredClone(v) : (JSON.parse(JSON.stringify(v)) as T);
}

/** État minimal pour `absoluteFlowPositionInPane` sur le sous-graphe copié. */
function clipAsProject(clip: ClipboardSubgraph): NodalProject {
  return {
    meta: {
      title: "",
      startSceneId: null,
      viewport: { x: 0, y: 0, zoom: 1 },
      draftActionIds: [],
      objects: {},
    },
    scenes: clip.scenes as NodalProject["scenes"],
    sceneBoxes: clip.sceneBoxes as NodalProject["sceneBoxes"],
    actions: clip.actions as NodalProject["actions"],
    satellites: clip.satellites as NodalProject["satellites"],
    media: clip.media as NodalProject["media"],
    edges: clip.edges,
    layout: clip.layout as NodalProject["layout"],
  };
}

/**
 * Clôture des nœuds à copier : descendants `layout`, chaîne récompense REQ/PWD,
 * médias liés par edge `meta`, pod scène complète si une scène est dans la sélection.
 */
export function expandClipboardNodeIds(state: NodalProject, roots: AnyNodeId[]): Set<AnyNodeId> {
  const ch = buildChildrenByParent(state);
  const ids = new Set<AnyNodeId>();
  const pushDesc = (root: AnyNodeId) => {
    for (const d of collectDescendantNodeIds(root, ch)) ids.add(d);
  };

  for (const r of roots) {
    ids.add(r);
    if (r in state.scenes) {
      const bid = sboxIdFromScene(r as SceneNodeId);
      ids.add(bid);
      pushDesc(bid);
    } else {
      pushDesc(r);
    }
  }

  for (const e of state.edges) {
    if (e.family !== "meta") continue;
    if (ids.has(e.sourceId) && e.targetId in state.media) ids.add(e.targetId as AnyNodeId);
  }

  for (const aid of [...ids]) {
    if (!(aid in state.actions)) continue;
    const act = state.actions[aid as ActionNodeId];
    if (
      (act.actionType === "req" || act.actionType === "pwd") &&
      act.rewardActionId &&
      !ids.has(act.rewardActionId)
    ) {
      const rid = act.rewardActionId;
      ids.add(rid);
      pushDesc(rid);
    }
  }

  return ids;
}

function isRootInClipboard(ids: Set<AnyNodeId>, id: AnyNodeId, layout: Record<string, NodeLayout>): boolean {
  const p = layout[id]?.parentId;
  return p == null || !ids.has(p);
}

function computeOriginAbs(state: NodalProject, ids: Set<AnyNodeId>): { x: number; y: number } {
  let minX = Infinity;
  let minY = Infinity;
  for (const id of ids) {
    if (!state.layout[id]) continue;
    if (!isRootInClipboard(ids, id, state.layout as Record<string, NodeLayout>)) continue;
    const abs = absoluteFlowPositionInPane(state, id);
    minX = Math.min(minX, abs.x);
    minY = Math.min(minY, abs.y);
  }
  if (!Number.isFinite(minX)) return { x: 0, y: 0 };
  return { x: minX, y: minY };
}

function filterInternalEdges(state: NodalProject, ids: Set<AnyNodeId>): Edge[] {
  return state.edges.filter((e) => ids.has(e.sourceId) && ids.has(e.targetId));
}

export function buildClipboard(state: NodalProject, nodeIds: AnyNodeId[]): ClipboardSubgraph | null {
  const roots = [...new Set(nodeIds.map(String))] as AnyNodeId[];
  if (roots.length === 0) return null;
  const ids = expandClipboardNodeIds(state, roots);
  const layout: Record<string, NodeLayout> = {};
  const scenes: Record<string, SceneNode> = {};
  const sceneBoxes: Record<string, SceneBoxNode> = {};
  const actions: Record<string, ActionNode> = {};
  const satellites: Record<string, SatelliteNode> = {};
  const media: Record<string, MediaNode> = {};

  for (const id of ids) {
    const lo = state.layout[id];
    if (lo) layout[String(id)] = deepClone(lo);
    if (id in state.scenes) scenes[String(id)] = deepClone(state.scenes[id as SceneNodeId]);
    if (id in state.sceneBoxes) sceneBoxes[String(id)] = deepClone(state.sceneBoxes[id as SceneBoxNodeId]);
    if (id in state.actions) actions[String(id)] = deepClone(state.actions[id as ActionNodeId]);
    if (id in state.satellites) satellites[String(id)] = deepClone(state.satellites[id as SatelliteNodeId]);
    if (id in state.media) media[String(id)] = deepClone(state.media[id as MediaNodeId]);
  }

  const edges = deepClone(filterInternalEdges(state, ids));
  const originAbs = computeOriginAbs(state, ids);

  return { scenes, sceneBoxes, actions, satellites, media, edges, layout, originAbs };
}

function insertionOrder(ids: Set<AnyNodeId>, layout: Record<string, NodeLayout>): AnyNodeId[] {
  const remaining = new Set(ids);
  const order: AnyNodeId[] = [];
  while (remaining.size) {
    const layer: AnyNodeId[] = [];
    for (const id of remaining) {
      const p = layout[String(id)]?.parentId as AnyNodeId | null | undefined;
      if (p == null || !remaining.has(p)) layer.push(id);
    }
    if (layer.length === 0) {
      order.push(...remaining);
      break;
    }
    for (const id of layer) {
      remaining.delete(id);
      order.push(id);
    }
  }
  return order;
}

function uniqueSceneExternalId(state: NodalProject, base: string): string {
  const used = new Set(Object.values(state.scenes).map((s) => s.sceneId));
  if (!used.has(base)) return base;
  let n = 1;
  let candidate = `${base}_copy_${n}`;
  while (used.has(candidate)) {
    n += 1;
    candidate = `${base}_copy_${n}`;
  }
  return candidate;
}

export type PasteClipboardResult = {
  project: NodalProject;
  newIds: AnyNodeId[];
};

/**
 * Fusionne une copie dans `state` avec nouveaux IDs. `nextAutoId` aligné sur le store (`act-1`, etc.).
 */
export function pasteClipboard(
  state: NodalProject,
  clipboard: ClipboardSubgraph,
  pasteAbs: { x: number; y: number },
  nextAutoId: (prefix: string) => string
): PasteClipboardResult {
  const clip = clipboard;
  const clipState = clipAsProject(clip);
  const ids = new Set(
    [
      ...Object.keys(clip.scenes),
      ...Object.keys(clip.sceneBoxes),
      ...Object.keys(clip.actions),
      ...Object.keys(clip.satellites),
      ...Object.keys(clip.media),
    ] as AnyNodeId[]
  );

  const idMap = new Map<AnyNodeId, AnyNodeId>();

  for (const sid of Object.keys(clip.scenes) as SceneNodeId[]) {
    idMap.set(sid, asSceneNodeId(nextAutoId("scn")));
  }
  for (const bid of Object.keys(clip.sceneBoxes) as SceneBoxNodeId[]) {
    const oldScene = clip.sceneBoxes[bid]!.sceneId;
    const newScene = idMap.get(oldScene as AnyNodeId);
    if (!newScene) continue;
    idMap.set(bid, sboxIdFromScene(newScene as SceneNodeId));
  }
  for (const aid of Object.keys(clip.actions)) {
    idMap.set(aid as AnyNodeId, asActionNodeId(nextAutoId("act")));
  }
  for (const mid of Object.keys(clip.media)) {
    idMap.set(mid as AnyNodeId, asMediaNodeId(nextAutoId("media")));
  }
  for (const sid of Object.keys(clip.satellites)) {
    idMap.set(sid as AnyNodeId, asSatelliteNodeId(nextAutoId("sat")));
  }

  const dx = pasteAbs.x - clip.originAbs.x;
  const dy = pasteAbs.y - clip.originAbs.y;
  const newAbsByOld = new Map<AnyNodeId, { x: number; y: number }>();
  for (const id of ids) {
    const abs = absoluteFlowPositionInPane(clipState, id);
    newAbsByOld.set(id, { x: abs.x + dx, y: abs.y + dy });
  }

  const newScenes: NodalProject["scenes"] = { ...state.scenes };
  const newBoxes: NodalProject["sceneBoxes"] = { ...state.sceneBoxes };
  const newActions: NodalProject["actions"] = { ...state.actions };
  const newSats: NodalProject["satellites"] = { ...state.satellites };
  const newMedia: NodalProject["media"] = { ...state.media };
  const newLayout: NodalProject["layout"] = { ...state.layout };
  const newEdges: Edge[] = [...state.edges];

  const ordered = insertionOrder(ids, clip.layout as Record<string, NodeLayout>);

  for (const oldId of ordered) {
    const nid = idMap.get(oldId)!;
    const lo = clip.layout[String(oldId)];
    if (!lo) continue;
    const pOld = lo.parentId as AnyNodeId | null | undefined;
    const pNew = pOld && idMap.has(pOld) ? (idMap.get(pOld)! as AnyNodeId) : null;
    const na = newAbsByOld.get(oldId)!;
    if (pNew == null) {
      newLayout[nid] = { ...lo, x: na.x, y: na.y, parentId: null };
    } else {
      const pNa = newAbsByOld.get(pOld!)!;
      newLayout[nid] = {
        ...lo,
        x: na.x - pNa.x,
        y: na.y - pNa.y,
        parentId: pNew,
      };
    }
  }

  const newIds: AnyNodeId[] = [];

  for (const sid of Object.keys(clip.scenes) as SceneNodeId[]) {
    const node = deepClone(clip.scenes[sid]);
    const nid = idMap.get(sid)! as SceneNodeId;
    node.id = nid;
    const ext = uniqueSceneExternalId(state, node.sceneId);
    node.sceneId = ext;
    newScenes[nid] = node;
    newIds.push(nid);
  }

  for (const bid of Object.keys(clip.sceneBoxes) as SceneBoxNodeId[]) {
    const box = deepClone(clip.sceneBoxes[bid]);
    const nid = idMap.get(bid)! as SceneBoxNodeId;
    const oldScene = box.sceneId;
    box.id = nid;
    box.sceneId = idMap.get(oldScene as AnyNodeId)! as SceneNodeId;
    newBoxes[nid] = box;
    newIds.push(nid);
  }

  for (const aid of Object.keys(clip.actions)) {
    const node = deepClone(clip.actions[aid as ActionNodeId]);
    const nid = idMap.get(aid as AnyNodeId)! as ActionNodeId;
    node.id = nid;
    if ((node.actionType === "req" || node.actionType === "pwd") && node.rewardActionId) {
      const r = idMap.get(node.rewardActionId as AnyNodeId);
      node.rewardActionId = r ? (r as ActionNodeId) : null;
    }
    newActions[nid] = node;
    newIds.push(nid);
  }

  for (const sid of Object.keys(clip.satellites) as SatelliteNodeId[]) {
    const node = deepClone(clip.satellites[sid]);
    const nid = idMap.get(sid as AnyNodeId)! as SatelliteNodeId;
    node.id = nid;
    newSats[nid] = node;
    newIds.push(nid);
  }

  for (const mid of Object.keys(clip.media) as MediaNodeId[]) {
    const node = deepClone(clip.media[mid]);
    const nid = idMap.get(mid as AnyNodeId)! as MediaNodeId;
    node.id = nid;
    newMedia[nid] = node;
    newIds.push(nid);
  }

  for (const e of clip.edges) {
    const ns = idMap.get(e.sourceId as AnyNodeId)!;
    const nt = idMap.get(e.targetId as AnyNodeId)!;
    const newId = asEdgeId(nextAutoId("edge"));
    const ne: Edge =
      e.family === "flow"
        ? { ...e, id: newId, sourceId: ns, targetId: nt }
        : e.family === "transition"
          ? { ...e, id: newId, sourceId: ns, targetId: nt }
          : { ...e, id: newId, sourceId: ns, targetId: nt };
    newEdges.push(ne);
  }

  const project: NodalProject = {
    ...state,
    scenes: newScenes,
    sceneBoxes: newBoxes,
    actions: newActions,
    satellites: newSats,
    media: newMedia,
    layout: newLayout,
    edges: newEdges,
  };

  for (const e of clip.edges) {
    if (e.family !== "meta") continue;
    const ns = idMap.get(e.sourceId as AnyNodeId)!;
    const nt = idMap.get(e.targetId as AnyNodeId)! as MediaNodeId;
    if (project.layout[nt]?.parentId == null) {
      attachMediaToMetaSource(project, ns, nt);
    }
  }

  return { project, newIds };
}
