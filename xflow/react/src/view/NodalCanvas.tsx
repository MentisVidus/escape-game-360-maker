import {
  Background,
  Controls,
  MiniMap,
  ReactFlow,
  ReactFlowProvider,
  applyEdgeChanges,
  applyNodeChanges,
  type Connection,
  type Edge as RFEdge,
  type EdgeChange,
  type Node as RFNode,
  type NodeChange,
  type NodeTypes,
  type OnConnect,
  type OnMove,
  type OnSelectionChangeFunc,
} from "@xyflow/react";
import { useCallback, useMemo, useRef, useState } from "react";
import { useStore } from "zustand";
import type { StoreApi } from "zustand/vanilla";

import { asEdgeId, type AnyNodeId, type EdgeId } from "../model/ids";
import type { NodalProject } from "../model/project";
import type { NodalProjectStore } from "../store/nodalProjectStore";
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
import { NodePalette } from "./palette/NodePalette";
import { useKeyboardHandlers } from "./keyboardHandlers";
import "./NodalCanvas.css";

type NodalRFData = { nodeType: "scene" | "action" | "satellite" | "media"; node: unknown };

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
    nodes.push({
      id: action.id,
      type: "actionNode",
      position: { x: layout.x, y: layout.y },
      data: { nodeType: "action", node: action },
    });
  }
  for (const satellite of Object.values(state.satellites)) {
    const layout = state.layout[satellite.id];
    if (!layout) continue;
    nodes.push({
      id: satellite.id,
      type: "satelliteNode",
      position: { x: layout.x, y: layout.y },
      data: { nodeType: "satellite", node: satellite },
    });
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

  return nodes;
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
        style: { stroke: "#00a6ff", strokeWidth: 2, strokeDasharray: "6 4" },
      };
    }
    if (edge.family === "meta") {
      return {
        id: edge.id,
        source: edge.sourceId,
        target: edge.targetId,
        sourceHandle: HANDLE_META_OUT,
        targetHandle: HANDLE_META_IN,
        style: { stroke: "#8f96a3", strokeWidth: 1.5, strokeDasharray: "2 3" },
      };
    }
    return {
      id: edge.id,
      source: edge.sourceId,
      target: edge.targetId,
      sourceHandle: HANDLE_FLOW_OUT,
      targetHandle: HANDLE_FLOW_IN,
      style: { stroke: "#2d7fff", strokeWidth: 2 },
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
  const state = useStore(store, (s) => s);
  const canvasRef = useRef<HTMLDivElement>(null);
  const [selectedNodeIds, setSelectedNodeIds] = useState<string[]>([]);
  const [selectedEdgeIds, setSelectedEdgeIds] = useState<string[]>([]);

  const rfNodes = useMemo(() => toReactFlowNodes(state), [state]);
  const rfEdges = useMemo(() => toReactFlowEdges(state), [state]);

  useKeyboardHandlers({
    selectedNodeIds,
    selectedEdgeIds,
    removeNode: (id) => state.removeNode(id as AnyNodeId),
    disconnect: (id) => state.disconnect(id as EdgeId),
  });

  const onNodesChange = useCallback(
    (changes: NodeChange[]) => {
      const next = applyNodeChanges(changes, rfNodes);
      for (const change of changes) {
        if (change.type === "remove") state.removeNode(change.id as AnyNodeId);
      }
      for (const node of next) {
        state.updateNodeLayout(node.id as AnyNodeId, { x: node.position.x, y: node.position.y });
      }
    },
    [rfNodes, state]
  );

  const onEdgesChange = useCallback(
    (changes: EdgeChange[]) => {
      const next = applyEdgeChanges(changes, rfEdges);
      const nextIds = new Set(next.map((edge) => edge.id));
      for (const edge of rfEdges) {
        if (!nextIds.has(edge.id)) state.disconnect(edge.id as EdgeId);
      }
    },
    [rfEdges, state]
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

  const onSelectionChange: OnSelectionChangeFunc = useCallback((params) => {
    setSelectedNodeIds(params.nodes.map((node) => node.id));
    setSelectedEdgeIds(params.edges.map((edge) => edge.id));
  }, []);

  const onMoveEnd: OnMove = useCallback(
    (_event, viewport) => {
      state.setViewport(viewport);
    },
    [state]
  );

  return (
    <div className="nodal-canvas-layout" ref={canvasRef}>
      <NodePalette store={store} canvasRef={canvasRef} />
      <div className="nodal-canvas-pane">
        <ReactFlow
          nodes={rfNodes}
          edges={rfEdges}
          nodeTypes={nodeTypes}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
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
          onSelectionChange={onSelectionChange}
          onMoveEnd={onMoveEnd}
          fitView
        >
          <Background />
          <MiniMap />
          <Controls />
        </ReactFlow>
      </div>
    </div>
  );
}

export function NodalCanvas({ store }: { store: StoreApi<NodalProjectStore> }) {
  return (
    <ReactFlowProvider>
      <NodalCanvasInner store={store} />
    </ReactFlowProvider>
  );
}

