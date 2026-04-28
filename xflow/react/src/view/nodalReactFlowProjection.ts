/**
 * Projection store nodal → nœuds / edges React Flow (sans UI popup ni Quill),
 * pour tests et pour `NodalCanvas.tsx`.
 */
import type { Edge as RFEdge, Node as RFNode } from "@xyflow/react";

import type { ActionNodeId } from "../model/ids";
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
};

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
      },
    };
    if (action.actionType === "selector" && layout.width && layout.height) {
      actionNode.style = { width: layout.width, height: layout.height };
    }
    if (layout.parentId) {
      actionNode.parentId = layout.parentId;
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
    nodes.push(satelliteNode);
  }
  for (const media of Object.values(state.media)) {
    const layout = state.layout[media.id];
    if (!layout) continue;
    nodes.push({
      id: media.id,
      type: "mediaNode",
      position: { x: layout.x, y: layout.y },
      data: { nodeType: "media", node: media },
    });
  }

  return sortNodesParentFirst(nodes);
}

export function toReactFlowEdges(state: NodalProject): RFEdge[] {
  return state.edges.map((edge) => {
    if (edge.family === "transition") {
      return {
        id: edge.id,
        source: edge.sourceId,
        target: edge.targetId,
        sourceHandle: HANDLE_GOTO_OUT,
        targetHandle: HANDLE_GOTO_IN,
        animated: true,
        className: "nodal-edge nodal-edge--transition",
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
      };
    }
    return {
      id: edge.id,
      source: edge.sourceId,
      target: edge.targetId,
      sourceHandle: HANDLE_FLOW_OUT,
      targetHandle: HANDLE_FLOW_IN,
      className: "nodal-edge nodal-edge--flow",
    };
  });
}
