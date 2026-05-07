import type { StoreApi } from "zustand/vanilla";
import { useEffect, useState } from "react";

import type { NodalProjectStore } from "../../store/nodalProjectStore";
import { PalettePopupModal } from "../palette/PalettePopupModal";

import "./GlobalSettingsHubPopup.css";

type Locale = "fr" | "en";

const COPY: Record<
  Locale,
  {
    title: string;
    hint: string;
    close: string;
    identity: string;
    projectTitle: string;
    inventory: string;
    popups: string;
    popupsBtn: string;
    audio: string;
    timerSave: string;
    endScreens: string;
    soon: (key: string) => string;
  }
> = {
  fr: {
    title: "Paramètres globaux",
    hint: "Dépliez une section. Les réglages restent synchronisés avec le formulaire principal.",
    close: "Fermer",
    identity: "Identité projet",
    projectTitle: "Titre du projet",
    inventory: "Inventaire",
    popups: "Thème popups",
    popupsBtn: "Personnalisation des popups…",
    audio: "Audio",
    timerSave: "Timer et sauvegarde",
    endScreens: "Fins de partie",
    soon: (key) => `Bientôt — ${key}`,
  },
  en: {
    title: "Global settings",
    hint: "Expand a section. Values stay in sync with the main form.",
    close: "Close",
    identity: "Project identity",
    projectTitle: "Project title",
    inventory: "Inventory",
    popups: "Popup theme",
    popupsBtn: "Customize popup appearance…",
    audio: "Audio",
    timerSave: "Timer & save",
    endScreens: "End screens",
    soon: (key) => `Coming soon — ${key}`,
  },
};

function locale(): Locale {
  if (typeof document === "undefined") return "fr";
  return document.documentElement.lang?.toLowerCase().startsWith("en") ? "en" : "fr";
}

function flushNodalToDom() {
  const Ex = typeof window !== "undefined" ? window.EditorSharedBundle : undefined;
  if (Ex && typeof Ex.flushNodalStoreToEditorDom === "function") {
    Ex.flushNodalStoreToEditorDom();
  }
}

type Props = {
  open: boolean;
  onClose: () => void;
  onOpenPopupTheme: () => void;
  store: StoreApi<NodalProjectStore>;
};

/**
 * C10.2.a — Hub paramètres globaux : accordion `<details>` (Q-C10.2.a-1 (c)),
 * section « Identité projet » ouverte par défaut (Q-C10.2.a-2), type
 * `ProjectSettings` partiel (Q-C10.2.a-3 (a)). Thème popups : bouton vers
 * l’éditeur existant (`playerPopupTheme`) sans migration ici (C10.2.c).
 */
export function GlobalSettingsHubPopup({ open, onClose, onOpenPopupTheme, store }: Props) {
  const L = COPY[locale()];
  const [title, setTitle] = useState(() => store.getState().meta.title);

  useEffect(() => {
    if (!open) return;
    setTitle(store.getState().meta.title);
  }, [open, store]);

  useEffect(() => {
    if (!open) return;
    return store.subscribe((s) => setTitle(s.meta.title));
  }, [open, store]);

  const onTitleChange = (value: string) => {
    store.getState().setMetaTitle(value);
    flushNodalToDom();
  };

  return (
    <PalettePopupModal
      title={L.title}
      isOpen={open}
      onClose={onClose}
      panelModifier="nodal-popup-panel--global-hub nodal-popup-panel--global-hub-accordion"
      labelledById="nodal-global-hub-title"
      locale={locale()}
      footerActions={
        <button type="button" onClick={onClose}>
          {L.close}
        </button>
      }
    >
      <p className="nodal-popup-hint">{L.hint}</p>

      <div className="nodal-global-hub-accordion">
        <details className="nodal-global-hub-details" open>
          <summary className="nodal-global-hub-summary">{L.identity}</summary>
          <div className="nodal-global-hub-section-body">
            <label className="nodal-global-hub-label" htmlFor="nodal-global-project-title">
              {L.projectTitle}
            </label>
            <input
              id="nodal-global-project-title"
              className="nodal-global-hub-input"
              type="text"
              value={title}
              onChange={(e) => onTitleChange(e.target.value)}
              autoComplete="off"
            />
          </div>
        </details>

        <details className="nodal-global-hub-details">
          <summary className="nodal-global-hub-summary">{L.inventory}</summary>
          <p className="nodal-global-hub-placeholder">{L.soon("C10.2.b")}</p>
        </details>

        <details className="nodal-global-hub-details">
          <summary className="nodal-global-hub-summary">{L.popups}</summary>
          <div className="nodal-global-hub-section-body">
            <button type="button" className="nodal-global-hub-btn nodal-global-hub-btn--primary" onClick={onOpenPopupTheme}>
              {L.popupsBtn}
            </button>
          </div>
        </details>

        <details className="nodal-global-hub-details">
          <summary className="nodal-global-hub-summary">{L.audio}</summary>
          <p className="nodal-global-hub-placeholder">{L.soon("C10.2.d")}</p>
        </details>

        <details className="nodal-global-hub-details">
          <summary className="nodal-global-hub-summary">{L.timerSave}</summary>
          <p className="nodal-global-hub-placeholder">{L.soon("C10.2.e")}</p>
        </details>

        <details className="nodal-global-hub-details">
          <summary className="nodal-global-hub-summary">{L.endScreens}</summary>
          <p className="nodal-global-hub-placeholder">{L.soon("C10.2.f")}</p>
        </details>
      </div>
    </PalettePopupModal>
  );
}
