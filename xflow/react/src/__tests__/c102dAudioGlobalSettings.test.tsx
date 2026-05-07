/** @vitest-environment jsdom */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, type ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";

import { createNodalProjectStore } from "../store/nodalProjectStore";
import { serializeToProjectJson } from "../serialize/toProjectJson";
import { deserializeFromProjectJson } from "../serialize/fromProjectJson";
import { AudioGlobalSettingsPopup } from "../view/popups/AudioGlobalSettingsPopup";

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

describe("C10.2.d — AudioGlobalSettingsPopup", () => {
  it("affiche url/volume mais disabled quand enabled=false", () => {
    const store = createNodalProjectStore();
    store.getState().setMetaSettingsAudio({ enabled: false, url: "https://x.test/a.mp3", volume: 0.4 });
    renderTree(<AudioGlobalSettingsPopup open onClose={() => {}} onBack={() => {}} store={store} />);

    const url = container.querySelector<HTMLInputElement>("#nodal-global-audio-url");
    const vol = container.querySelector<HTMLInputElement>("#nodal-global-audio-vol");
    expect(url?.value).toBe("https://x.test/a.mp3");
    expect(url?.disabled).toBe(true);
    expect(vol?.disabled).toBe(true);
  });

  it("toggle enabled met à jour le store + flush DOM", () => {
    const store = createNodalProjectStore();
    const flush = vi.fn();
    vi.stubGlobal("EditorSharedBundle", { flushNodalStoreToEditorDom: flush });
    renderTree(<AudioGlobalSettingsPopup open onClose={() => {}} onBack={() => {}} store={store} />);

    const cb = container.querySelector<HTMLInputElement>('input[type="checkbox"]');
    expect(cb).toBeTruthy();
    act(() => {
      cb!.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    expect(store.getState().meta.settings?.audio?.enabled).toBe(true);
    expect(flush).toHaveBeenCalled();
  });

  it("clic Retour appelle onBack", () => {
    const store = createNodalProjectStore();
    const onBack = vi.fn();
    const onClose = vi.fn();
    renderTree(<AudioGlobalSettingsPopup open onClose={onClose} onBack={onBack} store={store} />);
    const back = Array.from(container.querySelectorAll("button")).find((b) => (b.textContent || "").includes("Retour"));
    expect(back).toBeTruthy();
    act(() => {
      back!.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    expect(onBack).toHaveBeenCalledTimes(1);
    expect(onClose).toHaveBeenCalledTimes(0);
  });
});

describe("C10.2.d — audio serialize/hydrate", () => {
  it("round-trip meta.settings.audio", () => {
    const store = createNodalProjectStore();
    store.getState().setMetaSettingsAudio({ enabled: true, url: "https://x.test/a.mp3", volume: 0.75 });
    const json = serializeToProjectJson(store.getState());
    expect(json.meta?.settings?.audio).toEqual({ enabled: true, url: "https://x.test/a.mp3", volume: 0.75 });
    const hydrated = deserializeFromProjectJson(json);
    expect(hydrated.meta.settings?.audio).toEqual(json.meta?.settings?.audio);
  });
});

describe("C10.2.d — applyFromStore flush vers DOM legacy", () => {
  it("projette audio vers #useGlobalAudio/#globalAudioUrl/#globalAudioVol + déclenche change/input", async () => {
    document.body.innerHTML = `
      <div id="scenes-container"></div>
      <input id="useGlobalAudio" type="checkbox" />
      <div id="audio-settings-container" style="display:none"></div>
      <input id="globalAudioUrl" type="text" />
      <input id="globalAudioVol" type="range" />
      <span id="globalAudioVolVal">0.50</span>
    `;
    const use = document.getElementById("useGlobalAudio") as HTMLInputElement;
    const audioContainer = document.getElementById("audio-settings-container") as HTMLDivElement;
    use.addEventListener("change", () => {
      audioContainer.style.display = use.checked ? "flex" : "none";
    });
    const vol = document.getElementById("globalAudioVol") as HTMLInputElement;
    const volVal = document.getElementById("globalAudioVolVal") as HTMLSpanElement;
    vol.addEventListener("input", () => {
      volVal.textContent = Number(vol.value).toFixed(2);
    });

    (window as Window & { __escape360EditorDomApi?: unknown }).__escape360EditorDomApi = {
      addScene: () => 1,
      addHotspot: () => 1,
      EditorCore: {},
      actionV2ToLegacyHotspotData: () => ({}),
      refreshAllSceneTargetSelects: () => {},
      initAllSceneIdStableFields: () => {},
      resyncSceneIdCounterFromDom: () => {},
    };
    await import("../../../../js/editor-shared-nodal-to-dom.js");
    const api = (window as Window & { EditorSharedNodalToDom?: { applyFromStore: (storeApi: unknown) => unknown } })
      .EditorSharedNodalToDom;
    expect(api).toBeTruthy();

    api!.applyFromStore({
      getState: () => ({
        meta: { title: "X", settings: { audio: { enabled: true, url: "https://x.test/a.mp3", volume: 0.7 } } },
        scenes: {},
        actions: {},
        satellites: {},
        media: {},
        edges: [],
        layout: {},
      }),
    });

    expect(use.checked).toBe(true);
    expect(audioContainer.style.display).toBe("flex");
    expect((document.getElementById("globalAudioUrl") as HTMLInputElement).value).toBe("https://x.test/a.mp3");
    expect(vol.value).toBe("0.7");
    expect(volVal.textContent).toBe("0.70");
  });
});

