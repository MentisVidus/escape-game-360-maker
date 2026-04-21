import type { Connection, Edge, Node } from "@xyflow/react";
import { RF_FLOW_IN, RF_FLOW_OUT } from "./mapFlowHandles";

const STORAGE_SUFFIX = ":flowExtra";

function storageKey(layoutKey: string): string {
  return `${layoutKey}${STORAGE_SUFFIX}`;
}

export function loadFlowExtraEdges(layoutKey: string): Edge[] {
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
  const ids = nodeIdSet(nodes);
  const filtered = extras.filter(
    (e) =>
      ids.has(e.source) &&
      ids.has(e.target) &&
      (e.sourceHandle === RF_FLOW_OUT || e.sourceHandle === "out") &&
      (e.targetHandle === RF_FLOW_IN || e.targetHandle === "in")
  );
  return [...base, ...filtered];
}

function extraEdgeId(c: Connection): string {
  const sh = c.sourceHandle ?? RF_FLOW_OUT;
  const th = c.targetHandle ?? RF_FLOW_IN;
  return `xflow-extra:${c.source}->${c.target}:${sh}:${th}`;
}

/** Arête manuelle (tiret) : lien carte sans sérialisation projet pour l’instant. */
export function appendFlowExtraConnection(layoutKey: string, c: Connection): void {
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
}

export function removeFlowExtraEdgesByIds(layoutKey: string, removedIds: string[]): void {
  if (!layoutKey || removedIds.length === 0) return;
  const drop = new Set(removedIds.filter((id) => id.startsWith("xflow-extra:")));
  if (drop.size === 0) return;
  const list = loadFlowExtraEdges(layoutKey).filter((e) => !drop.has(e.id));
  saveFlowExtraEdges(layoutKey, list);
}
