import type { ActionNodeId, AnyNodeId, SceneBoxNodeId, SceneNodeId } from "../model/ids";
import type { NodalProject } from "../model/project";
import { reconcileSceneBoxes, sboxIdFromScene } from "../store/reconcileSceneBoxes";
import { reanchorSBox } from "../view/nesting/containerBounds";

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
 * C8.1.b.2.x — Scène sous s-box + hotspots sous le s-box (plus sous la scène).
 * Idempotent ; corrige les projets avec `parentId === sceneId`.
 */
export function migrateSceneToSBoxParenting(state: NodalProject): void {
  reconcileSceneBoxes(state);

  for (const edge of state.edges) {
    if (edge.family !== "flow") continue;
    if (!(edge.sourceId in state.scenes) || !(edge.targetId in state.actions)) continue;
    const sceneId = edge.sourceId as SceneNodeId;
    const bid = sboxIdFromScene(sceneId);
    const actionId = edge.targetId as ActionNodeId;
    const childLayout = state.layout[actionId];
    const boxLayout = state.layout[bid];
    if (!childLayout || !boxLayout || childLayout.parentId != null) continue;
    if (wouldCreateCycle(state.layout, bid as string, actionId as string)) continue;
    state.layout[actionId] = {
      ...childLayout,
      x: childLayout.x - boxLayout.x,
      y: childLayout.y - boxLayout.y,
      parentId: bid,
    };
  }

  for (const bid of Object.keys(state.sceneBoxes) as SceneBoxNodeId[]) {
    reanchorSBox(state, bid);
  }
}
