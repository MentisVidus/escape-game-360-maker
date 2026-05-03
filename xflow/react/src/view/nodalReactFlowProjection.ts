/**
 * Projection store nodal → nœuds / edges React Flow (sans UI popup ni Quill),
 * pour tests et pour `NodalCanvas.tsx`.
 */
import type { Edge as RFEdge, Node as RFNode } from "@xyflow/react";

import type { ActionNodeId, AnyNodeId, SceneBoxNodeId, SceneNodeId } from "../model/ids";
import type { NodalProject } from "../model/project";
import { getActionContextualState } from "../store/reconcileAutoSatellites";
import { sboxIdFromScene } from "../store/reconcileSceneBoxes";
import {
  HANDLE_FLOW_IN,
  HANDLE_FLOW_OUT,
  HANDLE_GOTO_IN,
  HANDLE_GOTO_OUT,
  HANDLE_META_IN,
  HANDLE_META_OUT,
  HANDLE_SYNTH_GOTO_OUT,
} from "./handles/handleIds";
import {
  buildChildrenByParent,
  collectDescendantNodeIds,
  computeContainerBounds,
} from "./nesting/containerBounds";

export type NodalRFData = {
  nodeType: "scene" | "action" | "satellite" | "media" | "sceneBox";
  node: unknown;
  isRewardChild?: boolean;
  rewardParentType?: "req" | "pwd" | null;
  contextualState?: 1 | 2 | 3 | 4;
  /** État replié du nœud (C8.1) — actuellement utilisé pour les selectors. */
  collapsed?: boolean;
  /** Nombre de choix imbriqués (selector replié) — pour affichage compteur. */
  selectorChildCount?: number;
  /** Nombre de scènes cibles distinctes via goto internes (selector replié, C8.1.a). */
  synthGotoTargetCount?: number;
  /** Titre scène pour l’étiquette discrète du s-box. */
  label?: string;
  /** S-box parent replié (1.b.3) — chevron / sous-titre / handles sur la scène. */
  containerCollapsed?: boolean;
  /** Nombre d’actions dans le sous-arbre du s-box (hors nœud scène) — chevron si ≥ 1. */
  sceneBoxActionCount?: number;
  /** Cibles goto externes agrégées quand le s-box est replié (handle synth sur la scène). */
  sceneBoxSynthGotoTargetCount?: number;
};

function getCollapsedSelectorIds(state: NodalProject): Set<AnyNodeId> {
  const collapsedSelectorIds = new Set<AnyNodeId>();
  for (const action of Object.values(state.actions)) {
    const layout = state.layout[action.id];
    if (!layout) continue;
    if (action.actionType === "selector" && layout.collapsed) {
      collapsedSelectorIds.add(action.id);
    }
  }
  return collapsedSelectorIds;
}

function getCollapsedSceneBoxIds(state: NodalProject): Set<SceneBoxNodeId> {
  const ids = new Set<SceneBoxNodeId>();
  for (const bid of Object.keys(state.sceneBoxes) as SceneBoxNodeId[]) {
    if (state.layout[bid]?.collapsed) ids.add(bid);
  }
  return ids;
}

/**
 * Descendants (transitifs) des selectors repliés — le selector racine n’est pas inclus.
 * C8.1.b.5-fix : media enfant direct du selector replié inclus (caché comme les choix).
 */
function collectHiddenIdsUnderCollapsedSelectors(
  collapsedSelectorIds: Set<AnyNodeId>,
  childrenByParent: Map<AnyNodeId, AnyNodeId[]>
): Set<AnyNodeId> {
  const hidden = new Set<AnyNodeId>();
  if (collapsedSelectorIds.size === 0) return hidden;
  const stack: AnyNodeId[] = [];
  for (const id of collapsedSelectorIds) stack.push(id);
  while (stack.length > 0) {
    const parent = stack.pop()!;
    const children = childrenByParent.get(parent);
    if (!children) continue;
    for (const child of children) {
      if (hidden.has(child)) continue;
      hidden.add(child);
      stack.push(child);
    }
  }
  return hidden;
}

