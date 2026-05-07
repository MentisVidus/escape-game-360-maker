/** @vitest-environment jsdom */
/**
 * C10.3 — recette automatique minimale : le composant racine carte monte la palette +
 * surface React Flow (sans intégration HTML éditeur legacy).
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

describe("C10.3 — NodalCanvas visible au mount", () => {
  it("rend palette + zone flux (landing carte nodale)", () => {
    const store = createNodalProjectStore();
    renderTree(<NodalCanvas store={store} />);
    expect(container.querySelector(".nodal-palette")).toBeTruthy();
    expect(container.querySelector(".nodal-canvas-pane")).toBeTruthy();
    expect(container.querySelector(".react-flow")).toBeTruthy();
  });
});
