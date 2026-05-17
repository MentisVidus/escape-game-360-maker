import type { ProjectJsonV2, ProjectJsonV2Scene } from "./toProjectJson";

/**
 * C23.2 — Complète le JSON nodal pour `eachPortableMediaUrlInProject` legacy
 * (globalMusic, invIcon, scene.media, hotspot appearance) sans polluer le round-trip métier.
 */
export function enrichProjectJsonForBundleWalker(project: ProjectJsonV2): ProjectJsonV2 {
  const out = JSON.parse(JSON.stringify(project)) as ProjectJsonV2;
  const settings = out.meta?.settings;

  if (settings?.audio) {
    out.globalMusic = {
      url: String(settings.audio.url ?? ""),
      volume:
        typeof settings.audio.volume === "number" && !Number.isNaN(settings.audio.volume)
          ? Math.max(0, Math.min(1, settings.audio.volume))
          : 0.5,
    };
    if (settings.audio.enabled === false && !String(settings.audio.url ?? "").trim()) {
      out.useGlobalAudio = false;
    } else if (settings.audio.enabled) {
      out.useGlobalAudio = true;
    }
  }

  if (settings?.inventoryGlobal?.icon != null) {
    out.invIcon = String(settings.inventoryGlobal.icon);
  }

  out.scenes = (out.scenes || []).map((scene) => enrichSceneForBundleWalker(scene));

  return out;
}

function enrichSceneForBundleWalker(scene: ProjectJsonV2Scene): ProjectJsonV2Scene {
  const media = scene.media || {
    panoramaUrl: scene.panoramaUrl ?? "",
    ambiance: { url: "", volume: 1 },
  };
  const panoramaUrl =
    media.panoramaUrl != null && String(media.panoramaUrl).trim()
      ? String(media.panoramaUrl).trim()
      : String(scene.panoramaUrl ?? "").trim();
  return {
    ...scene,
    panoramaUrl,
    media: {
      panoramaUrl,
      ambiance:
        media.ambiance && typeof media.ambiance === "object"
          ? { url: String(media.ambiance.url ?? ""), volume: media.ambiance.volume ?? 1 }
          : { url: "", volume: 1 },
    },
    hotspots: (scene.hotspots || []).map((hs) => ({
      ...hs,
      appearance: hs.appearance ? { ...hs.appearance } : hs.appearance,
    })),
  };
}
