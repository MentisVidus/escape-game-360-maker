/** @vitest-environment jsdom */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, type ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";

import { deserializeFromProjectJson } from "../serialize/fromProjectJson";
import { serializeToProjectJson } from "../serialize/toProjectJson";
import { createNodalProjectStore } from "../store/nodalProjectStore";
import { TimerAndSavePlayerSettingsPopup } from "../view/popups/TimerAndSavePlayerSettingsPopup";

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

describe("C10.2.e — TimerAndSavePlayerSettingsPopup", () => {
  it("timer visible mais champs disabled quand enabled=false", () => {
    const store = createNodalProjectStore();
    store.getState().setMetaSettingsTimer({
      enabled: false,
      mode: "countup",
      startSeconds: 123,
      autoStart: false,
      pauseWhenPopupOpen: true,
    });
    renderTree(<TimerAndSavePlayerSettingsPopup open onClose={() => {}} onBack={() => {}} store={store} />);
    expect(container.querySelector<HTMLSelectElement>("#nodal-timer-mode")?.disabled).toBe(true);
    expect(container.querySelector<HTMLInputElement>("#nodal-timer-start-seconds")?.disabled).toBe(true);
    const checks = container.querySelectorAll<HTMLInputElement>('input[type="checkbox"]');
    expect(checks.length >= 3).toBe(true);
    expect(checks[1]?.disabled).toBe(true);
    expect(checks[2]?.disabled).toBe(true);
  });

  it("binding store : mode + startSeconds clamp + playerSave mode", () => {
    const store = createNodalProjectStore();
    const flush = vi.fn();
    vi.stubGlobal("EditorSharedBundle", { flushNodalStoreToEditorDom: flush });
    renderTree(<TimerAndSavePlayerSettingsPopup open onClose={() => {}} onBack={() => {}} store={store} />);

    const timerToggle = container.querySelector<HTMLInputElement>('input[type="checkbox"]');
    act(() => {
      timerToggle!.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    expect(store.getState().meta.settings?.timer?.enabled).toBe(true);

    const startSeconds = container.querySelector<HTMLInputElement>("#nodal-timer-start-seconds");
    act(() => {
      const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value")?.set;
      setter?.call(startSeconds!, "-10");
      startSeconds!.dispatchEvent(new Event("input", { bubbles: true }));
      startSeconds!.dispatchEvent(new Event("change", { bubbles: true }));
    });
    expect(store.getState().meta.settings?.timer?.startSeconds).toBe(0);

    const modeSelect = container.querySelector<HTMLSelectElement>("#nodal-timer-mode");
    act(() => {
      modeSelect!.value = "countup";
      modeSelect!.dispatchEvent(new Event("change", { bubbles: true }));
    });
    expect(store.getState().meta.settings?.timer?.mode).toBe("countup");

    const saveMode = container.querySelector<HTMLSelectElement>("#nodal-player-save-mode");
    act(() => {
      saveMode!.value = "auto";
      saveMode!.dispatchEvent(new Event("change", { bubbles: true }));
    });
    expect(store.getState().meta.settings?.playerSave?.mode).toBe("auto");
    expect(flush).toHaveBeenCalled();
  });
});

describe("C10.2.e — timer/playerSave serialize/hydrate", () => {
  it("round-trip meta.settings.timer + meta.settings.playerSave", () => {
    const store = createNodalProjectStore();
    store.getState().setMetaSettingsTimer({
      enabled: true,
      mode: "countup",
      startSeconds: 42,
      autoStart: false,
      pauseWhenPopupOpen: true,
    });
    store.getState().setMetaSettingsPlayerSave({ mode: "auto" });
    const json = serializeToProjectJson(store.getState());
    expect(json.meta?.settings?.timer).toEqual({
      enabled: true,
      mode: "countup",
      startSeconds: 42,
      autoStart: false,
      pauseWhenPopupOpen: true,
    });
    expect(json.meta?.settings?.playerSave).toEqual({ mode: "auto" });
    const hydrated = deserializeFromProjectJson(json);
    expect(hydrated.meta.settings?.timer).toEqual(json.meta?.settings?.timer);
    expect(hydrated.meta.settings?.playerSave).toEqual(json.meta?.settings?.playerSave);
  });
});

describe("C10.2.e — applyFromStore flush vers DOM legacy", () => {
  it("projette timer + playerSave vers les 6 ids et déclenche change #useTimer", async () => {
    document.body.innerHTML = `
      <div id="scenes-container"></div>
      <input id="useTimer" type="checkbox" />
      <div id="timer-settings-container" style="display:none"></div>
      <select id="timerMode"><option value="countdown">c</option><option value="countup">u</option></select>
      <input id="timerStartSeconds" type="number" />
      <input id="timerAutoStart" type="checkbox" />
      <input id="timerPauseOnPopup" type="checkbox" />
      <select id="playerSaveMode"><option value="none">n</option><option value="manual">m</option><option value="auto">a</option></select>
    `;
    const useTimer = document.getElementById("useTimer") as HTMLInputElement;
    const timerContainer = document.getElementById("timer-settings-container") as HTMLDivElement;
    useTimer.addEventListener("change", () => {
      timerContainer.style.display = useTimer.checked ? "flex" : "none";
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
        meta: {
          title: "X",
          settings: {
            timer: {
              enabled: true,
              mode: "countup",
              startSeconds: 99,
              autoStart: false,
              pauseWhenPopupOpen: true,
            },
            playerSave: { mode: "auto" },
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

    expect(useTimer.checked).toBe(true);
    expect(timerContainer.style.display).toBe("flex");
    expect((document.getElementById("timerMode") as HTMLSelectElement).value).toBe("countup");
    expect((document.getElementById("timerStartSeconds") as HTMLInputElement).value).toBe("99");
    expect((document.getElementById("timerAutoStart") as HTMLInputElement).checked).toBe(false);
    expect((document.getElementById("timerPauseOnPopup") as HTMLInputElement).checked).toBe(true);
    expect((document.getElementById("playerSaveMode") as HTMLSelectElement).value).toBe("auto");
  });
});

