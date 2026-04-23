import type { Node } from "@xyflow/react";

import type { EditorProject } from "./mapGraphBuild";
import { sceneKey } from "./mapGraphBuild";
import { RF_REWARD_IN, RF_REWARD_OUT } from "./mapFlowHandles";
import { buildRewardDraftForDirectMapTarget } from "./mapRewardDirectTarget";
import type { MapRewardActionDraft, MapRewardTargetKind } from "./mapRewardActionV2";
import {
  emptyRewardOverlay,
  type RewardHotspotPatch,
  type RewardOverlayState,
} from "./mapRewardOverlayMerge";

/** Schéma `map-layout.json` v1 (sans `rewardTargets`). */
export type MapLayoutFileV1 = {
  version: 1;
  nodes: Record<string, { x: number; y: number }>;
  rewardEdges: Array<{ source: string; target: string }>;
  backgrounds: unknown[];
};

type LooseAction = { type?: string; payload?: Record<string, unknown> } | null | undefined;

/** Aligné sur `buildProjectMapGraphBase` / `js/editor-shared-map-layout.js`. */
export function computeReactMapLayoutStorageKey(project: EditorProject | null): string {
  const viewMode =
    (typeof window !== "undefined" && (window as { _projectMapViewMode?: string })._projectMapViewMode) || "full";
  let narr = "0";
  if (typeof document !== "undefined") {
    const el = document.getElementById("project-map-narration-only");
    if (el instanceof HTMLInputElement && el.checked) narr = "1";
  }
  const nScenes = project?.scenes?.length ?? 0;
  const title = String(project?.title ?? "").slice(0, 120);
  return `escape360-reactMap-pos:v1:${viewMode}:${narr}:${nScenes}:${title}`;
}

function parseHsNodeId(hsId: string): { sceneKey: string; hotspotIndex: number } | null {
  if (!hsId.startsWith("hs:")) return null;
  const rest = hsId.slice(3);
  const last = rest.lastIndexOf(":");
  if (last <= 0) return null;
  const sk = rest.slice(0, last);
  const hi = parseInt(rest.slice(last + 1), 10);
  if (Number.isNaN(hi)) return null;
  return { sceneKey: sk, hotspotIndex: hi };
}

function findHotspot(
  project: EditorProject,
  targetSceneKey: string,
  hotspotIndex: number
): Record<string, unknown> | null {
  const scenes = project.scenes ?? [];
  for (let si = 0; si < scenes.length; si++) {
    if (sceneKey(scenes[si], si) !== targetSceneKey) continue;
    const hss = scenes[si].hotspots;
    if (!Array.isArray(hss)) return null;
    const hs = hss[hotspotIndex];
    return hs && typeof hs === "object" ? (hs as Record<string, unknown>) : null;
  }
  return null;
}

function readRewardAction(hs: Record<string, unknown> | null): LooseAction {
  if (!hs) return null;
  const a = hs.action as LooseAction;
  if (!a || typeof a !== "object") return null;
  const t = String(a.type || "");
  if (t !== "req" && t !== "pwd") return null;
  const p = a.payload;
  const ra = p && typeof p === "object" ? (p as { rewardAction?: unknown }).rewardAction : undefined;
  return ra && typeof ra === "object" ? (ra as LooseAction) : null;
}

function rewardKindFromAction(ra: LooseAction): MapRewardTargetKind | null {
  if (!ra || typeof ra !== "object") return null;
  const t = String((ra as { type?: string }).type || "").trim();
  if (t === "msg" || t === "scene" || t === "pick" || t === "selector") return t;
  return null;
}

function patchFromRewardAction(ra: LooseAction): RewardHotspotPatch | null {
  const kind = rewardKindFromAction(ra);
  if (!kind) return null;
  return {
    rewardType: kind,
    rewardActionDraft: ra as unknown as MapRewardActionDraft,
  };
}

function findTransitionHotspotNodeIdForRewardTarget(
  project: EditorProject,
  parentSceneIndex: number,
  targetStr: string,
  baseNodes: Node[]
): string | null {
  const t = String(targetStr || "").trim();
  if (!t) return null;
  const scenes = project.scenes ?? [];
  const parentScene = scenes[parentSceneIndex];
  if (!parentScene) return null;
  const sk = sceneKey(parentScene, parentSceneIndex);
  const hotspots = Array.isArray(parentScene.hotspots) ? parentScene.hotspots : [];
  for (let hi = 0; hi < hotspots.length; hi++) {
    const hs = hotspots[hi] as Record<string, unknown>;
    const a = hs.action as { type?: string; payload?: { target?: unknown } } | undefined;
    if (!a || a.type !== "scene") continue;
    const tgt = String(a.payload?.target ?? "").trim();
    if (tgt !== t) continue;
    const nid = `hs:${sk}:${hi}`;
    if (baseNodes.some((n) => n.id === nid && n.type === "mapHotspot")) {
      return nid;
    }
  }
  return null;
}

/**
 * Sans edges en session : infère une arête reward-out → hotspot transition `scene`
 * quand `rewardAction.type === "scene"` et un hotspot `action.type === "scene"` de la
 * même scène parente porte le même `payload.target`.
 */
