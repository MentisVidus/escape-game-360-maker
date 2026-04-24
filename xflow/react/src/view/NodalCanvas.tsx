import {
  Background,
  Controls,
  MiniMap,
  ReactFlow,
  ReactFlowProvider,
  useNodesState,
  useEdgesState,
  type Connection,
  type Edge as RFEdge,
  type EdgeChange,
  type Node as RFNode,
  type NodeChange,
  type NodeTypes,
  type OnConnect,
  type OnMove,
} from "@xyflow/react";
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import type { StoreApi } from "zustand/vanilla";

import { asEdgeId, type AnyNodeId, type EdgeId, type SatelliteNodeId } from "../model/ids";
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
import { NodalUiContext } from "./nodalUiContext";
import { NodePalette } from "./palette/NodePalette";
import { ObjectEditorPopup } from "./popups/ObjectEditorPopup";
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
    setRfNodes((current) => {
      // Préserve le state interne (position pendant drag, mesures, sélection)
      // pour les nœuds qui existent déjà des deux côtés
      const currentById = new Map(current.map((n) => [n.id, n]));
      return nextNodes.map((n) => {
        const existing = currentById.get(n.id);
        if (!existing) return n;
        const merged: RFNode<NodalRFData> = {
          ...n,
          position: existing.position,
        };
        if (existing.selected !== undefined) merged.selected = existing.selected;
        if (existing.measured !== undefined) merged.measured = existing.measured;
        return merged;
      });
    });
  }, [state.scenes, state.actions, state.satellites, state.media, state.layout, setRfNodes]);

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

  const layoutClassName =
    mapColorMode === "dark" ? "nodal-canvas-layout dark-mode" : "nodal-canvas-layout";

  return (
    <NodalUiContext.Provider
      value={{ store, objectEditorSatelliteId, setObjectEditorSatelliteId }}
    >
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
          fitView
        >
          <Background />
          <MiniMap />
          <Controls />
        </ReactFlow>
        <ObjectEditorPopup
          store={store}
          satelliteId={objectEditorSatelliteId}
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

