import { describe, expect, it } from "vitest";

import { asEdgeId, type ActionNodeId, type AnyNodeId, type SceneNodeId } from "../model/ids";
import type { ActionNode, SceneNode } from "../model/nodes";
import { exportProjectEscapegameZip, importProjectEscapegameZip } from "../persistence/zipBundle";
import { applyHydratedLayout, serializeLayout } from "../serialize/mapLayoutJson";
import {
  deserializeFromProjectJson,
  stableActionNodeIdFromPathKey,
  stableSceneNodeIdFromExternal,
} from "../serialize/fromProjectJson";
import { serializeToProjectJson } from "../serialize/toProjectJson";
import { createNodalProjectStore } from "../store/nodalProjectStore";
import { sboxIdFromScene } from "../store/reconcileSceneBoxes";
import { absoluteFlowPositionInPane } from "../view/nesting/containerBounds";
import { getAbsolutePosition } from "../view/nesting/geometry";
import type { NestedNodeLike } from "../view/nesting/geometry";
import { toReactFlowNodes } from "../view/nodalReactFlowProjection";
import type { NodalProject } from "../model/project";

const sfx = { url: "", volume: 1 };
const visibility = { requiresItem: "", hiddenIfHasItem: "", clickWhenInvisible: true };

function makeScene(ext: string, title: string): SceneNode {
  return {
    id: stableSceneNodeIdFromExternal(ext),
    nodeType: "scene",
    sceneId: ext,
    label: title,
    panoramaUrl: "",
  };
}

function makeMsg(id: ActionNodeId, label: string): ActionNode {
  return {
    id,
    nodeType: "action",
    actionType: "msg",
    label,
    payload: { copy: { bodyHtml: "", buttonLabel: "" } },
    sfx: { ...sfx },
    visibility: { ...visibility },
  };
}

/** Positions absolues alignées sur la projection RF (`getAbsolutePosition`). */
function absoluteByProjection(state: NodalProject, nodeId: AnyNodeId): { x: number; y: number } {
  const rf = toReactFlowNodes(state);
  const map = new Map<string, NestedNodeLike>();
  for (const n of rf) {
    map.set(n.id, {
      id: n.id,
      position: n.position,
      parentId: n.parentId,
      width: n.style && typeof n.style === "object" && "width" in n.style ? Number(n.style.width) : undefined,
      height: n.style && typeof n.style === "object" && "height" in n.style ? Number(n.style.height) : undefined,
    });
  }
  const node = map.get(String(nodeId));
  if (!node) throw new Error(`nœud absent en projection: ${String(nodeId)}`);
  return getAbsolutePosition(node, map);
}

