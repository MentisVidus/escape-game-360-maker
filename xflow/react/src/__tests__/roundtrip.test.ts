import { describe, expect, it } from "vitest";

import { asActionNodeId, asEdgeId, asSceneNodeId } from "../model/ids";
import type { ActionNode, SceneNode } from "../model/nodes";
import { applyLayout, serializeLayout } from "../serialize/mapLayoutJson";
import { deserializeFromProjectJson } from "../serialize/fromProjectJson";
import { serializeToProjectJson } from "../serialize/toProjectJson";
import { createNodalProjectStore } from "../store/nodalProjectStore";

const makeScene = (id: string, sceneId: string, label: string): SceneNode => ({
  id: asSceneNodeId(id),
  nodeType: "scene",
  sceneId,
  label,
  panoramaUrl: `${sceneId}.jpg`,
});

const makeMsgAction = (id: string, label: string, body: string): ActionNode => ({
  id: asActionNodeId(id),
  nodeType: "action",
  actionType: "msg",
  label,
  payload: { copy: { bodyHtml: body, buttonLabel: "OK" } },
  sfx: { url: "", volume: 1 },
  visibility: { requiresItem: "", hiddenIfHasItem: "", clickWhenInvisible: true },
});

describe("nodal model C1 roundtrip", () => {
  it("serializes and deserializes project+layout consistently", () => {
    const store = createNodalProjectStore();
    const state = store.getState();

    const sceneA = makeScene("scn-a", "scene-a", "Scene A");
    const sceneB = makeScene("scn-b", "scene-b", "Scene B");
    state.addScene(sceneA, { x: 0, y: 0 });
    state.addScene(sceneB, { x: 500, y: 0 });
    state.setStartScene(sceneA.id);

    const req = {
      id: asActionNodeId("act-req"),
      nodeType: "action" as const,
      actionType: "req" as const,
      label: "Need key",
      payload: { itemId: "key", copy: { bodyHtml: "Need key", buttonLabel: "Try" } },
      rewardActionId: null,
      sfx: { url: "", volume: 1 },
      visibility: { requiresItem: "", hiddenIfHasItem: "", clickWhenInvisible: true },
    };
    const rewardMsg = makeMsgAction("act-reward", "Reward", "Door unlocked");
    state.addAction(req, { x: 150, y: 50 });
    state.addAction(rewardMsg, { x: 260, y: 50, parentId: req.id });
    state.attachChild(req.id, rewardMsg.id);
    state.connect({ id: asEdgeId("edge-scn-a-req"), family: "flow", sourceId: sceneA.id, targetId: req.id });

    const selector = {
      id: asActionNodeId("act-selector"),
      nodeType: "action" as const,
      actionType: "selector" as const,
      label: "Choose",
      payload: { nested: { title: "Choose", copy: { bodyHtml: "Pick one", buttonLabel: "" }, displayMode: "buttons" as const } },
      sfx: { url: "", volume: 1 },
      visibility: { requiresItem: "", hiddenIfHasItem: "", clickWhenInvisible: true },
    };
    const choiceTop = makeMsgAction("act-choice-top", "Top", "First");
    const choiceBottom = makeMsgAction("act-choice-bottom", "Bottom", "Second");
    state.addAction(selector, { x: 650, y: 60 });
    state.addAction(choiceBottom, { x: 700, y: 180, parentId: selector.id });
    state.addAction(choiceTop, { x: 700, y: 120, parentId: selector.id });
    state.attachChild(selector.id, choiceBottom.id);
    state.attachChild(selector.id, choiceTop.id);
    state.connect({
      id: asEdgeId("edge-scn-b-selector"),
      family: "flow",
      sourceId: sceneB.id,
      targetId: selector.id,
    });

    const orphan = makeMsgAction("act-orphan", "Draft", "Not connected");
    state.addAction(orphan, { x: 1000, y: 100 });

    const projectJson = serializeToProjectJson(store.getState());
    const layoutJson = serializeLayout(store.getState());

    expect(JSON.stringify(projectJson)).not.toContain("Not connected");
    expect(layoutJson.drafts).toContain(orphan.id);

    const roundtripState = deserializeFromProjectJson(projectJson);
    applyLayout(roundtripState, layoutJson);

    const projectJsonAgain = serializeToProjectJson(roundtripState);
    expect(projectJsonAgain).toEqual(projectJson);
  });
});

