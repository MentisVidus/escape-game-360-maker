import { describe, expect, it } from "vitest";

import { asActionNodeId, asEdgeId, asSceneNodeId } from "../model/ids";
import type { ActionNode, SceneNode } from "../model/nodes";
import { applyHydratedLayout } from "../serialize/mapLayoutJson";
import { deserializeFromProjectJson } from "../serialize/fromProjectJson";
import { migrateSceneParentIds } from "../serialize/migrateSceneParentIds";
import { getHotspotActionIdsForScene, type ProjectJsonV2 } from "../serialize/toProjectJson";
import { SCENE_PADDING_TOP, SCENE_PADDING_X } from "../view/nesting/containerBounds";
import { createNodalProjectStore } from "../store/nodalProjectStore";

const sfx = { url: "", volume: 1 };
const visibility = { requiresItem: "", hiddenIfHasItem: "", clickWhenInvisible: true };

describe("C8.1.b — scène comme conteneur (parentId + coords relatives)", () => {
  it("migrateSceneParentIds convertit une fois puis est idempotent", () => {
    const scene: SceneNode = {
      id: asSceneNodeId("scn-x"),
      nodeType: "scene",
      sceneId: "ext-x",
      label: "S",
      panoramaUrl: "",
    };
    const act: ActionNode = {
      id: asActionNodeId("act-x"),
      nodeType: "action",
      actionType: "msg",
      label: "M",
      payload: { copy: { bodyHtml: "", buttonLabel: "" } },
      sfx: { ...sfx },
      visibility: { ...visibility },
    };
    const store = createNodalProjectStore();
    const s = store.getState();
    s.addScene(scene, { x: 10, y: 20 });
    s.addAction(act, { x: 110, y: 70 });
    s.connect({ id: asEdgeId("e1"), family: "flow", sourceId: scene.id, targetId: act.id });
    const after = store.getState();
    expect(after.layout[act.id]?.parentId).toBe(scene.id);
    expect(after.layout[act.id]?.x).toBe(100);
    expect(after.layout[act.id]?.y).toBe(50);
    expect(after.layout[act.id]?.x).toBeGreaterThanOrEqual(SCENE_PADDING_X);
    expect(after.layout[act.id]?.y).toBeGreaterThanOrEqual(SCENE_PADDING_TOP);

    migrateSceneParentIds(after);
    expect(after.layout[act.id]?.x).toBe(100);
    expect(after.layout[act.id]?.y).toBe(50);
    migrateSceneParentIds(after);
    expect(after.layout[act.id]?.x).toBe(100);
  });

  it("disconnect du dernier flow scène→action repasse en absolu + parentId null", () => {
    const scene: SceneNode = {
      id: asSceneNodeId("scn-y"),
      nodeType: "scene",
      sceneId: "ext-y",
      label: "S",
      panoramaUrl: "",
    };
    const act: ActionNode = {
      id: asActionNodeId("act-y"),
      nodeType: "action",
      actionType: "msg",
      label: "M",
      payload: { copy: { bodyHtml: "", buttonLabel: "" } },
      sfx: { ...sfx },
      visibility: { ...visibility },
    };
    const store = createNodalProjectStore();
    const s = store.getState();
    s.addScene(scene, { x: 5, y: 5 });
    s.addAction(act, { x: 105, y: 55 });
    const edgeId = asEdgeId("e-flow-y");
    s.connect({ id: edgeId, family: "flow", sourceId: scene.id, targetId: act.id });
    expect(store.getState().layout[act.id]?.parentId).toBe(scene.id);

    s.disconnect(edgeId);
    const after = store.getState();
    expect(after.layout[act.id]?.parentId).toBeNull();
    expect(after.layout[act.id]?.x).toBe(105);
    expect(after.layout[act.id]?.y).toBe(55);
  });

  it("getHotspotActionIdsForScene inclut parentId null ou égal à la scène", () => {
    const scene: SceneNode = {
      id: asSceneNodeId("scn-z"),
      nodeType: "scene",
      sceneId: "ext-z",
      label: "S",
      panoramaUrl: "",
    };
    const a1: ActionNode = {
      id: asActionNodeId("act-z1"),
      nodeType: "action",
      actionType: "msg",
      label: "A1",
      payload: { copy: { bodyHtml: "", buttonLabel: "" } },
      sfx: { ...sfx },
      visibility: { ...visibility },
    };
    const a2: ActionNode = {
      id: asActionNodeId("act-z2"),
      nodeType: "action",
      actionType: "msg",
      label: "A2",
      payload: { copy: { bodyHtml: "", buttonLabel: "" } },
      sfx: { ...sfx },
      visibility: { ...visibility },
    };
    const store = createNodalProjectStore();
    const s = store.getState();
    s.addScene(scene, { x: 0, y: 0 });
    s.addAction(a1, { x: 1, y: 1 });
    s.addAction(a2, { x: 2, y: 2, parentId: scene.id });
    s.connect({ id: asEdgeId("ez1"), family: "flow", sourceId: scene.id, targetId: a1.id });
    s.connect({ id: asEdgeId("ez2"), family: "flow", sourceId: scene.id, targetId: a2.id });
    const st = store.getState();
    const ids = getHotspotActionIdsForScene(st, scene.id);
    expect(ids.sort()).toEqual([a1.id, a2.id].sort());
  });

  it("connect : action en absolu au-dessus/à gauche de la scène → relatif ≥ pad, monde inchangé", () => {
    const scene: SceneNode = {
      id: asSceneNodeId("scn-above"),
      nodeType: "scene",
      sceneId: "ext-above",
      label: "S",
      panoramaUrl: "",
    };
    const act: ActionNode = {
      id: asActionNodeId("act-above"),
      nodeType: "action",
      actionType: "msg",
      label: "M",
      payload: { copy: { bodyHtml: "", buttonLabel: "" } },
      sfx: { ...sfx },
      visibility: { ...visibility },
    };
    const store = createNodalProjectStore();
    const s = store.getState();
    s.addScene(scene, { x: 100, y: 100 });
    s.addAction(act, { x: 30, y: 40 });
    const absX = 30;
    const absY = 40;
    s.connect({ id: asEdgeId("e-above"), family: "flow", sourceId: scene.id, targetId: act.id });
    const after = store.getState();
    const lx = after.layout[act.id];
    const ls = after.layout[scene.id];
    expect(lx?.x).toBeGreaterThanOrEqual(SCENE_PADDING_X);
    expect(lx?.y).toBeGreaterThanOrEqual(SCENE_PADDING_TOP);
    expect((ls?.x ?? 0) + (lx?.x ?? 0)).toBeCloseTo(absX, 5);
    expect((ls?.y ?? 0) + (lx?.y ?? 0)).toBeCloseTo(absY, 5);
  });

  it("migrateSceneParentIds re-ancre une action déjà parentId scène avec coords relatives négatives", () => {
    const scene: SceneNode = {
      id: asSceneNodeId("scn-contam"),
      nodeType: "scene",
      sceneId: "ext-c",
      label: "S",
      panoramaUrl: "",
    };
    const act: ActionNode = {
      id: asActionNodeId("act-contam"),
      nodeType: "action",
      actionType: "msg",
      label: "M",
      payload: { copy: { bodyHtml: "", buttonLabel: "" } },
      sfx: { ...sfx },
      visibility: { ...visibility },
    };
    const state = {
      meta: {
        title: "T",
        startSceneId: scene.id,
        viewport: { x: 0, y: 0, zoom: 1 },
        draftActionIds: [],
        objects: {},
      },
      scenes: { [scene.id]: scene },
      actions: { [act.id]: act },
      satellites: {},
      media: {},
      edges: [{ id: asEdgeId("ec"), family: "flow" as const, sourceId: scene.id, targetId: act.id }],
      layout: {
        [scene.id]: { x: 50, y: 60, parentId: null, collapsed: false },
        [act.id]: { x: -20, y: -5, parentId: scene.id, collapsed: false },
      },
    };
    const absX = 50 + -20;
    const absY = 60 + -5;
    migrateSceneParentIds(state);
    expect(state.layout[act.id]?.x).toBe(SCENE_PADDING_X);
    expect(state.layout[act.id]?.y).toBe(SCENE_PADDING_TOP);
    expect((state.layout[scene.id]?.x ?? 0) + (state.layout[act.id]?.x ?? 0)).toBeCloseTo(absX, 5);
    expect((state.layout[scene.id]?.y ?? 0) + (state.layout[act.id]?.y ?? 0)).toBeCloseTo(absY, 5);
  });

  it("hydrate : migrate après layout stable conserve les positions monde pour un hotspot", () => {
    const projectJson: ProjectJsonV2 = {
      schemaVersion: 2,
      title: "T",
      startSceneId: "s1",
      scenes: [
        {
          id: "s1",
          title: "S",
          panoramaUrl: "",
          hotspots: [
            {
              action: {
                type: "msg",
                payload: { copy: { bodyHtml: "x", buttonLabel: "OK" } },
                sfx: { ...sfx },
                visibility: { ...visibility },
              },
            },
          ],
        },
      ],
    };
    const state = deserializeFromProjectJson(projectJson);
    const sceneId = Object.keys(state.scenes)[0]!;
    const actionId = Object.keys(state.actions)[0]!;
    const layoutJson = {
      positions: {
        [sceneId]: { x: 100, y: 200 },
        [actionId]: { x: 250, y: 320 },
      },
      parentId: {},
      collapsed: { [sceneId]: false, [actionId]: false },
      drafts: [] as string[],
      viewport: { x: 0, y: 0, zoom: 1 },
    };
    applyHydratedLayout(state, layoutJson, projectJson);
    expect(state.layout[actionId]?.parentId).toBe(sceneId);
    expect(state.layout[actionId]?.x).toBe(150);
    expect(state.layout[actionId]?.y).toBe(120);
  });
});
