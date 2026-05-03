import { describe, expect, it } from "vitest";

import { asEdgeId, asMediaNodeId, asSceneNodeId, type MediaNodeId } from "../model/ids";
import type { ActionNode, MediaImageNode, SceneNode } from "../model/nodes";
import { createNodalProjectStore } from "../store/nodalProjectStore";
import { sboxIdFromScene } from "../store/reconcileSceneBoxes";
import { migrateMediaParenting } from "../serialize/migrateMediaParenting";
import { deserializeFromProjectJson, stableActionNodeIdFromPathKey } from "../serialize/fromProjectJson";
import { serializeLayout } from "../serialize/mapLayoutJson";
import { serializeToProjectJson } from "../serialize/toProjectJson";
import { isValidConnection } from "../view/connectionPolicy";
import { HANDLE_META_IN, HANDLE_META_OUT } from "../view/handles/handleIds";
import { buildNestedNodesMapFromProject } from "../view/nesting/projectNestedMap";
import { getAbsolutePosition } from "../view/nesting/geometry";
import { toReactFlowNodes } from "../view/nodalReactFlowProjection";

const sfx = { url: "", volume: 1 as const };
const visibility = { requiresItem: "", hiddenIfHasItem: "", clickWhenInvisible: true as const };

const img = (id: MediaNodeId, label: string): MediaImageNode => ({
  id,
  nodeType: "media",
  mediaType: "media-image",
  label,
  data: { url: "" },
});

