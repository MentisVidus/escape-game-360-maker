/** @vitest-environment jsdom */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, type ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";

import { asActionNodeId, asEdgeId, asMediaNodeId, asSceneNodeId } from "../model/ids";
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
    root.unmount();
  });
  resetAudioChannelsServiceForTests();
  document.body.innerHTML = "";
  vi.restoreAllMocks();
  delete (window as unknown as { pannellum?: unknown }).pannellum;
});

describe("c19_2_audio_bar_auto_play_on_mount", () => {
  it("mount modale → play global + ambient", () => {
    const store = createNodalProjectStore();
    const scene: SceneNode = {
      id: asSceneNodeId("scn-ap"),
      nodeType: "scene",
      sceneId: "ap",
      label: "S",
      panoramaUrl: "https://example.com/p.jpg",
    };
    const media: MediaNode = {
      id: asMediaNodeId("med-amb"),
      nodeType: "media",
      mediaType: "media-audio",
      label: "amb",
      data: { url: "https://example.com/amb.mp3", volume: 0.8 },
    };
    store.getState().addScene(scene, { x: 0, y: 0 });
    store.getState().addMedia(media, { x: 0, y: 0 });
    store.getState().connect({
      id: asEdgeId("meta-s-amb"),
      family: "meta",
      sourceId: scene.id,
      targetId: media.id,
    });
    store.getState().setMetaSettingsAudio({
      enabled: true,
      url: "https://example.com/glob.mp3",
      volume: 0.5,
    });

    const playSpy = vi.spyOn(getAudioChannelsService(), "play");

    renderTree(
      <NodalUiContext.Provider value={mockNodalUi(store)}>
        <ScenePreviewModal sceneId={scene.id} onClose={() => {}} />
      </NodalUiContext.Provider>
    );

    expect(playSpy).toHaveBeenCalledWith(
      "global",
      "https://example.com/glob.mp3",
      expect.objectContaining({ volume: 0.5 })
    );
    expect(playSpy).toHaveBeenCalledWith(
      "ambient",
      "https://example.com/amb.mp3",
      expect.objectContaining({ volume: 0.8 })
    );
  });
});
