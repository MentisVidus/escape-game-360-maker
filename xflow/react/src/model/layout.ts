import type { AnyNodeId } from "./ids";

export type Viewport = {
  x: number;
  y: number;
  zoom: number;
};

export type NodeLayout = {
  x: number;
  y: number;
  parentId: AnyNodeId | null;
  collapsed: boolean;
};

