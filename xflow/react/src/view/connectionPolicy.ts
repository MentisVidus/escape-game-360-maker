import type { Connection } from "@xyflow/react";

import type { ActionNodeId } from "../model/ids";
import type { ActionNode, MediaNode, SatelliteNode, SceneNode } from "../model/nodes";
import type { NodalProject } from "../model/project";
import {
  HANDLE_FLOW_IN,
  HANDLE_FLOW_OUT,
  HANDLE_GOTO_IN,
  HANDLE_GOTO_OUT,
  HANDLE_META_IN,
  HANDLE_META_OUT,
} from "./handles/handleIds";

type NodeKind = "scene" | "action" | "satellite" | "media" | "unknown";

function getNodeById(
  state: NodalProject,
  nodeId: string | null | undefined
): SceneNode | ActionNode | SatelliteNode | MediaNode | null {
  if (!nodeId) return null;
  return (
    state.scenes[nodeId as keyof typeof state.scenes] ??
    state.actions[nodeId as keyof typeof state.actions] ??
    state.satellites[nodeId as keyof typeof state.satellites] ??
    state.media[nodeId as keyof typeof state.media] ??
    null
  );
}

function getNodeKind(node: ReturnType<typeof getNodeById>): NodeKind {
  if (!node) return "unknown";
  return node.nodeType;
}

export function isValidConnection(connection: Connection, state: NodalProject): boolean {
  const source = getNodeById(state, connection.source);
  const target = getNodeById(state, connection.target);
  const sourceKind = getNodeKind(source);
  const targetKind = getNodeKind(target);
  if (!source || !target) return false;

  if (connection.sourceHandle === HANDLE_FLOW_OUT && connection.targetHandle === HANDLE_FLOW_IN) {
    if (targetKind !== "action") return false;
    const targetAction = target as ActionNode;
    // C3b: une récompense req/pwd ne doit pas recevoir un flux « hotspot » depuis une scène.
    const tgtParent = state.layout[targetAction.id]?.parentId ?? null;
    if (tgtParent && tgtParent in state.actions) {
      const p = state.actions[tgtParent as ActionNodeId]!;
      if (p.actionType === "req" || p.actionType === "pwd") return false;
      // Choix / sous-graphe du selector : pas d’entrée « hotspot » depuis une scène.
      if (p.actionType === "selector") return false;
    }
    const hasFlowIn = state.edges.some((edge) => edge.family === "flow" && edge.targetId === targetAction.id);
    if (hasFlowIn) return false;

    if (sourceKind === "scene") return true;

    if (sourceKind === "action" && targetKind === "action") {
      const sa = source as ActionNode;
      const ta = target as ActionNode;
      // Récompense req/pwd : flux vers l’action enfant.
      if (state.layout[ta.id]?.parentId === sa.id) return true;
      // Enfants du même selector (pick→goto, etc.).
      const pSrc = state.layout[sa.id]?.parentId ?? null;
      const pTgt = state.layout[ta.id]?.parentId ?? null;
      if (pSrc && pSrc === pTgt && pSrc in state.actions) {
        const parent = state.actions[pSrc as ActionNodeId]!;
        if (parent.actionType === "selector") return true;
      }
    }

    return false;
  }

  if (connection.sourceHandle === HANDLE_GOTO_OUT && connection.targetHandle === HANDLE_GOTO_IN) {
    if (sourceKind !== "action" || targetKind !== "scene") return false;
    const sourceAction = source as ActionNode;
    if (sourceAction.actionType !== "goto") return false;
    const hasTransition = state.edges.some((edge) => edge.family === "transition" && edge.sourceId === sourceAction.id);
    return !hasTransition;
  }

  if (connection.sourceHandle === HANDLE_META_OUT && connection.targetHandle === HANDLE_META_IN) {
    if (sourceKind !== "scene" && sourceKind !== "action") return false;
    /* C3a : les satellites sont exclusivement auto-réconciliés ; seuls les médias restent connectables à la main. */
    return targetKind === "media";
  }

  return false;
}

