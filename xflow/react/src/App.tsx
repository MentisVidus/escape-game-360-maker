import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Background,
  Controls,
  MiniMap,
  ReactFlow,
  useEdgesState,
  useNodesState,
} from "@xyflow/react";
import type { Edge, Node } from "@xyflow/react";
import "@xyflow/react/dist/style.css";

import {
  type EditorProject,
  projectToFlowElements,
} from "./projectToFlow";

declare global {
  interface Window {
    getCurrentProjectData?: () => EditorProject;
  }
}

const MOCK: { nodes: Node[]; edges: Edge[] } = {
  nodes: [
    {
      id: "intro",
      position: { x: 0, y: 40 },
      data: { label: "Scène intro (mock)" },
    },
    {
      id: "salle",
      position: { x: 260, y: 40 },
      data: { label: "Salle suivante (mock)" },
    },
  ],
  edges: [{ id: "e-mock", source: "intro", target: "salle" }],
};

function readProjectFromHost(): EditorProject | null {
  try {
    const fn = window.getCurrentProjectData;
    if (typeof fn !== "function") return null;
    const p = fn();
    return p && typeof p === "object" ? p : null;
  } catch {
    return null;
  }
}

export default function App() {
  const [mapTick, setMapTick] = useState(0);
  const bump = useCallback(() => setMapTick((t) => t + 1), []);

  useEffect(() => {
    const modal = document.getElementById("project-map-modal");
    if (!modal) return;
    const obs = new MutationObserver(() => bump());
    obs.observe(modal, { attributes: true, attributeFilter: ["style", "class"] });
    return () => obs.disconnect();
  }, [bump]);

  const pack = useMemo(() => {
    const project = readProjectFromHost();
    const { nodes, edges } = projectToFlowElements(project);
    if (nodes.length === 0) return MOCK;
    return { nodes, edges };
  }, [mapTick]);

  const [nodes, setNodes, onNodesChange] = useNodesState(pack.nodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(pack.edges);

  useEffect(() => {
    setNodes(pack.nodes);
    setEdges(pack.edges);
  }, [pack, setNodes, setEdges]);

  return (
    <div style={{ width: "100%", height: "100%", minHeight: 200 }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        nodesDraggable={false}
        nodesConnectable={false}
        elementsSelectable={false}
        panOnDrag
        zoomOnScroll
        fitView
        proOptions={{ hideAttribution: true }}
      >
        <Background />
        <Controls showInteractive={false} />
        <MiniMap pannable zoomable />
      </ReactFlow>
    </div>
  );
}
