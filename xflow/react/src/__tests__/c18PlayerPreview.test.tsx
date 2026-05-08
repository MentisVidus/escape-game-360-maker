/** @vitest-environment jsdom */
/**
 * C18.5.1 — Aperçu interactif "comme en jeu" en mode read-only :
 * clic sur hotspot → popup joueur preview (msg + pick), via le composant
 * `<PlayerPreviewOverlay>` (qui réutilise `<PlayerPopupPreview>` avec
 * `interactive`). Couverture msg + pick uniquement (les actions complexes
 * goto/req/pwd/selector sont en C18.5.2).
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, type ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";

import { asActionNodeId, asEdgeId, asSceneNodeId } from "../model/ids";
import type { ActionNode, CoordsOptionsSatelliteNode, MsgActionNode, PickActionNode, SceneNode } from "../model/nodes";
import { createNodalProjectStore } from "../store/nodalProjectStore";
import type { NodalUiContextValue } from "../view/nodalUiContext";
import { NodalUiContext } from "../view/nodalUiContext";
import { ScenePreviewModal } from "../view/popups/ScenePreviewModal";
import { PlayerPopupPreview } from "../view/popups/PlayerPopupPreview";

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

/**
 * Setup : 1 scène + 1 action msg liée par flow + 1 action pick liée par flow.
 * Permet de tester deux types d'action en C18.5.1 (msg avec body simple, pick
 * avec itemName + body). Les coords-options sont auto-créés par `addAction`.
 */
function setupSceneWithMsgAndPick() {
  const store = createNodalProjectStore();
  const scene: SceneNode = {
    id: asSceneNodeId("scn-prev"),
    nodeType: "scene",
    sceneId: "prev",
    label: "Scène preview",
    panoramaUrl: "https://example.com/p.jpg",
  };
  const msgAction: MsgActionNode = {
    id: asActionNodeId("act-msg"),
    nodeType: "action",
    actionType: "msg",
    label: "HS Msg",
    payload: {
      copy: {
        bodyHtml: "<p>Bonjour <strong>aventurier</strong></p>",
        buttonLabel: "Continuer",
      },
    },
    sfx: { url: "", volume: 1 },
    visibility: { requiresItem: "", hiddenIfHasItem: "", clickWhenInvisible: true },
  };
  const pickAction: PickActionNode = {
    id: asActionNodeId("act-pick"),
    nodeType: "action",
    actionType: "pick",
    label: "HS Pick",
    payload: {
      itemId: "key1",
      itemName: "Clé en or",
      copy: {
        bodyHtml: "<p>Vous trouvez une clé.</p>",
        buttonLabel: "OK",
      },
    },
    sfx: { url: "", volume: 1 },
    visibility: { requiresItem: "", hiddenIfHasItem: "", clickWhenInvisible: true },
  };
  store.getState().addScene(scene, { x: 0, y: 0 });
  store.getState().addAction(msgAction, { x: 80, y: 80 });
  store.getState().addAction(pickAction, { x: 80, y: 200 });
  store.getState().connect({
    id: asEdgeId("flow-msg"),
    family: "flow",
    sourceId: scene.id,
    targetId: msgAction.id,
  });
  store.getState().connect({
    id: asEdgeId("flow-pick"),
    family: "flow",
    sourceId: scene.id,
    targetId: pickAction.id,
  });
  return { store, scene, msgAction, pickAction };
}

