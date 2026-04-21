import type { Connection, Edge, Node } from "@xyflow/react";
import { mapFlowDebugOn, mapFlowLog, mapFlowManualEdgesDisabled } from "./mapFlowDebug";
import { RF_FLOW_IN, RF_FLOW_OUT } from "./mapFlowHandles";

const STORAGE_SUFFIX = ":flowExtra";

function storageKey(layoutKey: string): string {
  return `${layoutKey}${STORAGE_SUFFIX}`;
}

export function loadFlowExtraEdges(layoutKey: string): Edge[] {
  if (mapFlowManualEdgesDisabled()) return [];
  if (!layoutKey) return [];
  try {
    const raw = sessionStorage.getItem(storageKey(layoutKey));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((e) => e && typeof e === "object" && typeof (e as Edge).id === "string") as Edge[];
  } catch {
    return [];
  }
}

function saveFlowExtraEdges(layoutKey: string, edges: Edge[]): void {
  if (!layoutKey) return;
  try {
    sessionStorage.setItem(storageKey(layoutKey), JSON.stringify(edges));
  } catch {
    /* ignore quota */
  }
}

function nodeIdSet(nodes: Node[]): Set<string> {
  return new Set(nodes.map((n) => n.id));
}

/** Arêtes issues du graphe projet + arêtes « extras » (pédagogie / hors V2) encore valides. */
export function mergePackEdgesWithExtras(base: Edge[], extras: Edge[], nodes: Node[]): Edge[] {
  if (mapFlowManualEdgesDisabled()) return base;
  const ids = nodeIdSet(nodes);
  const filtered = extras.filter(
    (e) =>
      ids.has(e.source) &&
      ids.has(e.target) &&
      (e.sourceHandle === RF_FLOW_OUT || e.sourceHandle === "out") &&
      (e.targetHandle === RF_FLOW_IN || e.targetHandle === "in")
  );
  if (filtered.length !== extras.length && mapFlowDebugOn()) {
    mapFlowLog("extrasFilteredOut", {
      dropped: extras.length - filtered.length,
      kept: filtered.length,
    });
  }
  return [...base, ...filtered];
}

function extraEdgeId(c: Connection): string {
  const sh = c.sourceHandle ?? RF_FLOW_OUT;
  const th = c.targetHandle ?? RF_FLOW_IN;
  return `xflow-extra:${c.source}->${c.target}:${sh}:${th}`;
}

/** Supprime toutes les arêtes « extras » (pointillés) pour cette clé de layout. Retourne le nombre supprimé. */
export function clearAllFlowExtraEdges(layoutKey: string): number {
  if (!layoutKey) return 0;
  const list = (() => {
    try {
      const raw = sessionStorage.getItem(storageKey(layoutKey));
      if (!raw) return [];
      const parsed = JSON.parse(raw) as unknown;
      if (!Array.isArray(parsed)) return [];
      return parsed.filter((e) => e && typeof e === "object" && typeof (e as Edge).id === "string") as Edge[];
    } catch {
      return [];
    }
  })();
  const n = list.length;
  try {
    sessionStorage.removeItem(storageKey(layoutKey));
  } catch {
    /* ignore */
  }
  mapFlowLog("manualEdgesCleared", { layoutKey, removed: n });
  return n;
}

/** Arête manuelle (tiret) : lien carte sans sérialisation projet pour l’instant. */
export function appendFlowExtraConnection(
  layoutKey: string,
  c: Connection,
  reason?: string
): void {
  if (mapFlowManualEdgesDisabled()) {
    if (mapFlowDebugOn()) {
      mapFlowLog("manualEdgeSkippedDisabled", { layoutKey, reason, connection: c });
    }
    return;
  }
  if (!layoutKey || !c.source || !c.target) return;
  const list = loadFlowExtraEdges(layoutKey);
  const id = extraEdgeId(c);
  if (list.some((e) => e.id === id)) return;
  list.push({
    id,
    source: c.source,
    target: c.target,
    sourceHandle: c.sourceHandle ?? RF_FLOW_OUT,
    targetHandle: c.targetHandle ?? RF_FLOW_IN,
    type: "smoothstep",
    style: { stroke: "#94a3b8", strokeWidth: 2, strokeDasharray: "5 4" },
    deletable: true,
    selectable: true,
  });
  saveFlowExtraEdges(layoutKey, list);
  mapFlowLog("manualEdgeAdded", {
    layoutKey,
    reason: reason ?? "unspecified",
    id,
    source: c.source,
    target: c.target,
    total: list.length,
  });
}

export function removeFlowExtraEdgesByIds(layoutKey: string, removedIds: string[]): void {
  if (!layoutKey || removedIds.length === 0) return;
  const drop = new Set(removedIds.filter((id) => id.startsWith("xflow-extra:")));
  if (drop.size === 0) return;
  const list = loadFlowExtraEdges(layoutKey).filter((e) => !drop.has(e.id));
  saveFlowExtraEdges(layoutKey, list);
}
