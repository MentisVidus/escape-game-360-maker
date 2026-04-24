import { Handle, Position, type NodeProps } from "@xyflow/react";

import type { SatelliteNode } from "../../model/nodes";
import { HANDLE_META_IN } from "../handles/handleIds";
import "../handles/handles.css";
import "./nodes.css";

function getSatelliteSubtitle(node: SatelliteNode): string {
  switch (node.satelliteType) {
    case "coords-options":
      return "Coords Options";
    case "choice-options":
      return "Choice Options";
    case "object":
      return "Object";
  }
}

export function SatelliteNodeView({ data }: NodeProps) {
  const node = (data as { node: SatelliteNode }).node;
  return (
    <div className="nodal-node satellite">
      <div className="title">Satellite</div>
      <div className="subtitle">{getSatelliteSubtitle(node)}</div>
      <Handle id={HANDLE_META_IN} type="target" position={Position.Top} className="nodal-handle meta" />
    </div>
  );
}

