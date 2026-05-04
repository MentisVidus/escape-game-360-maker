import {
  asActionNodeId,
  asEdgeId,
  asMediaNodeId,
  type ActionNodeId,
  type AnyNodeId,
  type MediaNodeId,
  type SceneNodeId,
} from "../model/ids";
import type { FlowEdge } from "../model/edges";
import type { ActionNode, MediaNode, SceneNode } from "../model/nodes";
import type { NodalProject } from "../model/project";
import { stableSceneNodeIdFromExternal } from "../serialize/fromProjectJson";
import { absoluteFlowPositionInPane, computeContainerBounds, reanchorSBox } from "../view/nesting/containerBounds";
import { findDeepestDropContainer } from "./dropContainerResolve";
import { reconcileAutoSatellites } from "./reconcileAutoSatellites";
import { reconcileSceneBoxes, sboxIdFromScene } from "./reconcileSceneBoxes";

/** Ré-export tests / appels externes (C9.2). */
export { findDeepestDropContainer, findSceneBoxAtFlowPoint, rewardZoneFlowRect } from "./dropContainerResolve";

/** MIME JSON palette → canvas (C9.1, Q-C9.1-1). */
export const PALETTE_DRAG_MIME = "application/escape360-nodal-palette+json";

export type PaletteInsertSpec =
  | { kind: "scene" }
  | { kind: "action"; actionType: ActionNode["actionType"] }
  | { kind: "media"; mediaType: MediaNode["mediaType"] };

export type InsertNodeAtAbsoluteOpts = {
  /** Palette ou collage (C9.2+ pourra diverger). */
  source: "palette" | "clipboard";
};

const ACTION_TYPES = new Set<ActionNode["actionType"]>(["msg", "pick", "goto", "selector", "req", "pwd"]);

export function encodePaletteDragPayload(spec: PaletteInsertSpec): string {
  return JSON.stringify(spec);
}

export function decodePaletteDragPayload(json: string): PaletteInsertSpec | null {
  if (!json || !json.trim()) return null;
  try {
    const v = JSON.parse(json) as { kind?: string; actionType?: string; mediaType?: string };
    if (v?.kind === "scene") return { kind: "scene" };
    if (v?.kind === "action" && v.actionType && ACTION_TYPES.has(v.actionType as ActionNode["actionType"])) {
      return { kind: "action", actionType: v.actionType as ActionNode["actionType"] };
    }
    if (v?.kind === "media" && (v.mediaType === "media-image" || v.mediaType === "media-audio")) {
      return { kind: "media", mediaType: v.mediaType as MediaNode["mediaType"] };
    }
  } catch {
    /* ignore */
  }
  return null;
}

const sfxDefault = { url: "", volume: 1 };
const visibilityDefault = { requiresItem: "", hiddenIfHasItem: "", clickWhenInvisible: true };

function buildActionNode(id: ActionNodeId, actionType: ActionNode["actionType"]): ActionNode {
  const base = {
    id,
    nodeType: "action" as const,
    actionType,
    label: actionType.toUpperCase(),
    sfx: { ...sfxDefault },
    visibility: { ...visibilityDefault },
  };
  if (actionType === "msg") {
    return { ...base, actionType, payload: { copy: { bodyHtml: "", buttonLabel: "" } } };
  }
  if (actionType === "pick") {
    return { ...base, actionType, payload: { itemId: "", itemName: "", copy: { bodyHtml: "", buttonLabel: "" } } };
  }
  if (actionType === "goto") {
    return { ...base, actionType, payload: { target: "", copy: { bodyHtml: "", buttonLabel: "" } } };
  }
  if (actionType === "selector") {
    return {
      ...base,
      actionType,
      payload: { nested: { title: "", copy: { bodyHtml: "", buttonLabel: "" }, displayMode: "buttons" as const } },
    };
  }
  if (actionType === "req") {
    return { ...base, actionType, payload: { itemId: "", copy: { bodyHtml: "", buttonLabel: "" } }, rewardActionId: null };
  }
  return {
    ...base,
    actionType: "pwd",
    payload: { answer: "", rememberSuccess: false, copy: { bodyHtml: "", buttonLabel: "" } },
    rewardActionId: null,
  };
}

