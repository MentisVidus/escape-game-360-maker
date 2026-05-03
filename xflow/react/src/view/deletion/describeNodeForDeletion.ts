import type { ActionNodeId, AnyNodeId, SceneBoxNodeId, SceneNodeId } from "../../model/ids";
import type { NodalProject } from "../../model/project";
import { sboxIdFromScene } from "../../store/reconcileSceneBoxes";
import { buildChildrenByParent, collectDescendantNodeIds } from "../nesting/containerBounds";

export type DeletionDescribeResult = {
  needsConfirm: boolean;
  title: string;
  body: string;
  /** Id store à supprimer (scène, pas s-box). */
  storeTargetId: AnyNodeId;
};

function countActionsUnderSceneBox(state: NodalProject, bid: SceneBoxNodeId): number {
  const ch = buildChildrenByParent(state);
  const stack = [...(ch.get(bid) ?? [])];
  let n = 0;
  const seen = new Set<string>();
  while (stack.length) {
    const id = stack.pop()!;
    if (seen.has(id)) continue;
    seen.add(id);
    if (id in state.actions) n += 1;
    for (const c of ch.get(id) ?? []) stack.push(c);
  }
  return n;
}

/** Choix directs = nœuds `action` dont `parentId` est le selector (exclut satellites auto). */
function countSelectorChoices(state: NodalProject, selectorId: AnyNodeId): number {
  let count = 0;
  for (const [nid, layout] of Object.entries(state.layout) as Array<[AnyNodeId, (typeof state.layout)[AnyNodeId]]>) {
    if (layout.parentId !== selectorId) continue;
    if (nid in state.actions) count += 1;
  }
  return count;
}

/** Remappe s-box → id nœud scène ; ignore satellites (non supprimables depuis le store via RF). */
export function normalizeDeletionTarget(state: NodalProject, rawId: AnyNodeId): AnyNodeId | null {
  if (rawId in state.satellites) return null;
  if (rawId in state.sceneBoxes) {
    const box = state.sceneBoxes[rawId as SceneBoxNodeId];
    return box?.sceneId ?? null;
  }
  return rawId;
}

/**
 * C8.2.2 — texte de confirmation ou suppression silencieuse.
 * `null` si le nœud n’existe pas dans le périmètre supprimable store.
 */
export function describeNodeForDeletion(
  state: NodalProject,
  rawId: AnyNodeId,
  locale: "fr" | "en"
): DeletionDescribeResult | null {
  const nodeId = normalizeDeletionTarget(state, rawId);
  if (nodeId == null) return null;

  if (nodeId in state.scenes) {
    const bid = sboxIdFromScene(nodeId as SceneNodeId);
    const n = countActionsUnderSceneBox(state, bid);
    const scene = state.scenes[nodeId as SceneNodeId];
    const label = scene?.label ?? String(nodeId);
    if (n > 0) {
      return {
        needsConfirm: true,
        title: locale === "fr" ? "Supprimer la scène ?" : "Delete scene?",
        body:
          locale === "fr"
            ? `Supprimer la scène « ${label} » et ${n} action(s) interne(s) ?`
            : `Delete scene "${label}" and ${n} nested action(s)?`,
        storeTargetId: nodeId,
      };
    }
    return {
      needsConfirm: false,
      title: "",
      body: "",
      storeTargetId: nodeId,
    };
  }

  if (nodeId in state.actions) {
    const act = state.actions[nodeId as ActionNodeId];
    if (act.actionType === "selector") {
      const k = countSelectorChoices(state, nodeId);
      if (k > 0) {
        return {
          needsConfirm: true,
          title: locale === "fr" ? "Supprimer le selector ?" : "Delete selector?",
          body:
            locale === "fr"
              ? `Supprimer ce selector et ses ${k} choix ?`
              : `Delete this selector and its ${k} choice(s)?`,
          storeTargetId: nodeId,
        };
      }
    }
    return {
      needsConfirm: false,
      title: "",
      body: "",
      storeTargetId: nodeId,
    };
  }

  if (nodeId in state.media) {
    return {
      needsConfirm: false,
      title: "",
      body: "",
      storeTargetId: nodeId,
    };
  }

  return null;
}

/** Tri topologique « feuilles d’abord » pour un ensemble de nœuds liés par `parentId`. */
export function topoDeleteOrder(ids: AnyNodeId[], layout: NodalProject["layout"]): AnyNodeId[] {
  const set = new Set(ids);
  const out: AnyNodeId[] = [];
  while (set.size) {
    const leaf = [...set].find((id) => {
      for (const nid of set) {
        if (nid === id) continue;
        if (layout[nid]?.parentId === id) return false;
      }
      return true;
    });
    if (leaf === undefined) {
      out.push(...set);
      break;
    }
    set.delete(leaf);
    out.push(leaf);
  }
  return out;
}

/**
 * Ordre des appels `removeNode` pour supprimer `nodeId` et ses dépendances internes
 * (scène avec sous-arbre, selector avec choix).
 */
export function orderedDeleteChainForStoreNode(state: NodalProject, rawId: AnyNodeId): AnyNodeId[] {
  const nodeId = normalizeDeletionTarget(state, rawId);
  if (nodeId == null) return [];

  if (nodeId in state.scenes) {
    const bid = sboxIdFromScene(nodeId as SceneNodeId);
    if (!(bid in state.sceneBoxes)) return [nodeId];
    const ch = buildChildrenByParent(state);
    const desc = collectDescendantNodeIds(bid, ch);
    const inner = desc.filter(
      (id) =>
        id !== nodeId &&
        (id in state.actions || id in state.media || id in state.satellites)
    );
    return [...topoDeleteOrder(inner, state.layout), nodeId];
  }

  if (nodeId in state.actions) {
    const act = state.actions[nodeId as ActionNodeId];
    if (act.actionType === "selector" && countSelectorChoices(state, nodeId) > 0) {
      const ch = buildChildrenByParent(state);
      const desc = collectDescendantNodeIds(nodeId, ch);
      const inner = desc.filter((id) => id in state.actions || id in state.media || id in state.satellites);
      return [...topoDeleteOrder(inner, state.layout), nodeId];
    }
    return [nodeId];
  }

  if (nodeId in state.media) return [nodeId];

  return [];
}

/** Fusionne plusieurs suppressions (déduplication, scènes en dernier) à partir d’un snapshot projet. */
export function flattenDeleteChains(initial: NodalProject, rootIds: AnyNodeId[]): AnyNodeId[] {
  const unique = [...new Set(rootIds.map((id) => normalizeDeletionTarget(initial, id)).filter((x): x is AnyNodeId => x != null))];
  const seen = new Set<AnyNodeId>();
  const ordered: AnyNodeId[] = [];
  const nonScenes = unique.filter((id) => !(id in initial.scenes));
  const scenes = unique.filter((id) => id in initial.scenes);
  for (const id of nonScenes) {
    for (const step of orderedDeleteChainForStoreNode(initial, id)) {
      if (seen.has(step)) continue;
      seen.add(step);
      ordered.push(step);
    }
  }
  for (const id of scenes) {
    for (const step of orderedDeleteChainForStoreNode(initial, id)) {
      if (seen.has(step)) continue;
      seen.add(step);
      ordered.push(step);
    }
  }
  return ordered;
}
