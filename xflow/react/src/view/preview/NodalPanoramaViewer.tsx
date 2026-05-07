import { useEffect, useId, useRef } from "react";

import { normalizePanoramaUrl } from "./panoramaUrl";
import type { PannellumHotSpotProjection } from "./sceneHotspotProjections";

export type NodalPanoramaViewerMode = "preview" | "picker";

type PannellumViewer = {
  destroy: () => void;
  mouseEventToCoords?: (e: MouseEvent) => [number, number];
  on?: (ev: string, cb: () => void) => void;
  getPitch?: () => number;
  getYaw?: () => number;
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

/**
 * Viewer Pannellum equirectangulaire — preview (C18.1) ou picker (C18.2).
 */
export function NodalPanoramaViewer({
  panoramaUrl,
  mode,
  hotSpots,
  initialPitch,
  initialYaw,
  onPick,
  onReady,
}: NodalPanoramaViewerProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const reactId = useId().replace(/:/g, "");
  const stableIdRef = useRef(`nodal-pnm-${reactId}`);
  const viewerRef = useRef<PannellumViewer | null>(null);

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
      hotSpots?.map((h) => ({
        pitch: h.pitch,
        yaw: h.yaw,
        type: "info" as const,
        cssClass: h.cssClass,
      })) ?? [];

    const viewer = api.viewer(el, {
      type: "equirectangular",
      panorama: normalizePanoramaUrl(panoramaUrl),
      autoLoad: true,
      hotSpots: hs,
      pitch: initialPitch ?? 0,
      yaw: initialYaw ?? 0,
      showControls: false,
    });
    viewerRef.current = viewer;

    const onLoad = () => onReady?.();
    viewer.on?.("load", onLoad);

    return () => {
      viewer.destroy();
      if (viewerRef.current === viewer) viewerRef.current = null;
    };
  }, [panoramaUrl, hotSpots, initialPitch, initialYaw, onReady]);

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
}

/** Viseur central (croix) — superposé en mode picker, n'intercepte pas la souris. */
export function PickerCrosshairOverlay() {
  return <div className="nodal-picker-crosshair-overlay" aria-hidden />;
}
