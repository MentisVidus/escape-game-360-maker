import { describe, expect, it } from "vitest";

import {
  applyHydratedLayout,
  applyLayout,
  serializeLayout,
} from "../serialize/mapLayoutJson";
import {
  deserializeFromProjectJson,
  stableActionNodeIdFromPathKey,
} from "../serialize/fromProjectJson";
import type { ProjectJsonV2, ProjectJsonV2Action } from "../serialize/toProjectJson";
import {
  toReactFlowEdges,
  toReactFlowNodes,
} from "../view/nodalReactFlowProjection";

const sfx = { url: "", volume: 1 };
const visibility = { requiresItem: "", hiddenIfHasItem: "", clickWhenInvisible: true };

const msg = (body: string): ProjectJsonV2Action => ({
  type: "msg",
  payload: { copy: { bodyHtml: body, buttonLabel: "OK" } },
  sfx: { ...sfx },
  visibility: { ...visibility },
});

const selector = (title: string, choices: ProjectJsonV2Action[]): ProjectJsonV2Action => ({
  type: "selector",
  payload: {
    nested: {
      title,
      copy: { bodyHtml: "", buttonLabel: "" },
      displayMode: "buttons",
      choices: choices.map((action) => ({ label: "opt", action })),
    },
  },
  sfx: { ...sfx },
  visibility: { ...visibility },
});

function buildSelectorProject() {
  const sceneId = "scn";
  const projectJson: ProjectJsonV2 = {
    schemaVersion: 2,
    title: "T",
    startSceneId: sceneId,
    scenes: [
      {
        id: sceneId,
        title: "S",
        panoramaUrl: "",
        hotspots: [
          {
            action: selector("S1", [
              msg("c1"),
              selector("S2", [msg("c2.1"), msg("c2.2")]),
            ]),
          },
        ],
      },
    ],
  };
  return { projectJson, sceneId };
}

describe("C8.1 — repliement des selectors", () => {
  it("toReactFlowNodes/Edges marquent les enfants d'un selector replié comme hidden", () => {
    const { projectJson, sceneId } = buildSelectorProject();
    const s1 = stableActionNodeIdFromPathKey(`${sceneId}:h:0`);
    const s2 = stableActionNodeIdFromPathKey(`${sceneId}:h:0:c:1`);
    const c1 = stableActionNodeIdFromPathKey(`${sceneId}:h:0:c:0`);
    const c21 = stableActionNodeIdFromPathKey(`${sceneId}:h:0:c:1:c:0`);
    const c22 = stableActionNodeIdFromPathKey(`${sceneId}:h:0:c:1:c:1`);

    const layoutJson = {
      positions: {},
      parentId: {},
      collapsed: {},
      drafts: [],
      viewport: { x: 0, y: 0, zoom: 1 },
      nodalSceneLayoutByExternalId: { [sceneId]: { x: 0, y: 0, collapsed: false } },
      nodalActionLayoutByPathKey: {
        [`${sceneId}:h:0`]: { x: 0, y: 0, collapsed: false },
        [`${sceneId}:h:0:c:0`]: { x: 0, y: 0, collapsed: false },
        [`${sceneId}:h:0:c:1`]: { x: 0, y: 0, collapsed: false },
        [`${sceneId}:h:0:c:1:c:0`]: { x: 0, y: 0, collapsed: false },
        [`${sceneId}:h:0:c:1:c:1`]: { x: 0, y: 0, collapsed: false },
      },
    };

    const state = deserializeFromProjectJson(projectJson);
    applyHydratedLayout(state, layoutJson, projectJson);

    // Sanity : tous visibles avant repliement
    const nodesBefore = toReactFlowNodes(state);
    const edgesBefore = toReactFlowEdges(state);
    for (const id of [s1, s2, c1, c21, c22]) {
      const n = nodesBefore.find((node) => node.id === id);
      expect(n, `node ${id} avant repliement`).toBeTruthy();
      expect(n?.hidden, `node ${id} hidden avant repliement`).toBeFalsy();
    }
    expect(edgesBefore.every((edge) => !edge.hidden)).toBe(true);

    // Replie le selector S1
    state.layout[s1] = { ...state.layout[s1], collapsed: true };
    const nodesAfter = toReactFlowNodes(state);

    // S1 lui-même reste visible
    expect(nodesAfter.find((n) => n.id === s1)?.hidden).toBeFalsy();
    // tous ses descendants sont cachés (transitif)
    for (const id of [s2, c1, c21, c22]) {
      const n = nodesAfter.find((node) => node.id === id);
      expect(n?.hidden, `node ${id} doit être hidden`).toBe(true);
    }

    // Le compteur de choix de S1 vaut 2 (c1 + s2)
    const s1Data = nodesAfter.find((n) => n.id === s1)?.data as { selectorChildCount?: number };
    expect(s1Data?.selectorChildCount).toBe(2);
    expect((nodesAfter.find((n) => n.id === s1)?.data as { collapsed?: boolean }).collapsed).toBe(true);
  });

  it("le flag collapsed survit à un round-trip serialize/applyLayout", () => {
    const { projectJson, sceneId } = buildSelectorProject();
    const s1 = stableActionNodeIdFromPathKey(`${sceneId}:h:0`);

    const initialLayout = {
      positions: {},
      parentId: {},
      collapsed: {},
      drafts: [],
      viewport: { x: 0, y: 0, zoom: 1 },
      nodalSceneLayoutByExternalId: { [sceneId]: { x: 0, y: 0, collapsed: false } },
      nodalActionLayoutByPathKey: {
        [`${sceneId}:h:0`]: { x: 0, y: 0, collapsed: false },
        [`${sceneId}:h:0:c:0`]: { x: 0, y: 0, collapsed: false },
        [`${sceneId}:h:0:c:1`]: { x: 0, y: 0, collapsed: false },
        [`${sceneId}:h:0:c:1:c:0`]: { x: 0, y: 0, collapsed: false },
        [`${sceneId}:h:0:c:1:c:1`]: { x: 0, y: 0, collapsed: false },
      },
    };
    const state = deserializeFromProjectJson(projectJson);
    applyHydratedLayout(state, initialLayout, projectJson);
    state.layout[s1] = { ...state.layout[s1], collapsed: true };

    const serialized = serializeLayout(state);
    expect(serialized.collapsed[s1]).toBe(true);
    expect(serialized.nodalActionLayoutByPathKey?.[`${sceneId}:h:0`].collapsed).toBe(true);

    const fresh = deserializeFromProjectJson(projectJson);
    applyLayout(fresh, serialized);
    expect(fresh.layout[s1]?.collapsed).toBe(true);
  });
});
