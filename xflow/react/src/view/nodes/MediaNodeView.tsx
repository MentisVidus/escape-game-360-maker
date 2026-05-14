import { Handle, Position, type NodeProps } from "@xyflow/react";
import { useCallback } from "react";

import type { MediaNodeId } from "../../model/ids";
import type { MediaNode } from "../../model/nodes";
import { HANDLE_META_IN } from "../handles/handleIds";
import { useNodalUi } from "../nodalUiContext";
import "../handles/handles.css";
import "./nodes.css";

function getMediaSubtitle(node: MediaNode): string {
  switch (node.mediaType) {
    case "media-image":
      return "Image";
    case "media-audio":
      return "Audio";
  }
}

export function MediaNodeView({ id, data }: NodeProps) {
  const node = (data as { node: MediaNode }).node;
  const ui = useNodalUi();
  const openEditor = useCallback(() => {
    ui.setScenePreviewSceneId(null);
    ui.setCoordsPickerSatelliteId(null);
    ui.setMediaEditorMediaId(id as MediaNodeId);
  }, [id, ui]);

  return (
    <div
      className="nodal-node media media--clickable"
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
      <div className="title">{node.label || "Media"}</div>
      <div className="subtitle">{getMediaSubtitle(node)}</div>
      <Handle id={HANDLE_META_IN} type="target" position={Position.Top} className="nodal-handle meta" />
    </div>
  );
}

