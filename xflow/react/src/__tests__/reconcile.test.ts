import { describe, expect, it, vi } from "vitest";

import { asActionNodeId, asEdgeId, asSatelliteNodeId, asSceneNodeId } from "../model/ids";
import type { ActionNode, SceneNode } from "../model/nodes";
import { serializeToProjectJson } from "../serialize/toProjectJson";
import type { NodalProjectStore } from "../store/nodalProjectStore";
import { createNodalProjectStore } from "../store/nodalProjectStore";
import { getActionContextualState } from "../store/reconcileAutoSatellites";
import { sboxIdFromScene } from "../store/reconcileSceneBoxes";
import {
  ATTACH_OVERLAP_THRESHOLD,
  DETACH_OVERLAP_THRESHOLD,
} from "../view/nesting/constants";
import { overlapRatioByChild, toAbsoluteRect, type NestedNodeLike } from "../view/nesting/geometry";
import { toReactFlowNodes } from "../view/nodalReactFlowProjection";

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

    const satLayout = store.getState().layout[sat0.id]!;
    expect(satLayout.parentId).toBe(msg.id);
    expect(satLayout.x).toBe(0);
    expect(satLayout.y).toBe(100);

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

  it("sélection d'un objectId existant ne doit pas écraser ses données", () => {
    const store = createNodalProjectStore();
    const state = store.getState();

    const scene: SceneNode = {
      id: asSceneNodeId("scn-obj-c"),
      nodeType: "scene",
      sceneId: "obj-c",
      label: "Scene",
      panoramaUrl: "",
    };
    const reqA: ActionNode = {
      id: asActionNodeId("act-req-a"),
      nodeType: "action",
      actionType: "req",
      label: "Req A",
      payload: { itemId: "cle", copy: { bodyHtml: "", buttonLabel: "" } },
      rewardActionId: null,
      sfx: { url: "", volume: 1 },
      visibility: { requiresItem: "", hiddenIfHasItem: "", clickWhenInvisible: true },
    };
    const reqB: ActionNode = {
      id: asActionNodeId("act-req-b"),
      nodeType: "action",
      actionType: "req",
      label: "Req B",
      payload: { itemId: "autre", copy: { bodyHtml: "", buttonLabel: "" } },
      rewardActionId: null,
      sfx: { url: "", volume: 1 },
      visibility: { requiresItem: "", hiddenIfHasItem: "", clickWhenInvisible: true },
    };
    state.addScene(scene, { x: 0, y: 0 });
    state.addAction(reqA, { x: 100, y: 50 });
    state.addAction(reqB, { x: 220, y: 50 });
    state.connect({ id: asEdgeId("flow-ra"), family: "flow", sourceId: scene.id, targetId: reqA.id });
    state.connect({ id: asEdgeId("flow-rb"), family: "flow", sourceId: scene.id, targetId: reqB.id });

    state.upsertObject({
      objectId: "cle",
      displayName: "Clé rouillée",
      iconMediaId: null,
      iconUrl: "url1",
    });
    const satBId = findObjectSatelliteIdForAction(store.getState(), reqB.id);

    // Simule le flux popup C3a.3: updateNodeData seul si l'entrée existe.
    state.updateNodeData(satBId as never, { data: { objectId: "cle" } } as never);

    expect(store.getState().meta.objects["cle"]!.displayName).toBe("Clé rouillée");
    expect(store.getState().meta.objects["cle"]!.iconUrl).toBe("url1");
    const finalState = store.getState();
    const satB = finalState.satellites[satBId as keyof typeof finalState.satellites];
    expect(satB?.satelliteType).toBe("object");
    if (satB?.satelliteType === "object") {
      expect(satB.data.objectId).toBe("cle");
    }
  });

  it("édition displayName seul conserve iconUrl", () => {
    const store = createNodalProjectStore();
    const state = store.getState();
    state.upsertObject({
      objectId: "cle",
      displayName: "Clé rouillée",
      iconMediaId: null,
      iconUrl: "url1",
    });

    // Simule blur displayName: displayName modifié, iconUrl repris courant.
    state.upsertObject({
      objectId: "cle",
      displayName: "Clé neuve",
      iconMediaId: null,
      iconUrl: store.getState().meta.objects["cle"]!.iconUrl,
    });

    expect(store.getState().meta.objects["cle"]!.displayName).toBe("Clé neuve");
    expect(store.getState().meta.objects["cle"]!.iconUrl).toBe("url1");
  });

  it("attachChild req→msg pose parentId/rewardActionId et sérialise rewardAction", () => {
    const store = createNodalProjectStore();
    const state = store.getState();
    const scene: SceneNode = {
      id: asSceneNodeId("scn-c3b-a"),
      nodeType: "scene",
      sceneId: "s-c3b-a",
      label: "S",
      panoramaUrl: "",
    };
    const req: ActionNode = {
      id: asActionNodeId("act-c3b-req"),
      nodeType: "action",
      actionType: "req",
      label: "Req",
      payload: { itemId: "k", copy: { bodyHtml: "", buttonLabel: "" } },
      rewardActionId: null,
      sfx: { url: "", volume: 1 },
      visibility: { requiresItem: "", hiddenIfHasItem: "", clickWhenInvisible: true },
    };
    const msg: ActionNode = {
      id: asActionNodeId("act-c3b-msg"),
      nodeType: "action",
      actionType: "msg",
      label: "Msg",
      payload: { copy: { bodyHtml: "ok", buttonLabel: "OK" } },
      sfx: { url: "", volume: 1 },
      visibility: { requiresItem: "", hiddenIfHasItem: "", clickWhenInvisible: true },
    };
    state.addScene(scene, { x: 0, y: 0 });
    state.addAction(req, { x: 100, y: 20 });
    state.addAction(msg, { x: 380, y: 20 });
    state.connect({ id: asEdgeId("flow-c3b-a"), family: "flow", sourceId: scene.id, targetId: req.id });

    state.attachChild(req.id, msg.id);

    const next = store.getState();
    expect(next.layout[msg.id]?.parentId).toBe(req.id);
    const reqAfter = next.actions[req.id];
    expect(reqAfter).toBeDefined();
    if (!reqAfter) throw new Error("reqAfter absent");
    expect(reqAfter.actionType).toBe("req");
    if (reqAfter.actionType === "req") {
      expect(reqAfter.rewardActionId).toBe(msg.id);
    }

    const msgSat = Object.values(next.satellites).filter(
      (sat) =>
        next.edges.some((e) => e.family === "meta" && e.targetId === sat.id && e.sourceId === msg.id) &&
        sat.satelliteType === "coords-options"
    );
    expect(msgSat).toHaveLength(0);

    const project = serializeToProjectJson(next);
    const reqSerialized = project.scenes[0]?.hotspots?.[0]?.action;
    expect(reqSerialized?.type).toBe("req");
    const payload = (reqSerialized?.payload ?? {}) as Record<string, unknown>;
    const rewardAction = payload.rewardAction as { type?: string } | undefined;
    expect(rewardAction?.type).toBe("msg");
  });

  it("detachChild remet parentId/rewardActionId à null et sort du export hotspot", () => {
    const store = createNodalProjectStore();
    const state = store.getState();
    const scene: SceneNode = {
      id: asSceneNodeId("scn-c3b-b"),
      nodeType: "scene",
      sceneId: "s-c3b-b",
      label: "S",
      panoramaUrl: "",
    };
    const req: ActionNode = {
      id: asActionNodeId("act-c3b-req2"),
      nodeType: "action",
      actionType: "req",
      label: "Req",
      payload: { itemId: "k", copy: { bodyHtml: "", buttonLabel: "" } },
      rewardActionId: null,
      sfx: { url: "", volume: 1 },
      visibility: { requiresItem: "", hiddenIfHasItem: "", clickWhenInvisible: true },
    };
    const msg: ActionNode = {
      id: asActionNodeId("act-c3b-msg2"),
      nodeType: "action",
      actionType: "msg",
      label: "Msg",
      payload: { copy: { bodyHtml: "ok", buttonLabel: "OK" } },
      sfx: { url: "", volume: 1 },
      visibility: { requiresItem: "", hiddenIfHasItem: "", clickWhenInvisible: true },
    };
    state.addScene(scene, { x: 0, y: 0 });
    state.addAction(req, { x: 100, y: 20 });
    state.addAction(msg, { x: 380, y: 20 });
    state.connect({ id: asEdgeId("flow-c3b-b"), family: "flow", sourceId: scene.id, targetId: req.id });
    state.attachChild(req.id, msg.id);

    state.detachChild(msg.id, { x: 420, y: 90 });
    const next = store.getState();
    expect(next.layout[msg.id]?.parentId).toBeNull();
    const reqAfter = next.actions[req.id];
    expect(reqAfter).toBeDefined();
    if (!reqAfter) throw new Error("reqAfter absent");
    expect(reqAfter.actionType).toBe("req");
    if (reqAfter.actionType === "req") {
      expect(reqAfter.rewardActionId).toBeNull();
    }
    const project = serializeToProjectJson(next);
    expect(JSON.stringify(project)).not.toContain("ok");
  });

  it("chaînage REQ → REQ → MSG est sérialisé récursivement", () => {
    const store = createNodalProjectStore();
    const state = store.getState();
    const scene: SceneNode = {
      id: asSceneNodeId("scn-c3b-c"),
      nodeType: "scene",
      sceneId: "s-c3b-c",
      label: "S",
      panoramaUrl: "",
    };
    const reqA: ActionNode = {
      id: asActionNodeId("act-c3b-reqA"),
      nodeType: "action",
      actionType: "req",
      label: "Req A",
      payload: { itemId: "a", copy: { bodyHtml: "", buttonLabel: "" } },
      rewardActionId: null,
      sfx: { url: "", volume: 1 },
      visibility: { requiresItem: "", hiddenIfHasItem: "", clickWhenInvisible: true },
    };
    const reqB: ActionNode = {
      id: asActionNodeId("act-c3b-reqB"),
      nodeType: "action",
      actionType: "req",
      label: "Req B",
      payload: { itemId: "b", copy: { bodyHtml: "", buttonLabel: "" } },
      rewardActionId: null,
      sfx: { url: "", volume: 1 },
      visibility: { requiresItem: "", hiddenIfHasItem: "", clickWhenInvisible: true },
    };
    const msg: ActionNode = {
      id: asActionNodeId("act-c3b-msg3"),
      nodeType: "action",
      actionType: "msg",
      label: "Msg",
      payload: { copy: { bodyHtml: "done", buttonLabel: "OK" } },
      sfx: { url: "", volume: 1 },
      visibility: { requiresItem: "", hiddenIfHasItem: "", clickWhenInvisible: true },
    };
    state.addScene(scene, { x: 0, y: 0 });
    state.addAction(reqA, { x: 50, y: 20 });
    state.addAction(reqB, { x: 200, y: 20 });
    state.addAction(msg, { x: 360, y: 20 });
    state.connect({ id: asEdgeId("flow-c3b-c"), family: "flow", sourceId: scene.id, targetId: reqA.id });

    state.attachChild(reqA.id, reqB.id);
    state.attachChild(reqB.id, msg.id);

    const project = serializeToProjectJson(store.getState());
    const root = project.scenes[0]?.hotspots?.[0]?.action;
    expect(root?.type).toBe("req");
    const rewardA = ((root?.payload ?? {}) as Record<string, unknown>).rewardAction as
      | { type?: string; payload?: Record<string, unknown> }
      | undefined;
    expect(rewardA?.type).toBe("req");
    const rewardB = (rewardA?.payload ?? {})["rewardAction"] as { type?: string } | undefined;
    expect(rewardB?.type).toBe("msg");
  });

  it("refuse attachChild d'une action déjà hotspot", () => {
    const store = createNodalProjectStore();
    const state = store.getState();
    const scene: SceneNode = {
      id: asSceneNodeId("scn-c3b-d"),
      nodeType: "scene",
      sceneId: "s-c3b-d",
      label: "S",
      panoramaUrl: "",
    };
    const req: ActionNode = {
      id: asActionNodeId("act-c3b-req4"),
      nodeType: "action",
      actionType: "req",
      label: "Req",
      payload: { itemId: "x", copy: { bodyHtml: "", buttonLabel: "" } },
      rewardActionId: null,
      sfx: { url: "", volume: 1 },
      visibility: { requiresItem: "", hiddenIfHasItem: "", clickWhenInvisible: true },
    };
    const msg: ActionNode = {
      id: asActionNodeId("act-c3b-msg4"),
      nodeType: "action",
      actionType: "msg",
      label: "Msg",
      payload: { copy: { bodyHtml: "hot", buttonLabel: "OK" } },
      sfx: { url: "", volume: 1 },
      visibility: { requiresItem: "", hiddenIfHasItem: "", clickWhenInvisible: true },
    };
    state.addScene(scene, { x: 0, y: 0 });
    state.addAction(req, { x: 100, y: 20 });
    state.addAction(msg, { x: 300, y: 20 });
    state.connect({ id: asEdgeId("flow-c3b-d-req"), family: "flow", sourceId: scene.id, targetId: req.id });
    state.connect({ id: asEdgeId("flow-c3b-d-msg"), family: "flow", sourceId: scene.id, targetId: msg.id });

    state.attachChild(req.id, msg.id);
    const next = store.getState();
    /* C8.1.b.2.x : le msg reste sous le s-box (hotspot) ; attachChild récompense est refusé. */
    expect(next.layout[msg.id]?.parentId).toBe(sboxIdFromScene(scene.id));
    const reqAfter = next.actions[req.id];
    expect(reqAfter).toBeDefined();
    if (!reqAfter) throw new Error("reqAfter absent");
    expect(reqAfter.actionType).toBe("req");
    if (reqAfter.actionType === "req") {
      expect(reqAfter.rewardActionId).toBeNull();
    }
  });

  it("intersection threshold helpers restent stables", () => {
    const ratioAttach = overlapRatioByChild(
      { x: 0, y: 0, width: 100, height: 100 },
      { x: 70, y: 0, width: 100, height: 100 }
    );
    const ratioDetach = overlapRatioByChild(
      { x: 0, y: 0, width: 100, height: 100 },
      { x: 95, y: 0, width: 100, height: 100 }
    );
    expect(ratioAttach).toBeGreaterThanOrEqual(ATTACH_OVERLAP_THRESHOLD);
    expect(ratioDetach).toBeLessThan(DETACH_OVERLAP_THRESHOLD);
  });
});

