import {
  Background,
  Controls,
  MiniMap,
  ReactFlow,
  ReactFlowProvider,
  useReactFlow,
  useNodesState,
  useEdgesState,
  useUpdateNodeInternals,
  type Connection,
  type Edge as RFEdge,
  type EdgeChange,
  type OnNodeDrag,
  type Node as RFNode,
  type NodeChange,
  type NodeTypes,
  type OnConnect,
  type OnMove,
} from "@xyflow/react";
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import type { StoreApi } from "zustand/vanilla";

import { asEdgeId, type ActionNodeId, type AnyNodeId, type EdgeId, type SatelliteNodeId } from "../model/ids";
import type { ObjectSatelliteNode } from "../model/nodes";
import type { ObjectEntry } from "../model/objects";
import type { NodalProject } from "../model/project";
import type { NodalProjectStore } from "../store/nodalProjectStore";
import { getActionContextualState } from "../store/reconcileAutoSatellites";
import { isValidConnection } from "./connectionPolicy";
import {
  HANDLE_FLOW_IN,
  HANDLE_FLOW_OUT,
  HANDLE_GOTO_IN,
  HANDLE_GOTO_OUT,
  HANDLE_META_IN,
  HANDLE_META_OUT,
} from "./handles/handleIds";
import { ActionNodeView } from "./nodes/ActionNodeView";
import { MediaNodeView } from "./nodes/MediaNodeView";
import { SatelliteNodeView } from "./nodes/SatelliteNodeView";
import { SceneNodeView } from "./nodes/SceneNodeView";
import { NodalUiContext } from "./nodalUiContext";
import { ATTACH_OVERLAP_THRESHOLD, DETACH_OVERLAP_THRESHOLD, REWARD_CHILD_GAP_X } from "./nesting/constants";
import { overlapRatioByChild, toAbsoluteRect, type NestedNodeLike } from "./nesting/geometry";
import { NodePalette } from "./palette/NodePalette";
import { ObjectEditorPopup } from "./popups/ObjectEditorPopup";
import { WarningsPanel } from "./warnings/WarningsPanel";
import "./NodalCanvas.css";

