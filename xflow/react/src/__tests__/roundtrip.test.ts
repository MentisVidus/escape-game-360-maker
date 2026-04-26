import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

import { asActionNodeId, asEdgeId } from "../model/ids";
import type { ActionNode, SceneNode } from "../model/nodes";
import { applyHydratedLayout, serializeLayout } from "../serialize/mapLayoutJson";
import {
  deserializeFromProjectJson,
  stableActionNodeIdFromPathKey,
  stableSceneNodeIdFromExternal,
} from "../serialize/fromProjectJson";
import { serializeToProjectJson } from "../serialize/toProjectJson";
import { reconcileAutoSatellites } from "../store/reconcileAutoSatellites";
import { createNodalProjectStore } from "../store/nodalProjectStore";

const __dirname = dirname(fileURLToPath(import.meta.url));

const makeScene = (sceneId: string, label: string): SceneNode => ({
  id: stableSceneNodeIdFromExternal(sceneId),
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

    const sceneA = makeScene("scene-a", "Scene A");
    const sceneB = makeScene("scene-b", "Scene B");
    state.addScene(sceneA, { x: 0, y: 0 });
    state.addScene(sceneB, { x: 500, y: 0 });
    state.setStartScene(sceneA.id);

    const req = {
      id: stableActionNodeIdFromPathKey("scene-a:h:0"),
      nodeType: "action" as const,
      actionType: "req" as const,
      label: "Need key",
      payload: { itemId: "key", copy: { bodyHtml: "Need key", buttonLabel: "Try" } },
      rewardActionId: null,
      sfx: { url: "", volume: 1 },
      visibility: { requiresItem: "", hiddenIfHasItem: "", clickWhenInvisible: true },
    };
    const rewardMsg = makeMsgAction(stableActionNodeIdFromPathKey("scene-a:h:0:r"), "Reward", "Door unlocked");
    state.addAction(req, { x: 150, y: 50 });
    state.addAction(rewardMsg, { x: 260, y: 50, parentId: req.id });
    state.attachChild(req.id, rewardMsg.id);
    state.connect({ id: asEdgeId("edge-scn-a-req"), family: "flow", sourceId: sceneA.id, targetId: req.id });

    const selector = {
      id: stableActionNodeIdFromPathKey("scene-b:h:0"),
      nodeType: "action" as const,
      actionType: "selector" as const,
      label: "Choose",
      payload: { nested: { title: "Choose", copy: { bodyHtml: "Pick one", buttonLabel: "" }, displayMode: "buttons" as const } },
      sfx: { url: "", volume: 1 },
      visibility: { requiresItem: "", hiddenIfHasItem: "", clickWhenInvisible: true },
    };
    const choiceTop = makeMsgAction(stableActionNodeIdFromPathKey("scene-b:h:0:c:0"), "Top", "First");
    const choiceBottom = makeMsgAction(stableActionNodeIdFromPathKey("scene-b:h:0:c:1"), "Bottom", "Second");
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

    const raw = readFileSync(join(__dirname, "../__fixtures__/roundtrip-expected.json"), "utf8");
    const expected = JSON.parse(raw) as { project: typeof projectJson; layout: typeof layoutJson };

    expect(projectJson).toEqual(expected.project);
    expect(layoutJson.inventoryObjects).toEqual(expected.layout.inventoryObjects);

    const roundtripState = deserializeFromProjectJson(projectJson);
    applyHydratedLayout(roundtripState, layoutJson);
    reconcileAutoSatellites(roundtripState);

    expect(roundtripState.layout[stableActionNodeIdFromPathKey("scene-a:h:0")]?.x).toBe(150);
    expect(roundtripState.layout[stableSceneNodeIdFromExternal("scene-a")]?.x).toBe(0);

    const projectJsonAgain = serializeToProjectJson(roundtripState);
    expect(projectJsonAgain).toEqual(projectJson);
  });
});
