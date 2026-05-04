import { describe, expect, it } from "vitest";

import { asActionNodeId, asEdgeId, asSceneNodeId } from "../model/ids";
import type { ActionNode, SceneNode } from "../model/nodes";
import { createNodalProjectStore } from "../store/nodalProjectStore";
import {
  describeNodeForDeletion,
  orderedDeleteChainForStoreNode,
} from "../view/deletion/describeNodeForDeletion";
import { absoluteFlowPositionInPane } from "../view/nesting/containerBounds";

const sfx = { url: "", volume: 1 };
const visibility = { requiresItem: "", hiddenIfHasItem: "", clickWhenInvisible: true };

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

  it("REQ seul sans enfant layout → pas de confirmation", () => {
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
  });

  it("REQ avec enfant(s) layout (récompense / chaîne) → confirmation C8.2.2", () => {
    const scene: SceneNode = {
      id: asSceneNodeId("scn-r2"),
      nodeType: "scene",
      sceneId: "ext-r2",
      label: "S",
      panoramaUrl: "",
    };
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
      {
        id: asActionNodeId("act-req2"),
        nodeType: "action",
        actionType: "req",
        label: "Besoin",
        payload: { itemId: "k", copy: { bodyHtml: "", buttonLabel: "" } },
        sfx: { ...sfx },
        visibility: { ...visibility },
        rewardActionId: asActionNodeId("act-rew"),
      },
      { x: 30, y: 30 }
    );
    s2.addAction(reward, { x: 5, y: 5 });
    s2.connect({ id: asEdgeId("er2"), family: "flow", sourceId: scene.id, targetId: asActionNodeId("act-req2") });
    s2.attachChild(asActionNodeId("act-req2"), asActionNodeId("act-rew"));
    const d = describeNodeForDeletion(store2.getState(), asActionNodeId("act-req2"), "fr");
    expect(d?.needsConfirm).toBe(true);
    expect(d?.body).toMatch(/1 nœud/);
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

  it("suppression REQ parent d’un enfant : position absolue conservée (comme détacher)", () => {
    const scene: SceneNode = {
      id: asSceneNodeId("scn-abs"),
      nodeType: "scene",
      sceneId: "ext-abs",
      label: "S",
      panoramaUrl: "",
    };
    const req2 = asActionNodeId("req-abs2");
    const msg = asActionNodeId("msg-abs");
    const store = createNodalProjectStore();
    const s = store.getState();
    s.addScene(scene, { x: 0, y: 0 });
    s.addAction(
      {
        id: req2,
        nodeType: "action",
        actionType: "req",
        label: "R2",
        payload: { itemId: "b", copy: { bodyHtml: "", buttonLabel: "" } },
        sfx: { ...sfx },
        visibility: { ...visibility },
        rewardActionId: null,
      },
      { x: 120, y: 90 }
    );
    s.connect({ id: asEdgeId("eab1"), family: "flow", sourceId: scene.id, targetId: req2 });
    s.addAction(
      {
        id: msg,
        nodeType: "action",
        actionType: "msg",
        label: "M",
        payload: { copy: { bodyHtml: "", buttonLabel: "" } },
        sfx: { ...sfx },
        visibility: { ...visibility },
      },
      { x: 15, y: 25 }
    );
    s.attachChild(req2, msg);
    const before = store.getState();
    const absMsg = absoluteFlowPositionInPane(before, msg);
    s.removeNode(req2);
    const after = store.getState();
    expect(after.actions[msg]).toBeDefined();
    expect(after.layout[msg]?.parentId).toBeNull();
    expect(after.layout[msg]?.x).toBeCloseTo(absMsg.x, 5);
    expect(after.layout[msg]?.y).toBeCloseTo(absMsg.y, 5);
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

  it("orderedDeleteChainForStoreNode : REQ avec enfant → feuilles puis REQ", () => {
    const scene: SceneNode = {
      id: asSceneNodeId("scn-reqch"),
      nodeType: "scene",
      sceneId: "ext-rc",
      label: "S",
      panoramaUrl: "",
    };
    const reqId = asActionNodeId("act-reqch");
    const msgId = asActionNodeId("act-msgch");
    const store = createNodalProjectStore();
    const s = store.getState();
    s.addScene(scene, { x: 0, y: 0 });
    s.addAction(
      {
        id: reqId,
        nodeType: "action",
        actionType: "req",
        label: "R",
        payload: { itemId: "x", copy: { bodyHtml: "", buttonLabel: "" } },
        sfx: { ...sfx },
        visibility: { ...visibility },
        rewardActionId: null,
      },
      { x: 10, y: 10 }
    );
    s.connect({ id: asEdgeId("erc1"), family: "flow", sourceId: scene.id, targetId: reqId });
    s.addAction(
      {
        id: msgId,
        nodeType: "action",
        actionType: "msg",
        label: "M",
        payload: { copy: { bodyHtml: "", buttonLabel: "" } },
        sfx: { ...sfx },
        visibility: { ...visibility },
      },
      { x: 2, y: 2 }
    );
    s.attachChild(reqId, msgId);
    const chain = orderedDeleteChainForStoreNode(store.getState(), reqId);
    expect(chain[chain.length - 1]).toBe(reqId);
    expect(chain).toContain(msgId);
    expect(chain.indexOf(msgId)).toBeLessThan(chain.indexOf(reqId));
  });
});
