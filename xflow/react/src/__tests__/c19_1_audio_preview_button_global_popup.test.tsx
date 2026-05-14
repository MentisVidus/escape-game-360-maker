/** @vitest-environment jsdom */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, type ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";

import { createNodalProjectStore } from "../store/nodalProjectStore";
import { AudioGlobalSettingsPopup } from "../view/popups/AudioGlobalSettingsPopup";
import { getAudioChannelsService, resetAudioChannelsServiceForTests } from "../services/audioChannelsService";

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
  resetAudioChannelsServiceForTests();
  document.body.innerHTML = "";
  vi.restoreAllMocks();
});

function renderTree(node: ReactNode) {
  act(() => {
    root.render(node);
  });
}

describe("c19_1_audio_preview_button_global_popup", () => {
  it("clic ▶ déclenche play('global', …) sur le service", () => {
    const store = createNodalProjectStore();
    store.getState().setMetaSettingsAudio({ enabled: true, url: "https://x.test/m.mp3", volume: 0.5 });
    const playSpy = vi.spyOn(HTMLAudioElement.prototype, "play").mockResolvedValue(undefined as never);

    renderTree(<AudioGlobalSettingsPopup open onClose={() => {}} onBack={() => {}} store={store} />);

    const row = container.querySelector(".nodal-url-with-upload");
    const rowButtons = row?.querySelectorAll("button[type='button']");
    const previewBtn = rowButtons && rowButtons.length > 0 ? rowButtons[rowButtons.length - 1] : null;
    expect(previewBtn).toBeTruthy();
    act(() => {
      previewBtn!.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(playSpy).toHaveBeenCalled();
    expect(getAudioChannelsService().getState("global").currentSrc).toContain("m.mp3");
  });
});
