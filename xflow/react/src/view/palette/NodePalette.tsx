import { useReactFlow } from "@xyflow/react";
import type { RefObject } from "react";
import type { NodalSearchFieldHandle } from "./NodalSearchField";
import { useCallback, useSyncExternalStore } from "react";
import type { StoreApi } from "zustand/vanilla";

import { asActionNodeId, asMediaNodeId, type SceneNodeId } from "../../model/ids";
import type { ActionNode, MediaNode, SceneNode } from "../../model/nodes";
import { stableSceneNodeIdFromExternal } from "../../serialize/fromProjectJson";
import type { NodalProjectStore } from "../../store/nodalProjectStore";
import { useNodalUi } from "../nodalUiContext";
import { NodalSearchField } from "./NodalSearchField";
import "./palette.css";

let counter = 0;
const nextId = (prefix: string) => `${prefix}-${Date.now()}-${++counter}`;

type PaletteProps = {
  store: StoreApi<NodalProjectStore>;
  canvasRef: RefObject<HTMLDivElement | null>;
  /** Une seule scène sélectionnée sur la carte (C8.3). */
  selectedSceneId: SceneNodeId | null;
  /** C8.4.1 — focus depuis Ctrl+F dans `NodalCanvas`. */
  searchFieldRef: RefObject<NodalSearchFieldHandle | null>;
};

function paletteLocale(): "fr" | "en" {
  if (typeof document === "undefined") return "fr";
  return document.documentElement.lang?.toLowerCase().startsWith("en") ? "en" : "fr";
}

function nodalChrome() {
  return typeof window !== "undefined" ? window.__escape360NodalChrome : undefined;
}