/** S-box replié : masquer tout sauf la scène (1.b.3) ; C8.1.b.5-fix : descendre sous la scène (media directs, etc.). */
function collectHiddenIdsUnderCollapsedSceneBoxes(
  state: NodalProject,
  collapsedSBoxIds: Set<SceneBoxNodeId>,
  childrenByParent: Map<AnyNodeId, AnyNodeId[]>
): Set<AnyNodeId> {
  const hidden = new Set<AnyNodeId>();
  if (collapsedSBoxIds.size === 0) return hidden;
  for (const bid of collapsedSBoxIds) {
    const box = state.sceneBoxes[bid];
    if (!box) continue;
    const sceneId = box.sceneId;
    const roots = childrenByParent.get(bid);
    if (!roots) continue;
    const stack: AnyNodeId[] = [];
    for (const r of roots) stack.push(r);
    while (stack.length > 0) {
      const id = stack.pop()!;
      if (hidden.has(id)) continue;
      if (id !== sceneId) hidden.add(id);
      const ch = childrenByParent.get(id);
      if (!ch) continue;
      for (const c of ch) stack.push(c);
    }
  }
  return hidden;
}

/** Union masquage selectors + s-box (1.b.3). */
export function collectHiddenIdsFromCollapsedContainers(
  state: NodalProject,
  childrenByParent: Map<AnyNodeId, AnyNodeId[]>
): Set<AnyNodeId> {
  const fromSelectors = collectHiddenIdsUnderCollapsedSelectors(getCollapsedSelectorIds(state), childrenByParent);
  const fromBoxes = collectHiddenIdsUnderCollapsedSceneBoxes(state, getCollapsedSceneBoxIds(state), childrenByParent);
  const out = new Set<AnyNodeId>(fromSelectors);
  for (const id of fromBoxes) out.add(id);
  return out;
}

/** Cibles `transition` agrégées par selector replié (C8.1.a). */
export function collectSynthGotoTargets(
  state: NodalProject,
  collapsedContainerIds: Set<AnyNodeId>,
  childrenByParent: Map<AnyNodeId, AnyNodeId[]>
): Map<AnyNodeId, Set<SceneNodeId>> {
  const out = new Map<AnyNodeId, Set<SceneNodeId>>();
  if (collapsedContainerIds.size === 0) return out;

  const externalSceneIdToNodeId = new Map<string, SceneNodeId>();
  for (const s of Object.values(state.scenes)) {
    externalSceneIdToNodeId.set(s.sceneId, s.id);
    externalSceneIdToNodeId.set(String(s.id), s.id);
  }

  const collectDescendantActionIds = (rootContainerId: AnyNodeId): Set<ActionNodeId> => {
    const actionIds = new Set<ActionNodeId>();
    const stack: AnyNodeId[] = [];
    const first = childrenByParent.get(rootContainerId);
    if (first) {
      for (const c of first) stack.push(c);
    }
    while (stack.length > 0) {
      const id = stack.pop()!;
      if (id in state.actions) actionIds.add(id as ActionNodeId);
      const ch = childrenByParent.get(id);
      if (!ch) continue;
      for (const child of ch) stack.push(child);
    }
    return actionIds;
  };

  for (const containerId of collapsedContainerIds) {
    const targets = new Set<SceneNodeId>();
    for (const actionId of collectDescendantActionIds(containerId)) {
      const action = state.actions[actionId];
      if (!action || action.actionType !== "goto") continue;
      const ext = String((action.payload as { target?: string }).target ?? "").trim();
      if (!ext) continue;
      const sceneNodeId = externalSceneIdToNodeId.get(ext);
      if (sceneNodeId) targets.add(sceneNodeId);
    }
    if (targets.size === 0) continue;
    const synthSourceId =
      containerId in state.sceneBoxes
        ? state.sceneBoxes[containerId as SceneBoxNodeId].sceneId
        : containerId;
    out.set(synthSourceId, targets);
  }
  return out;
}

function countActionsUnderSBox(
  state: NodalProject,
  bid: SceneBoxNodeId,
  childrenByParent: Map<AnyNodeId, AnyNodeId[]>
): number {
  let n = 0;
  const stack = [...(childrenByParent.get(bid) ?? [])];
  const seen = new Set<string>();
  while (stack.length > 0) {
    const id = stack.pop()!;
    if (seen.has(id)) continue;
    seen.add(id);
    if (id in state.actions) n += 1;
    const ch = childrenByParent.get(id);
    if (!ch) continue;
    for (const c of ch) stack.push(c);
  }
  return n;
}

