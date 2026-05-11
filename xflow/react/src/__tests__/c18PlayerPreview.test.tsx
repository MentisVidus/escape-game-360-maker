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
import type {
  ActionNode,
  GotoActionNode,
  MsgActionNode,
  PickActionNode,
  PwdActionNode,
  ReqActionNode,
  SceneNode,
  SelectorActionNode,
} from "../model/nodes";
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

    // C18.5.3 — le viewport est le parent du chrome ; on ne peut plus utiliser
    // `overlay.querySelector("div")` car le badge "Aperçu interactif" est
    // désormais le 1er enfant `<div>` (avec `pointer-events: none`).
    const chrome = overlay.querySelector(".nodal-msg-preview-chrome") as HTMLDivElement;
    const viewport = chrome.parentElement as HTMLDivElement;
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

const VIS = { requiresItem: "", hiddenIfHasItem: "", clickWhenInvisible: true as const };
const SFX = { url: "", volume: 1 };

function setupSceneWithGotoOnly() {
  const store = createNodalProjectStore();
  const scene: SceneNode = {
    id: asSceneNodeId("scn-goto"),
    nodeType: "scene",
    sceneId: "goto-scene",
    label: "S",
    panoramaUrl: "https://example.com/p.jpg",
  };
  const goto: GotoActionNode = {
    id: asActionNodeId("act-goto"),
    nodeType: "action",
    actionType: "goto",
    label: "Vers ailleurs",
    payload: {
      target: "other",
      copy: { bodyHtml: "<p>Texte transition</p>", buttonLabel: "Partir" },
    },
    sfx: SFX,
    visibility: VIS,
  };
  store.getState().addScene(scene, { x: 0, y: 0 });
  store.getState().addAction(goto, { x: 80, y: 80 });
  store.getState().connect({
    id: asEdgeId("flow-goto"),
    family: "flow",
    sourceId: scene.id,
    targetId: goto.id,
  });
  return { store, scene, goto };
}

function setupSceneWithReqOnly() {
  const store = createNodalProjectStore();
  const scene: SceneNode = {
    id: asSceneNodeId("scn-req"),
    nodeType: "scene",
    sceneId: "req-scene",
    label: "S",
    panoramaUrl: "https://example.com/p.jpg",
  };
  const req: ReqActionNode = {
    id: asActionNodeId("act-req"),
    nodeType: "action",
    actionType: "req",
    label: "Besoin clef",
    payload: {
      itemId: "key",
      copy: { bodyHtml: "<p>Objet manquant</p>", buttonLabel: "Dommage" },
    },
    rewardActionId: null,
    sfx: SFX,
    visibility: VIS,
  };
  store.getState().addScene(scene, { x: 0, y: 0 });
  store.getState().addAction(req, { x: 80, y: 80 });
  store.getState().connect({
    id: asEdgeId("flow-req"),
    family: "flow",
    sourceId: scene.id,
    targetId: req.id,
  });
  return { store, scene, req };
}

function setupSceneWithPwdOnly() {
  const store = createNodalProjectStore();
  const scene: SceneNode = {
    id: asSceneNodeId("scn-pwd"),
    nodeType: "scene",
    sceneId: "pwd-scene",
    label: "S",
    panoramaUrl: "https://example.com/p.jpg",
  };
  const pwd: PwdActionNode = {
    id: asActionNodeId("act-pwd"),
    nodeType: "action",
    actionType: "pwd",
    label: "Code",
    payload: {
      answer: "abc",
      copy: { bodyHtml: "<p>Énigme ici</p>", buttonLabel: "Valider" },
    },
    rewardActionId: null,
    sfx: SFX,
    visibility: VIS,
  };
  store.getState().addScene(scene, { x: 0, y: 0 });
  store.getState().addAction(pwd, { x: 80, y: 80 });
  store.getState().connect({
    id: asEdgeId("flow-pwd"),
    family: "flow",
    sourceId: scene.id,
    targetId: pwd.id,
  });
  return { store, scene, pwd };
}

