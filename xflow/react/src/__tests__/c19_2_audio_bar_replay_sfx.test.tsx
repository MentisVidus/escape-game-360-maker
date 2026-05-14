/** @vitest-environment jsdom */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, type ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";

import { asActionNodeId, asEdgeId, asSceneNodeId } from "../model/ids";
import type { MsgActionNode, SceneNode } from "../model/nodes";
import { createNodalProjectStore } from "../store/nodalProjectStore";
import {
  getAudioChannelsService,
  resetAudioChannelsServiceForTests,
} from "../services/audioChannelsService";
import type { NodalUiContextValue } from "../view/nodalUiContext";
import { NodalUiContext } from "../view/nodalUiContext";
import { ScenePreviewModal } from "../view/popups/ScenePreviewModal";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

if (typeof (globalThis as { PointerEvent?: unknown }).PointerEvent === "undefined") {
  (globalThis as unknown as { PointerEvent: typeof MouseEvent }).PointerEvent = MouseEvent;
}

let container: HTMLDivElement;
let root: Root;

const VIS = { requiresItem: "", hiddenIfHasItem: "", clickWhenInvisible: true as const };

function mockNodalUi(store: ReturnType<typeof createNodalProjectStore>): NodalUiContextValue {
  return {
    store,
    objectEditorSatelliteId: null,
    setObjectEditorSatelliteId: vi.fn(),
    coordsEditorSatelliteId: null,
    setCoordsEditorSatelliteId: vi.fn(),
    choiceEditorSatelliteId: null,
    setChoiceEditorSatelliteId: vi.fn(),
    mediaEditorMediaId: null,
    setMediaEditorMediaId: vi.fn(),
    msgEditorActionId: null,
    setMsgEditorActionId: vi.fn(),
    openMsgContentEditor: vi.fn(),
    pickEditorActionId: null,
    setPickEditorActionId: vi.fn(),
    openPickContentEditor: vi.fn(),
    gotoEditorActionId: null,
    setGotoEditorActionId: vi.fn(),
    openGotoContentEditor: vi.fn(),
    reqEditorActionId: null,
    setReqEditorActionId: vi.fn(),
    openReqContentEditor: vi.fn(),
    pwdEditorActionId: null,
    setPwdEditorActionId: vi.fn(),
    openPwdContentEditor: vi.fn(),
    selectorEditorActionId: null,
    setSelectorEditorActionId: vi.fn(),
    openSelectorContentEditor: vi.fn(),
    globalSettingsHubOpen: false,
    setGlobalSettingsHubOpen: vi.fn(),
    popupThemeCustomizationOpen: false,
    setPopupThemeCustomizationOpen: vi.fn(),
    keyboardShortcutsOpen: false,
    setKeyboardShortcutsOpen: vi.fn(),
    publishHubOpen: false,
    setPublishHubOpen: vi.fn(),
    scenePreviewSceneId: null,
    setScenePreviewSceneId: vi.fn(),
    openScenePreview: vi.fn(),
    coordsPickerSatelliteId: null,
    setCoordsPickerSatelliteId: vi.fn(),
    openCoordsPicker: vi.fn(),
  };
}

function renderTree(node: ReactNode) {
  act(() => {
    root.render(node);
  });
}

function injectHotspotEl(body: HTMLElement, sceneId: string, index: number): HTMLDivElement {
  const safeScene = String(sceneId).replace(/[^a-zA-Z0-9_-]/g, "_");
  const el = document.createElement("div");
  el.className = `prev-hs-${safeScene}-${index}`;
  body.appendChild(el);
  return el;
}

beforeEach(() => {
  document.documentElement.lang = "fr";
  document.body.innerHTML = "";
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  vi.spyOn(HTMLAudioElement.prototype, "play").mockResolvedValue(undefined as never);
  (window as unknown as { pannellum: { viewer: ReturnType<typeof vi.fn> } }).pannellum = {
    viewer: vi.fn((_el: HTMLElement, _cfg: Record<string, unknown>) => ({
      destroy: vi.fn(),
      on: vi.fn(),
      mouseEventToCoords: vi.fn((ev: MouseEvent) => [ev.clientX / 10, ev.clientY / 10] as [number, number]),
    })),
  };
});

afterEach(() => {
  act(() => {
    root.render(null);
  });
  resetAudioChannelsServiceForTests();
  document.body.innerHTML = "";
  vi.restoreAllMocks();
  delete (window as unknown as { pannellum?: unknown }).pannellum;
});

describe("c19_2_audio_bar_replay_sfx", () => {
  it("bouton replay → play sfx avec lastSfx", () => {
    const store = createNodalProjectStore();
    const scene: SceneNode = {
      id: asSceneNodeId("scn-rep"),
      nodeType: "scene",
      sceneId: "rep",
      label: "S",
      panoramaUrl: "https://example.com/p.jpg",
    };
    const msg: MsgActionNode = {
      id: asActionNodeId("act-rep"),
      nodeType: "action",
      actionType: "msg",
      label: "M",
      payload: { copy: { bodyHtml: "<p>x</p>", buttonLabel: "OK" } },
      sfx: { url: "https://example.com/rep.mp3", volume: 0.6 },
      visibility: VIS,
    };
    store.getState().addScene(scene, { x: 0, y: 0 });
    store.getState().addAction(msg, { x: 10, y: 10 });
    store.getState().connect({
      id: asEdgeId("f-rep"),
      family: "flow",
      sourceId: scene.id,
      targetId: msg.id,
    });

    renderTree(
      <NodalUiContext.Provider value={mockNodalUi(store)}>
        <ScenePreviewModal sceneId={scene.id} onClose={() => {}} />
      </NodalUiContext.Provider>
    );

    const body = container.querySelector(".nodal-scene-preview-modal__body") as HTMLDivElement;
    act(() => {
      injectHotspotEl(body, scene.id, 0).dispatchEvent(
        new PointerEvent("pointerdown", { bubbles: true, clientX: 10, clientY: 10 })
      );
    });

    act(() => {
      const x = document.querySelector(".nodal-player-preview-overlay button[aria-label='Fermer']");
      (x as HTMLButtonElement)?.click();
    });

    const playSpy = vi.spyOn(getAudioChannelsService(), "play");
    const audioToggle = container.querySelector(".nodal-scene-preview-modal__audio-panel-toggle") as HTMLButtonElement;
    act(() => {
      audioToggle.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    const replay = Array.from(container.querySelectorAll("button")).find((b) =>
      b.textContent?.includes("Rejouer")
    ) as HTMLButtonElement;
    expect(replay).toBeTruthy();
    act(() => {
      replay.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(playSpy).toHaveBeenCalledWith(
      "sfx",
      "https://example.com/rep.mp3",
      expect.objectContaining({ volume: 0.6, nodeId: msg.id })
    );
  });
});
