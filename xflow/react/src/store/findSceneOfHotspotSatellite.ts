import type { ActionNodeId, SceneNodeId, SatelliteNodeId } from "../model/ids";
import type { NodalProject } from "../model/project";

/**
 * Résout la scène + l’action parente d’un satellite `coords-options` (hotspot état 2 :
 * meta action → satellite, puis flow scène → action).
 */
export function findSceneOfHotspotSatellite(
  state: NodalProject,
  satelliteId: SatelliteNodeId
): { sceneId: SceneNodeId; actionId: ActionNodeId } | null {
  const sat = state.satellites[satelliteId];
  if (!sat || sat.satelliteType !== "coords-options") return null;

  const metaEdge = state.edges.find(
    (e) => e.family === "meta" && e.targetId === satelliteId && e.sourceId in state.actions
  );
  if (!metaEdge) return null;
  const actionId = metaEdge.sourceId as ActionNodeId;

  const flowEdge = state.edges.find(
    (e) => e.family === "flow" && e.targetId === actionId && e.sourceId in state.scenes
  );
  if (!flowEdge) return null;

  return { sceneId: flowEdge.sourceId as SceneNodeId, actionId };
}
