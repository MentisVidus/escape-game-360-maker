/** @vitest-environment jsdom */
/**
 * C10.4 — bouton palette `[Vérifier]` / `[Verify]` + tooltip vue read-only.
 */
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { act, type ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";

import { createNodalProjectStore } from "../store/nodalProjectStore";
import { NodalCanvas } from "../view/NodalCanvas";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

class ResizeObserverMock implements ResizeObserver {
  observe(): void {}
  unobserve(): void {}
  disconnect(): void {}
}
(globalThis as typeof globalThis & { ResizeObserver?: typeof ResizeObserver }).ResizeObserver = ResizeObserverMock;

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  document.body.innerHTML = "";
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => {
    root.unmount();
  });
  document.body.innerHTML = "";
});

function renderTree(node: ReactNode) {
  act(() => {
    root.render(node);
  });
}

describe("C10.4 — bouton pied de palette Vérifier / Verify", () => {
  it("FR : libellé Vérifier et tooltip read-only", () => {
    document.documentElement.lang = "fr";
    const store = createNodalProjectStore();
    renderTree(<NodalCanvas store={store} />);
    const footer = container.querySelector(".nodal-palette-footer");
    const btn = Array.from(footer?.querySelectorAll("button") || []).find((b) => (b.textContent || "").trim() === "Vérifier");
    expect(btn).toBeTruthy();
    expect(btn?.getAttribute("title")).toContain("Vue de vérification");
    expect(btn?.getAttribute("title")).toContain("read-only");
  });

  it("EN : Verify + Verification view (read-only)", () => {
    document.documentElement.lang = "en";
    const store = createNodalProjectStore();
    renderTree(<NodalCanvas store={store} />);
    const footer = container.querySelector(".nodal-palette-footer");
    const btn = Array.from(footer?.querySelectorAll("button") || []).find((b) => (b.textContent || "").trim() === "Verify");
    expect(btn).toBeTruthy();
    expect(btn?.getAttribute("title")).toMatch(/Verification view \(read-only\)/);
  });
});
