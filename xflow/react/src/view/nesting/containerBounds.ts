import type { AnyNodeId } from "../../model/ids";
import type { NodalProject } from "../../model/project";
import { DEFAULT_NODE_HEIGHT, DEFAULT_NODE_WIDTH } from "./geometry";

/** Marge interne cadre scène (C8.1.b — Annexe D 1.b.2). */
export const SCENE_PADDING_TOP = 32;
export const SCENE_PADDING_X = 16;
export const SCENE_PADDING_BOTTOM = 16;

const SCENE_MIN_INNER_WIDTH = 160;
const SCENE_MIN_INNER_HEIGHT = 48;

export function buildChildrenByParent(state: NodalProject): Map<AnyNodeId, AnyNodeId[]> {
  const childrenByParent = new Map<AnyNodeId, AnyNodeId[]>();
  for (const [nodeId, layout] of Object.entries(state.layout) as Array<
    [AnyNodeId, NodalProject["layout"][AnyNodeId]]
  >) {
    if (!layout?.parentId) continue;
    const list = childrenByParent.get(layout.parentId) ?? [];
    list.push(nodeId);
    childrenByParent.set(layout.parentId, list);
  }
  return childrenByParent;
}

/**
 * C8.6.1 — profondeur d’imbrication : nombre de sauts `parentId` depuis `nodeId` jusqu’à un nœud sans parent.
 * Utilisé pour prioriser le sous-selector au drop et pour le `z-index` visuel.
 */
export function parentIdDepth(state: NodalProject, nodeId: AnyNodeId): number {
  let d = 0;
  let cur: AnyNodeId | null | undefined = nodeId;
  const seen = new Set<string>();
  while (true) {
    const pid = state.layout[cur]?.parentId as AnyNodeId | null | undefined;
    if (pid == null) break;
    const k = String(pid);
    if (seen.has(k)) break;
    seen.add(k);
    d += 1;
    cur = pid;
  }
  return d;
}

/** Tous les nœuds du graphe `parentId` dont l’ancêtre racine est `rootId` (sans inclure `rootId`). */
export function collectDescendantNodeIds(
  rootId: AnyNodeId,
  childrenByParent: Map<AnyNodeId, AnyNodeId[]>
): AnyNodeId[] {
  const out: AnyNodeId[] = [];
  const stack = [...(childrenByParent.get(rootId) ?? [])];
  while (stack.length > 0) {
    const id = stack.pop()!;
    out.push(id);
    const ch = childrenByParent.get(id);
    if (ch) for (const c of ch) stack.push(c);
  }
  return out;
}

function nodeMeasuredSize(state: NodalProject, nodeId: AnyNodeId): { width: number; height: number } {
  const l = state.layout[nodeId];
  return {
    width: l?.width ?? DEFAULT_NODE_WIDTH,
    height: l?.height ?? DEFAULT_NODE_HEIGHT,
  };
}

/**
 * Coin supérieur gauche du nœud `nodeId` en coordonnées relatives à `containerId`
 * (somme des `layout.x` / `layout.y` le long de la chaîne `parentId` jusqu’à `containerId`).
 */
/** Somme des `layout.x` / `layout.y` le long de la chaîne `parentId` jusqu’à la racine — position absolue dans le repère du graphe RF. */
export function absoluteFlowPositionInPane(state: NodalProject, nodeId: AnyNodeId): { x: number; y: number } {
  let x = 0;
  let y = 0;
  let id: AnyNodeId | null | undefined = nodeId;
  while (id) {
    const l = state.layout[id];
    if (!l) break;
    x += l.x;
    y += l.y;
    id = (l.parentId ?? null) as AnyNodeId | null;
  }
  return { x, y };
}

export function positionRelativeToContainer(
  state: NodalProject,
  nodeId: AnyNodeId,
  containerId: AnyNodeId
): { x: number; y: number } | null {
  let x = 0;
  let y = 0;
  let id: AnyNodeId | null | undefined = nodeId;
  while (id && id !== containerId) {
    const l = state.layout[id];
    if (!l) return null;
    x += l.x;
    y += l.y;
    id = (l.parentId ?? null) as AnyNodeId | null;
  }
  return id === containerId ? { x, y } : null;
}

