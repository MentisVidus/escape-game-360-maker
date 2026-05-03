import { describe, expect, it } from "vitest";

import { asSceneNodeId } from "../model/ids";
import type { SceneNode } from "../model/nodes";
import { createNodalProjectStore } from "../store/nodalProjectStore";
import { computeWarnings } from "../store/computeWarnings";

const scene = (id: string, ext: string, label: string): SceneNode => ({
  id: asSceneNodeId(id),
  nodeType: "scene",
  sceneId: ext,
  label,
  panoramaUrl: "",
});

describe("C8.3 — startSceneId (palette + réconciliation suppression)", () => {
  it("deux scènes sans départ → warning START_SCENE_UNSET", () => {
    const store = createNodalProjectStore();
    store.getState().addScene(scene("scn-a", "a", "A"), { x: 0, y: 0 });
    store.getState().addScene(scene("scn-b", "b", "B"), { x: 100, y: 0 });
    const w = computeWarnings(store.getState());
    expect(w.filter((x) => x.code === "START_SCENE_UNSET")).toHaveLength(1);
  });

  it("suppression du départ quand ≥2 scènes restent → startSceneId null (R2)", () => {
    const store = createNodalProjectStore();
    const a = scene("scn-a", "a", "A");
    const b = scene("scn-b", "b", "B");
    const c = scene("scn-c", "c", "C");
    store.getState().addScene(a, { x: 0, y: 0 });
    store.getState().addScene(b, { x: 100, y: 0 });
    store.getState().addScene(c, { x: 200, y: 0 });
    store.getState().setStartScene(a.id);
    store.getState().removeNode(a.id);
    expect(store.getState().meta.startSceneId).toBeNull();
    expect(Object.keys(store.getState().scenes)).toHaveLength(2);
  });

  it("suppression du départ quand une seule autre reste → elle devient départ (R3)", () => {
    const store = createNodalProjectStore();
    const a = scene("scn-a", "a", "A");
    const b = scene("scn-b", "b", "B");
    store.getState().addScene(a, { x: 0, y: 0 });
    store.getState().addScene(b, { x: 100, y: 0 });
    store.getState().setStartScene(a.id);
    store.getState().removeNode(a.id);
    expect(store.getState().meta.startSceneId).toBe(b.id);
  });

  it("setStartScene ignore un id de scène inexistant", () => {
    const store = createNodalProjectStore();
    const a = scene("scn-a", "a", "A");
    store.getState().addScene(a, { x: 0, y: 0 });
    store.getState().setStartScene(asSceneNodeId("fantome-inexistant"));
    expect(store.getState().meta.startSceneId).toBeNull();
  });
});
