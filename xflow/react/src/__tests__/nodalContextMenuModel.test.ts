import { describe, expect, it } from "vitest";

import { asActionNodeId, asEdgeId, asSceneNodeId } from "../model/ids";
import type { ActionNode, SceneNode } from "../model/nodes";
import { createNodalProjectStore } from "../store/nodalProjectStore";
import { buildNodalContextMenuItems } from "../view/contextMenu/nodalContextMenuModel";

const sfx = { url: "", volume: 1 };
const visibility = { requiresItem: "", hiddenIfHasItem: "", clickWhenInvisible: true };

describe("buildNodalContextMenuItems (C8.5.1)", () => {
  it("canvas vide + presse-papiers vide → aucune entrée", () => {
    const store = createNodalProjectStore();
    const items = buildNodalContextMenuItems(store.getState(), "fr", null, [], true);
    expect(items).toEqual([]);
  });

  it("scène : départ + copie + supprimer", () => {
    const scene: SceneNode = {
      id: asSceneNodeId("scn-cm"),
      nodeType: "scene",
      sceneId: "ext-cm",
      label: "Labo",
      panoramaUrl: "",
    };
    const store = createNodalProjectStore();
    const s = store.getState();
    s.addScene(scene, { x: 0, y: 0 });
    const snap = store.getState();
    const items = buildNodalContextMenuItems(snap, "fr", scene.id, [String(scene.id)], true);
    const actions = items.map((i) => i.action);
    expect(actions).toContain("set-start-scene");
    expect(actions).toContain("copy-target");
    expect(actions).toContain("delete");
    expect(items.find((i) => i.action === "copy-target")?.disabled).toBe(true);
  });

  it("action msg : ouvrir + copier + supprimer", () => {
    const scene: SceneNode = {
      id: asSceneNodeId("scn-a"),
      nodeType: "scene",
      sceneId: "ext-a",
      label: "S",
      panoramaUrl: "",
    };
    const msg: ActionNode = {
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
    s.addAction(msg, { x: 10, y: 10 });
    s.connect({ id: asEdgeId("e1"), family: "flow", sourceId: scene.id, targetId: msg.id });
    const items = buildNodalContextMenuItems(store.getState(), "fr", msg.id, [String(msg.id)], true);
    expect(items.map((i) => i.action)).toEqual(["open", "copy-target", "delete"]);
  });
});