export type ComputeContainerBoundsOptions = {
  /** Nœuds exclus du calcul (ex. enfants masqués par repli selector). */
  excludeIds?: ReadonlySet<AnyNodeId>;
};

/**
 * Bounding box des descendants du conteneur + marges (Annexe D 1.b.2).
 * Sans descendant visible : taille minimale compacte.
 */
export function computeContainerBounds(
  state: NodalProject,
  containerId: AnyNodeId,
  options?: ComputeContainerBoundsOptions
): { width: number; height: number } {
  const exclude = options?.excludeIds;
  const childrenByParent = buildChildrenByParent(state);
  const descendants = collectDescendantNodeIds(containerId, childrenByParent).filter((id) => !exclude?.has(id));

  if (descendants.length === 0) {
    const innerW = Math.max(0, SCENE_MIN_INNER_WIDTH + SCENE_PADDING_X);
    const innerH = Math.max(0, SCENE_PADDING_TOP + SCENE_MIN_INNER_HEIGHT);
    return {
      width: innerW + SCENE_PADDING_X,
      height: innerH + SCENE_PADDING_BOTTOM,
    };
  }

  /** Origine (0,0) du conteneur RF — les enfants sont re-ancrés à ≥ (padX, padTop) (1.b.2-fix). */
  let maxRight = 0;
  let maxBottom = 0;

  for (const id of descendants) {
    const rel = positionRelativeToContainer(state, id, containerId);
    if (!rel) continue;
    const { width, height } = nodeMeasuredSize(state, id);
    maxRight = Math.max(maxRight, rel.x + width);
    maxBottom = Math.max(maxBottom, rel.y + height);
  }

  const innerW = Math.max(maxRight, SCENE_MIN_INNER_WIDTH + SCENE_PADDING_X);
  const innerH = Math.max(maxBottom, SCENE_PADDING_TOP + SCENE_MIN_INNER_HEIGHT);
  return {
    width: innerW + SCENE_PADDING_X,
    height: innerH + SCENE_PADDING_BOTTOM,
  };
}

/**
 * Garantit que chaque enfant **direct** du conteneur (s-box ou legacy) a `x ≥ SCENE_PADDING_X` et `y ≥ SCENE_PADDING_TOP`.
 * Sinon décale le conteneur en absolu et translate les enfants directs en relatif inverse (monde inchangé).
 * Idempotent. Ne modifie pas les petits-enfants (coords déjà relatives au parent intermédiaire).
 */
export function reanchorSBox(state: NodalProject, containerId: AnyNodeId): void {
  const sceneLayout = state.layout[containerId];
  if (!sceneLayout) return;

  const directChildren: Array<[AnyNodeId, NonNullable<NodalProject["layout"][AnyNodeId]>]> = [];
  for (const [id, l] of Object.entries(state.layout) as Array<
    [AnyNodeId, NodalProject["layout"][AnyNodeId]]
  >) {
    if (l?.parentId === containerId) directChildren.push([id, l]);
  }
  if (directChildren.length === 0) return;

  let minRelX = Infinity;
  let minRelY = Infinity;
  for (const [, l] of directChildren) {
    minRelX = Math.min(minRelX, l.x);
    minRelY = Math.min(minRelY, l.y);
  }

  const shiftX = minRelX < SCENE_PADDING_X ? SCENE_PADDING_X - minRelX : 0;
  const shiftY = minRelY < SCENE_PADDING_TOP ? SCENE_PADDING_TOP - minRelY : 0;
  if (shiftX === 0 && shiftY === 0) return;

  state.layout[containerId] = { ...sceneLayout, x: sceneLayout.x - shiftX, y: sceneLayout.y - shiftY };
  for (const [childId, l] of directChildren) {
    state.layout[childId] = { ...l, x: l.x + shiftX, y: l.y + shiftY };
  }
}

/** @deprecated utiliser `reanchorSBox` (1.b.2.x). */
export const reanchorSceneContainer = reanchorSBox;
