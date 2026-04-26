import { describe, expect, it } from "vitest";

import { applyHydratedLayout } from "../serialize/mapLayoutJson";
import {
  buildActionIdByPathKeyMapFromProjectJson,
  deserializeFromProjectJson,
  stableActionNodeIdFromPathKey,
  stableSceneNodeIdFromExternal,
} from "../serialize/fromProjectJson";
import type { ProjectJsonV2, ProjectJsonV2Action } from "../serialize/toProjectJson";

const sfx = { url: "", volume: 1 };
const visibility = { requiresItem: "", hiddenIfHasItem: "", clickWhenInvisible: true };

const msg = (body: string): ProjectJsonV2Action => ({
  type: "msg",
  payload: { copy: { bodyHtml: body, buttonLabel: "OK" } },
  sfx: { ...sfx },
  visibility: { ...visibility },
});

const goto = (target: string): ProjectJsonV2Action => ({
  type: "goto",
  payload: { target, copy: { bodyHtml: "", buttonLabel: "" } },
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

describe("hydrate — selector imbriqué (path JSON vs tri Y)", () => {
  it("recâble parentId des choix S2 depuis nodalActionLayoutByPathKey", () => {
    const sceneId = "nest";
    const projectJson: ProjectJsonV2 = {
      schemaVersion: 2,
      title: "T",
      startSceneId: sceneId,
      scenes: [
        {
          id: sceneId,
          title: "Nest",
          panoramaUrl: "",
          hotspots: [
            {
              action: selector("S1", [
                msg("c1.1"),
                selector("S2", [
                  goto("other"),
                  msg("c2.2"),
                ]),
              ]),
            },
          ],
        },
      ],
    };

    const scn = stableSceneNodeIdFromExternal(sceneId);
    const s1 = stableActionNodeIdFromPathKey(`${sceneId}:h:0`);
    const s2 = stableActionNodeIdFromPathKey(`${sceneId}:h:0:c:1`);
    const c21 = stableActionNodeIdFromPathKey(`${sceneId}:h:0:c:1:c:0`);
    const c22 = stableActionNodeIdFromPathKey(`${sceneId}:h:0:c:1:c:1`);

    const layoutJson = {
      positions: { [scn]: { x: 0, y: 0 } },
      parentId: {},
      collapsed: {},
      drafts: [],
      viewport: { x: 0, y: 0, zoom: 1 },
      nodalSceneLayoutByExternalId: { [sceneId]: { x: 0, y: 0, collapsed: false } },
      nodalActionLayoutByPathKey: {
        [`${sceneId}:h:0`]: { x: 10, y: 10, collapsed: false },
        [`${sceneId}:h:0:c:0`]: { x: 20, y: 20, collapsed: false },
        [`${sceneId}:h:0:c:1`]: { x: 30, y: 30, collapsed: false },
        [`${sceneId}:h:0:c:1:c:0`]: { x: 40, y: 0, collapsed: false },
        [`${sceneId}:h:0:c:1:c:1`]: { x: 50, y: 0, collapsed: false },
      },
    };

    const base = deserializeFromProjectJson(projectJson);
    applyHydratedLayout(base, layoutJson, projectJson);

    const lay = base.layout;
    expect(lay[s2]?.parentId).toBe(s1);
    expect(lay[c21]?.parentId).toBe(s2);
    expect(lay[c22]?.parentId).toBe(s2);
  });

  it("buildActionIdByPathKeyMapFromProjectJson aligné avec deserialize", () => {
    const sceneId = "nest";
    const projectJson: ProjectJsonV2 = {
      schemaVersion: 2,
      title: "T",
      startSceneId: sceneId,
      scenes: [
        {
          id: sceneId,
          title: "Nest",
          panoramaUrl: "",
          hotspots: [{ action: selector("S1", [msg("a"), selector("S2", [goto("x")])]) }],
        },
      ],
    };
    const m = buildActionIdByPathKeyMapFromProjectJson(projectJson);
    const st = deserializeFromProjectJson(projectJson);
    for (const [pk, aid] of m) {
      expect(st.actions[aid]).toBeDefined();
      expect(aid).toBe(stableActionNodeIdFromPathKey(pk));
    }
  });
});
