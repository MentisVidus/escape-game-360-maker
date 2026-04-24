import { Handle, Position, type NodeProps } from "@xyflow/react";

import type { ActionNode } from "../../model/nodes";
import {
  HANDLE_FLOW_IN,
  HANDLE_FLOW_OUT,
  HANDLE_GOTO_OUT,
  HANDLE_META_OUT,
} from "../handles/handleIds";
import "../handles/handles.css";
import "./nodes.css";

function getActionSubtitle(node: ActionNode): string {
  switch (node.actionType) {
    case "msg":
      return "Message";
    case "pick":
      return "Pick";
    case "goto":
      return "Goto";
    case "selector":
      return "Selector";
    case "req":
      return "Req";
    case "pwd":
      return "Pwd";
  }
}

export function ActionNodeView({ data }: NodeProps) {
  const node = (data as { node: ActionNode }).node;

  return (
    <div className="nodal-node action">
      <div className="title">{node.label}</div>
      <div className="subtitle">{getActionSubtitle(node)}</div>
      <Handle id={HANDLE_FLOW_IN} type="target" position={Position.Left} className="nodal-handle flow" />
      {node.actionType === "goto" ? (
        <Handle id={HANDLE_GOTO_OUT} type="source" position={Position.Right} className="nodal-handle transition" />
      ) : null}
      {node.actionType === "selector" || node.actionType === "req" || node.actionType === "pwd" ? (
        <>
          {/* TODO(C3): remove once nesting replaces edges */}
          <Handle id={HANDLE_FLOW_OUT} type="source" position={Position.Right} className="nodal-handle flow" />
        </>
      ) : null}
      <Handle id={HANDLE_META_OUT} type="source" position={Position.Bottom} className="nodal-handle meta" />
    </div>
  );
}

