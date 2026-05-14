/** @vitest-environment jsdom */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, type ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";

import { asActionNodeId, asEdgeId, asSceneNodeId } from "../model/ids";
import type { GotoActionNode, SceneNode } from "../model/nodes";
import { resolveGotoTargetSceneId } from "../model/resolveGotoTargetSceneId";
import { createNodalProjectStore } from "../store/nodalProjectStore";
import { resetAudioChannelsServiceForTests } from "../services/audioChannelsService";
import type { NodalUiContextValue } from "../view/nodalUiContext";
import { NodalUiContext } from "../view/nodalUiContext";
import { ScenePreviewModal } from "../view/popups/ScenePreviewModal";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

if (typeof (globalThis as { PointerEvent?: unknown }).PointerEvent === "undefined") {
  (globalThis as unknown as { PointerEvent: typeof MouseEvent }).PointerEvent = MouseEvent;
}

let container: HTMLDivElement;
let root: Root;

function mockNodalUi(
  store: ReturnType<typeof createNodalProjectStore>,
  overrides: Partial<NodalUiContextValue> = {}
): NodalUiContextValue {
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
    ...overrides,
  };
}

function renderTree(node: ReactNode) {
  act(() => {
    root.render(node);
  });
}

function injectHotspotEl(body: HTMLElement, sceneId: string, index: number): HTMLDivElement {
  const safeScene = String(sceneId).replace(/[^a-zA-Z0-9_-]/g, "_");
  const cssClass = `prev-hs-${safeScene}-${index}`;
  const el = document.createElement("div");
  el.className = cssClass;
  body.appendChild(el);
  return el;
}

const VIS = { requiresItem: "", hiddenIfHasItem: "", clickWhenInvisible: true as const };
const SFX = { url: "", volume: 1 };