describe("C3c selector sub-flow + contextual state", () => {
  const makeSelector = (id: string, label: string): ActionNode => ({
    id: asActionNodeId(id),
    nodeType: "action",
    actionType: "selector",
    label,
    payload: {
      nested: { title: label, copy: { bodyHtml: "", buttonLabel: "" }, displayMode: "buttons" },
    },
    sfx: { url: "", volume: 1 },
    visibility: { requiresItem: "", hiddenIfHasItem: "", clickWhenInvisible: true },
  });

  it("attachChild selector→msg : état 3 + satellite choice-options", () => {
    const store = createNodalProjectStore();
    const state = store.getState();
    const sel = makeSelector("act-c3c-sel-a", "Sel");
    const msg: ActionNode = {
      id: asActionNodeId("act-c3c-msg-a"),
      nodeType: "action",
      actionType: "msg",
      label: "Choix",
      payload: { copy: { bodyHtml: "c", buttonLabel: "OK" } },
      sfx: { url: "", volume: 1 },
      visibility: { requiresItem: "", hiddenIfHasItem: "", clickWhenInvisible: true },
    };
    state.addAction(sel, { x: 0, y: 0 });
    state.addAction(msg, { x: 10, y: 10 });
    state.attachChild(sel.id, msg.id);

    const next = store.getState();
    expect(getActionContextualState(next, msg.id)).toBe(3);
    expect(next.layout[msg.id]?.parentId).toBe(sel.id);
    const choiceMeta = next.edges.some((e) => {
      if (e.family !== "meta" || e.sourceId !== msg.id) return false;
      const sat = next.satellites[e.targetId as keyof typeof next.satellites];
      return sat?.satelliteType === "choice-options";
    });
    expect(choiceMeta).toBe(true);
  });

  it("attach msg sur selector → position relative correcte (abs → rel)", () => {
    const store = createNodalProjectStore();
    const state = store.getState();
    const sel = makeSelector("act-c3c-rel-sel", "Sel");
    const msg: ActionNode = {
      id: asActionNodeId("act-c3c-rel-msg"),
      nodeType: "action",
      actionType: "msg",
      label: "M",
      payload: { copy: { bodyHtml: "x", buttonLabel: "OK" } },
      sfx: { url: "", volume: 1 },
      visibility: { requiresItem: "", hiddenIfHasItem: "", clickWhenInvisible: true },
    };
    state.addAction(sel, { x: 100, y: 100 });
    state.addAction(msg, { x: 120, y: 130 });

    const parentRf: NestedNodeLike = { id: sel.id, position: { x: 100, y: 100 } };
    const childRf: NestedNodeLike = { id: msg.id, position: { x: 120, y: 130 } };
    const nodesById = new Map<string, NestedNodeLike>([
      [sel.id, parentRf],
      [msg.id, childRf],
    ]);
    const childRect = toAbsoluteRect(childRf, nodesById);
    const parentAbsRect = toAbsoluteRect(parentRf, nodesById);
    const relX = childRect.x - parentAbsRect.x;
    const relY = childRect.y - parentAbsRect.y;
    expect(relX).toBeCloseTo(20, 5);
    expect(relY).toBeCloseTo(30, 5);

    state.attachChild(sel.id, msg.id);
    state.updateNodeLayout(msg.id, { parentId: sel.id, x: relX, y: relY });

    const lay = store.getState().layout[msg.id];
    expect(lay?.parentId).toBe(sel.id);
    expect(lay?.x).toBeCloseTo(20, 5);
    expect(lay?.y).toBeCloseTo(30, 5);
  });

  it("attachChild selector→selector : parentId + satellite choice-options (spec 4.4)", () => {
    const store = createNodalProjectStore();
    const state = store.getState();
    const parentSel = makeSelector("act-c3c-sel-p", "P");
    const childSel = makeSelector("act-c3c-sel-c", "C");
    state.addAction(parentSel, { x: 0, y: 0 });
    state.addAction(childSel, { x: 50, y: 50 });
    state.attachChild(parentSel.id, childSel.id);

    const next = store.getState();
    expect(next.layout[childSel.id]?.parentId).toBe(parentSel.id);
    expect(getActionContextualState(next, childSel.id)).toBe(3);
    const choiceMeta = next.edges.some((e) => {
      if (e.family !== "meta" || e.sourceId !== childSel.id) return false;
      const sat = next.satellites[e.targetId as keyof typeof next.satellites];
      return sat?.satelliteType === "choice-options";
    });
    expect(choiceMeta).toBe(true);
  });

  it("attachChild atomique (parentId + rel) : selector>selector>msg ne pousse pas le satellite du sous-selector à Y énorme", () => {
    const store = createNodalProjectStore();
    const state = store.getState();
    const outer = makeSelector("act-c3c-out-at", "Out");
    const inner = makeSelector("act-c3c-in-at", "In");
    const msg: ActionNode = {
      id: asActionNodeId("act-c3c-msg-at"),
      nodeType: "action",
      actionType: "msg",
      label: "M",
      payload: { copy: { bodyHtml: "x", buttonLabel: "OK" } },
      sfx: { url: "", volume: 1 },
      visibility: { requiresItem: "", hiddenIfHasItem: "", clickWhenInvisible: true },
    };
    state.addAction(outer, { x: 0, y: 0 });
    state.addAction(inner, { x: 40, y: 60 });
    state.attachChild(outer.id, inner.id, { x: 40, y: 60 });
    state.addAction(msg, { x: 9999, y: 8888 });
    state.attachChild(inner.id, msg.id, { x: 10, y: 16 });

    const snap = store.getState();
    const innerSatId = (Object.keys(snap.satellites) as string[]).find((sid) => {
      const e = snap.edges.find((ed) => ed.family === "meta" && ed.targetId === sid);
      const sat = snap.satellites[sid as keyof typeof snap.satellites];
      return e?.sourceId === inner.id && sat?.satelliteType === "choice-options";
    });
    expect(innerSatId).toBeDefined();
    const satY = snap.layout[innerSatId as keyof typeof snap.layout]!.y;
    expect(satY).toBeLessThan(220);
  });

  it("attachChild auto-parentage : no-op", () => {
    const store = createNodalProjectStore();
    const state = store.getState();
    const sel = makeSelector("act-c3c-sel-self", "S");
    state.addAction(sel, { x: 0, y: 0 });
    state.attachChild(sel.id, sel.id);
    expect(store.getState().layout[sel.id]?.parentId).toBeNull();
  });

  it("sérialisation selector : choix triés par Y croissant", () => {
    const store = createNodalProjectStore();
    const state = store.getState();
    const scene: SceneNode = {
      id: asSceneNodeId("scn-c3c-y"),
      nodeType: "scene",
      sceneId: "s-y",
      label: "S",
      panoramaUrl: "",
    };
    const sel = makeSelector("act-c3c-sel-y", "Sel");
    const msgHighY: ActionNode = {
      id: asActionNodeId("act-c3c-high"),
      nodeType: "action",
      actionType: "msg",
      label: "Haut Y",
      payload: { copy: { bodyHtml: "high-y", buttonLabel: "OK" } },
      sfx: { url: "", volume: 1 },
      visibility: { requiresItem: "", hiddenIfHasItem: "", clickWhenInvisible: true },
    };
    const msgLowY: ActionNode = {
      id: asActionNodeId("act-c3c-low"),
      nodeType: "action",
      actionType: "msg",
      label: "Bas Y",
      payload: { copy: { bodyHtml: "low-y", buttonLabel: "OK" } },
      sfx: { url: "", volume: 1 },
      visibility: { requiresItem: "", hiddenIfHasItem: "", clickWhenInvisible: true },
    };
    state.addScene(scene, { x: 0, y: 0 });
    state.addAction(sel, { x: 100, y: 0 });
    state.addAction(msgHighY, { x: 0, y: 200, parentId: sel.id });
    state.addAction(msgLowY, { x: 0, y: 100, parentId: sel.id });
    state.connect({ id: asEdgeId("flow-c3c-y"), family: "flow", sourceId: scene.id, targetId: sel.id });

    const project = serializeToProjectJson(store.getState());
    const selectorAction = project.scenes[0]?.hotspots?.[0]?.action;
    expect(selectorAction?.type).toBe("selector");
    const nested = selectorAction?.payload?.nested as
      | { choices?: Array<{ action: { payload?: { copy?: { bodyHtml?: string } } } }> }
      | undefined;
    const bodies = nested?.choices?.map((c) => c.action.payload?.copy?.bodyHtml);
    expect(bodies).toEqual(["low-y", "high-y"]);
  });

  it("getActionContextualState : orphelin sans flow-in ni parent → 1", () => {
    const store = createNodalProjectStore();
    const state = store.getState();
    const msg: ActionNode = {
      id: asActionNodeId("act-c3c-orphan"),
      nodeType: "action",
      actionType: "msg",
      label: "O",
      payload: { copy: { bodyHtml: "x", buttonLabel: "OK" } },
      sfx: { url: "", volume: 1 },
      visibility: { requiresItem: "", hiddenIfHasItem: "", clickWhenInvisible: true },
    };
    state.addAction(msg, { x: 0, y: 0 });
    expect(getActionContextualState(store.getState(), msg.id)).toBe(1);
  });
});

