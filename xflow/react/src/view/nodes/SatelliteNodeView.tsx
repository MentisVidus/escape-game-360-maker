import { Handle, Position, type NodeProps } from "@xyflow/react";
import { useCallback } from "react";

import type { SatelliteNodeId } from "../../model/ids";
import type { SatelliteNode } from "../../model/nodes";
import { useNodalUi } from "../nodalUiContext";
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

export function SatelliteNodeView({ id, data }: NodeProps) {
  const node = (data as { node: SatelliteNode }).node;
  const ui = useNodalUi();

  const openEditor = useCallback(() => {
    if (node.satelliteType === "object") {
      ui.setObjectEditorSatelliteId(id as SatelliteNodeId);
    }
  }, [id, node.satelliteType, ui]);

  return (
    <div
      className={`nodal-node satellite${node.satelliteType === "object" ? " satellite--clickable" : ""}`}
      onClick={node.satelliteType === "object" ? openEditor : undefined}
      onKeyDown={
        node.satelliteType === "object"
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                openEditor();
              }
            }
          : undefined
      }
      role={node.satelliteType === "object" ? "button" : undefined}
      tabIndex={node.satelliteType === "object" ? 0 : undefined}
    >
      <div className="title">Satellite</div>
      <div className="subtitle">{getSatelliteSubtitle(node)}</div>
      <Handle id={HANDLE_META_IN} type="target" position={Position.Top} className="nodal-handle meta" />
    </div>
  );
}
