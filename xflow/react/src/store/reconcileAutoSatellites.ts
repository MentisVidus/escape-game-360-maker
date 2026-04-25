import type { Edge } from "../model/edges";
import { asEdgeId, asSatelliteNodeId, type ActionNodeId, type AnyNodeId, type EdgeId, type SatelliteNodeId } from "../model/ids";
import type { NodeLayout } from "../model/layout";
import type { ActionNode, SatelliteNode } from "../model/nodes";
import type { ObjectEntry } from "../model/objects";
import type { NodalProject } from "../model/project";

type AutoSatelliteType = "coords-options" | "choice-options" | "object";

const isReqOrPwd = (node: ActionNode): node is Extract<ActionNode, { actionType: "req" | "pwd" }> =>
  node.actionType === "req" || node.actionType === "pwd";

/** États contextuels 1–4 (§2.3). */
export function getActionContextualState(state: NodalProject, actionId: ActionNodeId): 1 | 2 | 3 | 4 {
  const layout = state.layout[actionId];
  const parentId = layout?.parentId;
  if (parentId && parentId in state.actions) {
    const parent = state.actions[parentId as ActionNodeId]!;
    if (parent.actionType === "selector") return 3;
    if (isReqOrPwd(parent) && parent.rewardActionId === actionId) return 4;
  }
  const hasFlowInFromScene = state.edges.some(
    (e) => e.family === "flow" && e.targetId === actionId && e.sourceId in state.scenes
  );
  if (hasFlowInFromScene) return 2;
  return 1;
}

function isPickOrReq(action: ActionNode): boolean {
  return action.actionType === "pick" || action.actionType === "req";
}

function desiredAutoTypesForAction(state: NodalProject, actionId: ActionNodeId): Set<AutoSatelliteType> {
  const action = state.actions[actionId];
  if (!action) return new Set();
  const ctx = getActionContextualState(state, actionId);
  const want = new Set<AutoSatelliteType>();
  if (ctx === 2) {
    want.add("coords-options");
    if (isPickOrReq(action)) want.add("object");
  } else if (ctx === 3) {
    want.add("choice-options");
    if (isPickOrReq(action)) want.add("object");
  } else if (ctx === 4) {
    if (isPickOrReq(action)) want.add("object");
  }
  return want;
}

function findMetaParentActionId(state: NodalProject, satelliteId: SatelliteNodeId): ActionNodeId | null {
  const edge = state.edges.find((e) => e.family === "meta" && e.targetId === satelliteId);
  if (!edge || !(edge.sourceId in state.actions)) return null;
  return edge.sourceId as ActionNodeId;
}

function findExistingAutoSatellite(
  state: NodalProject,
  actionId: ActionNodeId,
  satType: AutoSatelliteType
): SatelliteNodeId | null {
  for (const sat of Object.values(state.satellites)) {
    if (sat.satelliteType !== satType) continue;
    if (findMetaParentActionId(state, sat.id) === actionId) return sat.id;
  }
  return null;
}

function removeSatelliteAndEdges(state: NodalProject, satelliteId: SatelliteNodeId): void {
  delete state.satellites[satelliteId];
  delete state.layout[satelliteId];
  state.edges = state.edges.filter((e) => e.sourceId !== satelliteId && e.targetId !== satelliteId);
}

function defaultObjectEntry(objectId: string): ObjectEntry {
  return {
    objectId,
    displayName: "",
    iconMediaId: null,
    iconUrl: "",
  };
}

function objectIdFromPickOrReq(state: NodalProject, actionId: ActionNodeId): string {
  const action = state.actions[actionId];
  if (!action) return "";
  if (action.actionType === "pick" || action.actionType === "req") {
    return action.payload.itemId || "";
  }
  return "";
}