export function NodePalette({ store, canvasRef, selectedSceneId, searchFieldRef }: PaletteProps) {
  const reactFlow = useReactFlow();
  const ui = useNodalUi();
  const L = paletteLocale();
  const projectSnap = useSyncExternalStore(store.subscribe, store.getState, store.getState);
  const startSceneId = projectSnap.meta.startSceneId;
  const sceneCount = Object.keys(projectSnap.scenes).length;
  const needStartChoice = sceneCount >= 2 && (!startSceneId || !(startSceneId in projectSnap.scenes));

  const labels =
    L === "en"
      ? {
          settings: "Global settings",
          scene: "Scene",
          addScene: "Add Scene",
          actions: "Actions",
          media: "Media",
          saveBundle: "Save .escapegame",
          advanced: "Advanced save",
          snapshot: "Local snapshot",
          saveJson: "Save .json",
          load: "Load…",
          form: "Form editor",
          setAsStartScene: "Set as start scene",
          currentStartScene: "Current start scene",
          startSceneHint: "Select a scene on the map, then set the start here.",
        }
      : {
          settings: "Paramètres globaux",
          scene: "Scène",
          addScene: "Ajouter une scène",
          actions: "Actions",
          media: "Médias",
          saveBundle: "Sauver .escapegame",
          advanced: "Sauvegarde avancée",
          snapshot: "Snapshot local",
          saveJson: "Sauver .json",
          load: "Charger…",
          form: "Formulaire",
          setAsStartScene: "Définir comme scène de départ",
          currentStartScene: "Scène de départ actuelle",
          startSceneHint: "Sélectionnez une scène sur la carte, puis définissez le départ ici.",
        };

  const getCenterPosition = () => {
    const host = canvasRef.current;
    if (!host) return { x: 0, y: 0 };
    const rect = host.getBoundingClientRect();
    return reactFlow.screenToFlowPosition({
      x: rect.left + rect.width / 2,
      y: rect.top + rect.height / 2,
    });
  };

  const addScene = () => {
    const sceneId = nextId("scene");
    const id = stableSceneNodeIdFromExternal(sceneId);
    const node: SceneNode = {
      id,
      nodeType: "scene",
      sceneId,
      label: "New Scene",
      panoramaUrl: "",
    };
    const center = getCenterPosition();
    store.getState().addScene(node, { x: center.x, y: center.y });
  };

  const addAction = (actionType: ActionNode["actionType"]) => {
    const id = asActionNodeId(nextId("action"));
    const base = {
      id,
      nodeType: "action" as const,
      actionType,
      label: actionType.toUpperCase(),
      sfx: { url: "", volume: 1 },
      visibility: { requiresItem: "", hiddenIfHasItem: "", clickWhenInvisible: true },
    };
    const node: ActionNode =
      actionType === "msg"
        ? { ...base, actionType, payload: { copy: { bodyHtml: "", buttonLabel: "" } } }
        : actionType === "pick"
          ? { ...base, actionType, payload: { itemId: "", itemName: "", copy: { bodyHtml: "", buttonLabel: "" } } }
          : actionType === "goto"
            ? { ...base, actionType, payload: { target: "", copy: { bodyHtml: "", buttonLabel: "" } } }
            : actionType === "selector"
              ? {
                  ...base,
                  actionType,
                  payload: { nested: { title: "", copy: { bodyHtml: "", buttonLabel: "" }, displayMode: "buttons" } },
                }
              : actionType === "req"
                ? { ...base, actionType, payload: { itemId: "", copy: { bodyHtml: "", buttonLabel: "" } }, rewardActionId: null }
                : {
                    ...base,
                    actionType: "pwd",
                    payload: { answer: "", rememberSuccess: false, copy: { bodyHtml: "", buttonLabel: "" } },
                    rewardActionId: null,
                  };
    const center = getCenterPosition();
    store.getState().addAction(node, { x: center.x, y: center.y });
  };

  const addMedia = (mediaType: MediaNode["mediaType"]) => {
    const id = asMediaNodeId(nextId("media"));
    const node: MediaNode =
      mediaType === "media-image"
        ? { id, nodeType: "media", mediaType, label: "Media", data: { url: "" } }
        : { id, nodeType: "media", mediaType: "media-audio", label: "Media", data: { url: "", volume: 1 } };
    const center = getCenterPosition();
    store.getState().addMedia(node, { x: center.x, y: center.y });
  };

  const runChrome = useCallback((fn: (c: NonNullable<typeof window.__escape360NodalChrome>) => void) => {
    const c = nodalChrome();
    if (!c) {
      window.alert(
        L === "en"
          ? "Editor bridge not ready. Reload the page."
          : "Pont éditeur indisponible. Rechargez la page."
      );
      return;
    }
    fn(c);
  }, [L]);

  const openSettingsHub = () => {
    ui.setObjectEditorSatelliteId(null);
    ui.setCoordsEditorSatelliteId(null);
    ui.setChoiceEditorSatelliteId(null);
    ui.setMediaEditorMediaId(null);
    ui.setMsgEditorActionId(null);
    ui.setPickEditorActionId(null);
    ui.setGotoEditorActionId(null);
    ui.setReqEditorActionId(null);
    ui.setPwdEditorActionId(null);
    ui.setSelectorEditorActionId(null);
    ui.setGlobalSettingsHubOpen(true);
  };

  return (
    <aside className="nodal-palette">
      <NodalSearchField ref={searchFieldRef} store={store} locale={L} />
      <button type="button" className="nodal-palette-gear" onClick={openSettingsHub} title={labels.settings}>
        <span className="nodal-palette-gear-icon" aria-hidden>
          ⚙
        </span>
        <span>{labels.settings}</span>
      </button>

      <h3>{labels.scene}</h3>
      <button type="button" onClick={addScene}>
        {labels.addScene}
      </button>
      {selectedSceneId && selectedSceneId in projectSnap.scenes ? (
        startSceneId === selectedSceneId ? (
          <p className="nodal-palette-start-status">{labels.currentStartScene}</p>
        ) : (
          <button
            type="button"
            className="nodal-palette-btn-secondary nodal-palette-set-start"
            onClick={() => store.getState().setStartScene(selectedSceneId)}
          >
            {labels.setAsStartScene}
          </button>
        )
      ) : needStartChoice ? (
        <p className="nodal-palette-start-hint">{labels.startSceneHint}</p>
      ) : null}

      <h3>{labels.actions}</h3>
      <button type="button" onClick={() => addAction("msg")}>
        Msg
      </button>
      <button type="button" onClick={() => addAction("pick")}>
        Pick
      </button>
      <button type="button" onClick={() => addAction("goto")}>
        Goto
      </button>
      <button type="button" onClick={() => addAction("selector")}>
        Selector
      </button>
      <button type="button" onClick={() => addAction("req")}>
        Req
      </button>
      <button type="button" onClick={() => addAction("pwd")}>
        Pwd
      </button>

      <h3>{labels.media}</h3>
      <button type="button" onClick={() => addMedia("media-image")}>
        Image
      </button>
      <button type="button" onClick={() => addMedia("media-audio")}>
        Audio
      </button>

      <div className="nodal-palette-footer">
        <button
          type="button"
          className="nodal-palette-btn-primary"
          onClick={() => runChrome((c) => c.saveEscapegameBundle())}
        >
          {labels.saveBundle}
        </button>
        <details className="nodal-palette-advanced">
          <summary>{labels.advanced}</summary>
          <button
            type="button"
            className="nodal-palette-btn-secondary"
            onClick={() => {
              runChrome((c) => {
                void c.flushThenLocalDraftSnapshot();
              });
            }}
          >
            {labels.snapshot}
          </button>
          <button type="button" className="nodal-palette-btn-secondary" onClick={() => runChrome((c) => c.flushThenSaveJson())}>
            {labels.saveJson}
          </button>
        </details>
        <button type="button" onClick={() => runChrome((c) => c.triggerLoadEscapegame())}>
          {labels.load}
        </button>
        <button type="button" onClick={() => runChrome((c) => c.closeProjectMapModal())}>
          {labels.form}
        </button>
      </div>
    </aside>
  );
}
