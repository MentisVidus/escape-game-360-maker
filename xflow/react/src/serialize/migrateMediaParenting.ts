import type { Edge } from "../model/edges";
import type { AnyNodeId, MediaNodeId } from "../model/ids";
import type { NodalProject } from "../model/project";
import { rebindMediaLayoutToMetaSource } from "../store/mediaMetaLayout";

/**
 * C8.1.b.5 — Media auto-parentés sur la source de leur edge meta entrante.
 * Idempotent ; dédoublonne les meta-in multiples (legacy).
 */
export function migrateMediaParenting(state: NodalProject): void {
  const byMedia = new Map<MediaNodeId, Edge[]>();
  for (const e of state.edges) {
    if (e.family !== "meta") continue;
    if (!(e.targetId in state.media)) continue;
    const mid = e.targetId as MediaNodeId;
    const arr = byMedia.get(mid) ?? [];
    arr.push(e);
    byMedia.set(mid, arr);
  }

  for (const [mediaId, incoming] of byMedia) {
    if (incoming.length <= 1) continue;
    const keep = incoming[0];
    const removed = incoming.length - 1;
    console.warn(
      `[migrateMediaParenting] ${String(mediaId)} : ${incoming.length} meta-in détectées, ${removed} supprimées`
    );
    const keepId = keep.id;
    state.edges = state.edges.filter((e) => {
      if (e.family !== "meta" || e.targetId !== mediaId) return true;
      return e.id === keepId;
    });
  }

  for (const e of state.edges) {
    if (e.family !== "meta" || !(e.targetId in state.media)) continue;
    const mediaId = e.targetId as MediaNodeId;
    const lo = state.layout[mediaId];
    if (!lo) continue;
    if (lo.parentId === e.sourceId) continue;
    rebindMediaLayoutToMetaSource(state, e.sourceId as AnyNodeId, mediaId);
  }
}