function computeSelectorFoldProjection(state: NodalProject, childrenByParent: Map<AnyNodeId, AnyNodeId[]>) {
  const collapsedSelectorIds = getCollapsedSelectorIds(state);
  const collapsedSBoxIds = getCollapsedSceneBoxIds(state);
  const collapsedContainerIds = new Set<AnyNodeId>([...collapsedSelectorIds, ...collapsedSBoxIds]);
  const hiddenIds = collectHiddenIdsFromCollapsedContainers(state, childrenByParent);
  const synthGotoTargets = collectSynthGotoTargets(state, collapsedContainerIds, childrenByParent);
  return { childrenByParent, collapsedSelectorIds, hiddenIds, synthGotoTargets };
}

function countSelectorChoices(state: NodalProject, selectorId: AnyNodeId): number {
  let count = 0;
  for (const layout of Object.values(state.layout)) {
    if (layout.parentId === selectorId) count += 1;
  }
  return count;
}

function sortNodesParentFirst(nodes: RFNode<NodalRFData>[]): RFNode<NodalRFData>[] {
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const visited = new Set<string>();
  const inStack = new Set<string>();
  const result: RFNode<NodalRFData>[] = [];

  const visit = (node: RFNode<NodalRFData>) => {
    if (visited.has(node.id)) return;
    if (inStack.has(node.id)) {
      console.warn(`[sortNodesParentFirst] cycle résiduel sur ${node.id}, ignoré`);
      visited.add(node.id);
      return;
    }
    inStack.add(node.id);
    if (node.parentId) {
      const parent = byId.get(node.parentId);
      if (parent) {
        visit(parent);
      } else {
        console.warn(
          `[sortNodesParentFirst] parentId ${node.parentId} introuvable pour ${node.id} — désync store/RF`
        );
      }
    }
    inStack.delete(node.id);
    visited.add(node.id);
    result.push(node);
  };

  for (const node of nodes) visit(node);
  return result;
}

export function toReactFlowNodes(state: NodalProject): RFNode<NodalRFData>[] {
  const nodes: RFNode<NodalRFData>[] = [];
  const childrenByParent = buildChildrenByParent(state);
  const { hiddenIds, synthGotoTargets } = computeSelectorFoldProjection(state, childrenByParent);

  for (const box of Object.values(state.sceneBoxes)) {
    const bl = state.layout[box.id];
    if (!bl) continue;
    const scene = state.scenes[box.sceneId];
    const bounds = computeContainerBounds(state, box.id, { excludeIds: hiddenIds });
    nodes.push({
      id: box.id,
      type: "sceneBoxNode",
      position: { x: bl.x, y: bl.y },
      data: {
        nodeType: "sceneBox",
        node: box,
        label: scene?.label,
        collapsed: !!bl.collapsed,
      },
      style: { width: bounds.width, height: bounds.height },
    });
  }
  for (const scene of Object.values(state.scenes)) {
    const layout = state.layout[scene.id];
    if (!layout) continue;
    const bid = sboxIdFromScene(scene.id);
    const sboxLayout = state.layout[bid];
    const containerCollapsed = !!sboxLayout?.collapsed;
    const actionUnderSbox = countActionsUnderSBox(state, bid, childrenByParent);
    const sceneSynthCount = containerCollapsed ? (synthGotoTargets.get(scene.id)?.size ?? 0) : 0;
    nodes.push({
      id: scene.id,
      type: "sceneNode",
      parentId: bid,
      position: { x: layout.x, y: layout.y },
      extent: "parent",
      data: {
        nodeType: "scene",
        node: scene,
        containerCollapsed,
        sceneBoxActionCount: actionUnderSbox,
        sceneBoxSynthGotoTargetCount: sceneSynthCount,
      },
    });
  }
  for (const action of Object.values(state.actions)) {
    const layout = state.layout[action.id];
    if (!layout) continue;
    const parentAction = layout.parentId ? state.actions[layout.parentId as keyof typeof state.actions] : undefined;
    const synthCount =
      action.actionType === "selector" && layout.collapsed
        ? (synthGotoTargets.get(action.id)?.size ?? 0)
        : undefined;
    const actionNode: RFNode<NodalRFData> = {
      id: action.id,
      type: "actionNode",
      position: { x: layout.x, y: layout.y },
      data: {
        nodeType: "action",
        node: action,
        isRewardChild: parentAction?.actionType === "req" || parentAction?.actionType === "pwd",
        rewardParentType:
          parentAction?.actionType === "req" || parentAction?.actionType === "pwd"
            ? (parentAction.actionType as "req" | "pwd")
            : null,
        contextualState: getActionContextualState(state, action.id as ActionNodeId),
        collapsed: !!layout.collapsed,
        ...(action.actionType === "selector"
          ? {
              selectorChildCount: countSelectorChoices(state, action.id),
              ...(synthCount !== undefined && synthCount > 0 ? { synthGotoTargetCount: synthCount } : {}),
            }
          : {}),
      },
    };
    if (action.actionType === "selector" && layout.width && layout.height && !layout.collapsed) {
      actionNode.style = { width: layout.width, height: layout.height };
    }
    if (layout.parentId) {
      actionNode.parentId = layout.parentId;
    }
    if (hiddenIds.has(action.id)) {
      actionNode.hidden = true;
    }
    nodes.push(actionNode);
  }
  for (const satellite of Object.values(state.satellites)) {
    const layout = state.layout[satellite.id];
    if (!layout) continue;
    const satelliteNode: RFNode<NodalRFData> = {
      id: satellite.id,
      type: "satelliteNode",
      position: { x: layout.x, y: layout.y },
      data: { nodeType: "satellite", node: satellite },
    };
    if (layout.parentId) {
      satelliteNode.parentId = layout.parentId;
    }
    if (hiddenIds.has(satellite.id)) {
      satelliteNode.hidden = true;
    }
    nodes.push(satelliteNode);
  }
  for (const media of Object.values(state.media)) {
    const layout = state.layout[media.id];
    if (!layout) continue;
    const mediaNode: RFNode<NodalRFData> = {
      id: media.id,
      type: "mediaNode",
      position: { x: layout.x, y: layout.y },
      data: { nodeType: "media", node: media },
    };
    if (layout.parentId) {
      mediaNode.parentId = layout.parentId;
    }
    if (hiddenIds.has(media.id)) {
      mediaNode.hidden = true;
    }
    nodes.push(mediaNode);
  }

  return sortNodesParentFirst(nodes);
}

