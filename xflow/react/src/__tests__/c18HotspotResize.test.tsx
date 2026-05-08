/** @vitest-environment jsdom */
/**
 * C18.4 — sélection + resize des hotspots via 4 handles aux coins dans
 * l'aperçu scène (mode édition). Ancrage au centre, Shift = ratio fixe,
 * bornes 16-800 px, Échap = annule sans commit.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, type ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";

import { asActionNodeId, asEdgeId, asSceneNodeId } from "../model/ids";
import {
  buildCustomCssFromAppearance,
  DEFAULT_HOTSPOT_APPEARANCE,
  mergeHotspotAppearance,
} from "../model/hotspotAppearance";
import type { ActionNode, CoordsOptionsSatelliteNode, SceneNode } from "../model/nodes";
import { createNodalProjectStore } from "../store/nodalProjectStore";
import type { NodalUiContextValue } from "../view/nodalUiContext";
import { NodalUiContext } from "../view/nodalUiContext";
import { ScenePreviewModal } from "../view/popups/ScenePreviewModal";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

if (typeof (globalThis as { PointerEvent?: unknown }).PointerEvent === "undefined") {
  (globalThis as unknown as { PointerEvent: typeof MouseEvent }).PointerEvent = MouseEvent;
}

let container: HTMLDivElement;
let root: Root;
const rafCallbacks: FrameRequestCallback[] = [];

/** Mock contrôlable de `requestAnimationFrame` — un appel à `flushRaf()` exécute UNE callback. */
function flushRaf(times = 1) {
  for (let i = 0; i < times; i++) {
    const cb = rafCallbacks.shift();
    if (!cb) break;
    act(() => {
      cb(performance.now());
    });
  }
}

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

/** Fixture : 1 scène + 1 action + 1 satellite coords-options aux dimensions par défaut (120×120). */
function setupSceneWithOneHotspot() {
  const store = createNodalProjectStore();
  const scene: SceneNode = {
    id: asSceneNodeId("scn-resize"),
    nodeType: "scene",
    sceneId: "resize",
    label: "Scène",
    panoramaUrl: "https://example.com/p.jpg",
  };
  const action: ActionNode = {
    id: asActionNodeId("act-resize"),
    nodeType: "action",
    actionType: "msg",
    label: "HS A",
    payload: { copy: { bodyHtml: "x", buttonLabel: "OK" } },
    sfx: { url: "", volume: 1 },
    visibility: { requiresItem: "", hiddenIfHasItem: "", clickWhenInvisible: true },
  };
  store.getState().addScene(scene, { x: 0, y: 0 });
  store.getState().addAction(action, { x: 80, y: 80 });
  store.getState().connect({
    id: asEdgeId("flow-resize"),
    family: "flow",
    sourceId: scene.id,
    targetId: action.id,
  });
  const sat = Object.values(store.getState().satellites).find(
    (s) => s.satelliteType === "coords-options"
  ) as CoordsOptionsSatelliteNode | undefined;
  if (!sat) throw new Error("coords-options satellite manquant");
  const baseApp = mergeHotspotAppearance({ ...DEFAULT_HOTSPOT_APPEARANCE });
  store.getState().updateNodeData(sat.id, {
    data: {
      ...sat.data,
      pitch: 0,
      yaw: 0,
      appearance: baseApp,
      customCss: buildCustomCssFromAppearance(baseApp),
    },
  } as never);
  return { store, scene, action, sat };
}

const HOTSPOT_RECT = { left: 100, top: 100, width: 60, height: 80 };

beforeEach(() => {
  document.documentElement.lang = "fr";
  document.body.innerHTML = "";
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);

  rafCallbacks.length = 0;
  vi.spyOn(window, "requestAnimationFrame").mockImplementation((cb) => {
    rafCallbacks.push(cb);
    return rafCallbacks.length;
  });
  vi.spyOn(window, "cancelAnimationFrame").mockImplementation(() => {
    /* no-op */
  });

  // Mock par-élément du `getBoundingClientRect` : les hotspots simulés (classe
  // `prev-hs-*`) renvoient un rect contrôlé pour permettre le calcul du centre.
  vi.spyOn(Element.prototype, "getBoundingClientRect").mockImplementation(function (
    this: Element
  ) {
    const cls = this.getAttribute && this.getAttribute("class");
    if (cls && /\bprev-hs-/.test(cls)) {
      return new DOMRect(HOTSPOT_RECT.left, HOTSPOT_RECT.top, HOTSPOT_RECT.width, HOTSPOT_RECT.height);
    }
    return new DOMRect(0, 0, 0, 0);
  });

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
  document.body.innerHTML = "";
  vi.restoreAllMocks();
  delete (window as unknown as { pannellum?: unknown }).pannellum;
});

