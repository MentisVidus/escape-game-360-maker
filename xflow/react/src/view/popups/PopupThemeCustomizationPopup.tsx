import { useEffect, useMemo } from "react";
import type { StoreApi } from "zustand/vanilla";

import type { NodalProjectStore } from "../../store/nodalProjectStore";
import type { PlayerPopupTheme } from "./playerPopupDomRead";
import { playerPopupThemeToDemoBoxStyle, playerPopupThemeToDemoBtnStyle } from "./playerPopupPreviewFromTheme";
import { usePlayerPopupTheme } from "./usePlayerPopupTheme";

type Locale = "fr" | "en";

const FONT_OPTIONS: { value: string; fr: string; en: string }[] = [
  { value: "Arial, sans-serif", fr: "Arial (moderne / classique)", en: "Arial (modern / classic)" },
  { value: "Courier, monospace", fr: "Courier New (machine à écrire)", en: "Courier New (typewriter)" },
  { value: "Times, serif", fr: "Times New Roman (livre)", en: "Times New Roman (book)" },
  { value: "cursive, sans-serif", fr: "Comic Sans (BD)", en: "Comic Sans (cartoon)" },
  { value: "Impact, fantasy", fr: "Impact (affiche)", en: "Impact (poster)" },
];

function loc(): Locale {
  if (typeof document === "undefined") return "fr";
  return document.documentElement.lang?.toLowerCase().startsWith("en") ? "en" : "fr";
}

function el<T extends HTMLElement>(id: string): T | null {
  if (typeof document === "undefined") return null;
  return document.getElementById(id) as T | null;
}

function writeDomState(s: PlayerPopupTheme) {
  const useCustom = el<HTMLInputElement>("useCustomPopup");
  const container = el<HTMLElement>("popup-settings-container");
  if (useCustom) {
    useCustom.checked = s.useCustom;
    if (container) {
      container.style.display = s.useCustom ? "flex" : "none";
    }
  }
  const font = el<HTMLSelectElement>("pop-font");
  const color = el<HTMLInputElement>("pop-color");
  const bgc = el<HTMLInputElement>("pop-bgc");
  const bga = el<HTMLInputElement>("pop-bga");
  const btnBg = el<HTMLInputElement>("pop-btn-bg");
  const btnCol = el<HTMLInputElement>("pop-btn-col");
  if (font) font.value = s.font;
  if (color) color.value = s.color;
  if (bgc) bgc.value = s.bg;
  if (bga) bga.value = String(s.bgAlpha);
  if (btnBg) btnBg.value = s.btnBg;
  if (btnCol) btnCol.value = s.btnColor;
  [useCustom, font, color, bgc, bga, btnBg, btnCol].forEach((node) => {
    if (node) node.dispatchEvent(new Event("input", { bubbles: true }));
  });
  if (typeof window.updatePreview === "function") {
    window.updatePreview();
  }
}

type Props = {
  open: boolean;
  store: StoreApi<NodalProjectStore>;
  onClose: () => void;
  /** Si défini, « Retour » rouvre le menu paramètres sans fermer la session. */
  onBackToHub?: () => void;
};

