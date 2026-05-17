import type { ActionNodeId, SatelliteNodeId } from "./ids";
import type { HotspotAppearanceUi } from "./nodes";
import type { NodalProject } from "./project";

/** Apparence hotspot (coords-options) liée à une action — pour export bundle / walker. */
export function resolveHotspotAppearanceForAction(
  state: NodalProject,
  actionId: ActionNodeId
): HotspotAppearanceUi | null {
  for (const e of state.edges) {
    if (e.family !== "meta" || e.sourceId !== actionId) continue;
    const sat = state.satellites[e.targetId as SatelliteNodeId];
    if (!sat || sat.satelliteType !== "coords-options") continue;
    const app = sat.data.appearance;
    if (app && typeof app === "object") return { ...app };
  }
  return null;
}

export function resolveHotspotUiImgForAction(state: NodalProject, actionId: ActionNodeId): string {
  const app = resolveHotspotAppearanceForAction(state, actionId);
  return app?.ui_img != null ? String(app.ui_img).trim() : "";
}
