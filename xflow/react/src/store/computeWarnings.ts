import type { ActionNodeId, AnyNodeId, SceneNodeId } from "../model/ids";
import type { ActionNode } from "../model/nodes";
import type { NodalProject } from "../model/project";
import { getActionContextualState } from "./reconcileAutoSatellites";

export type WarningCode =
  | "DRAFT"
  | "REWARD_MISSING"
  | "REWARD_CHAIN"
  | "SELECTOR_EMPTY"
  | "SCENE_UNREACHABLE"
  | "GOTO_ORPHAN"
  | "SELECTOR_CYCLE"
  | "OBJECT_UNDEFINED";

export type Warning = {
  code: WarningCode;
  nodeId: AnyNodeId;
  label: string;
};

const isReqOrPwd = (action: ActionNode): action is Extract<ActionNode, { actionType: "req" | "pwd" }> =>
  action.actionType === "req" || action.actionType === "pwd";

const countRewardDepth = (state: NodalProject, startId: ActionNodeId): number => {
  let depth = 0;
  let currentId: ActionNodeId | null = startId;
  const seen = new Set<ActionNodeId>();
  while (currentId) {
    if (seen.has(currentId)) break;
    seen.add(currentId);
    const action: ActionNode | undefined = state.actions[currentId as keyof typeof state.actions];
    if (!action || !isReqOrPwd(action) || !action.rewardActionId) break;
    depth += 1;
    currentId = action.rewardActionId;
  }
  return depth;
};

const hasGotoOutEdge = (state: NodalProject, actionId: ActionNodeId): boolean =>
  state.edges.some(
    (edge) => edge.family === "transition" && edge.sourceId === actionId && edge.targetId in state.scenes
  );

const findSelectorCycleNodes = (state: NodalProject): Set<ActionNodeId> => {
  const selectors = (Object.keys(state.actions) as ActionNodeId[]).filter(
    (id) => state.actions[id]?.actionType === "selector"
  );
  const color = new Map<ActionNodeId, 0 | 1 | 2>();
  const cycleNodes = new Set<ActionNodeId>();

  const visit = (selectorId: ActionNodeId): void => {
    color.set(selectorId, 1);
    for (const childId of selectors) {
      const childLayout = state.layout[childId];
      if (!childLayout || childLayout.parentId !== selectorId) continue;
      const c = color.get(childId) ?? 0;
      if (c === 1) {
        cycleNodes.add(childId);
        cycleNodes.add(selectorId);
        continue;
      }
      if (c === 0) visit(childId);
    }
    color.set(selectorId, 2);
  };

  for (const selectorId of selectors) {
    if ((color.get(selectorId) ?? 0) === 0) visit(selectorId);
  }
  return cycleNodes;
};

const collectReachableSceneIds = (state: NodalProject): Set<SceneNodeId> => {
  const start = state.meta.startSceneId;
  if (!start || !(start in state.scenes)) return new Set<SceneNodeId>();

  const visited = new Set<AnyNodeId>();
  const reachableScenes = new Set<SceneNodeId>();
  const stack: AnyNodeId[] = [start];

  while (stack.length > 0) {
    const nodeId = stack.pop()!;
    if (visited.has(nodeId)) continue;
    visited.add(nodeId);
    if (nodeId in state.scenes) reachableScenes.add(nodeId as SceneNodeId);

    for (const edge of state.edges) {
      if (edge.sourceId !== nodeId) continue;
      if (edge.family !== "flow" && edge.family !== "transition") continue;
      if (!visited.has(edge.targetId)) stack.push(edge.targetId);
    }
  }
  return reachableScenes;
};

export function computeWarnings(state: NodalProject): Warning[] {
  const warnings: Warning[] = [];

  for (const actionId of Object.keys(state.actions) as ActionNodeId[]) {
    const action = state.actions[actionId];
    if (!action) continue;
    const layout = state.layout[actionId];
    const hasFlowIn = state.edges.some(
      (edge) => edge.family === "flow" && edge.targetId === actionId && edge.sourceId in state.scenes
    );
    const isDraft = !hasFlowIn && !layout?.parentId;
    if (isDraft) {
      warnings.push({
        code: "DRAFT",
        nodeId: actionId,
        label: "Action orpheline — reliez-la pour qu'elle soit exportee.",
      });
    }

    if (isReqOrPwd(action)) {
      const contextState = getActionContextualState(state, actionId);
      if (contextState !== 1 && !action.rewardActionId) {
        warnings.push({
          code: "REWARD_MISSING",
          nodeId: actionId,
          label: `Recompense manquante pour ${action.label}.`,
        });
      }
      if (countRewardDepth(state, actionId) >= 2) {
        warnings.push({
          code: "REWARD_CHAIN",
          nodeId: actionId,
          label: "Chaine de recompenses profonde — verifier l'intention.",
        });
      }
    }

    if (action.actionType === "selector") {
      const hasChild = (Object.keys(state.actions) as ActionNodeId[]).some(
        (candidateId) => state.layout[candidateId]?.parentId === actionId
      );
      if (!hasChild) {
        warnings.push({
          code: "SELECTOR_EMPTY",
          nodeId: actionId,
          label: "Menu vide — ajoutez au moins un choix.",
        });
      }
    }

    if (action.actionType === "goto" && !hasGotoOutEdge(state, actionId)) {
      warnings.push({
        code: "GOTO_ORPHAN",
        nodeId: actionId,
        label: "Transition sans cible.",
      });
    }

    if (action.actionType === "req") {
      const objectSatIds = state.edges
        .filter((edge) => edge.family === "meta" && edge.sourceId === actionId && edge.targetId in state.satellites)
        .map((edge) => edge.targetId)
        .filter((sid) => state.satellites[sid as keyof typeof state.satellites]?.satelliteType === "object");
      for (const satId of objectSatIds) {
        const sat = state.satellites[satId as keyof typeof state.satellites];
        if (!sat || sat.satelliteType !== "object") continue;
        const objectId = sat.data.objectId.trim();
        if (objectId && !state.meta.objects[objectId]) {
          warnings.push({
            code: "OBJECT_UNDEFINED",
            nodeId: actionId,
            label: "Objet requis sans definition.",
          });
          break;
        }
      }
    }
  }

  const startSceneId = state.meta.startSceneId;
  if (startSceneId && startSceneId in state.scenes) {
    const reachable = collectReachableSceneIds(state);
    for (const sceneId of Object.keys(state.scenes) as SceneNodeId[]) {
      if (!reachable.has(sceneId)) {
        warnings.push({
          code: "SCENE_UNREACHABLE",
          nodeId: sceneId,
          label: "Scene inaccessible dans le parcours joueur.",
        });
      }
    }
  }

  for (const selectorId of findSelectorCycleNodes(state)) {
    warnings.push({
      code: "SELECTOR_CYCLE",
      nodeId: selectorId,
      label: "Menu recursif detecte.",
    });
    break;
  }

  return warnings;
}
