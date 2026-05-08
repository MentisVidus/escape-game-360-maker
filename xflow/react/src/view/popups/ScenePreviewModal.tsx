import { useCallback, useEffect, useId, useMemo, useRef, useState, useSyncExternalStore } from "react";

import type { ActionNodeId, SatelliteNodeId, SceneNodeId } from "../../model/ids";
import type { CoordsOptionsSatelliteNode } from "../../model/nodes";
import { useNodalUi } from "../nodalUiContext";
import { NodalPanoramaViewer, type NodalPanoramaViewerHandle } from "../preview/NodalPanoramaViewer";
import { collectSceneHotspotProjections, type PannellumHotSpotProjection } from "../preview/sceneHotspotProjections";
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
    editToggleOn: string;
    editToggleOff: string;
    editHint: string;
    livePrefix: string;
  }
> = {
  fr: {
    close: "Fermer",
    missingTitle: "Image 360 manquante",
    missingBody: "Renseigner l’URL panorama de la scène ou lier un média image (connexion meta) avec une URL.",
    previewTitlePrefix: "👁 Aperçu :",
    editToggleOn: "✏ Édition active — quitter",
    editToggleOff: "✏ Éditer les hotspots",
    editHint: "Glissez un hotspot pour le déplacer (Échap pour annuler).",
    livePrefix: "📍 Pitch",
  },
  en: {
    close: "Close",
    missingTitle: "Missing 360 image",
    missingBody: "Set the scene panorama URL or link an image media (meta edge) with a URL.",
    previewTitlePrefix: "👁 Preview:",
    editToggleOn: "✏ Editing — exit",
    editToggleOff: "✏ Edit hotspots",
    editHint: "Drag a hotspot to move it (Esc to cancel).",
    livePrefix: "📍 Pitch",
  },
};

export type ScenePreviewModalProps = {
  sceneId: SceneNodeId | null;
  onClose: () => void;
};

type DragState = {
  actionId: ActionNodeId;
  satelliteId: SatelliteNodeId;
  cssClass: string;
  ghostBaseCss: string;
  /** Position écran courante du curseur (pour l'overlay fantôme). */
  clientX: number;
  clientY: number;
  /** Coords live (pitch/yaw) du curseur via `mouseEventToCoords`. */
  livePitch: number;
  liveYaw: number;
};

