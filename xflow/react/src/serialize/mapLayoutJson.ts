import type { ActionNodeId, AnyNodeId } from "../model/ids";
import type { NodeLayout } from "../model/layout";
import type { MediaNode } from "../model/nodes";
import type { ObjectEntry } from "../model/objects";
import type { NodalProject } from "../model/project";
import type { PlayerPopupTheme } from "../view/popups/playerPopupDomRead";
import { buildActionIdByPathKeyMapFromProjectJson } from "./fromProjectJson";
import type { ProjectJsonV2 } from "./toProjectJson";

import {
  applySceneMetaMediaLinks,
  buildNodalAutoSatelliteData,
  collectMetaMediaLinks,
  collectSceneMetaMediaLinks,
  forEachActionInExportWalkOrder,
  type NodalAutoSatellitePayload,
  type NodalMetaMediaLink,
  type NodalSceneMetaMediaLink,
} from "./nodalMapExtras";

export type MapLayoutJson = {
  positions: Record<string, { x: number; y: number }>;
  parentId: Record<string, string>;
  collapsed: Record<string, boolean>;
  drafts: string[];
  viewport: { x: number; y: number; zoom: number };
  dimensions?: Record<string, { width: number; height: number }>;
  inventoryObjects?: Record<string, ObjectEntry>;
  /** Layout stable des scènes indexé par scene.id V2 (métier) */
  nodalSceneLayoutByExternalId?: Record<string, { x: number; y: number; collapsed: boolean; width?: number; height?: number }>;
  /** Layout stable des actions indexé par path d'export (`scene:h:i[:r|:c:n...]`) */
  nodalActionLayoutByPathKey?: Record<string, { x: number; y: number; collapsed: boolean; width?: number; height?: number }>;
  /** Labels des nœuds action indexés par path d'export (hors schéma JSON V2 métier). */
  nodalActionLabelByPathKey?: Record<string, string>;
  nodalAutoSatelliteData?: Record<string, NodalAutoSatellitePayload>;
  nodalMedia?: Record<string, MediaNode>;
  nodalMetaMediaLinks?: NodalMetaMediaLink[];
  /** Arêtes meta scène→média (hors JSON V2). */
  nodalSceneMetaMediaLinks?: NodalSceneMetaMediaLink[];
  /** Thème popup joueur stocké côté nodal (phase B C7.2-bis). */
  nodalPlayerPopupTheme?: PlayerPopupTheme;
};

/** Clés de layout des satellites auto (recréés par `reconcileAutoSatellites`) — ne pas persister ni réappliquer telles quelles. */
export const AUTO_SATELLITE_LAYOUT_KEY_RE = /^sat-(coords-options|choice-options|object)-/;

