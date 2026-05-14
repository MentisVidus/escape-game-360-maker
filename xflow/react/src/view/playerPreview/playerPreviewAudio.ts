import { resolveLinkedMediaAudioSfxForAction } from "../../model/actionSfxProjection";
import type { MediaNodeId, SceneNodeId } from "../../model/ids";
import type { ActionNode } from "../../model/nodes";
import type { NodalProject } from "../../model/project";

/**
 * C18.5.3 / C19.1 — Résolution des sources audio pour l’aperçu nodal.
 *
 * La **lecture** passe par `audioChannelsService` (3 canaux) depuis C19.1 ;
 * ce fichier ne garde que des **helpers purs** (graphe → URL/volume).
 *
 * Projection SFX : alignée sur `js/editor-shared-nodal-to-dom.js`
 * (`mediaAudioLinkedFromAction` + fusion dans `nodalActionToUnified`) et
 * sur `serialize/toProjectJson.ts` (`resolveLinkedMediaAudioSfxForAction`).
 */

/**
 * Récupère l'ambiance scène = premier `MediaAudioNode` lié à la scène
 * par une edge `meta` (scène → média). Retourne `null` si
 * pas de média audio relié ou URL vide.
 */
export function resolveSceneAmbiance(
  state: NodalProject,
  sceneId: SceneNodeId
): { url: string; volume: number } | null {
  for (const e of state.edges) {
    if (e.family !== "meta" || e.sourceId !== sceneId) continue;
    const tid = e.targetId as MediaNodeId;
    const m = state.media[tid];
    if (!m || m.mediaType !== "media-audio") continue;
    const url = String(m.data.url ?? "").trim();
    if (!url) continue;
    const volume = typeof m.data.volume === "number" ? m.data.volume : 1;
    return { url, volume };
  }
  return null;
}

/**
 * SFX d'une action pour lecture / preview : d'abord nœud `media-audio`
 * relié par edge `meta` (action → média), sinon repli sur `action.sfx`
 * (import JSON, tests, cas sans média lié).
 */
export function resolveActionSfx(
  state: NodalProject,
  action: ActionNode
): { url: string; volume: number } | null {
  const linked = resolveLinkedMediaAudioSfxForAction(state, action.id);
  if (linked?.url) return linked;

  const sfx = action?.sfx;
  if (!sfx) return null;
  const url = String(sfx.url ?? "").trim();
  if (!url) return null;
  const volume = typeof sfx.volume === "number" ? sfx.volume : 1;
  return { url, volume };
}
