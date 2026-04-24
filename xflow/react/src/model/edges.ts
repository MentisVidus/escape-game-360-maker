import type { AnyNodeId, EdgeId } from "./ids";

export type FlowEdge = {
  id: EdgeId;
  family: "flow";
  sourceId: AnyNodeId;
  targetId: AnyNodeId;
};

export type TransitionEdge = {
  id: EdgeId;
  family: "transition";
  sourceId: AnyNodeId;
  targetId: AnyNodeId;
};

export type MetaEdge = {
  id: EdgeId;
  family: "meta";
  sourceId: AnyNodeId;
  targetId: AnyNodeId;
};

export type Edge = FlowEdge | TransitionEdge | MetaEdge;