export function stripAutoSatelliteLayoutFromMap(layout: MapLayoutJson): MapLayoutJson {
  const keep = (id: string) => !AUTO_SATELLITE_LAYOUT_KEY_RE.test(id);
  const positions = Object.fromEntries(Object.entries(layout.positions).filter(([k]) => keep(k)));
  const parentId = Object.fromEntries(Object.entries(layout.parentId).filter(([k]) => keep(k)));
  const collapsed = Object.fromEntries(Object.entries(layout.collapsed).filter(([k]) => keep(k)));
  const dimensionsRaw = layout.dimensions
    ? Object.fromEntries(Object.entries(layout.dimensions).filter(([k]) => keep(k)))
    : undefined;
  const out: MapLayoutJson = {
    ...layout,
    positions,
    parentId,
    collapsed,
    drafts: (layout.drafts || []).filter((id) => keep(String(id))),
    viewport: { ...layout.viewport },
    ...(layout.inventoryObjects !== undefined ? { inventoryObjects: { ...layout.inventoryObjects } } : {}),
  };
  if (dimensionsRaw && Object.keys(dimensionsRaw).length > 0) {
    out.dimensions = dimensionsRaw;
  }
  if (layout.nodalAutoSatelliteData && Object.keys(layout.nodalAutoSatelliteData).length > 0) {
    out.nodalAutoSatelliteData = { ...layout.nodalAutoSatelliteData };
  }
  if (layout.nodalSceneLayoutByExternalId && Object.keys(layout.nodalSceneLayoutByExternalId).length > 0) {
    out.nodalSceneLayoutByExternalId = { ...layout.nodalSceneLayoutByExternalId };
  }
  if (layout.nodalActionLayoutByPathKey && Object.keys(layout.nodalActionLayoutByPathKey).length > 0) {
    out.nodalActionLayoutByPathKey = { ...layout.nodalActionLayoutByPathKey };
  }
  if (layout.nodalActionLabelByPathKey && Object.keys(layout.nodalActionLabelByPathKey).length > 0) {
    out.nodalActionLabelByPathKey = { ...layout.nodalActionLabelByPathKey };
  }
  if (layout.nodalMedia && Object.keys(layout.nodalMedia).length > 0) {
    out.nodalMedia = { ...layout.nodalMedia };
  }
  if (layout.nodalMetaMediaLinks?.length) {
    out.nodalMetaMediaLinks = [...layout.nodalMetaMediaLinks];
  }
  if (layout.nodalSceneMetaMediaLinks?.length) {
    out.nodalSceneMetaMediaLinks = [...layout.nodalSceneMetaMediaLinks];
  }
  if (layout.nodalPlayerPopupTheme) {
    out.nodalPlayerPopupTheme = { ...layout.nodalPlayerPopupTheme };
  }
  return out;
}

/** Après désérialisation + `applyLayout`, garantit un layout pour chaque nœud durable (évite parent RF fantôme). */
export function ensureGraphNodeLayoutsAfterHydrate(state: NodalProject): void {
  const fallback: NodeLayout = { x: 0, y: 0, parentId: null, collapsed: false };
  for (const id of Object.keys(state.scenes) as AnyNodeId[]) {
    if (!state.layout[id]) state.layout[id] = { ...fallback };
  }
  for (const id of Object.keys(state.actions) as AnyNodeId[]) {
    if (!state.layout[id]) state.layout[id] = { ...fallback };
  }
  for (const id of Object.keys(state.media) as AnyNodeId[]) {
    if (!state.layout[id]) state.layout[id] = { ...fallback };
  }
}

/** Applique le layout carte en ignorant les entrées satellites auto + complète les nœuds manquants. */
export function applyHydratedLayout(state: NodalProject, layout: MapLayoutJson, projectJson: ProjectJsonV2): void {
  if (layout.nodalMedia && Object.keys(layout.nodalMedia).length > 0) {
    state.media = Object.fromEntries(
      Object.entries(layout.nodalMedia).map(([id, media]) => [
        id,
        { ...media, label: typeof media.label === "string" && media.label.trim() ? media.label : "Media" },
      ])
    ) as NodalProject["media"];
  }
  applyLayout(state, stripAutoSatelliteLayoutFromMap(layout));
  applyStableSceneAndActionLayout(state, layout, buildActionIdByPathKeyMapFromProjectJson(projectJson));
  stripSelectorChoiceFlowEdgesAfterParentRestore(state);
  applySceneMetaMediaLinks(state, layout.nodalSceneMetaMediaLinks);
  ensureGraphNodeLayoutsAfterHydrate(state);
}

function deriveParentPathKey(pathKey: string): string | null {
  if (pathKey.endsWith(":r")) return pathKey.slice(0, -2);
  const m = pathKey.match(/^(.*):c:\d+$/);
  return m?.[1] ?? null;
}

