import { describe, expect, it } from "vitest";

import { asActionNodeId, asEdgeId, asSceneNodeId, type SceneNodeId } from "../model/ids";
import type { ActionNode, SceneNode } from "../model/nodes";
import { applyHydratedLayout, serializeLayout } from "../serialize/mapLayoutJson";
import { deserializeFromProjectJson, stableSceneNodeIdFromExternal } from "../serialize/fromProjectJson";
import { migrateSceneToSBoxParenting } from "../serialize/migrateSceneToSBoxParenting";
import { getHotspotActionIdsForScene, type ProjectJsonV2 } from "../serialize/toProjectJson";
import { sboxIdFromScene } from "../store/reconcileSceneBoxes";
import { SCENE_PADDING_TOP, SCENE_PADDING_X } from "../view/nesting/containerBounds";
import { createNodalProjectStore } from "../store/nodalProjectStore";
import { HANDLE_SYNTH_GOTO_OUT } from "../view/handles/handleIds";
import { toReactFlowEdges, toReactFlowNodes } from "../view/nodalReactFlowProjection";

const sfx = { url: "", volume: 1 };
const visibility = { requiresItem: "", hiddenIfHasItem: "", clickWhenInvisible: true };

const gotoHotspot = (target: string) => ({
  type: "goto" as const,
  payload: { target, copy: { bodyHtml: "", buttonLabel: "" } },
  sfx: { ...sfx },
  visibility: { ...visibility },
});

