import type { DragEvent as ReactDragEvent } from "react";

import type { PaletteInsertSpec } from "../../store/insertNodeAtAbsolute";
import "../nodes/nodes.css";

const GHOST_OPACITY = 0.7;

function actionSubtitle(
  actionType: Extract<PaletteInsertSpec, { kind: "action" }>["actionType"]
): string {
  switch (actionType) {
    case "msg":
      return "Message";
    case "pick":
      return "Pick";
    case "goto":
      return "Goto";
    case "selector":
      return "Selector";
    case "req":
      return "Req";
    case "pwd":
      return "Pwd";
  }
}

function buildGhostNode(spec: PaletteInsertSpec, locale: "fr" | "en"): HTMLDivElement {
  const wrap = document.createElement("div");
  wrap.className = "nodal-node";
  const titleEl = document.createElement("div");
  titleEl.className = "title";
  const subEl = document.createElement("div");
  subEl.className = "subtitle";

  if (spec.kind === "scene") {
    wrap.className += " scene";
    titleEl.textContent = locale === "en" ? "Scene" : "Scène";
    subEl.textContent = locale === "en" ? "360° panorama" : "Panorama 360°";
  } else if (spec.kind === "action") {
    wrap.className += ` action action-${spec.actionType} action-node--orphan action-msg--clickable`;
    titleEl.textContent = spec.actionType.toUpperCase();
    subEl.textContent = actionSubtitle(spec.actionType);
  } else {
    wrap.className += " media media--clickable";
    titleEl.textContent = "Media";
    subEl.textContent =
      spec.mediaType === "media-image"
        ? locale === "en"
          ? "Image"
          : "Image"
        : locale === "en"
          ? "Audio"
          : "Audio";
  }

  wrap.append(titleEl, subEl);
  return wrap;
}

/**
 * C9.4 — `setDragImage` : mini-nœud (classes `nodes.css`), opacité ~70 %,
 * point chaud centré (Q-C9.4-1…3).
 */
export function setPaletteDragGhostImage(
  e: ReactDragEvent<HTMLElement>,
  spec: PaletteInsertSpec,
  locale: "fr" | "en"
): void {
  const host = document.createElement("div");
  host.className = "nodal-palette-drag-ghost-host";
  host.style.position = "fixed";
  host.style.left = "-12000px";
  host.style.top = "0";
  host.style.opacity = String(GHOST_OPACITY);
  host.style.pointerEvents = "none";
  host.style.zIndex = "2147483646";
  host.setAttribute("aria-hidden", "true");

  host.appendChild(buildGhostNode(spec, locale));
  document.body.appendChild(host);
  void host.offsetWidth;
  const w = host.offsetWidth || 160;
  const h = host.offsetHeight || 48;
  const ox = Math.round(w / 2);
  const oy = Math.round(h / 2);

  try {
    e.dataTransfer.setDragImage(host, ox, oy);
  } catch {
    /* certains navigateurs restreignent setDragImage */
  }

  const onEnd = () => {
    host.remove();
    window.removeEventListener("dragend", onEnd);
  };
  window.addEventListener("dragend", onEnd, { passive: true });
}
