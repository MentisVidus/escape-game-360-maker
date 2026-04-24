import { createStore, type StoreApi } from "zustand/vanilla";

import type { Edge } from "../model/edges";
import type {
  ActionNodeId,
  AnyNodeId,
  EdgeId,
  MediaNodeId,
  SatelliteNodeId,
  SceneNodeId,
} from "../model/ids";
import type { NodeLayout, Viewport } from "../model/layout";
import type { ActionNode, MediaNode, SatelliteNode, SceneNode } from "../model/nodes";
import type { ObjectEntry } from "../model/objects";
import type { NodalProject } from "../model/project";
import { reconcileAutoSatellites } from "./reconcileAutoSatellites";

type NodePatch = Partial<ActionNode | SceneNode | SatelliteNode | MediaNode>;

export type NodalProjectStore = NodalProject & {
  addScene: (node: SceneNode, layout?: Partial<NodeLayout>) => void;
  addAction: (node: ActionNode, layout?: Partial<NodeLayout>) => void;
  addMedia: (node: MediaNode, layout?: Partial<NodeLayout>) => void;
  removeNode: (nodeId: AnyNodeId) => void;
  connect: (edge: Edge) => void;
  disconnect: (edgeId: EdgeId) => void;
  attachChild: (parentId: AnyNodeId, childId: AnyNodeId) => void;
  detachChild: (childId: AnyNodeId) => void;
  updateNodeData: (nodeId: AnyNodeId, patch: NodePatch) => void;
  updateNodeLayout: (nodeId: AnyNodeId, patch: Partial<NodeLayout>) => void;
  setStartScene: (sceneId: SceneNodeId) => void;
  setViewport: (viewport: Viewport) => void;
  upsertObject: (entry: ObjectEntry) => void;
  removeObject: (objectId: string) => void;
};

const defaultLayout = (override?: Partial<NodeLayout>): NodeLayout => ({
  x: override?.x ?? 0,
  y: override?.y ?? 0,
  parentId: override?.parentId ?? null,
  collapsed: override?.collapsed ?? false,
});

const isReqOrPwd = (node: ActionNode): node is Extract<ActionNode, { actionType: "req" | "pwd" }> =>
  node.actionType === "req" || node.actionType === "pwd";

