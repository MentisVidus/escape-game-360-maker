import { useCallback, useEffect, useMemo, useState } from "react";

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

function readDomState() {
  const useCustom = el<HTMLInputElement>("useCustomPopup");
  const font = el<HTMLSelectElement>("pop-font");
  const color = el<HTMLInputElement>("pop-color");
  const bgc = el<HTMLInputElement>("pop-bgc");
  const bga = el<HTMLInputElement>("pop-bga");
  const btnBg = el<HTMLInputElement>("pop-btn-bg");
  const btnCol = el<HTMLInputElement>("pop-btn-col");
  return {
    useCustomPopup: !!(useCustom && useCustom.checked),
    popFont: font?.value ?? "Arial, sans-serif",
    popColor: color?.value ?? "#ffffff",
    popBgc: bgc?.value ?? "#000000",
    popBga: Number(bga?.value ?? "0.9") || 0.9,
    popBtnBg: btnBg?.value ?? "#27ae60",
    popBtnCol: btnCol?.value ?? "#ffffff",
  };
}

function writeDomState(s: ReturnType<typeof readDomState>) {
  const useCustom = el<HTMLInputElement>("useCustomPopup");
  const container = el<HTMLElement>("popup-settings-container");
  if (useCustom) {
    useCustom.checked = s.useCustomPopup;
    if (container) {
      container.style.display = s.useCustomPopup ? "flex" : "none";
    }
  }
  const font = el<HTMLSelectElement>("pop-font");
  const color = el<HTMLInputElement>("pop-color");
  const bgc = el<HTMLInputElement>("pop-bgc");
  const bga = el<HTMLInputElement>("pop-bga");
  const btnBg = el<HTMLInputElement>("pop-btn-bg");
  const btnCol = el<HTMLInputElement>("pop-btn-col");
  if (font) font.value = s.popFont;
  if (color) color.value = s.popColor;
  if (bgc) bgc.value = s.popBgc;
  if (bga) bga.value = String(s.popBga);
  if (btnBg) btnBg.value = s.popBtnBg;
  if (btnCol) btnCol.value = s.popBtnCol;
  [useCustom, font, color, bgc, bga, btnBg, btnCol].forEach((node) => {
    if (node) node.dispatchEvent(new Event("input", { bubbles: true }));
  });
  if (typeof window.updatePreview === "function") {
    window.updatePreview();
  }
}

type Props = {
  open: boolean;
  onClose: () => void;
  /** Si défini, « Retour » rouvre le menu paramètres sans fermer la session. */
  onBackToHub?: () => void;
};

