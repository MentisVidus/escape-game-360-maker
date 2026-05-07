import { createStore, type StoreApi } from "zustand/vanilla";

import type { Edge } from "../model/edges";
import type {
  ActionNodeId,
  AnyNodeId,
  EdgeId,
  MediaNodeId,
  SatelliteNodeId,
  SceneBoxNodeId,
  SceneNodeId,
} from "../model/ids";
import type { NodeLayout, Viewport } from "../model/layout";
import type { ActionNode, MediaNode, SatelliteNode, SceneNode } from "../model/nodes";
import type { ObjectEntry } from "../model/objects";
import type {
  AudioGlobalSettings,
  InventoryGlobalSettings,
  NodalProject,
  PopupThemeSettings,
} from "../model/project";
import { applyHydratedLayout, type MapLayoutJson } from "../serialize/mapLayoutJson";
import { applyMetaMediaLinks, applyNodalAutoSatelliteData } from "../serialize/nodalMapExtras";
import { deserializeFromProjectJson } from "../serialize/fromProjectJson";
import { migrateMediaParenting } from "../serialize/migrateMediaParenting";
import type { ProjectJsonV2 } from "../serialize/toProjectJson";
import {
  DEFAULT_PLAYER_POPUP_THEME,
  readPlayerPopupFieldsFromDom,
  type PlayerPopupTheme,
} from "../view/popups/playerPopupDomRead";
import {
  absoluteFlowPositionInPane,
  computeContainerBounds,
  reanchorSBox as reanchorSBoxLayout,
} from "../view/nesting/containerBounds";
import type { SBoxDisplacement } from "../view/nesting/sboxCollision";
import { resolveSBoxOverlapsAfterUnfold, rewindSBoxOverlapPushes } from "../view/nesting/sboxCollision";
import { attachMediaToMetaSource, detachMediaFromMetaSource } from "./mediaMetaLayout";
import { reconcileSceneBoxes, sboxIdFromScene } from "./reconcileSceneBoxes";
import { buildClipboard, getNodalClipboard, pasteClipboard, setNodalClipboard } from "./clipboard";
import type { InsertNodeAtAbsoluteOpts, PaletteInsertSpec } from "./insertNodeAtAbsolute";
import { insertNodeAtAbsolute as mergeInsertNodeAtAbsolute } from "./insertNodeAtAbsolute";
import { computeWarnings, type Warning } from "./computeWarnings";
import { reconcileAutoSatellites } from "./reconcileAutoSatellites";

type NodePatch = Partial<ActionNode | SceneNode | SatelliteNode | MediaNode>;

