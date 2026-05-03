import type { AnyNodeId, MediaNodeId } from "../model/ids";
import type { NodalProject } from "../model/project";
import { getAbsolutePosition } from "../view/nesting/geometry";
import { buildNestedNodesMapFromProject } from "../view/nesting/projectNestedMap";

/** Connexion meta : media sans parent → coords relatives au source (C8.1.b.5). */
export function attachMediaToMetaSource(state: NodalProject, sourceId: AnyNodeId, mediaId: MediaNodeId): void {
  const lo = state.layout[mediaId];
  if (!lo) return;
  if (lo.parentId != null) {
    console.warn(
      `[attachMediaToMetaSource] media ${String(mediaId)} a déjà parentId=${String(lo.parentId)}, skip (policy)`
    );
    return;
  }
  const map = buildNestedNodesMapFromProject(state);
  const srcN = map.get(sourceId as string);
  const medN = map.get(mediaId as string);
  if (!srcN || !medN) return;
  const sAbs = getAbsolutePosition(srcN, map);
  const mAbs = getAbsolutePosition(medN, map);
  state.layout[mediaId] = {
    ...lo,
    parentId: sourceId,
    x: mAbs.x - sAbs.x,
    y: mAbs.y - sAbs.y,
  };
}

/** Déconnexion meta : si le media était parenté à ce source → monde absolu (C8.1.b.5). */
export function detachMediaFromMetaSource(state: NodalProject, sourceId: AnyNodeId, mediaId: MediaNodeId): void {
  const lo = state.layout[mediaId];
  if (!lo || lo.parentId !== sourceId) return;
  const map = buildNestedNodesMapFromProject(state);
  const medN = map.get(mediaId as string);
  if (!medN) return;
  const mAbs = getAbsolutePosition(medN, map);
  state.layout[mediaId] = {
    ...lo,
    parentId: null,
    x: mAbs.x,
    y: mAbs.y,
  };
}

/**
 * Recâble le media sur le source meta (migration / parentId incohérent).
 * Recalcule toujours x,y relatives depuis les positions monde actuelles.
 */
export function rebindMediaLayoutToMetaSource(state: NodalProject, sourceId: AnyNodeId, mediaId: MediaNodeId): void {
  const lo = state.layout[mediaId];
  if (!lo) return;
  const map = buildNestedNodesMapFromProject(state);
  const srcN = map.get(sourceId as string);
  const medN = map.get(mediaId as string);
  if (!srcN || !medN) return;
  const sAbs = getAbsolutePosition(srcN, map);
  const mAbs = getAbsolutePosition(medN, map);
  state.layout[mediaId] = {
    ...lo,
    parentId: sourceId,
    x: mAbs.x - sAbs.x,
    y: mAbs.y - sAbs.y,
  };
}
