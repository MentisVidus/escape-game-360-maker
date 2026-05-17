import { describe, expect, it } from "vitest";

import { asActionNodeId, asEdgeId, asMediaNodeId, asSceneNodeId } from "../model/ids";
import type { SceneNode } from "../model/nodes";
import { resolveLinkedMediaAudioAmbianceForScene } from "../model/sceneAmbianceProjection";
import { resolveScenePanoramaUrlForExport } from "../model/scenePanoramaProjection";
import { resolveHotspotUiImgForAction } from "../model/hotspotAppearanceProjection";
import { enrichProjectJsonForBundleWalker } from "../serialize/enrichProjectForBundleWalker";
import {
  collectBundleMediaEntries,
  simulateBundlePathsOnProject,
} from "../serialize/bundleExportSimulation";
import {
  rewriteBlobUrlsToAssetPaths,
  rewritePortableUrlsForLoad,
} from "../serialize/bundleLoadSimulation";
import { serializeLayout } from "../serialize/mapLayoutJson";
import { stableActionNodeIdFromPathKey, stableSceneNodeIdFromExternal } from "../serialize/fromProjectJson";
import { serializeToProjectJson } from "../serialize/toProjectJson";
import { computeWarnings } from "../store/computeWarnings";
import { createNodalProjectStore } from "../store/nodalProjectStore";
import {
  reconnectBundleMediaInStore,
  type BundleSessionResolver,
} from "../store/reconnectBundleMedia";

const BLOB = {
  global: "blob:https://session.test/global.mp3",
  amb: "blob:https://session.test/amb.mp3",
  sfx: "blob:https://session.test/sfx.mp3",
  pano: "blob:https://session.test/pano.jpg",
  hud: "blob:https://session.test/hud.png",
  hs: "blob:https://session.test/hs.png",
  obj: "blob:https://session.test/obj.png",
  orphan: "blob:https://session.test/orphan.jpg",
};

function buildFixtureStore() {
  const store = createNodalProjectStore();
  const sceneId = stableSceneNodeIdFromExternal("room");
  const sc: SceneNode = {
    id: sceneId,
    nodeType: "scene",
    sceneId: "room",
    label: "Room",
    panoramaUrl: "",
  };
  store.getState().addScene(sc, { x: 0, y: 0 });

  const panMid = asMediaNodeId("media-pano");
  store.getState().addMedia(
    { id: panMid, nodeType: "media", mediaType: "media-image", label: "Pano", data: { url: BLOB.pano } },
    { x: 0, y: 0 }
  );
  store.getState().connect({
    id: asEdgeId("e-pano"),
    family: "meta",
    sourceId: sceneId,
    targetId: panMid,
  });

  const ambMid = asMediaNodeId("media-amb");
  store.getState().addMedia(
    {
      id: ambMid,
      nodeType: "media",
      mediaType: "media-audio",
      label: "Amb",
      data: { url: BLOB.amb, volume: 0.7 },
    },
    { x: 0, y: 0 }
  );
  store.getState().connect({
    id: asEdgeId("e-amb"),
    family: "meta",
    sourceId: sceneId,
    targetId: ambMid,
  });

  const actionId = asActionNodeId("act-hs");
  store.getState().addAction(
    {
      id: actionId,
      nodeType: "action",
      actionType: "msg",
      label: "HS",
      payload: { copy: { bodyHtml: "", buttonLabel: "" } },
      sfx: { url: "", volume: 1 },
      visibility: { requiresItem: "", hiddenIfHasItem: "", clickWhenInvisible: true },
    },
    { x: 10, y: 10, parentId: sceneId }
  );
  store.getState().connect({
    id: asEdgeId("e-flow"),
    family: "flow",
    sourceId: sceneId,
    targetId: actionId,
  });

  const sfxMid = asMediaNodeId("media-sfx");
  store.getState().addMedia(
    {
      id: sfxMid,
      nodeType: "media",
      mediaType: "media-audio",
      label: "Sfx",
      data: { url: BLOB.sfx, volume: 1 },
    },
    { x: 0, y: 0 }
  );
  store.getState().connect({
    id: asEdgeId("e-sfx"),
    family: "meta",
    sourceId: actionId,
    targetId: sfxMid,
  });

  const coords = Object.values(store.getState().satellites).find((s) => s.satelliteType === "coords-options");
  if (coords && coords.satelliteType === "coords-options") {
    store.setState((s) => ({
      ...s,
      satellites: {
        ...s.satellites,
        [coords.id]: {
          ...coords,
          data: {
            ...coords.data,
            appearance: { ...coords.data.appearance, ui_img: BLOB.hs },
          },
        },
      },
    }));
  }

  store.getState().setMetaSettingsAudio({ enabled: true, url: BLOB.global, volume: 0.5 });
  store.getState().setMetaSettingsInventory({
    enabled: true,
    position: "top-right",
    icon: BLOB.hud,
    panelBg: "#000",
    panelBgAlpha: 1,
    textColor: "#fff",
  });
  store.getState().upsertObject({
    objectId: "key",
    displayName: "Clef",
    iconUrl: BLOB.obj,
    iconMediaId: null,
  });

  store.getState().addMedia(
    {
      id: asMediaNodeId("media-orphan"),
      nodeType: "media",
      mediaType: "media-image",
      label: "Orphan",
      data: { url: BLOB.orphan },
    },
    { x: 300, y: 300 }
  );

  return { store, sceneId, actionId, ambMid, sfxMid, panMid };
}

