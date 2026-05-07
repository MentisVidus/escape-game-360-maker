import { useCallback, useEffect, useId, useMemo, useState, useSyncExternalStore } from "react";

import type { SatelliteNodeId } from "../../model/ids";
import { findSceneOfHotspotSatellite } from "../../store/findSceneOfHotspotSatellite";
import { isEditingContext } from "../keyboard/isEditingContext";
import { useNodalUi } from "../nodalUiContext";
import { NodalPanoramaViewer } from "../preview/NodalPanoramaViewer";
import { collectSceneHotspotProjections } from "../preview/sceneHotspotProjections";
import { resolveScenePanoramaDisplayUrl } from "../preview/scenePanoramaDisplay";

type Locale = "fr" | "en";

function detectLocale(): Locale {
  if (typeof document === "undefined") return "fr";
  return document.documentElement.lang?.toLowerCase().startsWith("en") ? "en" : "fr";
}

const COPY: Record<
  Locale,
  {
    cancel: string;
    validate: string;
    close: string;
    targetMissing: string;
    missingPanorama: string;
    missingPanoramaBody: string;
    headerPrefix: string;
  }
> = {
  fr: {
    cancel: "Annuler",
    validate: "Valider",
    close: "Fermer",
    targetMissing: "Cible introuvable",
    missingPanorama: "Image 360 manquante",
    missingPanoramaBody: "Renseigner l’URL panorama de la scène ou lier un média image (meta).",
    headerPrefix: "📍 Cible : Pitch",
  },
  en: {
    cancel: "Cancel",
    validate: "OK",
    close: "Close",
    targetMissing: "Target not found",
    missingPanorama: "Missing 360 image",
    missingPanoramaBody: "Set the scene panorama URL or link an image media (meta).",
    headerPrefix: "📍 Target: Pitch",
  },
};

export type CoordsPickerModalProps = {
  satelliteId: SatelliteNodeId | null;
  onClose: () => void;
};

/**
 * C18.2 — Placement pitch/yaw sur le panorama (Pannellum mode picker).
 */