describe("satellites relatifs + priorité drag attach", () => {
  it("création satellite auto : coords relatives + parentId action", () => {
    const store = createNodalProjectStore();
    const scene: SceneNode = {
      id: asSceneNodeId("scn-sat-rel"),
      nodeType: "scene",
      sceneId: "sr",
      label: "S",
      panoramaUrl: "",
    };
    const msg: ActionNode = {
      id: asActionNodeId("act-sat-rel-msg"),
      nodeType: "action",
      actionType: "msg",
      label: "M",
      payload: { copy: { bodyHtml: "x", buttonLabel: "OK" } },
      sfx: { url: "", volume: 1 },
      visibility: { requiresItem: "", hiddenIfHasItem: "", clickWhenInvisible: true },
    };
    store.getState().addScene(scene, { x: 0, y: 0 });
    store.getState().addAction(msg, { x: 200, y: 40 });
    store.getState().connect({
      id: asEdgeId("flow-sat-rel"),
      family: "flow",
      sourceId: scene.id,
      targetId: msg.id,
    });
    const satId = asSatelliteNodeId(Object.keys(store.getState().satellites)[0]!);
    const lay = store.getState().layout[satId]!;
    expect(lay.parentId).toBe(msg.id);
    expect(lay.x).toBe(0);
    expect(lay.y).toBe(100);
  });

  it("déplacement action : coordonnées relatives du satellite inchangées dans le store", () => {
    const store = createNodalProjectStore();
    const state = store.getState();
    const scene: SceneNode = {
      id: asSceneNodeId("scn-sat-move"),
      nodeType: "scene",
      sceneId: "sm",
      label: "S",
      panoramaUrl: "",
    };
    const msg: ActionNode = {
      id: asActionNodeId("act-sat-move-msg"),
      nodeType: "action",
      actionType: "msg",
      label: "M",
      payload: { copy: { bodyHtml: "x", buttonLabel: "OK" } },
      sfx: { url: "", volume: 1 },
      visibility: { requiresItem: "", hiddenIfHasItem: "", clickWhenInvisible: true },
    };
    state.addScene(scene, { x: 0, y: 0 });
    state.addAction(msg, { x: 10, y: 20 });
    state.connect({
      id: asEdgeId("flow-sat-move"),
      family: "flow",
      sourceId: scene.id,
      targetId: msg.id,
    });
    const satId = asSatelliteNodeId(Object.keys(store.getState().satellites)[0]!);
    const beforeSat = { ...store.getState().layout[satId] };
    state.updateNodeLayout(msg.id, { x: 110, y: 70 });
    const afterSat = store.getState().layout[satId]!;
    expect(afterSat.x).toBe(beforeSat.x);
    expect(afterSat.y).toBe(beforeSat.y);
    expect(afterSat.parentId).toBe(beforeSat.parentId);
  });

  it("priorité REQ/PWD sur selector quand les deux dépassent le seuil d'attache", () => {
    const th = ATTACH_OVERLAP_THRESHOLD;
    const bestRewardOverlap = 0.5;
    const bestChoiceOverlap = 0.99;
    const useRewardParent = bestRewardOverlap >= th;
    const useChoiceParent = !useRewardParent && bestChoiceOverlap >= th;
    expect(useRewardParent).toBe(true);
    expect(useChoiceParent).toBe(false);
  });

  it("selector gagne si REQ/PWD sous le seuil", () => {
    const th = ATTACH_OVERLAP_THRESHOLD;
    const bestRewardOverlap = 0.1;
    const bestChoiceOverlap = 0.5;
    const useRewardParent = bestRewardOverlap >= th;
    const useChoiceParent = !useRewardParent && bestChoiceOverlap >= th;
    expect(useRewardParent).toBe(false);
    expect(useChoiceParent).toBe(true);
  });
});