export type NodalProjectStore = NodalProject & {
  /** Phase 2 (1.b.6) : trace des poussées anti-collision au dépli, par s-box origine — non persisté. */
  sceneBoxOverlapMemory: Map<SceneBoxNodeId, SBoxDisplacement[]>;
  /** C10.2.c — thème des popups joueur sous `meta.settings.popupTheme`. */
  setMetaSettingsPopupTheme: (patch: Partial<PopupThemeSettings>) => void;
  /** C10.2.c — réaligne `meta.settings.popupTheme` depuis le formulaire vanilla. */
  syncMetaSettingsPopupThemeFromDom: () => void;
  warnings: Warning[];
  addScene: (node: SceneNode, layout?: Partial<NodeLayout>) => void;
  addAction: (node: ActionNode, layout?: Partial<NodeLayout>) => void;
  addMedia: (node: MediaNode, layout?: Partial<NodeLayout>) => void;
  removeNode: (nodeId: AnyNodeId) => void;
  connect: (edge: Edge) => void;
  disconnect: (edgeId: EdgeId) => void;
  /**
   * Attache un enfant action au parent (selector / req / pwd).
   * Passer `childRelativeLayout` pour appliquer `x`/`y` **dans le même commit** que `parentId`
   * (évite un reconcile avec d’anciennes coords abs encore dans le store → bounds selector explosent).
   */
  attachChild: (
    parentId: AnyNodeId,
    childId: AnyNodeId,
    childRelativeLayout?: { x: number; y: number }
  ) => void;
  detachChild: (childId: AnyNodeId, absolutePosition?: { x: number; y: number }) => void;
  updateNodeData: (nodeId: AnyNodeId, patch: NodePatch) => void;
  updateNodeLayout: (nodeId: AnyNodeId, patch: Partial<NodeLayout>) => void;
  /** Bascule `layout[nodeId].collapsed` (C8.1 — pliage des selectors). */
  toggleNodeCollapsed: (nodeId: AnyNodeId) => void;
  setStartScene: (sceneId: SceneNodeId) => void;
  /** C10.2.a — titre projet (`meta.title` + flush DOM via `applyFromStore`). */
  setMetaTitle: (title: string) => void;
  /** C10.2.b — paramètres inventaire global (`meta.settings.inventoryGlobal`). */
  setMetaSettingsInventory: (patch: Partial<InventoryGlobalSettings>) => void;
  /** C10.2.d — audio global (`meta.settings.audio`). */
  setMetaSettingsAudio: (patch: Partial<AudioGlobalSettings>) => void;
  setViewport: (viewport: Viewport) => void;
  upsertObject: (entry: ObjectEntry) => void;
  removeObject: (objectId: string) => void;
  /** Remplace tout le projet (ZIP / brouillon) : même schéma que `removeNode` — copie + reconcile + withWarnings. */
  hydrateFromProject: (projectJson: ProjectJsonV2, layoutJson: MapLayoutJson) => void;
  /** C8.1.b.2.x — re-ancrage du conteneur s-box (coords directes ≥ pad). */
  reanchorSBox: (sboxId: SceneBoxNodeId) => void;
  /** C8.5.2 — presse-papiers runtime (sous-graphe). */
  copyNodesToClipboard: (nodeIds: AnyNodeId[]) => void;
  /** C8.5.2 — collage en coordonnées flow ; ids des nœuds créés. */
  pasteClipboardAt: (pasteAbs: { x: number; y: number }) => AnyNodeId[];
  /** C9.1 — création top-level orphelin à une position flow absolue (palette drag / clic centre). */
  insertNodeAtAbsolute: (
    spec: PaletteInsertSpec,
    position: { x: number; y: number },
    opts?: InsertNodeAtAbsoluteOpts
  ) => AnyNodeId[];
};

export type NodalProjectStoreApi = StoreApi<NodalProjectStore>;

const defaultLayout = (override?: Partial<NodeLayout>): NodeLayout => {
  const base: NodeLayout = {
    x: override?.x ?? 0,
    y: override?.y ?? 0,
    parentId: override?.parentId ?? null,
    collapsed: override?.collapsed ?? false,
  };
  if (override?.width != null && override?.height != null) {
    return { ...base, width: override.width, height: override.height };
  }
  return base;
};

const isReqOrPwd = (node: ActionNode): node is Extract<ActionNode, { actionType: "req" | "pwd" }> =>
  node.actionType === "req" || node.actionType === "pwd";

const isSelectorAction = (state: NodalProject, id: AnyNodeId): boolean => {
  const a = state.actions[id as ActionNodeId];
  return !!a && a.actionType === "selector";
};

/** C8.6.2 — enfant agrandi le contenu : passer en taille auto si la boîte calculée dépasse le format manuel. */
function growSelectorIfContentOverflows(next: NodalProjectStore, selectorId: ActionNodeId): void {
  const act = next.actions[selectorId];
  const lo = next.layout[selectorId];
  if (!act || act.actionType !== "selector" || !lo || lo.collapsed) return;
  if (lo.width == null || lo.height == null) return;
  const bounds = computeContainerBounds(next, selectorId);
  if (bounds.width > lo.width || bounds.height > lo.height) {
    const { width: _w, height: _h, ...rest } = lo;
    next.layout[selectorId] = { ...rest };
  }
}

/** C8.6.2 — après détachement : si la boîte manuelle est trop grande vs contenu, repasser en auto. */
function shrinkSelectorIfLooseAfterDetach(next: NodalProjectStore, selectorId: ActionNodeId): void {
  const act = next.actions[selectorId];
  const lo = next.layout[selectorId];
  if (!act || act.actionType !== "selector" || !lo || lo.collapsed) return;
  if (lo.width == null || lo.height == null) return;
  const bounds = computeContainerBounds(next, selectorId);
  if (lo.width > bounds.width || lo.height > bounds.height) {
    const { width: _w, height: _h, ...rest } = lo;
    next.layout[selectorId] = { ...rest };
  }
}

