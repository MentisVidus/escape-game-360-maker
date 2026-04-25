import { describe, expect, it } from "vitest";

import { asActionNodeId, asEdgeId, asSceneNodeId } from "../model/ids";
import type { ActionNode, SceneNode } from "../model/nodes";
import { createNodalProjectStore } from "../store/nodalProjectStore";

describe("C3a reconcileAutoSatellites + meta.objects", () => {
  it("ajoute coords-options + edge meta au flow-in scène → action", () => {
    const store = createNodalProjectStore();
    const scene: SceneNode = {
      id: asSceneNodeId("scn-x"),
      nodeType: "scene",
      sceneId: "s1",
      label: "S",
      panoramaUrl: "",
    };
    const msg: ActionNode = {
      id: asActionNodeId("act-msg"),
      nodeType: "action",
      actionType: "msg",
      label: "M",
      payload: { copy: { bodyHtml: "x", buttonLabel: "OK" } },
      sfx: { url: "", volume: 1 },
      visibility: { requiresItem: "", hiddenIfHasItem: "", clickWhenInvisible: true },
    };
    store.getState().addScene(scene, { x: 0, y: 0 });
    store.getState().addAction(msg, { x: 100, y: 50 });
    expect(Object.keys(store.getState().satellites)).toHaveLength(0);

    store.getState().connect({
      id: asEdgeId("f1"),
      family: "flow",
      sourceId: scene.id,
      targetId: msg.id,
    });

    const sats = Object.values(store.getState().satellites);
    expect(sats).toHaveLength(1);
    const sat0 = sats[0]!;
    expect(sat0.satelliteType).toBe("coords-options");
    const meta = store.getState().edges.filter((e) => e.family === "meta");
    expect(meta).toHaveLength(1);
    expect(meta[0]!.sourceId).toBe(msg.id);
    expect(meta[0]!.targetId).toBe(sat0.id);

    store.getState().disconnect(asEdgeId("f1"));
    expect(Object.keys(store.getState().satellites)).toHaveLength(0);
    expect(store.getState().edges.filter((e) => e.family === "meta")).toHaveLength(0);
  });

  it("pick en hotspot reçoit coords-options + object", () => {
    const store = createNodalProjectStore();
    const scene: SceneNode = {
      id: asSceneNodeId("scn-p"),
      nodeType: "scene",
      sceneId: "sp",
      label: "S",
      panoramaUrl: "",
    };
    const pick: ActionNode = {
      id: asActionNodeId("act-pick"),
      nodeType: "action",
      actionType: "pick",
      label: "P",
      payload: { itemId: "gem", itemName: "Gem", copy: { bodyHtml: "", buttonLabel: "" } },
      sfx: { url: "", volume: 1 },
      visibility: { requiresItem: "", hiddenIfHasItem: "", clickWhenInvisible: true },
    };
    store.getState().addScene(scene, { x: 0, y: 0 });
    store.getState().addAction(pick, { x: 50, y: 50 });
    store.getState().connect({
      id: asEdgeId("fp"),
      family: "flow",
      sourceId: scene.id,
      targetId: pick.id,
    });

    const satTypes = new Set(Object.values(store.getState().satellites).map((s) => s.satelliteType));
    expect(satTypes).toEqual(new Set(["coords-options", "object"]));

    expect(store.getState().meta.objects["gem"]).toMatchObject({
      objectId: "gem",
      displayName: "",
      iconMediaId: null,
      iconUrl: "",
    });
  });

  it("upsertObject met à jour sans dupliquer", () => {
    const store = createNodalProjectStore();
    store.getState().upsertObject({
      objectId: "o1",
      displayName: "A",
      iconMediaId: null,
      iconUrl: "",
    });
    expect(Object.keys(store.getState().meta.objects)).toEqual(["o1"]);
    store.getState().upsertObject({
      objectId: "o1",
      displayName: "B",
      iconMediaId: null,
      iconUrl: "http://x",
    });
    expect(store.getState().meta.objects["o1"]!.displayName).toBe("B");
    expect(store.getState().meta.objects["o1"]!.iconUrl).toBe("http://x");
    expect(Object.keys(store.getState().meta.objects)).toEqual(["o1"]);
  });
});
