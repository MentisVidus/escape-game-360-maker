/** @vitest-environment jsdom */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, type ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";

import { createNodalProjectStore } from "../store/nodalProjectStore";
import { ProjectIdentitySettingsPopup } from "../view/popups/ProjectIdentitySettingsPopup";

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

describe("C10.2.a-fix — ProjectIdentitySettingsPopup", () => {
  it("rend le champ titre avec la valeur du store", () => {
    const store = createNodalProjectStore();
    store.getState().setMetaTitle("Titre initial");
    renderTree(
      <ProjectIdentitySettingsPopup open onClose={() => {}} onBack={() => {}} store={store} />
    );
    const input = container.querySelector<HTMLInputElement>("#nodal-global-project-title");
    expect(input?.value).toBe("Titre initial");
  });

  it("change le titre via setMetaTitle + flush DOM", () => {
    const store = createNodalProjectStore();
    const flush = vi.fn();
    vi.stubGlobal("EditorSharedBundle", { flushNodalStoreToEditorDom: flush });
    renderTree(
      <ProjectIdentitySettingsPopup open onClose={() => {}} onBack={() => {}} store={store} />
    );
    const input = container.querySelector<HTMLInputElement>("#nodal-global-project-title");
    expect(input).toBeTruthy();
    act(() => {
      const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value")?.set;
      setter?.call(input!, "Nouveau titre");
      input!.dispatchEvent(new Event("input", { bubbles: true }));
      input!.dispatchEvent(new Event("change", { bubbles: true }));
    });
    expect(store.getState().meta.title).toBe("Nouveau titre");
    expect(flush).toHaveBeenCalled();
  });

  it("bouton Terminé ferme la popup", () => {
    const store = createNodalProjectStore();
    const onClose = vi.fn();
    renderTree(
      <ProjectIdentitySettingsPopup open onClose={onClose} onBack={() => {}} store={store} />
    );
    const done = Array.from(container.querySelectorAll("button")).find((b) =>
      (b.textContent || "").includes("Terminé")
    );
    expect(done).toBeTruthy();
    act(() => {
      done!.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("bouton Retour appelle onBack", () => {
    const store = createNodalProjectStore();
    const onClose = vi.fn();
    const onBack = vi.fn();
    renderTree(
      <ProjectIdentitySettingsPopup open onClose={onClose} onBack={onBack} store={store} />
    );
    const back = Array.from(container.querySelectorAll("button")).find((b) =>
      (b.textContent || "").includes("Retour")
    );
    expect(back).toBeTruthy();
    act(() => {
      back!.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    expect(onBack).toHaveBeenCalledTimes(1);
    expect(onClose).toHaveBeenCalledTimes(0);
  });
});