/** Applique le layout stable (indépendant des ids internes) pour scènes + actions. */
function applyStableSceneAndActionLayout(
  state: NodalProject,
  layout: MapLayoutJson,
  actionIdByPathFromJson: Map<string, AnyNodeId>
): void {
  const sceneStable = layout.nodalSceneLayoutByExternalId;
  if (sceneStable && Object.keys(sceneStable).length > 0) {
    const sceneIdByExternal = new Map<string, AnyNodeId>();
    for (const s of Object.values(state.scenes)) sceneIdByExternal.set(s.sceneId, s.id);
    for (const [externalId, l] of Object.entries(sceneStable)) {
      const sceneId = sceneIdByExternal.get(externalId);
      if (!sceneId) continue;
      const existing = state.layout[sceneId];
      state.layout[sceneId] = {
        ...existing,
        x: l.x,
        y: l.y,
        parentId: null,
        collapsed: l.collapsed,
        ...(l.width != null && l.height != null ? { width: l.width, height: l.height } : {}),
      };
    }
  }

  const actionStable = layout.nodalActionLayoutByPathKey;
  if (!actionStable || Object.keys(actionStable).length === 0) return;

  for (const [pathKey, l] of Object.entries(actionStable)) {
    const actionId = actionIdByPathFromJson.get(pathKey);
    if (!actionId) continue;
    const existing = state.layout[actionId];
    const parentPath = deriveParentPathKey(pathKey);
    const mappedParent = parentPath !== null ? actionIdByPathFromJson.get(parentPath) ?? null : null;
    const parentId =
      parentPath === null ? null : (mappedParent ?? (existing?.parentId as AnyNodeId | null | undefined) ?? null);
    state.layout[actionId] = {
      ...existing,
      x: l.x,
      y: l.y,
      parentId,
      collapsed: l.collapsed,
      ...(l.width != null && l.height != null ? { width: l.width, height: l.height } : {}),
    };
  }

  const actionLabels = layout.nodalActionLabelByPathKey;
  if (!actionLabels || Object.keys(actionLabels).length === 0) return;
  for (const [pathKey, label] of Object.entries(actionLabels)) {
    const actionId = actionIdByPathFromJson.get(pathKey);
    if (!actionId) continue;
    const action = state.actions[actionId as ActionNodeId];
    if (!action) continue;
    action.label = typeof label === "string" && label.trim() ? label : action.label;
  }
}

/** C3: une fois `parentId` restauré, les edges legacy `selector -> choix` sont supprimées. */
function stripSelectorChoiceFlowEdgesAfterParentRestore(state: NodalProject): void {
  state.edges = state.edges.filter((e) => {
    if (e.family !== "flow" || !(e.sourceId in state.actions) || !(e.targetId in state.actions)) return true;
    const src = state.actions[e.sourceId as ActionNodeId];
    if (!src || src.actionType !== "selector") return true;
    return state.layout[e.targetId as ActionNodeId]?.parentId !== src.id;
  });
}

const isActionOrphan = (state: NodalProject, actionId: ActionNodeId): boolean => {
  const layout = state.layout[actionId];
  if (layout?.parentId) return false;

  const hasFlowIn = state.edges.some((edge) => edge.family === "flow" && edge.targetId === actionId);
  if (hasFlowIn) return false;

  const isReward = Object.values(state.actions).some(
    (action) => (action.actionType === "req" || action.actionType === "pwd") && action.rewardActionId === actionId
  );
  return !isReward;
};

