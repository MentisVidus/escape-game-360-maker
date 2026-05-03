import { Handle, Position, useUpdateNodeInternals, type NodeProps } from "@xyflow/react";
import { useEffect, useState, type KeyboardEvent, type MouseEvent } from "react";

import type { SceneBoxNodeId, SceneNodeId } from "../../model/ids";
import type { SceneNode } from "../../model/nodes";
import { sboxIdFromScene } from "../../store/reconcileSceneBoxes";
import {
  HANDLE_FLOW_OUT,
  HANDLE_GOTO_IN,
  HANDLE_META_OUT,
  HANDLE_SYNTH_GOTO_OUT,
} from "../handles/handleIds";
import { useNodalUi } from "../nodalUiContext";
import type { NodalRFData } from "../nodalReactFlowProjection";
import "../handles/handles.css";
import "./nodes.css";

export function SceneNodeView({ id, data }: NodeProps) {
  const updateNodeInternals = useUpdateNodeInternals();
  const rf = data as NodalRFData;
  const node = rf.node as SceneNode;
  const ui = useNodalUi();
  const sboxId = sboxIdFromScene(node.id as SceneNodeId);
  const containerCollapsed = !!rf.containerCollapsed;
  const actionCount = rf.sceneBoxActionCount ?? 0;
  const showFoldChevron = actionCount > 0;
  const synthGotoCount = rf.sceneBoxSynthGotoTargetCount ?? 0;
  const showSynthGotoOut = containerCollapsed && synthGotoCount > 0;
  const hideFlowOut = containerCollapsed;
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState(node.label);

  useEffect(() => {
    setTitleDraft(node.label);
  }, [node.label, node.id]);

  /** RF ne mesure pas les handles montés/démontés sans recalcul (arêtes synth-goto-out). */
  useEffect(() => {
    updateNodeInternals(id);
  }, [id, updateNodeInternals, showSynthGotoOut, hideFlowOut]);

  const toggleSBoxCollapsed = (e: MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    ui.store.getState().toggleNodeCollapsed(sboxId as SceneBoxNodeId);
  };

  const startEditingTitle = (e: MouseEvent<HTMLDivElement>) => {
    const t = e.target as HTMLElement;
    if (t.closest(".nodal-handle") || t.closest(".nodal-node-collapse-toggle")) return;
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
      className={`nodal-node scene${containerCollapsed ? " nodal-node--scene-sbox-collapsed" : ""}`}
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
      {showFoldChevron ? (
        <button
          type="button"
          className="nodal-node-collapse-toggle nodal-node-collapse-toggle--scene"
          onClick={toggleSBoxCollapsed}
          aria-expanded={!containerCollapsed}
          aria-label={containerCollapsed ? "Déplier la zone scène" : "Replier la zone scène"}
          title={containerCollapsed ? "Déplier" : "Replier"}
        >
          {containerCollapsed ? "▸" : "▾"}
        </button>
      ) : null}
      {containerCollapsed ? (
        <div className="subtitle nodal-scene-sbox-collapsed-count">
          Scène — {actionCount} {actionCount > 1 ? "actions masquées" : "action masquée"}
        </div>
      ) : (
        <div className="subtitle">Scene ({node.sceneId})</div>
      )}
      <Handle id={HANDLE_GOTO_IN} type="target" position={Position.Left} className="nodal-handle transition" />
      <Handle
        id={HANDLE_FLOW_OUT}
        type="source"
        position={Position.Right}
        className={`nodal-handle flow${hideFlowOut ? " nodal-handle--hidden-when-sbox-collapsed" : ""}`}
      />
      {showSynthGotoOut ? (
        <Handle
          id={HANDLE_SYNTH_GOTO_OUT}
          type="source"
          position={Position.Right}
          isConnectable={false}
          className="nodal-handle transition nodal-handle--synth"
        />
      ) : null}
      <Handle id={HANDLE_META_OUT} type="source" position={Position.Bottom} className="nodal-handle meta" />
    </div>
  );
}