describe("C23.3 — reconnexion bundle au load", () => {
  it("round-trip save paths → load rewrite → reconnect sur tous les emplacements", () => {
    const { store, sceneId, actionId, ambMid, sfxMid, panMid } = buildFixtureStore();
    const stateA = store.getState();
    const projectJson = serializeToProjectJson(stateA);
    const layoutJson = serializeLayout(stateA);
    expect(layoutJson.nodalAutoSatelliteData?.["room:h:0"]?.coords?.appearance?.ui_img).toBe(BLOB.hs);
    expect(projectJson.scenes[0]?.hotspots[0]?.appearance?.ui_img).toBe(BLOB.hs);

    const { pathByUrl } = simulateBundlePathsOnProject(projectJson, layoutJson);
    expect(pathByUrl.has(BLOB.hs)).toBe(true);
    expect(pathByUrl.get(BLOB.global)).toMatch(/^\.\/assets\/audio\/global\//);
    expect(pathByUrl.get(BLOB.amb)).toMatch(/^\.\/assets\/audio\/ambiance\//);
    expect(pathByUrl.get(BLOB.sfx)).toMatch(/^\.\/assets\/audio\/sfx\//);
    expect(pathByUrl.get(BLOB.pano)).toMatch(/^\.\/assets\/image360\//);
    expect(pathByUrl.get(BLOB.orphan)).toMatch(/^\.\/assets\/orphelin\//);

    const pathToBlobUrl: Record<string, string> = {};
    for (const [src, assetPath] of pathByUrl) {
      pathToBlobUrl[assetPath] = `blob:https://reload.test/${encodeURIComponent(assetPath)}`;
    }

    const projectLoad = JSON.parse(JSON.stringify(projectJson)) as typeof projectJson;
    const layoutLoad = JSON.parse(JSON.stringify(layoutJson)) as typeof layoutJson;
    rewriteBlobUrlsToAssetPaths(projectLoad, layoutLoad, pathByUrl);
    rewritePortableUrlsForLoad(projectLoad, layoutLoad, pathToBlobUrl);

    const storeB = createNodalProjectStore();
    storeB.getState().hydrateFromProject(projectLoad, layoutLoad);

    const resolver: BundleSessionResolver = {
      resolveToSessionBlobUrl: (ref) => pathToBlobUrl[ref] ?? null,
    };
    reconnectBundleMediaInStore(storeB.getState(), resolver);

    const s = storeB.getState();
    expect(s.meta.settings?.audio?.url).toContain("blob:https://reload.test/");
    expect(s.meta.settings?.inventoryGlobal?.icon).toContain("blob:https://reload.test/");
    expect(s.meta.objects.key?.iconUrl).toContain("blob:https://reload.test/");
    expect(resolveScenePanoramaUrlForExport(s, sceneId)).toContain("blob:https://reload.test/");
    expect(resolveLinkedMediaAudioAmbianceForScene(s, sceneId)?.url).toContain(
      "blob:https://reload.test/"
    );
    expect(s.media[ambMid]?.data.url).toContain("blob:https://reload.test/");
    expect(s.media[sfxMid]?.data.url).toContain("blob:https://reload.test/");
    expect(s.media[panMid]?.data.url).toContain("blob:https://reload.test/");
    const actionIdAfterLoad = stableActionNodeIdFromPathKey("room:h:0");
    expect(actionIdAfterLoad).not.toBe(actionId);
    expect(resolveHotspotUiImgForAction(s, actionIdAfterLoad)).toContain(
      "blob:https://reload.test/"
    );
    expect(s.media[asMediaNodeId("media-orphan")]?.data.url).toContain("blob:https://reload.test/");
  });

  it("MEDIA_ORPHANED warning pour média sans edge meta", () => {
    const { store } = buildFixtureStore();
    const warnings = computeWarnings(store.getState());
    expect(warnings.some((w) => w.code === "MEDIA_ORPHANED")).toBe(true);
  });

  it("enrich + collecte inclut scene.media.ambiance (Generate Game web)", () => {
    const { store, sceneId } = buildFixtureStore();
    const json = serializeToProjectJson(store.getState());
    const enriched = enrichProjectJsonForBundleWalker(json);
    const scene = enriched.scenes.find((s) => s.id === "room");
    expect(scene?.media?.ambiance.url).toBe(BLOB.amb);
    const entries = collectBundleMediaEntries(enriched, null);
    const urls = new Set(entries.map((e) => e.url));
    expect(urls.has(BLOB.global)).toBe(true);
    expect(urls.has(BLOB.amb)).toBe(true);
    expect(urls.has(BLOB.sfx)).toBe(true);
    expect(urls.has(BLOB.pano)).toBe(true);
    expect(resolveLinkedMediaAudioAmbianceForScene(store.getState(), sceneId)?.url).toBe(BLOB.amb);
  });
});
