import "quill/dist/quill.snow.css";
import "../quill/nodalQuillRich.css";

import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import type { StoreApi } from "zustand/vanilla";

import type { EndScreensSettings, NodalProject } from "../../model/project";
import type { NodalProjectStore } from "../../store/nodalProjectStore";
import { PalettePopupModal } from "../palette/PalettePopupModal";
import {
  Quill,
  loadHtmlIntoNodalQuill,
  nodalQuillToolbar,
  registerNodalQuillFormats,
  type NodalQuillInstance,
} from "../quill/nodalQuillSetup";

type Locale = "fr" | "en";

const COPY: Record<
  Locale,
  {
    title: string;
    hint: string;
    victoryScene: string;
    gameOverScene: string;
    gameOverTitle: string;
    gameOverBody: string;
    gameOverButton: string;
    victoryTitle: string;
    victoryBody: string;
    victoryButton: string;
    none: string;
    missingScene: (id: string) => string;
    done: string;
  }
> = {
  fr: {
    title: "Fins de partie",
    hint: "Réglez les écrans de victoire et de game over.",
    victoryScene: "Scène déclenchant la victoire",
    gameOverScene: "Scène déclenchant le game over",
    gameOverTitle: "Titre Game Over",
    gameOverBody: "Contenu Game Over",
    gameOverButton: "Label bouton Game Over",
    victoryTitle: "Titre Victoire",
    victoryBody: "Contenu Victoire",
    victoryButton: "Label bouton Victoire",
    none: "— Aucune —",
    missingScene: (id) => `(scène introuvable — ${id})`,
    done: "Terminé",
  },
  en: {
    title: "End screens",
    hint: "Configure victory and game over screens.",
    victoryScene: "Victory trigger scene",
    gameOverScene: "Game over trigger scene",
    gameOverTitle: "Game Over title",
    gameOverBody: "Game Over content",
    gameOverButton: "Game Over button label",
    victoryTitle: "Victory title",
    victoryBody: "Victory content",
    victoryButton: "Victory button label",
    none: "— None —",
    missingScene: (id) => `(scene not found — ${id})`,
    done: "Done",
  },
};

function locale(): Locale {
  if (typeof document === "undefined") return "fr";
  return document.documentElement.lang?.toLowerCase().startsWith("en") ? "en" : "fr";
}

const DEFAULT_END_SCREENS: EndScreensSettings = {
  victorySceneExternalId: "",
  gameOverSceneExternalId: "",
  gameOver: { title: "", bodyHtml: "", buttonLabel: "" },
  victory: { title: "", bodyHtml: "", buttonLabel: "" },
};

function flushNodalToDom() {
  const Ex = typeof window !== "undefined" ? window.EditorSharedBundle : undefined;
  if (Ex && typeof Ex.flushNodalStoreToEditorDom === "function") {
    Ex.flushNodalStoreToEditorDom();
  }
}

type Props = {
  open: boolean;
  onClose: () => void;
  onBack?: () => void;
  store: StoreApi<NodalProjectStore>;
};