/** Helper : bascule en mode édition, ajoute un faux DOM hotspot, simule un clic court (sélection). */
function selectHotspot(scene: { id: ReturnType<typeof asSceneNodeId> }) {
  const editToggle = container.querySelector(
    ".nodal-scene-preview-modal__edit-toggle"
  ) as HTMLButtonElement;
  act(() => {
    editToggle.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  });

  const body = container.querySelector(".nodal-scene-preview-modal__body") as HTMLDivElement;
  const hsClass = `prev-hs-${String(scene.id).replace(/[^a-zA-Z0-9_-]/g, "_")}-0`;
  const hsEl = document.createElement("div");
  hsEl.className = hsClass;
  body.appendChild(hsEl);

  // Pointerdown puis pointerup au même endroit → seuil non franchi → sélection.
  act(() => {
    hsEl.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, clientX: 130, clientY: 140 }));
  });
  act(() => {
    document.dispatchEvent(new PointerEvent("pointerup", { bubbles: true, clientX: 131, clientY: 141 }));
  });

  return { hsEl, hsClass, body };
}

describe("C18.4 — sélection au clic simple", () => {
  it("clic simple sur hotspot en mode édition → handles aux 4 coins rendus", () => {
    const { store, scene } = setupSceneWithOneHotspot();
    renderTree(
      <NodalUiContext.Provider value={mockNodalUi(store)}>
        <ScenePreviewModal sceneId={scene.id} onClose={() => {}} />
      </NodalUiContext.Provider>
    );

    selectHotspot(scene);

    flushRaf(); // une frame rAF → handles lisent le rect du hotspot
    const handles = container.querySelectorAll(".nodal-hotspot-handle");
    expect(handles.length).toBe(4);
    const corners = Array.from(handles).map((h) => h.getAttribute("data-corner"));
    expect(corners.sort()).toEqual(["ne", "nw", "se", "sw"]);
    expect(container.querySelector(".nodal-scene-preview-modal")?.getAttribute("data-selection")).toBe(
      "1"
    );
  });

  it("clic en dehors d'un hotspot et hors handle → désélectionne", () => {
    const { store, scene } = setupSceneWithOneHotspot();
    renderTree(
      <NodalUiContext.Provider value={mockNodalUi(store)}>
        <ScenePreviewModal sceneId={scene.id} onClose={() => {}} />
      </NodalUiContext.Provider>
    );

    selectHotspot(scene);
    flushRaf();
    expect(container.querySelectorAll(".nodal-hotspot-handle").length).toBe(4);

    // Pointerdown ailleurs (sur le body, pas sur un hotspot, pas sur un handle)
    const body = container.querySelector(".nodal-scene-preview-modal__body") as HTMLDivElement;
    act(() => {
      body.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, clientX: 5, clientY: 5 }));
    });

    expect(container.querySelector(".nodal-scene-preview-modal")?.getAttribute("data-selection")).toBe(
      "0"
    );
    expect(container.querySelectorAll(".nodal-hotspot-handle").length).toBe(0);
  });

  it("bascule du toggle vers off → sélection et resize réinitialisés", () => {
    const { store, scene } = setupSceneWithOneHotspot();
    renderTree(
      <NodalUiContext.Provider value={mockNodalUi(store)}>
        <ScenePreviewModal sceneId={scene.id} onClose={() => {}} />
      </NodalUiContext.Provider>
    );

    selectHotspot(scene);
    flushRaf();
    expect(container.querySelectorAll(".nodal-hotspot-handle").length).toBe(4);

    const editToggle = container.querySelector(
      ".nodal-scene-preview-modal__edit-toggle"
    ) as HTMLButtonElement;
    act(() => {
      editToggle.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(container.querySelector(".nodal-scene-preview-modal")?.getAttribute("data-edit-mode")).toBe(
      "0"
    );
    expect(container.querySelector(".nodal-scene-preview-modal")?.getAttribute("data-selection")).toBe(
      "0"
    );
    expect(container.querySelectorAll(".nodal-hotspot-handle").length).toBe(0);
  });
});

