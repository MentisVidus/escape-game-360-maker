/** @vitest-environment jsdom */
/**
 * C18.3 — drag direct des hotspots dans l'aperçu scène (modale C18.1 enrichie).
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, type ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";

import { asActionNodeId, asEdgeId, asSceneNodeId } from "../model/ids";
import type { ActionNode, CoordsOptionsSatelliteNode, SceneNode } from "../model/nodes";
import { createNodalProjectStore } from "../store/nodalProjectStore";
import type { NodalUiContextValue } from "../view/nodalUiContext";
import { NodalUiContext } from "../view/nodalUiContext";
import { ScenePreviewModal } from "../view/popups/ScenePreviewModal";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

/** jsdom n'expose pas `PointerEvent` ; on le polyfill via `MouseEvent`. */
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

function setupSceneWithOneHotspot() {
  const store = createNodalProjectStore();
  const scene: SceneNode = {
    id: asSceneNodeId("scn-edit"),
    nodeType: "scene",
    sceneId: "edit",
    label: "Scène",
    panoramaUrl: "https://example.com/p.jpg",
  };
  const action: ActionNode = {
    id: asActionNodeId("act-edit"),
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
    id: asEdgeId("flow-edit"),
    family: "flow",
    sourceId: scene.id,
    targetId: action.id,
  });
  const sat = Object.values(store.getState().satellites).find(
    (s) => s.satelliteType === "coords-options"
  ) as CoordsOptionsSatelliteNode | undefined;
  if (!sat) throw new Error("coords-options satellite manquant");
  store.getState().updateNodeData(sat.id, { data: { ...sat.data, pitch: 0, yaw: 0 } } as never);
  return { store, scene, action, sat };
}

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
        // Convention test : pitch = clientX / 10, yaw = clientY / 10.
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

