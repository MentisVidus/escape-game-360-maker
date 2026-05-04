import { describe, expect, it } from "vitest";

import { asActionNodeId, asMediaNodeId, asSatelliteNodeId, asSceneNodeId } from "../model/ids";
import type { ActionNode, MediaNode, SceneNode } from "../model/nodes";
import { createNodalProjectStore } from "../store/nodalProjectStore";
import { searchNodalNodes } from "../view/palette/searchNodes";

const sfx = { url: "", volume: 1 };
const visibility = { requiresItem: "", hiddenIfHasItem: "", clickWhenInvisible: true };

describe("C8.4.1 — searchNodalNodes", () => {
  it("retourne vide pour requête vide ou blancs", () => {
    const store = createNodalProjectStore();
    expect(searchNodalNodes(store.getState(), "")).toEqual([]);
    expect(searchNodalNodes(store.getState(), "   ")).toEqual([]);
  });

  it("match insensible à la casse sur label scène et sceneId", () => {
    const store = createNodalProjectStore();
    const s: SceneNode = {
      id: asSceneNodeId("scn-1"),
      nodeType: "scene",
      sceneId: "ext-lab",
      label: "Laboratory",
      panoramaUrl: "",
    };
    store.getState().addScene(s, { x: 0, y: 0 });
    const st = store.getState();
    expect(searchNodalNodes(st, "lab").map((h) => h.nodeId)).toContain(s.id);
    expect(searchNodalNodes(st, "EXT-LAB").map((h) => h.nodeId)).toContain(s.id);
  });

  it("match label action et titre selector", () => {
    const store = createNodalProjectStore();
    const msg: ActionNode = {
      id: asActionNodeId("act-m"),
      nodeType: "action",
      actionType: "msg",
      label: "Alpha hint",
      payload: { copy: { bodyHtml: "", buttonLabel: "" } },
      sfx,
      visibility,
    };
    const sel: ActionNode = {
      id: asActionNodeId("act-s"),
      nodeType: "action",
      actionType: "selector",
      label: "Menu",
      payload: { nested: { title: "Choix principaux", copy: { bodyHtml: "", buttonLabel: "" }, displayMode: "buttons" } },
      sfx,
      visibility,
    };
    store.getState().addAction(msg, { x: 0, y: 0 });
    store.getState().addAction(sel, { x: 0, y: 0 });
    const st = store.getState();
    expect(searchNodalNodes(st, "hint").map((h) => h.nodeId)).toContain(msg.id);
    expect(searchNodalNodes(st, "principaux").map((h) => h.nodeId)).toContain(sel.id);
  });

  it("objet meta → satellites object référencés, dédoublonnage par nodeId", () => {
    const store = createNodalProjectStore();
    store.getState().upsertObject({ objectId: "key1", displayName: "Clé dorée", iconUrl: "", iconMediaId: null });
    const sat1 = asSatelliteNodeId("sat-o1");
    const sat2 = asSatelliteNodeId("sat-o2");
    store.getState().satellites[sat1] = {
      id: sat1,
      nodeType: "satellite",
      satelliteType: "object",
      data: { objectId: "key1" },
    };
    store.getState().satellites[sat2] = {
      id: sat2,
      nodeType: "satellite",
      satelliteType: "object",
      data: { objectId: "key1" },
    };
    store.getState().layout[sat1] = { x: 0, y: 0, parentId: null, collapsed: false };
    store.getState().layout[sat2] = { x: 10, y: 0, parentId: null, collapsed: false };
    const st = store.getState();
    const hits = searchNodalNodes(st, "dorée");
    const ids = hits.map((h) => h.nodeId);
    expect(ids).toContain(sat1);
    expect(ids).toContain(sat2);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("media par label", () => {
    const store = createNodalProjectStore();
    const m: MediaNode = {
      id: asMediaNodeId("med-1"),
      nodeType: "media",
      mediaType: "media-image",
      label: "Plan étage",
      data: { url: "" },
    };
    store.getState().addMedia(m, { x: 0, y: 0 });
    expect(searchNodalNodes(store.getState(), "étage").map((h) => h.nodeId)).toContain(m.id);
  });
});
