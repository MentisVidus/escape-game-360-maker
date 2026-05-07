import { useEffect, useState } from "react";
import type { StoreApi } from "zustand/vanilla";

import type { NodalProjectStore } from "../../store/nodalProjectStore";
import { PalettePopupModal } from "../palette/PalettePopupModal";

type Locale = "fr" | "en";

const COPY: Record<
  Locale,
  {
    title: string;
    label: string;
    hint: string;
    done: string;
  }
> = {
  fr: {
    title: "Identité projet",
    label: "Titre du projet",
    hint: "Paramètres d'identité du projet (titre et futurs champs).",
    done: "Terminé",
  },
  en: {
    title: "Project identity",
    label: "Project title",
    hint: "Project identity settings (title and future fields).",
    done: "Done",
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
  store: StoreApi<NodalProjectStore>;
};

/** C10.2.a-fix — popup dédiée Identité projet (titre uniquement pour l’instant). */
export function ProjectIdentitySettingsPopup({ open, onClose, store }: Props) {
  const L = COPY[locale()];
  const [title, setTitle] = useState(() => store.getState().meta.title);

  useEffect(() => {
    if (!open) return;
    setTitle(store.getState().meta.title);
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
      panelModifier="nodal-popup-panel--global-hub"
      labelledById="nodal-project-identity-title"
      locale={locale()}
      footerActions={
        <button type="button" onClick={onClose}>
          {L.done}
        </button>
      }
    >
      <p className="nodal-popup-hint">{L.hint}</p>
      <div className="nodal-global-hub-section-body">
        <label className="nodal-global-hub-label" htmlFor="nodal-global-project-title">
          {L.label}
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
    </PalettePopupModal>
  );
}
