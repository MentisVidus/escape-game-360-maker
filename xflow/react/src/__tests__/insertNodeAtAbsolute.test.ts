import { describe, expect, it } from "vitest";

import { asActionNodeId, asEdgeId, asSceneNodeId, type ActionNodeId, type AnyNodeId, type SceneNodeId } from "../model/ids";
import type { ActionNode, ReqActionNode, SceneNode } from "../model/nodes";
import { findDeepestDropContainer, rewardZoneFlowRect } from "../store/dropContainerResolve";
import {
  computeTranslatedAbsolutePositions,
  decodePaletteDragPayload,
  encodePaletteDragPayload,
  findSceneBoxAtFlowPoint,
} from "../store/insertNodeAtAbsolute";
import { sboxIdFromScene } from "../store/reconcileSceneBoxes";
import { createNodalProjectStore } from "../store/nodalProjectStore";
import { absoluteFlowPositionInPane, computeContainerBounds, SCENE_PADDING_TOP, SCENE_PADDING_X } from "../view/nesting/containerBounds";

const sfx = { url: "", volume: 1 };
const visibility = { requiresItem: "", hiddenIfHasItem: "", clickWhenInvisible: true };

describe("insertNodeAtAbsolute + palette D&D (C9.1)", () => {
  it("encode / decode JSON payload (Q-C9.1-1)", () => {
    const spec = { kind: "action" as const, actionType: "msg" as const };
    expect(decodePaletteDragPayload(encodePaletteDragPayload(spec))).toEqual(spec);
    expect(decodePaletteDragPayload("")).toBeNull();
    expect(decodePaletteDragPayload("{}")).toBeNull();
    expect(decodePaletteDragPayload(JSON.stringify({ kind: "action", actionType: "nope" }))).toBeNull();
  });

  it("store.insertNodeAtAbsolute — action orpheline à la position demandée", () => {
    const store = createNodalProjectStore();
    const ids = store.getState().insertNodeAtAbsolute({ kind: "action", actionType: "msg" }, { x: 33, y: 44 }, { source: "palette" });
    expect(ids.length).toBe(1);
    const aid = ids[0] as ActionNodeId;
    const snap = store.getState();
    expect(snap.actions[aid]).toBeTruthy();
    expect(snap.layout[aid]?.x).toBe(33);
    expect(snap.layout[aid]?.y).toBe(44);
    expect(snap.layout[aid]?.parentId ?? null).toBeNull();
  });

  it("store.insertNodeAtAbsolute — scène : s-box reprend le coin absolu (reconcile)", () => {
    const store = createNodalProjectStore();
    const created = store.getState().insertNodeAtAbsolute({ kind: "scene" }, { x: 120, y: 240 }, { source: "palette" });
    const sceneId = created[0]!;
    const snap = store.getState();
    const bid = sboxIdFromScene(sceneId as SceneNodeId);
    expect(snap.layout[bid]?.x).toBe(120);
    expect(snap.layout[bid]?.y).toBe(240);
  });

  it("computeTranslatedAbsolutePositions — même translation que l’ancien collage", () => {
    const scene: SceneNode = {
      id: asSceneNodeId("scn-t"),
      nodeType: "scene",
      sceneId: "ext-t",
      label: "S",
      panoramaUrl: "",
    };
    const store = createNodalProjectStore();
    store.getState().addScene(scene, { x: 10, y: 20 });
    const snap = store.getState();
    const ids = new Set(Object.keys(snap.scenes) as AnyNodeId[]);
    const clipState = {
      meta: snap.meta,
      scenes: snap.scenes,
      sceneBoxes: snap.sceneBoxes,
      actions: snap.actions,
      satellites: snap.satellites,
      media: snap.media,
      edges: snap.edges,
      layout: snap.layout,
    };
    const abs0 = absoluteFlowPositionInPane(snap, scene.id);
    const m = computeTranslatedAbsolutePositions(clipState, ids, { x: abs0.x + 100, y: abs0.y + 200 }, abs0);
    expect(m.get(scene.id)).toEqual({ x: abs0.x + 100, y: abs0.y + 200 });
  });

  it("drop action sur s-box → orphelin top-level (pas d’auto-edge)", () => {
    const scene: SceneNode = {
      id: asSceneNodeId("scn-drop"),
      nodeType: "scene",
      sceneId: "ext-drop",
      label: "S",
      panoramaUrl: "",
    };
    const store = createNodalProjectStore();
    store.getState().addScene(scene, { x: 400, y: 300 });
    const snap = store.getState();
    const bid = sboxIdFromScene(scene.id);
    const absBox = absoluteFlowPositionInPane(snap, bid);
    const drop = { x: absBox.x + SCENE_PADDING_X + 20, y: absBox.y + SCENE_PADDING_TOP + 20 };
    expect(findSceneBoxAtFlowPoint(snap, drop)).toBe(bid);

    store.getState().insertNodeAtAbsolute({ kind: "action", actionType: "goto" }, drop, { source: "palette" });
    const after = store.getState();
    const newAct = Object.values(after.actions).find((a) => a.actionType === "goto");
    expect(newAct).toBeTruthy();
    const aid = newAct!.id;
    expect(after.layout[aid]?.parentId ?? null).toBeNull();
    const flow = after.edges.find((e) => e.family === "flow" && e.sourceId === scene.id && e.targetId === aid);
    expect(flow).toBeFalsy();
  });

  it("C9.2 — drop média sur s-box → orphelin (pas d’edge flow)", () => {
    const scene: SceneNode = {
      id: asSceneNodeId("scn-m"),
      nodeType: "scene",
      sceneId: "ext-m",
      label: "S",
      panoramaUrl: "",
    };
    const store = createNodalProjectStore();
    store.getState().addScene(scene, { x: 200, y: 200 });
    const snap = store.getState();
    const bid = sboxIdFromScene(scene.id);
    const absBox = absoluteFlowPositionInPane(snap, bid);
    const drop = { x: absBox.x + SCENE_PADDING_X + 5, y: absBox.y + SCENE_PADDING_TOP + 5 };
    store.getState().insertNodeAtAbsolute({ kind: "media", mediaType: "media-image" }, drop, { source: "palette" });
    const after = store.getState();
    const med = Object.values(after.media)[0];
    expect(med).toBeTruthy();
    expect(after.layout[med!.id]?.parentId ?? null).toBeNull();
    expect(after.edges.some((e) => e.family === "flow" && e.targetId === med!.id)).toBe(false);
  });
});

