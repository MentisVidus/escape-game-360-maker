import { useReactFlow } from "@xyflow/react";
import type { DragEvent as ReactDragEvent, RefObject } from "react";
import type { NodalSearchFieldHandle } from "./NodalSearchField";
import { useCallback } from "react";
import type { StoreApi } from "zustand/vanilla";

import type { NodalProjectStore } from "../../store/nodalProjectStore";
import {
  encodePaletteDragPayload,
  PALETTE_DRAG_MIME,
  type PaletteInsertSpec,
} from "../../store/insertNodeAtAbsolute";
import { useNodalUi } from "../nodalUiContext";
import { NodalSearchField } from "./NodalSearchField";
import { setPaletteDragGhostImage } from "./paletteDragGhost";
import "./palette.css";

type PaletteProps = {
  store: StoreApi<NodalProjectStore>;
  canvasRef: RefObject<HTMLDivElement | null>;
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

function onPaletteDragStart(e: ReactDragEvent<HTMLElement>, spec: PaletteInsertSpec, locale: "fr" | "en") {
  e.dataTransfer.effectAllowed = "copy";
  e.dataTransfer.setData(PALETTE_DRAG_MIME, encodePaletteDragPayload(spec));
  try {
    e.dataTransfer.setData("text/plain", spec.kind);
  } catch {
    /* certains navigateurs restreignent setData */
  }
  setPaletteDragGhostImage(e, spec, locale);
}

export function NodePalette({ store, canvasRef, searchFieldRef }: PaletteProps) {
  const reactFlow = useReactFlow();
  const ui = useNodalUi();
  const L = paletteLocale();

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
          publish: "Publish",
          publishHint: "Publish your game (HTML / ZIP / deploy)",
          form: "Verify",
          formHint: "Verification view (read-only)",
          shortcuts: "Shortcuts",
          shortcutsHint: "Shortcuts (?)",
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
          publish: "Publier",
          publishHint: "Publication du jeu (HTML / ZIP / déploiement)",
          form: "Vérifier",
          formHint: "Vue de vérification (read-only)",
          shortcuts: "Raccourcis",
          shortcutsHint: "Raccourcis (?)",
        };

  const getCenterPosition = useCallback(() => {
    const host = canvasRef.current;
    if (!host) return { x: 0, y: 0 };
    const rect = host.getBoundingClientRect();
    return reactFlow.screenToFlowPosition({
      x: rect.left + rect.width / 2,
      y: rect.top + rect.height / 2,
    });
  }, [canvasRef, reactFlow]);

  const insertAtCenter = useCallback(
    (spec: PaletteInsertSpec) => {
      const center = getCenterPosition();
      store.getState().insertNodeAtAbsolute(spec, center, { source: "palette" });
    },
    [store, getCenterPosition]
  );

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
    ui.setKeyboardShortcutsOpen(false);
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
      <button
        type="button"
        className="nodal-palette-draggable"
        draggable
        onDragStart={(e) => onPaletteDragStart(e, { kind: "scene" }, L)}
        onClick={() => insertAtCenter({ kind: "scene" })}
      >
        {labels.addScene}
      </button>

      <h3>{labels.actions}</h3>
      {(
        [
          ["msg", "Msg"],
          ["pick", "Pick"],
          ["goto", "Goto"],
          ["selector", "Selector"],
          ["req", "Req"],
          ["pwd", "Pwd"],
        ] as const
      ).map(([actionType, label]) => (
        <button
          key={actionType}
          type="button"
          className="nodal-palette-draggable"
          draggable
          onDragStart={(e) => onPaletteDragStart(e, { kind: "action", actionType }, L)}
          onClick={() => insertAtCenter({ kind: "action", actionType })}
        >
          {label}
        </button>
      ))}

      <h3>{labels.media}</h3>
      <button
        type="button"
        className="nodal-palette-draggable"
        draggable
        onDragStart={(e) => onPaletteDragStart(e, { kind: "media", mediaType: "media-image" }, L)}
        onClick={() => insertAtCenter({ kind: "media", mediaType: "media-image" })}
      >
        Image
      </button>
      <button
        type="button"
        className="nodal-palette-draggable"
        draggable
        onDragStart={(e) => onPaletteDragStart(e, { kind: "media", mediaType: "media-audio" }, L)}
        onClick={() => insertAtCenter({ kind: "media", mediaType: "media-audio" })}
      >
        Audio
      </button>

      <div className="nodal-palette-footer">
        <button
          type="button"
          className="nodal-palette-btn-shortcuts"
          onClick={() => ui.setKeyboardShortcutsOpen(true)}
          title={labels.shortcutsHint}
        >
          <span className="nodal-palette-shortcuts-icon" aria-hidden>
            ⌨
          </span>
          {labels.shortcuts}
        </button>
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
        <button
          type="button"
          className="nodal-palette-btn-publish"
          title={labels.publishHint}
          onClick={() => ui.setPublishHubOpen(true)}
        >
          {labels.publish}
        </button>
        <button type="button" title={labels.formHint} onClick={() => runChrome((c) => c.closeProjectMapModal())}>
          {labels.form}
        </button>
      </div>
    </aside>
  );
}
