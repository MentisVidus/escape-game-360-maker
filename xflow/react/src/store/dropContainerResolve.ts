import type { ActionNodeId, AnyNodeId, SceneBoxNodeId } from "../model/ids";
import type { NodalProject } from "../model/project";
import {
  absoluteFlowPositionInPane,
  computeContainerBounds,
  parentIdDepth,
} from "../view/nesting/containerBounds";
import { DEFAULT_NODE_HEIGHT, DEFAULT_NODE_WIDTH, flowPointInRect } from "../view/nesting/geometry";

/**
 * Hit-test conteneurs palette / D&D (C9.2–C9.3).
 * Ordre : **selector** (plus profond d’abord) → **REQ/PWD** (zone récompense géométrique C8.6.3) → **s-box**.
 */
export type DropContainerHit =
  | { kind: "selector"; id: ActionNodeId }
  | { kind: "reqPwd"; id: ActionNodeId }
  | { kind: "sceneBox"; id: SceneBoxNodeId };

function nodeMeasuredSize(state: NodalProject, nodeId: AnyNodeId): { width: number; height: number } {
  const l = state.layout[nodeId];
  return {
    width: l?.width ?? DEFAULT_NODE_WIDTH,
    height: l?.height ?? DEFAULT_NODE_HEIGHT,
  };
}

/**
 * Rectangle zone « Récompense » en coordonnées flow absolues (aligné sur `nodes.css` :
 * `right: -88px`, `width: 80px`, `top: 14px`, `height: calc(100% - 28px)`).
 */
export function rewardZoneFlowRect(
  state: NodalProject,
  reqOrPwdId: ActionNodeId
): { x: number; y: number; width: number; height: number } | null {
  const act = state.actions[reqOrPwdId];
  if (!act || (act.actionType !== "req" && act.actionType !== "pwd")) return null;
  if ("rewardActionId" in act && act.rewardActionId) return null;
  const abs = absoluteFlowPositionInPane(state, reqOrPwdId);
  const { width: W, height: H } = nodeMeasuredSize(state, reqOrPwdId);
  const h = Math.max(0, H - 28);
  if (h <= 0) return null;
  return {
    x: abs.x + W + 8,
    y: abs.y + 14,
    width: 80,
    height: h,
  };
}

/**
 * S-box dont le cadre (bounds conteneur) contient `position` en flow absolu.
 * Chevauchement : priorité au s-box dont la scène est la plus profonde.
 */
export function findSceneBoxAtFlowPoint(state: NodalProject, position: { x: number; y: number }): SceneBoxNodeId | null {
  const hits: SceneBoxNodeId[] = [];
  for (const bid of Object.keys(state.sceneBoxes) as SceneBoxNodeId[]) {
    const box = state.sceneBoxes[bid];
    if (!box || !(box.sceneId in state.scenes)) continue;
    const abs = absoluteFlowPositionInPane(state, bid);
    const { width, height } = computeContainerBounds(state, bid);
    const rect = { x: abs.x, y: abs.y, width, height };
    if (flowPointInRect(position.x, position.y, rect)) hits.push(bid);
  }
  if (hits.length === 0) return null;
  if (hits.length === 1) return hits[0]!;
  hits.sort(
    (a, b) =>
      parentIdDepth(state, state.sceneBoxes[a]!.sceneId) - parentIdDepth(state, state.sceneBoxes[b]!.sceneId)
  );
  return hits[hits.length - 1]!;
}

/**
 * Q-C9.3-1 — Conteneur le plus adapté sous le point (selectors triés profondeur décroissante).
 * REQ/PWD : uniquement si **pas** de `rewardActionId` et point dans `rewardZoneFlowRect`.
 */
export function findDeepestDropContainer(
  state: NodalProject,
  position: { x: number; y: number }
): DropContainerHit | null {
  const selectorHits: ActionNodeId[] = [];
  for (const aid of Object.keys(state.actions) as ActionNodeId[]) {
    const a = state.actions[aid];
    if (!a || a.actionType !== "selector") continue;
    const abs = absoluteFlowPositionInPane(state, aid);
    const { width, height } = computeContainerBounds(state, aid);
    const rect = { x: abs.x, y: abs.y, width, height };
    if (flowPointInRect(position.x, position.y, rect)) selectorHits.push(aid);
  }
  if (selectorHits.length > 0) {
    selectorHits.sort((a, b) => parentIdDepth(state, b) - parentIdDepth(state, a));
    return { kind: "selector", id: selectorHits[0]! };
  }

  const reqHits: ActionNodeId[] = [];
  for (const aid of Object.keys(state.actions) as ActionNodeId[]) {
    const a = state.actions[aid];
    if (!a || (a.actionType !== "req" && a.actionType !== "pwd")) continue;
    if ("rewardActionId" in a && a.rewardActionId) continue;
    const zone = rewardZoneFlowRect(state, aid);
    if (!zone) continue;
    if (flowPointInRect(position.x, position.y, zone)) reqHits.push(aid);
  }
  if (reqHits.length > 0) {
    reqHits.sort((a, b) => parentIdDepth(state, b) - parentIdDepth(state, a));
    return { kind: "reqPwd", id: reqHits[0]! };
  }

  const bid = findSceneBoxAtFlowPoint(state, position);
  if (bid) return { kind: "sceneBox", id: bid };

  return null;
}
