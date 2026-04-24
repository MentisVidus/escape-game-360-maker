import { Handle, Position, type NodeProps } from "@xyflow/react";

import type { MediaNode } from "../../model/nodes";
import { HANDLE_META_IN } from "../handles/handleIds";
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

export function MediaNodeView({ data }: NodeProps) {
  const node = (data as { node: MediaNode }).node;
  return (
    <div className="nodal-node media">
      <div className="title">Media</div>
      <div className="subtitle">{getMediaSubtitle(node)}</div>
      <Handle id={HANDLE_META_IN} type="target" position={Position.Top} className="nodal-handle meta" />
    </div>
  );
}

