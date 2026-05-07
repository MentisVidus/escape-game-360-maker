import { useEffect, useId, useRef } from "react";

import { normalizePanoramaUrl } from "./panoramaUrl";
import type { PannellumHotSpotProjection } from "./sceneHotspotProjections";

export type NodalPanoramaViewerMode = "preview" | "picker";

type PannellumViewer = {
  destroy: () => void;
  mouseEventToCoords?: (e: MouseEvent) => [number, number];
  on?: (ev: string, cb: () => void) => void;
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

  useEffect(() => {
    if (mode !== "picker" || !onPick) return;
    const el = hostRef.current;
    if (!el) return;
    const onClick = (ev: MouseEvent) => {
      const v = viewerRef.current;
      if (!v?.mouseEventToCoords) return;
      const coords = v.mouseEventToCoords(ev);
      if (!coords) return;
      onPick(coords[0], coords[1]);
    };
    el.addEventListener("click", onClick);
    return () => el.removeEventListener("click", onClick);
  }, [mode, onPick]);

  return (
    <div
      ref={hostRef}
      id={stableIdRef.current}
      className="nodal-panorama-viewer-host"
      data-mode={mode}
    />
  );
}

/**
 * // Q-C18-4 fallback — réactiver si UX clic-position jugée insuffisante
 */
export function PickerCrosshairOverlay() {
  return <div className="nodal-picker-crosshair-overlay" aria-hidden />;
}