/**
 * C18.1 — Aperçu plein écran Pannellum + hotspots (outline rouge dashed), depuis le menu s-box.
 * C18.3 — Toggle « Éditer les hotspots » + drag direct (commit immédiat au release).
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
    if (!sceneId || !scene) return { projections: [] as PannellumHotSpotProjection[], cssText: "" };
    return collectSceneHotspotProjections(snap, sceneId, {
      cssVariant: "preview",
    });
  }, [sceneId, scene, snap]);

  const [editMode, setEditMode] = useState(false);
  const [drag, setDrag] = useState<DragState | null>(null);
  const viewerHandleRef = useRef<NodalPanoramaViewerHandle | null>(null);

  /** Fermer la modale annule un drag éventuel + reset edit. */
  useEffect(() => {
    if (sceneId == null) {
      setEditMode(false);
      setDrag(null);
    }
  }, [sceneId]);

  /** Échap : annule un drag courant si actif, sinon ferme la modale. */
  useEffect(() => {
    if (!sceneId) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (drag) {
        e.preventDefault();
        setDrag(null);
        return;
      }
      onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [sceneId, onClose, drag]);

  /** Mapping cssClass → projection — utilisé pour identifier le hotspot au pointerdown. */
  const cssClassIndex = useMemo(() => {
    const m = new Map<string, PannellumHotSpotProjection>();
    for (const p of projections) m.set(p.cssClass, p);
    return m;
  }, [projections]);

  /**
   * En mode édition : `pointerdown` sur un hotspot → init drag.
   * Stratégie : listener au niveau du body de la modale, lecture de `event.target`
   * pour matcher une classe `prev-hs-...`. Pannellum génère ces divs en mode équirectangulaire,
   * donc on retrouve la cssClass directement sur l'élément cliqué.
   */
  const onBodyPointerDown = useCallback(
    (ev: React.PointerEvent<HTMLDivElement>) => {
      if (!editMode) return;
      const target = ev.target as Element | null;
      if (!target) return;
      const node = target.closest && (target.closest("[class*='prev-hs-']") as Element | null);
      if (!node) return;
      const classes = (node.getAttribute("class") || "").split(/\s+/);
      const cssClass = classes.find((c) => c.startsWith("prev-hs-"));
      if (!cssClass) return;
      const proj = cssClassIndex.get(cssClass);
      if (!proj || !proj.coordsSatelliteId) return;
      ev.stopPropagation();
      ev.preventDefault();
      setDrag({
        actionId: proj.actionId,
        satelliteId: proj.coordsSatelliteId,
        cssClass: proj.cssClass,
        ghostBaseCss: proj.ghostBaseCss,
        clientX: ev.clientX,
        clientY: ev.clientY,
        livePitch: proj.pitch,
        liveYaw: proj.yaw,
      });
    },
    [editMode, cssClassIndex]
  );

  /** `pointermove` global pendant un drag — mise à jour fantôme + coords live. */
  useEffect(() => {
    if (!drag) return;
    const onMove = (ev: PointerEvent) => {
      const handle = viewerHandleRef.current;
      const coords = handle ? handle.mouseEventToCoords(ev) : null;
      setDrag((cur) =>
        cur
          ? {
              ...cur,
              clientX: ev.clientX,
              clientY: ev.clientY,
              livePitch: coords ? coords[0] : cur.livePitch,
              liveYaw: coords ? coords[1] : cur.liveYaw,
            }
          : cur
      );
    };
    const onUp = (ev: PointerEvent) => {
      const handle = viewerHandleRef.current;
      const coords = handle ? handle.mouseEventToCoords(ev) : null;
      const finalPitch = coords ? coords[0] : drag.livePitch;
      const finalYaw = coords ? coords[1] : drag.liveYaw;
      const cur = store.getState().satellites[drag.satelliteId];
      if (cur && cur.satelliteType === "coords-options") {
        const sat = cur as CoordsOptionsSatelliteNode;
        store.getState().updateNodeData(drag.satelliteId, {
          data: { ...sat.data, pitch: finalPitch, yaw: finalYaw },
        } as never);
      }
      setDrag(null);
    };
    document.addEventListener("pointermove", onMove);
    document.addEventListener("pointerup", onUp);
    return () => {
      document.removeEventListener("pointermove", onMove);
      document.removeEventListener("pointerup", onUp);
    };
  }, [drag, store]);

  if (sceneId == null || !scene) return null;

  const title = `${L.previewTitlePrefix} ${scene.label || scene.sceneId}`;

  return (
    <div
      className="nodal-popup-overlay nodal-scene-preview-modal"
      role="dialog"
      aria-modal="true"
      aria-labelledby={`nodal-scene-preview-h-${styleId}`}
      data-edit-mode={editMode ? "1" : "0"}
    >
      <div className="nodal-scene-preview-modal__backdrop" onClick={onClose} aria-hidden />
      <div className="nodal-scene-preview-modal__panel">
        <header className="nodal-scene-preview-modal__header">
          <h2 id={`nodal-scene-preview-h-${styleId}`} className="nodal-scene-preview-modal__title">
            {title}
          </h2>
          {effectivePanoramaUrl ? (
            <button
              type="button"
              className="nodal-scene-preview-modal__edit-toggle"
              data-active={editMode ? "1" : "0"}
              onClick={() => {
                setDrag(null);
                setEditMode((m) => !m);
              }}
            >
              {editMode ? L.editToggleOn : L.editToggleOff}
            </button>
          ) : null}
          <button
            type="button"
            className="nodal-scene-preview-modal__close-x"
            onClick={onClose}
            aria-label={L.close}
          >
            ×
          </button>
        </header>
        {editMode && effectivePanoramaUrl ? (
          <div className="nodal-scene-preview-modal__edit-hint">
            {drag
              ? `${L.livePrefix} ${drag.livePitch.toFixed(1)} | Yaw ${drag.liveYaw.toFixed(1)}`
              : L.editHint}
          </div>
        ) : null}
        <div
          className="nodal-scene-preview-modal__body"
          onPointerDown={onBodyPointerDown}
        >
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
                ref={viewerHandleRef}
                mode="preview"
                panoramaUrl={effectivePanoramaUrl}
                hotSpots={projections}
              />
              {drag ? (
                <div
                  className="nodal-hotspot-ghost"
                  style={{ left: drag.clientX, top: drag.clientY }}
                  aria-hidden
                >
                  <div
                    className="nodal-hotspot-ghost__inner"
                    style={cssTextToStyleObject(drag.ghostBaseCss)}
                  />
                </div>
              ) : null}
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

/**
 * Convertit une chaîne CSS (déclarations type "width: 120px; background: …")
 * en objet React style — utilisé pour cloner visuellement un hotspot dans
 * l'overlay fantôme.
 */
function cssTextToStyleObject(cssText: string): React.CSSProperties {
  const out: Record<string, string> = {};
  const decls = String(cssText || "")
    .split(";")
    .map((d) => d.trim())
    .filter(Boolean);
  for (const decl of decls) {
    const idx = decl.indexOf(":");
    if (idx <= 0) continue;
    const prop = decl.slice(0, idx).trim();
    const value = decl.slice(idx + 1).trim();
    if (!prop) continue;
    const camel = prop.replace(/-([a-z])/g, (_m, c: string) => c.toUpperCase());
    out[camel] = value;
  }
  return out as React.CSSProperties;
}
