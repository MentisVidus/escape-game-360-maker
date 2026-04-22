import type { Node } from "@xyflow/react";

import type { MapHotspotNodeData, MapSceneNodeData } from "./mapGraphBuild";
import {
  createMinimalRewardActionV2,
  type MapRewardActionDraft,
  type MapRewardTargetKind,
} from "./mapRewardActionV2";

/** Brouillon V2 minimal aligné sur le nœud carte relié par reward-out (scène / hotspot msg|pick|selector). */
export function buildRewardDraftForDirectMapTarget(
  tNode: Node
): { kind: MapRewardTargetKind; draft: MapRewardActionDraft } | null {
  if (tNode.type === "mapScene") {
    const d = tNode.data as MapSceneNodeData;
    const draft = createMinimalRewardActionV2("scene");
    const p = draft.payload as { target?: string };
    p.target = String(d.scId ?? "").trim();
    return { kind: "scene", draft };
  }
  if (tNode.type === "mapHotspot") {
    const d = tNode.data as MapHotspotNodeData;
    const at = String(d.actionType || "").trim();
    if (at === "msg" || at === "pick" || at === "selector") {
      const draft = createMinimalRewardActionV2(at);
      const p = draft.payload as { sceneIndex?: number; hotspotIndex?: number };
      p.sceneIndex = d.sceneIndex;
      p.hotspotIndex = d.hotspotIndex;
      return { kind: at, draft };
    }
  }
  return null;
}
