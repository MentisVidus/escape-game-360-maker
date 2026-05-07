/** @vitest-environment jsdom */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, type ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";

import { deserializeFromProjectJson } from "../serialize/fromProjectJson";
import { serializeToProjectJson } from "../serialize/toProjectJson";
import { createNodalProjectStore } from "../store/nodalProjectStore";
import { EndScreensSettingsPopup } from "../view/popups/EndScreensSettingsPopup";

vi.mock("../view/quill/nodalQuillSetup", () => {
  class FakeQuill {
    root: HTMLDivElement;
    private handlers: Record<string, Set<() => void>> = {};

    constructor(host: HTMLElement) {
      this.root = document.createElement("div");
      host.appendChild(this.root);
    }

    on(evt: string, fn: () => void) {
      if (!this.handlers[evt]) this.handlers[evt] = new Set();
      this.handlers[evt].add(fn);
    }

    off(evt: string, fn: () => void) {
      this.handlers[evt]?.delete(fn);
    }
  }

  return {
    Quill: FakeQuill,
    registerNodalQuillFormats: () => {},
    nodalQuillToolbar: () => [],
    loadHtmlIntoNodalQuill: (q: FakeQuill, html: string) => {
      q.root.innerHTML = html;
    },
  };
});

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
  delete (window as Window & { __escape360EditorDomApi?: unknown }).__escape360EditorDomApi;
  delete (window as Window & { EditorSharedNodalToDom?: unknown }).EditorSharedNodalToDom;
  document.body.innerHTML = "";
  vi.unstubAllGlobals();
});

function renderTree(node: ReactNode) {
  act(() => {
    root.render(node);
  });
}

describe("C10.2.f — EndScreensSettingsPopup", () => {
  it("bind store + flush pour selects et champs texte", () => {
    const store = createNodalProjectStore();
    const flush = vi.fn();
    vi.stubGlobal("EditorSharedBundle", { flushNodalStoreToEditorDom: flush });
    store.getState().addScene({
      id: "scene-1",
      nodeType: "scene",
      sceneId: "ext-mainroom",
      label: "Main room",
      panoramaUrl: "",
    });
    renderTree(<EndScreensSettingsPopup open onClose={() => {}} onBack={() => {}} store={store} />);

    const victorySelect = container.querySelector<HTMLSelectElement>("#nodal-end-victory-scene");
    act(() => {
      victorySelect!.value = "ext-mainroom";
      victorySelect!.dispatchEvent(new Event("change", { bubbles: true }));
    });

    const gameOverTitle = container.querySelector<HTMLInputElement>("#nodal-end-gameover-title");
    act(() => {
      const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value")?.set;
      setter?.call(gameOverTitle!, "Perdu");
      gameOverTitle!.dispatchEvent(new Event("input", { bubbles: true }));
      gameOverTitle!.dispatchEvent(new Event("change", { bubbles: true }));
    });

    expect(store.getState().meta.settings?.endScreens?.victorySceneExternalId).toBe("ext-mainroom");
    expect(store.getState().meta.settings?.endScreens?.gameOver.title).toBe("Perdu");
    expect(flush).toHaveBeenCalled();
  });

  it("affiche une option scene introuvable pour id dangling", () => {
    const store = createNodalProjectStore();
    store.getState().setMetaSettingsEndScreens({ victorySceneExternalId: "ext-gone" });
    renderTree(<EndScreensSettingsPopup open onClose={() => {}} onBack={() => {}} store={store} />);
    const missing = Array.from(container.querySelectorAll("option")).find((opt) =>
      (opt.textContent || "").includes("scène introuvable")
    );
    expect(missing).toBeTruthy();
    expect(missing?.disabled).toBe(true);
  });
});