describe("C9.3 — selector + REQ/PWD + résolution conteneur", () => {
  it("findDeepestDropContainer : selector imbriqué bat le parent", () => {
    const scene: SceneNode = {
      id: asSceneNodeId("scn-nest"),
      nodeType: "scene",
      sceneId: "ext-nest",
      label: "S",
      panoramaUrl: "",
    };
    const outer: ActionNode = {
      id: asActionNodeId("act-out"),
      nodeType: "action",
      actionType: "selector",
      label: "OUT",
      payload: { nested: { title: "", copy: { bodyHtml: "", buttonLabel: "" }, displayMode: "buttons" } },
      sfx: { ...sfx },
      visibility: { ...visibility },
    };
    const inner: ActionNode = {
      id: asActionNodeId("act-in"),
      nodeType: "action",
      actionType: "selector",
      label: "IN",
      payload: { nested: { title: "", copy: { bodyHtml: "", buttonLabel: "" }, displayMode: "buttons" } },
      sfx: { ...sfx },
      visibility: { ...visibility },
    };
    const store = createNodalProjectStore();
    const s = store.getState();
    s.addScene(scene, { x: 0, y: 0 });
    s.addAction(outer, { x: 120, y: 120 });
    s.connect({ id: asEdgeId("e-out"), family: "flow", sourceId: scene.id, targetId: outer.id });
    s.addAction(inner, { x: 200, y: 200 });
    s.attachChild(outer.id, inner.id, { x: 50, y: 50 });
    const snap = store.getState();
    const absIn = absoluteFlowPositionInPane(snap, inner.id);
    const bIn = computeContainerBounds(snap, inner.id);
    const pt = { x: absIn.x + Math.min(44, bIn.width * 0.4), y: absIn.y + Math.min(36, bIn.height * 0.4) };
    const hit = findDeepestDropContainer(snap, pt);
    expect(hit).toEqual({ kind: "selector", id: inner.id });
  });

  it("drop msg sur selector → enfant + satellite choice-options", () => {
    const scene: SceneNode = {
      id: asSceneNodeId("scn-sel"),
      nodeType: "scene",
      sceneId: "ext-sel",
      label: "S",
      panoramaUrl: "",
    };
    const sel: ActionNode = {
      id: asActionNodeId("act-sel"),
      nodeType: "action",
      actionType: "selector",
      label: "SEL",
      payload: { nested: { title: "", copy: { bodyHtml: "", buttonLabel: "" }, displayMode: "buttons" } },
      sfx: { ...sfx },
      visibility: { ...visibility },
    };
    const store = createNodalProjectStore();
    const s = store.getState();
    s.addScene(scene, { x: 0, y: 0 });
    s.addAction(sel, { x: 80, y: 80 });
    s.connect({ id: asEdgeId("e-sel"), family: "flow", sourceId: scene.id, targetId: sel.id });
    const snap = store.getState();
    const abs = absoluteFlowPositionInPane(snap, sel.id);
    const b = computeContainerBounds(snap, sel.id);
    const drop = { x: abs.x + b.width * 0.35, y: abs.y + b.height * 0.35 };
    expect(findDeepestDropContainer(snap, drop)?.kind).toBe("selector");

    store.getState().insertNodeAtAbsolute({ kind: "action", actionType: "msg" }, drop, { source: "palette" });
    const after = store.getState();
    const msg = Object.values(after.actions).find((a) => a.actionType === "msg" && a.id !== sel.id);
    expect(msg).toBeTruthy();
    expect(after.layout[msg!.id]?.parentId).toBe(sel.id);
    const choiceSat = Object.values(after.satellites).find((sat) => sat.satelliteType === "choice-options");
    expect(choiceSat).toBeTruthy();
    const meta = after.edges.find((e) => e.family === "meta" && e.sourceId === msg!.id && e.targetId === choiceSat!.id);
    expect(meta).toBeTruthy();
  });

  it("drop msg sur REQ vide → rewardActionId + parent REQ", () => {
    const scene: SceneNode = {
      id: asSceneNodeId("scn-r"),
      nodeType: "scene",
      sceneId: "ext-r",
      label: "S",
      panoramaUrl: "",
    };
    const req: ActionNode = {
      id: asActionNodeId("act-r"),
      nodeType: "action",
      actionType: "req",
      label: "R",
      payload: { itemId: "", copy: { bodyHtml: "", buttonLabel: "" } },
      rewardActionId: null,
      sfx: { ...sfx },
      visibility: { ...visibility },
    };
    const store = createNodalProjectStore();
    const s = store.getState();
    s.addScene(scene, { x: 0, y: 0 });
    s.addAction(req, { x: 250, y: 180 });
    s.connect({ id: asEdgeId("e-r"), family: "flow", sourceId: scene.id, targetId: req.id });
    const snap = store.getState();
    const z = rewardZoneFlowRect(snap, req.id);
    expect(z).toBeTruthy();
    const drop = { x: z!.x + z!.width / 2, y: z!.y + z!.height / 2 };
    expect(findDeepestDropContainer(snap, drop)?.kind).toBe("reqPwd");

    store.getState().insertNodeAtAbsolute({ kind: "action", actionType: "msg" }, drop, { source: "palette" });
    const after = store.getState();
    const r = after.actions[req.id];
    expect(r?.actionType === "req" ? r.rewardActionId : null).toBeTruthy();
    const rid = (r as ReqActionNode).rewardActionId!;
    expect(after.layout[rid]?.parentId).toBe(req.id);
    expect(rewardZoneFlowRect(after, req.id)).toBeNull();
  });
});
