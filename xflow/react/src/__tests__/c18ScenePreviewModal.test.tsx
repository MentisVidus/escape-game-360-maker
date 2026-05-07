/** @vitest-environment jsdom */
/**
 * C18.1 — aperçu scène 360° : projections hotspots, menu s-box, modale sans panorama.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, useState, type ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";

import { asActionNodeId, asEdgeId, asMediaNodeId, asSceneNodeId, type SceneNodeId } from "../model/ids";
import type { ActionNode, MediaImageNode, SceneNode } from "../model/nodes";
import { createNodalProjectStore } from "../store/nodalProjectStore";
import { sceneIdFromSboxId, sboxIdFromScene } from "../store/reconcileSceneBoxes";
import type { NodalUiContextValue } from "../view/nodalUiContext";
import { NodalUiContext } from "../view/nodalUiContext";
import { normalizePanoramaUrl } from "../view/preview/panoramaUrl";
import { collectSceneHotspotProjections } from "../view/preview/sceneHotspotProjections";
import { resolveScenePanoramaDisplayUrl } from "../view/preview/scenePanoramaDisplay";
import { ScenePreviewModal } from "../view/popups/ScenePreviewModal";

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
  document.body.innerHTML = "";
  vi.restoreAllMocks();
});

function renderTree(node: ReactNode) {
  act(() => {
    root.render(node);
  });
}

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

describe("C18.1 — normalizePanoramaUrl", () => {
  it("préfixe ./ pour chemins relatifs", () => {
    expect(normalizePanoramaUrl("media/x.jpg")).toBe("./media/x.jpg");
  });
  it("laisse http(s), data, blob inchangés", () => {
    expect(normalizePanoramaUrl("https://x/y.jpg")).toBe("https://x/y.jpg");
    expect(normalizePanoramaUrl("data:image/png;base64,xx")).toMatch(/^data:/);
    expect(normalizePanoramaUrl("blob:http://localhost/u")).toMatch(/^blob:/);
  });
});

describe("C18.1 — sceneIdFromSboxId", () => {
  it("résout la scène depuis le s-box", () => {
    const store = createNodalProjectStore();
    const scene: SceneNode = {
      id: asSceneNodeId("scn-sid"),
      nodeType: "scene",
      sceneId: "ext",
      label: "A",
      panoramaUrl: "",
    };
    store.getState().addScene(scene, { x: 0, y: 0 });
    const bid = sboxIdFromScene(scene.id);
    expect(sceneIdFromSboxId(store.getState(), bid)).toBe(scene.id);
  });
});

describe("C18.1 — collectSceneHotspotProjections", () => {
  it("produit pitch/yaw/cssClass pour chaque hotspot flow scène → action", () => {
    const store = createNodalProjectStore();
    const scene: SceneNode = {
      id: asSceneNodeId("scn-hs"),
      nodeType: "scene",
      sceneId: "sh",
      label: "Scène",
      panoramaUrl: "u.jpg",
    };
    const msg: ActionNode = {
      id: asActionNodeId("act-hs"),
      nodeType: "action",
      actionType: "msg",
      label: "Hotspot A",
      payload: { copy: { bodyHtml: "x", buttonLabel: "OK" } },
      sfx: { url: "", volume: 1 },
      visibility: { requiresItem: "", hiddenIfHasItem: "", clickWhenInvisible: true },
    };
    store.getState().addScene(scene, { x: 0, y: 0 });
    store.getState().addAction(msg, { x: 50, y: 50 });
    store.getState().connect({
      id: asEdgeId("fh"),
      family: "flow",
      sourceId: scene.id,
      targetId: msg.id,
    });
    const snap = store.getState();
    const coordsSat = Object.values(snap.satellites).find((s) => s.satelliteType === "coords-options");
    expect(coordsSat).toBeDefined();
    store.getState().updateNodeData(coordsSat!.id, {
      data: { pitch: 12.5, yaw: -30 },
    } as never);

    const { projections, cssText } = collectSceneHotspotProjections(store.getState(), scene.id);
    expect(projections).toHaveLength(1);
    expect(projections[0]!.pitch).toBe(12.5);
    expect(projections[0]!.yaw).toBe(-30);
    expect(projections[0]!.cssClass).toMatch(/^prev-hs-/);
    expect(cssText).toContain(projections[0]!.cssClass);
    expect(cssText).toContain("dashed");
  });
});

describe("C18.1 — resolveScenePanoramaDisplayUrl", () => {
  it("retourne l’URL du média image lié en meta si panorama scène vide", () => {
    const store = createNodalProjectStore();
    const scene: SceneNode = {
      id: asSceneNodeId("scn-meta"),
      nodeType: "scene",
      sceneId: "ext-meta",
      label: "S",
      panoramaUrl: "",
    };
    const mid = asMediaNodeId("media-pano");
    const media: MediaImageNode = {
      id: mid,
      nodeType: "media",
      mediaType: "media-image",
      label: "Img",
      data: { url: "https://cdn.example.com/pano.jpg" },
    };
    store.getState().addScene(scene, { x: 0, y: 0 });
    store.getState().addMedia(media, { x: 10, y: 10 });
    store.getState().connect({ id: asEdgeId("em"), family: "meta", sourceId: scene.id, targetId: mid });
    expect(resolveScenePanoramaDisplayUrl(store.getState(), scene.id)).toBe("https://cdn.example.com/pano.jpg");
  });
});

describe("C18.1 — ScenePreviewModal", () => {
  it("affiche le message si panoramaUrl vide (sans monter Pannellum)", () => {
    const store = createNodalProjectStore();
    const scene: SceneNode = {
      id: asSceneNodeId("scn-empty"),
      nodeType: "scene",
      sceneId: "e",
      label: "Vide",
      panoramaUrl: "",
    };
    store.getState().addScene(scene, { x: 0, y: 0 });
    const ui = mockNodalUi(store);
    renderTree(
      <NodalUiContext.Provider value={ui}>
        <ScenePreviewModal sceneId={scene.id} onClose={() => {}} />
      </NodalUiContext.Provider>
    );
    expect(container.textContent).toContain("Image 360 manquante");
    expect(container.textContent).toMatch(/panorama|média image|meta/i);
  });

  it("utilise l’URL du média meta si la scène n’a pas de panoramaUrl", () => {
    const store = createNodalProjectStore();
    const scene: SceneNode = {
      id: asSceneNodeId("scn-meta-ui"),
      nodeType: "scene",
      sceneId: "ext-mu",
      label: "S",
      panoramaUrl: "",
    };
    const mid = asMediaNodeId("media-mu");
    const media: MediaImageNode = {
      id: mid,
      nodeType: "media",
      mediaType: "media-image",
      label: "Img",
      data: { url: "https://example.com/from-meta.png" },
    };
    store.getState().addScene(scene, { x: 0, y: 0 });
    store.getState().addMedia(media, { x: 10, y: 10 });
    store.getState().connect({ id: asEdgeId("emu"), family: "meta", sourceId: scene.id, targetId: mid });
    const ui = mockNodalUi(store);
    renderTree(
      <NodalUiContext.Provider value={ui}>
        <ScenePreviewModal sceneId={scene.id} onClose={() => {}} />
      </NodalUiContext.Provider>
    );
    expect(container.textContent).not.toContain("Image 360 manquante");
    expect(container.querySelector(".nodal-panorama-viewer-host")).toBeTruthy();
  });
});

describe("C18.1 — openScenePreview (harness)", () => {
  it("ferme un flag simulant msg editor et ouvre scenePreviewSceneId", () => {
    const scene: SceneNode = {
      id: asSceneNodeId("scn-h"),
      nodeType: "scene",
      sceneId: "h",
      label: "H",
      panoramaUrl: "",
    };
    const store = createNodalProjectStore();
    store.getState().addScene(scene, { x: 0, y: 0 });

    function Harness() {
      const [msgOpen, setMsgOpen] = useState(true);
      const [previewId, setPreviewId] = useState<SceneNodeId | null>(null);
      const openScenePreview = (sid: SceneNodeId) => {
        setMsgOpen(false);
        setPreviewId(sid);
      };
      const ui = mockNodalUi(store, {
        msgEditorActionId: msgOpen ? asActionNodeId("act-dummy") : null,
        scenePreviewSceneId: previewId,
        openScenePreview,
      });
      return (
        <NodalUiContext.Provider value={ui}>
          <span data-testid="msg">{msgOpen ? "1" : "0"}</span>
          <span data-testid="pv">{previewId ?? ""}</span>
          <button type="button" onClick={() => openScenePreview(scene.id)}>
            go
          </button>
        </NodalUiContext.Provider>
      );
    }

    renderTree(<Harness />);
    expect(container.querySelector('[data-testid="msg"]')?.textContent).toBe("1");
    expect(container.querySelector('[data-testid="pv"]')?.textContent).toBe("");
    act(() => {
      container.querySelector("button")?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    expect(container.querySelector('[data-testid="msg"]')?.textContent).toBe("0");
    expect(container.querySelector('[data-testid="pv"]')?.textContent).toBe(scene.id);
  });
});
