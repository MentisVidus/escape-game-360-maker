import { describe, expect, it } from "vitest";
import { strToU8, zipSync } from "fflate";

import type { AnyNodeId } from "../model/ids";
import { exportProjectEscapegameZip, importProjectEscapegameZip } from "../persistence/zipBundle";
import type { NodalProjectStore } from "../store/nodalProjectStore";
import { createNodalProjectStore } from "../store/nodalProjectStore";
import { createDemoStore } from "../view/demoProject";

function projectSnapshot(state: NodalProjectStore) {
  return {
    title: state.meta.title,
    sceneCount: Object.keys(state.scenes).length,
    actionCount: Object.keys(state.actions).length,
    viewport: { ...state.meta.viewport },
  };
}

describe("C5 — ZIP .escapegame + hydrate", () => {
  it("roundtrip démo : titre, scènes, actions, viewport inchangés", async () => {
    const storeA = createDemoStore();
    const before = projectSnapshot(storeA.getState());
    const blob = exportProjectEscapegameZip(storeA.getState());
    const { projectJson, layoutJson } = importProjectEscapegameZip(await blob.arrayBuffer());

    const storeB = createNodalProjectStore();
    storeB.getState().hydrateFromProject(projectJson, layoutJson);
    const after = projectSnapshot(storeB.getState());

    expect(after.title).toBe(before.title);
    expect(after.sceneCount).toBe(before.sceneCount);
    expect(after.actionCount).toBe(before.actionCount);
    expect(after.viewport).toEqual(before.viewport);

    const s = storeB.getState();
    const layout = s.layout;
    for (const id of Object.keys(s.scenes)) {
      expect(layout[id as AnyNodeId]).toBeDefined();
    }
    for (const id of Object.keys(s.actions)) {
      expect(layout[id as AnyNodeId]).toBeDefined();
    }
    for (const sat of Object.values(s.satellites)) {
      const pid = layout[sat.id]?.parentId;
      if (pid && pid in s.actions) {
        expect(layout[pid]).toBeDefined();
      }
    }

    const transitions = s.edges.filter((e) => e.family === "transition");
    expect(transitions.length).toBe(1);
    const goto = Object.values(s.actions).find((a) => a.actionType === "goto");
    const sceneB = Object.values(s.scenes).find((sc) => sc.sceneId === "scene-b");
    expect(goto && sceneB).toBeTruthy();
    expect(transitions.some((t) => t.sourceId === goto!.id && t.targetId === sceneB!.id)).toBe(true);
  });

  it("lève une erreur explicite si project.json est absent", () => {
    const zipped = zipSync({
      "map-layout.json": strToU8("{}"),
    });
    const buf = new Uint8Array(zipped).buffer;
    expect(() => importProjectEscapegameZip(buf)).toThrow(/project\.json absent/);
  });
});