export function CoordsPickerModal({ satelliteId, onClose }: CoordsPickerModalProps) {
  const { store } = useNodalUi();
  const L = COPY[detectLocale()];
  const styleId = useId().replace(/:/g, "");

  const snap = useSyncExternalStore(
    store.subscribe,
    () => store.getState(),
    () => store.getState()
  );

  const resolved = useMemo(() => {
    if (!satelliteId) return null;
    return findSceneOfHotspotSatellite(snap, satelliteId);
  }, [satelliteId, snap]);

  const satellite = satelliteId ? snap.satellites[satelliteId] : undefined;
  const isCoords = satellite?.satelliteType === "coords-options";

  const [live, setLive] = useState({ pitch: 0, yaw: 0 });

  const onPick = useCallback((p: number, y: number) => {
    setLive({ pitch: p, yaw: y });
  }, []);

  useEffect(() => {
    if (!satelliteId) return;
    const s = store.getState().satellites[satelliteId];
    if (!s || s.satelliteType !== "coords-options") return;
    setLive({
      pitch: Number(s.data.pitch) || 0,
      yaw: Number(s.data.yaw) || 0,
    });
  }, [satelliteId, store]);

  const effectivePanoramaUrl = useMemo(() => {
    if (!resolved) return "";
    return resolveScenePanoramaDisplayUrl(snap, resolved.sceneId);
  }, [snap, resolved]);

  const { projections, cssText } = useMemo(() => {
    if (!resolved) return { projections: [] as ReturnType<typeof collectSceneHotspotProjections>["projections"], cssText: "" };
    return collectSceneHotspotProjections(snap, resolved.sceneId, {
      excludeIds: [resolved.actionId],
      cssVariant: "picker-bg",
    });
  }, [snap, resolved]);

  const commit = useCallback(() => {
    if (!satelliteId || !isCoords) return;
    const cur = store.getState().satellites[satelliteId];
    if (!cur || cur.satelliteType !== "coords-options") return;
    store.getState().updateNodeData(satelliteId, {
      data: { ...cur.data, pitch: live.pitch, yaw: live.yaw },
    } as never);
    onClose();
  }, [satelliteId, isCoords, store, live.pitch, live.yaw, onClose]);

  useEffect(() => {
    if (!satelliteId) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
        return;
      }
      if (e.key === "Enter" && !isEditingContext(e.target)) {
        e.preventDefault();
        commit();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [satelliteId, onClose, commit]);

  if (satelliteId == null) return null;

  if (!resolved) {
    return (
      <div
        className="nodal-popup-overlay nodal-coords-picker-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby={`nodal-coords-picker-h-${styleId}`}
      >
        <div className="nodal-scene-preview-modal__backdrop" onClick={onClose} aria-hidden />
        <div className="nodal-coords-picker-modal__panel nodal-coords-picker-modal__panel--compact">
          <header className="nodal-coords-picker-modal__header">
            <h2 id={`nodal-coords-picker-h-${styleId}`}>{L.targetMissing}</h2>
            <button type="button" className="nodal-scene-preview-modal__close-x" onClick={onClose} aria-label={L.close}>
              ×
            </button>
          </header>
          <div className="nodal-coords-picker-modal__body nodal-coords-picker-modal__body--message">
            <button type="button" className="nodal-scene-preview-modal__close-btn" onClick={onClose}>
              {L.close}
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!satellite || satellite.satelliteType !== "coords-options") return null;

  if (!effectivePanoramaUrl.trim()) {
    return (
      <div
        className="nodal-popup-overlay nodal-coords-picker-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby={`nodal-coords-picker-h-${styleId}`}
      >
        <div className="nodal-scene-preview-modal__backdrop" onClick={onClose} aria-hidden />
        <div className="nodal-coords-picker-modal__panel">
          <header className="nodal-coords-picker-modal__header">
            <h2 id={`nodal-coords-picker-h-${styleId}`}>{L.missingPanorama}</h2>
            <button type="button" className="nodal-scene-preview-modal__close-x" onClick={onClose} aria-label={L.close}>
              ×
            </button>
          </header>
          <div className="nodal-coords-picker-modal__body nodal-coords-picker-modal__body--message">
            <p className="nodal-scene-preview-modal__empty-title">{L.missingPanorama}</p>
            <p>{L.missingPanoramaBody}</p>
            <button type="button" className="nodal-scene-preview-modal__close-btn" onClick={onClose}>
              {L.close}
            </button>
          </div>
        </div>
      </div>
    );
  }

  const headerTitle = `${L.headerPrefix} ${live.pitch.toFixed(1)} | Yaw ${live.yaw.toFixed(1)}`;

  return (
    <div
      className="nodal-popup-overlay nodal-coords-picker-modal"
      role="dialog"
      aria-modal="true"
      aria-labelledby={`nodal-coords-picker-h-${styleId}`}
    >
      <div className="nodal-scene-preview-modal__backdrop" onClick={onClose} aria-hidden />
      <div className="nodal-coords-picker-modal__panel">
        <header className="nodal-coords-picker-modal__header">
          <h2 id={`nodal-coords-picker-h-${styleId}`} className="nodal-coords-picker-modal__title-live">
            {headerTitle}
          </h2>
          <button type="button" className="nodal-scene-preview-modal__close-x" onClick={onClose} aria-label={L.cancel}>
            ×
          </button>
        </header>
        <div className="nodal-coords-picker-modal__body">
          {cssText ? <style id={`nodal-coords-picker-hs-${styleId}`}>{cssText}</style> : null}
          <NodalPanoramaViewer
            mode="picker"
            panoramaUrl={effectivePanoramaUrl}
            initialPitch={live.pitch}
            initialYaw={live.yaw}
            hotSpots={projections}
            onPick={onPick}
          />
        </div>
        <footer className="nodal-coords-picker-modal__footer">
          <button type="button" className="nodal-scene-preview-modal__close-btn" onClick={onClose}>
            {L.cancel}
          </button>
          <button type="button" className="nodal-coords-picker-modal__btn-primary" onClick={commit}>
            {L.validate}
          </button>
        </footer>
      </div>
    </div>
  );
}
