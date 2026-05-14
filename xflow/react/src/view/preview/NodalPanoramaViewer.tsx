import { forwardRef, useEffect, useId, useImperativeHandle, useMemo, useRef } from "react";

import { normalizePanoramaUrl } from "./panoramaUrl";
import type { PannellumHotSpotProjection } from "./sceneHotspotProjections";

export type NodalPanoramaViewerMode = "preview" | "picker";

type PannellumViewer = {
  destroy: () => void;
  mouseEventToCoords?: (e: MouseEvent) => [number, number];
  on?: (ev: string, cb: () => void) => void;
  getPitch?: () => number;
  getYaw?: () => number;
  /** C18.4-fix.4 — hfov courant (zoom). Capturé à la cleanup pour réutilisation. */
  getHfov?: () => number;
  /**
   * C18.4-fix.1 — `setUpdate(false)` déclenche en interne `G()` puis `ca()`,
   * qui exécute `Fa()` (`hotSpots.forEach(Ca)`) une fois et repositionne
   * tous les hotspots en fonction de leur `offsetWidth/Height` courant.
   * Source : pannellum 2.5.7, fonction `Ca` (centrage via
   * `f[0] += (p - offsetWidth) / 2`) appelée dans la boucle d'animation `Fa`.
   */
  setUpdate?: (a: boolean) => unknown;
  /**
   * C18.4-fix.3 — `getRenderer()` retourne le renderer interne `C` (pannellum
   * 2.5.7 ligne 105). `null/undefined` quand le viewer est en cours de
   * destruction ou n'a pas fini sa première initialisation. Utilisé comme
   * garde dans `forceHotSpotsRecompute` pour éviter que `setUpdate(false)`
   * ne re-déclenche `pa()` (re-init complète) → erreur WebGL `texImage2D: no
   * image`.
   */
  getRenderer?: () => unknown;
};

type PannellumApi = {
  viewer: (container: string | HTMLElement, config: Record<string, unknown>) => PannellumViewer;
};

function getPannellum(): PannellumApi | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as { pannellum?: PannellumApi };
  return w.pannellum && typeof w.pannellum.viewer === "function" ? w.pannellum : null;
}

export type NodalPanoramaViewerProps = {
  panoramaUrl: string;
  mode: NodalPanoramaViewerMode;
  hotSpots?: PannellumHotSpotProjection[];
  initialPitch?: number;
  initialYaw?: number;
  onPick?: (pitch: number, yaw: number) => void;
  onReady?: () => void;
};

/** Handle imperative — expose la résolution clientX/Y → pitch/yaw via Pannellum. */
export type NodalPanoramaViewerHandle = {
  /** Retourne `[pitch, yaw]` pour la position écran d'un MouseEvent (ou `null` si indisponible). */
  mouseEventToCoords: (ev: MouseEvent) => [number, number] | null;
  /**
   * C18.4 — accès au container DOM du viewer (host Pannellum). Utilisé par
   * `<HotspotResizeHandles>` pour lire les `getBoundingClientRect()` des
   * hotspots projetés et y aligner les handles overlay.
   */
  getViewerContainer: () => HTMLElement | null;
  /**
   * C18.4-fix.1 — force Pannellum à exécuter `Fa()` une fois pour
   * repositionner tous les hotspots. Indispensable quand on modifie
   * `width/height` d'un hotspot via CSS : sans appel, la transform
   * Pannellum reste figée avec l'ancienne `offsetWidth/2` → le hotspot
   * paraît grandir vers le bas-droite (top-left visuellement fixe).
   */
  forceHotSpotsRecompute: () => void;
};

/**
 * Viewer Pannellum equirectangulaire — preview (C18.1), picker (C18.2),
 * ou aperçu interactif (C18.3 — drag des hotspots, géré par le parent
 * via le handle `mouseEventToCoords`).
 */
