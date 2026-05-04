import { describe, expect, it } from "vitest";

import { domRectToFlowBounds, flowPointInRect, overlapRatioOfZone } from "../view/nesting/geometry";

describe("C8.6.3 — domRectToFlowBounds + flowPointInRect", () => {
  it("identity screenToFlow : rect écran → mêmes limites flow", () => {
    const identity = (p: { x: number; y: number }) => ({ x: p.x, y: p.y });
    const dom = { left: 10, top: 20, right: 110, bottom: 70 } as DOMRect;
    const r = domRectToFlowBounds(identity, dom);
    expect(r).toEqual({ x: 10, y: 20, width: 100, height: 50 });
    expect(flowPointInRect(60, 45, r)).toBe(true);
    expect(flowPointInRect(9, 45, r)).toBe(false);
  });

  it("zoom 2× : coins convertis → aire flow correcte", () => {
    const half = (p: { x: number; y: number }) => ({ x: p.x / 2, y: p.y / 2 });
    const dom = { left: 0, top: 0, right: 200, bottom: 100 } as DOMRect;
    const r = domRectToFlowBounds(half, dom);
    expect(r).toEqual({ x: 0, y: 0, width: 100, height: 50 });
    expect(flowPointInRect(50, 25, r)).toBe(true);
  });

  it("flowPointInRect inclut les bords", () => {
    const r = { x: 0, y: 0, width: 10, height: 10 };
    expect(flowPointInRect(0, 0, r)).toBe(true);
    expect(flowPointInRect(10, 10, r)).toBe(true);
  });

  it("overlapRatioOfZone : gros child recouvrant une petite zone → proche de 1", () => {
    const zone = { x: 100, y: 0, width: 10, height: 10 };
    const child = { x: 0, y: 0, width: 200, height: 200 };
    expect(overlapRatioOfZone(zone, child)).toBeCloseTo(1, 5);
  });

  it("overlapRatioOfZone : centre du child hors zone mais coin qui intersecte", () => {
    const zone = { x: 50, y: 50, width: 20, height: 20 };
    const child = { x: 60, y: 60, width: 100, height: 100 };
    const r = overlapRatioOfZone(zone, child);
    expect(r).toBeGreaterThan(0);
    expect(r).toBeLessThan(1);
  });
});
