import type { AnyNodeId } from "../../model/ids";
import type { NodalProject } from "../../model/project";
import type { NestedNodeLike } from "./geometry";

/** Carte nœuds pour `getAbsolutePosition` / `toAbsoluteRect` (chaîne parentId complète). */
export function buildNestedNodesMapFromProject(state: NodalProject): Map<string, NestedNodeLike> {
  const m = new Map<string, NestedNodeLike>();
  const add = (id: string) => {
    const lo = state.layout[id as AnyNodeId];
    if (!lo) return;
    m.set(id, {
      id,
      parentId: lo.parentId ?? undefined,
      position: { x: lo.x, y: lo.y },
      width: lo.width,
      height: lo.height,
    });
  };
  for (const id of Object.keys(state.scenes)) add(id);
  for (const id of Object.keys(state.sceneBoxes)) add(id);
  for (const id of Object.keys(state.actions)) add(id);
  for (const id of Object.keys(state.media)) add(id);
  for (const id of Object.keys(state.satellites)) add(id);
  return m;
}
