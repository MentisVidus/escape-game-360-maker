import type { StoreApi } from "zustand/vanilla";
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
    inventory: string;
    popups: string;
    audio: string;
    timerSave: string;
    endScreens: string;
    soon: (key: string) => string;
  }
> = {
  fr: {
    title: "Paramètres globaux",
    hint: "Choisissez une section.",
    close: "Fermer",
    identity: "Identité projet",
    inventory: "Inventaire",
    popups: "Thème popups",
    audio: "Audio",
    timerSave: "Timer et sauvegarde",
    endScreens: "Fins de partie",
    soon: (key) => `Bientôt — ${key}`,
  },
  en: {
    title: "Global settings",
    hint: "Pick a section.",
    close: "Close",
    identity: "Project identity",
    inventory: "Inventory",
    popups: "Popup theme",
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

type Props = {
  open: boolean;
  onClose: () => void;
  onOpenProjectIdentity: () => void;
  onOpenInventory: () => void;
  onOpenPopupTheme: () => void;
  store: StoreApi<NodalProjectStore>;
};

/**
 * C10.2.a-fix — Hub paramètres globaux en liste de boutons :
 * - `Identité projet` ouvre `ProjectIdentitySettingsPopup`;
 * - `Thème popups` ouvre `PopupThemeCustomizationPopup`;
 * - autres sections désactivées avec tooltip `Bientôt — C10.2.x`.
 */
export function GlobalSettingsHubPopup({
  open,
  onClose,
  onOpenProjectIdentity,
  onOpenInventory,
  onOpenPopupTheme,
  store,
}: Props) {
  const L = COPY[locale()];
  void store; /* store réservé pour évolutions C10.2.b–f ; non utilisé ici. */

  return (
    <PalettePopupModal
      title={L.title}
      isOpen={open}
      onClose={onClose}
      panelModifier="nodal-popup-panel--global-hub"
      labelledById="nodal-global-hub-title"
      locale={locale()}
      footerActions={
        <button type="button" onClick={onClose}>
          {L.close}
        </button>
      }
    >
      <p className="nodal-popup-hint">{L.hint}</p>
      <div className="nodal-global-hub-actions">
        <button type="button" className="nodal-global-hub-btn nodal-global-hub-btn--primary" onClick={onOpenProjectIdentity}>
          {L.identity}
        </button>
        <button type="button" className="nodal-global-hub-btn nodal-global-hub-btn--primary" onClick={onOpenInventory}>
          {L.inventory}
        </button>
        <button type="button" className="nodal-global-hub-btn nodal-global-hub-btn--primary" onClick={onOpenPopupTheme}>
          {L.popups}
        </button>
        <button type="button" className="nodal-global-hub-btn" disabled title={L.soon("C10.2.d")}>
          {L.audio}
        </button>
        <button type="button" className="nodal-global-hub-btn" disabled title={L.soon("C10.2.e")}>
          {L.timerSave}
        </button>
        <button type="button" className="nodal-global-hub-btn" disabled title={L.soon("C10.2.f")}>
          {L.endScreens}
        </button>
      </div>
    </PalettePopupModal>
  );
}
