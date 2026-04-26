import { asActionNodeId, asEdgeId } from "../model/ids";
import type { ActionNode, SceneNode } from "../model/nodes";
import { stableActionNodeIdFromPathKey, stableSceneNodeIdFromExternal } from "../serialize/fromProjectJson";
import { createNodalProjectStore } from "../store/nodalProjectStore";

export function createDemoStore() {
  const store = createNodalProjectStore();
  const state = store.getState();

  const sceneA: SceneNode = {
    id: stableSceneNodeIdFromExternal("scene-a"),
    nodeType: "scene",
    sceneId: "scene-a",
    label: "Hall",
    panoramaUrl: "",
  };
  const sceneB: SceneNode = {
    id: stableSceneNodeIdFromExternal("scene-b"),
    nodeType: "scene",
    sceneId: "scene-b",
    label: "Lab",
    panoramaUrl: "",
  };

  const msg: ActionNode = {
    id: stableActionNodeIdFromPathKey("scene-a:h:0"),
    nodeType: "action",
    actionType: "msg",
    label: "Read Note",
    payload: { copy: { bodyHtml: "Hint", buttonLabel: "OK" } },
    sfx: { url: "", volume: 1 },
    visibility: { requiresItem: "", hiddenIfHasItem: "", clickWhenInvisible: true },
  };
  const goto: ActionNode = {
    id: stableActionNodeIdFromPathKey("scene-a:h:1"),
    nodeType: "action",
    actionType: "goto",
    label: "Go To Lab",
    payload: { target: "scene-b", copy: { bodyHtml: "Move", buttonLabel: "Go" } },
    sfx: { url: "", volume: 1 },
    visibility: { requiresItem: "", hiddenIfHasItem: "", clickWhenInvisible: true },
  };

  state.addScene(sceneA, { x: 80, y: 120 });
  state.addScene(sceneB, { x: 740, y: 120 });
  state.addAction(msg, { x: 350, y: 80 });
  state.addAction(goto, { x: 350, y: 260 });
  state.connect({ id: asEdgeId("demo-flow-1"), family: "flow", sourceId: sceneA.id, targetId: msg.id });
  state.connect({ id: asEdgeId("demo-flow-2"), family: "flow", sourceId: sceneA.id, targetId: goto.id });
  state.connect({ id: asEdgeId("demo-trans-1"), family: "transition", sourceId: goto.id, targetId: sceneB.id });
  state.setStartScene(sceneA.id);

  return store;
}

