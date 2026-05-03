import { describe, expect, it } from "vitest";

import { asActionNodeId, asEdgeId, asSceneNodeId } from "../model/ids";
import type { ActionNode, SceneNode } from "../model/nodes";
import type { NodalProject } from "../model/project";
import { sboxIdFromScene } from "../store/reconcileSceneBoxes";
import {
  computeContainerBounds,
  parentIdDepth,
  positionRelativeToContainer,
  reanchorSBox,
  SCENE_PADDING_BOTTOM,
  SCENE_PADDING_TOP,
  SCENE_PADDING_X,
} from "../view/nesting/containerBounds";
import { toReactFlowNodes } from "../view/nodalReactFlowProjection";
import { createNodalProjectStore } from "../store/nodalProjectStore";

const sfx = { url: "", volume: 1 };
const visibility = { requiresItem: "", hiddenIfHasItem: "", clickWhenInvisible: true };

describe("computeContainerBounds (C8.1.b)", () => {
  it("1 enfant (50,30) taille défaut 180×70 → inner + marges", () => {
    const scene: SceneNode = {
      id: asSceneNodeId("scn-t"),
      nodeType: "scene",
      sceneId: "ext-t",
      label: "S",
      panoramaUrl: "",
    };
    const act: ActionNode = {
      id: asActionNodeId("act-t"),
      nodeType: "action",
      actionType: "msg",
      label: "M",
      payload: { copy: { bodyHtml: "", buttonLabel: "" } },
      sfx: { ...sfx },
      visibility: { ...visibility },
    };
    const bid = sboxIdFromScene(scene.id);
    const state = {
      meta: {
        title: "T",
        startSceneId: scene.id,
        viewport: { x: 0, y: 0, zoom: 1 },
        draftActionIds: [],
        objects: {},
      },
      scenes: { [scene.id]: scene },
      sceneBoxes: { [bid]: { id: bid, nodeType: "sceneBox" as const, sceneId: scene.id } },
      actions: { [act.id]: act },
      satellites: {},
      media: {},
      edges: [
        { id: asEdgeId("e"), family: "flow" as const, sourceId: scene.id, targetId: act.id },
      ],
      layout: {
        [bid]: { x: 0, y: 0, parentId: null, collapsed: false },
        [scene.id]: { x: SCENE_PADDING_X, y: SCENE_PADDING_TOP, parentId: bid, collapsed: false },
        [act.id]: { x: 50, y: 30, parentId: bid, collapsed: false },
      },
    } satisfies NodalProject;

    const { width, height } = computeContainerBounds(state, bid);
    /* maxRight = 230 → innerW 230, + padX ; maxBottom = 100 → + padBottom */
    expect(width).toBe(230 + SCENE_PADDING_X);
    expect(height).toBe(102 + SCENE_PADDING_BOTTOM);
  });

  it("computeContainerBounds : enfant (500,50) taille 180×70", () => {
    const scene: SceneNode = {
      id: asSceneNodeId("scn-w"),
      nodeType: "scene",
      sceneId: "ext-w",
      label: "S",
      panoramaUrl: "",
    };
    const act: ActionNode = {
      id: asActionNodeId("act-w"),
      nodeType: "action",
      actionType: "msg",
      label: "M",
      payload: { copy: { bodyHtml: "", buttonLabel: "" } },
      sfx: { ...sfx },
      visibility: { ...visibility },
    };
    const bid = sboxIdFromScene(scene.id);
    const state = {
      meta: {
        title: "T",
        startSceneId: scene.id,
        viewport: { x: 0, y: 0, zoom: 1 },
        draftActionIds: [],
        objects: {},
      },
      scenes: { [scene.id]: scene },
      sceneBoxes: { [bid]: { id: bid, nodeType: "sceneBox" as const, sceneId: scene.id } },
      actions: { [act.id]: act },
      satellites: {},
      media: {},
      edges: [{ id: asEdgeId("ew"), family: "flow" as const, sourceId: scene.id, targetId: act.id }],
      layout: {
        [bid]: { x: 0, y: 0, parentId: null, collapsed: false },
        [scene.id]: { x: SCENE_PADDING_X, y: SCENE_PADDING_TOP, parentId: bid, collapsed: false },
        [act.id]: { x: 500, y: 50, parentId: bid, collapsed: false },
      },
    } satisfies NodalProject;
    const { width, height } = computeContainerBounds(state, bid);
    expect(width).toBe(500 + 180 + SCENE_PADDING_X);
    expect(height).toBe(50 + 70 + SCENE_PADDING_BOTTOM);
  });

  it("computeContainerBounds : enfant (20,40) taille 180×70", () => {
    const scene: SceneNode = {
      id: asSceneNodeId("scn-v"),
      nodeType: "scene",
      sceneId: "ext-v",
      label: "S",
      panoramaUrl: "",
    };
    const act: ActionNode = {
      id: asActionNodeId("act-v"),
      nodeType: "action",
      actionType: "msg",
      label: "M",
      payload: { copy: { bodyHtml: "", buttonLabel: "" } },
      sfx: { ...sfx },
      visibility: { ...visibility },
    };
    const bid = sboxIdFromScene(scene.id);
    const state = {
      meta: {
        title: "T",
        startSceneId: scene.id,
        viewport: { x: 0, y: 0, zoom: 1 },
        draftActionIds: [],
        objects: {},
      },
      scenes: { [scene.id]: scene },
      sceneBoxes: { [bid]: { id: bid, nodeType: "sceneBox" as const, sceneId: scene.id } },
      actions: { [act.id]: act },
      satellites: {},
      media: {},
      edges: [{ id: asEdgeId("ev"), family: "flow" as const, sourceId: scene.id, targetId: act.id }],
      layout: {
        [bid]: { x: 0, y: 0, parentId: null, collapsed: false },
        [scene.id]: { x: SCENE_PADDING_X, y: SCENE_PADDING_TOP, parentId: bid, collapsed: false },
        [act.id]: { x: 20, y: 40, parentId: bid, collapsed: false },
      },
    } satisfies NodalProject;
    const { width, height } = computeContainerBounds(state, bid);
    expect(width).toBe(20 + 180 + SCENE_PADDING_X);
    expect(height).toBe(40 + 70 + SCENE_PADDING_BOTTOM);
  });

  it("reanchorSBox : relatif négatif → pad + absolu enfant inchangé", () => {
    const scene: SceneNode = {
      id: asSceneNodeId("scn-r"),
      nodeType: "scene",
      sceneId: "ext-r",
      label: "S",
      panoramaUrl: "",
    };
    const act: ActionNode = {
      id: asActionNodeId("act-r"),
      nodeType: "action",
      actionType: "msg",
      label: "M",
      payload: { copy: { bodyHtml: "", buttonLabel: "" } },
      sfx: { ...sfx },
      visibility: { ...visibility },
    };
    const bid = sboxIdFromScene(scene.id);
    const state = {
      meta: {
        title: "T",
        startSceneId: scene.id,
        viewport: { x: 0, y: 0, zoom: 1 },
        draftActionIds: [],
        objects: {},
      },
      scenes: { [scene.id]: scene },
      sceneBoxes: { [bid]: { id: bid, nodeType: "sceneBox" as const, sceneId: scene.id } },
      actions: { [act.id]: act },
      satellites: {},
      media: {},
      edges: [],
      layout: {
        [bid]: { x: 200, y: 200, parentId: null, collapsed: false },
        [scene.id]: { x: 0, y: 0, parentId: bid, collapsed: false },
        [act.id]: { x: -50, y: -10, parentId: bid, collapsed: false },
      },
    } satisfies NodalProject;

    const absBefore = { x: 200 + -50, y: 200 + -10 };
    reanchorSBox(state, bid);
    expect(state.layout[act.id]?.x).toBe(SCENE_PADDING_X);
    expect(state.layout[act.id]?.y).toBe(SCENE_PADDING_TOP);
    const absAfter = {
      x: (state.layout[bid]?.x ?? 0) + (state.layout[act.id]?.x ?? 0),
      y: (state.layout[bid]?.y ?? 0) + (state.layout[act.id]?.y ?? 0),
    };
    expect(absAfter.x).toBeCloseTo(absBefore.x, 5);
    expect(absAfter.y).toBeCloseTo(absBefore.y, 5);

    reanchorSBox(state, bid);
    expect(state.layout[act.id]?.x).toBe(SCENE_PADDING_X);
    expect(state.layout[act.id]?.y).toBe(SCENE_PADDING_TOP);
  });

  it("reanchorSBox : deux enfants directs partagent le même décalage", () => {
    const scene: SceneNode = {
      id: asSceneNodeId("scn-2c"),
      nodeType: "scene",
      sceneId: "ext-2c",
      label: "S",
      panoramaUrl: "",
    };
    const a: ActionNode = {
      id: asActionNodeId("act-2a"),
      nodeType: "action",
      actionType: "msg",
      label: "A",
      payload: { copy: { bodyHtml: "", buttonLabel: "" } },
      sfx: { ...sfx },
      visibility: { ...visibility },
    };
    const b: ActionNode = {
      id: asActionNodeId("act-2b"),
      nodeType: "action",
      actionType: "msg",
      label: "B",
      payload: { copy: { bodyHtml: "", buttonLabel: "" } },
      sfx: { ...sfx },
      visibility: { ...visibility },
    };
    const bid = sboxIdFromScene(scene.id);
    const state = {
      meta: {
        title: "T",
        startSceneId: scene.id,
        viewport: { x: 0, y: 0, zoom: 1 },
        draftActionIds: [],
        objects: {},
      },
      scenes: { [scene.id]: scene },
      sceneBoxes: { [bid]: { id: bid, nodeType: "sceneBox" as const, sceneId: scene.id } },
      actions: { [a.id]: a, [b.id]: b },
      satellites: {},
      media: {},
      edges: [],
      layout: {
        [bid]: { x: 0, y: 0, parentId: null, collapsed: false },
        [scene.id]: { x: SCENE_PADDING_X, y: SCENE_PADDING_TOP, parentId: bid, collapsed: false },
        [a.id]: { x: 0, y: 20, parentId: bid, collapsed: false },
        [b.id]: { x: 200, y: 25, parentId: bid, collapsed: false },
      },
    } satisfies NodalProject;
    const absA = { x: 0 + 0, y: 0 + 20 };
    const absB = { x: 0 + 200, y: 0 + 25 };
    reanchorSBox(state, bid);
    expect(state.layout[a.id]?.x).toBe(SCENE_PADDING_X);
    expect(state.layout[a.id]?.y).toBe(SCENE_PADDING_TOP);
    expect(state.layout[b.id]?.x).toBe(216);
    expect(state.layout[b.id]?.y).toBe(37);
    expect((state.layout[bid]?.x ?? 0) + (state.layout[a.id]?.x ?? 0)).toBeCloseTo(absA.x, 5);
    expect((state.layout[bid]?.y ?? 0) + (state.layout[a.id]?.y ?? 0)).toBeCloseTo(absA.y, 5);
    expect((state.layout[bid]?.x ?? 0) + (state.layout[b.id]?.x ?? 0)).toBeCloseTo(absB.x, 5);
    expect((state.layout[bid]?.y ?? 0) + (state.layout[b.id]?.y ?? 0)).toBeCloseTo(absB.y, 5);
  });

  it("positionRelativeToContainer somme la chaîne parentId", () => {
    const sceneId = asSceneNodeId("scn-n");
    const selId = asActionNodeId("act-sel");
    const msgId = asActionNodeId("act-msg");
    const state = {
      meta: {
        title: "T",
        startSceneId: sceneId,
        viewport: { x: 0, y: 0, zoom: 1 },
        draftActionIds: [],
        objects: {},
      },
      scenes: {
        [sceneId]: {
          id: sceneId,
          nodeType: "scene" as const,
          sceneId: "s",
          label: "S",
          panoramaUrl: "",
        },
      },
      sceneBoxes: {},
      actions: {
        [selId]: {
          id: selId,
          nodeType: "action" as const,
          actionType: "selector" as const,
          label: "Sel",
          payload: { nested: { title: "", copy: { bodyHtml: "", buttonLabel: "" }, displayMode: "buttons" } },
          sfx: { ...sfx },
          visibility: { ...visibility },
        },
        [msgId]: {
          id: msgId,
          nodeType: "action" as const,
          actionType: "msg" as const,
          label: "M",
          payload: { copy: { bodyHtml: "", buttonLabel: "" } },
          sfx: { ...sfx },
          visibility: { ...visibility },
        },
      },
      satellites: {},
      media: {},
      edges: [],
      layout: {
        [sceneId]: { x: 0, y: 0, parentId: null, collapsed: false },
        [selId]: { x: 10, y: 20, parentId: sceneId, collapsed: false },
        [msgId]: { x: 5, y: 8, parentId: selId, collapsed: false },
      },
    } satisfies NodalProject;

    expect(positionRelativeToContainer(state, msgId, sceneId)).toEqual({ x: 15, y: 28 });
  });

  it("toReactFlowNodes : scène avec 3 hotspots → style width/height cohérents", () => {
    const store = createNodalProjectStore();
    const s = store.getState();
    const scene: SceneNode = {
      id: asSceneNodeId("scn-3"),
      nodeType: "scene",
      sceneId: "ext-3",
      label: "S3",
      panoramaUrl: "",
    };
    s.addScene(scene, { x: 0, y: 0 });
    const mkMsg = (id: string, x: number, y: number): ActionNode => ({
      id: asActionNodeId(id),
      nodeType: "action",
      actionType: "msg",
      label: "M",
      payload: { copy: { bodyHtml: "", buttonLabel: "" } },
      sfx: { ...sfx },
      visibility: { ...visibility },
    });
    const a0 = mkMsg("act-3a", 0, 40);
    const a1 = mkMsg("act-3b", 200, 40);
    const a2 = mkMsg("act-3c", 400, 40);
    s.addAction(a0, { x: 0, y: 40 });
    s.addAction(a1, { x: 200, y: 40 });
    s.addAction(a2, { x: 400, y: 40 });
    s.connect({ id: asEdgeId("f0"), family: "flow", sourceId: scene.id, targetId: a0.id });
    s.connect({ id: asEdgeId("f1"), family: "flow", sourceId: scene.id, targetId: a1.id });
    s.connect({ id: asEdgeId("f2"), family: "flow", sourceId: scene.id, targetId: a2.id });

    const nodes = toReactFlowNodes(store.getState());
    const bid = sboxIdFromScene(scene.id);
    const sboxRf = nodes.find((n) => n.id === bid);
    const sceneRf = nodes.find((n) => n.id === scene.id);
    expect(sboxRf?.type).toBe("sceneBoxNode");
    expect(sceneRf?.parentId).toBe(bid);
    expect(sceneRf?.extent).toBe("parent");
    const w = Number(sboxRf?.style?.width);
    const h = Number(sboxRf?.style?.height);
    /* 3 × 180 de large, alignés en x=0,200,400 → inner 580 + 2×padX */
    expect(w).toBe(580 + SCENE_PADDING_X * 2);
    expect(h).toBeGreaterThan(SCENE_PADDING_TOP + 70 + SCENE_PADDING_BOTTOM - 1);
    expect(h).toBeLessThan(SCENE_PADDING_TOP + 200);
  });
});