export const serializeLayout = (state: NodalProject): MapLayoutJson => {
  const positions: MapLayoutJson["positions"] = {};
  const parentId: MapLayoutJson["parentId"] = {};
  const collapsed: MapLayoutJson["collapsed"] = {};
  const dimensions: NonNullable<MapLayoutJson["dimensions"]> = {};

  for (const [nodeId, layout] of Object.entries(state.layout) as Array<[AnyNodeId, NodalProject["layout"][AnyNodeId]]>) {
    if (AUTO_SATELLITE_LAYOUT_KEY_RE.test(String(nodeId))) continue;
    positions[nodeId] = { x: layout.x, y: layout.y };
    collapsed[nodeId] = layout.collapsed;
    if (layout.parentId) parentId[nodeId] = layout.parentId;
    if (layout.width != null && layout.height != null) {
      dimensions[nodeId] = { width: layout.width, height: layout.height };
    }
  }

  const draftSet = new Set<string>(state.meta.draftActionIds);
  for (const actionId of Object.keys(state.actions) as ActionNodeId[]) {
    if (isActionOrphan(state, actionId)) draftSet.add(actionId);
  }

  const out: MapLayoutJson = {
    positions,
    parentId,
    collapsed,
    drafts: [...draftSet],
    viewport: { ...state.meta.viewport },
    inventoryObjects: { ...state.meta.objects },
  };

  const sceneStable: NonNullable<MapLayoutJson["nodalSceneLayoutByExternalId"]> = {};
  for (const scene of Object.values(state.scenes)) {
    const l = state.layout[scene.id];
    if (!l) continue;
    sceneStable[scene.sceneId] = {
      x: l.x,
      y: l.y,
      collapsed: l.collapsed,
      ...(l.width != null && l.height != null ? { width: l.width, height: l.height } : {}),
    };
  }
  if (Object.keys(sceneStable).length > 0) out.nodalSceneLayoutByExternalId = sceneStable;

  const actionStable: NonNullable<MapLayoutJson["nodalActionLayoutByPathKey"]> = {};
  const actionLabels: NonNullable<MapLayoutJson["nodalActionLabelByPathKey"]> = {};
  forEachActionInExportWalkOrder(state, (actionId, pathKey) => {
    const l = state.layout[actionId];
    const action = state.actions[actionId];
    if (!l) return;
    actionStable[pathKey] = {
      x: l.x,
      y: l.y,
      collapsed: l.collapsed,
      ...(l.width != null && l.height != null ? { width: l.width, height: l.height } : {}),
    };
    if (action?.label) {
      actionLabels[pathKey] = String(action.label);
    }
  });
  if (Object.keys(actionStable).length > 0) out.nodalActionLayoutByPathKey = actionStable;
  if (Object.keys(actionLabels).length > 0) out.nodalActionLabelByPathKey = actionLabels;

  if (Object.keys(dimensions).length > 0) {
    out.dimensions = dimensions;
  }
  const satData = buildNodalAutoSatelliteData(state);
  if (Object.keys(satData).length > 0) {
    out.nodalAutoSatelliteData = satData;
  }
  if (Object.keys(state.media).length > 0) {
    out.nodalMedia = { ...state.media };
  }
  const metaLinks = collectMetaMediaLinks(state);
  if (metaLinks.length > 0) {
    out.nodalMetaMediaLinks = metaLinks;
  }
  const sceneMetaLinks = collectSceneMetaMediaLinks(state);
  if (sceneMetaLinks.length > 0) {
    out.nodalSceneMetaMediaLinks = sceneMetaLinks;
  }
  const playerPopupTheme = (state as NodalProject & { playerPopupTheme?: PlayerPopupTheme }).playerPopupTheme;
  if (playerPopupTheme) {
    out.nodalPlayerPopupTheme = { ...playerPopupTheme };
  }
  return out;
};

export const applyLayout = (state: NodalProject, layout: MapLayoutJson): void => {
  for (const [nodeId, position] of Object.entries(layout.positions)) {
    const existing = state.layout[nodeId as AnyNodeId];
    const dim = layout.dimensions?.[nodeId];
    state.layout[nodeId as AnyNodeId] = {
      ...existing,
      x: position.x,
      y: position.y,
      parentId: layout.parentId[nodeId] ? (layout.parentId[nodeId] as AnyNodeId) : existing?.parentId ?? null,
      collapsed: layout.collapsed[nodeId] ?? existing?.collapsed ?? false,
      ...(dim ? { width: dim.width, height: dim.height } : {}),
    };
  }
  state.meta.draftActionIds = layout.drafts as ActionNodeId[];
  state.meta.viewport = { ...layout.viewport };

  if (layout.inventoryObjects !== undefined) {
    state.meta.objects = { ...layout.inventoryObjects };
  }
};
