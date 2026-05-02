import { Handle, Position, type NodeProps } from "@xyflow/react";
import { useEffect, useState, type KeyboardEvent, type MouseEvent } from "react";

import type { SceneNodeId } from "../../model/ids";
import type { SceneNode } from "../../model/nodes";
import {
  HANDLE_FLOW_OUT,
  HANDLE_GOTO_IN,
  HANDLE_META_OUT,
} from "../handles/handleIds";
import { useNodalUi } from "../nodalUiContext";
import type { NodalRFData } from "../nodalReactFlowProjection";
import "../handles/handles.css";
import "./nodes.css";

export function SceneNodeView({ data }: NodeProps) {
  const rf = data as NodalRFData;
  const node = rf.node as SceneNode;
  const sceneFrame = !!rf.sceneFrame;
  const ui = useNodalUi();
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState(node.label);

  useEffect(() => {
    setTitleDraft(node.label);
  }, [node.label, node.id]);

  const startEditingTitle = (e: MouseEvent<HTMLDivElement>) => {
    const t = e.target as HTMLElement;
    if (t.closest(".nodal-handle")) return;
    setTitleDraft(node.label);
    setEditingTitle(true);
  };

  const commitTitle = () => {
    const nextLabel = titleDraft.trim();
    ui.store.getState().updateNodeData(node.id as SceneNodeId, { label: nextLabel || node.label } as never);
    setEditingTitle(false);
  };

  const cancelTitle = () => {
    setTitleDraft(node.label);
    setEditingTitle(false);
  };

  const onTitleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      commitTitle();
      return;
    }
    if (e.key === "Escape") {
      e.preventDefault();
      cancelTitle();
    }
  };

  return (
    <div
      className={`nodal-node scene${sceneFrame ? " nodal-node--scene-frame" : ""}`}
      onClick={startEditingTitle}
    >
      {editingTitle ? (
        <input
          className="nodal-node-title-input"
          type="text"
          autoFocus
          value={titleDraft}
          onClick={(e) => e.stopPropagation()}
          onChange={(e) => setTitleDraft(e.target.value)}
          onBlur={commitTitle}
          onKeyDown={onTitleKeyDown}
          aria-label="Scene title"
        />
      ) : (
        <div className="title">{node.label}</div>
      )}
      <div className="subtitle">Scene ({node.sceneId})</div>
      <Handle id={HANDLE_GOTO_IN} type="target" position={Position.Left} className="nodal-handle transition" />
      <Handle id={HANDLE_FLOW_OUT} type="source" position={Position.Right} className="nodal-handle flow" />
      <Handle id={HANDLE_META_OUT} type="source" position={Position.Bottom} className="nodal-handle meta" />
    </div>
  );
}