describe("parentIdDepth + z-index selector (C8.6.1)", () => {
  it("selector imbriqué : profondeur supérieure au parent", () => {
    const sceneId = asSceneNodeId("scn-depth");
    const bid = sboxIdFromScene(sceneId);
    const outer = asActionNodeId("act-out");
    const inner = asActionNodeId("act-in");
    const state = {
      meta: {
        title: "T",
        startSceneId: sceneId,
        viewport: { x: 0, y: 0, zoom: 1 },
        draftActionIds: [],
        objects: {},
      },
      scenes: {
        [sceneId]: {
          id: sceneId,
          nodeType: "scene" as const,
          sceneId: "ext-d",
          label: "S",
          panoramaUrl: "",
        },
      },
      sceneBoxes: {
        [bid]: { id: bid, nodeType: "sceneBox" as const, sceneId: sceneId },
      },
      actions: {
        [outer]: {
          id: outer,
          nodeType: "action" as const,
          actionType: "selector" as const,
          label: "Out",
          payload: { nested: { title: "", copy: { bodyHtml: "", buttonLabel: "" }, displayMode: "buttons" } },
          sfx: { ...sfx },
          visibility: { ...visibility },
        },
        [inner]: {
          id: inner,
          nodeType: "action" as const,
          actionType: "selector" as const,
          label: "In",
          payload: { nested: { title: "", copy: { bodyHtml: "", buttonLabel: "" }, displayMode: "buttons" } },
          sfx: { ...sfx },
          visibility: { ...visibility },
        },
      },
      satellites: {},
      media: {},
      edges: [],
      layout: {
        [bid]: { x: 0, y: 0, parentId: null, collapsed: false },
        [sceneId]: { x: SCENE_PADDING_X, y: SCENE_PADDING_TOP, parentId: bid, collapsed: false },
        [outer]: { x: 20, y: 40, parentId: sceneId, collapsed: false, width: 400, height: 300 },
        [inner]: { x: 30, y: 50, parentId: outer, collapsed: false, width: 200, height: 120 },
      },
    } satisfies NodalProject;

    expect(parentIdDepth(state, outer)).toBe(2);
    expect(parentIdDepth(state, inner)).toBe(3);
    expect(parentIdDepth(state, sceneId)).toBe(1);

    const nodes = toReactFlowNodes(state);
    const zOuter = nodes.find((n) => n.id === outer)?.style?.zIndex as number;
    const zInner = nodes.find((n) => n.id === inner)?.style?.zIndex as number;
    expect(zInner).toBeGreaterThan(zOuter);
  });
});