describe("C8.7-fix — round-trip layout .escapegame", () => {
  it("préserve les positions absolues (s-box + actions + selector imbriqué) après export → hydrate", async () => {
    const store = createNodalProjectStore();
    const s = store.getState();

    const extA = "s-a";
    const extB = "s-b";
    const extC = "s-c";
    const sceneA = makeScene(extA, "A");
    const sceneB = makeScene(extB, "B");
    const sceneC = makeScene(extC, "C");
    s.addScene(sceneA, { x: 0, y: 0 });
    s.addScene(sceneB, { x: 420, y: 80 });
    s.addScene(sceneC, { x: 880, y: 40 });

    const actA0 = stableActionNodeIdFromPathKey(`${extA}:h:0`);
    const actB0 = stableActionNodeIdFromPathKey(`${extB}:h:0`);
    const actB0c0 = stableActionNodeIdFromPathKey(`${extB}:h:0:c:0`);
    const actC0 = stableActionNodeIdFromPathKey(`${extC}:h:0`);

    s.addAction(makeMsg(actA0, "M-A"), { x: 120, y: 90 });
    s.connect({
      id: asEdgeId(`e-${extA}-0`),
      family: "flow",
      sourceId: sceneA.id,
      targetId: actA0,
    });

    const sel: ActionNode = {
      id: actB0,
      nodeType: "action",
      actionType: "selector",
      label: "Sel",
      payload: {
        nested: {
          title: "T",
          copy: { bodyHtml: "", buttonLabel: "" },
          displayMode: "buttons",
        },
      },
      sfx: { ...sfx },
      visibility: { ...visibility },
    };
    s.addAction(sel, { x: 140, y: 70 });
    s.addAction(makeMsg(actB0c0, "Choix"), { x: 40, y: 96, parentId: actB0 });
    s.attachChild(actB0, actB0c0);
    s.connect({
      id: asEdgeId(`e-${extB}-0`),
      family: "flow",
      sourceId: sceneB.id,
      targetId: actB0,
    });

    s.addAction(makeMsg(actC0, "M-C"), { x: 200, y: 110 });
    s.connect({
      id: asEdgeId(`e-${extC}-0`),
      family: "flow",
      sourceId: sceneC.id,
      targetId: actC0,
    });

    const before = store.getState();
    const bidA = sboxIdFromScene(sceneA.id);
    const bidB = sboxIdFromScene(sceneB.id);
    const bidC = sboxIdFromScene(sceneC.id);

    const absBefore = {
      boxA: absoluteByProjection(before, bidA),
      boxB: absoluteByProjection(before, bidB),
      boxC: absoluteByProjection(before, bidC),
      actA0: absoluteByProjection(before, actA0),
      actB0: absoluteByProjection(before, actB0),
      actB0c0: absoluteByProjection(before, actB0c0),
      actC0: absoluteByProjection(before, actC0),
    };

    const blob = exportProjectEscapegameZip(before);
    const { projectJson, layoutJson } = importProjectEscapegameZip(await blob.arrayBuffer());

    const store2 = createNodalProjectStore();
    store2.getState().hydrateFromProject(projectJson, layoutJson);
    const after = store2.getState();

    const absAfter = {
      boxA: absoluteByProjection(after, bidA),
      boxB: absoluteByProjection(after, bidB),
      boxC: absoluteByProjection(after, bidC),
      actA0: absoluteByProjection(after, actA0),
      actB0: absoluteByProjection(after, actB0),
      actB0c0: absoluteByProjection(after, actB0c0),
      actC0: absoluteByProjection(after, actC0),
    };

    expect(absAfter).toEqual(absBefore);

    /* Cohérence avec le repère graphe store (somme parentId). */
    expect(absoluteFlowPositionInPane(after, bidA)).toEqual(absAfter.boxA);
    expect(absoluteFlowPositionInPane(after, actA0)).toEqual(absAfter.actA0);
  });

  it("hydrate : hotspots encore parentId scène alors que la scène est sous le s-box → reparentage s-box (legacy map-layout)", () => {
    const ext = "legacy-scene-parent";
    const projectJson = serializeToProjectJson(
      (() => {
        const api = createNodalProjectStore();
        const st = api.getState();
        const sc = makeScene(ext, "L");
        st.addScene(sc, { x: 300, y: 200 });
        const actId = stableActionNodeIdFromPathKey(`${ext}:h:0`);
        st.addAction(makeMsg(actId, "Root"), { x: 80, y: 60 });
        st.connect({
          id: asEdgeId("e-leg"),
          family: "flow",
          sourceId: sc.id,
          targetId: actId,
        });
        return api.getState() as unknown as NodalProject;
      })()
    );

    const fresh = deserializeFromProjectJson(projectJson);
    /* Même invariant qu’à l’export éditeur : `positions` doit contenir chaque nœud durable (sinon applyLayout ne restaure pas parentId). */
    const layoutFromStore = serializeLayout(
      (() => {
        const api = createNodalProjectStore();
        const st = api.getState();
        const sc = makeScene(ext, "L");
        st.addScene(sc, { x: 300, y: 200 });
        const actId = stableActionNodeIdFromPathKey(`${ext}:h:0`);
        st.addAction(makeMsg(actId, "Root"), { x: 80, y: 60 });
        st.connect({
          id: asEdgeId("e-leg2"),
          family: "flow",
          sourceId: sc.id,
          targetId: actId,
        });
        return api.getState() as unknown as NodalProject;
      })()
    );
    const bid = sboxIdFromScene(stableSceneNodeIdFromExternal(ext) as SceneNodeId);
    const scn = stableSceneNodeIdFromExternal(ext);
    const act = stableActionNodeIdFromPathKey(`${ext}:h:0`);

    /* Simule une entrée map-layout où le flux racine pointe encore la scène (pré–C8.1.b ou fichier hybride). */
    const legacyLayout = {
      ...layoutFromStore,
      parentId: {
        ...layoutFromStore.parentId,
        [scn]: bid,
        [act]: scn,
      },
    };

    applyHydratedLayout(fresh, legacyLayout, projectJson);

    expect(fresh.layout[act]?.parentId).toBe(bid);
    const absAct = absoluteFlowPositionInPane(fresh, act);
    const absBox = absoluteFlowPositionInPane(fresh, bid);
    expect(absAct.x).toBeGreaterThan(absBox.x);
    expect(absAct.y).toBeGreaterThan(absBox.y);
  });
});
