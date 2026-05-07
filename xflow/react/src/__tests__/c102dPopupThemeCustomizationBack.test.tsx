/** @vitest-environment jsdom */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, type ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";

import { createNodalProjectStore } from "../store/nodalProjectStore";
import { PopupThemeCustomizationPopup } from "../view/popups/PopupThemeCustomizationPopup";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  document.documentElement.lang = "fr";
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
  vi.unstubAllGlobals();
});

function renderTree(node: ReactNode) {
  act(() => {
    root.render(node);
  });
}

describe("C10.2.a-fix2 — PopupThemeCustomizationPopup retour générique", () => {
  it("clic Retour appelle onBackToHub + pushDom (updatePreview)", () => {
    const store = createNodalProjectStore();
    store.getState().setMetaSettingsPopupTheme({
      useCustom: true,
      font: "Impact, fantasy",
      color: "#eeeeee",
      bg: "#202020",
      bgAlpha: 0.7,
      btnBg: "#112233",
      btnColor: "#445566",
    });

    const onClose = vi.fn();
    const onBackToHub = vi.fn();
    const updatePreview = vi.fn();
    vi.stubGlobal("updatePreview", updatePreview);

    renderTree(
      <PopupThemeCustomizationPopup open store={store} onClose={onClose} onBackToHub={onBackToHub} />
    );

    const back = Array.from(container.querySelectorAll("button")).find((b) =>
      (b.textContent || "").includes("Retour")
    );
    expect(back).toBeTruthy();

    act(() => {
      back!.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(onBackToHub).toHaveBeenCalledTimes(1);
    expect(onClose).toHaveBeenCalledTimes(0);
    expect(updatePreview).toHaveBeenCalled();
  });
});

