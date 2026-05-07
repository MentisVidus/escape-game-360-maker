/** @vitest-environment jsdom */
/**
 * C18.2 — placement coords sur panorama : helper scène, bouton popup, modale picker.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, type ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";

import { asActionNodeId, asEdgeId, asSatelliteNodeId, asSceneNodeId } from "../model/ids";
import type { ActionNode, CoordsOptionsSatelliteNode, SceneNode } from "../model/nodes";
import { createNodalProjectStore } from "../store/nodalProjectStore";
import { findSceneOfHotspotSatellite } from "../store/findSceneOfHotspotSatellite";
import type { NodalUiContextValue } from "../view/nodalUiContext";
import { NodalUiContext } from "../view/nodalUiContext";
import { CoordsOptionsPopup } from "../view/popups/CoordsOptionsPopup";
import { CoordsPickerModal } from "../view/popups/CoordsPickerModal";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let container: HTMLDivElement;
let root: Root;

function mockNodalUi(store: ReturnType<typeof createNodalProjectStore>, overrides: Partial<NodalUiContextValue> = {}): NodalUiContextValue {
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

function setupHotspotWithCoordsSat(): {
  store: ReturnType<typeof createNodalProjectStore>;
  scene: SceneNode;
  action: ActionNode;
  coordsSat: CoordsOptionsSatelliteNode;
} {
  const store = createNodalProjectStore();
  const scene: SceneNode = {
    id: asSceneNodeId("scn-cp"),
    nodeType: "scene",
    sceneId: "cp",
    label: "Scène",
    panoramaUrl: "https://example.com/pano.jpg",
  };
  const action: ActionNode = {
    id: asActionNodeId("act-cp"),
    nodeType: "action",
    actionType: "msg",
    label: "HS",
    payload: { copy: { bodyHtml: "x", buttonLabel: "OK" } },
    sfx: { url: "", volume: 1 },
    visibility: { requiresItem: "", hiddenIfHasItem: "", clickWhenInvisible: true },
  };
  store.getState().addScene(scene, { x: 0, y: 0 });
  store.getState().addAction(action, { x: 40, y: 40 });
  store.getState().connect({
    id: asEdgeId("fl-cp"),
    family: "flow",
    sourceId: scene.id,
    targetId: action.id,
  });
  const coordsSat = Object.values(store.getState().satellites).find((s) => s.satelliteType === "coords-options") as
    | CoordsOptionsSatelliteNode
    | undefined;
  if (!coordsSat) throw new Error("coords-options satellite attendu");
  store.getState().updateNodeData(coordsSat.id, {
    data: { ...coordsSat.data, pitch: 1, yaw: 2 },
  } as never);
  const fresh = store.getState().satellites[coordsSat.id] as CoordsOptionsSatelliteNode;
  return { store, scene, action, coordsSat: fresh };
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
      mouseEventToCoords: vi.fn(() => [15.5, -22.25] as [number, number]),
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

describe("C18.2 — findSceneOfHotspotSatellite", () => {
  it("résout scène + action pour un satellite coords-options lié", () => {
    const { store, scene, action, coordsSat } = setupHotspotWithCoordsSat();
    const r = findSceneOfHotspotSatellite(store.getState(), coordsSat.id);
    expect(r).toEqual({ sceneId: scene.id, actionId: action.id });
  });

  it("retourne null si l’id n’existe pas", () => {
    const store = createNodalProjectStore();
    expect(findSceneOfHotspotSatellite(store.getState(), asSatelliteNodeId("sat-inexistant"))).toBeNull();
  });

  it("retourne null si le flux scène → action est rompu", () => {
    const { store, coordsSat } = setupHotspotWithCoordsSat();
    const flow = store.getState().edges.find((e) => e.family === "flow" && e.targetId === asActionNodeId("act-cp"));
    expect(flow).toBeDefined();
    store.getState().disconnect(flow!.id);
    expect(findSceneOfHotspotSatellite(store.getState(), coordsSat.id)).toBeNull();
  });
});

describe("C18.2 — CoordsOptionsPopup", () => {
  it("affiche le bouton « Placer sur l’image » et appelle openCoordsPicker", () => {
    const { store, action, coordsSat } = setupHotspotWithCoordsSat();
    const openCoordsPicker = vi.fn();
    const ui = mockNodalUi(store, { openCoordsPicker });
    renderTree(
      <NodalUiContext.Provider value={ui}>
        <CoordsOptionsPopup
          satellite={coordsSat}
          parentAction={action}
          onChangeSatellite={() => {}}
          onChangeActionOptions={() => {}}
          onClose={() => {}}
        />
      </NodalUiContext.Provider>
    );
    const btn = container.querySelector(".nodal-coords-pick-btn") as HTMLButtonElement | null;
    expect(btn).toBeTruthy();
    expect(btn!.disabled).toBe(false);
    expect(btn!.textContent).toMatch(/Placer sur l'image/);
    act(() => {
      btn!.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    expect(openCoordsPicker).toHaveBeenCalledWith(coordsSat.id);
  });
});

describe("C18.2 — CoordsPickerModal", () => {
  it("met à jour le header après clic (picker) puis Valider commit pitch/yaw sans effacer appearance", async () => {
    const { store, coordsSat } = setupHotspotWithCoordsSat();
    const snapBefore = store.getState().satellites[coordsSat.id] as CoordsOptionsSatelliteNode;
    const preserved = {
      sfx: snapBefore.data.sfx,
      visibility: snapBefore.data.visibility,
      customCss: snapBefore.data.customCss,
      hotspotCssExpert: snapBefore.data.hotspotCssExpert,
    };
    const onClose = vi.fn();
    const ui = mockNodalUi(store);
    renderTree(
      <NodalUiContext.Provider value={ui}>
        <CoordsPickerModal satelliteId={coordsSat.id} onClose={onClose} />
      </NodalUiContext.Provider>
    );

    await act(async () => {
      await Promise.resolve();
    });

    const host = container.querySelector(".nodal-panorama-viewer-host") as HTMLElement | null;
    expect(host).toBeTruthy();
    act(() => {
      host!.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(container.textContent).toContain("15.5");
    expect(container.textContent).toContain("-22.3");

    const validateBtn = [...container.querySelectorAll("button")].find((b) => b.textContent === "Valider");
    expect(validateBtn).toBeTruthy();
    act(() => {
      validateBtn!.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    const sat = store.getState().satellites[coordsSat.id] as CoordsOptionsSatelliteNode;
    expect(sat.data.pitch).toBe(15.5);
    expect(sat.data.yaw).toBe(-22.25);
    expect(sat.data.sfx).toEqual(preserved.sfx);
    expect(sat.data.visibility).toEqual(preserved.visibility);
    expect(sat.data.customCss).toBe(preserved.customCss);
    expect(sat.data.hotspotCssExpert).toBe(preserved.hotspotCssExpert);
    expect(onClose).toHaveBeenCalled();
  });

  it("Annuler ne modifie pas le store", async () => {
    const { store, coordsSat } = setupHotspotWithCoordsSat();
    const beforePitch = coordsSat.data.pitch;
    const beforeYaw = coordsSat.data.yaw;
    renderTree(
      <NodalUiContext.Provider value={mockNodalUi(store)}>
        <CoordsPickerModal satelliteId={coordsSat.id} onClose={() => {}} />
      </NodalUiContext.Provider>
    );
    await act(async () => {
      await Promise.resolve();
    });
    const cancelBtn = [...container.querySelectorAll("button")].find((b) => b.textContent === "Annuler");
    expect(cancelBtn).toBeTruthy();
    act(() => {
      cancelBtn!.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    const sat = store.getState().satellites[coordsSat.id] as CoordsOptionsSatelliteNode;
    expect(sat.data.pitch).toBe(beforePitch);
    expect(sat.data.yaw).toBe(beforeYaw);
  });

  it("affiche Cible introuvable si résolution impossible", () => {
    const store = createNodalProjectStore();
    renderTree(
      <NodalUiContext.Provider value={mockNodalUi(store)}>
        <CoordsPickerModal satelliteId={asSatelliteNodeId("sat-inexistant")} onClose={() => {}} />
      </NodalUiContext.Provider>
    );
    expect(container.textContent).toContain("Cible introuvable");
  });
});
