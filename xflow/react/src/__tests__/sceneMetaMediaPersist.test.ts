import { describe, expect, it } from "vitest";

import { asEdgeId, asMediaNodeId } from "../model/ids";
import type { SceneNode } from "../model/nodes";
import { applyHydratedLayout, serializeLayout } from "../serialize/mapLayoutJson";
import { deserializeFromProjectJson, stableSceneNodeIdFromExternal } from "../serialize/fromProjectJson";
import { serializeToProjectJson } from "../serialize/toProjectJson";
import { createNodalProjectStore } from "../store/nodalProjectStore";

describe("persist meta scène → média", () => {
  it("survit au roundtrip project.json + map-layout (hors V2)", () => {
    const store = createNodalProjectStore();

    const sc: SceneNode = {
      id: stableSceneNodeIdFromExternal("ext-a"),
      nodeType: "scene",
      sceneId: "ext-a",
      label: "A",
      panoramaUrl: "",
    };
    store.getState().addScene(sc, { x: 10, y: 20 });

    const mid = asMediaNodeId("media-img-1");
    store
      .getState()
      .addMedia({ id: mid, nodeType: "media", mediaType: "media-image", data: { url: "https://example.com/x.png" } }, { x: 30, y: 40 });
    store.getState().connect({ id: asEdgeId("e-scene-meta-media"), family: "meta", sourceId: sc.id, targetId: mid });

    const fresh = store.getState();
    const projectJson = serializeToProjectJson(fresh);
    const layoutJson = serializeLayout(fresh);

    expect(layoutJson.nodalSceneMetaMediaLinks?.some((l) => l.externalSceneId === "ext-a" && l.mediaId === mid)).toBe(
      true
    );

    const base = deserializeFromProjectJson(projectJson);
    applyHydratedLayout(base, layoutJson, projectJson);

    expect(base.edges.some((e) => e.family === "meta" && e.sourceId === sc.id && e.targetId === mid)).toBe(true);
  });
});
