import { useCallback, useEffect, useId, useMemo, useRef, useState, useSyncExternalStore } from "react";

import type { ActionNodeId, SatelliteNodeId, SceneNodeId } from "../../model/ids";
import {
  buildCustomCssFromAppearance,
  DEFAULT_HOTSPOT_APPEARANCE,
  mergeHotspotAppearance,
} from "../../model/hotspotAppearance";
import type { CoordsOptionsSatelliteNode } from "../../model/nodes";
import { useNodalUi } from "../nodalUiContext";
import {
  HotspotResizeHandles,
  type HotspotHandleCorner,
  type HotspotResizeInit,
  type HotspotSelection,
} from "../preview/HotspotResizeHandles";
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
    resizePrefix: string;
  }
> = {
  fr: {
    close: "Fermer",
    missingTitle: "Image 360 manquante",
    missingBody: "Renseigner l’URL panorama de la scène ou lier un média image (connexion meta) avec une URL.",
    previewTitlePrefix: "👁 Aperçu :",
    editToggleOn: "✏ Édition active — quitter",
    editToggleOff: "✏ Éditer les hotspots",
    editHint:
      "Glissez un hotspot pour le déplacer • Cliquez pour sélectionner / redimensionner • Shift = ratio fixe.",
    livePrefix: "📍 Pitch",
    resizePrefix: "↔",
  },
  en: {
    close: "Close",
    missingTitle: "Missing 360 image",
    missingBody: "Set the scene panorama URL or link an image media (meta edge) with a URL.",
    previewTitlePrefix: "👁 Preview:",
    editToggleOn: "✏ Editing — exit",
    editToggleOff: "✏ Edit hotspots",
    editHint:
      "Drag a hotspot to move it • Click to select / resize • Shift = lock aspect ratio.",
    livePrefix: "📍 Pitch",
    resizePrefix: "↔",
  },
};

export type ScenePreviewModalProps = {
  sceneId: SceneNodeId | null;
  onClose: () => void;
};

/**
 * Drag déjà actif (ghost rendu, pitch/yaw live affichés). Promu depuis
 * `DragCandidate` quand le pointer franchit le seuil 4 px.
 */
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
 * C18.4 — entre pointerdown et seuil 4 px : on n'a pas encore décidé si
 * c'est un drag (déplacement) ou un clic-pour-sélectionner. On stocke
 * juste les infos nécessaires à la promotion en drag (ou à la sélection
 * au pointerup avant seuil).
 */
type DragCandidate = {
  actionId: ActionNodeId;
  satelliteId: SatelliteNodeId;
  cssClass: string;
  ghostBaseCss: string;
  startClientX: number;
  startClientY: number;
  /** Pitch/yaw initiaux de la projection — utilisés comme valeurs live initiales si promotion en drag. */
  initialPitch: number;
  initialYaw: number;
};

/** C18.4 — état resize actif (un coin tiré). */
type ResizeState = {
  satelliteId: SatelliteNodeId;
  cssClass: string;
  corner: HotspotHandleCorner;
  initialW: number;
  initialH: number;
  initialAspectRatio: number;
  /** Centre écran du hotspot au pointerdown (ancrage du resize). */
  centerX: number;
  centerY: number;
  /** Dimensions courantes pendant le drag (pour live hint + override handles). */
  currentW: number;
  currentH: number;
};

