import { describe, expect, it } from "vitest";

import { asActionNodeId, asEdgeId, asMediaNodeId, asSceneNodeId } from "../model/ids";
import type { SceneNode } from "../model/nodes";
import { getAssetPath } from "../model/bundleAssetPath";
import { resolveLinkedMediaAudioAmbianceForScene } from "../model/sceneAmbianceProjection";
import { resolveScenePanoramaUrlForExport } from "../model/scenePanoramaProjection";
import { resolveHotspotUiImgForAction } from "../model/hotspotAppearanceProjection";
import { enrichProjectJsonForBundleWalker } from "../serialize/enrichProjectForBundleWalker";
import { serializeLayout, type MapLayoutJson } from "../serialize/mapLayoutJson";
import {
  collectBundleMediaEntries,
  simulateBundlePathsOnProject,
} from "../serialize/bundleExportSimulation";
import { stableSceneNodeIdFromExternal } from "../serialize/fromProjectJson";
import { serializeToProjectJson } from "../serialize/toProjectJson";
import { createNodalProjectStore } from "../store/nodalProjectStore";

const BLOB = "blob:https://session.test/abc";

function addSceneWithHotspot(store: ReturnType<typeof createNodalProjectStore>) {
  const sceneId = stableSceneNodeIdFromExternal("room-a");
  const sc: SceneNode = {
    id: sceneId,
    nodeType: "scene",
    sceneId: "room-a",
    label: "Room",
    panoramaUrl: "",
  };
  store.getState().addScene(sc, { x: 0, y: 0 });
  store.getState().addAction(
    {
      id: asActionNodeId("act-hs-1"),
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
    id: asEdgeId("e-flow-scene-hs"),
    family: "flow",
    sourceId: sceneId,
    targetId: asActionNodeId("act-hs-1"),
  });
  return { sceneId, actionId: asActionNodeId("act-hs-1") };
}

describe("C23.2 — bundleAssetPath", () => {
  it("produit des chemins typés write-only", () => {
    expect(getAssetPath({ kind: "audio-global", fileName: "g.mp3" })).toBe(
      "./assets/audio/global/g.mp3"
    );
    expect(getAssetPath({ kind: "image360", fileName: "pano.jpg" })).toBe(
      "./assets/image360/pano.jpg"
    );
    expect(
      getAssetPath({ kind: "orphelin", mediaNodeId: "media-orphan-1", fileName: "x.wav" })
    ).toBe("./assets/orphelin/media-orphan-1/x.wav");
  });
});

describe("C23.2 — projections serializeToProjectJson", () => {
  it("projette ambiance scène depuis media-audio meta", () => {
    const store = createNodalProjectStore();
    const { sceneId } = addSceneWithHotspot(store);
    const mid = asMediaNodeId("media-amb-1");
    store.getState().addMedia(
      {
        id: mid,
        nodeType: "media",
        mediaType: "media-audio",
        label: "Amb",
        data: { url: BLOB + "-amb", volume: 0.6 },
      },
      { x: 0, y: 0 }
    );
    store.getState().connect({
      id: asEdgeId("e-meta-amb"),
      family: "meta",
      sourceId: sceneId,
      targetId: mid,
    });
    const linked = resolveLinkedMediaAudioAmbianceForScene(store.getState(), sceneId);
    expect(linked?.url).toContain("blob:");
    const json = serializeToProjectJson(store.getState());
    const scene = json.scenes.find((s) => s.id === "room-a");
    expect(scene?.media?.ambiance.url).toContain("blob:");
    expect(scene?.media?.ambiance.volume).toBe(0.6);
  });

  it("projette panorama (B) : media-image meta prioritaire sur scene.panoramaUrl", () => {
    const store = createNodalProjectStore();
    const sceneId = stableSceneNodeIdFromExternal("room-b");
    store.getState().addScene(
      {
        id: sceneId,
        nodeType: "scene",
        sceneId: "room-b",
        label: "B",
        panoramaUrl: "https://cdn.example/old.jpg",
      },
      { x: 0, y: 0 }
    );
    const mid = asMediaNodeId("media-pano-1");
    store.getState().addMedia(
      {
        id: mid,
        nodeType: "media",
        mediaType: "media-image",
        label: "Pano",
        data: { url: BLOB + "-pano" },
      },
      { x: 0, y: 0 }
    );
    store.getState().connect({
      id: asEdgeId("e-meta-pano"),
      family: "meta",
      sourceId: sceneId,
      targetId: mid,
    });
    expect(resolveScenePanoramaUrlForExport(store.getState(), sceneId)).toBe(BLOB + "-pano");
    const json = serializeToProjectJson(store.getState());
    const scene = json.scenes.find((s) => s.id === "room-b");
    expect(scene?.panoramaUrl).toBe(BLOB + "-pano");
    expect(scene?.media?.panoramaUrl).toBe(BLOB + "-pano");
  });

  it("projette audio global et inventaire HUD dans meta.settings", () => {
    const store = createNodalProjectStore();
    store.getState().setMetaSettingsAudio({ enabled: true, url: BLOB + "-global", volume: 0.4 });
    store.getState().setMetaSettingsInventory({
      enabled: true,
      position: "top-right",
      icon: BLOB + "-inv",
      panelBg: "#000",
      panelBgAlpha: 0.8,
      textColor: "#fff",
    });
    const json = serializeToProjectJson(store.getState());
    expect(json.meta?.settings?.audio?.url).toContain("blob:");
    expect(json.meta?.settings?.inventoryGlobal?.icon).toContain("blob:");
    const enriched = enrichProjectJsonForBundleWalker(json);
    expect(enriched.globalMusic?.url).toContain("blob:");
    expect(enriched.invIcon).toContain("blob:");
  });

  it("projette hotspot ui_img et SFX", () => {
    const store = createNodalProjectStore();
    const { sceneId, actionId } = addSceneWithHotspot(store);
    const sats = Object.values(store.getState().satellites);
    const coords = sats.find((s) => s.satelliteType === "coords-options");
    expect(coords).toBeTruthy();
    if (coords && coords.satelliteType === "coords-options") {
      store.setState((s) => ({
        ...s,
        satellites: {
          ...s.satellites,
          [coords.id]: {
            ...coords,
            data: {
              ...coords.data,
              appearance: { ...coords.data.appearance, ui_img: BLOB + "-hs" },
            },
          },
        },
      }));
    }
    expect(resolveHotspotUiImgForAction(store.getState(), actionId)).toBe(BLOB + "-hs");
    const sfxMid = asMediaNodeId("media-sfx-1");
    store.getState().addMedia(
      {
        id: sfxMid,
        nodeType: "media",
        mediaType: "media-audio",
        label: "Sfx",
        data: { url: BLOB + "-sfx", volume: 1 },
      },
      { x: 0, y: 0 }
    );
    store.getState().connect({
      id: asEdgeId("e-meta-sfx"),
      family: "meta",
      sourceId: actionId,
      targetId: sfxMid,
    });
    const json = serializeToProjectJson(store.getState());
    const hs = json.scenes[0]?.hotspots[0];
    expect(hs?.appearance?.ui_img).toBe(BLOB + "-hs");
    expect(hs?.action.sfx.url).toContain("blob:");
  });
});