const createEmptyProject = (): NodalProject => ({
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

const hasIncomingMeta = (state: NodalProjectStore, nodeId: SatelliteNodeId): boolean =>
  state.edges.some((edge) => edge.family === "meta" && edge.targetId === nodeId);

const removeRelatedEdges = (state: NodalProjectStore, nodeId: AnyNodeId): void => {
  state.edges = state.edges.filter((edge) => edge.sourceId !== nodeId && edge.targetId !== nodeId);
};

const pruneOrphanSatellites = (state: NodalProjectStore): void => {
  let changed = true;
  while (changed) {
    changed = false;
    for (const satelliteId of Object.keys(state.satellites) as SatelliteNodeId[]) {
      if (hasIncomingMeta(state, satelliteId)) {
        continue;
      }
      delete state.satellites[satelliteId];
      delete state.layout[satelliteId];
      removeRelatedEdges(state, satelliteId);
      changed = true;
    }
  }
};

const removeNodeFromIndexes = (state: NodalProjectStore, nodeId: AnyNodeId): void => {
  if (nodeId in state.actions) delete state.actions[nodeId as ActionNodeId];
  if (nodeId in state.scenes) delete state.scenes[nodeId as SceneNodeId];
  if (nodeId in state.satellites) delete state.satellites[nodeId as SatelliteNodeId];
  if (nodeId in state.media) delete state.media[nodeId as MediaNodeId];
  delete state.layout[nodeId];
  state.meta.draftActionIds = state.meta.draftActionIds.filter((id) => id !== nodeId);
};

const defaultObjectEntry = (objectId: string): ObjectEntry => ({
  objectId,
  displayName: "",
  iconMediaId: null,
  iconUrl: "",
});

export const createNodalProjectStore = (): StoreApi<NodalProjectStore> =>
  createStore<NodalProjectStore>((set, get) => ({
    ...createEmptyProject(),

    addScene: (node, layout) => {
      const state = get();
      set({
        ...state,
        scenes: { ...state.scenes, [node.id]: node },
        layout: { ...state.layout, [node.id]: defaultLayout(layout) },
      });
    },

    addAction: (node, layout) => {
      const state = get();
      set({
        ...state,
        actions: { ...state.actions, [node.id]: node },
        layout: { ...state.layout, [node.id]: defaultLayout(layout) },
      });
    },

    addMedia: (node, layout) => {
      const state = get();
      set({
        ...state,
        media: { ...state.media, [node.id]: node },
        layout: { ...state.layout, [node.id]: defaultLayout(layout) },
      });
    },

    removeNode: (nodeId) => {
      const state = get();
      const next: NodalProjectStore = {
        ...state,
        meta: {
          ...state.meta,
          objects: { ...state.meta.objects },
          draftActionIds: [...state.meta.draftActionIds],
        },
        actions: { ...state.actions },
        scenes: { ...state.scenes },
        satellites: { ...state.satellites },
        media: { ...state.media },
        edges: [...state.edges],
        layout: { ...state.layout },
      };
      removeNodeFromIndexes(next, nodeId);
      removeRelatedEdges(next, nodeId);
      for (const action of Object.values(next.actions)) {
        if (isReqOrPwd(action) && action.rewardActionId === nodeId) action.rewardActionId = null;
      }
      for (const layout of Object.values(next.layout)) {
        if (layout.parentId === nodeId) layout.parentId = null;
      }
      pruneOrphanSatellites(next);
      reconcileAutoSatellites(next);
      set(next);
    },

    connect: (edge) => {
      set((state) => {
        if (state.edges.some((existing) => existing.id === edge.id)) return state;
        const next = { ...state, edges: [...state.edges, edge] };
        reconcileAutoSatellites(next);
        return next;
      });
    },

    disconnect: (edgeId) => {
      set((state) => {
        const next = { ...state, edges: state.edges.filter((edge) => edge.id !== edgeId) };
        reconcileAutoSatellites(next);
        return next;
      });
    },

    attachChild: (parentId, childId) => {
      const state = get();
      const childLayout = state.layout[childId];
      if (!childLayout) return;
      const nextLayout = { ...state.layout, [childId]: { ...childLayout, parentId } };
      const parent = state.actions[parentId as ActionNodeId];
      if (parent && isReqOrPwd(parent) && childId in state.actions) {
        const next = {
          ...state,
          layout: nextLayout,
          actions: {
            ...state.actions,
            [parent.id]: { ...parent, rewardActionId: childId as ActionNodeId },
          },
        };
        reconcileAutoSatellites(next);
        set(next);
        return;
      }
      const next = { ...state, layout: nextLayout };
      reconcileAutoSatellites(next);
      set(next);
    },

    detachChild: (childId) => {
      const state = get();
      const childLayout = state.layout[childId];
      if (!childLayout) return;
      const parentId = childLayout.parentId;
      const nextLayout = { ...state.layout, [childId]: { ...childLayout, parentId: null } };
      if (!parentId) {
        const next = { ...state, layout: nextLayout };
        reconcileAutoSatellites(next);
        set(next);
        return;
      }
      const parent = state.actions[parentId as ActionNodeId];
      if (parent && isReqOrPwd(parent) && parent.rewardActionId === childId) {
        const next = {
          ...state,
          layout: nextLayout,
          actions: { ...state.actions, [parent.id]: { ...parent, rewardActionId: null } },
        };
        reconcileAutoSatellites(next);
        set(next);
        return;
      }
      const next = { ...state, layout: nextLayout };
      reconcileAutoSatellites(next);
      set(next);
    },

    updateNodeData: (nodeId, patch) => {
      set((state) => {
        if (nodeId in state.actions) {
          const next = {
            ...state,
            actions: {
              ...state.actions,
              [nodeId]: { ...state.actions[nodeId as ActionNodeId], ...(patch as Partial<ActionNode>) } as ActionNode,
            },
          };
          reconcileAutoSatellites(next);
          return next;
        }
        if (nodeId in state.scenes) {
          return {
            ...state,
            scenes: {
              ...state.scenes,
              [nodeId]: { ...state.scenes[nodeId as SceneNodeId], ...(patch as Partial<SceneNode>) },
            },
          };
        }
        if (nodeId in state.satellites) {
          const next = {
            ...state,
            satellites: {
              ...state.satellites,
              [nodeId]: {
                ...state.satellites[nodeId as SatelliteNodeId],
                ...(patch as Partial<SatelliteNode>),
              } as SatelliteNode,
            },
          };
          reconcileAutoSatellites(next);
          return next;
        }
        if (nodeId in state.media) {
          return {
            ...state,
            media: {
              ...state.media,
              [nodeId]: { ...state.media[nodeId as MediaNodeId], ...(patch as Partial<MediaNode>) } as MediaNode,
            },
          };
        }
        return state;
      });
    },

    updateNodeLayout: (nodeId, patch) => {
      const state = get();
      const current = state.layout[nodeId];
      if (!current) return;
      set({
        ...state,
        layout: {
          ...state.layout,
          [nodeId]: { ...current, ...patch },
        },
      });
    },

    setStartScene: (sceneId) => {
      const state = get();
      set({ ...state, meta: { ...state.meta, startSceneId: sceneId } });
    },

    setViewport: (viewport) => {
      const state = get();
      set({ ...state, meta: { ...state.meta, viewport } });
    },

    upsertObject: (entry) => {
      set((state) => {
        const prev = state.meta.objects[entry.objectId];
        const merged: ObjectEntry = {
          ...defaultObjectEntry(entry.objectId),
          ...prev,
          ...entry,
          objectId: entry.objectId,
        };
        const next = {
          ...state,
          meta: { ...state.meta, objects: { ...state.meta.objects, [entry.objectId]: merged } },
        };
        reconcileAutoSatellites(next);
        return next;
      });
    },

    removeObject: (objectId) => {
      set((state) => {
        const next: NodalProjectStore = {
          ...state,
          meta: { ...state.meta, objects: { ...state.meta.objects } },
          satellites: { ...state.satellites },
        };
        delete next.meta.objects[objectId];
        for (const sid of Object.keys(next.satellites) as SatelliteNodeId[]) {
          const s = next.satellites[sid];
          if (s?.satelliteType === "object" && s.data.objectId === objectId) {
            next.satellites[sid] = { ...s, data: { objectId: "" } };
          }
        }
        reconcileAutoSatellites(next);
        return next;
      });
    },
  }));

export const getStoreState = (store: StoreApi<NodalProjectStore>): NodalProjectStore => store.getState();
