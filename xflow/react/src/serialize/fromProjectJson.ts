import { asActionNodeId, asEdgeId, asSceneNodeId, type ActionNodeId, type SceneNodeId } from "../model/ids";
import type { ActionNode, CopyPayload } from "../model/nodes";
import type { NodalProject } from "../model/project";
import type { ProjectJsonV2, ProjectJsonV2Action } from "./toProjectJson";

const defaultCopy = (): CopyPayload => ({ bodyHtml: "", buttonLabel: "" });

/** Slug pour id interne stable (même graphe V2 → mêmes clés map-layout après réimport). */
function slugForStableId(raw: string): string {
  const s = raw.replace(/[^a-zA-Z0-9]+/g, "_").replace(/^_+|_+$/g, "");
  return s.length > 0 ? s : "x";
}

/** Id scène interne dérivé de `scene.id` métier (JSON V2). À utiliser aussi à la création (palette, démos). */
export function stableSceneNodeIdFromExternal(externalSceneId: string): SceneNodeId {
  return asSceneNodeId(`scn__${slugForStableId(externalSceneId)}`);
}

/**
 * Id action interne dérivé du chemin d’export (même convention que `forEachActionInExportWalkOrder` : `ext:h:i`, `:r`, `:c:j`).
 * Les `:` et autres caractères non alphanumériques sont normalisés en `_`.
 */
export function stableActionNodeIdFromPathKey(pathKey: string): ActionNodeId {
  return asActionNodeId(`act__${slugForStableId(pathKey)}`);
}

const emptyProject = (): NodalProject => ({
  meta: {
    title: "Untitled",
    startSceneId: null,
    viewport: { x: 0, y: 0, zoom: 1 },
    draftActionIds: [],
    objects: {},
  },
  actions: {},
  scenes: {},
  satellites: {},
  media: {},
  edges: [],
  layout: {},
});

const fromV2Type = (value: string): ActionNode["actionType"] => {
  switch (value) {
    case "msg":
    case "pick":
    case "goto":
    case "selector":
    case "req":
    case "pwd":
      return value;
    default:
      return "msg";
  }
};

const deserializeAction = (state: NodalProject, raw: ProjectJsonV2Action, pathKey: string): ActionNodeId => {
  const actionType = fromV2Type(raw.type);
  const actionId = stableActionNodeIdFromPathKey(pathKey);
  const base = {
    id: actionId,
    nodeType: "action" as const,
    actionType,
    label: actionType.toUpperCase(),
    sfx: { ...raw.sfx },
    visibility: { ...raw.visibility },
  };

  if (actionType === "req" || actionType === "pwd") {
    const payload = (raw.payload ?? {}) as Record<string, unknown>;
    const rewardRaw = payload.rewardAction as ProjectJsonV2Action | undefined;
    const rewardActionId = rewardRaw ? deserializeAction(state, rewardRaw, `${pathKey}:r`) : null;
    if (actionType === "req") {
      state.actions[actionId] = {
        ...base,
        actionType,
        payload: {
          itemId: String(payload.itemId ?? ""),
          copy: (payload.copy as CopyPayload) ?? defaultCopy(),
        },
        rewardActionId,
      };
    } else {
      state.actions[actionId] = {
        ...base,
        actionType,
        payload: {
          answer: String(payload.answer ?? ""),
          copy: (payload.copy as CopyPayload) ?? defaultCopy(),
        },
        rewardActionId,
      };
    }
    return actionId;
  }

  if (actionType === "selector") {
    const payload = (raw.payload ?? {}) as Record<string, unknown>;
    const nested = (payload.nested ?? {}) as Record<string, unknown>;
    const choices = Array.isArray(nested.choices)
      ? (nested.choices as Array<{ action?: ProjectJsonV2Action }>)
      : [];
    state.actions[actionId] = {
      ...base,
      actionType,
      payload: {
        nested: {
          title: String(nested.title ?? ""),
          copy: (nested.copy as CopyPayload) ?? defaultCopy(),
          displayMode: nested.displayMode === "dropdown" ? "dropdown" : "buttons",
        },
      },
    };
    // C3 : pas d’edge `flow` selector→choix — filiation via `layout.parentId` (+ positions dans map-layout).
    choices.forEach((choice, ci) => {
      if (!choice.action) return;
      deserializeAction(state, choice.action, `${pathKey}:c:${ci}`);
    });
    return actionId;
  }

  const payload = (raw.payload ?? {}) as Record<string, unknown>;
  if (actionType === "pick") {
    state.actions[actionId] = {
      ...base,
      actionType,
      payload: {
        itemId: String(payload.itemId ?? ""),
        itemName: String(payload.itemName ?? ""),
        copy: (payload.copy as CopyPayload) ?? defaultCopy(),
      },
    };
    return actionId;
  }
  if (actionType === "goto") {
    state.actions[actionId] = {
      ...base,
      actionType,
      payload: {
        target: String(payload.target ?? ""),
        copy: (payload.copy as CopyPayload) ?? defaultCopy(),
      },
    };
    return actionId;
  }
  state.actions[actionId] = {
    ...base,
    actionType: "msg",
    payload: {
      copy: (payload.copy as CopyPayload) ?? defaultCopy(),
    },
  };
  return actionId;
};

export const deserializeFromProjectJson = (json: ProjectJsonV2): NodalProject => {
  const state = emptyProject();
  state.meta.title = json.title;

  for (const scene of json.scenes) {
    const sceneId = stableSceneNodeIdFromExternal(scene.id);
    state.scenes[sceneId] = {
      id: sceneId,
      nodeType: "scene",
      sceneId: scene.id,
      label: scene.title,
      panoramaUrl: scene.panoramaUrl,
    };
    if (json.startSceneId && json.startSceneId === scene.id) {
      state.meta.startSceneId = sceneId;
    }

    scene.hotspots.forEach((hotspot, hi) => {
      const pathKey = `${scene.id}:h:${hi}`;
      const actionId = deserializeAction(state, hotspot.action, pathKey);
      state.edges.push({
        id: asEdgeId(`edge-scene-${sceneId}-${actionId}`),
        family: "flow",
        sourceId: sceneId,
        targetId: actionId,
      });
    });
  }
  wireGotoTransitions(state);
  return state;
};

/** Arêtes `transition` goto → scène cible (non portées par le JSON V2 seul). */
function wireGotoTransitions(state: NodalProject): void {
  const sceneIdByExternal = new Map<string, SceneNodeId>();
  for (const s of Object.values(state.scenes)) {
    sceneIdByExternal.set(s.sceneId, s.id);
  }
  for (const action of Object.values(state.actions)) {
    if (action.actionType !== "goto") continue;
    const ext = String((action.payload as { target?: string }).target ?? "").trim();
    if (!ext) continue;
    let targetSceneId = sceneIdByExternal.get(ext);
    // Legacy : `target` pouvait contenir l’id interne `scn__…` au lieu de l’id métier V2.
    if (!targetSceneId) {
      for (const s of Object.values(state.scenes)) {
        if (String(s.id) === ext) {
          targetSceneId = s.id;
          break;
        }
      }
    }
    if (!targetSceneId) continue;
    const dup = state.edges.some(
      (e) => e.family === "transition" && e.sourceId === action.id && e.targetId === targetSceneId
    );
    if (dup) continue;
    state.edges.push({
      id: asEdgeId(`edge-goto-${action.id}-${targetSceneId}`),
      family: "transition",
      sourceId: action.id,
      targetId: targetSceneId,
    });
  }
}

