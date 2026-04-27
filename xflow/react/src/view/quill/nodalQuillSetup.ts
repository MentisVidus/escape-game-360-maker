/**
 * Quill 1.3.7 — même barre d’outils et formats whitelist que `js/editor-quill-scenes.js`
 * (`registerQuillRichFormatsOnce`, `quillToolbar`). Aucun import du legacy : uniquement
 * pour le bundle carte (`editor-map`).
 */
import Quill from "quill";

let formatsRegistered = false;

export function registerNodalQuillFormats(): void {
  if (formatsRegistered) return;
  const Font = Quill.import("formats/font") as { whitelist: string[] };
  Font.whitelist = ["arial", "courier", "times", "impact", "comic"];
  Quill.register(Font, true);
  const Size = Quill.import("formats/size") as { whitelist: string[] };
  Size.whitelist = ["small", "large", "huge"];
  Quill.register(Size, true);
  formatsRegistered = true;
}

/** Même définition que `quillToolbar()` dans editor-quill-scenes.js */
export function nodalQuillToolbar(): unknown[] {
  return [
    [{ header: [1, 2, 3, false] }],
    [{ font: ["arial", "courier", "times", "impact", "comic", false] }],
    [{ size: ["small", false, "large", "huge"] }],
    ["bold", "italic", "underline"],
    [{ list: "ordered" }, { list: "bullet" }],
    [{ align: [] }],
    [{ color: [] }],
    ["clean"],
  ];
}

function quillSourceApi(): string {
  const s = (Quill as unknown as { sources?: { API?: string } }).sources;
  return s?.API ?? "api";
}

/**
 * Aligné `loadHtmlIntoQuill` dans editor-quill-scenes.js : innerHTML + update(API)
 * pour ne pas perdre titres / tailles au chargement.
 */
export function loadHtmlIntoNodalQuill(quill: Quill, html: string): void {
  if (!quill) return;
  const h = String(html ?? "").trim();
  if (!h) return;
  try {
    quill.root.innerHTML = h;
    quill.update(quillSourceApi() as "api");
  } catch {
    quill.clipboard.dangerouslyPasteHTML(h);
  }
}

export { Quill };