export function inferRewardOverlayFromProject(
  project: EditorProject | null,
  validHotspotIds: Set<string>,
  baseNodes: Node[]
): RewardOverlayState {
  const out = emptyRewardOverlay();
  if (!project?.scenes?.length) return out;

  const scenes = project.scenes ?? [];
  scenes.forEach((scene, si) => {
    const sk = sceneKey(scene, si);
    const hotspots = Array.isArray(scene.hotspots) ? scene.hotspots : [];
    hotspots.forEach((hs, hi) => {
      const rec = hs as Record<string, unknown>;
      const hsId = `hs:${sk}:${hi}`;
      if (!validHotspotIds.has(hsId)) return;
      const ra = readRewardAction(rec);
      if (!ra) return;
      const patch = patchFromRewardAction(ra);
      if (!patch) return;
      if (patch.rewardType !== "scene") return;
      const p = (ra as { payload?: { target?: unknown } }).payload;
      const targetStr = p && typeof p.target === "string" ? p.target : "";
      const transitionNid = findTransitionHotspotNodeIdForRewardTarget(
        project,
        si,
        targetStr,
        baseNodes
      );
      if (!transitionNid) return;
      out.edges.push({
        id: `e:rw:${hsId}>${transitionNid}:infer`,
        source: hsId,
        target: transitionNid,
        sourceHandle: RF_REWARD_OUT,
        targetHandle: RF_REWARD_IN,
        type: "smoothstep",
        style: { stroke: "#f59e0b", strokeWidth: 2 },
      });
      out.patchByHotspotId[hsId] = patch;
    });
  });

  return out;
}

/** Sérialise positions + arêtes récompense (sans `rewardTargets`). */
export function serializeMapLayout(
  nodePositionsById: Record<string, { x: number; y: number }>,
  overlay: RewardOverlayState
): MapLayoutFileV1 {
  const rewardEdges = overlay.edges
    .filter((e) => e.sourceHandle === RF_REWARD_OUT && e.targetHandle === RF_REWARD_IN)
    .map((e) => ({ source: e.source, target: e.target }));
  return {
    version: 1,
    nodes: { ...nodePositionsById },
    rewardEdges,
    backgrounds: [],
  };
}

/**
 * Relit `map-layout.json` : positions + overlay (patch depuis nœud cible ou projet).
 */
export function deserializeMapLayout(
  json: unknown,
  project: EditorProject,
  validHotspotIds: Set<string>,
  validAllGraphNodeIds: Set<string>,
  baseNodes: Node[]
): { nodePositions: Record<string, { x: number; y: number }>; rewardOverlay: RewardOverlayState } {
  const emptyPos: Record<string, { x: number; y: number }> = {};
  const emptyOverlay = emptyRewardOverlay();
  if (!json || typeof json !== "object") return { nodePositions: emptyPos, rewardOverlay: emptyOverlay };
  const o = json as Record<string, unknown>;
  if (o.version !== 1) return { nodePositions: emptyPos, rewardOverlay: emptyOverlay };

  const nodesRaw = o.nodes;
  const nodePositions: Record<string, { x: number; y: number }> =
    nodesRaw && typeof nodesRaw === "object" ? { ...(nodesRaw as Record<string, { x: number; y: number }>) } : {};

  const rewardOverlay: RewardOverlayState = {
    edges: [],
    patchByHotspotId: {},
  };

  const nodeById = new Map(baseNodes.map((n) => [n.id, n]));
  const edgesRaw = Array.isArray(o.rewardEdges) ? o.rewardEdges : [];
  edgesRaw.forEach((e, i) => {
    if (!e || typeof e !== "object") return;
    const row = e as Record<string, unknown>;
    const source = row.source != null ? String(row.source) : "";
    const target = row.target != null ? String(row.target) : "";
    if (!source || !target) return;
    // §0.2-5 : pas de rétrocompat. Les anciens edges reward → sc:
    // sont simplement droppés. Le game designer recrée les liens
    // à la main si besoin.
    if (target.startsWith("sc:")) return;
    if (!validHotspotIds.has(source) || !validAllGraphNodeIds.has(target)) return;
    rewardOverlay.edges.push({
      id: `e:rw:${source}>${target}:${i}`,
      source,
      target,
      sourceHandle: RF_REWARD_OUT,
      targetHandle: RF_REWARD_IN,
      type: "smoothstep",
      style: { stroke: "#f59e0b", strokeWidth: 2 },
    });
    const tNode = nodeById.get(target);
    let patch: RewardHotspotPatch | null = null;
    if (tNode) {
      const built = buildRewardDraftForDirectMapTarget(tNode);
      if (built) patch = { rewardType: built.kind, rewardActionDraft: built.draft };
    }
    if (!patch) {
      const parsed = parseHsNodeId(source);
      if (parsed) {
        const hs = findHotspot(project, parsed.sceneKey, parsed.hotspotIndex);
        patch = patchFromRewardAction(readRewardAction(hs));
      }
    }
    if (patch) rewardOverlay.patchByHotspotId[source] = patch;
  });

  return { nodePositions, rewardOverlay };
}
