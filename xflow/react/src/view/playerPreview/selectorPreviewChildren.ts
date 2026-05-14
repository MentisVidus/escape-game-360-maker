import type { ActionNodeId } from "../../model/ids";
import type { NodalProject } from "../../model/project";

/**
 * C18.5.2 — Ordre des actions enfant d'un selector (même logique que
 * `SelectorContentPopup` : parentId nodal si présent, sinon edges flow
 * `selector → action`, tri par `layout.y` puis id).
 */
export function getOrderedSelectorChildActionIds(
  state: NodalProject,
  selectorId: ActionNodeId
): ActionNodeId[] {
  const viaParentId = Object.keys(state.actions).filter(
    (candidateId) => state.layout[candidateId]?.parentId === selectorId
  );
  const ordered = (viaParentId.length
    ? viaParentId
    : state.edges
        .filter((edge) => edge.family === "flow" && edge.sourceId === selectorId && edge.targetId in state.actions)
        .map((edge) => edge.targetId)) as ActionNodeId[];
  return [...ordered].sort((a, b) => {
    const ya = state.layout[a]?.y ?? 0;
    const yb = state.layout[b]?.y ?? 0;
    if (ya !== yb) return ya - yb;
    return String(a).localeCompare(String(b));
  });
}