function createAutoSatelliteNode(
  state: NodalProject,
  id: SatelliteNodeId,
  satType: AutoSatelliteType,
  actionId: ActionNodeId
): SatelliteNode {
  if (satType === "coords-options") {
    return {
      id,
      nodeType: "satellite",
      satelliteType: "coords-options",
      data: {
        pitch: 0,
        yaw: 0,
        visibility: { requiresItem: "", hiddenIfHasItem: "", clickWhenInvisible: true },
      },
    };
  }
  if (satType === "choice-options") {
    return {
      id,
      nodeType: "satellite",
      satelliteType: "choice-options",
      data: { visibility: { requiresItem: "", hiddenIfHasItem: "" } },
    };
  }
  const oid = objectIdFromPickOrReq(state, actionId);
  if (oid && !state.meta.objects[oid]) {
    state.meta.objects = { ...state.meta.objects, [oid]: defaultObjectEntry(oid) };
  }
  return {
    id,
    nodeType: "satellite",
    satelliteType: "object",
    data: { objectId: oid },
  };
}

function layoutSouthOfAction(index: number): NodeLayout {
  const dy = 100 + index * 90;
  const dx = index > 0 ? 200 : 0;
  return {
    x: dx,
    y: dy,
    parentId: null,
    collapsed: false,
  };
}

const AUTO_ORDER: AutoSatelliteType[] = ["coords-options", "choice-options", "object"];
type NextAutoId = (prefix: string) => string;

/**
 * Réconcilie les satellites automatiques (store uniquement, pas de React).
 * Idempotent si le graphe est déjà cohérent.
 */
export function reconcileAutoSatellites(state: NodalProject, nextAutoId?: NextAutoId): void {
  let localSeq = 0;
  const localNextAutoId: NextAutoId = (prefix) => `${prefix}-${++localSeq}`;
  const createAutoId = nextAutoId ?? localNextAutoId;
  const nextSatId = (actionId: ActionNodeId, kind: AutoSatelliteType): SatelliteNodeId =>
    asSatelliteNodeId(createAutoId(`sat-${kind}-${actionId}`));
  const nextMetaEdgeId = (): EdgeId => asEdgeId(createAutoId("meta-e"));

  state.satellites = { ...state.satellites };
  state.layout = { ...state.layout };
  state.edges = [...state.edges];
  state.meta.objects = { ...state.meta.objects };

  const toRemove: SatelliteNodeId[] = [];
  for (const satId of Object.keys(state.satellites) as SatelliteNodeId[]) {
    const sat = state.satellites[satId];
    if (!sat) continue;
    if (sat.satelliteType !== "coords-options" && sat.satelliteType !== "choice-options" && sat.satelliteType !== "object")
      continue;
    const parent = findMetaParentActionId(state, satId);
    if (!parent) {
      toRemove.push(satId);
      continue;
    }
    const want = desiredAutoTypesForAction(state, parent);
    if (!want.has(sat.satelliteType)) toRemove.push(satId);
  }
  for (const sid of toRemove) removeSatelliteAndEdges(state, sid);

  for (const actionId of Object.keys(state.actions) as ActionNodeId[]) {
    const want = desiredAutoTypesForAction(state, actionId);
    let slot = 0;
    for (const satType of AUTO_ORDER) {
      if (!want.has(satType)) continue;
      const existingId = findExistingAutoSatellite(state, actionId, satType);
      if (existingId) {
        if (satType === "object") {
          const cur = state.satellites[existingId];
          if (cur?.satelliteType === "object") {
            const currentObjectId = cur.data.objectId.trim();
            const fallbackObjectId = objectIdFromPickOrReq(state, actionId);
            const effectiveObjectId = currentObjectId || fallbackObjectId;

            if (effectiveObjectId && !state.meta.objects[effectiveObjectId]) {
              state.meta.objects = {
                ...state.meta.objects,
                [effectiveObjectId]: defaultObjectEntry(effectiveObjectId),
              };
            }

            // Ne pas écraser la référence utilisateur déjà renseignée ;
            // ne prend le fallback action.itemId qu'en absence de valeur.
            if (cur.data.objectId !== effectiveObjectId) {
              state.satellites[existingId] = { ...cur, data: { objectId: effectiveObjectId } };
            }
          }
        }
        slot++;
        continue;
      }
      const sid = nextSatId(actionId, satType);
      state.satellites[sid] = createAutoSatelliteNode(state, sid, satType, actionId);
      state.layout[sid] = {
        ...layoutSouthOfAction(slot),
        parentId: actionId,
      };
      slot++;
      const edge: Edge = {
        id: nextMetaEdgeId(),
        family: "meta",
        sourceId: actionId as AnyNodeId,
        targetId: sid,
      };
      state.edges.push(edge);
    }
  }
}
