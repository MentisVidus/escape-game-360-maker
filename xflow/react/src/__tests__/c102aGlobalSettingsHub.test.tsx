/** @vitest-environment jsdom */
/**
 * C10.2.a — hub Paramètres globaux (accordion + titre) et hydrate
 * `meta.settings` / sérialisation bundle.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, type ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";

import { createNodalProjectStore } from "../store/nodalProjectStore";
import { deserializeFromProjectJson } from "../serialize/fromProjectJson";
import { serializeToProjectJson } from "../serialize/toProjectJson";
import { GlobalSettingsHubPopup } from "../view/popups/GlobalSettingsHubPopup";

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

describe("C10.2.a — GlobalSettingsHubPopup", () => {
  it("rend 6 sections <details>", () => {
    const store = createNodalProjectStore();
    renderTree(
      <GlobalSettingsHubPopup open onClose={() => {}} onOpenPopupTheme={() => {}} store={store} />
    );
    expect(container.querySelectorAll("details").length).toBe(6);
  });

  it("seule la section Identité projet est ouverte par défaut", () => {
    const store = createNodalProjectStore();
    renderTree(
      <GlobalSettingsHubPopup open onClose={() => {}} onOpenPopupTheme={() => {}} store={store} />
    );
    const opened = container.querySelectorAll("details[open]");
    expect(opened.length).toBe(1);
    expect(opened[0]?.querySelector("summary")?.textContent).toContain("Identité");
  });

  it("saisie titre → setMetaTitle + flush DOM", () => {
    const flush = vi.fn();
    vi.stubGlobal("EditorSharedBundle", { flushNodalStoreToEditorDom: flush });
    const store = createNodalProjectStore();
    store.getState().setMetaTitle("Avant");
    const gameTitle = document.createElement("input");
    gameTitle.id = "gameTitle";
    document.body.appendChild(gameTitle);

    renderTree(
      <GlobalSettingsHubPopup open onClose={() => {}} onOpenPopupTheme={() => {}} store={store} />
    );
    const input = container.querySelector<HTMLInputElement>("#nodal-global-project-title");
    expect(input?.value).toBe("Avant");

    act(() => {
      const v = "Mon titre test";
      const setVal = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value")?.set;
      setVal?.call(input!, v);
      /* React 19 + contrôlé : `input` puis `change` pour que `onChange` lise `target.value`. */
      input!.dispatchEvent(new Event("input", { bubbles: true }));
      input!.dispatchEvent(new Event("change", { bubbles: true }));
    });
    expect(store.getState().meta.title).toBe("Mon titre test");
    expect(flush).toHaveBeenCalled();

    document.body.removeChild(gameTitle);
  });

  it("bouton personnalisation popups appelle onOpenPopupTheme", () => {
    const store = createNodalProjectStore();
    const onTheme = vi.fn();
    renderTree(
      <GlobalSettingsHubPopup open onClose={() => {}} onOpenPopupTheme={onTheme} store={store} />
    );
    const summaries = Array.from(container.querySelectorAll("summary"));
    const popSection = summaries.find((s) => (s.textContent || "").includes("Thème popups"));
    expect(popSection).toBeDefined();
    const details = popSection!.closest("details");
    act(() => {
      details!.setAttribute("open", "");
    });
    const btn = Array.from(container.querySelectorAll("button")).find((b) =>
      (b.textContent || "").includes("Personnalisation")
    );
    expect(btn).toBeDefined();
    act(() => {
      btn!.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    expect(onTheme).toHaveBeenCalledTimes(1);
  });
});

describe("C10.2.a — meta.settings hydrate + serialize", () => {
  it("deserialize lit meta.settings ; serialize le réécrit si non vide", () => {
    const incoming = {
      schemaVersion: 2 as const,
      title: "Jeu test",
      startSceneId: null,
      scenes: [] as [],
      meta: {
        settings: {
          audio: { enabled: true, url: "https://x.test/a.mp3" },
        },
      },
    };
    const state = deserializeFromProjectJson(incoming);
    expect(state.meta.settings?.audio).toEqual(incoming.meta.settings.audio);

    const json = serializeToProjectJson(state);
    expect(json.meta?.settings?.audio).toEqual(incoming.meta.settings.audio);
    expect(json.title).toBe("Jeu test");
  });

  it("sans meta.settings, serialize n’ajoute pas meta", () => {
    const state = deserializeFromProjectJson({
      schemaVersion: 2,
      title: "S",
      startSceneId: null,
      scenes: [],
    });
    const json = serializeToProjectJson(state);
    expect(json.meta).toBeUndefined();
  });
});