function setupSceneWithSelectorTwoMsgs() {
  const store = createNodalProjectStore();
  const scene: SceneNode = {
    id: asSceneNodeId("scn-sel"),
    nodeType: "scene",
    sceneId: "sel-scene",
    label: "S",
    panoramaUrl: "https://example.com/p.jpg",
  };
  const sel: SelectorActionNode = {
    id: asActionNodeId("act-sel"),
    nodeType: "action",
    actionType: "selector",
    label: "Menu",
    payload: {
      nested: {
        title: "Titre menu",
        copy: { bodyHtml: "<p>Intro menu</p>", buttonLabel: "-" },
        displayMode: "buttons",
      },
    },
    sfx: SFX,
    visibility: VIS,
  };
  const m1: MsgActionNode = {
    id: asActionNodeId("act-m1"),
    nodeType: "action",
    actionType: "msg",
    label: "Choix A",
    payload: { copy: { bodyHtml: "<p>Réponse A</p>", buttonLabel: "OK" } },
    sfx: SFX,
    visibility: VIS,
  };
  const m2: MsgActionNode = {
    id: asActionNodeId("act-m2"),
    nodeType: "action",
    actionType: "msg",
    label: "Choix B",
    payload: { copy: { bodyHtml: "<p>Réponse B</p>", buttonLabel: "OK" } },
    sfx: SFX,
    visibility: VIS,
  };
  store.getState().addScene(scene, { x: 0, y: 0 });
  store.getState().addAction(sel, { x: 120, y: 80 });
  store.getState().addAction(m1, { x: 120, y: 180 });
  store.getState().addAction(m2, { x: 120, y: 280 });
  store.getState().connect({
    id: asEdgeId("f-sel"),
    family: "flow",
    sourceId: scene.id,
    targetId: sel.id,
  });
  store.getState().connect({
    id: asEdgeId("f-s1"),
    family: "flow",
    sourceId: sel.id,
    targetId: m1.id,
  });
  store.getState().connect({
    id: asEdgeId("f-s2"),
    family: "flow",
    sourceId: sel.id,
    targetId: m2.id,
  });
  return { store, scene, sel, m1, m2 };
}

function setupSceneWithMsgRelativeImg() {
  const store = createNodalProjectStore();
  const scene: SceneNode = {
    id: asSceneNodeId("scn-img"),
    nodeType: "scene",
    sceneId: "img-scene",
    label: "S",
    panoramaUrl: "https://example.com/p.jpg",
  };
  const msg: MsgActionNode = {
    id: asActionNodeId("act-img"),
    nodeType: "action",
    actionType: "msg",
    label: "Msg",
    payload: {
      copy: {
        bodyHtml: '<p>Voir</p><img src="./assets/missing.png" alt="x" />',
        buttonLabel: "Fermer",
      },
    },
    sfx: SFX,
    visibility: VIS,
  };
  store.getState().addScene(scene, { x: 0, y: 0 });
  store.getState().addAction(msg, { x: 80, y: 80 });
  store.getState().connect({
    id: asEdgeId("f-img"),
    family: "flow",
    sourceId: scene.id,
    targetId: msg.id,
  });
  return { store, scene, msg };
}

