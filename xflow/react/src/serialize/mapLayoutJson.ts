import type { ActionNodeId, AnyNodeId } from "../model/ids";
import type { NodeLayout } from "../model/layout";
import type { ObjectEntry } from "../model/objects";
import type { NodalProject } from "../model/project";

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
export function applyHydratedLayout(state: NodalProject, layout: MapLayoutJson): void {
  applyLayout(state, stripAutoSatelliteLayoutFromMap(layout));
  ensureGraphNodeLayoutsAfterHydrate(state);
}

export type MapLayoutJson = {
  positions: Record<string, { x: number; y: number }>;
  parentId: Record<string, string>;
  collapsed: Record<string, boolean>;
  drafts: string[];
  viewport: { x: number; y: number; zoom: number };
  /** Tailles nœud (ex. selector redimensionné, C3c). */
  dimensions?: Record<string, { width: number; height: number }>;
  /** Inventaire partagé (C3a). Les satellites / edges meta ne sont pas sérialisés ici : recréés par reconcile après apply. */
  inventoryObjects?: Record<string, ObjectEntry>;
};

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
  if (Object.keys(dimensions).length > 0) {
    out.dimensions = dimensions;
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