describe("C23.2 — collecte + paths typés (simulation save)", () => {
  it("assigne des chemins ./assets/<type>/… pour tous les médias rattachés + orphelin", () => {
    const store = createNodalProjectStore();
    const { sceneId, actionId } = addSceneWithHotspot(store);
    store.getState().setMetaSettingsAudio({ enabled: true, url: BLOB + "-g", volume: 0.5 });
    store.getState().setMetaSettingsInventory({
      enabled: true,
      position: "top-left",
      icon: BLOB + "-hud",
      panelBg: "#000",
      panelBgAlpha: 1,
      textColor: "#fff",
    });
    const panMid = asMediaNodeId("media-pano-col");
    store.getState().addMedia(
      {
        id: panMid,
        nodeType: "media",
        mediaType: "media-image",
        label: "P",
        data: { url: BLOB + "-360" },
      },
      { x: 0, y: 0 }
    );
    store.getState().connect({
      id: asEdgeId("e-pano"),
      family: "meta",
      sourceId: sceneId,
      targetId: panMid,
    });
    const ambMid = asMediaNodeId("media-amb-col");
    store.getState().addMedia(
      {
        id: ambMid,
        nodeType: "media",
        mediaType: "media-audio",
        label: "A",
        data: { url: BLOB + "-amb", volume: 1 },
      },
      { x: 0, y: 0 }
    );
    store.getState().connect({
      id: asEdgeId("e-amb"),
      family: "meta",
      sourceId: sceneId,
      targetId: ambMid,
    });
    store.getState().connect({
      id: asEdgeId("e-sfx"),
      family: "meta",
      sourceId: actionId,
      targetId: asMediaNodeId("media-sfx-col"),
    });
    store.getState().addMedia(
      {
        id: asMediaNodeId("media-sfx-col"),
        nodeType: "media",
        mediaType: "media-audio",
        label: "S",
        data: { url: BLOB + "-sfx", volume: 1 },
      },
      { x: 0, y: 0 }
    );
    const orphanId = asMediaNodeId("media-orphan-col");
    store.getState().addMedia(
      {
        id: orphanId,
        nodeType: "media",
        mediaType: "media-image",
        label: "O",
        data: { url: BLOB + "-orphan" },
      },
      { x: 200, y: 200 }
    );
    store.getState().upsertObject({
      objectId: "cle",
      displayName: "Clef",
      iconUrl: BLOB + "-obj",
      iconMediaId: null,
    });
    const state = store.getState();
    const projectJson = serializeToProjectJson(state);
    const layoutJson = serializeLayout(state);
    const { pathByUrl } = simulateBundlePathsOnProject(projectJson, layoutJson);
    expect(pathByUrl.get(BLOB + "-g")).toMatch(/^\.\/assets\/audio\/global\//);
    expect(pathByUrl.get(BLOB + "-hud")).toMatch(/^\.\/assets\/icone\/inventaire\//);
    expect(pathByUrl.get(BLOB + "-360")).toMatch(/^\.\/assets\/image360\//);
    expect(pathByUrl.get(BLOB + "-amb")).toMatch(/^\.\/assets\/audio\/ambiance\//);
    expect(pathByUrl.get(BLOB + "-sfx")).toMatch(/^\.\/assets\/audio\/sfx\//);
    expect(pathByUrl.get(BLOB + "-orphan")).toMatch(
      new RegExp(`^\\.\\/assets\\/orphelin\\/${orphanId.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\/`)
    );
    const entries = collectBundleMediaEntries(
      enrichProjectJsonForBundleWalker(projectJson),
      layoutJson
    );
    const kinds = new Set(entries.map((e) => e.kind));
    expect(kinds.has("audio-global")).toBe(true);
    expect(kinds.has("icone-objet")).toBe(true);
    expect(kinds.has("orphelin")).toBe(true);
  });
});
