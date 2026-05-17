import type { MediaNodeId, SceneNodeId } from "./ids";
import type { NodalProject } from "./project";

/**
 * C23.2 — Q-C23.1-8 (B) : priorité nœud `media-image` meta, sinon `scene.panoramaUrl`.
 * Aligné `resolveScenePanoramaDisplayUrl` / `mediaImageLinkedFromScene` (nodal-to-dom).
 */
export function resolveScenePanoramaUrlForExport(state: NodalProject, sceneId: SceneNodeId): string {
  for (const e of state.edges) {
    if (e.family !== "meta" || e.sourceId !== sceneId) continue;
    const tid = e.targetId as MediaNodeId;
    const m = state.media[tid];
    if (!m || m.mediaType !== "media-image") continue;
    const url = String(m.data.url ?? "").trim();
    if (url) return url;
  }
  const scene = state.scenes[sceneId];
  return scene ? String(scene.panoramaUrl ?? "").trim() : "";
}
