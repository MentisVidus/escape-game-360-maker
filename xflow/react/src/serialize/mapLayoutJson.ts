import type { ActionNodeId, AnyNodeId } from "../model/ids";
import type { ObjectEntry } from "../model/objects";
import type { NodalProject } from "../model/project";

export type MapLayoutJson = {
  positions: Record<string, { x: number; y: number }>;
  parentId: Record<string, string>;
  collapsed: Record<string, boolean>;
  drafts: string[];
  viewport: { x: number; y: number; zoom: number };
  /** Inventaire partagé (C3a). Les satellites / edges meta ne sont pas sérialisés ici : recréés par reconcile après apply. */
  inventoryObjects?: Record<string, ObjectEntry>;
};

const isActionOrphan = (state: NodalProject, actionId: ActionNodeId): boolean => {
  const layout = state.layout[actionId];
  if (layout?.parentId) return false;

  const hasFlowIn = state.edges.some((edge) => edge.family === "flow" && edge.targetId === actionId);
  if (hasFlowIn) return false;

  const isReward = Object.values(state.actions).some(
    (action) => (action.actionType === "req" || action.actionType === "pwd") && action.rewardActionId === actionId
  );
  return !isReward;
};

export const serializeLayout = (state: NodalProject): MapLayoutJson => {
  const positions: MapLayoutJson["positions"] = {};
  const parentId: MapLayoutJson["parentId"] = {};
  const collapsed: MapLayoutJson["collapsed"] = {};

  for (const [nodeId, layout] of Object.entries(state.layout) as Array<[AnyNodeId, NodalProject["layout"][AnyNodeId]]>) {
    positions[nodeId] = { x: layout.x, y: layout.y };
    collapsed[nodeId] = layout.collapsed;
    if (layout.parentId) parentId[nodeId] = layout.parentId;
  }

  const draftSet = new Set<string>(state.meta.draftActionIds);
  for (const actionId of Object.keys(state.actions) as ActionNodeId[]) {
    if (isActionOrphan(state, actionId)) draftSet.add(actionId);
  }

  return {
    positions,
    parentId,
    collapsed,
    drafts: [...draftSet],
    viewport: { ...state.meta.viewport },
    inventoryObjects: { ...state.meta.objects },
  };
};

export const applyLayout = (state: NodalProject, layout: MapLayoutJson): void => {
  for (const [nodeId, position] of Object.entries(layout.positions)) {
    const existing = state.layout[nodeId as AnyNodeId];
    state.layout[nodeId as AnyNodeId] = {
      x: position.x,
      y: position.y,
      parentId: layout.parentId[nodeId] ? (layout.parentId[nodeId] as AnyNodeId) : existing?.parentId ?? null,
      collapsed: layout.collapsed[nodeId] ?? existing?.collapsed ?? false,
    };
  }
  state.meta.draftActionIds = layout.drafts as ActionNodeId[];
  state.meta.viewport = { ...layout.viewport };

  if (layout.inventoryObjects !== undefined) {
    state.meta.objects = { ...layout.inventoryObjects };
  }
};