describe("C18.5.2 — Player preview (goto + req + pwd + selector + img fallback)", () => {
  it("goto : body transition + libellé bouton", () => {
    const { store, scene } = setupSceneWithGotoOnly();
    renderTree(
      <NodalUiContext.Provider value={mockNodalUi(store)}>
        <ScenePreviewModal sceneId={scene.id} onClose={() => {}} />
      </NodalUiContext.Provider>
    );
    const body = container.querySelector(".nodal-scene-preview-modal__body") as HTMLDivElement;
    const hsEl = injectHotspotEl(body, scene.id, 0);
    act(() => {
      hsEl.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, clientX: 10, clientY: 10 }));
    });
    const overlay = document.querySelector(".nodal-player-preview-overlay") as HTMLDivElement;
    expect(overlay.dataset.actionType).toBe("goto");
    expect(overlay.querySelector(".play-html-rich")?.innerHTML).toContain("transition");
    const goBtn = Array.from(overlay.querySelectorAll("button")).find((b) => b.textContent?.trim() === "Partir");
    expect(goBtn).toBeTruthy();
  });

  it("req : message KO (sans vérif inventaire)", () => {
    const { store, scene } = setupSceneWithReqOnly();
    renderTree(
      <NodalUiContext.Provider value={mockNodalUi(store)}>
        <ScenePreviewModal sceneId={scene.id} onClose={() => {}} />
      </NodalUiContext.Provider>
    );
    const body = container.querySelector(".nodal-scene-preview-modal__body") as HTMLDivElement;
    const hsEl = injectHotspotEl(body, scene.id, 0);
    act(() => {
      hsEl.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, clientX: 10, clientY: 10 }));
    });
    const overlay = document.querySelector(".nodal-player-preview-overlay") as HTMLDivElement;
    expect(overlay.dataset.actionType).toBe("req");
    expect(overlay.querySelector(".play-html-rich")?.innerHTML).toContain("manquant");
  });

  it("pwd : variante input + bouton Valider", () => {
    const { store, scene } = setupSceneWithPwdOnly();
    renderTree(
      <NodalUiContext.Provider value={mockNodalUi(store)}>
        <ScenePreviewModal sceneId={scene.id} onClose={() => {}} />
      </NodalUiContext.Provider>
    );
    const body = container.querySelector(".nodal-scene-preview-modal__body") as HTMLDivElement;
    const hsEl = injectHotspotEl(body, scene.id, 0);
    act(() => {
      hsEl.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, clientX: 10, clientY: 10 }));
    });
    const overlay = document.querySelector(".nodal-player-preview-overlay") as HTMLDivElement;
    expect(overlay.dataset.actionType).toBe("pwd");
    expect(overlay.querySelector(".play-html-rich")?.innerHTML).toContain("Énigme");
    expect(overlay.querySelector("input[type=\"text\"][disabled]")).toBeTruthy();
  });

  it("selector : drill vers un enfant msg puis Retour", () => {
    const { store, scene } = setupSceneWithSelectorTwoMsgs();
    renderTree(
      <NodalUiContext.Provider value={mockNodalUi(store)}>
        <ScenePreviewModal sceneId={scene.id} onClose={() => {}} />
      </NodalUiContext.Provider>
    );
    const body = container.querySelector(".nodal-scene-preview-modal__body") as HTMLDivElement;
    const hsEl = injectHotspotEl(body, scene.id, 0);
    act(() => {
      hsEl.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, clientX: 10, clientY: 10 }));
    });
    let overlay = document.querySelector(".nodal-player-preview-overlay") as HTMLDivElement;
    expect(overlay.dataset.actionType).toBe("selector");
    expect(overlay.querySelector("strong")?.textContent).toBe("Titre menu");
    expect(overlay.querySelector(".play-html-rich")?.innerHTML).toContain("Intro menu");

    const choiceBtn = Array.from(overlay.querySelectorAll("button")).find(
      (b) => b.textContent?.trim() === "Choix A"
    ) as HTMLButtonElement;
    expect(choiceBtn).toBeTruthy();
    act(() => {
      choiceBtn.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    overlay = document.querySelector(".nodal-player-preview-overlay") as HTMLDivElement;
    expect(overlay.dataset.actionType).toBe("msg");
    expect(overlay.querySelector(".play-html-rich")?.innerHTML).toContain("Réponse A");

    // C18.5.2-fix : bouton retour est maintenant intégré dans le panel
    // (classe `nodal-player-popup-back`, top bar gauche), pas en overlay
    // externe. Aligné sur runtime joueur `renderSelectorPanel`.
    const back = overlay.querySelector(".nodal-player-popup-back") as HTMLButtonElement;
    expect(back).toBeTruthy();
    act(() => {
      back.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    overlay = document.querySelector(".nodal-player-preview-overlay") as HTMLDivElement;
    expect(overlay.dataset.actionType).toBe("selector");
    expect(overlay.querySelector(".play-html-rich")?.innerHTML).toContain("Intro menu");
  });

  it("img src relatif : fallback texte Média (FR)", () => {
    const { store, scene } = setupSceneWithMsgRelativeImg();
    renderTree(
      <NodalUiContext.Provider value={mockNodalUi(store)}>
        <ScenePreviewModal sceneId={scene.id} onClose={() => {}} />
      </NodalUiContext.Provider>
    );
    const body = container.querySelector(".nodal-scene-preview-modal__body") as HTMLDivElement;
    const hsEl = injectHotspotEl(body, scene.id, 0);
    act(() => {
      hsEl.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, clientX: 10, clientY: 10 }));
    });
    const overlay = document.querySelector(".nodal-player-preview-overlay") as HTMLDivElement;
    const rich = overlay.querySelector(".play-html-rich") as HTMLElement;
    expect(rich.innerHTML).toContain("Média : ./assets/missing.png");
    expect(rich.querySelectorAll("img").length).toBe(0);
  });
});
