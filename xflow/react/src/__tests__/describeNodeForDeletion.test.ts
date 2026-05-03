import { describe, expect, it } from "vitest";

import { asActionNodeId, asEdgeId, asSceneNodeId } from "../model/ids";
import type { ActionNode, SceneNode } from "../model/nodes";
import { createNodalProjectStore } from "../store/nodalProjectStore";
import {
  describeNodeForDeletion,
  filterRfDeletionRoots,
  orderedDeleteChainForStoreNode,
} from "../view/deletion/describeNodeForDeletion";

const sfx = { url: "", volume: 1 };
const visibility = { requiresItem: "", hiddenIfHasItem: "", clickWhenInvisible: true };

describe("filterRfDeletionRoots", () => {
  it("ne garde que la racine si ancêtre présent dans le lot (REQ2>REQ3>MSG)", () => {
    const deleted = [
      { id: "req2", parentId: "sceneBox" },
      { id: "req3", parentId: "req2" },
      { id: "msg1", parentId: "req3" },
    ];
    const roots = filterRfDeletionRoots(deleted);
    expect(roots.map((r) => r.id)).toEqual(["req2"]);
  });
});

describe("describeNodeForDeletion (C8.2.2)", () => {
  it("scène sans action → pas de confirmation", () => {
    const scene: SceneNode = {
      id: asSceneNodeId("scn-empty"),
      nodeType: "scene",
      sceneId: "ext-e",
      label: "Vide",
      panoramaUrl: "",
    };
    const store = createNodalProjectStore();
    store.getState().addScene(scene, { x: 0, y: 0 });
    const d = describeNodeForDeletion(store.getState(), scene.id, "fr");
    expect(d).not.toBeNull();
    expect(d!.needsConfirm).toBe(false);
  });

  it("scène avec action → confirmation + message", () => {
    const scene: SceneNode = {
      id: asSceneNodeId("scn-full"),
      nodeType: "scene",
      sceneId: "ext-f",
      label: "Labo",
      panoramaUrl: "",
    };
    const act: ActionNode = {
      id: asActionNodeId("act-m"),
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
    s.addAction(act, { x: 50, y: 50 });
    s.connect({ id: asEdgeId("ef1"), family: "flow", sourceId: scene.id, targetId: act.id });
    const d = describeNodeForDeletion(store.getState(), scene.id, "fr");
    expect(d?.needsConfirm).toBe(true);
    expect(d?.body).toContain("Labo");
    expect(d?.body).toMatch(/1 action/);
  });

  it("selector sans choix → pas de confirmation", () => {
    const scene: SceneNode = {
      id: asSceneNodeId("scn-s"),
      nodeType: "scene",
      sceneId: "ext-s",
      label: "S",
      panoramaUrl: "",
    };
    const sel: ActionNode = {
      id: asActionNodeId("act-sel"),
      nodeType: "action",
      actionType: "selector",
      label: "Menu",
      payload: {
        nested: { title: "T", copy: { bodyHtml: "", buttonLabel: "" }, displayMode: "buttons" },
      },
      sfx: { ...sfx },
      visibility: { ...visibility },
    };
    const store = createNodalProjectStore();
    const s = store.getState();
    s.addScene(scene, { x: 0, y: 0 });
    s.addAction(sel, { x: 40, y: 40 });
    s.connect({ id: asEdgeId("es1"), family: "flow", sourceId: scene.id, targetId: sel.id });
    const d = describeNodeForDeletion(store.getState(), sel.id, "fr");
    expect(d?.needsConfirm).toBe(false);
  });

  it("selector avec choix → confirmation", () => {
    const scene: SceneNode = {
      id: asSceneNodeId("scn-s2"),
      nodeType: "scene",
      sceneId: "ext-s2",
      label: "S",
      panoramaUrl: "",
    };
    const sel: ActionNode = {
      id: asActionNodeId("act-sel2"),
      nodeType: "action",
      actionType: "selector",
      label: "Menu",
      payload: {
        nested: { title: "T", copy: { bodyHtml: "", buttonLabel: "" }, displayMode: "buttons" },
      },
      sfx: { ...sfx },
      visibility: { ...visibility },
    };
    const choice: ActionNode = {
      id: asActionNodeId("act-ch"),
      nodeType: "action",
      actionType: "goto",
      label: "Aller",
      payload: { target: "", copy: { bodyHtml: "", buttonLabel: "" } },
      sfx: { ...sfx },
      visibility: { ...visibility },
    };
    const store = createNodalProjectStore();
    const s = store.getState();
    s.addScene(scene, { x: 0, y: 0 });
    s.addAction(sel, { x: 40, y: 40 });
    s.addAction(choice, { x: 10, y: 10 });
    s.connect({ id: asEdgeId("es2"), family: "flow", sourceId: scene.id, targetId: sel.id });
    s.attachChild(sel.id, choice.id);
    const d = describeNodeForDeletion(store.getState(), sel.id, "fr");
    expect(d?.needsConfirm).toBe(true);
    expect(d?.body).toMatch(/1 choix/);
  });

  it("REQ avec ou sans récompense → pas de confirmation", () => {
    const scene: SceneNode = {
      id: asSceneNodeId("scn-r"),
      nodeType: "scene",
      sceneId: "ext-r",
      label: "S",
      panoramaUrl: "",
    };
    const req: ActionNode = {
      id: asActionNodeId("act-req"),
      nodeType: "action",
      actionType: "req",
      label: "Besoin clé",
      payload: { itemId: "k", copy: { bodyHtml: "", buttonLabel: "" } },
      sfx: { ...sfx },
      visibility: { ...visibility },
      rewardActionId: null,
    };
    const store = createNodalProjectStore();
    const s = store.getState();
    s.addScene(scene, { x: 0, y: 0 });
    s.addAction(req, { x: 30, y: 30 });
    s.connect({ id: asEdgeId("er1"), family: "flow", sourceId: scene.id, targetId: req.id });
    expect(describeNodeForDeletion(store.getState(), req.id, "fr")?.needsConfirm).toBe(false);

    const reward: ActionNode = {
      id: asActionNodeId("act-rew"),
      nodeType: "action",
      actionType: "msg",
      label: "Récompense",
      payload: { copy: { bodyHtml: "", buttonLabel: "" } },
      sfx: { ...sfx },
      visibility: { ...visibility },
    };
    const store2 = createNodalProjectStore();
    const s2 = store2.getState();
    s2.addScene(scene, { x: 0, y: 0 });
    s2.addAction(
      { ...req, id: asActionNodeId("act-req2"), rewardActionId: asActionNodeId("act-rew") },
      { x: 30, y: 30 }
    );
    s2.addAction(reward, { x: 5, y: 5 });
    s2.connect({ id: asEdgeId("er2"), family: "flow", sourceId: scene.id, targetId: asActionNodeId("act-req2") });
    s2.attachChild(asActionNodeId("act-req2"), asActionNodeId("act-rew"));
    expect(describeNodeForDeletion(store2.getState(), asActionNodeId("act-req2"), "fr")?.needsConfirm).toBe(
      false
    );
  });

  it("msg / goto / pick → pas de confirmation", () => {
    const scene: SceneNode = {
      id: asSceneNodeId("scn-g"),
      nodeType: "scene",
      sceneId: "ext-g",
      label: "S",
      panoramaUrl: "",
    };
    const msg: ActionNode = {
      id: asActionNodeId("act-msg"),
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
    s.addAction(msg, { x: 20, y: 20 });
    s.connect({ id: asEdgeId("eg1"), family: "flow", sourceId: scene.id, targetId: msg.id });
    expect(describeNodeForDeletion(store.getState(), msg.id, "fr")?.needsConfirm).toBe(false);
  });

  it("suppression REQ : la récompense reste avec parentId null", () => {
    const scene: SceneNode = {
      id: asSceneNodeId("scn-req"),
      nodeType: "scene",
      sceneId: "ext-req",
      label: "S",
      panoramaUrl: "",
    };
    const rewardId = asActionNodeId("act-rew2");
    const reqId = asActionNodeId("act-req3");
    const req: ActionNode = {
      id: reqId,
      nodeType: "action",
      actionType: "req",
      label: "Q",
      payload: { itemId: "k", copy: { bodyHtml: "", buttonLabel: "" } },
      sfx: { ...sfx },
      visibility: { ...visibility },
      rewardActionId: rewardId,
    };
    const reward: ActionNode = {
      id: rewardId,
      nodeType: "action",
      actionType: "msg",
      label: "R",
      payload: { copy: { bodyHtml: "", buttonLabel: "" } },
      sfx: { ...sfx },
      visibility: { ...visibility },
    };
    const store = createNodalProjectStore();
    const s = store.getState();
    s.addScene(scene, { x: 0, y: 0 });
    s.addAction(req, { x: 30, y: 30 });
    s.addAction(reward, { x: 5, y: 5 });
    s.connect({ id: asEdgeId("erq"), family: "flow", sourceId: scene.id, targetId: reqId });
    s.attachChild(reqId, rewardId);
    s.removeNode(reqId);
    const after = store.getState();
    expect(after.actions[rewardId]).toBeDefined();
    expect(after.layout[rewardId]?.parentId).toBeNull();
  });

  it("orderedDeleteChainForStoreNode : scène inclut les actions avant la scène", () => {
    const scene: SceneNode = {
      id: asSceneNodeId("scn-ord"),
      nodeType: "scene",
      sceneId: "ext-o",
      label: "S",
      panoramaUrl: "",
    };
    const act: ActionNode = {
      id: asActionNodeId("act-ord"),
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
    s.addAction(act, { x: 50, y: 50 });
    s.connect({ id: asEdgeId("eo1"), family: "flow", sourceId: scene.id, targetId: act.id });
    const chain = orderedDeleteChainForStoreNode(store.getState(), scene.id);
    expect(chain[chain.length - 1]).toBe(scene.id);
    expect(chain).toContain(act.id);
    expect(chain.indexOf(act.id)).toBeLessThan(chain.indexOf(scene.id));
  });
});
