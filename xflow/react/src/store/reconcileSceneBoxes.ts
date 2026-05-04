import { asSceneBoxNodeId, type ActionNodeId, type SceneBoxNodeId, type SceneNodeId } from "../model/ids";
import type { SceneBoxNode } from "../model/nodes";
import type { NodalProject } from "../model/project";
import {
  enforceFrameContentMinInsetX,
  reanchorSBox,
  SCENE_PADDING_TOP,
  SCENE_PADDING_X,
} from "../view/nesting/containerBounds";

/** Id déterministe : un s-box par scène (1.b.2.x). */
export function sboxIdFromScene(sceneId: SceneNodeId): SceneBoxNodeId {
  return asSceneBoxNodeId(`sbox-${String(sceneId)}`);
}

/**
 * Garantit pour chaque scène un `sceneBox` + layout, reparente la scène sous le s-box,
 * migre les hotspots `parentId === sceneId` vers le s-box (coords relatives inchangées
 * tant que le s-box reprend l’ancienne origine scène).
 * Supprime les s-box orphelins. Idempotent.
 */
export function reconcileSceneBoxes(state: NodalProject): void {
  for (const scene of Object.values(state.scenes)) {
    const bid = sboxIdFromScene(scene.id);
    if (!state.sceneBoxes[bid]) {
      state.sceneBoxes[bid] = { id: bid, nodeType: "sceneBox", sceneId: scene.id } satisfies SceneBoxNode;
    }

    const sl = state.layout[scene.id];
    if (!sl) {
      state.layout[scene.id] = { x: 0, y: 0, parentId: bid, collapsed: false };
      if (!state.layout[bid]) {
        state.layout[bid] = { x: 0, y: 0, parentId: null, collapsed: false };
      }
      continue;
    }

    if (sl.parentId === bid) {
      if (!state.layout[bid]) {
        state.layout[bid] = { x: 0, y: 0, parentId: null, collapsed: false };
      }
      continue;
    }

    /* Scène racine (hydrate / legacy) : le s-box reprend son coin absolu. */
    if (!sl.parentId) {
      const absX = sl.x;
      const absY = sl.y;
      state.layout[bid] = {
        ...(state.layout[bid] ?? {}),
        x: absX,
        y: absY,
        parentId: null,
        collapsed: state.layout[bid]?.collapsed ?? false,
      };

      for (const edge of state.edges) {
        if (edge.family !== "flow" || edge.sourceId !== scene.id || !(edge.targetId in state.actions)) continue;
        const aid = edge.targetId as ActionNodeId;
        const al = state.layout[aid];
        if (!al || al.parentId !== scene.id) continue;
        state.layout[aid] = { ...al, parentId: bid };
      }

      state.layout[scene.id] = {
        ...sl,
        parentId: bid,
        x: SCENE_PADDING_X,
        y: SCENE_PADDING_TOP,
      };
    }

    /* Hotspots encore `parentId === scene` alors que la scène est sous le s-box (état intermédiaire). */
    for (const edge of state.edges) {
      if (edge.family !== "flow" || edge.sourceId !== scene.id || !(edge.targetId in state.actions)) continue;
      const aid = edge.targetId as ActionNodeId;
      const al = state.layout[aid];
      if (!al || al.parentId !== scene.id) continue;
      const sl2 = state.layout[scene.id];
      if (!sl2 || sl2.parentId !== bid) continue;
      state.layout[aid] = { ...al, parentId: bid, x: sl2.x + al.x, y: sl2.y + al.y };
    }
  }

  for (const bid of Object.keys(state.sceneBoxes) as SceneBoxNodeId[]) {
    const box = state.sceneBoxes[bid];
    if (!box || !(box.sceneId in state.scenes)) {
      delete state.sceneBoxes[bid];
      delete state.layout[bid];
    }
  }

  for (const bid of Object.keys(state.sceneBoxes) as SceneBoxNodeId[]) {
    reanchorSBox(state, bid);
  }
  enforceFrameContentMinInsetX(state);
}