function buildMediaNode(id: MediaNodeId, mediaType: MediaNode["mediaType"]): MediaNode {
  if (mediaType === "media-image") {
    return { id, nodeType: "media", mediaType, label: "Media", data: { url: "" } };
  }
  return { id, nodeType: "media", mediaType: "media-audio", label: "Media", data: { url: "", volume: 1 } };
}

function orphanLayout(x: number, y: number) {
  return { x, y, parentId: null as const, collapsed: false };
}

/** Copie minimale de `nodalProjectStore.wouldCreateCycle` (évite import circulaire store ↔ insert). */
function wouldCreateCycle(
  layout: Record<string, { parentId?: AnyNodeId | null }>,
  parentId: string,
  childId: string
): boolean {
  let current: string | null | undefined = parentId;
  const seen = new Set<string>();
  while (current) {
    if (seen.has(current)) return true;
    if (current === childId) return true;
    seen.add(current);
    const parentNext: AnyNodeId | null | undefined = layout[current]?.parentId;
    current = parentNext ?? undefined;
  }
  return false;
}

/** C8.6.2 — aligné sur `nodalProjectStore.growSelectorIfContentOverflows`. */
function growSelectorIfContentOverflowsProject(next: NodalProject, selectorId: ActionNodeId): void {
  const act = next.actions[selectorId];
  const lo = next.layout[selectorId];
  if (!act || act.actionType !== "selector" || !lo || lo.collapsed) return;
  if (lo.width == null || lo.height == null) return;
  const bounds = computeContainerBounds(next, selectorId);
  if (bounds.width > lo.width || bounds.height > lo.height) {
    const { width: _w, height: _h, ...rest } = lo;
    next.layout[selectorId] = { ...rest };
  }
}

/** Effets layout d’un edge flow scène→action (aligné sur `nodalProjectStore.connect`). */
function applyFlowEdgeSceneToAction(next: NodalProject, edge: FlowEdge): boolean {
  if (!(edge.sourceId in next.scenes) || !(edge.targetId in next.actions)) return false;
  const bid = sboxIdFromScene(edge.sourceId as SceneNodeId);
  const childLayout = next.layout[edge.targetId as AnyNodeId];
  const boxLayout = next.layout[bid];
  if (!childLayout || !boxLayout || childLayout.parentId != null) return false;
  if (wouldCreateCycle(next.layout as Record<string, { parentId?: AnyNodeId | null }>, String(bid), String(edge.targetId))) {
    return false;
  }
  next.layout[edge.targetId as AnyNodeId] = {
    ...childLayout,
    x: childLayout.x - boxLayout.x,
    y: childLayout.y - boxLayout.y,
    parentId: bid,
  };
  reanchorSBox(next, bid);
  return true;
}

function attachActionUnderParent(
  next: NodalProject,
  childId: ActionNodeId,
  parentId: ActionNodeId,
  position: { x: number; y: number },
  mode: "selector" | "reqPwd"
): boolean {
  if (wouldCreateCycle(next.layout as Record<string, { parentId?: AnyNodeId | null }>, String(parentId), String(childId))) {
    return false;
  }
  const pAbs = absoluteFlowPositionInPane(next, parentId);
  next.layout[childId] = {
    x: position.x - pAbs.x,
    y: position.y - pAbs.y,
    parentId,
    collapsed: false,
  };
  if (mode === "reqPwd") {
    const pr = next.actions[parentId];
    if (!pr || (pr.actionType !== "req" && pr.actionType !== "pwd")) return false;
    next.actions[parentId] = { ...pr, rewardActionId: childId } as ActionNode;
  }
  if (mode === "selector") {
    growSelectorIfContentOverflowsProject(next, parentId);
  }
  return true;
}

/**
 * C9.1 — insertion top-level à une position flow absolue.
 * C9.2 — drop sur s-box : hotspot + edge flow.
 * C9.3 — selector / REQ-PWD (zone récompense) avant s-box (`findDeepestDropContainer`).
 */
