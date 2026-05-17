import { getAssetPath, fileNameFromPortableUrl, type BundleAssetKind } from "../model/bundleAssetPath";
import type { MapLayoutJson } from "./mapLayoutJson";
import type { ProjectJsonV2 } from "./toProjectJson";
import { enrichProjectJsonForBundleWalker } from "./enrichProjectForBundleWalker";

export type BundleMediaEntry = {
  url: string;
  kind: BundleAssetKind;
  mediaNodeId?: string;
  fileName: string;
};

const isPortableUrl = (s: string) => /^(https?:|blob:|data:|\.\/)/i.test(s);

/** Miroir `collectBundleMediaEntries` (editor-shared-bundle-paths.js) pour tests Vitest. */
export function collectBundleMediaEntries(
  project: ProjectJsonV2,
  layout: MapLayoutJson | null | undefined
): BundleMediaEntry[] {
  const entries: BundleMediaEntry[] = [];
  const seen = new Set<string>();
  const add = (url: string, kind: BundleAssetKind, extra?: { mediaNodeId?: string; fileName?: string }) => {
    const s = String(url).trim();
    if (!s || seen.has(s)) return;
    if (!s.startsWith("blob:") && !s.startsWith("./assets/") && !s.startsWith("assets/")) return;
    seen.add(s);
    entries.push({
      url: s,
      kind,
      mediaNodeId: extra?.mediaNodeId,
      fileName: extra?.fileName ?? fileNameFromPortableUrl(s),
    });
  };

  const settings = project.meta?.settings;
  if (settings?.audio?.url) add(settings.audio.url, "audio-global");
  if (project.globalMusic?.url) add(project.globalMusic.url, "audio-global");
  if (settings?.inventoryGlobal?.icon && isPortableUrl(String(settings.inventoryGlobal.icon))) {
    add(String(settings.inventoryGlobal.icon), "icone-inventaire");
  }
  if (project.invIcon != null && isPortableUrl(String(project.invIcon))) {
    add(String(project.invIcon), "icone-inventaire");
  }

  for (const scene of project.scenes || []) {
    if (scene.panoramaUrl) add(scene.panoramaUrl, "image360");
    const media = scene.media;
    if (media?.panoramaUrl) add(media.panoramaUrl, "image360");
    const amb = media?.ambiance;
    if (typeof amb === "string") add(amb, "audio-ambiance");
    else if (amb?.url) add(amb.url, "audio-ambiance");
    for (const hs of scene.hotspots || []) {
      const ui = hs.appearance?.ui_img;
      if (ui && isPortableUrl(ui)) add(ui, "icone-hotspot");
      const walk = (action: typeof hs.action | undefined) => {
        if (!action) return;
        if (action.sfx?.url) add(action.sfx.url, "audio-sfx");
        const nested = action.payload?.nested as { choices?: Array<{ action?: typeof hs.action }> } | undefined;
        nested?.choices?.forEach((c) => walk(c.action));
        const reward = action.payload?.rewardAction as typeof hs.action | undefined;
        if (reward) walk(reward);
      };
      walk(hs.action);
    }
  }

  if (layout) {
    for (const o of Object.values(layout.inventoryObjects || {})) {
      if (o?.iconUrl && isPortableUrl(o.iconUrl)) add(o.iconUrl, "icone-objet");
    }
    for (const snap of Object.values(layout.nodalAutoSatelliteData || {})) {
      const ui = snap?.coords?.appearance?.ui_img;
      if (ui && isPortableUrl(ui)) add(ui, "icone-hotspot");
    }
    const linked = new Set<string>();
    for (const l of layout.nodalMetaMediaLinks || []) linked.add(l.mediaId);
    for (const l of layout.nodalSceneMetaMediaLinks || []) linked.add(l.mediaId);
    for (const o of Object.values(layout.inventoryObjects || {})) {
      if (o?.iconMediaId) linked.add(o.iconMediaId);
    }
    for (const [mid, m] of Object.entries(layout.nodalMedia || {})) {
      if (linked.has(mid)) continue;
      const url = m?.data?.url;
      if (url) add(String(url), "orphelin", { mediaNodeId: mid });
    }
  }

  return entries;
}

export function buildTypedPathMapForEntries(
  entries: BundleMediaEntry[]
): Map<string, string> {
  const used = new Set<string>();
  const map = new Map<string, string>();
  for (const ent of entries) {
    let desired = getAssetPath({
      kind: ent.kind,
      mediaNodeId: ent.mediaNodeId,
      fileName: ent.fileName,
    });
    let n = 0;
    const dot = desired.lastIndexOf(".");
    const slash = desired.lastIndexOf("/");
    const stem = dot > slash ? desired.slice(0, dot) : desired;
    const ext = dot > slash ? desired.slice(dot) : "";
    while (used.has(desired)) {
      n++;
      desired = stem + "_" + n + ext;
    }
    used.add(desired);
    map.set(ent.url.trim(), desired);
    if (ent.url !== ent.url.trim()) map.set(ent.url, desired);
  }
  return map;
}

/** Simule save bundle : enrich + collect + paths typés (sans ZIP). */
export function simulateBundlePathsOnProject(
  project: ProjectJsonV2,
  layout: MapLayoutJson | null | undefined
): { enriched: ProjectJsonV2; pathByUrl: Map<string, string> } {
  const enriched = enrichProjectJsonForBundleWalker(JSON.parse(JSON.stringify(project)) as ProjectJsonV2);
  const entries = collectBundleMediaEntries(enriched, layout);
  const pathByUrl = buildTypedPathMapForEntries(entries);
  return { enriched, pathByUrl };
}
