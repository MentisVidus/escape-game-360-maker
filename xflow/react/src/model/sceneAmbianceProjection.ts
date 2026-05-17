import type { MediaNodeId, SceneNodeId } from "./ids";
import type { NodalProject } from "./project";

/**
 * C23.2 — Même règle que `resolveSceneAmbianceMeta` (`playerPreviewAudio.ts`) :
 * premier `media-audio` lié à la scène par edge `meta`.
 */
export function resolveLinkedMediaAudioAmbianceForScene(
  state: NodalProject,
  sceneId: SceneNodeId
): { url: string; volume: number; mediaNodeId: MediaNodeId } | null {
  for (const e of state.edges) {
    if (e.family !== "meta" || e.sourceId !== sceneId) continue;
    const mid = e.targetId as MediaNodeId;
    const m = state.media[mid];
    if (!m || m.mediaType !== "media-audio" || !m.data) continue;
    const url = String(m.data.url ?? "").trim();
    if (!url) continue;
    const rawVol = m.data.volume;
    const volume =
      typeof rawVol === "number" && !Number.isNaN(rawVol) ? Math.max(0, Math.min(1, rawVol)) : 1;
    return { url, volume, mediaNodeId: mid };
  }
  return null;
}
