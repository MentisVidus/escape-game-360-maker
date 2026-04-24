import { Handle, Position, type NodeProps } from "@xyflow/react";

import type { SceneNode } from "../../model/nodes";
import {
  HANDLE_FLOW_OUT,
  HANDLE_GOTO_IN,
  HANDLE_META_OUT,
} from "../handles/handleIds";
import "../handles/handles.css";
import "./nodes.css";

export function SceneNodeView({ data }: NodeProps) {
  const node = (data as { node: SceneNode }).node;
  return (
    <div className="nodal-node scene">
      <div className="title">{node.label}</div>
      <div className="subtitle">Scene ({node.sceneId})</div>
      <Handle id={HANDLE_GOTO_IN} type="target" position={Position.Left} className="nodal-handle transition" />
      <Handle id={HANDLE_FLOW_OUT} type="source" position={Position.Right} className="nodal-handle flow" />
      <Handle id={HANDLE_META_OUT} type="source" position={Position.Bottom} className="nodal-handle meta" />
    </div>
  );
}