type NodalRFData = {
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

const nodeTypes: NodeTypes = {
  sceneNode: SceneNodeView,
  actionNode: ActionNodeView,
  satelliteNode: SatelliteNodeView,
  mediaNode: MediaNodeView,
};

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
      // C3b: pas d'extent sur récompense pour éviter le clamp RF
      // (parent non redimensionné + slot visuel hors bbox parent).
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

function detectFamily(connection: Connection): "flow" | "transition" | "meta" | null {
  if (connection.sourceHandle === HANDLE_FLOW_OUT && connection.targetHandle === HANDLE_FLOW_IN) return "flow";
  if (connection.sourceHandle === HANDLE_GOTO_OUT && connection.targetHandle === HANDLE_GOTO_IN) return "transition";
  if (connection.sourceHandle === HANDLE_META_OUT && connection.targetHandle === HANDLE_META_IN) return "meta";
  return null;
}

function NodalCanvasInner({ store }: { store: StoreApi<NodalProjectStore> }) {
  const reactFlow = useReactFlow<RFNode<NodalRFData>, RFEdge>();
  const updateNodeInternals = useUpdateNodeInternals();
  const [mapColorMode, setMapColorMode] = useState<"light" | "dark">("light");
  const [objectEditorSatelliteId, setObjectEditorSatelliteId] = useState<SatelliteNodeId | null>(null);
  const state = useSyncExternalStore(
    store.subscribe,
    store.getState,
    store.getState
  );
  const canvasRef = useRef<HTMLDivElement>(null);

  // State React Flow pour nodes et edges (permet à RF de gérer drag, sélection, mesures)
  const [rfNodes, setRfNodes, onNodesChangeRF] = useNodesState<RFNode<NodalRFData>>([]);
  const [rfEdges, setRfEdges, onEdgesChangeRF] = useEdgesState<RFEdge>([]);

  // Synchronise le state Zustand → React Flow quand le store change
  // (ajout/suppression de nœuds, edges — pas les changements de position
  // qui passent par le drag de RF)
  useEffect(() => {
    const nextNodes = toReactFlowNodes(state);
    const knownIds = new Set(nextNodes.map((n) => n.id));

    setRfNodes((current) => {
      // Préserve le state interne (position pendant drag, mesures, sélection)
      // pour les nœuds qui existent déjà des deux côtés
      const currentById = new Map(current.map((n) => [n.id, n]));
      const nodesToUpdate: string[] = [];

      const result = nextNodes.map((n) => {
        const existing = currentById.get(n.id);
        if (!existing) {
          if (n.parentId && !knownIds.has(n.parentId)) {
            console.warn(
              `[useEffect sync] strip parentId fantôme ${n.parentId} sur ${n.id} (nouveau nœud)`
            );
            const stripped: RFNode<NodalRFData> = { ...n };
            delete stripped.parentId;
            nodesToUpdate.push(stripped.id);
            return stripped;
          }
          nodesToUpdate.push(n.id);
          if (n.parentId) nodesToUpdate.push(n.parentId);
          return n;
        }
        const parentChanged = (existing.parentId ?? null) !== (n.parentId ?? null);
        const merged: RFNode<NodalRFData> = {
          ...n,
          // Toujours appliquer la position du store (source de vérité).
          // Sinon, lors d'un hydrate/import sur des ids déjà présents,
          // RF conserve des positions obsolètes et la reconstruction diverge.
          position: n.position,
        };
        if (merged.parentId && !knownIds.has(merged.parentId)) {
          console.warn(`[useEffect sync] strip parentId fantôme ${merged.parentId} sur ${merged.id}`);
          delete merged.parentId;
        }
        if (parentChanged) {
          nodesToUpdate.push(merged.id);
          if (merged.parentId) nodesToUpdate.push(merged.parentId);
          const prevParent = existing.parentId;
          if (prevParent) nodesToUpdate.push(prevParent);
        }
        if (existing.selected !== undefined) merged.selected = existing.selected;
        if (existing.measured !== undefined) merged.measured = existing.measured;
        return merged;
      });

      for (const n of result) {
        if (!currentById.has(n.id)) {
          nodesToUpdate.push(n.id);
          if (n.parentId) nodesToUpdate.push(n.parentId);
        }
      }

      if (nodesToUpdate.length > 0) {
        const unique = [...new Set(nodesToUpdate)];
        setTimeout(() => updateNodeInternals(unique), 0);
      }
      return result;
    });
  }, [
    state.scenes,
    state.actions,
    state.satellites,
    state.media,
    state.layout,
    setRfNodes,
    updateNodeInternals,
  ]);

  useEffect(() => {
    setRfEdges(toReactFlowEdges(state));
  }, [state.edges, setRfEdges]);

  // Wrap onNodesChange pour persister les positions finales vers Zustand
  const onNodesChange = useCallback(
    (changes: NodeChange<RFNode<NodalRFData>>[]) => {
      onNodesChangeRF(changes);
      for (const change of changes) {
        if (change.type === "position" && change.position && !change.dragging) {
          state.updateNodeLayout(change.id as AnyNodeId, {
            x: change.position.x,
            y: change.position.y,
          });
        }
      }
    },
    [onNodesChangeRF, state]
  );

  // Wrap onEdgesChange pour passer à React Flow
  const onEdgesChange = useCallback(
    (changes: EdgeChange[]) => {
      onEdgesChangeRF(changes);
    },
    [onEdgesChangeRF]
  );

  const onConnect: OnConnect = useCallback(
    (connection) => {
      if (!isValidConnection(connection, state)) return;
      const family = detectFamily(connection);
      if (!family || !connection.source || !connection.target) return;
      state.connect({
        id: asEdgeId(`edge-${family}-${connection.source}-${connection.target}-${Date.now()}`),
        family,
        sourceId: connection.source as AnyNodeId,
        targetId: connection.target as AnyNodeId,
      });
    },
    [state]
  );

  const onMoveEnd: OnMove = useCallback(
    (_event, viewport) => {
      state.setViewport(viewport);
    },
    [state]
  );

  const onNodeDragStop: OnNodeDrag<RFNode<NodalRFData>> = useCallback(
    (_event, draggedNode) => {
      const allNodes = reactFlow.getNodes();
      const latestDragged = allNodes.find((n) => n.id === draggedNode.id) ?? draggedNode;
      const draggedAction = state.actions[draggedNode.id as keyof typeof state.actions];
      if (!draggedAction) return;
      const nodesById = new Map(allNodes.map((n) => [n.id, n as unknown as NestedNodeLike]));
      const childRect = toAbsoluteRect(latestDragged as unknown as NestedNodeLike, nodesById);
      const draggedLayout = state.layout[draggedNode.id as AnyNodeId];
      if (!draggedLayout) return;

      if (draggedLayout.parentId && draggedLayout.parentId in state.actions) {
        const parentNode = nodesById.get(draggedLayout.parentId);
        if (!parentNode) return;
        const parentRect = toAbsoluteRect(parentNode, nodesById);
        const overlap = overlapRatioByChild(childRect, parentRect);
        if (overlap < DETACH_OVERLAP_THRESHOLD) {
          state.detachChild(draggedNode.id as AnyNodeId, { x: childRect.x, y: childRect.y });
        }
        return;
      }

      const hasFlowInFromScene = state.edges.some(
        (edge) => edge.family === "flow" && edge.targetId === draggedNode.id && edge.sourceId in state.scenes
      );
      if (hasFlowInFromScene) return;

      // Chaîne parentId lue sur le store à jour (getState) : plusieurs onNodeDragStop
      // peuvent s'enchaîner avant re-render React ; state.layout du closure serait obsolète.
      const getAncestors = (nodeId: string): Set<string> => {
        const ancestors = new Set<string>();
        let current: string | null | undefined = store.getState().layout[nodeId as AnyNodeId]?.parentId as
          | string
          | null
          | undefined;
        while (current) {
          if (ancestors.has(current)) break;
          ancestors.add(current);
          current = store.getState().layout[current as AnyNodeId]?.parentId as string | null | undefined;
        }
        return ancestors;
      };

      let bestRewardParentId: AnyNodeId | null = null;
      let bestRewardOverlap = 0;
      let bestChoiceParentId: AnyNodeId | null = null;
      let bestChoiceOverlap = 0;

      for (const candidate of allNodes) {
        if (candidate.id === draggedNode.id) continue;
        const candidateAction = state.actions[candidate.id as keyof typeof state.actions];
        if (!candidateAction) continue;
        const parentRect = toAbsoluteRect(candidate as unknown as NestedNodeLike, nodesById);
        const overlap = overlapRatioByChild(childRect, parentRect);

        if (candidateAction.actionType === "req" || candidateAction.actionType === "pwd") {
          if (overlap > bestRewardOverlap) {
            bestRewardOverlap = overlap;
            bestRewardParentId = candidate.id as AnyNodeId;
          }
        } else if (candidateAction.actionType === "selector") {
          const candidateAncestors = getAncestors(candidate.id);
          const draggedAncestors = getAncestors(draggedNode.id);
          if (candidateAncestors.has(draggedNode.id)) continue;
          if (draggedAncestors.has(candidate.id)) continue;
          if (overlap > bestChoiceOverlap) {
            bestChoiceOverlap = overlap;
            bestChoiceParentId = candidate.id as AnyNodeId;
          }
        }
      }

      const useRewardParent =
        bestRewardParentId !== null && bestRewardOverlap >= ATTACH_OVERLAP_THRESHOLD;
      const useChoiceParent =
        !useRewardParent &&
        bestChoiceParentId !== null &&
        bestChoiceOverlap >= ATTACH_OVERLAP_THRESHOLD;

      if (!useRewardParent && !useChoiceParent) return;

      const bestParentId = useRewardParent ? bestRewardParentId! : bestChoiceParentId!;
      state.attachChild(bestParentId, draggedNode.id as AnyNodeId);

      if (useRewardParent) {
        const parentNode = nodesById.get(bestParentId);
        if (!parentNode) return;
        const parentSize = parentNode.measured?.width ?? parentNode.width ?? 180;
        state.updateNodeLayout(draggedNode.id as AnyNodeId, {
          parentId: bestParentId,
          x: parentSize + REWARD_CHILD_GAP_X,
          y: 0,
        });
      } else {
        const parentNode = nodesById.get(bestParentId);
        if (!parentNode) return;
        const parentAbsRect = toAbsoluteRect(parentNode, nodesById);
        state.updateNodeLayout(draggedNode.id as AnyNodeId, {
          parentId: bestParentId,
          x: childRect.x - parentAbsRect.x,
          y: childRect.y - parentAbsRect.y,
        });
      }
    },
    [reactFlow, state, store]
  );

  const layoutClassName =
    mapColorMode === "dark" ? "nodal-canvas-layout dark-mode" : "nodal-canvas-layout";
  const objectSatellite =
    objectEditorSatelliteId && state.satellites[objectEditorSatelliteId]?.satelliteType === "object"
      ? (state.satellites[objectEditorSatelliteId] as ObjectSatelliteNode)
      : null;
  const objectEntry: ObjectEntry | null = objectSatellite?.data.objectId
    ? state.meta.objects[objectSatellite.data.objectId] ?? null
    : null;

  return (
    <NodalUiContext.Provider value={{ store, objectEditorSatelliteId, setObjectEditorSatelliteId }}>
      <div className={layoutClassName} ref={canvasRef}>
        <NodePalette store={store} canvasRef={canvasRef} />
        <div className="nodal-canvas-pane">
        <button
          type="button"
          className="nodal-canvas-theme-toggle"
          aria-label={mapColorMode === "dark" ? "Passer en mode clair" : "Passer en mode sombre"}
          title={mapColorMode === "dark" ? "Mode clair" : "Mode sombre"}
          onClick={() => setMapColorMode((m) => (m === "dark" ? "light" : "dark"))}
        >
          {mapColorMode === "dark" ? "☀" : "☾"}
        </button>
        <ReactFlow
          colorMode={mapColorMode}
          nodes={rfNodes}
          edges={rfEdges}
          nodeTypes={nodeTypes}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          deleteKeyCode={["Delete", "Backspace"]}
          onNodesDelete={(deleted) => {
            for (const n of deleted) state.removeNode(n.id as AnyNodeId);
          }}
          onEdgesDelete={(deleted) => {
            for (const e of deleted) state.disconnect(e.id as EdgeId);
          }}
          isValidConnection={(connectionLike) =>
            isValidConnection(
              {
                source: connectionLike.source,
                target: connectionLike.target,
                sourceHandle: connectionLike.sourceHandle ?? null,
                targetHandle: connectionLike.targetHandle ?? null,
              },
              state
            )
          }
          onMoveEnd={onMoveEnd}
          onNodeDragStop={onNodeDragStop}
          fitView
        >
          <Background />
          <MiniMap />
          <Controls />
        </ReactFlow>
        <WarningsPanel warnings={state.warnings} />
        <ObjectEditorPopup
          satellite={objectSatellite}
          objectEntry={objectEntry}
          objectEntries={state.meta.objects}
          objectIds={Object.keys(state.meta.objects)}
          onChangeObjectId={(objectId) => {
            if (!objectEditorSatelliteId) return;
            state.updateNodeData(objectEditorSatelliteId, { data: { objectId } } as never);
          }}
          onUpsertObject={(entry) => state.upsertObject(entry)}
          onClose={() => setObjectEditorSatelliteId(null)}
        />
      </div>
    </div>
    </NodalUiContext.Provider>
  );
}

export function NodalCanvas({ store }: { store: StoreApi<NodalProjectStore> }) {
  return (
    <ReactFlowProvider>
      <NodalCanvasInner store={store} />
    </ReactFlowProvider>
  );
}

