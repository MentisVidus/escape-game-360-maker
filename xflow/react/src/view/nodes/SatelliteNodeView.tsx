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
      ui.setScenePreviewSceneId(null);
      ui.setCoordsPickerSatelliteId(null);
      ui.setObjectEditorSatelliteId(id as SatelliteNodeId);
    } else if (node.satelliteType === "coords-options") {
      ui.setScenePreviewSceneId(null);
      ui.setCoordsPickerSatelliteId(null);
      ui.setCoordsEditorSatelliteId(id as SatelliteNodeId);
    } else if (node.satelliteType === "choice-options") {
      ui.setScenePreviewSceneId(null);
      ui.setCoordsPickerSatelliteId(null);
      ui.setChoiceEditorSatelliteId(id as SatelliteNodeId);
    }
  }, [id, node.satelliteType, ui]);

  return (
    <div
      className="nodal-node satellite satellite--clickable"
      onDoubleClick={openEditor}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          openEditor();
        }
      }}
      role="button"
      tabIndex={0}
    >
      <div className="title">Satellite</div>
      <div className="subtitle">{getSatelliteSubtitle(node)}</div>
      <Handle id={HANDLE_META_IN} type="target" position={Position.Top} className="nodal-handle meta" />
    </div>
  );
}