function projectDataFromStore(state: NodalProjectStore): NodalProject {
  return {
    meta: state.meta,
    scenes: state.scenes,
    sceneBoxes: state.sceneBoxes,
    actions: state.actions,
    satellites: state.satellites,
    media: state.media,
    edges: state.edges,
    layout: state.layout,
  };
}

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
  sceneBoxes: {},
  satellites: {},
  media: {},
  edges: [],
  layout: {},
});

const withWarnings = <T extends NodalProject>(state: T): T & { warnings: Warning[] } => ({
  ...state,
  warnings: computeWarnings(state),
});

const clamp01 = (value: unknown, fallback: number): number => {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(0, Math.min(1, n));
};

const normalizePlayerPopupTheme = (theme?: Partial<PlayerPopupTheme> | null): PlayerPopupTheme => ({
  ...DEFAULT_PLAYER_POPUP_THEME,
  ...(theme || {}),
  useCustom: !!theme?.useCustom,
  bgAlpha: clamp01(theme?.bgAlpha, DEFAULT_PLAYER_POPUP_THEME.bgAlpha),
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
  if (nodeId in state.sceneBoxes) delete state.sceneBoxes[nodeId as SceneBoxNodeId];
  if (nodeId in state.satellites) delete state.satellites[nodeId as SatelliteNodeId];
  if (nodeId in state.media) delete state.media[nodeId as MediaNodeId];
  delete state.layout[nodeId];
  state.meta.draftActionIds = state.meta.draftActionIds.filter((id) => id !== nodeId);
};

/** C8.3 — R3 + R2 : après suppression de scène(s), réaligne `meta.startSceneId`. */
function reconcileStartSceneAfterScenesChange(state: NodalProjectStore): void {
  const sceneIds = Object.keys(state.scenes) as SceneNodeId[];
  if (sceneIds.length === 0) {
    state.meta = { ...state.meta, startSceneId: null };
    return;
  }
  if (sceneIds.length === 1) {
    state.meta = { ...state.meta, startSceneId: sceneIds[0] };
    return;
  }
  if (!state.meta.startSceneId || !(state.meta.startSceneId in state.scenes)) {
    state.meta = { ...state.meta, startSceneId: null };
  }
}

const defaultObjectEntry = (objectId: string): ObjectEntry => ({
  objectId,
  displayName: "",
  iconMediaId: null,
  iconUrl: "",
});

const hasIncomingFlowFromScene = (state: NodalProjectStore, actionId: ActionNodeId): boolean =>
  state.edges.some((edge) => edge.family === "flow" && edge.targetId === actionId && edge.sourceId in state.scenes);

/** `project.json` ne porte que `goto.payload.target` : à chaque transition UI, aligner le payload sur `scene.sceneId`. */
function syncGotoTargetFromTransitionEdge(state: NodalProjectStore, edge: Edge): void {
  if (edge.family !== "transition") return;
  if (!(edge.sourceId in state.actions) || !(edge.targetId in state.scenes)) return;
  const action = state.actions[edge.sourceId as ActionNodeId];
  const scene = state.scenes[edge.targetId as SceneNodeId];
  if (!action || action.actionType !== "goto" || !scene) return;
  state.actions[action.id] = {
    ...action,
    payload: { ...action.payload, target: scene.sceneId },
  } as ActionNode;
}

function clearGotoTargetIfNoTransition(state: NodalProjectStore, removed: Edge): void {
  if (removed.family !== "transition") return;
  if (!(removed.sourceId in state.actions)) return;
  const action = state.actions[removed.sourceId as ActionNodeId];
  if (!action || action.actionType !== "goto") return;
  const stillHas = state.edges.some((e) => e.family === "transition" && e.sourceId === action.id);
  if (stillHas) return;
  state.actions[action.id] = {
    ...action,
    payload: { ...action.payload, target: "" },
  } as ActionNode;
}

/** Refuse d'attacher child sous parent si parent est déjà un descendant de child (évite cycle parentId). */
function wouldCreateCycle(
  layout: Record<string, { parentId?: AnyNodeId | null }>,
  parentId: string,
  childId: string
): boolean {
  let current: string | null | undefined = parentId;
  const seen = new Set<string>();
  while (current) {
    if (seen.has(current)) return true;
    if (current === childId) return true;
    seen.add(current);
    const parentNext: AnyNodeId | null | undefined = layout[current]?.parentId;
    current = parentNext ?? undefined;
  }
  return false;
}

export const createNodalProjectStore = (): StoreApi<NodalProjectStore> =>
  {
    let autoIdSeq = 0;
    const nextAutoId = (prefix: string) => `${prefix}-${++autoIdSeq}`;

    return createStore<NodalProjectStore>((set, get) => ({
      ...createEmptyProject(),
      sceneBoxOverlapMemory: new Map(),
      warnings: [],

      setMetaSettingsPopupTheme: (patch) => {
      set((state) =>
        withWarnings({
          ...state,
          meta: {
            ...state.meta,
            settings: {
              ...(state.meta.settings || {}),
              popupTheme: normalizePlayerPopupTheme({
                ...(state.meta.settings?.popupTheme || DEFAULT_PLAYER_POPUP_THEME),
                ...patch,
              }),
            },
          },
        })
      );
      },

      syncMetaSettingsPopupThemeFromDom: () => {
      set((state) =>
        withWarnings({
          ...state,
          meta: {
            ...state.meta,
            settings: {
              ...(state.meta.settings || {}),
              popupTheme: normalizePlayerPopupTheme(readPlayerPopupFieldsFromDom()),
            },
          },
        })
      );
      },

      addScene: (node, layout) => {
      set((state) => {
        const next: NodalProjectStore = {
          ...state,
          scenes: { ...state.scenes, [node.id]: node },
          layout: { ...state.layout, [node.id]: defaultLayout(layout) },
          sceneBoxes: { ...state.sceneBoxes },
        };
        reconcileSceneBoxes(next);
        reconcileAutoSatellites(next, nextAutoId);
        return withWarnings(next);
      });
    },

    addAction: (node, layout) => {
      set((state) => {
        const next: NodalProjectStore = {
          ...state,
          actions: { ...state.actions, [node.id]: node },
          layout: { ...state.layout, [node.id]: defaultLayout(layout) },
          sceneBoxes: { ...state.sceneBoxes },
        };
        reconcileSceneBoxes(next);
        reconcileAutoSatellites(next, nextAutoId);
        return withWarnings(next);
      });
    },

    addMedia: (node, layout) => {
      set((state) => {
        const next: NodalProjectStore = {
          ...state,
          media: { ...state.media, [node.id]: node },
          layout: { ...state.layout, [node.id]: defaultLayout(layout) },
          sceneBoxes: { ...state.sceneBoxes },
        };
        reconcileSceneBoxes(next);
        reconcileAutoSatellites(next, nextAutoId);
        return withWarnings(next);
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
        sceneBoxes: { ...state.sceneBoxes },
        satellites: { ...state.satellites },
        media: { ...state.media },
        edges: [...state.edges],
        layout: { ...state.layout },
      };
      if (nodeId in next.scenes) {
        const bid = sboxIdFromScene(nodeId as SceneNodeId);
        const bl = next.layout[bid];
        if (bl && next.sceneBoxes[bid]) {
          for (const [nid, lo] of Object.entries(next.layout)) {
            const id = nid as AnyNodeId;
            if (id === bid || id === nodeId || lo.parentId !== bid) continue;
            next.layout[id] = {
              ...lo,
              x: lo.x + bl.x,
              y: lo.y + bl.y,
              parentId: null,
            };
          }
          delete next.sceneBoxes[bid];
          delete next.layout[bid];
        }
      }
      for (const e of [...next.edges]) {
        if (e.family !== "meta" || !(e.targetId in next.media)) continue;
        if (e.sourceId === nodeId) {
          detachMediaFromMetaSource(next, e.sourceId, e.targetId as MediaNodeId);
        }
      }
      // Enfants directs : comme `detachChild` — coords absolues dans le graphe avant de retirer le parent du layout.
      const directOrphans = (Object.entries(next.layout) as Array<[AnyNodeId, (typeof next.layout)[AnyNodeId]]>).filter(
        ([, lo]) => lo.parentId === nodeId
      );
      for (const [childId, lo] of directOrphans) {
        if (!lo) continue;
        const abs = absoluteFlowPositionInPane(next, childId);
        next.layout[childId] = { ...lo, x: abs.x, y: abs.y, parentId: null };
      }
      removeNodeFromIndexes(next, nodeId);
      removeRelatedEdges(next, nodeId);
      for (const action of Object.values(next.actions)) {
        if (isReqOrPwd(action) && action.rewardActionId === nodeId) action.rewardActionId = null;
      }
      pruneOrphanSatellites(next);
      reconcileSceneBoxes(next);
      reconcileAutoSatellites(next, nextAutoId);
      reconcileStartSceneAfterScenesChange(next);
      set(withWarnings(next));
    },

    connect: (edge) => {
      set((state) => {
        if (state.edges.some((existing) => existing.id === edge.id)) return state;

        const next: NodalProjectStore = {
          ...state,
          edges: [...state.edges, edge],
          layout: { ...state.layout },
          sceneBoxes: { ...state.sceneBoxes },
        };

        reconcileSceneBoxes(next);

        if (
          edge.family === "flow" &&
          edge.sourceId in state.scenes &&
          edge.targetId in state.actions
        ) {
          const bid = sboxIdFromScene(edge.sourceId as SceneNodeId);
          const childLayout = next.layout[edge.targetId as AnyNodeId];
          const boxLayout = next.layout[bid];
          if (childLayout && boxLayout && childLayout.parentId == null) {
            if (wouldCreateCycle(next.layout, bid as string, edge.targetId as string)) {
              console.warn(
                `[connect] flow scène→action refusé : cycle parentId (${String(bid)} → ${String(edge.targetId)})`
              );
              return state;
            }
            next.layout[edge.targetId as AnyNodeId] = {
              ...childLayout,
              x: childLayout.x - boxLayout.x,
              y: childLayout.y - boxLayout.y,
              parentId: bid,
            };
            reanchorSBoxLayout(next, bid);
          }
        }

        syncGotoTargetFromTransitionEdge(next, edge);
        if (edge.family === "meta" && edge.targetId in next.media) {
          attachMediaToMetaSource(next, edge.sourceId as AnyNodeId, edge.targetId as MediaNodeId);
        }
        reconcileSceneBoxes(next);
        reconcileAutoSatellites(next, nextAutoId);
        return withWarnings(next);
      });
    },

    disconnect: (edgeId) => {
      set((state) => {
        const removed = state.edges.find((e) => e.id === edgeId);
        const next: NodalProjectStore = {
          ...state,
          edges: state.edges.filter((edge) => edge.id !== edgeId),
          layout: { ...state.layout },
          sceneBoxes: { ...state.sceneBoxes },
        };

        if (
          removed?.family === "flow" &&
          removed.sourceId in state.scenes &&
          removed.targetId in state.actions
        ) {
          const bid = sboxIdFromScene(removed.sourceId as SceneNodeId);
          const stillHasSceneFlow = next.edges.some(
            (e) => e.family === "flow" && e.targetId === removed.targetId && e.sourceId in next.scenes
          );
          const layout = next.layout[removed.targetId as AnyNodeId];
          const boxLayout = next.layout[bid];
          if (!stillHasSceneFlow && boxLayout && (layout?.parentId === bid || layout?.parentId === removed.sourceId)) {
            next.layout[removed.targetId as AnyNodeId] = {
              ...layout!,
              x: layout!.x + boxLayout.x,
              y: layout!.y + boxLayout.y,
              parentId: null,
            };
          }
          if (removed.sourceId in next.scenes) {
            reanchorSBoxLayout(next, bid);
          }
        }

        if (removed) clearGotoTargetIfNoTransition(next, removed);
        if (removed?.family === "meta" && removed.targetId in next.media) {
          detachMediaFromMetaSource(next, removed.sourceId as AnyNodeId, removed.targetId as MediaNodeId);
        }
        reconcileSceneBoxes(next);
        reconcileAutoSatellites(next, nextAutoId);
        return withWarnings(next);
      });
    },

    reanchorSBox: (sboxId) => {
      set((state) => {
        const next: NodalProjectStore = { ...state, layout: { ...state.layout }, sceneBoxes: { ...state.sceneBoxes } };
        reanchorSBoxLayout(next, sboxId);
        reconcileSceneBoxes(next);
        reconcileAutoSatellites(next, nextAutoId);
        return withWarnings(next);
      });
    },

    attachChild: (parentId, childId, childRelativeLayout) => {
      const state = get();
      if (parentId === childId) return;
      if (wouldCreateCycle(state.layout, parentId as string, childId as string)) {
        console.warn(
          `[attachChild] attachement refusé : créerait un cycle (${childId} → ... → ${parentId} → ${childId})`
        );
        return;
      }
      const childLayout = state.layout[childId];
      if (!childLayout) return;
      if (!(childId in state.actions)) return;
      const childActionId = childId as ActionNodeId;
      const mergedChildLayout = childRelativeLayout
        ? { ...childLayout, parentId, x: childRelativeLayout.x, y: childRelativeLayout.y }
        : { ...childLayout, parentId };
      const nextLayout = { ...state.layout, [childId]: mergedChildLayout };
      const parent = state.actions[parentId as ActionNodeId];
      if (parent && isReqOrPwd(parent) && childId in state.actions) {
        // C3b : uniquement des actions orphelines peuvent devenir récompense.
        if (hasIncomingFlowFromScene(state, childActionId)) return;
        const next: NodalProjectStore = {
          ...state,
          layout: nextLayout,
          sceneBoxes: { ...state.sceneBoxes },
          actions: {
            ...state.actions,
            [parent.id]: { ...parent, rewardActionId: childId as ActionNodeId },
          },
        };
        reconcileSceneBoxes(next);
        reconcileAutoSatellites(next, nextAutoId);
        set(withWarnings(next));
        return;
      }
      const next: NodalProjectStore = { ...state, layout: nextLayout, sceneBoxes: { ...state.sceneBoxes } };
      if (isSelectorAction(next, parentId)) {
        growSelectorIfContentOverflows(next, parentId as ActionNodeId);
      }
      reconcileSceneBoxes(next);
      reconcileAutoSatellites(next, nextAutoId);
      set(withWarnings(next));
    },

    detachChild: (childId, absolutePosition) => {
      const state = get();
      const childLayout = state.layout[childId];
      if (!childLayout) return;
      const parentId = childLayout.parentId;
      const nextLayout = {
        ...state.layout,
        [childId]: {
          ...childLayout,
          x: absolutePosition?.x ?? childLayout.x,
          y: absolutePosition?.y ?? childLayout.y,
          parentId: null,
        },
      };
      if (!parentId) {
        const next: NodalProjectStore = { ...state, layout: nextLayout, sceneBoxes: { ...state.sceneBoxes } };
        reconcileSceneBoxes(next);
        reconcileAutoSatellites(next, nextAutoId);
        set(withWarnings(next));
        return;
      }
      const parent = state.actions[parentId as ActionNodeId];
      if (parent && isReqOrPwd(parent) && parent.rewardActionId === childId) {
        const next: NodalProjectStore = {
          ...state,
          layout: nextLayout,
          sceneBoxes: { ...state.sceneBoxes },
          actions: { ...state.actions, [parent.id]: { ...parent, rewardActionId: null } },
        };
        reconcileSceneBoxes(next);
        reconcileAutoSatellites(next, nextAutoId);
        set(withWarnings(next));
        return;
      }
      const next: NodalProjectStore = { ...state, layout: nextLayout, sceneBoxes: { ...state.sceneBoxes } };
      if (isSelectorAction(next, parentId)) {
        shrinkSelectorIfLooseAfterDetach(next, parentId as ActionNodeId);
      }
      reconcileSceneBoxes(next);
      reconcileAutoSatellites(next, nextAutoId);
      set(withWarnings(next));
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
          reconcileAutoSatellites(next, nextAutoId);
          return withWarnings(next);
        }
        if (nodeId in state.scenes) {
          const next = {
            ...state,
            scenes: {
              ...state.scenes,
              [nodeId]: { ...state.scenes[nodeId as SceneNodeId], ...(patch as Partial<SceneNode>) },
            },
          };
          return withWarnings(next);
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
          reconcileAutoSatellites(next, nextAutoId);
          return withWarnings(next);
        }
        if (nodeId in state.media) {
          const next = {
            ...state,
            media: {
              ...state.media,
              [nodeId]: { ...state.media[nodeId as MediaNodeId], ...(patch as Partial<MediaNode>) } as MediaNode,
            },
          };
          return withWarnings(next);
        }
        return state;
      });
    },

    updateNodeLayout: (nodeId, patch) => {
      set((state) => {
        const current = state.layout[nodeId];
        if (!current) return state;
        const next: NodalProjectStore = {
          ...state,
          layout: { ...state.layout, [nodeId]: { ...current, ...patch } },
          sceneBoxes: { ...state.sceneBoxes },
        };
        reconcileSceneBoxes(next);
        reconcileAutoSatellites(next, nextAutoId);
        return withWarnings(next);
      });
    },

    toggleNodeCollapsed: (nodeId) => {
      set((state) => {
        const current = state.layout[nodeId];
        if (!current) return state;
        const wasCollapsed = !!current.collapsed;
        const nextCollapsed = !wasCollapsed;
        const next: NodalProjectStore = {
          ...state,
          layout: { ...state.layout, [nodeId]: { ...current, collapsed: nextCollapsed } },
          sceneBoxes: { ...state.sceneBoxes },
          sceneBoxOverlapMemory: new Map(state.sceneBoxOverlapMemory),
        };
        reconcileSceneBoxes(next);
        reconcileAutoSatellites(next, nextAutoId);

        if (nodeId in next.sceneBoxes) {
          const bid = nodeId as SceneBoxNodeId;
          if (wasCollapsed && !nextCollapsed) {
            const trace = resolveSBoxOverlapsAfterUnfold(next, bid);
            if (trace.length > 0) next.sceneBoxOverlapMemory.set(bid, trace);
          } else if (!wasCollapsed && nextCollapsed) {
            const trace = next.sceneBoxOverlapMemory.get(bid);
            if (trace?.length) rewindSBoxOverlapPushes(next, trace);
            next.sceneBoxOverlapMemory.delete(bid);
          }
        }

        return withWarnings(next);
      });
    },

    setStartScene: (sceneId) => {
      const state = get();
      if (!(sceneId in state.scenes)) return;
      const next = { ...state, meta: { ...state.meta, startSceneId: sceneId } };
      set(withWarnings(next));
    },

    setMetaTitle: (title) => {
      set((state) =>
        withWarnings({
          ...state,
          meta: { ...state.meta, title: title ?? "" },
        })
      );
    },

    setMetaSettingsInventory: (patch) => {
      set((state) => {
        const prev = state.meta.settings?.inventoryGlobal;
        const nextInventory: InventoryGlobalSettings = {
          enabled: prev?.enabled ?? true,
          position: prev?.position ?? "top-right",
          icon: prev?.icon ?? "🎒",
          panelBg: prev?.panelBg ?? "#000000",
          panelBgAlpha: prev?.panelBgAlpha ?? 0.8,
          textColor: prev?.textColor ?? "#ffffff",
          ...patch,
        };
        return withWarnings({
          ...state,
          meta: {
            ...state.meta,
            settings: {
              ...(state.meta.settings || {}),
              inventoryGlobal: nextInventory,
            },
          },
        });
      });
    },

    setMetaSettingsAudio: (patch) => {
      set((state) => {
        const prev = state.meta.settings?.audio;
        const nextAudio: AudioGlobalSettings = {
          enabled: prev?.enabled ?? false,
          url: prev?.url ?? "",
          volume: prev?.volume ?? 0.5,
          ...patch,
        };
        nextAudio.volume = clamp01(nextAudio.volume, 0.5);
        return withWarnings({
          ...state,
          meta: {
            ...state.meta,
            settings: {
              ...(state.meta.settings || {}),
              audio: nextAudio,
            },
          },
        });
      });
    },

    copyNodesToClipboard: (nodeIds) => {
      const state = get();
      const clip = buildClipboard(state, nodeIds);
      if (clip) setNodalClipboard(clip);
    },

    pasteClipboardAt: (pasteAbs) => {
      const clip = getNodalClipboard();
      if (!clip) return [];
      let newIds: AnyNodeId[] = [];
      set((state) => {
        const merged = pasteClipboard(projectDataFromStore(state), clip, pasteAbs, nextAutoId);
        newIds = merged.newIds;
        const next: NodalProjectStore = {
          ...merged.project,
          sceneBoxOverlapMemory: state.sceneBoxOverlapMemory,
        } as NodalProjectStore;
        for (const e of next.edges) {
          if (e.family === "transition") syncGotoTargetFromTransitionEdge(next, e);
        }
        reconcileSceneBoxes(next);
        reconcileAutoSatellites(next, nextAutoId);
        return withWarnings(next);
      });
      return newIds;
    },

    insertNodeAtAbsolute: (spec, position, opts) => {
      let newRootIds: AnyNodeId[] = [];
      set((state) => {
        const { next, newRootIds: ids } = mergeInsertNodeAtAbsolute(
          projectDataFromStore(state),
          spec,
          position,
          opts ?? { source: "palette" },
          nextAutoId
        );
        newRootIds = ids;
        return withWarnings({
          ...state,
          meta: next.meta,
          scenes: next.scenes,
          sceneBoxes: next.sceneBoxes,
          actions: next.actions,
          satellites: next.satellites,
          media: next.media,
          edges: next.edges,
          layout: next.layout,
        });
      });
      return newRootIds;
    },

    setViewport: (viewport) => {
      const state = get();
      set({ ...state, meta: { ...state.meta, viewport } });
    },

    upsertObject: (entry) => {
      set((state) => {
        if (typeof entry.objectId !== "string") return state;
        const normalizedObjectId = entry.objectId.trim();
        if (!normalizedObjectId) return state;

        const prev = state.meta.objects[normalizedObjectId];
        const merged: ObjectEntry = {
          ...defaultObjectEntry(normalizedObjectId),
          ...prev,
          ...entry,
          objectId: normalizedObjectId,
        };
        const next = {
          ...state,
          meta: { ...state.meta, objects: { ...state.meta.objects, [normalizedObjectId]: merged } },
        };
        reconcileAutoSatellites(next, nextAutoId);
        return withWarnings(next);
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
        reconcileAutoSatellites(next, nextAutoId);
        return withWarnings(next);
      });
    },

    hydrateFromProject: (projectJson, layoutJson) => {
      const state = get();
      const base = deserializeFromProjectJson(projectJson);
      applyHydratedLayout(base, layoutJson, projectJson);
      const next: NodalProjectStore = {
        ...state,
        meta: {
          ...base.meta,
          objects: { ...base.meta.objects },
          draftActionIds: [...base.meta.draftActionIds],
        },
        actions: { ...base.actions },
        scenes: { ...base.scenes },
        sceneBoxes: { ...base.sceneBoxes },
        satellites: { ...base.satellites },
        media: { ...base.media },
        edges: [...base.edges],
        layout: { ...base.layout },
        sceneBoxOverlapMemory: new Map(),
      };
      reconcileSceneBoxes(next);
      reconcileAutoSatellites(next, nextAutoId);
      applyNodalAutoSatelliteData(next, layoutJson.nodalAutoSatelliteData);
      applyMetaMediaLinks(next, layoutJson.nodalMetaMediaLinks);
      migrateMediaParenting(next);
      const popupThemeFromProject = next.meta.settings?.popupTheme;
      const popupTheme = normalizePlayerPopupTheme(
        popupThemeFromProject ?? layoutJson.nodalPlayerPopupTheme ?? readPlayerPopupFieldsFromDom()
      );
      const withPopupTheme: NodalProjectStore = {
        ...next,
        meta: {
          ...next.meta,
          settings: {
            ...(next.meta.settings || {}),
            popupTheme,
          },
        },
      };
      set(withWarnings(withPopupTheme));
    },
  }));
  };

export const getStoreState = (store: StoreApi<NodalProjectStore>): NodalProjectStore => store.getState();
