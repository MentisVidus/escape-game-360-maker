import { describe, expect, it } from "vitest";

import { asActionNodeId, asEdgeId, asSceneNodeId } from "../model/ids";
import type { ActionNode, SceneNode } from "../model/nodes";
import type { NodalProjectStore } from "../store/nodalProjectStore";
import { createNodalProjectStore } from "../store/nodalProjectStore";

const findObjectSatelliteIdForAction = (
  state: NodalProjectStore,
  actionId: string
): string => {
  const objectEdge = state.edges.find((e) => {
    if (e.family !== "meta" || e.sourceId !== actionId) return false;
    const sat = state.satellites[e.targetId as keyof typeof state.satellites];
    return sat?.satelliteType === "object";
  });
  expect(objectEdge).toBeDefined();
  return objectEdge!.targetId;
};

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

  it("changement d'objectId vers existant conserve les entrées et repointe le satellite", () => {
    const store = createNodalProjectStore();
    const state = store.getState();

    const scene: SceneNode = {
      id: asSceneNodeId("scn-obj-a"),
      nodeType: "scene",
      sceneId: "obj-a",
      label: "Scene",
      panoramaUrl: "",
    };
    const pickA: ActionNode = {
      id: asActionNodeId("act-pick-a"),
      nodeType: "action",
      actionType: "pick",
      label: "Pick A",
      payload: { itemId: "cle", itemName: "Cle", copy: { bodyHtml: "", buttonLabel: "" } },
      sfx: { url: "", volume: 1 },
      visibility: { requiresItem: "", hiddenIfHasItem: "", clickWhenInvisible: true },
    };
    const pickB: ActionNode = {
      id: asActionNodeId("act-pick-b"),
      nodeType: "action",
      actionType: "pick",
      label: "Pick B",
      payload: { itemId: "carte", itemName: "Carte", copy: { bodyHtml: "", buttonLabel: "" } },
      sfx: { url: "", volume: 1 },
      visibility: { requiresItem: "", hiddenIfHasItem: "", clickWhenInvisible: true },
    };
    state.addScene(scene, { x: 0, y: 0 });
    state.addAction(pickA, { x: 100, y: 50 });
    state.addAction(pickB, { x: 220, y: 50 });
    state.connect({ id: asEdgeId("flow-a"), family: "flow", sourceId: scene.id, targetId: pickA.id });
    state.connect({ id: asEdgeId("flow-b"), family: "flow", sourceId: scene.id, targetId: pickB.id });

    state.upsertObject({ objectId: "cle", displayName: "Clef", iconMediaId: null, iconUrl: "icon-cle.png" });
    state.upsertObject({ objectId: "carte", displayName: "Carte", iconMediaId: null, iconUrl: "icon-carte.png" });

    const satAId = findObjectSatelliteIdForAction(store.getState(), pickA.id);
    state.updateNodeData(satAId as never, { data: { objectId: "carte" } } as never);
    state.upsertObject({ objectId: "carte", displayName: "Carte", iconMediaId: null, iconUrl: "icon-carte.png" });

    const finalState = store.getState();
    expect(finalState.meta.objects["cle"]).toBeDefined();
    expect(finalState.meta.objects["carte"]).toBeDefined();
    const satA = finalState.satellites[satAId as keyof typeof finalState.satellites];
    expect(satA?.satelliteType).toBe("object");
    if (satA?.satelliteType === "object") {
      expect(satA.data.objectId).toBe("carte");
    }
    const objectMetaEdgesFromA = finalState.edges.filter((e) => {
      if (e.family !== "meta" || e.sourceId !== pickA.id) return false;
      const sat = finalState.satellites[e.targetId as keyof typeof finalState.satellites];
      return sat?.satelliteType === "object";
    });
    expect(objectMetaEdgesFromA).toHaveLength(1);
  });

  it("changement d'objectId vers nouveau crée une entrée sans supprimer l'ancienne", () => {
    const store = createNodalProjectStore();
    const state = store.getState();
    const scene: SceneNode = {
      id: asSceneNodeId("scn-obj-b"),
      nodeType: "scene",
      sceneId: "obj-b",
      label: "Scene",
      panoramaUrl: "",
    };
    const pick: ActionNode = {
      id: asActionNodeId("act-pick-c"),
      nodeType: "action",
      actionType: "pick",
      label: "Pick C",
      payload: { itemId: "cle", itemName: "Cle", copy: { bodyHtml: "", buttonLabel: "" } },
      sfx: { url: "", volume: 1 },
      visibility: { requiresItem: "", hiddenIfHasItem: "", clickWhenInvisible: true },
    };
    state.addScene(scene, { x: 0, y: 0 });
    state.addAction(pick, { x: 100, y: 50 });
    state.connect({ id: asEdgeId("flow-c"), family: "flow", sourceId: scene.id, targetId: pick.id });
    state.upsertObject({ objectId: "cle", displayName: "Clef", iconMediaId: null, iconUrl: "icon-cle.png" });

    const satId = findObjectSatelliteIdForAction(store.getState(), pick.id);
    state.updateNodeData(satId as never, { data: { objectId: "tresor" } } as never);
    state.upsertObject({ objectId: "tresor", displayName: "", iconMediaId: null, iconUrl: "" });

    const finalState = store.getState();
    expect(finalState.meta.objects["cle"]).toBeDefined();
    expect(finalState.meta.objects["tresor"]).toBeDefined();
    const sat = finalState.satellites[satId as keyof typeof finalState.satellites];
    expect(sat?.satelliteType).toBe("object");
    if (sat?.satelliteType === "object") {
      expect(sat.data.objectId).toBe("tresor");
    }
  });

  it("upsertObject trim et ignore les objectId vides", () => {
    const store = createNodalProjectStore();
    const state = store.getState();
    state.upsertObject({ objectId: "  ", displayName: "x", iconMediaId: null, iconUrl: "" });
    state.upsertObject({ objectId: "", displayName: "y", iconMediaId: null, iconUrl: "" });
    state.upsertObject({ objectId: "  cle  ", displayName: "Clef", iconMediaId: null, iconUrl: "" });
    expect(Object.keys(store.getState().meta.objects)).toEqual(["cle"]);
  });
});