describe("C18.4 — resize via handles", () => {
  it("pointerdown sur handle « se » + pointermove → override CSS contient nouveau width / height (ancré au centre)", () => {
    const { store, scene } = setupSceneWithOneHotspot();
    renderTree(
      <NodalUiContext.Provider value={mockNodalUi(store)}>
        <ScenePreviewModal sceneId={scene.id} onClose={() => {}} />
      </NodalUiContext.Provider>
    );

    selectHotspot(scene);
    flushRaf();

    const handleSe = container.querySelector(
      ".nodal-hotspot-handle--se"
    ) as HTMLDivElement;
    expect(handleSe).toBeTruthy();

    // Centre du hotspot mock = (100 + 60/2, 100 + 80/2) = (130, 140).
    // Pointermove à (250, 240) → dx=120, dy=100 → newW=240, newH=200.
    act(() => {
      handleSe.dispatchEvent(
        new PointerEvent("pointerdown", { bubbles: true, clientX: 160, clientY: 180 })
      );
    });
    act(() => {
      document.dispatchEvent(
        new PointerEvent("pointermove", { bubbles: true, clientX: 250, clientY: 240 })
      );
    });

    const overrideStyle = container.querySelector('style[id^="nodal-scene-preview-hs-resize-"]');
    expect(overrideStyle).toBeTruthy();
    const cssText = overrideStyle!.textContent ?? "";
    expect(cssText).toMatch(/width:\s*240px/);
    expect(cssText).toMatch(/height:\s*200px/);
  });

  it("Shift maintenu pendant le resize → ratio préservé (échelle dominante appliquée aux 2 dimensions)", () => {
    const { store, scene } = setupSceneWithOneHotspot();
    renderTree(
      <NodalUiContext.Provider value={mockNodalUi(store)}>
        <ScenePreviewModal sceneId={scene.id} onClose={() => {}} />
      </NodalUiContext.Provider>
    );

    selectHotspot(scene);
    flushRaf();

    const handleSe = container.querySelector(".nodal-hotspot-handle--se") as HTMLDivElement;
    // Initial 120×120 (DEFAULT). Shift + déplacement asymétrique : dx=120 → newW=240 (scale 2x),
    // dy=30 → newH=60 (scale 0.5x). Dominant = 2x → newW=240, newH=240 (ratio 1:1 préservé).
    act(() => {
      handleSe.dispatchEvent(
        new PointerEvent("pointerdown", { bubbles: true, clientX: 160, clientY: 180 })
      );
    });
    act(() => {
      document.dispatchEvent(
        new PointerEvent("pointermove", {
          bubbles: true,
          clientX: 250,
          clientY: 170,
          shiftKey: true,
        })
      );
    });

    const overrideStyle = container.querySelector('style[id^="nodal-scene-preview-hs-resize-"]');
    const cssText = overrideStyle!.textContent ?? "";
    expect(cssText).toMatch(/width:\s*240px/);
    expect(cssText).toMatch(/height:\s*240px/);
  });

  it("pointerup → updateNodeData appelé avec appearance.ui_w / ui_h mis à jour + customCss régénéré", () => {
    const { store, scene, sat } = setupSceneWithOneHotspot();
    renderTree(
      <NodalUiContext.Provider value={mockNodalUi(store)}>
        <ScenePreviewModal sceneId={scene.id} onClose={() => {}} />
      </NodalUiContext.Provider>
    );

    selectHotspot(scene);
    flushRaf();

    const handleSe = container.querySelector(".nodal-hotspot-handle--se") as HTMLDivElement;
    act(() => {
      handleSe.dispatchEvent(
        new PointerEvent("pointerdown", { bubbles: true, clientX: 160, clientY: 180 })
      );
    });
    act(() => {
      document.dispatchEvent(
        new PointerEvent("pointermove", { bubbles: true, clientX: 250, clientY: 240 })
      );
    });
    act(() => {
      document.dispatchEvent(
        new PointerEvent("pointerup", { bubbles: true, clientX: 250, clientY: 240 })
      );
    });

    const updated = store.getState().satellites[sat.id] as CoordsOptionsSatelliteNode;
    expect(updated.data.appearance?.ui_w).toBe(240);
    expect(updated.data.appearance?.ui_h).toBe(200);
    expect(updated.data.customCss ?? "").toMatch(/width:\s*240px/);
    expect(updated.data.customCss ?? "").toMatch(/height:\s*200px/);
    // resize est terminé — l'override style a disparu.
    expect(
      container.querySelector('style[id^="nodal-scene-preview-hs-resize-"]')
    ).toBeFalsy();
  });

  it("C18.4-fix.3 — commit pointerup ne recrée pas le viewer Pannellum (signature pitch/yaw/cssClass stable)", () => {
    const { store, scene } = setupSceneWithOneHotspot();
    renderTree(
      <NodalUiContext.Provider value={mockNodalUi(store)}>
        <ScenePreviewModal sceneId={scene.id} onClose={() => {}} />
      </NodalUiContext.Provider>
    );

    selectHotspot(scene);
    flushRaf();

    const viewerMock = (window as unknown as { pannellum: { viewer: ReturnType<typeof vi.fn> } })
      .pannellum.viewer;
    const callsBeforeResize = viewerMock.mock.calls.length;

    const handleSe = container.querySelector(".nodal-hotspot-handle--se") as HTMLDivElement;
    act(() => {
      handleSe.dispatchEvent(
        new PointerEvent("pointerdown", { bubbles: true, clientX: 160, clientY: 180 })
      );
    });
    act(() => {
      document.dispatchEvent(
        new PointerEvent("pointermove", { bubbles: true, clientX: 250, clientY: 240 })
      );
    });
    act(() => {
      document.dispatchEvent(
        new PointerEvent("pointerup", { bubbles: true, clientX: 250, clientY: 240 })
      );
    });

    // Le pointerup régénère customCss via updateNodeData, mais pitch/yaw/cssClass
    // restent identiques → la signature ne change pas → pas de re-création du viewer.
    expect(viewerMock.mock.calls.length).toBe(callsBeforeResize);
  });

  it("C18.4-fix.3 — forceHotSpotsRecompute skippe quand le renderer est null (viewer en cours de destruction)", () => {
    const setUpdateSpy = vi.fn();
    const getRendererSpy = vi.fn().mockReturnValue(null);
    (window as unknown as { pannellum: { viewer: ReturnType<typeof vi.fn> } }).pannellum.viewer =
      vi.fn(() => ({
        destroy: vi.fn(),
        on: vi.fn(),
        mouseEventToCoords: vi.fn(() => [0, 0] as [number, number]),
        setUpdate: setUpdateSpy,
        getRenderer: getRendererSpy,
      }));

    const { store, scene } = setupSceneWithOneHotspot();
    renderTree(
      <NodalUiContext.Provider value={mockNodalUi(store)}>
        <ScenePreviewModal sceneId={scene.id} onClose={() => {}} />
      </NodalUiContext.Provider>
    );

    selectHotspot(scene);
    flushRaf();

    const handleSe = container.querySelector(".nodal-hotspot-handle--se") as HTMLDivElement;
    act(() => {
      handleSe.dispatchEvent(
        new PointerEvent("pointerdown", { bubbles: true, clientX: 160, clientY: 180 })
      );
    });
    act(() => {
      document.dispatchEvent(
        new PointerEvent("pointermove", { bubbles: true, clientX: 250, clientY: 240 })
      );
    });

    // Renderer null → setUpdate ne doit jamais être appelé pendant le resize.
    expect(getRendererSpy).toHaveBeenCalled();
    expect(setUpdateSpy).not.toHaveBeenCalled();
  });

  it("Échap pendant un resize → annule sans commit (taille initiale restaurée)", () => {
    const { store, scene, sat } = setupSceneWithOneHotspot();
    renderTree(
      <NodalUiContext.Provider value={mockNodalUi(store)}>
        <ScenePreviewModal sceneId={scene.id} onClose={() => {}} />
      </NodalUiContext.Provider>
    );

    selectHotspot(scene);
    flushRaf();

    const handleSe = container.querySelector(".nodal-hotspot-handle--se") as HTMLDivElement;
    act(() => {
      handleSe.dispatchEvent(
        new PointerEvent("pointerdown", { bubbles: true, clientX: 160, clientY: 180 })
      );
    });
    act(() => {
      document.dispatchEvent(
        new PointerEvent("pointermove", { bubbles: true, clientX: 250, clientY: 240 })
      );
    });

    expect(container.querySelector('style[id^="nodal-scene-preview-hs-resize-"]')).toBeTruthy();

    act(() => {
      document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
    });

    // Pas d'override → resize annulé. Le satellite n'a pas été mis à jour : ui_w / ui_h restent à 120.
    expect(container.querySelector('style[id^="nodal-scene-preview-hs-resize-"]')).toBeFalsy();
    const after = store.getState().satellites[sat.id] as CoordsOptionsSatelliteNode;
    expect(after.data.appearance?.ui_w).toBe(120);
    expect(after.data.appearance?.ui_h).toBe(120);
  });
});