export function toReactFlowEdges(state: NodalProject): RFEdge[] {
  const childrenByParent = buildChildrenByParent(state);
  const { hiddenIds, synthGotoTargets } = computeSelectorFoldProjection(state, childrenByParent);
  const base: RFEdge[] = state.edges.map((edge) => {
    const hidden = hiddenIds.has(edge.sourceId) || hiddenIds.has(edge.targetId);
    if (edge.family === "transition") {
      return {
        id: edge.id,
        source: edge.sourceId,
        target: edge.targetId,
        sourceHandle: HANDLE_GOTO_OUT,
        targetHandle: HANDLE_GOTO_IN,
        animated: true,
        className: "nodal-edge nodal-edge--transition",
        ...(hidden ? { hidden: true } : {}),
      };
    }
    if (edge.family === "meta") {
      return {
        id: edge.id,
        source: edge.sourceId,
        target: edge.targetId,
        sourceHandle: HANDLE_META_OUT,
        targetHandle: HANDLE_META_IN,
        className: "nodal-edge nodal-edge--meta",
        ...(hidden ? { hidden: true } : {}),
      };
    }
    return {
      id: edge.id,
      source: edge.sourceId,
      target: edge.targetId,
      sourceHandle: HANDLE_FLOW_OUT,
      targetHandle: HANDLE_FLOW_IN,
      className: "nodal-edge nodal-edge--flow",
      ...(hidden ? { hidden: true } : {}),
    };
  });

  const synthEdges: RFEdge[] = [];
  for (const [synthSourceId, sceneIds] of synthGotoTargets) {
    for (const targetSceneId of sceneIds) {
      synthEdges.push({
        id: `synth-trans-${synthSourceId}-${targetSceneId}`,
        source: synthSourceId,
        target: targetSceneId,
        sourceHandle: HANDLE_SYNTH_GOTO_OUT,
        targetHandle: HANDLE_GOTO_IN,
        animated: true,
        className: "nodal-edge nodal-edge--transition",
      });
    }
  }

  return [...base, ...synthEdges];
}
