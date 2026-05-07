import { useEffect, useState, useSyncExternalStore } from "react";

import type { ActionNode, CoordsOptionsSatelliteNode } from "../../model/nodes";
import { findSceneOfHotspotSatellite } from "../../store/findSceneOfHotspotSatellite";
import { useNodalUi } from "../nodalUiContext";
import { HotspotAppearancePopup } from "./HotspotAppearancePopup";

function detectLocale(): "fr" | "en" {
  if (typeof document === "undefined") return "fr";
  return document.documentElement.lang?.toLowerCase().startsWith("en") ? "en" : "fr";
}

const PICK_LABELS = {
  fr: { btn: "📍 Placer sur l'image", tip: "Disponible pour les hotspots de scène uniquement." },
  en: { btn: "📍 Place on image", tip: "Available for scene hotspots only." },
} as const;

type Props = {
  satellite: CoordsOptionsSatelliteNode | null;
  parentAction: ActionNode | null;
  onChangeSatellite: (patch: CoordsOptionsSatelliteNode["data"]) => void;
  onChangeActionOptions: (patch: {
    visibility: { requiresItem: string; hiddenIfHasItem: string; clickWhenInvisible: boolean };
  }) => void;
  onClose: () => void;
};

export function CoordsOptionsPopup({
  satellite,
  parentAction,
  onChangeSatellite,
  onChangeActionOptions,
  onClose,
}: Props) {
  const ui = useNodalUi();
  const snap = useSyncExternalStore(ui.store.subscribe, () => ui.store.getState(), () => ui.store.getState());
  const pickEnabled = satellite ? findSceneOfHotspotSatellite(snap, satellite.id) != null : false;
  const Lpick = PICK_LABELS[detectLocale()];

  const [pitch, setPitch] = useState("0");
  const [yaw, setYaw] = useState("0");
  const [requiresItem, setRequiresItem] = useState("");
  const [hiddenIfHasItem, setHiddenIfHasItem] = useState("");
  const [clickWhenInvisible, setClickWhenInvisible] = useState(true);
  const [appearanceOpen, setAppearanceOpen] = useState(false);

  useEffect(() => {
    if (!satellite) {
      setAppearanceOpen(false);
      return;
    }
    const satVis = satellite.data.visibility;
    const aVis = parentAction?.visibility;
    setPitch(String(satellite.data.pitch ?? 0));
    setYaw(String(satellite.data.yaw ?? 0));
    setRequiresItem(String((aVis?.requiresItem ?? satVis.requiresItem) || ""));
    setHiddenIfHasItem(String((aVis?.hiddenIfHasItem ?? satVis.hiddenIfHasItem) || ""));
    setClickWhenInvisible((aVis?.clickWhenInvisible ?? satVis.clickWhenInvisible) !== false);
  }, [satellite, parentAction]);

  if (!satellite) return null;

  const openAppearance = () => setAppearanceOpen(true);

  const buildVisibility = (clickOverride?: boolean) => {
    const cwi = clickOverride !== undefined ? clickOverride : clickWhenInvisible;
    return {
      requiresItem: requiresItem.trim(),
      hiddenIfHasItem: hiddenIfHasItem.trim(),
      clickWhenInvisible: !!cwi,
    };
  };

  const pushCoords = (visibility: ReturnType<typeof buildVisibility>) => {
    const pitchNum = Number(pitch);
    const yawNum = Number(yaw);
    onChangeSatellite({
      ...satellite.data,
      pitch: Number.isFinite(pitchNum) ? pitchNum : 0,
      yaw: Number.isFinite(yawNum) ? yawNum : 0,
      visibility,
    });
    onChangeActionOptions({ visibility });
  };

  const apply = () => {
    pushCoords(buildVisibility());
  };

  const onClickWhenInvisibleChange = (next: boolean) => {
    setClickWhenInvisible(next);
    pushCoords(buildVisibility(next));
  };

  return (
    <>
    <div className="nodal-popup-overlay" role="dialog" aria-modal="true" aria-labelledby="coords-options-title">
      <div className="nodal-popup-backdrop" onClick={onClose} />
      <div className="nodal-popup-panel">
        <h2 id="coords-options-title">Options hotspot (coords)</h2>
        <div className="nodal-popup-grid">
          <label className="nodal-popup-field">
            <span>Pitch</span>
            <input
              type="number"
              value={pitch}
              onChange={(e) => setPitch(e.target.value)}
              onBlur={apply}
              step="0.1"
            />
          </label>
          <label className="nodal-popup-field">
            <span>Yaw</span>
            <input type="number" value={yaw} onChange={(e) => setYaw(e.target.value)} onBlur={apply} step="0.1" />
          </label>
        </div>
        <div className="nodal-coords-pick-row">
          <button
            type="button"
            className="nodal-coords-pick-btn"
            disabled={!pickEnabled}
            title={!pickEnabled ? Lpick.tip : undefined}
            onClick={() => {
              if (!satellite || !pickEnabled) return;
              ui.openCoordsPicker(satellite.id);
            }}
          >
            {Lpick.btn}
          </button>
        </div>
        <label className="nodal-popup-field">
          <span>requiresItem</span>
          <input type="text" value={requiresItem} onChange={(e) => setRequiresItem(e.target.value)} onBlur={apply} />
        </label>
        <label className="nodal-popup-field">
          <span>hiddenIfHasItem</span>
          <input
            type="text"
            value={hiddenIfHasItem}
            onChange={(e) => setHiddenIfHasItem(e.target.value)}
            onBlur={apply}
          />
        </label>
        <label className="nodal-popup-check">
          <input
            type="checkbox"
            checked={clickWhenInvisible}
            onChange={(e) => onClickWhenInvisibleChange(e.target.checked)}
          />
          clickWhenInvisible
        </label>
        <p className="nodal-popup-hint">
          SFX : relier un nœud <strong>média audio</strong> à l’action (handle meta) et renseigner l’URL dans la
          popup du nœud média.
        </p>
        <div className="nodal-coords-appearance-row">
          <button type="button" className="nodal-coords-appearance-btn" onClick={openAppearance}>
            Apparence (style visuel)…
          </button>
        </div>
        <div className="nodal-popup-actions">
          <button type="button" onClick={onClose}>
            Fermer
          </button>
        </div>
      </div>
    </div>
    <HotspotAppearancePopup
      open={appearanceOpen}
      initialAppearance={satellite.data.appearance ?? null}
      initialCustomCss={satellite.data.customCss ?? null}
      initialExpert={satellite.data.hotspotCssExpert ?? false}
      onSave={(payload) => {
        onChangeSatellite({
          ...satellite.data,
          appearance: payload.appearance,
          customCss: payload.customCss,
          hotspotCssExpert: payload.hotspotCssExpert,
        });
      }}
      onClose={() => setAppearanceOpen(false)}
    />
    </>
  );
}