describe("C8.1.b.2.x — s-box (conteneur groupe) + hotspots sous le s-box", () => {
  it("migrateSceneToSBoxParenting est idempotent", () => {
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
    const bid = sboxIdFromScene(scene.id);
    expect(after.layout[act.id]?.parentId).toBe(bid);
    expect(after.layout[act.id]?.x).toBe(100);
    expect(after.layout[act.id]?.y).toBe(50);
    expect(after.layout[act.id]?.x).toBeGreaterThanOrEqual(SCENE_PADDING_X);
    expect(after.layout[act.id]?.y).toBeGreaterThanOrEqual(SCENE_PADDING_TOP);

    migrateSceneToSBoxParenting(after);
    expect(after.layout[act.id]?.x).toBe(100);
    expect(after.layout[act.id]?.y).toBe(50);
    migrateSceneToSBoxParenting(after);
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
    expect(store.getState().layout[act.id]?.parentId).toBe(sboxIdFromScene(scene.id));

    s.disconnect(edgeId);
    const after = store.getState();
    expect(after.layout[act.id]?.parentId).toBeNull();
    expect(after.layout[act.id]?.x).toBe(105);
    expect(after.layout[act.id]?.y).toBe(55);
  });

  it("getHotspotActionIdsForScene inclut parentId null ou égal au s-box", () => {
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
    const bid = sboxIdFromScene(scene.id);
    s.addAction(a2, { x: 2, y: 2, parentId: bid });
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
    const lb = after.layout[sboxIdFromScene(scene.id)];
    expect(lx?.x).toBeGreaterThanOrEqual(SCENE_PADDING_X);
    expect(lx?.y).toBeGreaterThanOrEqual(SCENE_PADDING_TOP);
    expect((lb?.x ?? 0) + (lx?.x ?? 0)).toBeCloseTo(absX, 5);
    expect((lb?.y ?? 0) + (lx?.y ?? 0)).toBeCloseTo(absY, 5);
  });

  it("migrateSceneToSBoxParenting re-ancre une action legacy parentId scène", () => {
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
      sceneBoxes: {},
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
    migrateSceneToSBoxParenting(state);
    const bid = sboxIdFromScene(scene.id);
    expect(state.layout[act.id]?.parentId).toBe(bid);
    expect(state.layout[act.id]?.x).toBe(SCENE_PADDING_X);
    expect(state.layout[act.id]?.y).toBe(SCENE_PADDING_TOP);
    expect((state.layout[bid]?.x ?? 0) + (state.layout[act.id]?.x ?? 0)).toBeCloseTo(absX, 5);
    expect((state.layout[bid]?.y ?? 0) + (state.layout[act.id]?.y ?? 0)).toBeCloseTo(absY, 5);
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
    const bid = sboxIdFromScene(sceneId as SceneNodeId);
    const layoutJson = {
      positions: {
        [actionId]: { x: 250, y: 320 },
      },
      parentId: {
        [sceneId]: bid,
      },
      nodalSceneLayoutByExternalId: {
        s1: { x: 100, y: 200, collapsed: false },
      },
      nodalSceneBoxLayoutByExternalId: {
        s1: { x: 100, y: 200, collapsed: false },
      },
      collapsed: { [sceneId]: false, [actionId]: false },
      drafts: [] as string[],
      viewport: { x: 0, y: 0, zoom: 1 },
    };
    applyHydratedLayout(state, layoutJson, projectJson);
    expect(state.layout[actionId]?.parentId).toBe(bid);
    expect(state.layout[actionId]?.x).toBe(150);
    expect(state.layout[actionId]?.y).toBe(120);
  });

  it("1.b.3 : s-box replié masque les actions, pas la scène", () => {
    const scene: SceneNode = {
      id: asSceneNodeId("scn-fold"),
      nodeType: "scene",
      sceneId: "ext-fold",
      label: "S",
      panoramaUrl: "",
    };
    const act: ActionNode = {
      id: asActionNodeId("act-fold"),
      nodeType: "action",
      actionType: "msg",
      label: "M",
      payload: { copy: { bodyHtml: "", buttonLabel: "" } },
      sfx: { ...sfx },
      visibility: { ...visibility },
    };
    const store = createNodalProjectStore();
    const s = store.getState();
    s.addScene(scene, { x: 0, y: 0 });
    s.addAction(act, { x: 200, y: 50 });
    s.connect({ id: asEdgeId("e-fold"), family: "flow", sourceId: scene.id, targetId: act.id });
    const bid = sboxIdFromScene(scene.id);
    store.getState().toggleNodeCollapsed(bid);
    const nodes = toReactFlowNodes(store.getState());
    expect(nodes.find((n) => n.id === act.id)?.hidden).toBe(true);
    expect(nodes.find((n) => n.id === scene.id)?.hidden).toBeFalsy();
    const sceneRf = nodes.find((n) => n.id === scene.id);
    expect((sceneRf?.data as { containerCollapsed?: boolean }).containerCollapsed).toBe(true);
    expect((sceneRf?.data as { sceneBoxActionCount?: number }).sceneBoxActionCount).toBeGreaterThan(0);
  });

  it("1.b.3 : s-box replié + goto interne → edge synthétique depuis la scène", () => {
    const extA = "sc-fold-a";
    const extB = "sc-fold-b";
    const projectJson: ProjectJsonV2 = {
      schemaVersion: 2,
      title: "T",
      startSceneId: extA,
      scenes: [
        {
          id: extA,
          title: "A",
          panoramaUrl: "",
          hotspots: [{ action: gotoHotspot(extB) }],
        },
        { id: extB, title: "B", panoramaUrl: "", hotspots: [] },
      ],
    };
    const layoutBase = {
      positions: {},
      parentId: {},
      collapsed: {},
      drafts: [] as string[],
      viewport: { x: 0, y: 0, zoom: 1 },
      nodalSceneLayoutByExternalId: {
        [extA]: { x: 0, y: 0, collapsed: false },
        [extB]: { x: 400, y: 0, collapsed: false },
      },
      nodalSceneBoxLayoutByExternalId: {
        [extA]: { x: 0, y: 0, collapsed: false },
        [extB]: { x: 400, y: 0, collapsed: false },
      },
      nodalActionLayoutByPathKey: {
        [`${extA}:h:0`]: { x: 0, y: 0, collapsed: false },
      },
    };
    const store = createNodalProjectStore();
    store.getState().hydrateFromProject(projectJson, layoutBase);
    const scA = stableSceneNodeIdFromExternal(extA);
    const scB = stableSceneNodeIdFromExternal(extB);
    const bid = sboxIdFromScene(scA);
    store.getState().toggleNodeCollapsed(bid);
    const st = store.getState();
    expect(st.layout[bid]?.collapsed).toBe(true);
    const edges = toReactFlowEdges(st);
    const synth = edges.filter((e) => e.id === `synth-trans-${scA}-${scB}`);
    expect(synth).toHaveLength(1);
    expect(synth[0].source).toBe(scA);
    expect(synth[0].target).toBe(scB);
    expect(synth[0].sourceHandle).toBe(HANDLE_SYNTH_GOTO_OUT);
    const sceneRf = toReactFlowNodes(st).find((n) => n.id === scA);
    expect((sceneRf?.data as { sceneBoxSynthGotoTargetCount?: number }).sceneBoxSynthGotoTargetCount).toBe(1);
  });

  it("1.b.3 : sérialisation conserve collapsed sur le s-box et la clé stable", () => {
    const scene: SceneNode = {
      id: asSceneNodeId("scn-rtc"),
      nodeType: "scene",
      sceneId: "ext-rtc",
      label: "S",
      panoramaUrl: "",
    };
    const act: ActionNode = {
      id: asActionNodeId("act-rtc"),
      nodeType: "action",
      actionType: "msg",
      label: "M",
      payload: { copy: { bodyHtml: "", buttonLabel: "" } },
      sfx: { ...sfx },
      visibility: { ...visibility },
    };
    const store = createNodalProjectStore();
    const s = store.getState();
    s.addScene(scene, { x: 0, y: 0 });
    s.addAction(act, { x: 100, y: 40 });
    s.connect({ id: asEdgeId("e-rtc"), family: "flow", sourceId: scene.id, targetId: act.id });
    const bid = sboxIdFromScene(scene.id);
    store.getState().toggleNodeCollapsed(bid);
    const serialized = serializeLayout(store.getState());
    expect(serialized.collapsed[bid]).toBe(true);
    expect(serialized.nodalSceneBoxLayoutByExternalId?.[scene.sceneId]?.collapsed).toBe(true);
  });
});
