/** @vitest-environment jsdom */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, type ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";

import { asEdgeId, asMediaNodeId, asSceneNodeId } from "../model/ids";
import type { MediaNode, SceneNode } from "../model/nodes";
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

describe("c19_2_audio_bar_navigation_ambient_transition", () => {
  it("changement de scène → nouvelle URL ambiance", () => {
    const store = createNodalProjectStore();
    const sceneA: SceneNode = {
      id: asSceneNodeId("scn-nav-a"),
      nodeType: "scene",
      sceneId: "na",
      label: "A",
      panoramaUrl: "https://example.com/a.jpg",
    };
    const sceneB: SceneNode = {
      id: asSceneNodeId("scn-nav-b"),
      nodeType: "scene",
      sceneId: "nb",
      label: "B",
      panoramaUrl: "https://example.com/b.jpg",
    };
    const mA: MediaNode = {
      id: asMediaNodeId("med-nav-a"),
      nodeType: "media",
      mediaType: "media-audio",
      label: "a",
      data: { url: "https://example.com/amb-a.mp3", volume: 1 },
    };
    const mB: MediaNode = {
      id: asMediaNodeId("med-nav-b"),
      nodeType: "media",
      mediaType: "media-audio",
      label: "b",
      data: { url: "https://example.com/amb-b.mp3", volume: 1 },
    };
    store.getState().addScene(sceneA, { x: 0, y: 0 });
    store.getState().addScene(sceneB, { x: 0, y: 0 });
    store.getState().addMedia(mA, { x: 0, y: 0 });
    store.getState().addMedia(mB, { x: 0, y: 0 });
    store.getState().connect({ id: asEdgeId("ma"), family: "meta", sourceId: sceneA.id, targetId: mA.id });
    store.getState().connect({ id: asEdgeId("mb"), family: "meta", sourceId: sceneB.id, targetId: mB.id });

    const wrap = (sid: typeof sceneA.id) => (
      <NodalUiContext.Provider value={mockNodalUi(store)}>
        <ScenePreviewModal sceneId={sid} onClose={() => {}} />
      </NodalUiContext.Provider>
    );

    renderTree(wrap(sceneA.id));
    expect(getAudioChannelsService().getState("ambient").currentSrc).toContain("amb-a");

    act(() => {
      root.render(wrap(sceneB.id));
    });
    expect(getAudioChannelsService().getState("ambient").currentSrc).toContain("amb-b");
  });
});
