import { describe, expect, it } from "vitest";

import { asEdgeId } from "../model/ids";
import type { ActionNode } from "../model/nodes";
import { stableActionNodeIdFromPathKey, stableSceneNodeIdFromExternal } from "../serialize/fromProjectJson";
import { createNodalProjectStore } from "../store/nodalProjectStore";

describe("goto + transition", () => {
  it("connect transition met à jour payload.target avec scene.sceneId (V2)", () => {
    const store = createNodalProjectStore();
    const s = store.getState();
    const sceneId = stableSceneNodeIdFromExternal("scene-x");
    s.addScene({ id: sceneId, nodeType: "scene", sceneId: "scene-x", label: "L", panoramaUrl: "" }, { x: 0, y: 0 });
    const gid = stableActionNodeIdFromPathKey("scene-x:h:0");
    const goto: ActionNode = {
      id: gid,
      nodeType: "action",
      actionType: "goto",
      label: "G",
      payload: { target: "", copy: { bodyHtml: "", buttonLabel: "" } },
      sfx: { url: "", volume: 1 },
      visibility: { requiresItem: "", hiddenIfHasItem: "", clickWhenInvisible: true },
    };
    s.addAction(goto, { x: 10, y: 10 });
    s.connect({ id: asEdgeId("t1"), family: "transition", sourceId: gid, targetId: sceneId });
    const g = store.getState().actions[gid];
    expect(g?.actionType).toBe("goto");
    if (g?.actionType === "goto") expect(g.payload.target).toBe("scene-x");
  });
});
