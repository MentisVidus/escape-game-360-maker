import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

import type { AnyNodeId } from "../model/ids";
import type { MapLayoutJson } from "../serialize/mapLayoutJson";
import type { ProjectJsonV2 } from "../serialize/toProjectJson";
import {
  deserializeFromProjectJson,
  stableActionNodeIdFromPathKey,
  stableSceneNodeIdFromExternal,
} from "../serialize/fromProjectJson";
import { createNodalProjectStore } from "../store/nodalProjectStore";
import { sboxIdFromScene } from "../store/reconcileSceneBoxes";
import { absoluteFlowPositionInPane } from "../view/nesting/containerBounds";
import { getAbsolutePosition } from "../view/nesting/geometry";
import type { NestedNodeLike } from "../view/nesting/geometry";
import { toReactFlowNodes } from "../view/nodalReactFlowProjection";

const __dirname = dirname(fileURLToPath(import.meta.url));

/** Même chaîne que `hydrateFromBundle` (éditeur) : `st.getState().hydrateFromProject(projectJson, layout)`. */
function hydrateLikeEditor(projectJson: ProjectJsonV2, layoutJson: MapLayoutJson) {
  const store = createNodalProjectStore();
  store.getState().hydrateFromProject(projectJson, layoutJson);
  return store.getState();
}

function absProjection(
  state: Parameters<typeof toReactFlowNodes>[0],
  nodeId: AnyNodeId
): { x: number; y: number } {
  const rf = toReactFlowNodes(state);
  const map = new Map<string, NestedNodeLike>();
  for (const n of rf) {
    map.set(n.id, { id: n.id, position: n.position, parentId: n.parentId });
  }
  const node = map.get(String(nodeId));
  if (!node) throw new Error(`projection: nœud manquant ${String(nodeId)}`);
  return getAbsolutePosition(node, map);
}

describe("C8.7-fix.3 — repro données réelles (docs/temporaire/c8-roundtrip-broken)", () => {
  const repoRoot = join(__dirname, "../../../..");
  const brokenDir = join(repoRoot, "docs/temporaire/c8-roundtrip-broken");
  const projectPath = join(brokenDir, "project.json");
  const layoutPath = join(brokenDir, "map-layout.json");

  it("Q-fix2-1/2/3 : le fixture map-layout documente stockage s-box + duplication scene/box + actions", () => {
    const raw = readFileSync(layoutPath, "utf8");
    const layout = JSON.parse(raw) as MapLayoutJson;
    const box = layout.nodalSceneBoxLayoutByExternalId!;
    const sceneStable = layout.nodalSceneLayoutByExternalId!;

    const ids = ["scene-1777930012847-1", "scene-1777930013022-2", "scene-1777930013166-3", "scene-1777930013342-4"];
    for (const ext of ids) {
      const b = box[ext];
      expect(b, `nodalSceneBoxLayoutByExternalId[${ext}]`).toBeDefined();
      const s = sceneStable[ext];
      expect(s.x).toBe(b.x);
      expect(s.y).toBe(b.y);
    }

    /* Positions monde s-box : pas sous clés sbox-* dans positions (strip sérialisation C8). */
    expect(layout.positions["sbox-scn__scene_1777930012847_1"]).toBeUndefined();

    /* Enfants : relatif parent dans positions (ids legacy action-…) ET dans nodalActionLayoutByPathKey (clés stables). */
    expect(layout.positions["action-1777930019423-5"]).toEqual({ x: 269, y: 32 });
    expect(layout.nodalActionLayoutByPathKey!["scene-1777930013342-4:h:0"]).toEqual({
      x: 269,
      y: 32,
      collapsed: false,
    });
  });

  it("hydrate éditeur : s-box monde = nodalSceneBoxLayoutByExternalId (ids act__ vs action- legacy)", () => {
    const projectJson = JSON.parse(readFileSync(projectPath, "utf8")) as ProjectJsonV2;
    const layoutJson = JSON.parse(readFileSync(layoutPath, "utf8")) as MapLayoutJson;
    const boxStable = layoutJson.nodalSceneBoxLayoutByExternalId!;

    const state = hydrateLikeEditor(projectJson, layoutJson);

    for (const scene of projectJson.scenes) {
      const ext = scene.id;
      const expected = boxStable[ext];
      expect(expected, ext).toBeDefined();
      const sid = stableSceneNodeIdFromExternal(ext);
      const bid = sboxIdFromScene(sid);
      const bl = state.layout[bid];
      expect(bl?.x, `s-box x ${ext}`).toBeCloseTo(expected.x, 5);
      expect(bl?.y, `s-box y ${ext}`).toBeCloseTo(expected.y, 5);
      expect(absProjection(state, bid).x).toBeCloseTo(expected.x, 5);
      expect(absProjection(state, bid).y).toBeCloseTo(expected.y, 5);
    }

    /* Selector imbriqué scène 2 : positions absolues cohérentes avec le fixture pathKey. */
    const sel = stableActionNodeIdFromPathKey("scene-1777930013022-2:h:0");
    const c0 = stableActionNodeIdFromPathKey("scene-1777930013022-2:h:0:c:0");
    const c1 = stableActionNodeIdFromPathKey("scene-1777930013022-2:h:0:c:1");
    const stSel = layoutJson.nodalActionLayoutByPathKey!["scene-1777930013022-2:h:0"];
    const st0 = layoutJson.nodalActionLayoutByPathKey!["scene-1777930013022-2:h:0:c:0"];
    const st1 = layoutJson.nodalActionLayoutByPathKey!["scene-1777930013022-2:h:0:c:1"];

    expect(state.layout[sel]?.parentId).toBe(sboxIdFromScene(stableSceneNodeIdFromExternal("scene-1777930013022-2")));
    expect(state.layout[c0]?.parentId).toBe(sel);
    expect(state.layout[c1]?.parentId).toBe(sel);

    const absSel = absProjection(state, sel);
    const abs0 = absProjection(state, c0);
    const abs1 = absProjection(state, c1);
    const bid2 = sboxIdFromScene(stableSceneNodeIdFromExternal("scene-1777930013022-2"));
    const box2 = state.layout[bid2]!;

    expect(absSel.x).toBeCloseTo(box2.x + stSel.x, 5);
    expect(absSel.y).toBeCloseTo(box2.y + stSel.y, 5);
    expect(abs0.x).toBeCloseTo(absSel.x + st0.x, 5);
    expect(abs0.y).toBeCloseTo(absSel.y + st0.y, 5);
    expect(abs1.x).toBeCloseTo(absSel.x + st1.x, 5);
    expect(abs1.y).toBeCloseTo(absSel.y + st1.y, 5);

    expect(absoluteFlowPositionInPane(state, c0)).toEqual(abs0);
  });
});