export function PopupThemeCustomizationPopup({ open, onClose, onBackToHub }: Props) {
  const L = loc();
  const [useCustomPopup, setUseCustomPopup] = useState(false);
  const [popFont, setPopFont] = useState("Arial, sans-serif");
  const [popColor, setPopColor] = useState("#ffffff");
  const [popBgc, setPopBgc] = useState("#000000");
  const [popBga, setPopBga] = useState(0.9);
  const [popBtnBg, setPopBtnBg] = useState("#27ae60");
  const [popBtnCol, setPopBtnCol] = useState("#ffffff");

  useEffect(() => {
    if (!open) return;
    const s = readDomState();
    setUseCustomPopup(s.useCustomPopup);
    setPopFont(s.popFont);
    setPopColor(s.popColor);
    setPopBgc(s.popBgc);
    setPopBga(s.popBga);
    setPopBtnBg(s.popBtnBg);
    setPopBtnCol(s.popBtnCol);
  }, [open]);

  const pushDom = useCallback(() => {
    writeDomState({
      useCustomPopup,
      popFont,
      popColor,
      popBgc,
      popBga,
      popBtnBg,
      popBtnCol,
    });
  }, [useCustomPopup, popFont, popColor, popBgc, popBga, popBtnBg, popBtnCol]);

  const previewBoxStyle = useMemo(() => {
    const hex = popBgc.replace("#", "");
    const rp = parseInt(hex.substring(0, 2), 16) || 0;
    const gp = parseInt(hex.substring(2, 4), 16) || 0;
    const bp = parseInt(hex.substring(4, 6), 16) || 0;
    const bg = useCustomPopup ? `rgba(${rp},${gp},${bp},${popBga})` : "rgba(0,0,0,0.9)";
    const fg = useCustomPopup ? popColor : "#ffffff";
    const ff = useCustomPopup ? popFont : "sans-serif";
    return { backgroundColor: bg, color: fg, fontFamily: ff } as const;
  }, [useCustomPopup, popBgc, popBga, popColor, popFont]);

  const previewBtnStyle = useMemo(() => {
    const bg = useCustomPopup ? popBtnBg : "#27ae60";
    const fg = useCustomPopup ? popBtnCol : "#ffffff";
    const ff = useCustomPopup ? popFont : "sans-serif";
    return { backgroundColor: bg, color: fg, fontFamily: ff } as const;
  }, [useCustomPopup, popBtnBg, popBtnCol, popFont]);

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

        <label className="nodal-popup-check">
          <input
            type="checkbox"
            checked={useCustomPopup}
            onChange={(e) => {
              setUseCustomPopup(e.target.checked);
              queueMicrotask(() =>
                writeDomState({
                  useCustomPopup: e.target.checked,
                  popFont,
                  popColor,
                  popBgc,
                  popBga,
                  popBtnBg,
                  popBtnCol,
                })
              );
            }}
          />
          <span>{t.useCustom}</span>
        </label>

        <div className={`nodal-pt-fields ${!useCustomPopup ? "nodal-pt-fields--disabled" : ""}`}>
          <label className="nodal-popup-field">
            <span>{t.font}</span>
            <select
              value={popFont}
              disabled={!useCustomPopup}
              onChange={(e) => {
                setPopFont(e.target.value);
                queueMicrotask(() => writeDomState({ useCustomPopup, popFont: e.target.value, popColor, popBgc, popBga, popBtnBg, popBtnCol }));
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
                value={popColor}
                disabled={!useCustomPopup}
                onChange={(e) => {
                  setPopColor(e.target.value);
                  queueMicrotask(() =>
                    writeDomState({ useCustomPopup, popFont, popColor: e.target.value, popBgc, popBga, popBtnBg, popBtnCol })
                  );
                }}
              />
            </label>
            <label className="nodal-popup-field">
              <span>{t.bg}</span>
              <input
                type="color"
                value={popBgc}
                disabled={!useCustomPopup}
                onChange={(e) => {
                  setPopBgc(e.target.value);
                  queueMicrotask(() =>
                    writeDomState({ useCustomPopup, popFont, popColor, popBgc: e.target.value, popBga, popBtnBg, popBtnCol })
                  );
                }}
              />
            </label>
          </div>
          <label className="nodal-popup-field">
            <span>
              {t.alpha} ({popBga})
            </span>
            <input
              type="range"
              min={0}
              max={1}
              step={0.1}
              value={popBga}
              disabled={!useCustomPopup}
              onChange={(e) => {
                const v = Number(e.target.value);
                setPopBga(v);
                queueMicrotask(() =>
                  writeDomState({ useCustomPopup, popFont, popColor, popBgc, popBga: v, popBtnBg, popBtnCol })
                );
              }}
            />
          </label>
          <div className="nodal-popup-grid">
            <label className="nodal-popup-field">
              <span>{t.btnBg}</span>
              <input
                type="color"
                value={popBtnBg}
                disabled={!useCustomPopup}
                onChange={(e) => {
                  setPopBtnBg(e.target.value);
                  queueMicrotask(() =>
                    writeDomState({ useCustomPopup, popFont, popColor, popBgc, popBga, popBtnBg: e.target.value, popBtnCol })
                  );
                }}
              />
            </label>
            <label className="nodal-popup-field">
              <span>{t.btnCol}</span>
              <input
                type="color"
                value={popBtnCol}
                disabled={!useCustomPopup}
                onChange={(e) => {
                  setPopBtnCol(e.target.value);
                  queueMicrotask(() =>
                    writeDomState({ useCustomPopup, popFont, popColor, popBgc, popBga, popBtnBg, popBtnCol: e.target.value })
                  );
                }}
              />
            </label>
          </div>
        </div>

        <div className="nodal-pt-preview-wrap">
          <p className="nodal-popup-hint nodal-pt-preview-label">{t.preview}</p>
          <div className="nodal-pt-preview-box" style={previewBoxStyle}>
            <h3 style={{ marginTop: 0, opacity: 0.85 }}>{L === "en" ? "Well done!" : "Bravo !"}</h3>
            <p style={{ marginBottom: 12, fontSize: 15 }}>{L === "en" ? "You found the solution." : "Vous avez trouvé la solution."}</p>
            <button type="button" style={{ ...previewBtnStyle, padding: "8px 15px", border: "none", borderRadius: 5 }}>
              {L === "en" ? "Continue" : "Continuer"}
            </button>
          </div>
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
