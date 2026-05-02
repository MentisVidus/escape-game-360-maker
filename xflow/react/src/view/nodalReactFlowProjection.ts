/**
 * Projection store nodal → nœuds / edges React Flow (sans UI popup ni Quill),
 * pour tests et pour `NodalCanvas.tsx`.
 */
import type { Edge as RFEdge, Node as RFNode } from "@xyflow/react";

import type { ActionNodeId, AnyNodeId } from "../model/ids";
import type { NodalProject } from "../model/project";
import { getActionContextualState } from "../store/reconcileAutoSatellites";
import {
  HANDLE_FLOW_IN,
  HANDLE_FLOW_OUT,
  HANDLE_GOTO_IN,
  HANDLE_GOTO_OUT,
  HANDLE_META_IN,
  HANDLE_META_OUT,
} from "./handles/handleIds";

export type NodalRFData = {
  nodeType: "scene" | "action" | "satellite" | "media";
  node: unknown;
  isRewardChild?: boolean;
  rewardParentType?: "req" | "pwd" | null;
  contextualState?: 1 | 2 | 3 | 4;
  /** État replié du nœud (C8.1) — actuellement utilisé pour les selectors. */
  collapsed?: boolean;
  /** Nombre de choix imbriqués (selector replié) — pour affichage compteur. */
  selectorChildCount?: number;
};

/**
 * C8.1 — Calcule l'ensemble des nœuds à masquer parce qu'ils sont descendants
 * (transitif) d'un selector replié. Les selectors eux-mêmes restent visibles.
 */
function collectHiddenIdsFromCollapsedSelectors(state: NodalProject): Set<AnyNodeId> {
  const hidden = new Set<AnyNodeId>();
  const collapsedSelectorIds = new Set<AnyNodeId>();

  for (const action of Object.values(state.actions)) {
    const layout = state.layout[action.id];
    if (!layout) continue;
    if (action.actionType === "selector" && layout.collapsed) {
      collapsedSelectorIds.add(action.id);
    }
  }
  if (collapsedSelectorIds.size === 0) return hidden;

  const childrenByParent = new Map<AnyNodeId, AnyNodeId[]>();
  for (const [nodeId, layout] of Object.entries(state.layout) as Array<
    [AnyNodeId, NodalProject["layout"][AnyNodeId]]
  >) {
    if (!layout?.parentId) continue;
    const list = childrenByParent.get(layout.parentId) || [];
    list.push(nodeId);
    childrenByParent.set(layout.parentId, list);
  }

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
  const hiddenIds = collectHiddenIdsFromCollapsedSelectors(state);

  for (const scene of Object.values(state.scenes)) {
    const layout = state.layout[scene.id];
    if (!layout) continue;
    nodes.push({
      id: scene.id,
      type: "sceneNode",
      position: { x: layout.x, y: layout.y },
      data: { nodeType: "scene", node: scene },
    });
  }
  for (const action of Object.values(state.actions)) {
    const layout = state.layout[action.id];
    if (!layout) continue;
    const parentAction = layout.parentId ? state.actions[layout.parentId as keyof typeof state.actions] : undefined;
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
          ? { selectorChildCount: countSelectorChoices(state, action.id) }
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
    if (hiddenIds.has(media.id)) {
      mediaNode.hidden = true;
    }
    nodes.push(mediaNode);
  }

  return sortNodesParentFirst(nodes);
}

export function toReactFlowEdges(state: NodalProject): RFEdge[] {
  const hiddenIds = collectHiddenIdsFromCollapsedSelectors(state);
  return state.edges.map((edge) => {
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
}
