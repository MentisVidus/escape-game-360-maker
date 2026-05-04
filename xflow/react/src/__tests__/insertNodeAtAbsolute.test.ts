import { describe, expect, it } from "vitest";

import { asSceneNodeId, type ActionNodeId, type AnyNodeId, type SceneNodeId } from "../model/ids";
import type { SceneNode } from "../model/nodes";
import {
  computeTranslatedAbsolutePositions,
  decodePaletteDragPayload,
  encodePaletteDragPayload,
  findSceneBoxAtFlowPoint,
} from "../store/insertNodeAtAbsolute";
import { sboxIdFromScene } from "../store/reconcileSceneBoxes";
import { createNodalProjectStore } from "../store/nodalProjectStore";
import { absoluteFlowPositionInPane, SCENE_PADDING_TOP, SCENE_PADDING_X } from "../view/nesting/containerBounds";

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

  it("C9.2 — drop action sur s-box → parent s-box + edge flow scène→action", () => {
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
    expect(after.layout[aid]?.parentId).toBe(bid);
    const flow = after.edges.find((e) => e.family === "flow" && e.sourceId === scene.id && e.targetId === aid);
    expect(flow).toBeTruthy();
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
