import { useCallback, useEffect, useMemo, useState } from "react";
import type { CSSProperties } from "react";

import type { HotspotAppearanceUi } from "../../model/hotspotAppearance";
import {
  DEFAULT_HOTSPOT_APPEARANCE,
  buildCustomCssFromAppearance,
  mergeHotspotAppearance,
} from "../../model/hotspotAppearance";

import { MediaUploadButton } from "../components/MediaUploadButton";
import { MEDIA_ACCEPT_IMAGE_LOOSE } from "../components/mediaUploadAccept";

export type HotspotAppearanceSavePayload = {
  appearance: HotspotAppearanceUi;
  customCss: string;
  hotspotCssExpert: boolean;
};

type Props = {
  open: boolean;
  initialAppearance?: Partial<HotspotAppearanceUi> | null;
  initialCustomCss?: string | null;
  initialExpert?: boolean;
  onSave: (payload: HotspotAppearanceSavePayload) => void;
  onClose: () => void;
};

export function HotspotAppearancePopup({
  open,
  initialAppearance,
  initialCustomCss,
  initialExpert,
  onSave,
  onClose,
}: Props) {
  const [appearance, setAppearance] = useState<HotspotAppearanceUi>(DEFAULT_HOTSPOT_APPEARANCE);
  const [customCss, setCustomCss] = useState("");
  const [expert, setExpert] = useState(false);

  useEffect(() => {
    if (!open) return;
    const merged = mergeHotspotAppearance(initialAppearance);
    setAppearance(merged);
    const cssTrim = (initialCustomCss || "").trim();
    setExpert(!!initialExpert);
    if (initialExpert && cssTrim) {
      setCustomCss(cssTrim);
    } else {
      setCustomCss(buildCustomCssFromAppearance(merged));
    }
  }, [open, initialAppearance, initialCustomCss, initialExpert]);

  const previewCss = useMemo(() => {
    const t = customCss.trim();
    return t || buildCustomCssFromAppearance(appearance);
  }, [customCss, appearance]);

  const patchAppearance = useCallback(
    (patch: Partial<HotspotAppearanceUi>) => {
      setAppearance((prev) => {
        const next = { ...prev, ...patch };
        if (!expert) {
          setCustomCss(buildCustomCssFromAppearance(next));
        }
        return next;
      });
    },
    [expert]
  );

  const toggleExpert = useCallback(() => {
    setExpert((prev) => {
      if (prev) {
        setCustomCss(buildCustomCssFromAppearance(appearance));
        return false;
      }
      return true;
    });
  }, [appearance]);

  if (!open) return null;

  const save = () => {
    onSave({
      appearance: mergeHotspotAppearance(appearance),
      customCss: customCss.trim() || buildCustomCssFromAppearance(mergeHotspotAppearance(appearance)),
      hotspotCssExpert: expert,
    });
    onClose();
  };

  return (
    <div
      className="nodal-popup-overlay nodal-popup-overlay--nested"
      role="dialog"
      aria-modal="true"
      aria-labelledby="hotspot-appearance-title"
    >
      <div
        className="nodal-popup-backdrop"
        onClick={onClose}
        onKeyDown={(e) => e.key === "Escape" && onClose()}
      />
      <div className="nodal-popup-panel nodal-popup-panel--hotspot-appearance">
        <h2 id="hotspot-appearance-title">Apparence du hotspot (zone cliquable)</h2>
        <div className="nodal-general-layout">
          <div className="nodal-general-main">
            <div className={`nodal-ha-visual ${expert ? "nodal-ha-visual--dimmed" : ""}`}>
              <p className="nodal-popup-hint nodal-ha-visual-title">Éditeur de style visuel</p>
              <div className="nodal-popup-grid">
                <label className="nodal-popup-field">
                  <span>Largeur (px)</span>
                  <input
                    type="number"
                    min={8}
                    value={appearance.ui_w}
                    disabled={expert}
                    onChange={(e) => patchAppearance({ ui_w: Number(e.target.value) || 120 })}
                  />
                </label>
                <label className="nodal-popup-field">
                  <span>Hauteur (px)</span>
                  <input
                    type="number"
                    min={8}
                    value={appearance.ui_h}
                    disabled={expert}
                    onChange={(e) => patchAppearance({ ui_h: Number(e.target.value) || 120 })}
                  />
                </label>
              </div>
              <label className="nodal-popup-field">
                <span>Forme</span>
                <select
                  value={appearance.ui_shape}
                  disabled={expert}
                  onChange={(e) => patchAppearance({ ui_shape: e.target.value })}
                >
                  <option value="0px">Carré / rectangle</option>
                  <option value="50%">Rond</option>
                </select>
              </label>
              <div className="nodal-popup-grid">
                <label className="nodal-popup-field">
                  <span>Couleur de fond</span>
                  <input
                    type="color"
                    value={appearance.ui_bgc}
                    disabled={expert}
                    onChange={(e) => patchAppearance({ ui_bgc: e.target.value })}
                  />
                </label>
                <label className="nodal-popup-field">
                  <span>Transparence ({appearance.ui_bga})</span>
                  <input
                    type="range"
                    min={0}
                    max={1}
                    step={0.1}
                    value={appearance.ui_bga}
                    disabled={expert}
                    onChange={(e) => patchAppearance({ ui_bga: Number(e.target.value) })}
                  />
                </label>
              </div>
              <div className="nodal-popup-grid">
                <label className="nodal-popup-field">
                  <span>Bordure</span>
                  <select
                    value={appearance.ui_brd_style}
                    disabled={expert}
                    onChange={(e) => patchAppearance({ ui_brd_style: e.target.value })}
                  >
                    <option value="none">Aucune</option>
                    <option value="solid">Continue</option>
                    <option value="dashed">Pointillés</option>
                  </select>
                </label>
                <label className="nodal-popup-field">
                  <span>Épaisseur bordure (px)</span>
                  <input
                    type="number"
                    min={0}
                    value={appearance.ui_brd_w}
                    disabled={expert}
                    onChange={(e) => patchAppearance({ ui_brd_w: Number(e.target.value) || 0 })}
                  />
                </label>
              </div>
              <label className="nodal-popup-field">
                <span>Couleur bordure</span>
                <input
                  type="color"
                  value={appearance.ui_brd_c}
                  disabled={expert}
                  onChange={(e) => patchAppearance({ ui_brd_c: e.target.value })}
                />
              </label>
              <label className="nodal-popup-field">
                <span>Image URL (optionnel)</span>
                <div className="nodal-url-with-upload">
                  <input
                    className="nodal-url-with-upload__input"
                    type="text"
                    value={appearance.ui_img}
                    disabled={expert}
                    onChange={(e) => patchAppearance({ ui_img: e.target.value })}
                    placeholder="ex. icône.png ou https://…"
                  />
                  <MediaUploadButton
                    accept={MEDIA_ACCEPT_IMAGE_LOOSE}
                    disabled={expert}
                    currentUrl={(appearance.ui_img || "").trim().startsWith("blob:")
                      ? (appearance.ui_img || "").trim()
                      : undefined}
                    onPicked={(next) => patchAppearance({ ui_img: next })}
                  />
                </div>
              </label>
            </div>

            <div className="nodal-ha-css-block">
              <div className="nodal-ha-css-toolbar">
                <span className="nodal-ha-css-label">CSS généré</span>
                <button type="button" className={`nodal-ha-expert-btn ${expert ? "nodal-ha-expert-btn--on" : ""}`} onClick={toggleExpert}>
                  {expert ? "Revenir au mode visuel (régénère le CSS)" : "Mode expert (CSS libre)"}
                </button>
              </div>
              <textarea
                className="nodal-ha-css-textarea"
                rows={5}
                readOnly={!expert}
                value={customCss}
                onChange={(e) => setCustomCss(e.target.value)}
                spellCheck={false}
              />
            </div>
          </div>

          <aside className="nodal-general-preview" aria-label="Aperçu">
            <span className="nodal-general-preview-label">Aperçu</span>
            <div className="nodal-general-preview-canvas">
              <div className="nodal-general-preview-box" style={parsePreviewStyle(previewCss)} />
            </div>
          </aside>
        </div>

        <div className="nodal-popup-actions nodal-popup-actions--split">
          <button type="button" className="nodal-ha-btn-secondary" onClick={onClose}>
            Annuler
          </button>
          <button type="button" onClick={save}>
            Enregistrer
          </button>
        </div>
      </div>
    </div>
  );
}

/** Applique le CSS comme attribut style sur un div (déclarations simples `prop: val`). */
function parsePreviewStyle(css: string): CSSProperties {
  const s = css.trim();
  if (!s) return { width: 120, height: 120, background: "rgba(255,0,0,0.2)", borderRadius: 0 };
  const parts = s.split(";").map((p) => p.trim()).filter(Boolean);
  const out: Record<string, string> = {};
  for (const p of parts) {
    const i = p.indexOf(":");
    if (i === -1) continue;
    const rawKey = p.slice(0, i).trim().toLowerCase();
    const key = rawKey.replace(/-([a-z])/g, (_, c: string) => c.toUpperCase());
    const val = p.slice(i + 1).trim();
    if (key && val) out[key] = val;
  }
  return out as CSSProperties;
}
