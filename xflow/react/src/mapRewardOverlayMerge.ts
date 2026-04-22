import type { Edge, Node } from "@xyflow/react";
import { recomputeMapLayoutGroups, type MapHotspotNodeData } from "./mapGraphBuild";
import { RF_REWARD_IN, RF_REWARD_OUT } from "./mapFlowHandles";
import type { MapRewardActionDraft, MapRewardTargetKind } from "./mapRewardActionV2";

export type RewardHotspotPatch = {
  rewardType: MapRewardTargetKind;
  rewardActionDraft: MapRewardActionDraft;
};

export type RewardOverlayState = {
  stubNodes: Node[];
  edges: Edge[];
  patchByHotspotId: Record<string, RewardHotspotPatch>;
};

export const emptyRewardOverlay = (): RewardOverlayState => ({
  stubNodes: [],
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
  stubNodes: Array<{
    id: string;
    type: string;
    position: { x: number; y: number };
    data: Record<string, unknown>;
    draggable?: boolean;
    selectable?: boolean;
  }>;
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
    stubNodes: overlay.stubNodes.map((n) => ({
      id: n.id,
      type: String(n.type || ""),
      position: { x: n.position.x, y: n.position.y },
      data: { ...(n.data as Record<string, unknown>) },
      draggable: n.draggable !== false,
      selectable: n.selectable !== false,
    })),
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

/** Relit le JSON session ; ignore les patches dont le hotspot source n’est plus sur le graphe. */
export function deserializeRewardOverlay(
  json: unknown,
  validHotspotNodeIds: Set<string>
): RewardOverlayState {
  const empty = emptyRewardOverlay();
  if (!json || typeof json !== "object") return empty;
  const o = json as Record<string, unknown>;
  if (o.v !== 1) return empty;

  const patchByHotspotId: Record<string, RewardHotspotPatch> = {};
  const rawPatch = o.patchByHotspotId;
  if (rawPatch && typeof rawPatch === "object") {
    for (const [k, v] of Object.entries(rawPatch as Record<string, unknown>)) {
      if (!validHotspotNodeIds.has(k)) continue;
      if (!isRewardHotspotPatch(v)) continue;
      patchByHotspotId[k] = v;
    }
  }

  const stubNodes: Node[] = [];
  if (Array.isArray(o.stubNodes)) {
    for (const sn of o.stubNodes) {
      if (!sn || typeof sn !== "object") continue;
      const row = sn as Record<string, unknown>;
      if (row.type !== "mapRewardTarget") continue;
      const id = row.id != null ? String(row.id) : "";
      if (!id) continue;
      const pos = row.position as Record<string, unknown> | undefined;
      const x = pos && typeof pos.x === "number" ? pos.x : 0;
      const y = pos && typeof pos.y === "number" ? pos.y : 0;
      const data = row.data && typeof row.data === "object" ? (row.data as Record<string, unknown>) : {};
      stubNodes.push({
        id,
        type: "mapRewardTarget",
        position: { x, y },
        draggable: row.draggable !== false,
        selectable: row.selectable !== false,
        data,
      } as Node);
    }
  }

  const stubIds = new Set(stubNodes.map((s) => s.id));
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
      if (!validHotspotNodeIds.has(source)) continue;
      if (!stubIds.has(target)) continue;
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

  return { stubNodes, edges, patchByHotspotId };
}

/** Retire patches / arêtes invalides quand le graphe projet change (hotspots supprimés, etc.). */
export function pruneRewardOverlayToGraph(
  graphHotspotNodeIds: Set<string>,
  overlay: RewardOverlayState
): RewardOverlayState {
  const stubNodes = overlay.stubNodes.filter((s) => s.type === "mapRewardTarget");
  const stubIds = new Set(stubNodes.map((s) => s.id));
  const edges = overlay.edges.filter(
    (e) =>
      e.sourceHandle === RF_REWARD_OUT &&
      e.targetHandle === RF_REWARD_IN &&
      graphHotspotNodeIds.has(e.source) &&
      stubIds.has(e.target)
  );
  const sourcesWithEdge = new Set(edges.map((e) => e.source));
  const patchByHotspotId: Record<string, RewardHotspotPatch> = {};
  for (const [k, v] of Object.entries(overlay.patchByHotspotId)) {
    if (!graphHotspotNodeIds.has(k)) continue;
    if (sourcesWithEdge.has(k)) patchByHotspotId[k] = v;
  }
  return { stubNodes, edges, patchByHotspotId };
}

/** Retire arêtes / patch / stubs orphelins pour un hotspot source `hs:…` (ex. édition legacy invalide data-v2-reward-action). */
export function pruneRewardOverlayForHotspotGraphId(
  overlay: RewardOverlayState,
  hsGraphId: string
): RewardOverlayState {
  const removedTargets = overlay.edges
    .filter(
      (e) =>
        e.source === hsGraphId &&
        e.sourceHandle === RF_REWARD_OUT &&
        e.targetHandle === RF_REWARD_IN
    )
    .map((e) => e.target);
  const removedSet = new Set(removedTargets);
  const nextEdges = overlay.edges.filter((e) => e.source !== hsGraphId);
  const patchByHotspotId = { ...overlay.patchByHotspotId };
  delete patchByHotspotId[hsGraphId];
  const nextTargetRef = new Set(nextEdges.map((e) => e.target));
  const stubNodes = overlay.stubNodes.filter((sn) => {
    if (sn.type !== "mapRewardTarget") return true;
    if (!removedSet.has(sn.id)) return true;
    return nextTargetRef.has(sn.id);
  });
  return { stubNodes, edges: nextEdges, patchByHotspotId };
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

/** Fusionne nœuds / arêtes « récompense carte » + patch V2 sur les hotspots req/pwd. */
export function mergeRewardOverlay(
  baseNodes: Node[],
  baseEdges: Edge[],
  overlay: RewardOverlayState,
  savedPos: Record<string, { x: number; y: number }> | null
): { nodes: Node[]; edges: Edge[] } {
  const graphHotspotIds = new Set(
    baseNodes.filter((n) => n.type === "mapHotspot").map((n) => n.id)
  );
  const overlayClean = pruneRewardOverlayToGraph(graphHotspotIds, overlay);
  const withStubs = [...baseNodes, ...overlayClean.stubNodes];
  const posMerged = mergeSavedPositions(withStubs, savedPos);
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
