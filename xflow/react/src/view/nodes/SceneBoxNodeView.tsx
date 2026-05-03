import { type NodeProps } from "@xyflow/react";

import type { SceneBoxNode } from "../../model/nodes";
import type { NodalRFData } from "../nodalReactFlowProjection";
import "./nodes.css";

/** Conteneur visuel scène + hotspots (1.b.2.x) — pas de handles, non sémantique. */
export function SceneBoxNodeView({ data }: NodeProps) {
  const rf = data as NodalRFData;
  const box = rf.node as SceneBoxNode;
  const label = typeof rf.label === "string" && rf.label.trim() ? rf.label.trim() : null;
  return (
    <div className="nodal-node-sbox" data-scene-box-id={box.id}>
      {label ? <div className="nodal-node-sbox__label">{label}</div> : null}
    </div>
  );
}
