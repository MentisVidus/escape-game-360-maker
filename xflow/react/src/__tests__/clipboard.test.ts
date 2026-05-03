import { describe, expect, it } from "vitest";

import { asActionNodeId, asEdgeId, asSceneNodeId } from "../model/ids";
import type { ActionNode, SceneNode } from "../model/nodes";
import { buildClipboard, getNodalClipboard, setNodalClipboard } from "../store/clipboard";
import { createNodalProjectStore } from "../store/nodalProjectStore";

const sfx = { url: "", volume: 1 };
const visibility = { requiresItem: "", hiddenIfHasItem: "", clickWhenInvisible: true };

describe("C8.5.2 clipboard + store paste", () => {
  it("copy puis paste décale et renomme les ids", () => {
    const scene: SceneNode = {
      id: asSceneNodeId("scn-1"),
      nodeType: "scene",
      sceneId: "ext-orig",
      label: "S",
      panoramaUrl: "",
    };
    const msg: ActionNode = {
      id: asActionNodeId("act-1"),
      nodeType: "action",
      actionType: "msg",
      label: "M",
      payload: { copy: { bodyHtml: "<p>x</p>", buttonLabel: "OK" } },
      sfx: { ...sfx },
      visibility: { ...visibility },
    };
    const store = createNodalProjectStore();
    const s = store.getState();
    s.addScene(scene, { x: 10, y: 20 });
    s.addAction(msg, { x: 40, y: 50 });
    s.connect({ id: asEdgeId("e-flow"), family: "flow", sourceId: scene.id, targetId: msg.id });

    const snap = store.getState();
    const clip = buildClipboard(snap, [msg.id]);
    expect(clip).not.toBeNull();
    setNodalClipboard(clip);

    const beforeActions = Object.keys(snap.actions).length;
    const newIds = store.getState().pasteClipboardAt({ x: 110, y: 220 });
    expect(newIds.length).toBeGreaterThanOrEqual(1);

    const after = store.getState();
    expect(Object.keys(after.actions).length).toBeGreaterThan(beforeActions);
    const pasted = Object.values(after.actions).find((a) => a.id !== msg.id && a.actionType === "msg");
    expect(pasted?.actionType === "msg" ? pasted.payload : null).toEqual(msg.payload);
    setNodalClipboard(null);
  });

  it("paste sans presse-papiers → aucun nouvel id", () => {
    const store = createNodalProjectStore();
    setNodalClipboard(null);
    expect(getNodalClipboard()).toBeNull();
    const ids = store.getState().pasteClipboardAt({ x: 0, y: 0 });
    expect(ids).toEqual([]);
  });
});
