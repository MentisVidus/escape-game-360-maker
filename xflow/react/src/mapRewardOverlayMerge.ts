import type { Edge, Node } from "@xyflow/react";
import { recomputeMapLayoutGroups, type MapHotspotNodeData } from "./mapGraphBuild";
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
  const withStubs = [...baseNodes, ...overlay.stubNodes];
  const posMerged = mergeSavedPositions(withStubs, savedPos);
  const patched = posMerged.map((n) => {
    if (n.type !== "mapHotspot") return n;
    const patch = overlay.patchByHotspotId[n.id];
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
    edges: [...baseEdges, ...overlay.edges],
  };
}