describe("C10.2.f — endScreens serialize/hydrate", () => {
  it("round-trip meta.settings.endScreens", () => {
    const store = createNodalProjectStore();
    store.getState().setMetaSettingsEndScreens({
      victorySceneExternalId: "ext-win",
      gameOverSceneExternalId: "ext-lose",
      gameOver: {
        title: "Perdu",
        bodyHtml: "<p>Try again</p>",
        buttonLabel: "Rejouer",
      },
      victory: {
        title: "Gagné",
        bodyHtml: "<p>Bravo</p>",
        buttonLabel: "Continuer",
      },
    });
    const json = serializeToProjectJson(store.getState());
    expect(json.meta?.settings?.endScreens).toEqual({
      victorySceneExternalId: "ext-win",
      gameOverSceneExternalId: "ext-lose",
      gameOver: {
        title: "Perdu",
        bodyHtml: "<p>Try again</p>",
        buttonLabel: "Rejouer",
      },
      victory: {
        title: "Gagné",
        bodyHtml: "<p>Bravo</p>",
        buttonLabel: "Continuer",
      },
    });
    const hydrated = deserializeFromProjectJson(json);
    expect(hydrated.meta.settings?.endScreens).toEqual(json.meta?.settings?.endScreens);
  });
});

describe("C10.2.f — applyFromStore flush vers DOM legacy", () => {
  it("projette les 8 ids et synchronise les riches via flushRichEditorsIn", async () => {
    document.body.innerHTML = `
      <div id="scenes-container"></div>
      <div id="end-screens-form-container"></div>
      <select id="victorySceneId"><option value="">n</option><option value="ext-win">w</option></select>
      <select id="gameOverSceneId"><option value="">n</option><option value="ext-lose">l</option></select>
      <input id="endGameOverTitle" type="text" />
      <textarea id="endGameOverBody"></textarea>
      <input id="endGameOverBtn" type="text" />
      <input id="endVictoryTitle" type="text" />
      <textarea id="endVictoryBody"></textarea>
      <input id="endVictoryBtn" type="text" />
    `;
    const flushRichEditorsIn = vi.fn();
    (window as Window & { __escape360EditorDomApi?: unknown }).__escape360EditorDomApi = {
      addScene: () => 1,
      addHotspot: () => 1,
      EditorCore: {},
      actionV2ToLegacyHotspotData: () => ({}),
      refreshAllSceneTargetSelects: () => {},
      initAllSceneIdStableFields: () => {},
      resyncSceneIdCounterFromDom: () => {},
      flushRichEditorsIn,
    };
    await import("../../../../js/editor-shared-nodal-to-dom.js");
    const api = (window as Window & { EditorSharedNodalToDom?: { applyFromStore: (storeApi: unknown) => unknown } })
      .EditorSharedNodalToDom;
    expect(api).toBeTruthy();

    api!.applyFromStore({
      getState: () => ({
        meta: {
          title: "X",
          settings: {
            endScreens: {
              victorySceneExternalId: "ext-win",
              gameOverSceneExternalId: "ext-lose",
              gameOver: { title: "Perdu", bodyHtml: "<p>go</p>", buttonLabel: "Retry" },
              victory: { title: "Gagné", bodyHtml: "<p>win</p>", buttonLabel: "Next" },
            },
          },
        },
        scenes: {},
        actions: {},
        satellites: {},
        media: {},
        edges: [],
        layout: {},
      }),
    });

    expect((document.getElementById("victorySceneId") as HTMLSelectElement).value).toBe("ext-win");
    expect((document.getElementById("gameOverSceneId") as HTMLSelectElement).value).toBe("ext-lose");
    expect((document.getElementById("endGameOverTitle") as HTMLInputElement).value).toBe("Perdu");
    expect((document.getElementById("endGameOverBody") as HTMLTextAreaElement).value).toBe("<p>go</p>");
    expect((document.getElementById("endGameOverBtn") as HTMLInputElement).value).toBe("Retry");
    expect((document.getElementById("endVictoryTitle") as HTMLInputElement).value).toBe("Gagné");
    expect((document.getElementById("endVictoryBody") as HTMLTextAreaElement).value).toBe("<p>win</p>");
    expect((document.getElementById("endVictoryBtn") as HTMLInputElement).value).toBe("Next");
    expect(flushRichEditorsIn).toHaveBeenCalledTimes(1);
    expect(flushRichEditorsIn).toHaveBeenCalledWith(document.getElementById("end-screens-form-container"));
  });
});

