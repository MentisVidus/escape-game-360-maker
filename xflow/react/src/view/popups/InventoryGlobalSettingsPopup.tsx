import { useEffect, useState } from "react";
import type { StoreApi } from "zustand/vanilla";

import type { InventoryGlobalSettings } from "../../model/project";
import type { NodalProjectStore } from "../../store/nodalProjectStore";
import { MediaUploadButton } from "../components/MediaUploadButton";
import { MEDIA_ACCEPT_IMAGE_LOOSE } from "../components/mediaUploadAccept";
import { PalettePopupModal } from "../palette/PalettePopupModal";

type Locale = "fr" | "en";

const POSITIONS: Array<{ value: InventoryGlobalSettings["position"]; fr: string; en: string }> = [
  { value: "top-right", fr: "En haut à droite", en: "Top-right" },
  { value: "top-left", fr: "En haut à gauche", en: "Top-left" },
  { value: "bottom-right", fr: "En bas à droite", en: "Bottom-right" },
  { value: "bottom-left", fr: "En bas à gauche", en: "Bottom-left" },
];

const COPY: Record<
  Locale,
  {
    title: string;
    hint: string;
    enabled: string;
    position: string;
    icon: string;
    panelBg: string;
    panelBgAlpha: string;
    textColor: string;
    done: string;
  }
> = {
  fr: {
    title: "Inventaire",
    hint: "Réglages HUD inventaire (synchronisés avec le formulaire principal).",
    enabled: "Activer l'inventaire",
    position: "Position",
    icon: "Icône d'ouverture",
    panelBg: "Couleur de fond",
    panelBgAlpha: "Opacité du fond",
    textColor: "Couleur du texte",
    done: "Terminé",
  },
  en: {
    title: "Inventory",
    hint: "Inventory HUD settings (synced with the main form).",
    enabled: "Enable inventory",
    position: "Position",
    icon: "Open icon",
    panelBg: "Panel background",
    panelBgAlpha: "Panel opacity",
    textColor: "Text color",
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

const DEFAULT_INVENTORY: InventoryGlobalSettings = {
  enabled: true,
  position: "top-right",
  icon: "🎒",
  panelBg: "#000000",
  panelBgAlpha: 0.8,
  textColor: "#ffffff",
};

type Props = {
  open: boolean;
  onClose: () => void;
  onBack?: () => void;
  store: StoreApi<NodalProjectStore>;
};

/** C10.2.b — popup dédiée Inventaire HUD. */
export function InventoryGlobalSettingsPopup({ open, onClose, onBack, store }: Props) {
  const L = COPY[locale()];
  const [inventory, setInventory] = useState<InventoryGlobalSettings>(
    store.getState().meta.settings?.inventoryGlobal ?? DEFAULT_INVENTORY
  );

  useEffect(() => {
    if (!open) return;
    setInventory(store.getState().meta.settings?.inventoryGlobal ?? DEFAULT_INVENTORY);
    return store.subscribe((s) => setInventory(s.meta.settings?.inventoryGlobal ?? DEFAULT_INVENTORY));
  }, [open, store]);

  const commit = (patch: Partial<InventoryGlobalSettings>) => {
    store.getState().setMetaSettingsInventory(patch);
    flushNodalToDom();
  };

  const alpha = Number.isFinite(Number(inventory.panelBgAlpha)) ? Number(inventory.panelBgAlpha) : 0.8;

  return (
    <PalettePopupModal
      title={L.title}
      isOpen={open}
      onClose={onClose}
      onBack={onBack}
      panelModifier="nodal-popup-panel--global-hub"
      labelledById="nodal-inventory-settings-title"
      locale={locale()}
      footerActions={
        <button type="button" onClick={onClose}>
          {L.done}
        </button>
      }
    >
      <p className="nodal-popup-hint">{L.hint}</p>
      <div className="nodal-global-hub-section-body">
        <label className="nodal-popup-check">
          <input
            type="checkbox"
            checked={!!inventory.enabled}
            onChange={(e) => commit({ enabled: e.target.checked })}
          />
          <span>{L.enabled}</span>
        </label>

        {inventory.enabled ? (
          <>
            <label className="nodal-global-hub-label" htmlFor="nodal-inv-position">
              {L.position}
            </label>
            <select
              id="nodal-inv-position"
              className="nodal-global-hub-input"
              value={inventory.position}
              onChange={(e) => commit({ position: e.target.value as InventoryGlobalSettings["position"] })}
            >
              {POSITIONS.map((p) => (
                <option key={p.value} value={p.value}>
                  {locale() === "en" ? p.en : p.fr}
                </option>
              ))}
            </select>

            <label className="nodal-global-hub-label" htmlFor="nodal-inv-icon">
              {L.icon}
            </label>
            <div className="nodal-url-with-upload">
              <input
                id="nodal-inv-icon"
                className="nodal-global-hub-input nodal-url-with-upload__input"
                type="text"
                value={inventory.icon}
                onChange={(e) => commit({ icon: e.target.value })}
              />
              <MediaUploadButton
                accept={MEDIA_ACCEPT_IMAGE_LOOSE}
                currentUrl={inventory.icon?.trim()?.startsWith("blob:") ? inventory.icon.trim() : undefined}
                onPicked={(url) => commit({ icon: url })}
              />
            </div>

            <label className="nodal-global-hub-label" htmlFor="nodal-inv-bg">
              {L.panelBg}
            </label>
            <input
              id="nodal-inv-bg"
              type="color"
              value={inventory.panelBg}
              onChange={(e) => commit({ panelBg: e.target.value })}
            />

            <label className="nodal-global-hub-label" htmlFor="nodal-inv-bga">
              {L.panelBgAlpha} ({alpha.toFixed(1)})
            </label>
            <input
              id="nodal-inv-bga"
              type="range"
              min={0}
              max={1}
              step={0.1}
              value={alpha}
              onChange={(e) => commit({ panelBgAlpha: Number(e.target.value) })}
            />

            <label className="nodal-global-hub-label" htmlFor="nodal-inv-color">
              {L.textColor}
            </label>
            <input
              id="nodal-inv-color"
              type="color"
              value={inventory.textColor}
              onChange={(e) => commit({ textColor: e.target.value })}
            />
          </>
        ) : null}
      </div>
    </PalettePopupModal>
  );
}
