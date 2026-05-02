import { Handle, NodeResizer, Position, type NodeProps } from "@xyflow/react";
import type { KeyboardEvent, MouseEvent } from "react";

import type { ActionNodeId, AnyNodeId } from "../../model/ids";
import type { ActionNode } from "../../model/nodes";
import { HANDLE_FLOW_IN, HANDLE_GOTO_OUT, HANDLE_META_OUT, HANDLE_SYNTH_GOTO_OUT } from "../handles/handleIds";
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
  contextualState?: 1 | 2 | 3 | 4;
  collapsed?: boolean;
  selectorChildCount?: number;
  synthGotoTargetCount?: number;
};

export function ActionNodeView({ id, data }: NodeProps) {
  const nodeData = data as ActionNodeViewData;
  const node = nodeData.node;
  const ui = useNodalUi();
  const showDetach = nodeData.isRewardChild;
  const cs = nodeData.contextualState;
  const isSelector = node.actionType === "selector";
  const isCollapsed = isSelector && !!nodeData.collapsed;
  const collapsedClass = isCollapsed ? " nodal-node--collapsed" : "";
  const stateClass =
    showDetach ? "" : cs === 1 ? " action-node--orphan" : cs === 3 ? " action-node--choice" : "";
  const textEditable =
    node.actionType === "msg" ||
    node.actionType === "pick" ||
    node.actionType === "goto" ||
    node.actionType === "req" ||
    node.actionType === "pwd" ||
    node.actionType === "selector";

  const toggleCollapsed = (e: MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    ui.store.getState().toggleNodeCollapsed(id as ActionNodeId);
  };

  const openTextEditor = (e: MouseEvent<HTMLDivElement>) => {
    const t = e.target as HTMLElement;
    if (
      t.closest(".nodal-handle") ||
      t.closest(".nodal-detach-btn") ||
      t.closest(".nodal-node-collapse-toggle")
    )
      return;
    if (node.actionType === "pick") {
      ui.openPickContentEditor(node.id as ActionNodeId);
      return;
    }
    if (node.actionType === "goto") {
      ui.openGotoContentEditor(node.id as ActionNodeId);
      return;
    }
    if (node.actionType === "req") {
      ui.openReqContentEditor(node.id as ActionNodeId);
      return;
    }
    if (node.actionType === "pwd") {
      ui.openPwdContentEditor(node.id as ActionNodeId);
      return;
    }
    if (node.actionType === "selector") {
      ui.openSelectorContentEditor(node.id as ActionNodeId);
      return;
    }
    ui.openMsgContentEditor(node.id as ActionNodeId);
  };

  const onTextKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      if (node.actionType === "pick") {
        ui.openPickContentEditor(node.id as ActionNodeId);
        return;
      }
      if (node.actionType === "goto") {
        ui.openGotoContentEditor(node.id as ActionNodeId);
        return;
      }
      if (node.actionType === "req") {
        ui.openReqContentEditor(node.id as ActionNodeId);
        return;
      }
      if (node.actionType === "pwd") {
        ui.openPwdContentEditor(node.id as ActionNodeId);
        return;
      }
      if (node.actionType === "selector") {
        ui.openSelectorContentEditor(node.id as ActionNodeId);
        return;
      }
      ui.openMsgContentEditor(node.id as ActionNodeId);
    }
  };

  const childCount = nodeData.selectorChildCount ?? 0;
  const synthGotoCount = nodeData.synthGotoTargetCount ?? 0;
  const showSynthGotoOut = isSelector && isCollapsed && synthGotoCount > 0;

  return (
    <div
      className={`nodal-node action action-${node.actionType}${showDetach ? " action-child-reward" : ""}${stateClass}${textEditable ? " action-msg--clickable" : ""}${collapsedClass}`}
      onClick={textEditable ? openTextEditor : undefined}
      onKeyDown={textEditable ? onTextKeyDown : undefined}
      role={textEditable ? "button" : undefined}
      tabIndex={textEditable ? 0 : undefined}
    >
      {isSelector && !isCollapsed ? (
        <NodeResizer
          minWidth={160}
          minHeight={80}
          onResize={(_, params) => {
            ui.store.getState().updateNodeLayout(id as ActionNodeId, { width: params.width, height: params.height });
          }}
        />
      ) : null}
      <div className="title">{node.label}</div>
      {isCollapsed ? (
        <div className="subtitle nodal-selector-collapsed-count">
          Selector — {childCount} {childCount > 1 ? "choix masqués" : "choix masqué"}
        </div>
      ) : (
        <div className="subtitle">{getActionSubtitle(node)}</div>
      )}
      {isSelector ? (
        <button
          type="button"
          className="nodal-node-collapse-toggle"
          onClick={toggleCollapsed}
          aria-expanded={!isCollapsed}
          aria-label={isCollapsed ? "Déplier le selector" : "Replier le selector"}
          title={isCollapsed ? "Déplier" : "Replier"}
        >
          {isCollapsed ? "▸" : "▾"}
        </button>
      ) : null}
      <Handle id={HANDLE_FLOW_IN} type="target" position={Position.Left} className="nodal-handle flow" />
      {showSynthGotoOut ? (
        <Handle
          id={HANDLE_SYNTH_GOTO_OUT}
          type="source"
          position={Position.Right}
          isConnectable={false}
          className="nodal-handle transition nodal-handle--synth"
        />
      ) : null}
      {node.actionType === "goto" ? (
        <Handle id={HANDLE_GOTO_OUT} type="source" position={Position.Right} className="nodal-handle transition" />
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

