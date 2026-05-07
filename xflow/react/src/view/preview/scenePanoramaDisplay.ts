import type { MediaNodeId, SceneNodeId } from "../../model/ids";
import type { NodalProject } from "../../model/project";

/** Aligné sur `EditorCore.DEFAULT_SCENE_PANORAMA_PLACEHOLDER_URL` (js/editor-core.js). */
export const DEFAULT_MEDIA_IMAGE_PLACEHOLDER_URL =
  "https://cdn.jsdelivr.net/gh/MentisVidus/escape-game-360-maker@main/media/equirectangular_placeholder_grid.png";

/**
 * URL affichable pour l’aperçu 360° : `scene.panoramaUrl` si renseigné, sinon premier
 * média **image** lié en meta (scène → média, `family: "meta"`, `sourceId === sceneId`).
 */
export function resolveScenePanoramaDisplayUrl(state: NodalProject, sceneId: SceneNodeId): string {
  const scene = state.scenes[sceneId];
  if (!scene) return "";
  const direct = String(scene.panoramaUrl ?? "").trim();
  if (direct) return direct;
  for (const e of state.edges) {
    if (e.family !== "meta" || e.sourceId !== sceneId) continue;
    const tid = e.targetId as MediaNodeId;
    const m = state.media[tid];
    if (!m || m.mediaType !== "media-image") continue;
    const url = String(m.data.url ?? "").trim();
    if (url) return url;
  }
  return "";
}
