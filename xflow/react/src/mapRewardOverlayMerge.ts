import type { Edge, Node } from "@xyflow/react";
import { recomputeMapLayoutGroups, type MapHotspotNodeData } from "./mapGraphBuild";
import { RF_REWARD_IN, RF_REWARD_OUT } from "./mapFlowHandles";
import type { MapRewardActionDraft, MapRewardTargetKind } from "./mapRewardActionV2";

export type RewardHotspotPatch = {
  rewardType: MapRewardTargetKind;
  rewardActionDraft: MapRewardActionDraft;
};

export type RewardOverlayState = {
  edges: Edge[];
  patchByHotspotId: Record<string, RewardHotspotPatch>;
};

export const emptyRewardOverlay = (): RewardOverlayState => ({
  edges: [],
  patchByHotspotId: {},
});

/** Même racine que les positions de nœuds (`layoutKey` dans App.tsx). */
export function rewardOverlayStorageKey(layoutKey: string): string {
  return `${layoutKey}:rewardOverlay`;
}

export type SerializedRewardOverlayV1 = {
  v: 1;
  patchByHotspotId: Record<string, RewardHotspotPatch>;
  /** Obsolète (stubs supprimés) — toujours [] en écriture. */
  stubNodes?: unknown[];
  edges: Array<{
    id: string;
    source: string;
    target: string;
    sourceHandle?: string | null;
    targetHandle?: string | null;
    type?: string;
  }>;
};

export function serializeRewardOverlay(overlay: RewardOverlayState): SerializedRewardOverlayV1 {
  return {
    v: 1,
    patchByHotspotId: overlay.patchByHotspotId,
    stubNodes: [],
    edges: overlay.edges.map((e) => ({
      id: e.id,
      source: e.source,
      target: e.target,
      sourceHandle: e.sourceHandle,
      targetHandle: e.targetHandle,
      type: typeof e.type === "string" ? e.type : "smoothstep",
    })),
  };
}

function isRewardHotspotPatch(v: unknown): v is RewardHotspotPatch {
  if (!v || typeof v !== "object") return false;
  const o = v as Record<string, unknown>;
  const rt = o.rewardType;
  if (rt !== "msg" && rt !== "scene" && rt !== "pick" && rt !== "selector") return false;
  const ra = o.rewardActionDraft;
  if (!ra || typeof ra !== "object") return false;
  return typeof (ra as Record<string, unknown>).type === "string";
}

/**
 * Relit le JSON session.
 * @param validSourceHotspotIds ids `hs:…` présents sur le graphe
 * @param validTargetNodeIds ids de tout nœud carte (scène, hotspot cible, …)
 */
export function deserializeRewardOverlay(
  json: unknown,
  validSourceHotspotIds: Set<string>,
  validTargetNodeIds: Set<string>
): RewardOverlayState {
  const empty = emptyRewardOverlay();
  if (!json || typeof json !== "object") return empty;
  const o = json as Record<string, unknown>;
  if (o.v !== 1) return empty;

  const patchByHotspotId: Record<string, RewardHotspotPatch> = {};
  const rawPatch = o.patchByHotspotId;
  if (rawPatch && typeof rawPatch === "object") {
    for (const [k, v] of Object.entries(rawPatch as Record<string, unknown>)) {
      if (!validSourceHotspotIds.has(k)) continue;
      if (!isRewardHotspotPatch(v)) continue;
      patchByHotspotId[k] = v;
    }
  }

  const edges: Edge[] = [];
  if (Array.isArray(o.edges)) {
    for (const raw of o.edges) {
      if (!raw || typeof raw !== "object") continue;
      const e = raw as Record<string, unknown>;
      const id = e.id != null ? String(e.id) : "";
      const source = e.source != null ? String(e.source) : "";
      const target = e.target != null ? String(e.target) : "";
      if (!id || !source || !target) continue;
      if (e.sourceHandle !== RF_REWARD_OUT || e.targetHandle !== RF_REWARD_IN) continue;
      if (!validSourceHotspotIds.has(source)) continue;
      if (!validTargetNodeIds.has(target)) continue;
      edges.push({
        id,
        source,
        target,
        sourceHandle: RF_REWARD_OUT,
        targetHandle: RF_REWARD_IN,
        type: typeof e.type === "string" ? e.type : "smoothstep",
        style: { stroke: "#f59e0b", strokeWidth: 2 },
      });
    }
  }

  const sourcesWithEdge = new Set(edges.map((e) => e.source));
  for (const k of Object.keys(patchByHotspotId)) {
    if (!sourcesWithEdge.has(k)) {
      delete patchByHotspotId[k];
    }
  }

  return { edges, patchByHotspotId };
}

