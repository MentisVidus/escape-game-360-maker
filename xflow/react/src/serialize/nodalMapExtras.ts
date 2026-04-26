import type { Edge } from "../model/edges";
import { asEdgeId, type ActionNodeId, type MediaNodeId, type SatelliteNodeId } from "../model/ids";
import type {
  ChoiceOptionsSatelliteNode,
  CoordsOptionsSatelliteNode,
  ObjectSatelliteNode,
} from "../model/nodes";
import type { NodalProject } from "../model/project";

import { getHotspotActionIdsForScene, getSelectorChildren, getSelectorChildrenFlowOrder, sortActionIdsByY } from "./toProjectJson";

/** Données des satellites auto, indexées par chemin stable `sceneId:h:i[:r|:c:j…]`. */
export type NodalAutoSatellitePayload = {
  coords?: CoordsOptionsSatelliteNode["data"];
  choice?: ChoiceOptionsSatelliteNode["data"];
  object?: ObjectSatelliteNode["data"];
};

function isReqOrPwd(action: { actionType: string }): boolean {
  return action.actionType === "req" || action.actionType === "pwd";
}

function readAutoSatellitePayloadsForAction(state: NodalProject, actionId: ActionNodeId): NodalAutoSatellitePayload {
  const out: NodalAutoSatellitePayload = {};
  for (const e of state.edges) {
    if (e.family !== "meta" || e.sourceId !== actionId) continue;
    const sat = state.satellites[e.targetId as SatelliteNodeId];
    if (!sat) continue;
    if (sat.satelliteType === "coords-options") out.coords = { ...sat.data };
    else if (sat.satelliteType === "choice-options") out.choice = { ...sat.data };
    else if (sat.satelliteType === "object") out.object = { ...sat.data };
  }
  return out;
}

function walkActionTree(
  state: NodalProject,
  actionId: ActionNodeId,
  pathKey: string,
  visitor: (aid: ActionNodeId, pk: string) => void
): void {
  visitor(actionId, pathKey);
  const a = state.actions[actionId];
  if (!a) return;
  if (isReqOrPwd(a) && "rewardActionId" in a && a.rewardActionId) {
    walkActionTree(state, a.rewardActionId, `${pathKey}:r`, visitor);
  }
  if (a.actionType === "selector") {
    const flowCh = getSelectorChildrenFlowOrder(state, actionId);
    const children =
      flowCh.length > 0 ? flowCh : sortActionIdsByY(state, getSelectorChildren(state, actionId));
    children.forEach((cid, ci) => walkActionTree(state, cid, `${pathKey}:c:${ci}`, visitor));
  }
}

export function forEachActionInExportWalkOrder(
  state: NodalProject,
  visitor: (actionId: ActionNodeId, pathKey: string) => void
): void {
  for (const scene of Object.values(state.scenes)) {
    const hs = getHotspotActionIdsForScene(state, scene.id);
    const ext = scene.sceneId;
    hs.forEach((aid, hi) => {
      walkActionTree(state, aid, `${ext}:h:${hi}`, visitor);
    });
  }
}

export function buildNodalAutoSatelliteData(state: NodalProject): Record<string, NodalAutoSatellitePayload> {
  const out: Record<string, NodalAutoSatellitePayload> = {};
  forEachActionInExportWalkOrder(state, (aid, pathKey) => {
    const snap = readAutoSatellitePayloadsForAction(state, aid);
    if (snap.coords || snap.choice || snap.object) {
      out[pathKey] = snap;
    }
  });
  return out;
}

function applyPayloadsToActionSatellites(state: NodalProject, actionId: ActionNodeId, snap: NodalAutoSatellitePayload): void {
  for (const e of state.edges) {
    if (e.family !== "meta" || e.sourceId !== actionId) continue;
    const sid = e.targetId as SatelliteNodeId;
    const sat = state.satellites[sid];
    if (!sat) continue;
    if (sat.satelliteType === "coords-options" && snap.coords) {
      state.satellites[sid] = { ...sat, data: { ...sat.data, ...snap.coords } } as CoordsOptionsSatelliteNode;
    } else if (sat.satelliteType === "choice-options" && snap.choice) {
      state.satellites[sid] = { ...sat, data: { ...sat.data, ...snap.choice } } as ChoiceOptionsSatelliteNode;
    } else if (sat.satelliteType === "object" && snap.object) {
      state.satellites[sid] = { ...sat, data: { ...sat.data, ...snap.object } } as ObjectSatelliteNode;
    }
  }
}

export function applyNodalAutoSatelliteData(
  state: NodalProject,
  data: Record<string, NodalAutoSatellitePayload> | undefined
): void {
  if (!data || Object.keys(data).length === 0) return;
  forEachActionInExportWalkOrder(state, (aid, pathKey) => {
    const snap = data[pathKey];
    if (snap) applyPayloadsToActionSatellites(state, aid, snap);
  });
}

/** Lien meta action→média avec chemin d’action stable (les ids internes changent à l’import). */
export type NodalMetaMediaLink = { pathKey: string; mediaId: string };

export function collectMetaMediaLinks(state: NodalProject): NodalMetaMediaLink[] {
  const out: NodalMetaMediaLink[] = [];
  forEachActionInExportWalkOrder(state, (aid, pathKey) => {
    for (const e of state.edges) {
      if (e.family === "meta" && e.sourceId === aid && e.targetId in state.media) {
        out.push({ pathKey, mediaId: e.targetId as string });
      }
    }
  });
  return out;
}

export function applyMetaMediaLinks(state: NodalProject, links: NodalMetaMediaLink[] | undefined): void {
  if (!links?.length) return;
  for (const { pathKey, mediaId } of links) {
    let actionId: ActionNodeId | null = null;
    forEachActionInExportWalkOrder(state, (aid, pk) => {
      if (pk === pathKey) actionId = aid;
    });
    if (!actionId || !Object.prototype.hasOwnProperty.call(state.media, mediaId)) continue;
    if (state.edges.some((e) => e.family === "meta" && e.sourceId === actionId && e.targetId === mediaId)) continue;
    const edge: Edge = {
      id: asEdgeId(`edge-meta-mm-${String(actionId)}-${String(mediaId)}`),
      family: "meta",
      sourceId: actionId,
      targetId: mediaId as MediaNodeId,
    };
    state.edges.push(edge);
  }
}