describe("C8.1.b.5 — media auto-parentés (meta)", () => {
  it("connect meta scène→media : parentId + position relative, monde préservé", () => {
    const scene: SceneNode = {
      id: asSceneNodeId("scn-m1"),
      nodeType: "scene",
      sceneId: "ext-m1",
      label: "S",
      panoramaUrl: "",
    };
    const media = img(asMediaNodeId("med-m1"), "Img");
    const store = createNodalProjectStore();
    const s = store.getState();
    s.addScene(scene, { x: 100, y: 200 });
    s.addMedia(media, { x: 400, y: 350 });
    s.connect({
      id: asEdgeId("e-meta-s-m"),
      family: "meta",
      sourceId: scene.id,
      targetId: media.id,
    });
    const st = store.getState();
    expect(st.layout[media.id]?.parentId).toBe(scene.id);
    const map = buildNestedNodesMapFromProject(st);
    const abs = getAbsolutePosition(map.get(media.id)!, map);
    expect(abs.x).toBeCloseTo(400);
    expect(abs.y).toBeCloseTo(350);
  });

  it("connect meta action→media imbriquée : conversion abs→rel chaîne complète", () => {
    const scene: SceneNode = {
      id: asSceneNodeId("scn-m2"),
      nodeType: "scene",
      sceneId: "ext-m2",
      label: "S",
      panoramaUrl: "",
    };
    const sel: ActionNode = {
      id: stableActionNodeIdFromPathKey("ext-m2:h:0"),
      nodeType: "action",
      actionType: "selector",
      label: "Sel",
      payload: { nested: { title: "", choices: [] } },
      sfx: { ...sfx },
      visibility: { ...visibility },
    };
    const choice: ActionNode = {
      id: stableActionNodeIdFromPathKey("ext-m2:h:0:c:0"),
      nodeType: "action",
      actionType: "msg",
      label: "C",
      payload: { copy: { bodyHtml: "", buttonLabel: "" } },
      sfx: { ...sfx },
      visibility: { ...visibility },
    };
    const media = img(asMediaNodeId("med-m2"), "Img");
    const store = createNodalProjectStore();
    const s = store.getState();
    s.addScene(scene, { x: 0, y: 0 });
    s.addAction(sel, { x: 50, y: 80 });
    s.addAction(choice, { x: 10, y: 30 });
    s.addMedia(media, { x: 500, y: 600 });
    s.connect({ id: asEdgeId("e1"), family: "flow", sourceId: scene.id, targetId: sel.id });
    s.attachChild(sel.id, choice.id);
    s.updateNodeLayout(choice.id, { parentId: sel.id, x: 10, y: 30 });
    s.connect({
      id: asEdgeId("e-meta-ch-m"),
      family: "meta",
      sourceId: choice.id,
      targetId: media.id,
    });
    const st = store.getState();
    expect(st.layout[media.id]?.parentId).toBe(choice.id);
    const map = buildNestedNodesMapFromProject(st);
    const abs = getAbsolutePosition(map.get(media.id)!, map);
    expect(abs.x).toBeCloseTo(500);
    expect(abs.y).toBeCloseTo(600);
  });

  it("disconnect : parentId null + position absolue restaurée", () => {
    const scene: SceneNode = {
      id: asSceneNodeId("scn-m3"),
      nodeType: "scene",
      sceneId: "ext-m3",
      label: "S",
      panoramaUrl: "",
    };
    const media = img(asMediaNodeId("med-m3"), "Img");
    const store = createNodalProjectStore();
    const s = store.getState();
    s.addScene(scene, { x: 100, y: 100 });
    s.addMedia(media, { x: 300, y: 250 });
    const edgeId = asEdgeId("e-meta-dc");
    s.connect({ id: edgeId, family: "meta", sourceId: scene.id, targetId: media.id });
    s.disconnect(edgeId);
    const st = store.getState();
    expect(st.layout[media.id]?.parentId).toBeNull();
    expect(st.layout[media.id]?.x).toBeCloseTo(300);
    expect(st.layout[media.id]?.y).toBeCloseTo(250);
  });

  it("policy : 2ᵉ meta vers un media déjà connecté → isValidConnection false", () => {
    const scene: SceneNode = {
      id: asSceneNodeId("scn-m4"),
      nodeType: "scene",
      sceneId: "ext-m4",
      label: "S",
      panoramaUrl: "",
    };
    const act: ActionNode = {
      id: stableActionNodeIdFromPathKey("ext-m4:h:0"),
      nodeType: "action",
      actionType: "msg",
      label: "A",
      payload: { copy: { bodyHtml: "", buttonLabel: "" } },
      sfx: { ...sfx },
      visibility: { ...visibility },
    };
    const media = img(asMediaNodeId("med-m4"), "Img");
    const store = createNodalProjectStore();
    const s = store.getState();
    s.addScene(scene, { x: 0, y: 0 });
    s.addAction(act, { x: 50, y: 50 });
    s.addMedia(media, { x: 200, y: 200 });
    s.connect({ id: asEdgeId("e0"), family: "meta", sourceId: scene.id, targetId: media.id });
    const st = store.getState();
    const ok = isValidConnection(
      {
        source: act.id,
        target: media.id,
        sourceHandle: HANDLE_META_OUT,
        targetHandle: HANDLE_META_IN,
      },
      st
    );
    expect(ok).toBe(false);
  });

  it("migration : media avec meta-in et parentId null → parentId + relatif", () => {
    const scene: SceneNode = {
      id: asSceneNodeId("scn-m5"),
      nodeType: "scene",
      sceneId: "ext-m5",
      label: "S",
      panoramaUrl: "",
    };
    const media = img(asMediaNodeId("med-m5"), "Img");
    const store = createNodalProjectStore();
    const s = store.getState();
    s.addScene(scene, { x: 100, y: 50 });
    s.addMedia(media, { x: 400, y: 300 });
    s.connect({ id: asEdgeId("em"), family: "meta", sourceId: scene.id, targetId: media.id });
    const map0 = buildNestedNodesMapFromProject(store.getState());
    const world = getAbsolutePosition(map0.get(media.id)!, map0);
    s.updateNodeLayout(media.id, { parentId: null, x: world.x, y: world.y });
    migrateMediaParenting(store.getState());
    const st = store.getState();
    expect(st.layout[media.id]?.parentId).toBe(scene.id);
    const map = buildNestedNodesMapFromProject(st);
    const abs = getAbsolutePosition(map.get(media.id)!, map);
    expect(abs.x).toBeCloseTo(400);
    expect(abs.y).toBeCloseTo(300);
  });

  it("migration multi-meta : une seule edge, media parenté au premier source", () => {
    const scene: SceneNode = {
      id: asSceneNodeId("scn-m6"),
      nodeType: "scene",
      sceneId: "ext-m6",
      label: "S",
      panoramaUrl: "",
    };
    const act: ActionNode = {
      id: stableActionNodeIdFromPathKey("ext-m6:h:0"),
      nodeType: "action",
      actionType: "msg",
      label: "A",
      payload: { copy: { bodyHtml: "", buttonLabel: "" } },
      sfx: { ...sfx },
      visibility: { ...visibility },
    };
    const media = img(asMediaNodeId("med-m6"), "Img");
    const store = createNodalProjectStore();
    const s = store.getState();
    s.addScene(scene, { x: 0, y: 0 });
    s.addAction(act, { x: 200, y: 200 });
    s.addMedia(media, { x: 50, y: 50 });
    s.connect({ id: asEdgeId("m1"), family: "meta", sourceId: scene.id, targetId: media.id });
    store.setState({
      edges: [...store.getState().edges, { id: asEdgeId("m2"), family: "meta", sourceId: act.id, targetId: media.id }],
    });
    migrateMediaParenting(store.getState());
    const st = store.getState();
    expect(st.edges.filter((e) => e.family === "meta" && e.targetId === media.id)).toHaveLength(1);
    expect(st.edges.find((e) => e.family === "meta" && e.targetId === media.id)?.sourceId).toBe(scene.id);
    expect(st.layout[media.id]?.parentId).toBe(scene.id);
  });

  it("repli s-box : media lié à l’action → hidden ; media lié à la scène → visible", () => {
    const scene: SceneNode = {
      id: asSceneNodeId("scn-m7"),
      nodeType: "scene",
      sceneId: "ext-m7",
      label: "S",
      panoramaUrl: "",
    };
    const act: ActionNode = {
      id: stableActionNodeIdFromPathKey("ext-m7:h:0"),
      nodeType: "action",
      actionType: "msg",
      label: "A",
      payload: { copy: { bodyHtml: "", buttonLabel: "" } },
      sfx: { ...sfx },
      visibility: { ...visibility },
    };
    const medScene = img(asMediaNodeId("med-m7s"), "Ms");
    const medAct = img(asMediaNodeId("med-m7a"), "Ma");
    const store = createNodalProjectStore();
    const s = store.getState();
    s.addScene(scene, { x: 0, y: 0 });
    s.addAction(act, { x: 80, y: 40 });
    s.addMedia(medScene, { x: 300, y: 10 });
    s.addMedia(medAct, { x: 120, y: 200 });
    s.connect({ id: asEdgeId("f1"), family: "flow", sourceId: scene.id, targetId: act.id });
    s.connect({ id: asEdgeId("ms"), family: "meta", sourceId: scene.id, targetId: medScene.id });
    s.connect({ id: asEdgeId("ma"), family: "meta", sourceId: act.id, targetId: medAct.id });
    const bid = sboxIdFromScene(scene.id);
    s.toggleNodeCollapsed(bid);
    const nodes = toReactFlowNodes(store.getState());
    expect(nodes.find((n) => n.id === medAct.id)?.hidden).toBe(true);
    expect(nodes.find((n) => n.id === medScene.id)?.hidden).toBeFalsy();
  });

  it("repli selector : media sur le selector visible ; media sur choix caché", () => {
    const scene: SceneNode = {
      id: asSceneNodeId("scn-m8"),
      nodeType: "scene",
      sceneId: "ext-m8",
      label: "S",
      panoramaUrl: "",
    };
    const sel: ActionNode = {
      id: stableActionNodeIdFromPathKey("ext-m8:h:0"),
      nodeType: "action",
      actionType: "selector",
      label: "Sel",
      payload: { nested: { title: "", choices: [] } },
      sfx: { ...sfx },
      visibility: { ...visibility },
    };
    const choice: ActionNode = {
      id: stableActionNodeIdFromPathKey("ext-m8:h:0:c:0"),
      nodeType: "action",
      actionType: "msg",
      label: "C",
      payload: { copy: { bodyHtml: "", buttonLabel: "" } },
      sfx: { ...sfx },
      visibility: { ...visibility },
    };
    const medSel = img(asMediaNodeId("med-m8s"), "Ms");
    const medCh = img(asMediaNodeId("med-m8c"), "Mc");
    const store = createNodalProjectStore();
    const s = store.getState();
    s.addScene(scene, { x: 0, y: 0 });
    s.addAction(sel, { x: 50, y: 50, width: 200, height: 120 });
    s.addAction(choice, { x: 5, y: 20 });
    s.addMedia(medSel, { x: 220, y: 60 });
    s.addMedia(medCh, { x: 100, y: 300 });
    s.connect({ id: asEdgeId("f1"), family: "flow", sourceId: scene.id, targetId: sel.id });
    s.attachChild(sel.id, choice.id);
    s.updateNodeLayout(choice.id, { parentId: sel.id, x: 5, y: 20 });
    s.connect({ id: asEdgeId("ms"), family: "meta", sourceId: sel.id, targetId: medSel.id });
    s.connect({ id: asEdgeId("mc"), family: "meta", sourceId: choice.id, targetId: medCh.id });
    s.toggleNodeCollapsed(sel.id);
    const nodes = toReactFlowNodes(store.getState());
    expect(nodes.find((n) => n.id === medCh.id)?.hidden).toBe(true);
    expect(nodes.find((n) => n.id === medSel.id)?.hidden).toBeFalsy();
  });

  it("round-trip serialize/deserialize : positions monde media inchangées", () => {
    const scene: SceneNode = {
      id: asSceneNodeId("scn-m9"),
      nodeType: "scene",
      sceneId: "ext-m9",
      label: "S",
      panoramaUrl: "",
    };
    const media = img(asMediaNodeId("med-m9"), "Img");
    const store = createNodalProjectStore();
    const s = store.getState();
    s.addScene(scene, { x: 0, y: 0 });
    s.addMedia(media, { x: 333, y: 444 });
    s.connect({ id: asEdgeId("em"), family: "meta", sourceId: scene.id, targetId: media.id });
    const st1 = store.getState();
    const map1 = buildNestedNodesMapFromProject(st1);
    const absBefore = getAbsolutePosition(map1.get(media.id)!, map1);

    const projectJson = serializeToProjectJson(st1);
    const layoutJson = serializeLayout(st1);

    const store2 = createNodalProjectStore();
    store2.getState().hydrateFromProject(projectJson, layoutJson);
    const map2 = buildNestedNodesMapFromProject(store2.getState());
    const absAfter = getAbsolutePosition(map2.get(media.id)!, map2);
    /* Tolérance : padding scène dans le s-box (pad X ≈16, pad Y ≈32) selon hydrate/reanchor. */
    expect(Math.abs(absAfter.x - absBefore.x)).toBeLessThanOrEqual(24);
    expect(Math.abs(absAfter.y - absBefore.y)).toBeLessThanOrEqual(40);
  });
});
