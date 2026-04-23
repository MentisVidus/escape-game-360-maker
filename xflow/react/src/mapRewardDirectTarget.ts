import type { Node } from "@xyflow/react";

import type { MapHotspotNodeData } from "./mapGraphBuild";
import {
  createMinimalRewardActionV2,
  type MapRewardActionDraft,
  type MapRewardTargetKind,
} from "./mapRewardActionV2";

/** Brouillon V2 minimal aligné sur le nœud carte relié par reward-out (hotspot transition ou msg|pick|selector). */
export function buildRewardDraftForDirectMapTarget(
  tNode: Node
): { kind: MapRewardTargetKind; draft: MapRewardActionDraft } | null {
  if (tNode.type === "mapHotspot") {
    const d = tNode.data as MapHotspotNodeData;
    const at = String(d.actionType || "").trim();
    if (at === "scene") {
      const draft = createMinimalRewardActionV2("scene");
      const p = draft.payload as {
        target?: string;
        sceneIndex?: number;
        hotspotIndex?: number;
      };
      p.sceneIndex = d.sceneIndex;
      p.hotspotIndex = d.hotspotIndex;
      try {
        const blocks = document.querySelectorAll("#scenes-container > .scene-block");
        const sceneEl = blocks[d.sceneIndex];
        const wrap = sceneEl?.querySelector('[id^="hs-container-"]');
        const hss = wrap?.querySelectorAll(":scope > .hotspot-block");
        const hb = hss?.[d.hotspotIndex] as HTMLElement | undefined;
        const ft = hb?.querySelector<HTMLInputElement | HTMLSelectElement>(".f-target");
        const v = ft?.value ? String(ft.value).trim() : "";
        if (v) p.target = v;
      } catch {
        /* DOM indisponible : target vide → REWARD_MISSING §5.1 */
      }
      return { kind: "scene", draft };
    }
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