describe("C18.3 — toggle édition", () => {
  it("affiche un toggle « Éditer les hotspots » dans l'aperçu scène", async () => {
    const { store, scene } = setupSceneWithOneHotspot();
    renderTree(
      <NodalUiContext.Provider value={mockNodalUi(store)}>
        <ScenePreviewModal sceneId={scene.id} onClose={() => {}} />
      </NodalUiContext.Provider>
    );
    const btn = container.querySelector(".nodal-scene-preview-modal__edit-toggle") as HTMLButtonElement | null;
    expect(btn).toBeTruthy();
    expect(btn!.textContent).toMatch(/Éditer/);
    expect(btn!.getAttribute("data-active")).toBe("0");
    act(() => {
      btn!.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    expect(
      container.querySelector(".nodal-scene-preview-modal__edit-toggle")?.getAttribute("data-active")
    ).toBe("1");
  });

  it("affiche le hint en mode édition (sans drag actif)", async () => {
    const { store, scene } = setupSceneWithOneHotspot();
    renderTree(
      <NodalUiContext.Provider value={mockNodalUi(store)}>
        <ScenePreviewModal sceneId={scene.id} onClose={() => {}} />
      </NodalUiContext.Provider>
    );
    const btn = container.querySelector(".nodal-scene-preview-modal__edit-toggle") as HTMLButtonElement;
    act(() => {
      btn.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    expect(container.querySelector(".nodal-scene-preview-modal__edit-hint")?.textContent).toMatch(
      /Glissez/
    );
  });
});

describe("C18.3 — drag direct hotspot", () => {
  it("pointerdown sur un hotspot en mode édition init le fantôme ; pointerup commit pitch/yaw", async () => {
    const { store, scene, sat } = setupSceneWithOneHotspot();
    renderTree(
      <NodalUiContext.Provider value={mockNodalUi(store)}>
        <ScenePreviewModal sceneId={scene.id} onClose={() => {}} />
      </NodalUiContext.Provider>
    );

    const btn = container.querySelector(".nodal-scene-preview-modal__edit-toggle") as HTMLButtonElement;
    act(() => {
      btn.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    // Pannellum n'injecte pas vraiment de divs hotspot dans le mock — on fabrique
    // l'élément avec la classe attendue au sein du body de la modale.
    const body = container.querySelector(".nodal-scene-preview-modal__body") as HTMLDivElement;
    const hsClass = `prev-hs-${String(scene.id).replace(/[^a-zA-Z0-9_-]/g, "_")}-0`;
    const hsEl = document.createElement("div");
    hsEl.className = hsClass;
    body.appendChild(hsEl);

    act(() => {
      hsEl.dispatchEvent(
        new PointerEvent("pointerdown", { bubbles: true, clientX: 200, clientY: 150 })
      );
    });

    // C18.4 — `pointerdown` ouvre désormais un `dragCandidate` (pas un drag actif)
    // tant que le seuil 4 px n'est pas franchi. On émet un `pointermove` significatif
    // pour promouvoir en drag (ghost visible + commit au release).
    act(() => {
      document.dispatchEvent(
        new PointerEvent("pointermove", { bubbles: true, clientX: 350, clientY: 220 })
      );
    });

    expect(container.querySelector(".nodal-hotspot-ghost")).toBeTruthy();

    // Header live : pitch = 350/10 = 35.0, yaw = 220/10 = 22.0.
    expect(container.textContent).toMatch(/35\.0/);
    expect(container.textContent).toMatch(/22\.0/);

    act(() => {
      document.dispatchEvent(
        new PointerEvent("pointerup", { bubbles: true, clientX: 400, clientY: 250 })
      );
    });

    const updated = store.getState().satellites[sat.id] as CoordsOptionsSatelliteNode;
    expect(updated.data.pitch).toBeCloseTo(40);
    expect(updated.data.yaw).toBeCloseTo(25);
    expect(container.querySelector(".nodal-hotspot-ghost")).toBeFalsy();
  });

  it("Échap pendant un drag annule sans commit", async () => {
    const { store, scene, sat } = setupSceneWithOneHotspot();
    const beforePitch = (store.getState().satellites[sat.id] as CoordsOptionsSatelliteNode).data.pitch;
    const beforeYaw = (store.getState().satellites[sat.id] as CoordsOptionsSatelliteNode).data.yaw;
    renderTree(
      <NodalUiContext.Provider value={mockNodalUi(store)}>
        <ScenePreviewModal sceneId={scene.id} onClose={() => {}} />
      </NodalUiContext.Provider>
    );

    act(() => {
      (container.querySelector(".nodal-scene-preview-modal__edit-toggle") as HTMLButtonElement).dispatchEvent(
        new MouseEvent("click", { bubbles: true })
      );
    });

    const body = container.querySelector(".nodal-scene-preview-modal__body") as HTMLDivElement;
    const hsClass = `prev-hs-${String(scene.id).replace(/[^a-zA-Z0-9_-]/g, "_")}-0`;
    const hsEl = document.createElement("div");
    hsEl.className = hsClass;
    body.appendChild(hsEl);

    act(() => {
      hsEl.dispatchEvent(
        new PointerEvent("pointerdown", { bubbles: true, clientX: 100, clientY: 100 })
      );
    });

    // C18.4 — promotion explicite en drag via un `pointermove` > seuil 4 px.
    act(() => {
      document.dispatchEvent(
        new PointerEvent("pointermove", { bubbles: true, clientX: 200, clientY: 200 })
      );
    });

    expect(container.querySelector(".nodal-hotspot-ghost")).toBeTruthy();

    act(() => {
      document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
    });

    expect(container.querySelector(".nodal-hotspot-ghost")).toBeFalsy();
    const after = store.getState().satellites[sat.id] as CoordsOptionsSatelliteNode;
    expect(after.data.pitch).toBe(beforePitch);
    expect(after.data.yaw).toBe(beforeYaw);
  });

  it("hors mode édition, pointerdown sur un hotspot ne déclenche aucun drag", async () => {
    const { store, scene } = setupSceneWithOneHotspot();
    renderTree(
      <NodalUiContext.Provider value={mockNodalUi(store)}>
        <ScenePreviewModal sceneId={scene.id} onClose={() => {}} />
      </NodalUiContext.Provider>
    );

    const body = container.querySelector(".nodal-scene-preview-modal__body") as HTMLDivElement;
    const hsClass = `prev-hs-${String(scene.id).replace(/[^a-zA-Z0-9_-]/g, "_")}-0`;
    const hsEl = document.createElement("div");
    hsEl.className = hsClass;
    body.appendChild(hsEl);

    act(() => {
      hsEl.dispatchEvent(
        new PointerEvent("pointerdown", { bubbles: true, clientX: 100, clientY: 100 })
      );
    });

    expect(container.querySelector(".nodal-hotspot-ghost")).toBeFalsy();
  });
});