const RESIZE_MIN_PX = 16;
const RESIZE_MAX_PX = 800;
/** Seuil clic→drag (px) — sous ce déplacement, le pointerup déclenche un select. */
const DRAG_THRESHOLD_PX = 4;

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/**
 * C18.1 — Aperçu plein écran Pannellum + hotspots (outline rouge dashed), depuis le menu s-box.
 * C18.3 — Toggle « Éditer les hotspots » + drag direct (commit immédiat au release).
 * C18.4 — Sélection d'un hotspot (clic simple en mode édition) + 4 handles de
 * resize aux coins, ancrés au centre. Shift = ratio fixe ; bornes 16-800 px.
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
  const [dragCandidate, setDragCandidate] = useState<DragCandidate | null>(null);
  const [drag, setDrag] = useState<DragState | null>(null);
  const [selection, setSelection] = useState<HotspotSelection | null>(null);
  const [resize, setResize] = useState<ResizeState | null>(null);
  const viewerHandleRef = useRef<NodalPanoramaViewerHandle | null>(null);

  /** Mapping cssClass → projection — utilisé pour identifier le hotspot au pointerdown. */
  const cssClassIndex = useMemo(() => {
    const m = new Map<string, PannellumHotSpotProjection>();
    for (const p of projections) m.set(p.cssClass, p);
    return m;
  }, [projections]);

  /** Reset complet à la fermeture (sceneId null) ou à la sortie du mode édition. */
  useEffect(() => {
    if (sceneId == null) {
      setEditMode(false);
      setDrag(null);
      setDragCandidate(null);
      setSelection(null);
      setResize(null);
    }
  }, [sceneId]);

  /**
   * Échap : priorité (1) annule un resize, (2) annule un drag, (3) désélectionne,
   * (4) ferme la modale (comportement C18.1).
   */
  useEffect(() => {
    if (!sceneId) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (resize) {
        e.preventDefault();
        setResize(null);
        return;
      }
      if (drag || dragCandidate) {
        e.preventDefault();
        setDrag(null);
        setDragCandidate(null);
        return;
      }
      if (selection) {
        e.preventDefault();
        setSelection(null);
        return;
      }
      onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [sceneId, onClose, drag, dragCandidate, selection, resize]);

  /**
   * Pointerdown sur le body de la modale — distingue 3 cibles :
   *   1. hotspot existant en mode édition → init `dragCandidate` (clic vs drag décidé au move/up).
   *   2. handle de resize (intercepté en amont par `<HotspotResizeHandles>` qui stopPropagation).
   *   3. ailleurs (panorama nu, header, …) en mode édition → désélectionne et clear resize.
   */
  const onBodyPointerDown = useCallback(
    (ev: React.PointerEvent<HTMLDivElement>) => {
      if (!editMode) return;
      const target = ev.target as Element | null;
      if (!target) return;
      const handleEl = target.closest && target.closest(".nodal-hotspot-handle");
      if (handleEl) return;
      const node = target.closest && (target.closest("[class*='prev-hs-']") as Element | null);
      if (!node) {
        if (selection || resize) {
          setSelection(null);
          setResize(null);
        }
        return;
      }
      const classes = (node.getAttribute("class") || "").split(/\s+/);
      const cssClass = classes.find((c) => c.startsWith("prev-hs-"));
      if (!cssClass) return;
      const proj = cssClassIndex.get(cssClass);
      if (!proj || !proj.coordsSatelliteId) return;
      ev.stopPropagation();
      ev.preventDefault();
      setDragCandidate({
        actionId: proj.actionId,
        satelliteId: proj.coordsSatelliteId,
        cssClass: proj.cssClass,
        ghostBaseCss: proj.ghostBaseCss,
        startClientX: ev.clientX,
        startClientY: ev.clientY,
        initialPitch: proj.pitch,
        initialYaw: proj.yaw,
      });
    },
    [editMode, cssClassIndex, selection, resize]
  );

  /**
   * Listeners globaux pour le couple `dragCandidate` / `drag` :
   *   - move : promotion du candidat en drag dès qu'on dépasse le seuil ; sinon mise à jour live du drag actif.
   *   - up   : drag actif → commit pitch/yaw ; candidat sans drag → sélection.
   */
  useEffect(() => {
    if (!drag && !dragCandidate) return;

    const onMove = (ev: PointerEvent) => {
      const handle = viewerHandleRef.current;
      const coords = handle ? handle.mouseEventToCoords(ev) : null;
      if (drag) {
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
        return;
      }
      if (dragCandidate) {
        const dx = ev.clientX - dragCandidate.startClientX;
        const dy = ev.clientY - dragCandidate.startClientY;
        if (Math.hypot(dx, dy) > DRAG_THRESHOLD_PX) {
          setDrag({
            actionId: dragCandidate.actionId,
            satelliteId: dragCandidate.satelliteId,
            cssClass: dragCandidate.cssClass,
            ghostBaseCss: dragCandidate.ghostBaseCss,
            clientX: ev.clientX,
            clientY: ev.clientY,
            livePitch: coords ? coords[0] : dragCandidate.initialPitch,
            liveYaw: coords ? coords[1] : dragCandidate.initialYaw,
          });
          setDragCandidate(null);
        }
      }
    };

    const onUp = (ev: PointerEvent) => {
      if (drag) {
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
        return;
      }
      if (dragCandidate) {
        setSelection({
          actionId: dragCandidate.actionId,
          satelliteId: dragCandidate.satelliteId,
          cssClass: dragCandidate.cssClass,
        });
        setDragCandidate(null);
      }
    };

    document.addEventListener("pointermove", onMove);
    document.addEventListener("pointerup", onUp);
    return () => {
      document.removeEventListener("pointermove", onMove);
      document.removeEventListener("pointerup", onUp);
    };
  }, [drag, dragCandidate, store]);

  /** Listeners globaux pendant un resize : pointermove recalcule W/H, pointerup commit. */
  useEffect(() => {
    if (!resize) return;
    const onMove = (ev: PointerEvent) => {
      const dx = ev.clientX - resize.centerX;
      const dy = ev.clientY - resize.centerY;
      let newW = clamp(2 * Math.abs(dx), RESIZE_MIN_PX, RESIZE_MAX_PX);
      let newH = clamp(2 * Math.abs(dy), RESIZE_MIN_PX, RESIZE_MAX_PX);
      if (ev.shiftKey) {
        // Ratio fixe : on cherche l'échelle dominante (plus grosse) puis on l'applique
        // à la dimension initiale. Légère dérive possible si une dimension touche le clamp.
        const scaleW = newW / resize.initialW;
        const scaleH = newH / resize.initialH;
        const scale = Math.max(scaleW, scaleH);
        newW = clamp(resize.initialW * scale, RESIZE_MIN_PX, RESIZE_MAX_PX);
        newH = clamp(resize.initialH * scale, RESIZE_MIN_PX, RESIZE_MAX_PX);
      }
      setResize((cur) => (cur ? { ...cur, currentW: newW, currentH: newH } : cur));
      // C18.4-fix.1 — Pannellum centre les hotspots via `(canvasW - offsetWidth)/2` à chaque
      // appel à `Ca` (cf. pannellum.js ligne ~75). Sans recompute, sa transform reste figée
      // avec l'ancienne `offsetWidth/2` → le hotspot paraît grandir vers le bas-droite (le
      // coin top-left visuellement fixe). On force un appel à `Fa()` pour que la transform
      // se ré-aligne sur la nouvelle taille → centrage propre sur le pitch/yaw projeté.
      viewerHandleRef.current?.forceHotSpotsRecompute();
    };
    const onUp = () => {
      const cur = store.getState().satellites[resize.satelliteId];
      if (cur && cur.satelliteType === "coords-options") {
        const sat = cur as CoordsOptionsSatelliteNode;
        const merged = mergeHotspotAppearance({
          ...(sat.data.appearance ?? DEFAULT_HOTSPOT_APPEARANCE),
          ui_w: Math.round(resize.currentW),
          ui_h: Math.round(resize.currentH),
        });
        store.getState().updateNodeData(resize.satelliteId, {
          data: {
            ...sat.data,
            appearance: merged,
            customCss: buildCustomCssFromAppearance(merged),
          },
        } as never);
      }
      setResize(null);
      // C18.4-fix.1 — recompute final déclenché par l'effet `resize === null`
      // ci-dessous, qui s'exécute après que React a appliqué le re-render
      // (et donc la régénération du cssText à partir du nouveau customCss).
    };
    document.addEventListener("pointermove", onMove);
    document.addEventListener("pointerup", onUp);
    return () => {
      document.removeEventListener("pointermove", onMove);
      document.removeEventListener("pointerup", onUp);
    };
  }, [resize, store]);

  /**
   * C18.4-fix.1 — Quand `resize` repasse à null **après** avoir été non-null
   * (commit pointerup, Échap, ou bascule toggle off), un recompute final
   * synchronise Pannellum avec la taille effective (override style retiré,
   * customCss éventuellement restauré). Un ref évite de déclencher au mount
   * initial où `resize` est déjà null.
   */
  const prevResizeRef = useRef<ResizeState | null>(null);
  useEffect(() => {
    const wasResizing = prevResizeRef.current !== null;
    prevResizeRef.current = resize;
    if (resize !== null) return;
    if (!wasResizing) return;
    const id = window.requestAnimationFrame(() => {
      viewerHandleRef.current?.forceHotSpotsRecompute();
    });
    return () => window.cancelAnimationFrame(id);
  }, [resize]);

  /**
   * Pointerdown sur un handle (`<HotspotResizeHandles>` propage `onResizeStart`).
   * On capture la taille initiale (préférentiellement depuis l'`appearance` du satellite,
   * pour avoir une valeur stable indépendante du rect DOM ; le rect sert au calcul
   * du centre — ancrage du resize au centre).
   */
  const onResizeStart = useCallback(
    (init: HotspotResizeInit) => {
      if (!selection) return;
      const sat = store.getState().satellites[selection.satelliteId];
      if (!sat || sat.satelliteType !== "coords-options") return;
      const app = mergeHotspotAppearance(sat.data.appearance);
      const initialW = Number.isFinite(app.ui_w) && app.ui_w > 0 ? app.ui_w : init.rect.width || DEFAULT_HOTSPOT_APPEARANCE.ui_w;
      const initialH = Number.isFinite(app.ui_h) && app.ui_h > 0 ? app.ui_h : init.rect.height || DEFAULT_HOTSPOT_APPEARANCE.ui_h;
      setResize({
        satelliteId: selection.satelliteId,
        cssClass: selection.cssClass,
        corner: init.corner,
        initialW,
        initialH,
        initialAspectRatio: initialH > 0 ? initialW / initialH : 1,
        centerX: init.rect.left + init.rect.width / 2,
        centerY: init.rect.top + init.rect.height / 2,
        currentW: initialW,
        currentH: initialH,
      });
    },
    [selection, store]
  );

  /** Override rect durant le resize : centre figé, dimensions courantes. */
  const resizeOverrideRect = useMemo<DOMRect | null>(() => {
    if (!resize) return null;
    const halfW = resize.currentW / 2;
    const halfH = resize.currentH / 2;
    const left = resize.centerX - halfW;
    const top = resize.centerY - halfH;
    return new DOMRect(left, top, resize.currentW, resize.currentH);
  }, [resize]);

  /** Sortie du mode édition → reset systématique sélection / drag / resize. */
  const exitEditMode = useCallback(() => {
    setEditMode(false);
    setDrag(null);
    setDragCandidate(null);
    setSelection(null);
    setResize(null);
  }, []);

  if (sceneId == null || !scene) return null;

  const title = `${L.previewTitlePrefix} ${scene.label || scene.sceneId}`;

  let hintText = L.editHint;
  if (resize) {
    hintText = `${L.resizePrefix} ${Math.round(resize.currentW)}px × ${Math.round(resize.currentH)}px`;
  } else if (drag) {
    hintText = `${L.livePrefix} ${drag.livePitch.toFixed(1)} | Yaw ${drag.liveYaw.toFixed(1)}`;
  }

  return (
    <div
      className="nodal-popup-overlay nodal-scene-preview-modal"
      role="dialog"
      aria-modal="true"
      aria-labelledby={`nodal-scene-preview-h-${styleId}`}
      data-edit-mode={editMode ? "1" : "0"}
      data-selection={selection ? "1" : "0"}
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
                if (editMode) {
                  exitEditMode();
                } else {
                  setEditMode(true);
                }
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
          <div className="nodal-scene-preview-modal__edit-hint">{hintText}</div>
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
              {resize ? (
                <style id={`nodal-scene-preview-hs-resize-${styleId}`}>
                  {`.${resize.cssClass} { width: ${Math.round(resize.currentW)}px !important; height: ${Math.round(resize.currentH)}px !important; }`}
                </style>
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
              {editMode && selection ? (
                <HotspotResizeHandles
                  selection={selection}
                  viewerContainer={viewerHandleRef.current?.getViewerContainer() ?? null}
                  onResizeStart={onResizeStart}
                  overrideRect={resizeOverrideRect}
                />
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
