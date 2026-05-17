/**
 * C23.2 — Chemins canoniques write-only pour le bundle `.escapegame`.
 * Miroir de `js/editor-shared-bundle-paths.js` (garder alignés).
 */

export type BundleAssetKind =
  | "audio-global"
  | "audio-ambiance"
  | "audio-sfx"
  | "image360"
  | "icone-inventaire"
  | "icone-objet"
  | "icone-hotspot"
  | "orphelin";

export type BundleAssetPathContext = {
  kind: BundleAssetKind;
  /** Requis pour `orphelin`. */
  mediaNodeId?: string;
  fileName: string;
};

export function sanitizeBundleFileName(name: string, fallback = "asset.bin"): string {
  const base = String(name || fallback)
    .split(/[/\\]/)
    .pop()!
    .replace(/[^a-zA-Z0-9._-]+/g, "_");
  if (!base || base === "." || base === "..") return fallback;
  return base.slice(0, 120);
}

/** `./assets/<type>/…/<filename>` — write-only, pas de compat lecture path plat. */
export function getAssetPath(ctx: BundleAssetPathContext): string {
  const file = sanitizeBundleFileName(ctx.fileName);
  switch (ctx.kind) {
    case "audio-global":
      return `./assets/audio/global/${file}`;
    case "audio-ambiance":
      return `./assets/audio/ambiance/${file}`;
    case "audio-sfx":
      return `./assets/audio/sfx/${file}`;
    case "image360":
      return `./assets/image360/${file}`;
    case "icone-inventaire":
      return `./assets/icone/inventaire/${file}`;
    case "icone-objet":
      return `./assets/icone/objet/${file}`;
    case "icone-hotspot":
      return `./assets/icone/hotspot/${file}`;
    case "orphelin": {
      const id = sanitizeBundleFileName(ctx.mediaNodeId || "media", "media");
      return `./assets/orphelin/${id}/${file}`;
    }
    default:
      return `./assets/orphelin/unknown/${file}`;
  }
}

export function fileNameFromPortableUrl(url: string, blobNameHint?: string): string {
  if (blobNameHint) return sanitizeBundleFileName(blobNameHint);
  const t = String(url || "").trim();
  if (t.startsWith("./assets/") || t.startsWith("assets/")) {
    const norm = t.startsWith("./assets/") ? t : `./${t}`;
    const seg = norm.replace(/^\.\/assets\//, "").split("/");
    return sanitizeBundleFileName(seg[seg.length - 1] || "asset.bin");
  }
  return sanitizeBundleFileName("media.bin");
}