export const NodalPanoramaViewer = forwardRef<NodalPanoramaViewerHandle, NodalPanoramaViewerProps>(function NodalPanoramaViewer(
  { panoramaUrl, mode, hotSpots, initialPitch, initialYaw, onPick, onReady },
  outerRef
) {
  const hostRef = useRef<HTMLDivElement>(null);
  const reactId = useId().replace(/:/g, "");
  const stableIdRef = useRef(`nodal-pnm-${reactId}`);
  const viewerRef = useRef<PannellumViewer | null>(null);
  /**
   * C18.2-fix.2 — `initialPitch`/`initialYaw` sont des valeurs *initiales*
   * (capturées au montage). On les fige dans un ref pour qu'elles ne
   * déclenchent pas la recréation du viewer Pannellum à chaque tick du
   * poll picker (sinon le drag est interrompu en permanence).
   * Pour ré-initialiser à de nouvelles coords (changement de cible),
   * remonter le composant via une `key` côté parent.
   *
   * C18.4-fix.4 — Ces refs sont aussi mises à jour à la cleanup du
   * `useEffect` ci-dessous (lecture `getPitch`/`getYaw`/`getHfov`)
   * pour qu'une recréation **légitime** du viewer (pitch/yaw d'un
   * hotspot modifiés via drag C18.3, ce qui change `hotSpotsKey`)
   * reprenne la caméra à la position courante au lieu de sauter à
   * la position initiale.
   */
  const initialPitchRef = useRef(initialPitch ?? 0);
  const initialYawRef = useRef(initialYaw ?? 0);
  const initialHfovRef = useRef<number | undefined>(undefined);
  const onReadyRef = useRef(onReady);
  onReadyRef.current = onReady;

  /**
   * C18.4-fix.3 — Signature stable de la liste de hotspots transmis à
   * Pannellum. Pannellum ne dépend que du triplet `(pitch, yaw, cssClass)`
   * pour positionner les hotspots ; les autres champs (`actionId`,
   * `coordsSatelliteId`, `ghostBaseCss`) sont consommés uniquement côté
   * parent (drag, resize). Sans cette stabilisation, chaque mutation du
   * store qui régénère `projections` (ex. commit ui_w/ui_h en C18.4)
   * changeait la référence du tableau `hotSpots` → l'effect ci-dessous
   * détruisait + recréait le viewer à chaque pointerup → flash de
   * chargement panorama + race condition WebGL si un appel concurrent
   * (`forceHotSpotsRecompute`) frappait pendant l'init.
   */
  const hotSpotsKey = useMemo(
    () => (hotSpots ?? []).map((h) => `${h.pitch}|${h.yaw}|${h.cssClass}`).join(";"),
    [hotSpots]
  );
  const hotSpotsRef = useRef(hotSpots);
  hotSpotsRef.current = hotSpots;

  useEffect(() => {
    const el = hostRef.current;
    if (!el || !panoramaUrl.trim()) return;

    const api = getPannellum();
    if (!api) return;

    if (viewerRef.current) {
      viewerRef.current.destroy();
      viewerRef.current = null;
    }

    const hs =
      hotSpotsRef.current?.map((h) => ({
        pitch: h.pitch,
        yaw: h.yaw,
        type: "info" as const,
        cssClass: h.cssClass,
      })) ?? [];

    const viewerConfig: Record<string, unknown> = {
      type: "equirectangular",
      panorama: normalizePanoramaUrl(panoramaUrl),
      autoLoad: true,
      hotSpots: hs,
      pitch: initialPitchRef.current,
      yaw: initialYawRef.current,
      showControls: false,
      // C18.4-fix.2 — Désactive l'intégralité des raccourcis clavier Pannellum
      // (W/A/S/D, +, -, Shift+keys, …). Sinon Shift maintenu pendant le resize
      // (ratio fixe) déclenche un zoom Pannellum non voulu. Le zoom à la
      // molette reste actif (mouseZoom non désactivé).
      disableKeyboardCtrl: true,
      keyboardZoom: false,
    };
    // C18.4-fix.4 — n'écrit `hfov` que s'il a été capturé (sinon on laisse le
    // défaut Pannellum 100°). Évite de figer un hfov à 0 au tout premier mount.
    if (typeof initialHfovRef.current === "number" && Number.isFinite(initialHfovRef.current)) {
      viewerConfig.hfov = initialHfovRef.current;
    }
    const viewer = api.viewer(el, viewerConfig);
    viewerRef.current = viewer;

    const onLoad = () => onReadyRef.current?.();
    viewer.on?.("load", onLoad);

    return () => {
      // C18.4-fix.4 — capture la position caméra courante avant destroy.
      // Une recréation légitime (changement `hotSpotsKey` après commit drag
      // C18.3 — pitch/yaw d'un hotspot modifiés) reprend la vue à
      // l'identique au lieu de sauter aux valeurs initiales.
      try {
        if (typeof viewer.getPitch === "function") {
          const p = viewer.getPitch();
          if (Number.isFinite(p)) initialPitchRef.current = p;
        }
        if (typeof viewer.getYaw === "function") {
          const y = viewer.getYaw();
          if (Number.isFinite(y)) initialYawRef.current = y;
        }
        if (typeof viewer.getHfov === "function") {
          const h = viewer.getHfov();
          if (Number.isFinite(h)) initialHfovRef.current = h;
        }
      } catch {
        /* viewer non initialisé — on garde les refs telles quelles. */
      }
      viewer.destroy();
      if (viewerRef.current === viewer) viewerRef.current = null;
    };
    // C18.4-fix.3 — `hotSpotsKey` (signature pitch/yaw/cssClass) au lieu de la
    // référence de tableau. Les autres champs (ghostBaseCss, etc.) ne touchent
    // pas Pannellum et sont consommés via `hotSpotsRef.current` à la prochaine
    // recréation.
  }, [panoramaUrl, hotSpotsKey]);

  /**
   * C18.2-fix — viseur central : pitch/yaw lus en continu sur le centre
   * caméra (Pannellum `getPitch()` / `getYaw()`). Le clic ne pilote plus
   * la sélection — il sert au drag normal de la vue 360.
   */
  useEffect(() => {
    if (mode !== "picker" || !onPick) return;
    let lastP = Number.NaN;
    let lastY = Number.NaN;
    const read = () => {
      const v = viewerRef.current;
      if (!v?.getPitch || !v.getYaw) return;
      const p = v.getPitch();
      const y = v.getYaw();
      if (!Number.isFinite(p) || !Number.isFinite(y)) return;
      if (p === lastP && y === lastY) return;
      lastP = p;
      lastY = y;
      onPick(p, y);
    };
    read();
    const id = window.setInterval(read, 120);
    return () => window.clearInterval(id);
  }, [mode, onPick]);

  useImperativeHandle(
    outerRef,
    () => ({
      mouseEventToCoords(ev: MouseEvent) {
        const v = viewerRef.current;
        if (!v?.mouseEventToCoords) return null;
        const c = v.mouseEventToCoords(ev);
        if (!c || !Number.isFinite(c[0]) || !Number.isFinite(c[1])) return null;
        return [c[0], c[1]];
      },
      getViewerContainer() {
        return hostRef.current;
      },
      forceHotSpotsRecompute() {
        const v = viewerRef.current;
        if (!v?.setUpdate) return;
        // C18.4-fix.3 — Pannellum `setUpdate(C===p?pa():G())` : si le renderer
        // interne `C` est `undefined` (viewer en cours de destruction ou
        // d'initialisation), `setUpdate` retombe dans `pa()` (re-init complète,
        // re-upload texture) → `texImage2D: no image` si la texture n'est pas
        // encore chargée. On garde `setUpdate` derrière un check renderer.
        try {
          if (typeof v.getRenderer === "function") {
            const renderer = v.getRenderer();
            if (renderer == null) return;
          }
          v.setUpdate(false);
        } catch {
          /* viewer pas encore prêt — silencieux. */
        }
      },
    }),
    []
  );

  return (
    <div className="nodal-panorama-viewer-frame" data-mode={mode}>
      <div
        ref={hostRef}
        id={stableIdRef.current}
        className="nodal-panorama-viewer-host"
        data-mode={mode}
      />
      {mode === "picker" ? <PickerCrosshairOverlay /> : null}
    </div>
  );
});

/** Viseur central (croix) — superposé en mode picker, n'intercepte pas la souris. */
export function PickerCrosshairOverlay() {
  return <div className="nodal-picker-crosshair-overlay" aria-hidden />;
}
