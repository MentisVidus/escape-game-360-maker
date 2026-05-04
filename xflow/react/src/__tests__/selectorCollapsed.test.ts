import { describe, expect, it } from "vitest";

import {
  applyHydratedLayout,
  applyLayout,
  serializeLayout,
} from "../serialize/mapLayoutJson";
import {
  deserializeFromProjectJson,
  stableActionNodeIdFromPathKey,
  stableSceneNodeIdFromExternal,
} from "../serialize/fromProjectJson";
import type { ProjectJsonV2, ProjectJsonV2Action } from "../serialize/toProjectJson";
import { HANDLE_GOTO_IN, HANDLE_GOTO_OUT, HANDLE_SYNTH_GOTO_OUT } from "../view/handles/handleIds";
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

const goto = (target: string): ProjectJsonV2Action => ({
  type: "goto",
  payload: { target, copy: { bodyHtml: "", buttonLabel: "" } },
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

  it("selector replié : edges synthétiques synth-goto-out → scènes (goto internes)", () => {
    const sceneA = "scnA";
    const sceneB = "scnB";
    const projectJson: ProjectJsonV2 = {
      schemaVersion: 2,
      title: "T",
      startSceneId: sceneA,
      scenes: [
        {
          id: sceneA,
          title: "A",
          panoramaUrl: "",
          hotspots: [
            {
              action: selector("S1", [msg("c1"), goto(sceneB)]),
            },
          ],
        },
        { id: sceneB, title: "B", panoramaUrl: "", hotspots: [] },
      ],
    };
    const s1 = stableActionNodeIdFromPathKey(`${sceneA}:h:0`);
    const sceneNodeB = stableSceneNodeIdFromExternal(sceneB);

    const layoutJson = {
      positions: {},
      parentId: {},
      collapsed: {},
      drafts: [],
      viewport: { x: 0, y: 0, zoom: 1 },
      nodalSceneLayoutByExternalId: {
        [sceneA]: { x: 0, y: 0, collapsed: false },
        [sceneB]: { x: 400, y: 0, collapsed: false },
      },
      nodalActionLayoutByPathKey: {
        [`${sceneA}:h:0`]: { x: 0, y: 0, collapsed: false },
        [`${sceneA}:h:0:c:0`]: { x: 0, y: 0, collapsed: false },
        [`${sceneA}:h:0:c:1`]: { x: 0, y: 0, collapsed: false },
      },
    };

    const state = deserializeFromProjectJson(projectJson);
    applyHydratedLayout(state, layoutJson, projectJson);
    state.layout[s1] = { ...state.layout[s1], collapsed: true };

    const edges = toReactFlowEdges(state);
    const synth = edges.filter((e) => e.id === `synth-trans-${s1}-${sceneNodeB}`);
    expect(synth).toHaveLength(1);
    expect(synth[0].source).toBe(s1);
    expect(synth[0].target).toBe(sceneNodeB);
    expect(synth[0].sourceHandle).toBe(HANDLE_SYNTH_GOTO_OUT);
    expect(synth[0].targetHandle).toBe(HANDLE_GOTO_IN);

    const realTransitions = edges.filter(
      (e) => e.sourceHandle === HANDLE_GOTO_OUT && e.targetHandle === HANDLE_GOTO_IN
    );
    expect(realTransitions).toHaveLength(1);
    expect(realTransitions.every((e) => e.hidden)).toBe(true);

    const s1Node = toReactFlowNodes(state).find((n) => n.id === s1);
    expect((s1Node?.data as { synthGotoTargetCount?: number }).synthGotoTargetCount).toBe(1);
  });

  it("selector replié : deux goto vers la même scène → une seule edge synthétique", () => {
    const sceneA = "scnA";
    const sceneB = "scnB";
    const projectJson: ProjectJsonV2 = {
      schemaVersion: 2,
      title: "T",
      startSceneId: sceneA,
      scenes: [
        {
          id: sceneA,
          title: "A",
          panoramaUrl: "",
          hotspots: [
            {
              action: selector("S1", [goto(sceneB), goto(sceneB)]),
            },
          ],
        },
        { id: sceneB, title: "B", panoramaUrl: "", hotspots: [] },
      ],
    };
    const s1 = stableActionNodeIdFromPathKey(`${sceneA}:h:0`);
    const sceneNodeB = stableSceneNodeIdFromExternal(sceneB);

    const layoutJson = {
      positions: {},
      parentId: {},
      collapsed: {},
      drafts: [],
      viewport: { x: 0, y: 0, zoom: 1 },
      nodalSceneLayoutByExternalId: {
        [sceneA]: { x: 0, y: 0, collapsed: false },
        [sceneB]: { x: 400, y: 0, collapsed: false },
      },
      nodalActionLayoutByPathKey: {
        [`${sceneA}:h:0`]: { x: 0, y: 0, collapsed: false },
        [`${sceneA}:h:0:c:0`]: { x: 0, y: 0, collapsed: false },
        [`${sceneA}:h:0:c:1`]: { x: 0, y: 0, collapsed: false },
      },
    };

    const state = deserializeFromProjectJson(projectJson);
    applyHydratedLayout(state, layoutJson, projectJson);
    state.layout[s1] = { ...state.layout[s1], collapsed: true };

    const edges = toReactFlowEdges(state);
    const synthToB = edges.filter((e) => e.target === sceneNodeB && e.sourceHandle === HANDLE_SYNTH_GOTO_OUT);
    expect(synthToB).toHaveLength(1);
  });
});