describe("attachChild anti-cycle parentId", () => {
  const makeMsg = (id: string): ActionNode => ({
    id: asActionNodeId(id),
    nodeType: "action",
    actionType: "msg",
    label: id,
    payload: { copy: { bodyHtml: "", buttonLabel: "" } },
    sfx: { url: "", volume: 1 },
    visibility: { requiresItem: "", hiddenIfHasItem: "", clickWhenInvisible: true },
  });

  it("cycle direct : attachChild(B,A) refusé si B est déjà enfant de A", () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const store = createNodalProjectStore();
    const state = store.getState();
    const a = makeMsg("act-cycle-a");
    const b = makeMsg("act-cycle-b");
    state.addAction(a, { x: 0, y: 0 });
    state.addAction(b, { x: 10, y: 10 });
    state.attachChild(a.id, b.id);
    let next = store.getState();
    expect(next.layout[b.id]?.parentId).toBe(a.id);
    expect(next.layout[a.id]?.parentId).toBeNull();

    state.attachChild(b.id, a.id);
    next = store.getState();
    expect(next.layout[b.id]?.parentId).toBe(a.id);
    expect(next.layout[a.id]?.parentId).toBeNull();
    expect(warnSpy).toHaveBeenCalled();
    warnSpy.mockRestore();
  });

  it("cycle indirect : attachChild(C,A) refusé si chaîne A→B→C", () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const store = createNodalProjectStore();
    const state = store.getState();
    const a = makeMsg("act-cycle2-a");
    const b = makeMsg("act-cycle2-b");
    const c = makeMsg("act-cycle2-c");
    state.addAction(a, { x: 0, y: 0 });
    state.addAction(b, { x: 10, y: 10 });
    state.addAction(c, { x: 20, y: 20 });
    state.attachChild(a.id, b.id);
    state.attachChild(b.id, c.id);
    expect(store.getState().layout[c.id]?.parentId).toBe(b.id);

    state.attachChild(c.id, a.id);
    const next = store.getState();
    expect(next.layout[a.id]?.parentId).toBeNull();
    expect(next.layout[b.id]?.parentId).toBe(a.id);
    expect(next.layout[c.id]?.parentId).toBe(b.id);
    expect(warnSpy).toHaveBeenCalled();
    warnSpy.mockRestore();
  });

  it("toReactFlowNodes ne plante pas si parentId forme un cycle (données corrompues)", () => {
    const store = createNodalProjectStore();
    const state = store.getState();
    const a = makeMsg("act-rf-cyc-a");
    const b = makeMsg("act-rf-cyc-b");
    state.addAction(a, { x: 0, y: 0 });
    state.addAction(b, { x: 50, y: 0 });
    state.updateNodeLayout(a.id, { parentId: b.id });
    state.updateNodeLayout(b.id, { parentId: a.id });
    expect(() => toReactFlowNodes(store.getState())).not.toThrow();
  });

  it("cycle indirect via updateNodeLayout : attachChild(C,A) refusé", () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const store = createNodalProjectStore();
    const state = store.getState();
    const a = makeMsg("act-cycle3-a");
    const b = makeMsg("act-cycle3-b");
    const c = makeMsg("act-cycle3-c");
    state.addAction(a, { x: 0, y: 0 });
    state.addAction(b, { x: 10, y: 10 });
    state.addAction(c, { x: 20, y: 20 });
    state.updateNodeLayout(b.id, { parentId: a.id });
    state.updateNodeLayout(c.id, { parentId: b.id });
    state.attachChild(c.id, a.id);
    const next = store.getState();
    expect(next.layout[a.id]?.parentId).toBeNull();
    expect(next.layout[b.id]?.parentId).toBe(a.id);
    expect(next.layout[c.id]?.parentId).toBe(b.id);
    expect(warnSpy).toHaveBeenCalled();
    warnSpy.mockRestore();
  });
});