beforeEach(() => {
  document.documentElement.lang = "fr";
  document.body.innerHTML = "";
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  (window as unknown as { pannellum: { viewer: ReturnType<typeof vi.fn> } }).pannellum = {
    viewer: vi.fn((_el: HTMLElement, _cfg: Record<string, unknown>) => ({
      destroy: vi.fn(),
      on: vi.fn(),
      mouseEventToCoords: vi.fn((ev: MouseEvent) => {
        return [ev.clientX / 10, ev.clientY / 10] as [number, number];
      }),
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

describe("c19_2_fix_goto_navigation", () => {
  it("resolveGotoTargetSceneId retourne la scène cible unique", () => {
    const store = createNodalProjectStore();
    const sceneA: SceneNode = {
      id: asSceneNodeId("scn-a"),
      nodeType: "scene",
      sceneId: "a",
      label: "A",
      panoramaUrl: "https://example.com/a.jpg",
    };
    const sceneB: SceneNode = {
      id: asSceneNodeId("scn-b"),
      nodeType: "scene",
      sceneId: "b",
      label: "B",
      panoramaUrl: "https://example.com/b.jpg",
    };
    const goto: GotoActionNode = {
      id: asActionNodeId("act-goto"),
      nodeType: "action",
      actionType: "goto",
      label: "Go",
      payload: {
        target: "b",
        copy: { bodyHtml: "<p>x</p>", buttonLabel: "Partir" },
      },
      sfx: SFX,
      visibility: VIS,
    };
    store.getState().addScene(sceneA, { x: 0, y: 0 });
    store.getState().addScene(sceneB, { x: 200, y: 0 });
    store.getState().addAction(goto, { x: 80, y: 80 });
    store.getState().connect({
      id: asEdgeId("flow-a-goto"),
      family: "flow",
      sourceId: sceneA.id,
      targetId: goto.id,
    });
    store.getState().connect({
      id: asEdgeId("tr-goto-b"),
      family: "transition",
      sourceId: goto.id,
      targetId: sceneB.id,
    });
    expect(resolveGotoTargetSceneId(store.getState(), goto.id)).toBe(sceneB.id);
  });

  it("resolveGotoTargetSceneId null si plusieurs cibles scène", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const store = createNodalProjectStore();
    const sceneA: SceneNode = {
      id: asSceneNodeId("scn-a2"),
      nodeType: "scene",
      sceneId: "a2",
      label: "A",
      panoramaUrl: "https://example.com/a.jpg",
    };
    const sceneB: SceneNode = {
      id: asSceneNodeId("scn-b2"),
      nodeType: "scene",
      sceneId: "b2",
      label: "B",
      panoramaUrl: "https://example.com/b.jpg",
    };
    const sceneC: SceneNode = {
      id: asSceneNodeId("scn-c2"),
      nodeType: "scene",
      sceneId: "c2",
      label: "C",
      panoramaUrl: "https://example.com/c.jpg",
    };
    const goto: GotoActionNode = {
      id: asActionNodeId("act-goto2"),
      nodeType: "action",
      actionType: "goto",
      label: "Go",
      payload: {
        target: "x",
        copy: { bodyHtml: "<p>x</p>", buttonLabel: "Partir" },
      },
      sfx: SFX,
      visibility: VIS,
    };
    store.getState().addScene(sceneA, { x: 0, y: 0 });
    store.getState().addScene(sceneB, { x: 200, y: 0 });
    store.getState().addScene(sceneC, { x: 400, y: 0 });
    store.getState().addAction(goto, { x: 80, y: 80 });
    store.getState().connect({
      id: asEdgeId("tr1"),
      family: "transition",
      sourceId: goto.id,
      targetId: sceneB.id,
    });
    store.getState().connect({
      id: asEdgeId("tr2"),
      family: "transition",
      sourceId: goto.id,
      targetId: sceneC.id,
    });
    expect(resolveGotoTargetSceneId(store.getState(), goto.id)).toBeNull();
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });

  it("confirm goto appelle onNavigateToScene avec la scène cible", () => {
    const store = createNodalProjectStore();
    const sceneA: SceneNode = {
      id: asSceneNodeId("scn-a3"),
      nodeType: "scene",
      sceneId: "a3",
      label: "A",
      panoramaUrl: "https://example.com/a.jpg",
    };
    const sceneB: SceneNode = {
      id: asSceneNodeId("scn-b3"),
      nodeType: "scene",
      sceneId: "b3",
      label: "B",
      panoramaUrl: "https://example.com/b.jpg",
    };
    const goto: GotoActionNode = {
      id: asActionNodeId("act-goto3"),
      nodeType: "action",
      actionType: "goto",
      label: "Go",
      payload: {
        target: "b3",
        copy: { bodyHtml: "<p>go</p>", buttonLabel: "Partir" },
      },
      sfx: SFX,
      visibility: VIS,
    };
    store.getState().addScene(sceneA, { x: 0, y: 0 });
    store.getState().addScene(sceneB, { x: 200, y: 0 });
    store.getState().addAction(goto, { x: 80, y: 80 });
    store.getState().connect({
      id: asEdgeId("flow-a3-goto"),
      family: "flow",
      sourceId: sceneA.id,
      targetId: goto.id,
    });
    store.getState().connect({
      id: asEdgeId("tr-goto-b3"),
      family: "transition",
      sourceId: goto.id,
      targetId: sceneB.id,
    });

    const onNavigateToScene = vi.fn();
    renderTree(
      <NodalUiContext.Provider value={mockNodalUi(store)}>
        <ScenePreviewModal
          sceneId={sceneA.id}
          onClose={() => {}}
          onNavigateToScene={onNavigateToScene}
        />
      </NodalUiContext.Provider>
    );

    const body = container.querySelector(".nodal-scene-preview-modal__body") as HTMLDivElement;
    const hsEl = injectHotspotEl(body, sceneA.id, 0);
    act(() => {
      hsEl.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, clientX: 10, clientY: 10 }));
    });
    const overlay = document.querySelector(".nodal-player-preview-overlay") as HTMLDivElement;
    const goBtn = Array.from(overlay.querySelectorAll("button")).find((b) => b.textContent?.trim() === "Partir");
    expect(goBtn).toBeTruthy();
    act(() => {
      goBtn!.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    expect(onNavigateToScene).toHaveBeenCalledWith(sceneB.id);
    expect(document.querySelector(".nodal-player-preview-overlay")).toBeFalsy();
  });
});