function injectHotspotEl(body: HTMLElement, sceneId: string, index: number): HTMLDivElement {
  // C18.3 — même convention que collectSceneHotspotProjections : `prev-hs-${safeScene}-${index}`
  // où `safeScene = scene.id.replace(/[^a-zA-Z0-9_-]/g, "_")`.
  const safeScene = String(sceneId).replace(/[^a-zA-Z0-9_-]/g, "_");
  const cssClass = `prev-hs-${safeScene}-${index}`;
  const el = document.createElement("div");
  el.className = cssClass;
  body.appendChild(el);
  return el;
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

describe("C18.5.1 — Player preview overlay (msg + pick)", () => {
  it("[diag] vérifie que les coords-options sont auto-créés et hotspots projetés", () => {
    const { store } = setupSceneWithMsgAndPick();
    const sats = Object.values(store.getState().satellites).filter(
      (s) => s.satelliteType === "coords-options"
    );
    expect(sats.length).toBe(2);
  });

  it("clic en read-only sur un hotspot msg ouvre l'overlay avec bodyHtml + label bouton", () => {
    const { store, scene, msgAction } = setupSceneWithMsgAndPick();
    renderTree(
      <NodalUiContext.Provider value={mockNodalUi(store)}>
        <ScenePreviewModal sceneId={scene.id} onClose={() => {}} />
      </NodalUiContext.Provider>
    );

    expect(document.querySelector(".nodal-player-preview-overlay")).toBeFalsy();
    // Diagnostic : data-player-preview doit être "0" au démarrage.
    expect(container.querySelector('[data-player-preview="0"]')).toBeTruthy();

    const body = container.querySelector(".nodal-scene-preview-modal__body") as HTMLDivElement;
    const hsEl = injectHotspotEl(body, scene.id, 0);

    act(() => {
      hsEl.dispatchEvent(
        new PointerEvent("pointerdown", { bubbles: true, clientX: 100, clientY: 100 })
      );
    });

    // Diagnostic : data-player-preview doit avoir bascule à "1" après pointerdown.
    expect(container.querySelector('[data-player-preview="1"]')).toBeTruthy();

    const overlay = document.querySelector(".nodal-player-preview-overlay") as HTMLDivElement | null;
    expect(overlay).toBeTruthy();
    expect(overlay!.dataset.actionType).toBe("msg");

    const richHtml = overlay!.querySelector(".play-html-rich") as HTMLElement | null;
    expect(richHtml).toBeTruthy();
    expect(richHtml!.innerHTML).toContain("aventurier");

    const labelBtn = Array.from(overlay!.querySelectorAll("button")).find(
      (b) => b.textContent?.trim() === "Continuer"
    );
    expect(labelBtn).toBeTruthy();
    expect(labelBtn!.disabled).toBe(false);

    // Sanity : pas de mutation du store par l'ouverture.
    expect(store.getState().actions[msgAction.id]).toBeDefined();
  });

  it("clic sur un hotspot pick affiche le titleText (itemName) + le bodyHtml", () => {
    const { store, scene } = setupSceneWithMsgAndPick();
    renderTree(
      <NodalUiContext.Provider value={mockNodalUi(store)}>
        <ScenePreviewModal sceneId={scene.id} onClose={() => {}} />
      </NodalUiContext.Provider>
    );
    const body = container.querySelector(".nodal-scene-preview-modal__body") as HTMLDivElement;
    // Index 1 = pick (ordre des connect : msg en 0, pick en 1).
    const hsEl = injectHotspotEl(body, scene.id, 1);

    act(() => {
      hsEl.dispatchEvent(
        new PointerEvent("pointerdown", { bubbles: true, clientX: 50, clientY: 50 })
      );
    });

    const overlay = document.querySelector(".nodal-player-preview-overlay") as HTMLDivElement | null;
    expect(overlay).toBeTruthy();
    expect(overlay!.dataset.actionType).toBe("pick");

    const title = overlay!.querySelector("strong");
    expect(title?.textContent).toBe("Clé en or");

    const richHtml = overlay!.querySelector(".play-html-rich") as HTMLElement | null;
    expect(richHtml?.innerHTML).toContain("clé");
  });

  it("clic en mode édition sur un hotspot n'ouvre pas l'overlay (drag/select)", () => {
    const { store, scene } = setupSceneWithMsgAndPick();
    renderTree(
      <NodalUiContext.Provider value={mockNodalUi(store)}>
        <ScenePreviewModal sceneId={scene.id} onClose={() => {}} />
      </NodalUiContext.Provider>
    );
    // Toggle ON.
    const editToggle = container.querySelector(
      ".nodal-scene-preview-modal__edit-toggle"
    ) as HTMLButtonElement;
    act(() => {
      editToggle.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    expect(container.querySelector('[data-edit-mode="1"]')).toBeTruthy();

    const body = container.querySelector(".nodal-scene-preview-modal__body") as HTMLDivElement;
    const hsEl = injectHotspotEl(body, scene.id, 0);
    act(() => {
      hsEl.dispatchEvent(
        new PointerEvent("pointerdown", { bubbles: true, clientX: 100, clientY: 100 })
      );
    });

    expect(document.querySelector(".nodal-player-preview-overlay")).toBeFalsy();
  });

  it("clic sur le bouton principal (Continuer) ferme l'overlay", () => {
    const { store, scene } = setupSceneWithMsgAndPick();
    renderTree(
      <NodalUiContext.Provider value={mockNodalUi(store)}>
        <ScenePreviewModal sceneId={scene.id} onClose={() => {}} />
      </NodalUiContext.Provider>
    );
    const body = container.querySelector(".nodal-scene-preview-modal__body") as HTMLDivElement;
    const hsEl = injectHotspotEl(body, scene.id, 0);
    act(() => {
      hsEl.dispatchEvent(
        new PointerEvent("pointerdown", { bubbles: true, clientX: 100, clientY: 100 })
      );
    });

    const overlay = document.querySelector(".nodal-player-preview-overlay") as HTMLDivElement;
    const confirmBtn = Array.from(overlay.querySelectorAll("button")).find(
      (b) => b.textContent?.trim() === "Continuer"
    ) as HTMLButtonElement;
    act(() => {
      confirmBtn.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(document.querySelector(".nodal-player-preview-overlay")).toBeFalsy();
    // Sanity store : msg action toujours là, intacte.
    expect((store.getState().actions[asActionNodeId("act-msg")] as MsgActionNode).payload.copy.buttonLabel).toBe("Continuer");
  });

  it("Échap ferme l'overlay sans fermer la modale d'aperçu", () => {
    const { store, scene } = setupSceneWithMsgAndPick();
    const onClose = vi.fn();
    renderTree(
      <NodalUiContext.Provider value={mockNodalUi(store)}>
        <ScenePreviewModal sceneId={scene.id} onClose={onClose} />
      </NodalUiContext.Provider>
    );
    const body = container.querySelector(".nodal-scene-preview-modal__body") as HTMLDivElement;
    const hsEl = injectHotspotEl(body, scene.id, 0);
    act(() => {
      hsEl.dispatchEvent(
        new PointerEvent("pointerdown", { bubbles: true, clientX: 100, clientY: 100 })
      );
    });
    expect(document.querySelector(".nodal-player-preview-overlay")).toBeTruthy();

    act(() => {
      document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    });

    expect(document.querySelector(".nodal-player-preview-overlay")).toBeFalsy();
    expect(onClose).not.toHaveBeenCalled();
  });

  it("bascule du toggle vers édition pendant l'overlay → overlay fermé automatiquement", () => {
    const { store, scene } = setupSceneWithMsgAndPick();
    renderTree(
      <NodalUiContext.Provider value={mockNodalUi(store)}>
        <ScenePreviewModal sceneId={scene.id} onClose={() => {}} />
      </NodalUiContext.Provider>
    );
    const body = container.querySelector(".nodal-scene-preview-modal__body") as HTMLDivElement;
    const hsEl = injectHotspotEl(body, scene.id, 0);
    act(() => {
      hsEl.dispatchEvent(
        new PointerEvent("pointerdown", { bubbles: true, clientX: 100, clientY: 100 })
      );
    });
    expect(document.querySelector(".nodal-player-preview-overlay")).toBeTruthy();

    const editToggle = container.querySelector(
      ".nodal-scene-preview-modal__edit-toggle"
    ) as HTMLButtonElement;
    act(() => {
      editToggle.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(container.querySelector('[data-edit-mode="1"]')).toBeTruthy();
    expect(document.querySelector(".nodal-player-preview-overlay")).toBeFalsy();
  });

  it("le composant PlayerPopupPreview reste rétrocompatible : sans `interactive`, boutons disabled (mode éditeur)", () => {
    // Sanity test : l'API legacy de PlayerPopupPreview (utilisée par les
    // éditeurs MsgContentPopup/PickContentPopup/etc.) ne doit pas avoir
    // changé : sans la prop `interactive`, les boutons sont disabled.
    const childContainer = document.createElement("div");
    document.body.appendChild(childContainer);
    const childRoot = createRoot(childContainer);
    act(() => {
      childRoot.render(
        <PlayerPopupPreview
          viewportStyle={{}}
          panelStyle={{}}
          closeBtnStyle={{}}
          buttonStyle={{}}
          closeAriaLabel="Close"
          html="<p>Hello</p>"
          variant={{ kind: "button", label: "Click" }}
        />
      );
    });
    const buttons = childContainer.querySelectorAll("button");
    expect(buttons.length).toBeGreaterThan(0);
    for (const btn of Array.from(buttons)) {
      expect(btn.disabled).toBe(true);
    }
    act(() => {
      childRoot.unmount();
    });
    document.body.removeChild(childContainer);
  });

  it("clic backdrop (zone sombre hors panel) ferme l'overlay", () => {
    const { store, scene } = setupSceneWithMsgAndPick();
    renderTree(
      <NodalUiContext.Provider value={mockNodalUi(store)}>
        <ScenePreviewModal sceneId={scene.id} onClose={() => {}} />
      </NodalUiContext.Provider>
    );
    const body = container.querySelector(".nodal-scene-preview-modal__body") as HTMLDivElement;
    const hsEl = injectHotspotEl(body, scene.id, 0);
    act(() => {
      hsEl.dispatchEvent(
        new PointerEvent("pointerdown", { bubbles: true, clientX: 100, clientY: 100 })
      );
    });
    const overlay = document.querySelector(".nodal-player-preview-overlay") as HTMLDivElement;
    expect(overlay).toBeTruthy();

    // Le viewport (1er enfant de l'overlay : div avec le chrome) reçoit le clic.
    const viewport = overlay.querySelector("div") as HTMLDivElement;
    act(() => {
      viewport.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(document.querySelector(".nodal-player-preview-overlay")).toBeFalsy();
  });

  it("clic à l'intérieur du panel (sur la popup) ne ferme pas l'overlay", () => {
    const { store, scene } = setupSceneWithMsgAndPick();
    renderTree(
      <NodalUiContext.Provider value={mockNodalUi(store)}>
        <ScenePreviewModal sceneId={scene.id} onClose={() => {}} />
      </NodalUiContext.Provider>
    );
    const body = container.querySelector(".nodal-scene-preview-modal__body") as HTMLDivElement;
    const hsEl = injectHotspotEl(body, scene.id, 0);
    act(() => {
      hsEl.dispatchEvent(
        new PointerEvent("pointerdown", { bubbles: true, clientX: 100, clientY: 100 })
      );
    });
    const overlay = document.querySelector(".nodal-player-preview-overlay") as HTMLDivElement;
    const panel = overlay.querySelector(".nodal-msg-preview-chrome") as HTMLDivElement;

    act(() => {
      // Clic sur le panel : currentTarget !== target visé par onBackdropClick → no close.
      panel.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(document.querySelector(".nodal-player-preview-overlay")).toBeTruthy();
  });

  it("aucune mutation du store pendant l'ouverture ou la fermeture de la preview", () => {
    const { store, scene, msgAction } = setupSceneWithMsgAndPick();
    const initialActions = JSON.stringify(store.getState().actions);
    renderTree(
      <NodalUiContext.Provider value={mockNodalUi(store)}>
        <ScenePreviewModal sceneId={scene.id} onClose={() => {}} />
      </NodalUiContext.Provider>
    );
    const body = container.querySelector(".nodal-scene-preview-modal__body") as HTMLDivElement;
    const hsEl = injectHotspotEl(body, scene.id, 0);
    act(() => {
      hsEl.dispatchEvent(
        new PointerEvent("pointerdown", { bubbles: true, clientX: 100, clientY: 100 })
      );
    });
    act(() => {
      document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    });
    expect(JSON.stringify(store.getState().actions)).toBe(initialActions);
    // Sanity : msgAction.id toujours présent.
    expect(store.getState().actions[msgAction.id]).toBeDefined();
    // Garde-fou TS pour un cast `ActionNode` non utilisé directement dans cet `it`.
    const probe: ActionNode = store.getState().actions[msgAction.id]!;
    expect(probe.actionType).toBe("msg");
  });

  it("hors hotspot (clic sur le panneau nu) en read-only n'ouvre pas d'overlay", () => {
    const { store, scene } = setupSceneWithMsgAndPick();
    renderTree(
      <NodalUiContext.Provider value={mockNodalUi(store)}>
        <ScenePreviewModal sceneId={scene.id} onClose={() => {}} />
      </NodalUiContext.Provider>
    );
    const body = container.querySelector(".nodal-scene-preview-modal__body") as HTMLDivElement;
    act(() => {
      body.dispatchEvent(
        new PointerEvent("pointerdown", { bubbles: true, clientX: 50, clientY: 50 })
      );
    });
    expect(document.querySelector(".nodal-player-preview-overlay")).toBeFalsy();
  });
});