export function EndScreensSettingsPopup({ open, onClose, onBack, store }: Props) {
  const L = COPY[locale()];
  const state = useSyncExternalStore(store.subscribe, store.getState, store.getState) as NodalProject;
  const [endScreens, setEndScreens] = useState<EndScreensSettings>(
    store.getState().meta.settings?.endScreens ?? DEFAULT_END_SCREENS
  );
  const gameOverHostRef = useRef<HTMLDivElement | null>(null);
  const victoryHostRef = useRef<HTMLDivElement | null>(null);
  const gameOverQuillRef = useRef<NodalQuillInstance | null>(null);
  const victoryQuillRef = useRef<NodalQuillInstance | null>(null);

  useEffect(() => {
    if (!open) return;
    setEndScreens(store.getState().meta.settings?.endScreens ?? DEFAULT_END_SCREENS);
    return store.subscribe((s) => {
      setEndScreens(s.meta.settings?.endScreens ?? DEFAULT_END_SCREENS);
    });
  }, [open, store]);

  useEffect(() => {
    if (!open) return;
    const gameOverEl = gameOverHostRef.current;
    const victoryEl = victoryHostRef.current;
    if (!gameOverEl || !victoryEl) return;
    registerNodalQuillFormats();

    gameOverEl.innerHTML = "";
    victoryEl.innerHTML = "";

    const gameOverQuill = new Quill(gameOverEl, {
      theme: "snow",
      modules: { toolbar: nodalQuillToolbar() },
    }) as NodalQuillInstance;
    const victoryQuill = new Quill(victoryEl, {
      theme: "snow",
      modules: { toolbar: nodalQuillToolbar() },
    }) as NodalQuillInstance;

    const currentEndScreens = store.getState().meta.settings?.endScreens ?? DEFAULT_END_SCREENS;
    loadHtmlIntoNodalQuill(gameOverQuill, String(currentEndScreens.gameOver.bodyHtml ?? ""));
    loadHtmlIntoNodalQuill(victoryQuill, String(currentEndScreens.victory.bodyHtml ?? ""));
    gameOverQuillRef.current = gameOverQuill;
    victoryQuillRef.current = victoryQuill;

    const syncGameOver = () => {
      const html = gameOverQuill.root.innerHTML;
      store.getState().setMetaSettingsEndScreens({ gameOver: { bodyHtml: html } });
      flushNodalToDom();
    };
    const syncVictory = () => {
      const html = victoryQuill.root.innerHTML;
      store.getState().setMetaSettingsEndScreens({ victory: { bodyHtml: html } });
      flushNodalToDom();
    };

    gameOverQuill.on("text-change", syncGameOver);
    victoryQuill.on("text-change", syncVictory);
    return () => {
      gameOverQuill.off("text-change", syncGameOver);
      victoryQuill.off("text-change", syncVictory);
      gameOverQuillRef.current = null;
      victoryQuillRef.current = null;
      gameOverEl.innerHTML = "";
      victoryEl.innerHTML = "";
    };
  }, [open, store]);

  const sceneOptions = useMemo(
    () =>
      Object.values(state.scenes).map((s) => ({
        internalId: s.id,
        externalId: s.sceneId,
        label: s.label || s.sceneId,
      })),
    [state.scenes]
  );

  const patchEndScreens = (patch: Partial<EndScreensSettings>) => {
    store.getState().setMetaSettingsEndScreens(patch);
    flushNodalToDom();
  };

  const renderSceneSelect = (
    id: string,
    currentValue: string,
    onChange: (value: string) => void
  ) => {
    const exists = currentValue
      ? sceneOptions.some((s) => s.externalId === currentValue)
      : true;
    return (
      <select
        id={id}
        className="nodal-global-hub-input"
        value={currentValue}
        onChange={(e) => onChange(e.target.value)}
      >
        {!exists && currentValue ? (
          <option value={currentValue} disabled>
            {L.missingScene(currentValue)}
          </option>
        ) : null}
        <option value="">{L.none}</option>
        {sceneOptions.map((scene) => (
          <option key={scene.internalId} value={scene.externalId}>
            {scene.label}
          </option>
        ))}
      </select>
    );
  };

  return (
    <PalettePopupModal
      title={L.title}
      isOpen={open}
      onClose={onClose}
      onBack={onBack}
      panelModifier="nodal-popup-panel--hotspot-appearance"
      labelledById="nodal-end-screens-title"
      locale={locale()}
      footerActions={
        <button type="button" onClick={onClose}>
          {L.done}
        </button>
      }
    >
      <p className="nodal-popup-hint">{L.hint}</p>
      <div className="nodal-global-hub-section-body">
        <label className="nodal-global-hub-label" htmlFor="nodal-end-victory-scene">
          {L.victoryScene}
        </label>
        {renderSceneSelect("nodal-end-victory-scene", endScreens.victorySceneExternalId, (value) =>
          patchEndScreens({ victorySceneExternalId: value })
        )}

        <label className="nodal-global-hub-label" htmlFor="nodal-end-gameover-scene">
          {L.gameOverScene}
        </label>
        {renderSceneSelect("nodal-end-gameover-scene", endScreens.gameOverSceneExternalId, (value) =>
          patchEndScreens({ gameOverSceneExternalId: value })
        )}

        <label className="nodal-global-hub-label" htmlFor="nodal-end-gameover-title">
          {L.gameOverTitle}
        </label>
        <input
          id="nodal-end-gameover-title"
          className="nodal-global-hub-input"
          type="text"
          value={endScreens.gameOver.title}
          onChange={(e) => patchEndScreens({ gameOver: { title: e.target.value } })}
        />
        <label className="nodal-global-hub-label">{L.gameOverBody}</label>
        <div className="nodal-popup-quill nodal-quill-theme wysiwyg-wrap nodal-msg-quill-wrap">
          <div ref={gameOverHostRef} />
        </div>
        <label className="nodal-global-hub-label" htmlFor="nodal-end-gameover-btn">
          {L.gameOverButton}
        </label>
        <input
          id="nodal-end-gameover-btn"
          className="nodal-global-hub-input"
          type="text"
          value={endScreens.gameOver.buttonLabel}
          onChange={(e) => patchEndScreens({ gameOver: { buttonLabel: e.target.value } })}
        />

        <label className="nodal-global-hub-label" htmlFor="nodal-end-victory-title">
          {L.victoryTitle}
        </label>
        <input
          id="nodal-end-victory-title"
          className="nodal-global-hub-input"
          type="text"
          value={endScreens.victory.title}
          onChange={(e) => patchEndScreens({ victory: { title: e.target.value } })}
        />
        <label className="nodal-global-hub-label">{L.victoryBody}</label>
        <div className="nodal-popup-quill nodal-quill-theme wysiwyg-wrap nodal-msg-quill-wrap">
          <div ref={victoryHostRef} />
        </div>
        <label className="nodal-global-hub-label" htmlFor="nodal-end-victory-btn">
          {L.victoryButton}
        </label>
        <input
          id="nodal-end-victory-btn"
          className="nodal-global-hub-input"
          type="text"
          value={endScreens.victory.buttonLabel}
          onChange={(e) => patchEndScreens({ victory: { buttonLabel: e.target.value } })}
        />
      </div>
    </PalettePopupModal>
  );
}

