import type { SceneBoxNodeId } from "../../model/ids";
import type { NodalProject } from "../../model/project";
import { buildChildrenByParent, computeContainerBounds } from "./containerBounds";
import { collectHiddenIdsFromCollapsedContainers } from "../nodalReactFlowProjection";

/** Marge minimale entre cadres s-box (C8.1.b.6). */
export const SBOX_GAP = 24;

/** Tolérance « position inchangée » pour le rewind au repli (phase 2). */
export const SBOX_REWIND_EPSILON_PX = 5;

export type SBoxRect = { x: number; y: number; width: number; height: number };

export type SBoxDisplacement = {
  id: SceneBoxNodeId;
  from: { x: number; y: number };
  to: { x: number; y: number };
};

function hiddenIdsForSBoxBounds(state: NodalProject): ReadonlySet<string> {
  const childrenByParent = buildChildrenByParent(state);
  return collectHiddenIdsFromCollapsedContainers(state, childrenByParent);
}

/** Rectangle monde d’un s-box (aligné sur `toReactFlowNodes` / `computeContainerBounds`). */
export function sboxWorldRect(state: NodalProject, sboxId: SceneBoxNodeId): SBoxRect | null {
  const lo = state.layout[sboxId];
  if (!lo || !state.sceneBoxes[sboxId]) return null;
  const hidden = hiddenIdsForSBoxBounds(state);
  const { width, height } = computeContainerBounds(state, sboxId, { excludeIds: hidden });
  return { x: lo.x, y: lo.y, width, height };
}

/** Vrai si les deux cadres ne sont pas séparés d’au moins `gap` sur **les deux** axes à la fois. */
export function rectsNeedSeparation(a: SBoxRect, b: SBoxRect, gap: number = SBOX_GAP): boolean {
  const horizClear = a.x + a.width + gap <= b.x || b.x + b.width + gap <= a.x;
  const vertClear = a.y + a.height + gap <= b.y || b.y + b.height + gap <= a.y;
  return !(horizClear || vertClear);
}

/**
 * Déplacement minimal pour éloigner `other` de `anchor` (un seul axe, plus court chemin + gap).
 */
export function computeMinPushSeparation(anchor: SBoxRect, other: SBoxRect, gap: number = SBOX_GAP): { dx: number; dy: number } {
  const acx = anchor.x + anchor.width / 2;
  const acy = anchor.y + anchor.height / 2;
  const bcx = other.x + other.width / 2;
  const bcy = other.y + other.height / 2;

  let sepX = 0;
  const overlapX = Math.min(anchor.x + anchor.width, other.x + other.width) - Math.max(anchor.x, other.x);
  if (overlapX > 0) {
    sepX = (overlapX + gap) * (bcx >= acx ? 1 : -1);
  } else {
    if (anchor.x + anchor.width <= other.x) {
      const g = other.x - (anchor.x + anchor.width);
      if (g < gap) sepX = gap - g;
    } else if (other.x + other.width <= anchor.x) {
      const g = anchor.x - (other.x + other.width);
      if (g < gap) sepX = -(gap - g);
    }
  }

  let sepY = 0;
  const overlapY = Math.min(anchor.y + anchor.height, other.y + other.height) - Math.max(anchor.y, other.y);
  if (overlapY > 0) {
    sepY = (overlapY + gap) * (bcy >= acy ? 1 : -1);
  } else {
    if (anchor.y + anchor.height <= other.y) {
      const g = other.y - (anchor.y + anchor.height);
      if (g < gap) sepY = gap - g;
    } else if (other.y + other.height <= anchor.y) {
      const g = anchor.y - (other.y + other.height);
      if (g < gap) sepY = -(gap - g);
    }
  }

  if (sepX !== 0 && sepY !== 0) {
    if (Math.abs(sepX) <= Math.abs(sepY)) return { dx: sepX, dy: 0 };
    return { dx: 0, dy: sepY };
  }
  if (sepX !== 0) return { dx: sepX, dy: 0 };
  if (sepY !== 0) return { dx: 0, dy: sepY };
  return { dx: 0, dy: 0 };
}

/**
 * Résout les chevauchements entre s-box après dépli (phase 1).
 * Modifie `state.layout` pour chaque s-box déplacée. Retourne la trace pour la phase 2.
 */
export function resolveSBoxOverlapsAfterUnfold(state: NodalProject, _originId: SceneBoxNodeId, maxIter = 5): SBoxDisplacement[] {
  const trace: SBoxDisplacement[] = [];
  const ids = (Object.keys(state.sceneBoxes) as SceneBoxNodeId[]).sort();

  for (let iter = 0; iter < maxIter; iter++) {
    let moved = false;
    for (let i = 0; i < ids.length; i++) {
      for (let j = i + 1; j < ids.length; j++) {
        const idA = ids[i]!;
        const idB = ids[j]!;
        const ra = sboxWorldRect(state, idA);
        const rb = sboxWorldRect(state, idB);
        if (!ra || !rb || !rectsNeedSeparation(ra, rb)) continue;

        const push = computeMinPushSeparation(ra, rb);
        if (push.dx === 0 && push.dy === 0) continue;

        const lo = state.layout[idB];
        if (!lo) continue;
        const from = { x: lo.x, y: lo.y };
        const to = { x: lo.x + push.dx, y: lo.y + push.dy };
        trace.push({ id: idB, from, to });
        state.layout[idB] = { ...lo, x: to.x, y: to.y };
        moved = true;
      }
    }
    if (!moved) break;
  }

  return trace;
}

/** Phase 2 : si la boîte n’a pas bougé manuellement depuis le push, rewind vers `from`. */
export function rewindSBoxOverlapPushes(state: NodalProject, trace: SBoxDisplacement[]): void {
  for (let k = trace.length - 1; k >= 0; k--) {
    const { id, from, to } = trace[k]!;
    const lo = state.layout[id];
    if (!lo) continue;
    if (Math.abs(lo.x - to.x) > SBOX_REWIND_EPSILON_PX || Math.abs(lo.y - to.y) > SBOX_REWIND_EPSILON_PX) {
      continue;
    }
    state.layout[id] = { ...lo, x: from.x, y: from.y };
  }
}