export function insertNodeAtAbsolute(
  state: NodalProject,
  spec: PaletteInsertSpec,
  position: { x: number; y: number },
  _opts: InsertNodeAtAbsoluteOpts,
  nextAutoId: (prefix: string) => string
): { next: NodalProject; newRootIds: AnyNodeId[] } {
  const next: NodalProject = {
    ...state,
    meta: { ...state.meta },
    scenes: { ...state.scenes },
    sceneBoxes: { ...state.sceneBoxes },
    actions: { ...state.actions },
    satellites: { ...state.satellites },
    media: { ...state.media },
    edges: [...state.edges],
    layout: { ...state.layout },
  };

  if (spec.kind === "scene") {
    const ext = nextAutoId("extscene");
    const id = stableSceneNodeIdFromExternal(ext);
    const node: SceneNode = {
      id,
      nodeType: "scene",
      sceneId: ext,
      label: "New Scene",
      panoramaUrl: "",
    };
    next.scenes[id] = node;
    next.layout[id] = orphanLayout(position.x, position.y);
    reconcileSceneBoxes(next);
    reconcileAutoSatellites(next, nextAutoId);
    return { next, newRootIds: [id] };
  }

  if (spec.kind === "action") {
    const id = asActionNodeId(nextAutoId("act"));
    const node = buildActionNode(id, spec.actionType);
    const hit = findDeepestDropContainer(next, position);

    if (hit?.kind === "selector") {
      next.actions[id] = node;
      if (!attachActionUnderParent(next, id, hit.id, position, "selector")) {
        next.layout[id] = orphanLayout(position.x, position.y);
      }
    } else if (hit?.kind === "reqPwd") {
      next.actions[id] = node;
      if (!attachActionUnderParent(next, id, hit.id, position, "reqPwd")) {
        next.layout[id] = orphanLayout(position.x, position.y);
      }
    } else if (hit?.kind === "sceneBox") {
      const sceneId = next.sceneBoxes[hit.id]?.sceneId as SceneNodeId | undefined;
      if (sceneId != null) {
        next.actions[id] = node;
        next.layout[id] = orphanLayout(position.x, position.y);
        const edge: FlowEdge = {
          id: asEdgeId(nextAutoId("edge")),
          family: "flow",
          sourceId: sceneId,
          targetId: id,
        };
        if (applyFlowEdgeSceneToAction(next, edge)) {
          next.edges.push(edge);
        }
      } else {
        next.actions[id] = node;
        next.layout[id] = orphanLayout(position.x, position.y);
      }
    } else {
      next.actions[id] = node;
      next.layout[id] = orphanLayout(position.x, position.y);
    }
    reconcileSceneBoxes(next);
    reconcileAutoSatellites(next, nextAutoId);
    return { next, newRootIds: [id] };
  }

  const id = asMediaNodeId(nextAutoId("media"));
  const node = buildMediaNode(id, spec.mediaType);
  next.media[id] = node;
  next.layout[id] = orphanLayout(position.x, position.y);
  reconcileSceneBoxes(next);
  reconcileAutoSatellites(next, nextAutoId);
  return { next, newRootIds: [id] };
}

/**
 * Positions flow absolues après collage (translation depuis `originAbs`).
 * Partagé avec `pasteClipboard` (C9.1 — même module que l’insertion palette).
 */
export function computeTranslatedAbsolutePositions(
  clipState: NodalProject,
  ids: Set<AnyNodeId>,
  pasteAbs: { x: number; y: number },
  originAbs: { x: number; y: number }
): Map<AnyNodeId, { x: number; y: number }> {
  const dx = pasteAbs.x - originAbs.x;
  const dy = pasteAbs.y - originAbs.y;
  const newAbsByOld = new Map<AnyNodeId, { x: number; y: number }>();
  for (const id of ids) {
    const abs = absoluteFlowPositionInPane(clipState, id);
    newAbsByOld.set(id, { x: abs.x + dx, y: abs.y + dy });
  }
  return newAbsByOld;
}
