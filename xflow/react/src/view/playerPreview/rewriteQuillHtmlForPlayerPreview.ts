import type { NodalProject } from "../../model/project";
import type { PlayerPreviewLocale } from "./buildPlayerPreviewVariant";

const ABS_OR_SPECIAL = /^(https?:|blob:|data:)/i;

function mediaFallbackPrefix(locale: PlayerPreviewLocale): string {
  return locale === "en" ? "Media" : "Média";
}

/**
 * C18.5.2 — Q-C18.5-5 (partiel) : les `<img src="…">` avec URL absolue,
 * `blob:` ou `data:` sont laissés tels quels. Les `src` relatifs ou
 * inconnus (non résolus simplement dans la preview) sont remplacés par
 * un paragraphe texte « Média : *URL* » pour éviter un cassé silencieux.
 *
 * `project` est réservé pour une future résolution fine (médias bundle).
 */
export function rewriteQuillHtmlForPlayerPreview(
  html: string,
  _project: NodalProject,
  locale: PlayerPreviewLocale
): string {
  if (typeof document === "undefined") return html;
  try {
    const doc = new DOMParser().parseFromString(`<div id="nodal-ph-root">${html}</div>`, "text/html");
    const root = doc.getElementById("nodal-ph-root");
    if (!root) return html;
    for (const img of Array.from(root.querySelectorAll("img"))) {
      const src = (img.getAttribute("src") || "").trim();
      if (!src) continue;
      if (ABS_OR_SPECIAL.test(src)) continue;
      const p = doc.createElement("p");
      p.className = "nodal-preview-media-fallback";
      p.textContent = `${mediaFallbackPrefix(locale)} : ${src}`;
      img.replaceWith(p);
    }
    return root.innerHTML;
  } catch {
    return html;
  }
}