/** Retire patches / arêtes invalides quand le graphe projet change (hotspots supprimés, etc.). */
export function pruneRewardOverlayToGraph(
  graphHotspotIds: Set<string>,
  validTargetNodeIds: Set<string>,
  overlay: RewardOverlayState
): RewardOverlayState {
  const edges = overlay.edges.filter(
    (e) =>
      e.sourceHandle === RF_REWARD_OUT &&
      e.targetHandle === RF_REWARD_IN &&
      graphHotspotIds.has(e.source) &&
      validTargetNodeIds.has(e.target)
  );
  const sourcesWithEdge = new Set(edges.map((e) => e.source));
  const patchByHotspotId: Record<string, RewardHotspotPatch> = {};
  for (const [k, v] of Object.entries(overlay.patchByHotspotId)) {
    if (!graphHotspotIds.has(k)) continue;
    if (sourcesWithEdge.has(k)) patchByHotspotId[k] = v;
  }
  return { edges, patchByHotspotId };
}

/** Retire l’overlay récompense pour un hotspot source `hs:…`. */
export function pruneRewardOverlayForHotspotGraphId(
  overlay: RewardOverlayState,
  hsGraphId: string
): RewardOverlayState {
  const nextEdges = overlay.edges.filter((e) => e.source !== hsGraphId);
  const patchByHotspotId = { ...overlay.patchByHotspotId };
  delete patchByHotspotId[hsGraphId];
  return { edges: nextEdges, patchByHotspotId };
}

function mergeSavedPositions(
  nodes: Node[],
  saved: Record<string, { x: number; y: number }> | null
): Node[] {
  if (!saved || Object.keys(saved).length === 0) return nodes;
  return nodes.map((node) => {
    if (node.type === "mapSceneGroup" || node.type === "mapSelectorGroup") {
      return { ...node };
    }
    const p = saved[node.id];
    if (!p || typeof p.x !== "number" || typeof p.y !== "number") return { ...node };
    return { ...node, position: { x: p.x, y: p.y } };
  });
}

/** Fusionne arêtes récompense + patch V2 sur les hotspots req/pwd (sans nœuds intermédiaires). */
export function mergeRewardOverlay(
  baseNodes: Node[],
  baseEdges: Edge[],
  overlay: RewardOverlayState,
  savedPos: Record<string, { x: number; y: number }> | null
): { nodes: Node[]; edges: Edge[] } {
  const graphHotspotIds = new Set(
    baseNodes.filter((n) => n.type === "mapHotspot").map((n) => n.id)
  );
  const validTargetNodeIds = new Set(baseNodes.map((n) => n.id));
  const overlayClean = pruneRewardOverlayToGraph(graphHotspotIds, validTargetNodeIds, overlay);
  const posMerged = mergeSavedPositions(baseNodes, savedPos);
  const patched = posMerged.map((n) => {
    if (n.type !== "mapHotspot") return n;
    const patch = overlayClean.patchByHotspotId[n.id];
    if (!patch) return n;
    const d = n.data as MapHotspotNodeData;
    return {
      ...n,
      data: {
        ...d,
        rewardType: patch.rewardType,
        rewardActionDraft: patch.rewardActionDraft,
      },
    };
  });
  return {
    nodes: recomputeMapLayoutGroups(patched),
    edges: [...baseEdges, ...overlayClean.edges],
  };
}
