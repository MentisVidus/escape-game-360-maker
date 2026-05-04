import { describe, expect, it } from "vitest";

import { asActionNodeId, asEdgeId, asSceneBoxNodeId, asSceneNodeId } from "../model/ids";
import type { ActionNode, SceneNode } from "../model/nodes";
import type { NodalProject } from "../model/project";
import { createNodalProjectStore } from "../store/nodalProjectStore";
import { sboxIdFromScene } from "../store/reconcileSceneBoxes";
import {
  computeMinPushSeparation,
  rectsNeedSeparation,
  resolveSBoxOverlapsAfterUnfold,
  rewindSBoxOverlapPushes,
  SBOX_GAP,
  sboxWorldRect,
} from "../view/nesting/sboxCollision";

const sfx = { url: "", volume: 1 as const };
const visibility = { requiresItem: "", hiddenIfHasItem: "", clickWhenInvisible: true as const };

describe("C8.1.b.6 — anti-collision s-box", () => {
  it("rectsNeedSeparation : chevauchement", () => {
    const a = { x: 0, y: 0, width: 100, height: 100 };
    const b = { x: 50, y: 50, width: 100, height: 100 };
    expect(rectsNeedSeparation(a, b)).toBe(true);
  });

  it("rectsNeedSeparation : disjoints avec écart ≥ gap sur un axe", () => {
    const a = { x: 0, y: 0, width: 100, height: 100 };
    const b = { x: 130, y: 0, width: 100, height: 100 };
    expect(rectsNeedSeparation(a, b, SBOX_GAP)).toBe(false);
  });

  it("rectsNeedSeparation : disjoints mais trop proches (< gap)", () => {
    const a = { x: 0, y: 0, width: 100, height: 100 };
    const b = { x: 110, y: 0, width: 100, height: 100 };
    expect(rectsNeedSeparation(a, b, SBOX_GAP)).toBe(true);
  });

  it("computeMinPushSeparation : pousse sur un seul axe", () => {
    const anchor = { x: 0, y: 0, width: 100, height: 100 };
    const other = { x: 70, y: 10, width: 100, height: 80 };
    const p = computeMinPushSeparation(anchor, other, SBOX_GAP);
    expect(p.dx === 0 || p.dy === 0).toBe(true);
    expect(p.dx !== 0 || p.dy !== 0).toBe(true);
  });

  it("dépli s-box : voisin en overlap est déplacé", () => {
    const sa: SceneNode = {
      id: asSceneNodeId("sc-col-a"),
      nodeType: "scene",
      sceneId: "ext-a",
      label: "A",
      panoramaUrl: "",
    };
    const sb: SceneNode = {
      id: asSceneNodeId("sc-col-b"),
      nodeType: "scene",
      sceneId: "ext-b",
      label: "B",
      panoramaUrl: "",
    };
    const act: ActionNode = {
      id: asActionNodeId("act-col-wide"),
      nodeType: "action",
      actionType: "msg",
      label: "M",
      payload: { copy: { bodyHtml: "", buttonLabel: "" } },
      sfx: { ...sfx },
      visibility: { ...visibility },
    };
    const store = createNodalProjectStore();
    const s = store.getState();
    s.addScene(sa, { x: 0, y: 0 });
    s.addScene(sb, { x: 0, y: 0 });
    const bidA = sboxIdFromScene(sa.id);
    const bidB = sboxIdFromScene(sb.id);
    s.addAction(act, { x: 400, y: 80, width: 320, height: 70 });
    s.connect({ id: asEdgeId("e-flow-col"), family: "flow", sourceId: sa.id, targetId: act.id });
    s.updateNodeLayout(bidB, { x: 40, y: 0 });
    s.toggleNodeCollapsed(bidA);
    const xBBefore = store.getState().layout[bidB]!.x;
    s.toggleNodeCollapsed(bidA);
    const xBAfter = store.getState().layout[bidB]!.x;
    expect(xBAfter).toBeGreaterThanOrEqual(xBBefore);
    const ra = sboxWorldRect(store.getState(), bidA);
    const rb = sboxWorldRect(store.getState(), bidB);
    if (ra && rb) expect(rectsNeedSeparation(ra, rb, SBOX_GAP)).toBe(false);
  });

  it("resolveSBoxOverlapsAfterUnfold : pas de mouvement si déjà séparés", () => {
    const sa: SceneNode = {
      id: asSceneNodeId("sc-col-c"),
      nodeType: "scene",
      sceneId: "ext-c",
      label: "C",
      panoramaUrl: "",
    };
    const sb: SceneNode = {
      id: asSceneNodeId("sc-col-d"),
      nodeType: "scene",
      sceneId: "ext-d",
      label: "D",
      panoramaUrl: "",
    };
    const store = createNodalProjectStore();
    const s = store.getState();
    s.addScene(sa, { x: 0, y: 0 });
    s.addScene(sb, { x: 0, y: 0 });
    const bidB = sboxIdFromScene(sb.id);
    s.updateNodeLayout(bidB, { x: 900, y: 400 });
    const st = store.getState();
    const trace = resolveSBoxOverlapsAfterUnfold(st, sboxIdFromScene(sa.id));
    expect(trace.length).toBe(0);
  });

  it("rewindSBoxOverlapPushes : restaure from si position ≈ to", () => {
    const bid = asSceneBoxNodeId("sbox-rw-unit");
    const state = {
      sceneBoxes: {
        [bid]: { id: bid, nodeType: "sceneBox" as const, sceneId: asSceneNodeId("sc-rw-u") },
      },
      layout: {
        [bid]: { x: 50, y: 0, parentId: null, collapsed: false },
      },
      scenes: {},
      actions: {},
      satellites: {},
      media: {},
      edges: [],
      meta: { title: "", startSceneId: null, viewport: { x: 0, y: 0, zoom: 1 }, draftActionIds: [], objects: {} },
    } as unknown as NodalProject;
    rewindSBoxOverlapPushes(state, [{ id: bid, from: { x: 10, y: 0 }, to: { x: 50, y: 0 } }]);
    expect(state.layout[bid]!.x).toBe(10);
  });

  it("phase 2 : pas de rewind si l’utilisateur a déplacé la s-box poussée", () => {
    const sid = asSceneNodeId("sc-rw-mock");
    const state = {
      sceneBoxes: {
        [asSceneBoxNodeId("sbox-mock")]: {
          id: asSceneBoxNodeId("sbox-mock"),
          nodeType: "sceneBox" as const,
          sceneId: sid,
        },
      },
      layout: {
        [asSceneBoxNodeId("sbox-mock")]: { x: 200, y: 0, parentId: null, collapsed: false },
      },
      scenes: {},
      actions: {},
      satellites: {},
      media: {},
      edges: [],
      meta: { title: "", startSceneId: null, viewport: { x: 0, y: 0, zoom: 1 }, draftActionIds: [], objects: {} },
    } as unknown as NodalProject;
    const trace = [
      {
        id: asSceneBoxNodeId("sbox-mock"),
        from: { x: 0, y: 0 },
        to: { x: 100, y: 0 },
      },
    ];
    rewindSBoxOverlapPushes(state, trace);
    expect(state.layout[asSceneBoxNodeId("sbox-mock")]!.x).toBe(200);
  });
});
