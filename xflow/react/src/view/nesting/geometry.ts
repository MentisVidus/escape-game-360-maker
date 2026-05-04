import type { XYPosition } from "@xyflow/react";

export type NestedNodeLike = {
  id: string;
  parentId?: string;
  position: XYPosition;
  measured?: { width?: number; height?: number };
  width?: number;
  height?: number;
};

type Rect = { x: number; y: number; width: number; height: number };

/** Fallbacks alignés sur la projection RF / `computeContainerBounds`. */
export const DEFAULT_NODE_WIDTH = 180;
export const DEFAULT_NODE_HEIGHT = 70;

function getNodeSize(node: NestedNodeLike): { width: number; height: number } {
  return {
    width: node.measured?.width ?? node.width ?? DEFAULT_NODE_WIDTH,
    height: node.measured?.height ?? node.height ?? DEFAULT_NODE_HEIGHT,
  };
}

export function getAbsolutePosition(node: NestedNodeLike, nodesById: Map<string, NestedNodeLike>): XYPosition {
  let x = node.position.x;
  let y = node.position.y;
  let currentParentId = node.parentId;
  let guard = 0;
  while (currentParentId && guard < 12) {
    const parent = nodesById.get(currentParentId);
    if (!parent) break;
    x += parent.position.x;
    y += parent.position.y;
    currentParentId = parent.parentId;
    guard += 1;
  }
  return { x, y };
}

export function toAbsoluteRect(node: NestedNodeLike, nodesById: Map<string, NestedNodeLike>): Rect {
  const abs = getAbsolutePosition(node, nodesById);
  const size = getNodeSize(node);
  return { x: abs.x, y: abs.y, width: size.width, height: size.height };
}

function rectIntersectionArea(a: Rect, b: Rect): number {
  const x1 = Math.max(a.x, b.x);
  const y1 = Math.max(a.y, b.y);
  const x2 = Math.min(a.x + a.width, b.x + b.width);
  const y2 = Math.min(a.y + a.height, b.y + b.height);
  if (x2 <= x1 || y2 <= y1) return 0;
  return (x2 - x1) * (y2 - y1);
}

export function overlapRatioByChild(child: Rect, candidateParent: Rect): number {
  const childArea = child.width * child.height;
  if (childArea <= 0) return 0;
  return rectIntersectionArea(child, candidateParent) / childArea;
}

/** C8.6.3 — conversion `getBoundingClientRect` → repère flow (via `screenToFlowPosition`). */
export type ScreenToFlowFn = (p: { x: number; y: number }) => XYPosition;

export function domRectToFlowBounds(screenToFlow: ScreenToFlowFn, dom: DOMRect | DOMRectReadOnly): Rect {
  const p1 = screenToFlow({ x: dom.left, y: dom.top });
  const p2 = screenToFlow({ x: dom.right, y: dom.bottom });
  const x = Math.min(p1.x, p2.x);
  const y = Math.min(p1.y, p2.y);
  return {
    x,
    y,
    width: Math.abs(p2.x - p1.x),
    height: Math.abs(p2.y - p1.y),
  };
}

/** Point (repère flow) dans un rectangle axis-aligned (inclus bord). */
export function flowPointInRect(px: number, py: number, r: Rect): boolean {
  return px >= r.x && py >= r.y && px <= r.x + r.width && py <= r.y + r.height;
}

