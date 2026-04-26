import { describe, expect, it } from "vitest";

import { asActionNodeId, asEdgeId, asSatelliteNodeId, asSceneNodeId } from "../model/ids";
import type { ActionNode, SceneNode } from "../model/nodes";
import type { NodalProject } from "../model/project";
import { createNodalProjectStore } from "../store/nodalProjectStore";
import { computeWarnings } from "../store/computeWarnings";

const makeScene = (id: string, sceneId: string, label: string): SceneNode => ({
  id: asSceneNodeId(id),
  nodeType: "scene",
  sceneId,
  label,
  panoramaUrl: "",
});

const makeMsg = (id: string, label = "Msg"): ActionNode => ({
  id: asActionNodeId(id),
  nodeType: "action",
  actionType: "msg",
  label,
  payload: { copy: { bodyHtml: "", buttonLabel: "OK" } },
  sfx: { url: "", volume: 1 },
  visibility: { requiresItem: "", hiddenIfHasItem: "", clickWhenInvisible: true },
});

const makeSelector = (id: string, label = "Selector"): ActionNode => ({
  id: asActionNodeId(id),
  nodeType: "action",
  actionType: "selector",
  label,
  payload: { nested: { title: label, copy: { bodyHtml: "", buttonLabel: "" }, displayMode: "buttons" } },
  sfx: { url: "", volume: 1 },
  visibility: { requiresItem: "", hiddenIfHasItem: "", clickWhenInvisible: true },
});

const makeReq = (id: string, label = "Req"): ActionNode => ({
  id: asActionNodeId(id),
  nodeType: "action",
  actionType: "req",
  label,
  payload: { itemId: "key", copy: { bodyHtml: "", buttonLabel: "OK" } },
  rewardActionId: null,
  sfx: { url: "", volume: 1 },
  visibility: { requiresItem: "", hiddenIfHasItem: "", clickWhenInvisible: true },
});

describe("computeWarnings (C4)", () => {
  it("DRAFT : action sans flow-in ni parentId", () => {
    const store = createNodalProjectStore();
    store.getState().addAction(makeMsg("act-draft"), { x: 0, y: 0 });
    const warnings = computeWarnings(store.getState());
    expect(warnings.filter((w) => w.code === "DRAFT")).toHaveLength(1);
  });

  it("REWARD_MISSING : req hotspot sans rewardActionId", () => {
    const store = createNodalProjectStore();
    const scene = makeScene("scn-rm", "s-rm", "S");
    const req = makeReq("act-rm");
    store.getState().addScene(scene, { x: 0, y: 0 });
    store.getState().addAction(req, { x: 100, y: 0 });
    store.getState().connect({ id: asEdgeId("flow-rm"), family: "flow", sourceId: scene.id, targetId: req.id });
    const warnings = computeWarnings(store.getState());
    expect(warnings.filter((w) => w.code === "REWARD_MISSING")).toHaveLength(1);
  });

  it("REWARD_MISSING : req orpheline sans rewardActionId => 0", () => {
    const store = createNodalProjectStore();
    store.getState().addAction(makeReq("act-rm-orphan"), { x: 0, y: 0 });
    const warnings = computeWarnings(store.getState());
    expect(warnings.filter((w) => w.code === "REWARD_MISSING")).toHaveLength(0);
  });

  it("SELECTOR_EMPTY : selector sans enfant", () => {
    const store = createNodalProjectStore();
    store.getState().addAction(makeSelector("act-se-empty"), { x: 0, y: 0 });
    const warnings = computeWarnings(store.getState());
    expect(warnings.filter((w) => w.code === "SELECTOR_EMPTY")).toHaveLength(1);
  });

  it("SELECTOR_EMPTY : selector avec un enfant => 0", () => {
    const store = createNodalProjectStore();
    const selector = makeSelector("act-se-parent");
    const child = makeMsg("act-se-child");
    store.getState().addAction(selector, { x: 0, y: 0 });
    store.getState().addAction(child, { x: 20, y: 20 });
    store.getState().attachChild(selector.id, child.id);
    const warnings = computeWarnings(store.getState());
    expect(warnings.filter((w) => w.code === "SELECTOR_EMPTY")).toHaveLength(0);
  });

  it("SCENE_UNREACHABLE : scène non connectée depuis startSceneId", () => {
    const store = createNodalProjectStore();
    const s1 = makeScene("scn-su-1", "s1", "S1");
    const s2 = makeScene("scn-su-2", "s2", "S2");
    store.getState().addScene(s1, { x: 0, y: 0 });
    store.getState().addScene(s2, { x: 300, y: 0 });
    store.getState().setStartScene(s1.id);
    const warnings = computeWarnings(store.getState());
    expect(warnings.filter((w) => w.code === "SCENE_UNREACHABLE")).toHaveLength(1);
  });

  it("OBJECT_UNDEFINED : req avec satellite object non défini", () => {
    const reqId = asActionNodeId("act-obj-und");
    const satId = asSatelliteNodeId("sat-obj-und");
    const state: NodalProject = {
      meta: {
        title: "T",
        startSceneId: null,
        viewport: { x: 0, y: 0, zoom: 1 },
        draftActionIds: [],
        objects: {},
      },
      actions: {
        [reqId]: makeReq("act-obj-und"),
      },
      scenes: {},
      satellites: {
        [satId]: {
          id: satId,
          nodeType: "satellite",
          satelliteType: "object",
          data: { objectId: "missing-object" },
        },
      },
      media: {},
      edges: [{ id: asEdgeId("meta-obj-und"), family: "meta", sourceId: reqId, targetId: satId }],
      layout: {
        [reqId]: { x: 0, y: 0, parentId: null, collapsed: false },
        [satId]: { x: 0, y: 100, parentId: reqId, collapsed: false },
      },
    };
    const warnings = computeWarnings(state);
    expect(warnings.filter((w) => w.code === "OBJECT_UNDEFINED")).toHaveLength(1);
  });

  it("SELECTOR_CYCLE : cycle selector A -> B -> A", () => {
    const store = createNodalProjectStore();
    const a = makeSelector("act-cycle-a", "A");
    const b = makeSelector("act-cycle-b", "B");
    store.getState().addAction(a, { x: 0, y: 0 });
    store.getState().addAction(b, { x: 200, y: 0 });
    store.getState().updateNodeLayout(a.id, { parentId: b.id });
    store.getState().updateNodeLayout(b.id, { parentId: a.id });
    const warnings = computeWarnings(store.getState());
    expect(warnings.filter((w) => w.code === "SELECTOR_CYCLE")).toHaveLength(1);
  });
});
