import { useCallback, useEffect, useMemo, useState, type MouseEvent } from "react";
import {
  Background,
  Controls,
  MiniMap,
  ReactFlow,
  ReactFlowProvider,
  useEdgesState,
  useNodesState,
  type Edge,
  type Node,
  type NodeTypes,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

import {
  type EditorLang,
  type EditorProject,
  buildProjectMapGraph,
} from "./mapGraphBuild";
import { MapHotspotNode, MapRedirectNode, MapSceneNode } from "./mapNodes";

declare global {
  interface Window {
    getCurrentProjectData?: () => EditorProject;
    _projectMapViewMode?: string;
    _projectMapActiveSceneKey?: string | null;
    _projectMapReactBridge?: {
      mountFromNodeData: (d: Record<string, unknown> | null | undefined) => void;
      clearSelectionAndRefresh: () => void;
      setToolbar: (mode: string) => void;
    };
  }
}

const nodeTypes: NodeTypes = {
  mapScene: MapSceneNode,
  mapHotspot: MapHotspotNode,
  mapRedirect: MapRedirectNode,
};

function hostLang(): EditorLang {
  return document.documentElement.lang.toLowerCase().startsWith("en") ? "en" : "fr";
}

function readNarrationOnly(): boolean {
  const el = document.getElementById("project-map-narration-only");
  return el instanceof HTMLInputElement && el.checked;
}

function readProject(): EditorProject | null {
  try {
    const fn = window.getCurrentProjectData;
    if (typeof fn !== "function") return null;
    const p = fn();
    return p && typeof p === "object" ? p : null;
  } catch {
    return null;
  }
}

function InnerMap() {
  const [graphRev, setGraphRev] = useState(0);
  const bump = useCallback(() => setGraphRev((n) => n + 1), []);

  useEffect(() => {
    const onBus = (ev: Event) => {
      const ce = ev as CustomEvent<{ type?: string }>;
      if (ce.detail?.type) bump();
    };
    document.addEventListener("react-project-map", onBus);
    return () => document.removeEventListener("react-project-map", onBus);
  }, [bump]);

  useEffect(() => {
    const modal = document.getElementById("project-map-modal");
    if (modal && modal.style.display === "flex") bump();
  }, [bump]);

  const pack = useMemo(() => {
    const project = readProject();
    const viewMode = (window._projectMapViewMode || "focus") as "focus" | "full" | "tree";
    const activeSceneKey = window._projectMapActiveSceneKey ?? null;
    const { nodes, edges, activeSceneKey: nextActive } = buildProjectMapGraph(project, {
      viewMode,
      activeSceneKey,
      narrationOnly: readNarrationOnly(),
      lang: hostLang(),
    });
    if (viewMode === "focus" && nextActive) {
      window._projectMapActiveSceneKey = nextActive;
    }
    return { nodes, edges };
  }, [graphRev]);

  const [nodes, setNodes, onNodesChange] = useNodesState(pack.nodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(pack.edges);

  useEffect(() => {
    setNodes(pack.nodes);
    setEdges(pack.edges);
  }, [pack, setNodes, setEdges]);

  const mode = window._projectMapViewMode || "focus";
  const selectable = mode === "focus" || mode === "tree" || mode === "full";

  const onNodeClick = useCallback(
    (_: MouseEvent, node: Node) => {
      window._projectMapReactBridge?.mountFromNodeData(
        node.data as Record<string, unknown>
      );
    },
    []
  );

  const onPaneClick = useCallback(() => {
    window._projectMapReactBridge?.clearSelectionAndRefresh();
  }, []);

  const onNodeDoubleClick = useCallback((evt: MouseEvent, node: Node) => {
    evt.stopPropagation();
    if (node.type !== "mapScene") return;
    const d = node.data as {
      chrome?: string;
      sceneKey?: string;
    };
    if (d.chrome !== "collapsed" || !d.sceneKey) return;
    window._projectMapActiveSceneKey = d.sceneKey;
    window._projectMapViewMode = "focus";
    window._projectMapReactBridge?.setToolbar("focus");
    document.dispatchEvent(
      new CustomEvent("react-project-map", { detail: { type: "setView", mode: "focus" } })
    );
  }, []);

  return (
    <div style={{ width: "100%", height: "100%", minHeight: 200 }}>
      <ReactFlow
        key={String(graphRev)}
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={onNodeClick}
        onNodeDoubleClick={onNodeDoubleClick}
        onPaneClick={onPaneClick}
        nodesDraggable={false}
        nodesConnectable={false}
        elementsSelectable={selectable}
        panOnDrag
        zoomOnScroll
        zoomOnDoubleClick={false}
        fitView
        defaultEdgeOptions={{
          type: "smoothstep",
          style: { stroke: "#9eb0c8", strokeWidth: 2 },
        }}
        onInit={({ fitView }) => fitView({ padding: 0.15 })}
        proOptions={{ hideAttribution: true }}
      >
        <Background />
        <Controls showInteractive={false} />
        <MiniMap pannable zoomable />
      </ReactFlow>
    </div>
  );
}

export default function App() {
  return (
    <ReactFlowProvider>
      <InnerMap />
    </ReactFlowProvider>
  );
}
