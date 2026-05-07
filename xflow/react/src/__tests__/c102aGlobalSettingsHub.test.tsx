/** @vitest-environment jsdom */
/**
 * C10.2.a-fix — hub Paramètres globaux (liste de boutons) et hydrate
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

describe("C10.2.a-fix — GlobalSettingsHubPopup", () => {
  it("rend 6 boutons section", () => {
    const store = createNodalProjectStore();
    renderTree(
      <GlobalSettingsHubPopup
        open
        onClose={() => {}}
        onOpenProjectIdentity={() => {}}
        onOpenPopupTheme={() => {}}
        store={store}
      />
    );
    const btns = Array.from(container.querySelectorAll("button.nodal-global-hub-btn"));
    expect(btns.length).toBe(6);
  });

  it("4 boutons sont désactivés avec tooltip C10.2.x", () => {
    const store = createNodalProjectStore();
    renderTree(
      <GlobalSettingsHubPopup
        open
        onClose={() => {}}
        onOpenProjectIdentity={() => {}}
        onOpenPopupTheme={() => {}}
        store={store}
      />
    );
    const btns = Array.from(container.querySelectorAll<HTMLButtonElement>("button.nodal-global-hub-btn"));
    const disabled = btns.filter((b) => b.disabled);
    expect(disabled.length).toBe(4);
    expect(disabled.some((b) => (b.title || "").includes("C10.2.b"))).toBe(true);
    expect(disabled.some((b) => (b.title || "").includes("C10.2.d"))).toBe(true);
    expect(disabled.some((b) => (b.title || "").includes("C10.2.e"))).toBe(true);
    expect(disabled.some((b) => (b.title || "").includes("C10.2.f"))).toBe(true);
  });

  it("clic Identité projet appelle onOpenProjectIdentity", () => {
    const store = createNodalProjectStore();
    const onIdentity = vi.fn();
    renderTree(
      <GlobalSettingsHubPopup
        open
        onClose={() => {}}
        onOpenProjectIdentity={onIdentity}
        onOpenPopupTheme={() => {}}
        store={store}
      />
    );
    const btn = Array.from(container.querySelectorAll("button.nodal-global-hub-btn")).find((b) =>
      (b.textContent || "").includes("Identité")
    );
    expect(btn).toBeDefined();
    act(() => {
      btn!.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    expect(onIdentity).toHaveBeenCalledTimes(1);
  });

  it("clic Thème popups appelle onOpenPopupTheme", () => {
    const store = createNodalProjectStore();
    const onTheme = vi.fn();
    renderTree(
      <GlobalSettingsHubPopup
        open
        onClose={() => {}}
        onOpenProjectIdentity={() => {}}
        onOpenPopupTheme={onTheme}
        store={store}
      />
    );
    const btn = Array.from(container.querySelectorAll("button")).find((b) =>
      (b.textContent || "").includes("Thème popups")
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
