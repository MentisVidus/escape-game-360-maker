import { describe, expect, it } from "vitest";

import { asActionNodeId, asEdgeId, type AnyNodeId, asSceneNodeId } from "../model/ids";
import type { ActionNode, SceneNode } from "../model/nodes";
import { createNodalProjectStore } from "../store/nodalProjectStore";
import { buildNodalContextMenuItems } from "../view/contextMenu/nodalContextMenuModel";
import {
  isSynthTransitionProjectionEdgeId,
  SYNTH_TRANSITION_RF_EDGE_ID_PREFIX,
} from "../view/nodalReactFlowProjection";

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
    expect(items.find((i) => i.action === "copy-target")?.disabled).toBeUndefined();
  });

  it("fond de carte + presse-papiers non vide → Coller", () => {
    const store = createNodalProjectStore();
    const items = buildNodalContextMenuItems(store.getState(), "fr", null, [], false);
    expect(items.map((i) => i.action)).toEqual(["paste"]);
    expect(items[0]?.disabled).not.toBe(true);
  });

  it("fond de carte + sélection store + presse-papiers vide → copier / supprimer la sélection", () => {
    const scene: SceneNode = {
      id: asSceneNodeId("scn-sel"),
      nodeType: "scene",
      sceneId: "ext-sel",
      label: "S",
      panoramaUrl: "",
    };
    const store = createNodalProjectStore();
    store.getState().addScene(scene, { x: 0, y: 0 });
    const items = buildNodalContextMenuItems(store.getState(), "fr", null, [String(scene.id)], true);
    expect(items.map((i) => i.action)).toEqual(["copy-selection", "delete-selection"]);
  });

  it("fond de carte + sélection + presse-papiers non vide → Coller puis copier / supprimer", () => {
    const scene: SceneNode = {
      id: asSceneNodeId("scn-sel2"),
      nodeType: "scene",
      sceneId: "ext-sel2",
      label: "S",
      panoramaUrl: "",
    };
    const store = createNodalProjectStore();
    store.getState().addScene(scene, { x: 0, y: 0 });
    const items = buildNodalContextMenuItems(store.getState(), "fr", null, [String(scene.id)], false);
    expect(items.map((i) => i.action)).toEqual(["paste", "copy-selection", "delete-selection"]);
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

  it("s-box : aperçu 360° + repli / déplier", () => {
    const scene: SceneNode = {
      id: asSceneNodeId("scn-sbox"),
      nodeType: "scene",
      sceneId: "ext-sbox",
      label: "S",
      panoramaUrl: "",
    };
    const store = createNodalProjectStore();
    store.getState().addScene(scene, { x: 0, y: 0 });
    const snap = store.getState();
    const sboxIds = Object.keys(snap.sceneBoxes);
    expect(sboxIds.length).toBeGreaterThan(0);
    const sboxId = sboxIds[0]!;
    const items = buildNodalContextMenuItems(snap, "fr", sboxId as AnyNodeId, [sboxId], true);
    expect(items.map((i) => i.action)).toEqual(["preview-scene-360", "toggle-fold"]);
  });
});

describe("isSynthTransitionProjectionEdgeId (C9.0)", () => {
  it("reconnaît le préfixe edges projetées selector replié", () => {
    expect(isSynthTransitionProjectionEdgeId(`${SYNTH_TRANSITION_RF_EDGE_ID_PREFIX}a-b`)).toBe(true);
    expect(isSynthTransitionProjectionEdgeId("e-real-1")).toBe(false);
  });
});
