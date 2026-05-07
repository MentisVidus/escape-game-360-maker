/** @vitest-environment jsdom */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";

import { createNodalProjectStore } from "../store/nodalProjectStore";
import { MediaUploadButton } from "../view/components/MediaUploadButton";
import { AudioGlobalSettingsPopup } from "../view/popups/AudioGlobalSettingsPopup";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  document.documentElement.lang = "fr";
  document.body.innerHTML = "";
  container = document.createElement("div");
  container.classList.add("nodal-canvas-layout");
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => {
    root.unmount();
  });
  document.body.innerHTML = "";
  vi.unstubAllGlobals();
  delete (window as Window & { __escape360NodalChrome?: unknown }).__escape360NodalChrome;
  delete (window as Window & { EditorSharedBundle?: unknown }).EditorSharedBundle;
});

function render(el: Parameters<typeof root.render>[0]) {
  act(() => {
    root.render(el);
  });
}

describe("C10.5 — MediaUploadButton", () => {
  it("clic → pickLocalBundleMedia → onPicked ; révoque l’ancien blob via EditorSharedBundle", async () => {
    const revoke = vi.fn();
    vi.stubGlobal("EditorSharedBundle", { releaseBundleTrackedBlobUrl: revoke });
    const pick = vi.fn().mockResolvedValue("blob:http://localhost/x");
    vi.stubGlobal("__escape360NodalChrome", { pickLocalBundleMedia: pick });
    const onPicked = vi.fn();

    render(<MediaUploadButton accept="audio/*" currentUrl="blob:http://localhost/old" onPicked={onPicked} />);

    await act(async () => {
      container.querySelector("button")?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(pick).toHaveBeenCalledWith("audio/*");
    expect(revoke).toHaveBeenCalledWith("blob:http://localhost/old");
    expect(onPicked).toHaveBeenCalledWith("blob:http://localhost/x");
  });
});

describe("C10.5 — popup audio globale — wiring upload → store", () => {
  it("bouton upload (enabled) appelle bridge et met à jour meta.settings.audio.url", async () => {
    vi.stubGlobal("EditorSharedBundle", { flushNodalStoreToEditorDom: vi.fn() });
    vi.stubGlobal("__escape360NodalChrome", {
      pickLocalBundleMedia: vi.fn().mockResolvedValue("blob:http://localhost/a.mp3"),
    });
    const store = createNodalProjectStore();
    store.getState().setMetaSettingsAudio({ enabled: true, url: "", volume: 0.5 });

    render(<AudioGlobalSettingsPopup open onClose={() => {}} store={store} />);

    const uploadBtn = Array.from(container.querySelectorAll("button.nodal-media-upload-btn"))[0];
    expect(uploadBtn).toBeTruthy();

    await act(async () => {
      uploadBtn!.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(store.getState().meta.settings?.audio?.url).toBe("blob:http://localhost/a.mp3");
    const inp = container.querySelector<HTMLInputElement>("#nodal-global-audio-url");
    expect(inp?.value).toBe("blob:http://localhost/a.mp3");
  });
});
