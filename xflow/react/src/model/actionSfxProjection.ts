import type { ActionNodeId, MediaNodeId } from "./ids";
import type { NodalProject } from "./project";

/**
 * C19.1 — Même règle que `mediaAudioLinkedFromAction` dans
 * `js/editor-shared-nodal-to-dom.js` : première arête `meta` action →
 * nœud `media-audio` ; url/volume issus du média (projection lecture /
 * export), sans exiger que `action.sfx` soit synchronisé dans le store.
 */
export function resolveLinkedMediaAudioSfxForAction(
  state: NodalProject,
  actionId: ActionNodeId
): { url: string; volume: number; mediaNodeId: MediaNodeId } | null {
  for (const e of state.edges) {
    if (e.family !== "meta" || e.sourceId !== actionId) continue;
    const mid = e.targetId as MediaNodeId;
    const m = state.media[mid];
    if (!m || m.mediaType !== "media-audio" || !m.data) continue;
    const url = String(m.data.url ?? "").trim();
    const rawVol = m.data.volume;
    const volume =
      typeof rawVol === "number" && !Number.isNaN(rawVol) ? Math.max(0, Math.min(1, rawVol)) : 1;
    return { url, volume, mediaNodeId: mid };
  }
  return null;
}
