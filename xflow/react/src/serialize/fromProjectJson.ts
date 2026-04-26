import { asActionNodeId, asEdgeId, asSceneNodeId, type ActionNodeId, type SceneNodeId } from "../model/ids";
import type { ActionNode, CopyPayload } from "../model/nodes";
import type { NodalProject } from "../model/project";
import type { ProjectJsonV2, ProjectJsonV2Action } from "./toProjectJson";

const defaultCopy = (): CopyPayload => ({ bodyHtml: "", buttonLabel: "" });

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

const deserializeAction = (
  state: NodalProject,
  raw: ProjectJsonV2Action,
  makeActionId: () => ActionNodeId
): ActionNodeId => {
  const actionType = fromV2Type(raw.type);
  const actionId = makeActionId();
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
    const rewardActionId = rewardRaw ? deserializeAction(state, rewardRaw, makeActionId) : null;
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
    for (const choice of choices) {
      if (!choice.action) continue;
      const childActionId = deserializeAction(state, choice.action, makeActionId);
      state.edges.push({
        id: asEdgeId(`edge-flow-${actionId}-${childActionId}`),
        family: "flow",
        sourceId: actionId,
        targetId: childActionId,
      });
    }
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

  let sceneCounter = 0;
  let actionCounter = 0;
  const makeSceneId = () => asSceneNodeId(`scn-${++sceneCounter}`);
  const makeActionId = () => asActionNodeId(`act-${++actionCounter}`);

  for (const scene of json.scenes) {
    const sceneId = makeSceneId();
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

    for (const hotspot of scene.hotspots) {
      const actionId = deserializeAction(state, hotspot.action, makeActionId);
      state.edges.push({
        id: asEdgeId(`edge-scene-${sceneId}-${actionId}`),
        family: "flow",
        sourceId: sceneId,
        targetId: actionId,
      });
    }
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
    const targetSceneId = sceneIdByExternal.get(ext);
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