export function PopupThemeCustomizationPopup({ open, store, onClose, onBackToHub }: Props) {
  const L = loc();
  const theme = usePlayerPopupTheme(store);

  useEffect(() => {
    if (!open) return;
    store.getState().syncMetaSettingsPopupThemeFromDom();
  }, [open, store]);

  const commit = (patch: Partial<PlayerPopupTheme>) => {
    store.getState().setMetaSettingsPopupTheme(patch);
    queueMicrotask(() =>
      writeDomState(store.getState().meta.settings?.popupTheme || theme)
    );
  };

  const pushDom = () => writeDomState(store.getState().meta.settings?.popupTheme || theme);

  const previewBoxStyle = useMemo(() => playerPopupThemeToDemoBoxStyle(theme), [theme]);
  const previewBtnStyle = useMemo(() => playerPopupThemeToDemoBtnStyle(theme), [theme]);

  if (!open) return null;

  const t =
    L === "en"
      ? {
          title: "Popup appearance",
          hint: "Same fields as the main form. Changes apply to the player preview and Quill theme.",
          useCustom: "Customize dialog boxes",
          font: "Font",
          textCol: "Text color",
          bg: "Background",
          alpha: "Background opacity",
          btnBg: "Button background",
          btnCol: "Button text color",
          preview: "Preview",
          back: "← Back",
        }
      : {
          title: "Personnalisation des popups",
          hint: "Mêmes champs que le formulaire. Les changements alimentent l’aperçu joueur et le thème Quill.",
          useCustom: "Personnaliser les boîtes de dialogue",
          font: "Police d’écriture",
          textCol: "Couleur du texte",
          bg: "Couleur de fond",
          alpha: "Opacité du fond",
          btnBg: "Couleur du bouton",
          btnCol: "Texte du bouton",
          preview: "Aperçu",
          back: "← Retour",
        };

  const { useCustom, font, color, bg, bgAlpha, btnBg, btnColor } = theme;

  return (
    <div
      className="nodal-popup-overlay nodal-popup-overlay--nested"
      role="dialog"
      aria-modal="true"
      aria-labelledby="nodal-popup-theme-title"
    >
      <div className="nodal-popup-backdrop" onClick={onClose} />
      <div className="nodal-popup-panel nodal-popup-panel--hotspot-appearance nodal-popup-panel--popup-theme">
        <h2 id="nodal-popup-theme-title">{t.title}</h2>
        <p className="nodal-popup-hint">{t.hint}</p>

        <div className="nodal-general-layout">
          <div className="nodal-general-main">
            <label className="nodal-popup-check">
              <input
                type="checkbox"
                checked={useCustom}
                onChange={(e) => {
                  commit({ useCustom: e.target.checked });
                }}
              />
              <span>{t.useCustom}</span>
            </label>

            <div className={`nodal-pt-fields nodal-ha-visual ${!useCustom ? "nodal-pt-fields--disabled" : ""}`}>
              <label className="nodal-popup-field">
                <span>{t.font}</span>
                <select
                  value={font}
                  disabled={!useCustom}
                  onChange={(e) => {
                    commit({ font: e.target.value });
                  }}
                >
                  {FONT_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {L === "en" ? o.en : o.fr}
                    </option>
                  ))}
                </select>
              </label>
              <div className="nodal-popup-grid">
                <label className="nodal-popup-field">
                  <span>{t.textCol}</span>
                  <input
                    type="color"
                    value={color}
                    disabled={!useCustom}
                    onChange={(e) => {
                      commit({ color: e.target.value });
                    }}
                  />
                </label>
                <label className="nodal-popup-field">
                  <span>{t.bg}</span>
                  <input
                    type="color"
                    value={bg}
                    disabled={!useCustom}
                    onChange={(e) => {
                      commit({ bg: e.target.value });
                    }}
                  />
                </label>
              </div>
              <label className="nodal-popup-field">
                <span>
                  {t.alpha} ({bgAlpha})
                </span>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.1}
                  value={bgAlpha}
                  disabled={!useCustom}
                  onChange={(e) => {
                    commit({ bgAlpha: Number(e.target.value) });
                  }}
                />
              </label>
              <div className="nodal-popup-grid">
                <label className="nodal-popup-field">
                  <span>{t.btnBg}</span>
                  <input
                    type="color"
                    value={btnBg}
                    disabled={!useCustom}
                    onChange={(e) => {
                      commit({ btnBg: e.target.value });
                    }}
                  />
                </label>
                <label className="nodal-popup-field">
                  <span>{t.btnCol}</span>
                  <input
                    type="color"
                    value={btnColor}
                    disabled={!useCustom}
                    onChange={(e) => {
                      commit({ btnColor: e.target.value });
                    }}
                  />
                </label>
              </div>
            </div>
          </div>

          <aside className="nodal-general-preview" aria-label={t.preview}>
            <span className="nodal-general-preview-label">{t.preview}</span>
            <div className="nodal-general-preview-canvas">
              <div className="nodal-pt-preview-box" style={previewBoxStyle}>
                <h3 style={{ marginTop: 0, opacity: 0.85 }}>{L === "en" ? "Well done!" : "Bravo !"}</h3>
                <p style={{ marginBottom: 12, fontSize: 15 }}>{L === "en" ? "You found the solution." : "Vous avez trouvé la solution."}</p>
                <button type="button" style={{ ...previewBtnStyle, padding: "8px 15px", border: "none", borderRadius: 5 }}>
                  {L === "en" ? "Continue" : "Continuer"}
                </button>
              </div>
            </div>
          </aside>
        </div>

        <div className="nodal-popup-actions nodal-popup-actions--split">
          <button
            type="button"
            className="nodal-ha-btn-secondary"
            onClick={() => {
              pushDom();
              if (onBackToHub) onBackToHub();
              else onClose();
            }}
          >
            {t.back}
          </button>
          <button
            type="button"
            onClick={() => {
              pushDom();
              onClose();
            }}
          >
            {L === "en" ? "Done" : "Terminé"}
          </button>
        </div>
      </div>
    </div>
  );
}
