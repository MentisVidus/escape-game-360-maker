import type { ActionNodeId, SceneNodeId } from "../model/ids";
import type { ActionNode, ReqActionNode, PwdActionNode, SelectorActionNode } from "../model/nodes";
import type { NodalProject } from "../model/project";
import { INTERNAL_TO_V2_ACTION_TYPE } from "./v2TypeMap";

export type ProjectJsonV2Action = {
  type: string;
  payload: Record<string, unknown>;
  sfx: { url: string; volume: number };
  visibility: { requiresItem: string; hiddenIfHasItem: string; clickWhenInvisible: boolean };
};

export type ProjectJsonV2Scene = {
  id: string;
  title: string;
  panoramaUrl: string;
  hotspots: Array<{ action: ProjectJsonV2Action }>;
};

export type ProjectJsonV2 = {
  schemaVersion: 2;
  title: string;
  startSceneId: string | null;
  scenes: ProjectJsonV2Scene[];
};

const isReqOrPwd = (action: ActionNode): action is ReqActionNode | PwdActionNode =>
  action.actionType === "req" || action.actionType === "pwd";

const isSelector = (action: ActionNode): action is SelectorActionNode => action.actionType === "selector";

export const getSelectorChildren = (state: NodalProject, parentId: ActionNodeId): ActionNodeId[] => {
  const viaParentId = (Object.keys(state.actions) as ActionNodeId[]).filter(
    (candidateId) => state.layout[candidateId]?.parentId === parentId
  );
  if (viaParentId.length > 0) return viaParentId;

  return getSelectorChildrenFlowOrder(state, parentId);
};

/** Ordre des choix = ordre des arêtes `flow` (aligné `deserializeFromProjectJson` et path keys sat/media). */
export const getSelectorChildrenFlowOrder = (state: NodalProject, parentId: ActionNodeId): ActionNodeId[] =>
  state.edges
    .filter((edge) => edge.family === "flow" && edge.sourceId === parentId && edge.targetId in state.actions)
    .map((edge) => edge.targetId as ActionNodeId);

export const sortActionIdsByY = (state: NodalProject, actionIds: ActionNodeId[]): ActionNodeId[] =>
  [...actionIds].sort((a, b) => {
    const ya = state.layout[a]?.y ?? 0;
    const yb = state.layout[b]?.y ?? 0;
    if (ya !== yb) return ya - yb;
    return String(a).localeCompare(String(b));
  });

const serializeAction = (state: NodalProject, actionId: ActionNodeId): ProjectJsonV2Action | null => {
  const action = state.actions[actionId];
  if (!action) return null;

  const payload: Record<string, unknown> = { ...action.payload };
  const actionType = INTERNAL_TO_V2_ACTION_TYPE[action.actionType];

  if (isReqOrPwd(action)) {
    const rewardActionId = action.rewardActionId;
    if (!rewardActionId) return null;
    const rewardAction = serializeAction(state, rewardActionId);
    if (!rewardAction) return null;
    payload.rewardAction = rewardAction;
  }

  if (isSelector(action)) {
    // C3 : ordre des choix = `parentId` + Y (fallback legacy : edges flow encore présentes).
    const children = sortActionIdsByY(state, getSelectorChildren(state, action.id));
    payload.nested = {
      ...action.payload.nested,
      choices: children
        .map((childId, index) => {
          const childAction = serializeAction(state, childId);
          if (!childAction) return null;
          return { label: `Option ${index + 1}`, action: childAction };
        })
        .filter((choice): choice is { label: string; action: ProjectJsonV2Action } => choice !== null),
    };
  }

  return {
    type: actionType,
    payload,
    sfx: { ...action.sfx },
    visibility: { ...action.visibility },
  };
};

export const getHotspotActionIdsForScene = (state: NodalProject, sceneId: SceneNodeId): ActionNodeId[] =>
  state.edges
    .filter((edge) => {
      if (edge.family !== "flow" || edge.sourceId !== sceneId || !(edge.targetId in state.actions)) return false;
      const p = state.layout[edge.targetId]?.parentId;
      return p == null || p === sceneId;
    })
    .map((edge) => edge.targetId as ActionNodeId);

export const serializeToProjectJson = (state: NodalProject): ProjectJsonV2 => {
  const startSceneExternalId = state.meta.startSceneId ? state.scenes[state.meta.startSceneId]?.sceneId ?? null : null;
  const scenes = Object.values(state.scenes).map((scene) => ({
    id: scene.sceneId,
    title: scene.label,
    panoramaUrl: scene.panoramaUrl,
    hotspots: getHotspotActionIdsForScene(state, scene.id)
      .map((actionId) => serializeAction(state, actionId))
      .filter((action): action is ProjectJsonV2Action => action !== null)
      .map((action) => ({ action })),
  }));

  return {
    schemaVersion: 2,
    title: state.meta.title,
    startSceneId: startSceneExternalId,
    scenes,
  };
};

