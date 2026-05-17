import type { MediaNodeId, SatelliteNodeId } from "../model/ids";
import type { NodalProject } from "../model/project";

/** Référence `./assets/...` (write-only C23.2+). */
export function isBundleAssetRef(url: string): boolean {
  const t = url.trim();
  return t.startsWith("./assets/") || t.startsWith("assets/");
}

export type BundleSessionResolver = {
  /** `./assets/...` → URL `blob:` de session, ou `null` si introuvable. */
  resolveToSessionBlobUrl: (assetRef: string) => string | null;
};

function resolvePortableUrl(url: string | undefined | null, resolver: BundleSessionResolver): string {
  if (url == null) return "";
  const t = String(url).trim();
  if (!t) return "";
  if (t.startsWith("blob:") || t.startsWith("http") || t.startsWith("data:")) return t;
  if (isBundleAssetRef(t)) {
    const next = resolver.resolveToSessionBlobUrl(t.startsWith("./") ? t : `./${t}`);
    if (next) return next;
  }
  return t;
}

function fileNameFromAssetRef(ref: string): string {
  const norm = ref.startsWith("./assets/") ? ref : `./${ref.replace(/^assets\//, "assets/")}`;
  const seg = norm.replace(/^\.\/assets\//, "").split("/");
  return seg[seg.length - 1] || "media";
}

/**
 * C23.3 — Reconnexion store après load `.escapegame` (Map JS pure, pas de DOM).
 */
export function reconnectBundleMediaInStore(state: NodalProject, resolver: BundleSessionResolver): void {
  for (const m of Object.values(state.media)) {
    if (!m?.data || m.data.url == null) continue;
    const next = resolvePortableUrl(m.data.url, resolver);
    if (next !== m.data.url) m.data.url = next;
  }

  const settings = state.meta.settings;
  if (settings?.audio?.url != null) {
    settings.audio.url = resolvePortableUrl(settings.audio.url, resolver);
  }
  if (settings?.inventoryGlobal?.icon != null) {
    settings.inventoryGlobal.icon = resolvePortableUrl(settings.inventoryGlobal.icon, resolver);
  }

  for (const o of Object.values(state.meta.objects)) {
    if (o?.iconUrl != null) o.iconUrl = resolvePortableUrl(o.iconUrl, resolver);
  }

  for (const sat of Object.values(state.satellites)) {
    if (sat.satelliteType !== "coords-options") continue;
    const app = sat.data.appearance;
    if (app?.ui_img != null) {
      app.ui_img = resolvePortableUrl(app.ui_img, resolver);
    }
  }

  for (const sc of Object.values(state.scenes)) {
    if (sc.panoramaUrl != null) sc.panoramaUrl = resolvePortableUrl(sc.panoramaUrl, resolver);
  }

  for (const a of Object.values(state.actions)) {
    if (a.sfx?.url != null) a.sfx.url = resolvePortableUrl(a.sfx.url, resolver);
  }
}

export function listOrphanedMediaNodes(state: NodalProject): MediaNodeId[] {
  const linked = new Set<string>();
  for (const e of state.edges) {
    if (e.family === "meta" && e.targetId in state.media) linked.add(e.targetId);
  }
  for (const o of Object.values(state.meta.objects)) {
    if (o?.iconMediaId) linked.add(o.iconMediaId);
  }
  return (Object.keys(state.media) as MediaNodeId[]).filter((id) => !linked.has(id));
}

export function orphanMediaWarningLabel(state: NodalProject, mediaId: MediaNodeId): string {
  const m = state.media[mediaId];
  const url = m?.data?.url != null ? String(m.data.url).trim() : "";
  const name = url && isBundleAssetRef(url) ? fileNameFromAssetRef(url) : url || m?.label || mediaId;
  return `Média non rattaché : "${name}" — il sera sauvegardé dans ./assets/orphelin/ mais n'apparaîtra pas dans le jeu.`;
}

export function satelliteIdsWithAppearance(state: NodalProject): SatelliteNodeId[] {
  return (Object.keys(state.satellites) as SatelliteNodeId[]).filter((id) => {
    const s = state.satellites[id];
    return s?.satelliteType === "coords-options";
  });
}
