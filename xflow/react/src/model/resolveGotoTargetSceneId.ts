import type { ActionNodeId, SceneNodeId } from "./ids";
import type { NodalProject } from "./project";

/**
 * C19.2-fix — Résout la scène cible d’un nœud `goto` via les arêtes
 * `family: "transition"` sortantes. Une seule cible scène valide attendue ;
 * sinon `null` (comportement dégradé : fermeture overlay sans navigation).
 */
export function resolveGotoTargetSceneId(state: NodalProject, gotoActionId: ActionNodeId): SceneNodeId | null {
  const targets: SceneNodeId[] = [];
  for (const e of state.edges) {
    if (e.family !== "transition" || e.sourceId !== gotoActionId) continue;
    const tid = e.targetId;
    if (tid in state.scenes) targets.push(tid as SceneNodeId);
  }
  if (targets.length === 0) {
    console.warn(`[goto preview] aucune arête transition valide vers une scène pour l'action ${gotoActionId}`);
    return null;
  }
  if (targets.length > 1) {
    console.warn(
      `[goto preview] plusieurs cibles transition ambiguës (${targets.length}) pour l'action ${gotoActionId} — navigation ignorée`
    );
    return null;
  }
  return targets[0] ?? null;
}
