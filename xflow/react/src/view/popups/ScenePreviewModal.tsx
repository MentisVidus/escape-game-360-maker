import { useEffect, useId, useMemo, useSyncExternalStore } from "react";

import type { SceneNodeId } from "../../model/ids";
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
    close: string;
    missingTitle: string;
    missingBody: string;
    previewTitlePrefix: string;
  }
> = {
  fr: {
    close: "Fermer",
    missingTitle: "Image 360 manquante",
    missingBody: "Renseigner l’URL panorama de la scène ou lier un média image (connexion meta) avec une URL.",
    previewTitlePrefix: "👁 Aperçu :",
  },
  en: {
    close: "Close",
    missingTitle: "Missing 360 image",
    missingBody: "Set the scene panorama URL or link an image media (meta edge) with a URL.",
    previewTitlePrefix: "👁 Preview:",
  },
};

export type ScenePreviewModalProps = {
  sceneId: SceneNodeId | null;
  onClose: () => void;
};

/**
 * C18.1 — Aperçu plein écran Pannellum + hotspots (outline rouge dashed), depuis le menu s-box.
 */
export function ScenePreviewModal({ sceneId, onClose }: ScenePreviewModalProps) {
  const { store } = useNodalUi();
  const L = COPY[detectLocale()];
  const styleId = useId().replace(/:/g, "");

  const snap = useSyncExternalStore(
    store.subscribe,
    () => store.getState(),
    () => store.getState()
  );

  const scene = sceneId ? snap.scenes[sceneId] : undefined;

  const effectivePanoramaUrl = useMemo(() => {
    if (!sceneId || !scene) return "";
    return resolveScenePanoramaDisplayUrl(snap, sceneId);
  }, [sceneId, scene, snap]);

  const { projections, cssText } = useMemo(() => {
    if (!sceneId || !scene) return { projections: [] as ReturnType<typeof collectSceneHotspotProjections>["projections"], cssText: "" };
    return collectSceneHotspotProjections(snap, sceneId, {
      cssVariant: "preview",
    });
  }, [sceneId, scene, snap]);

  useEffect(() => {
    if (!sceneId) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [sceneId, onClose]);

  if (sceneId == null || !scene) return null;

  const title = `${L.previewTitlePrefix} ${scene.label || scene.sceneId}`;

  return (
    <div
      className="nodal-popup-overlay nodal-scene-preview-modal"
      role="dialog"
      aria-modal="true"
      aria-labelledby={`nodal-scene-preview-h-${styleId}`}
    >
      <div className="nodal-scene-preview-modal__backdrop" onClick={onClose} aria-hidden />
      <div className="nodal-scene-preview-modal__panel">
        <header className="nodal-scene-preview-modal__header">
          <h2 id={`nodal-scene-preview-h-${styleId}`} className="nodal-scene-preview-modal__title">
            {title}
          </h2>
          <button
            type="button"
            className="nodal-scene-preview-modal__close-x"
            onClick={onClose}
            aria-label={L.close}
          >
            ×
          </button>
        </header>
        <div className="nodal-scene-preview-modal__body">
          {!effectivePanoramaUrl ? (
            <div className="nodal-scene-preview-modal__empty">
              <p className="nodal-scene-preview-modal__empty-title">{L.missingTitle}</p>
              <p>{L.missingBody}</p>
              <button type="button" className="nodal-scene-preview-modal__close-btn" onClick={onClose}>
                {L.close}
              </button>
            </div>
          ) : (
            <>
              {cssText ? (
                <style id={`nodal-scene-preview-hs-${styleId}`}>{cssText}</style>
              ) : null}
              <NodalPanoramaViewer
                mode="preview"
                panoramaUrl={effectivePanoramaUrl}
                hotSpots={projections}
              />
            </>
          )}
        </div>
        {effectivePanoramaUrl ? (
          <footer className="nodal-scene-preview-modal__footer">
            <button type="button" className="nodal-scene-preview-modal__close-btn" onClick={onClose}>
              {L.close}
            </button>
          </footer>
        ) : null}
      </div>
    </div>
  );
}
