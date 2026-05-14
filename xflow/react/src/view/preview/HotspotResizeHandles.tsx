import { useEffect, useRef, useState } from "react";

import type { ActionNodeId, SatelliteNodeId } from "../../model/ids";

export type HotspotHandleCorner = "nw" | "ne" | "sw" | "se";

/** C18.4 — sélection courante (1 hotspot à la fois). */
export type HotspotSelection = {
  actionId: ActionNodeId;
  satelliteId: SatelliteNodeId;
  /** Classe CSS unique du hotspot (`prev-hs-...`) — utilisée pour `querySelector`. */
  cssClass: string;
};

/**
 * Init transmis au parent au pointerdown sur un handle. Le parent capture la
 * taille initiale au moment du pointerdown (via le rect courant lu par
 * `<HotspotResizeHandles>`) et calcule pendant le pointermove en
 * autonomie (cf. `ScenePreviewModal`).
 */
export type HotspotResizeInit = {
  corner: HotspotHandleCorner;
  /** `getBoundingClientRect()` du hotspot au moment du pointerdown. */
  rect: DOMRect;
};

export type HotspotResizeHandlesProps = {
  selection: HotspotSelection;
  /** Container DOM du viewer Pannellum (host des hotspots). */
  viewerContainer: HTMLElement | null;
  onResizeStart: (init: HotspotResizeInit, ev: PointerEvent) => void;
  /**
   * Si fourni, force les handles à se positionner sur ce rect (utilisé
   * pendant un resize pour suivre la nouvelle taille calculée par le
   * parent, plutôt que d'attendre que Pannellum re-layout le hotspot).
   */
  overrideRect?: DOMRect | null;
};

const CORNERS: HotspotHandleCorner[] = ["nw", "ne", "sw", "se"];

function cornerPoint(rect: DOMRect, corner: HotspotHandleCorner): { x: number; y: number } {
  switch (corner) {
    case "nw":
      return { x: rect.left, y: rect.top };
    case "ne":
      return { x: rect.right, y: rect.top };
    case "sw":
      return { x: rect.left, y: rect.bottom };
    case "se":
      return { x: rect.right, y: rect.bottom };
  }
}

/**
 * 4 handles overlay (`position: fixed`) calés sur les coins du hotspot
 * sélectionné. Le rect est lu via rAF (Pannellum repositionne les
 * hotspots à chaque rotation/zoom). En l'absence d'élément DOM (hotspot
 * hors champ caméra) ou de container viewer, les handles sont masqués.
 */
export function HotspotResizeHandles({
  selection,
  viewerContainer,
  onResizeStart,
  overrideRect,
}: HotspotResizeHandlesProps) {
  const [rect, setRect] = useState<DOMRect | null>(null);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    const tick = () => {
      if (cancelled) return;
      // C18.4 — scope de recherche : d'abord le container viewer (où Pannellum
      // injecte les hotspots en prod) ; sinon `document` en fallback (utile en
      // tests où le mock Pannellum n'injecte rien dans le host, mais la
      // cssClass reste unique au niveau modale).
      let el: HTMLElement | null = null;
      if (viewerContainer) {
        el = viewerContainer.querySelector(`.${selection.cssClass}`) as HTMLElement | null;
      }
      if (!el) {
        el = document.querySelector(`.${selection.cssClass}`) as HTMLElement | null;
      }
      if (!el) {
        setRect((cur) => (cur === null ? cur : null));
      } else {
        const r = el.getBoundingClientRect();
        if (r.width === 0 && r.height === 0) {
          setRect((cur) => (cur === null ? cur : null));
        } else {
          setRect((cur) => {
            if (
              cur &&
              cur.left === r.left &&
              cur.top === r.top &&
              cur.right === r.right &&
              cur.bottom === r.bottom
            ) {
              return cur;
            }
            return r;
          });
        }
      }
      rafRef.current = window.requestAnimationFrame(tick);
    };
    rafRef.current = window.requestAnimationFrame(tick);
    return () => {
      cancelled = true;
      if (rafRef.current != null) window.cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    };
  }, [viewerContainer, selection.cssClass]);

  const effectiveRect = overrideRect ?? rect;
  if (!effectiveRect) return null;

  return (
    <>
      {CORNERS.map((corner) => {
        const { x, y } = cornerPoint(effectiveRect, corner);
        return (
          <div
            key={corner}
            className={`nodal-hotspot-handle nodal-hotspot-handle--${corner}`}
            data-corner={corner}
            style={{ left: x, top: y }}
            onPointerDown={(ev) => {
              ev.stopPropagation();
              ev.preventDefault();
              let liveEl: HTMLElement | null = null;
              if (viewerContainer) {
                liveEl = viewerContainer.querySelector(`.${selection.cssClass}`) as HTMLElement | null;
              }
              if (!liveEl) {
                liveEl = document.querySelector(`.${selection.cssClass}`) as HTMLElement | null;
              }
              const liveRect = liveEl ? liveEl.getBoundingClientRect() : effectiveRect;
              onResizeStart({ corner, rect: liveRect }, ev.nativeEvent);
            }}
            aria-label={`resize-${corner}`}
            role="button"
          />
        );
      })}
    </>
  );
}
