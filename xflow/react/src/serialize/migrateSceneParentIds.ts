import type { ActionNodeId, AnyNodeId, SceneNodeId } from "../model/ids";
import type { NodalProject } from "../model/project";
import { reanchorSceneContainer } from "../view/nesting/containerBounds";

/** Refuse parentId scène→action si la scène serait un descendant de l’action (impossible en pratique). */
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

/**
 * C8.1.b — Rattache les hotspots `flow` scène→action sous la scène (`parentId` + coords relatives).
 * Idempotent : ne modifie que les cibles avec `parentId == null`.
 */
export function migrateSceneParentIds(state: NodalProject): void {
  for (const edge of state.edges) {
    if (edge.family !== "flow") continue;
    if (!(edge.sourceId in state.scenes) || !(edge.targetId in state.actions)) continue;
    const sceneId = edge.sourceId as SceneNodeId;
    const actionId = edge.targetId as ActionNodeId;
    const childLayout = state.layout[actionId];
    const sceneLayout = state.layout[sceneId];
    if (!childLayout || !sceneLayout) continue;
    if (childLayout.parentId != null) continue;
    if (wouldCreateCycle(state.layout, sceneId as string, actionId as string)) continue;
    state.layout[actionId] = {
      ...childLayout,
      x: childLayout.x - sceneLayout.x,
      y: childLayout.y - sceneLayout.y,
      parentId: sceneId,
    };
  }

  /* 1.b.2-fix : re-ancrage + projets déjà migrés avec coords relatives < pad. */
  for (const s of Object.values(state.scenes)) {
    reanchorSceneContainer(state, s.id);
  }
}
