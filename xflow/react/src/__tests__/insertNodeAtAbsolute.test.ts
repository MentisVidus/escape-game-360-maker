import { describe, expect, it } from "vitest";

import { asSceneNodeId, type ActionNodeId, type AnyNodeId, type SceneNodeId } from "../model/ids";
import type { SceneNode } from "../model/nodes";
import {
  computeTranslatedAbsolutePositions,
  decodePaletteDragPayload,
  encodePaletteDragPayload,
} from "../store/insertNodeAtAbsolute";
import { sboxIdFromScene } from "../store/reconcileSceneBoxes";
import { createNodalProjectStore } from "../store/nodalProjectStore";
import { absoluteFlowPositionInPane } from "../view/nesting/containerBounds";

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
});
