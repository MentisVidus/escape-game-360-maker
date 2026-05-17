import type { MapLayoutJson } from "./mapLayoutJson";
import type { ProjectJsonV2 } from "./toProjectJson";
import { enrichProjectJsonForBundleWalker } from "./enrichProjectForBundleWalker";

function rewritePortableUrlsInClone(
  project: ProjectJsonV2,
  layout: MapLayoutJson | null | undefined,
  rewriteStr: (s: string) => string
): void {
  const enriched = enrichProjectJsonForBundleWalker(project);
  Object.assign(project, enriched);

  const R = (x: string | undefined | null) => {
    if (x == null) return x as null;
    return rewriteStr(String(x));
  };

  if (project.globalMusic?.url != null) project.globalMusic.url = R(project.globalMusic.url)!;
  if (project.invIcon != null) project.invIcon = R(project.invIcon);

  const settings = project.meta?.settings;
  if (settings?.audio?.url != null) settings.audio.url = R(settings.audio.url)!;
  if (settings?.inventoryGlobal?.icon != null) {
    settings.inventoryGlobal.icon = R(settings.inventoryGlobal.icon)!;
  }

  for (const scene of project.scenes || []) {
    if (scene.panoramaUrl != null) scene.panoramaUrl = R(scene.panoramaUrl)!;
    const media = scene.media;
    if (media?.panoramaUrl != null) media.panoramaUrl = R(media.panoramaUrl)!;
    const amb = media?.ambiance;
    if (amb && typeof amb === "object" && amb.url != null) amb.url = R(amb.url)!;
    for (const hs of scene.hotspots || []) {
      if (hs.appearance?.ui_img != null) hs.appearance.ui_img = R(hs.appearance.ui_img)!;
      const walk = (action: typeof hs.action | undefined) => {
        if (!action) return;
        if (action.sfx?.url != null) action.sfx.url = R(action.sfx.url)!;
        const nested = action.payload?.nested as { choices?: Array<{ action?: typeof hs.action }> } | undefined;
        nested?.choices?.forEach((c) => walk(c.action));
        const reward = action.payload?.rewardAction as typeof hs.action | undefined;
        if (reward) walk(reward);
      };
      walk(hs.action);
    }
  }

  if (!layout) return;
  for (const o of Object.values(layout.inventoryObjects || {})) {
    if (o?.iconUrl != null) o.iconUrl = R(o.iconUrl)!;
  }
  for (const snap of Object.values(layout.nodalAutoSatelliteData || {})) {
    const ui = snap?.coords?.appearance?.ui_img;
    if (ui != null) snap!.coords!.appearance!.ui_img = R(ui)!;
  }
  for (const m of Object.values(layout.nodalMedia || {})) {
    if (m?.data?.url != null) m.data.url = R(m.data.url)!;
  }
}

/** Simule l’écriture save : `blob:` → `./assets/<type>/...`. */
export function rewriteBlobUrlsToAssetPaths(
  project: ProjectJsonV2,
  layout: MapLayoutJson | null | undefined,
  urlToAssetPath: Map<string, string>
): void {
  rewritePortableUrlsInClone(project, layout, (s) => {
    const t = s.trim();
    return urlToAssetPath.get(t) ?? urlToAssetPath.get(s) ?? s;
  });
}

/** Simule le load : `./assets/...` → `blob:` via `pathToBlobUrl`. */
export function rewritePortableUrlsForLoad(
  project: ProjectJsonV2,
  layout: MapLayoutJson | null | undefined,
  pathToBlobUrl: Record<string, string>
): void {
  rewritePortableUrlsInClone(project, layout, (s) => {
    const t = s.trim();
    const c = t.startsWith("./assets/") ? t : t.startsWith("assets/") ? `./${t}` : null;
    if (c && pathToBlobUrl[c]) return pathToBlobUrl[c];
    if (pathToBlobUrl[t]) return pathToBlobUrl[t];
    return s;
  });
}
