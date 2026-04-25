import { Handle, Position, type NodeProps } from "@xyflow/react";

import type { AnyNodeId } from "../../model/ids";
import type { ActionNode } from "../../model/nodes";
import {
  HANDLE_FLOW_IN,
  HANDLE_FLOW_OUT,
  HANDLE_GOTO_OUT,
  HANDLE_META_OUT,
} from "../handles/handleIds";
import { useNodalUi } from "../nodalUiContext";
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

type ActionNodeViewData = {
  node: ActionNode;
  isRewardChild: boolean;
  rewardParentType: "req" | "pwd" | null;
};

export function ActionNodeView({ id, data }: NodeProps) {
  const nodeData = data as ActionNodeViewData;
  const node = nodeData.node;
  const ui = useNodalUi();
  const showDetach = nodeData.isRewardChild;

  return (
    <div className={`nodal-node action action-${node.actionType}${showDetach ? " action-child-reward" : ""}`}>
      <div className="title">{node.label}</div>
      <div className="subtitle">{getActionSubtitle(node)}</div>
      <Handle id={HANDLE_FLOW_IN} type="target" position={Position.Left} className="nodal-handle flow" />
      {node.actionType === "goto" ? (
        <Handle id={HANDLE_GOTO_OUT} type="source" position={Position.Right} className="nodal-handle transition" />
      ) : null}
      {node.actionType === "selector" ? (
        <Handle id={HANDLE_FLOW_OUT} type="source" position={Position.Right} className="nodal-handle flow" />
      ) : null}
      <Handle id={HANDLE_META_OUT} type="source" position={Position.Bottom} className="nodal-handle meta" />
      {showDetach ? (
        <button
          type="button"
          className="nodal-detach-btn"
          onClick={() => ui.store.getState().detachChild(id as AnyNodeId)}
          title="Détacher"
        >
          🔗 Détacher
        </button>
      ) : null}
      {(node.actionType === "req" || node.actionType === "pwd") && !node.rewardActionId ? (
        <div className="nodal-reward-placeholder">Récompense</div>
      ) : null}
    </div>
  );
}

