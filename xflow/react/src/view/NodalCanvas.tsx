import {
  Background,
  Controls,
  MiniMap,
  ReactFlow,
  ReactFlowProvider,
  useOnSelectionChange,
  useReactFlow,
  useNodesState,
  useEdgesState,
  useUpdateNodeInternals,
  type Connection,
  type Edge as RFEdge,
  type EdgeChange,
  type OnNodeDrag,
  type Node as RFNode,
  type NodeChange,
  type NodeTypes,
  type OnBeforeDelete,
  type OnConnect,
  type OnMove,
} from "@xyflow/react";
import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import type { StoreApi } from "zustand/vanilla";

import {
  asEdgeId,
  type ActionNodeId,
  type AnyNodeId,
  type EdgeId,
  type MediaNodeId,
  type SatelliteNodeId,
  type SceneBoxNodeId,
  type SceneNodeId,
} from "../model/ids";
import type {
  ActionNode,
  ChoiceOptionsSatelliteNode,
  CoordsOptionsSatelliteNode,
  GotoActionNode,
  MediaNode,
  MsgActionNode,
  PickActionNode,
  PwdActionNode,
  ReqActionNode,
  SelectorActionNode,
  ObjectSatelliteNode,
} from "../model/nodes";
import type { ObjectEntry } from "../model/objects";
import type { NodalProject } from "../model/project";
import type { NodalProjectStore } from "../store/nodalProjectStore";
import { isValidConnection } from "./connectionPolicy";
import {
  HANDLE_FLOW_IN,
  HANDLE_FLOW_OUT,
  HANDLE_GOTO_IN,
  HANDLE_GOTO_OUT,
  HANDLE_META_IN,
  HANDLE_META_OUT,
} from "./handles/handleIds";
import { ActionNodeView } from "./nodes/ActionNodeView";
import { MediaNodeView } from "./nodes/MediaNodeView";
import { SatelliteNodeView } from "./nodes/SatelliteNodeView";
import { SceneBoxNodeView } from "./nodes/SceneBoxNodeView";
import { SceneNodeView } from "./nodes/SceneNodeView";
import { NodalUiContext } from "./nodalUiContext";
import { ATTACH_OVERLAP_THRESHOLD, DETACH_OVERLAP_THRESHOLD, REWARD_CHILD_GAP_X } from "./nesting/constants";
import { SCENE_PADDING_TOP, SCENE_PADDING_X } from "./nesting/containerBounds";
import { overlapRatioByChild, toAbsoluteRect, type NestedNodeLike } from "./nesting/geometry";
import {
  describeNodeForDeletion,
  filterRfDeletionRoots,
  flattenDeleteChains,
  normalizeDeletionTarget,
} from "./deletion/describeNodeForDeletion";
import { useNodalKeyboard } from "./keyboard/useNodalKeyboard";
import { NodePalette } from "./palette/NodePalette";
import type { NodalSearchFieldHandle } from "./palette/NodalSearchField";
import { ObjectEditorPopup } from "./popups/ObjectEditorPopup";
import { CoordsOptionsPopup } from "./popups/CoordsOptionsPopup";
import { ChoiceOptionsPopup } from "./popups/ChoiceOptionsPopup";
import { MediaEditorPopup } from "./popups/MediaEditorPopup";
import { MsgContentPopup } from "./popups/MsgContentPopup";
import { PickContentPopup } from "./popups/PickContentPopup";
import { GotoContentPopup } from "./popups/GotoContentPopup";
import { ReqContentPopup } from "./popups/ReqContentPopup";
import { PwdContentPopup } from "./popups/PwdContentPopup";
import { SelectorContentPopup } from "./popups/SelectorContentPopup";
import { GlobalSettingsHubPopup } from "./popups/GlobalSettingsHubPopup";
import { DeleteConfirmDialog } from "./popups/DeleteConfirmDialog";
import { PopupThemeCustomizationPopup } from "./popups/PopupThemeCustomizationPopup";
import { WarningsPanel } from "./warnings/WarningsPanel";
import { toReactFlowEdges, toReactFlowNodes, type NodalRFData } from "./nodalReactFlowProjection";
import "./NodalCanvas.css";

const nodeTypes: NodeTypes = {
  sceneBoxNode: SceneBoxNodeView,
  sceneNode: SceneNodeView,
  actionNode: ActionNodeView,
  satelliteNode: SatelliteNodeView,
  mediaNode: MediaNodeView,
};

function detectNodalLocale(): "fr" | "en" {
  if (typeof document === "undefined") return "fr";
  return document.documentElement.lang?.toLowerCase().startsWith("en") ? "en" : "fr";
}

function detectFamily(connection: Connection): "flow" | "transition" | "meta" | null {
  if (connection.sourceHandle === HANDLE_FLOW_OUT && connection.targetHandle === HANDLE_FLOW_IN) return "flow";
  if (connection.sourceHandle === HANDLE_GOTO_OUT && connection.targetHandle === HANDLE_GOTO_IN) return "transition";
  if (connection.sourceHandle === HANDLE_META_OUT && connection.targetHandle === HANDLE_META_IN) return "meta";
  return null;
}

/** C8.3 — remonte à la palette la seule scène sélectionnée (exactement un nœud `sceneNode`). */
function NodalMapSelectionSync({
  onSelectedSceneId,
}: {
  onSelectedSceneId: (id: SceneNodeId | null) => void;
}) {
  const onChange = useCallback(
    ({ nodes }: { nodes: RFNode<NodalRFData>[] }) => {
      const scenes = nodes.filter((n) => n.type === "sceneNode");
      onSelectedSceneId(scenes.length === 1 ? (scenes[0].id as SceneNodeId) : null);
    },
    [onSelectedSceneId]
  );
  useOnSelectionChange({ onChange });
  return null;
}

function NodalCanvasInner({ store }: { store: StoreApi<NodalProjectStore> }) {
  const reactFlow = useReactFlow<RFNode<NodalRFData>, RFEdge>();
  const updateNodeInternals = useUpdateNodeInternals();
  const [mapColorMode, setMapColorMode] = useState<"light" | "dark">("light");
  const [objectEditorSatelliteId, setObjectEditorSatelliteId] = useState<SatelliteNodeId | null>(null);
  const [coordsEditorSatelliteId, setCoordsEditorSatelliteId] = useState<SatelliteNodeId | null>(null);
  const [choiceEditorSatelliteId, setChoiceEditorSatelliteId] = useState<SatelliteNodeId | null>(null);
  const [mediaEditorMediaId, setMediaEditorMediaId] = useState<MediaNodeId | null>(null);
  const [msgEditorActionId, setMsgEditorActionId] = useState<ActionNodeId | null>(null);
  const [pickEditorActionId, setPickEditorActionId] = useState<ActionNodeId | null>(null);
  const [gotoEditorActionId, setGotoEditorActionId] = useState<ActionNodeId | null>(null);
  const [reqEditorActionId, setReqEditorActionId] = useState<ActionNodeId | null>(null);
  const [pwdEditorActionId, setPwdEditorActionId] = useState<ActionNodeId | null>(null);
  const [selectorEditorActionId, setSelectorEditorActionId] = useState<ActionNodeId | null>(null);
  const [globalSettingsHubOpen, setGlobalSettingsHubOpen] = useState(false);
  const [popupThemeCustomizationOpen, setPopupThemeCustomizationOpen] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<{
    title: string;
    body: string;
    confirmLabel: string;
    cancelLabel: string;
  } | null>(null);
  /** Promise `onBeforeDelete` en attente de la réponse du dialogue (ids store + resolve). */
  const pendingDeleteFlowRef = useRef<{
    resolve: (value: boolean | { nodes: RFNode<NodalRFData>[]; edges: RFEdge[] }) => void;
    pendingStoreIds: AnyNodeId[];
  } | null>(null);
  const openMsgContentEditor = useCallback((id: ActionNodeId) => {
    setObjectEditorSatelliteId(null);
    setCoordsEditorSatelliteId(null);
    setChoiceEditorSatelliteId(null);
    setMediaEditorMediaId(null);
    setGlobalSettingsHubOpen(false);
    setPopupThemeCustomizationOpen(false);
    setPickEditorActionId(null);
    setGotoEditorActionId(null);
    setReqEditorActionId(null);
    setPwdEditorActionId(null);
    setSelectorEditorActionId(null);
    setMsgEditorActionId(id);
  }, []);
  const openPickContentEditor = useCallback((id: ActionNodeId) => {
    setObjectEditorSatelliteId(null);
    setCoordsEditorSatelliteId(null);
    setChoiceEditorSatelliteId(null);
    setMediaEditorMediaId(null);
    setGlobalSettingsHubOpen(false);
    setPopupThemeCustomizationOpen(false);
    setMsgEditorActionId(null);
    setGotoEditorActionId(null);
    setReqEditorActionId(null);
    setPwdEditorActionId(null);
    setSelectorEditorActionId(null);
    setPickEditorActionId(id);
  }, []);
  const openGotoContentEditor = useCallback((id: ActionNodeId) => {
    setObjectEditorSatelliteId(null);
    setCoordsEditorSatelliteId(null);
    setChoiceEditorSatelliteId(null);
    setMediaEditorMediaId(null);
    setGlobalSettingsHubOpen(false);
    setPopupThemeCustomizationOpen(false);
    setMsgEditorActionId(null);
    setPickEditorActionId(null);
    setReqEditorActionId(null);
    setPwdEditorActionId(null);
    setSelectorEditorActionId(null);
    setGotoEditorActionId(id);
  }, []);
  const openReqContentEditor = useCallback((id: ActionNodeId) => {
    setObjectEditorSatelliteId(null);
    setCoordsEditorSatelliteId(null);
    setChoiceEditorSatelliteId(null);
    setMediaEditorMediaId(null);
    setGlobalSettingsHubOpen(false);
    setPopupThemeCustomizationOpen(false);
    setMsgEditorActionId(null);
    setPickEditorActionId(null);
    setGotoEditorActionId(null);
    setPwdEditorActionId(null);
    setSelectorEditorActionId(null);
    setReqEditorActionId(id);
  }, []);
  const openPwdContentEditor = useCallback((id: ActionNodeId) => {
    setObjectEditorSatelliteId(null);
    setCoordsEditorSatelliteId(null);
    setChoiceEditorSatelliteId(null);
    setMediaEditorMediaId(null);
    setGlobalSettingsHubOpen(false);
    setPopupThemeCustomizationOpen(false);
    setMsgEditorActionId(null);
    setPickEditorActionId(null);
    setGotoEditorActionId(null);
    setReqEditorActionId(null);
    setSelectorEditorActionId(null);
    setPwdEditorActionId(id);
  }, []);
  const openSelectorContentEditor = useCallback((id: ActionNodeId) => {
    setObjectEditorSatelliteId(null);
    setCoordsEditorSatelliteId(null);
    setChoiceEditorSatelliteId(null);
    setMediaEditorMediaId(null);
    setGlobalSettingsHubOpen(false);
    setPopupThemeCustomizationOpen(false);
    setMsgEditorActionId(null);
    setPickEditorActionId(null);
    setGotoEditorActionId(null);
    setReqEditorActionId(null);
    setPwdEditorActionId(null);
    setSelectorEditorActionId(id);
  }, []);
  const state = useSyncExternalStore(
    store.subscribe,
    store.getState,
    store.getState
  );
  const canvasRef = useRef<HTMLDivElement>(null);
  const nodalSearchFieldRef = useRef<NodalSearchFieldHandle | null>(null);
  const [paletteSelectedSceneId, setPaletteSelectedSceneId] = useState<SceneNodeId | null>(null);

  const anyPopupOpen = useMemo(
    () =>
      !!objectEditorSatelliteId ||
      !!coordsEditorSatelliteId ||
      !!choiceEditorSatelliteId ||
      !!mediaEditorMediaId ||
      !!msgEditorActionId ||
      !!pickEditorActionId ||
      !!gotoEditorActionId ||
      !!reqEditorActionId ||
      !!pwdEditorActionId ||
      !!selectorEditorActionId ||
      globalSettingsHubOpen ||
      popupThemeCustomizationOpen ||
      deleteConfirm != null,
    [
      objectEditorSatelliteId,
      coordsEditorSatelliteId,
      choiceEditorSatelliteId,
      mediaEditorMediaId,
      msgEditorActionId,
      pickEditorActionId,
      gotoEditorActionId,
      reqEditorActionId,
      pwdEditorActionId,
      selectorEditorActionId,
      globalSettingsHubOpen,
      popupThemeCustomizationOpen,
      deleteConfirm,
    ]
  );

  const deselectAllRf = useCallback(() => {
    reactFlow.setNodes((nodes) => nodes.map((n) => ({ ...n, selected: false })));
    reactFlow.setEdges((edges) => edges.map((e) => ({ ...e, selected: false })));
  }, [reactFlow]);

  /** C8.5.3 — duplication clavier ; no-op jusqu’à branchement copier-coller. */
  const duplicateSelectionStub = useCallback(() => {}, []);

  useNodalKeyboard({
    anyPopupOpen,
    deselectAll: deselectAllRf,
    duplicateSelection: duplicateSelectionStub,
    focusSearchField: () => {
      nodalSearchFieldRef.current?.focus();
    },
  });

  useEffect(() => {
    if (!msgEditorActionId) return;
    const a = state.actions[msgEditorActionId];
    if (!a || a.actionType !== "msg") {
      setMsgEditorActionId(null);
    }
  }, [msgEditorActionId, state.actions]);
  useEffect(() => {
    if (!pickEditorActionId) return;
    const a = state.actions[pickEditorActionId];
    if (!a || a.actionType !== "pick") {
      setPickEditorActionId(null);
    }
  }, [pickEditorActionId, state.actions]);
  useEffect(() => {
    if (!gotoEditorActionId) return;
    const a = state.actions[gotoEditorActionId];
    if (!a || a.actionType !== "goto") {
      setGotoEditorActionId(null);
    }
  }, [gotoEditorActionId, state.actions]);
  useEffect(() => {
    if (!reqEditorActionId) return;
    const a = state.actions[reqEditorActionId];
    if (!a || a.actionType !== "req") {
      setReqEditorActionId(null);
    }
  }, [reqEditorActionId, state.actions]);
  useEffect(() => {
    if (!pwdEditorActionId) return;
    const a = state.actions[pwdEditorActionId];
    if (!a || a.actionType !== "pwd") {
      setPwdEditorActionId(null);
    }
  }, [pwdEditorActionId, state.actions]);
  useEffect(() => {
    if (!selectorEditorActionId) return;
    const a = state.actions[selectorEditorActionId];
    if (!a || a.actionType !== "selector") {
      setSelectorEditorActionId(null);
    }
  }, [selectorEditorActionId, state.actions]);

  // State React Flow pour nodes et edges (permet à RF de gérer drag, sélection, mesures)
  const [rfNodes, setRfNodes, onNodesChangeRF] = useNodesState<RFNode<NodalRFData>>([]);
  const [rfEdges, setRfEdges, onEdgesChangeRF] = useEdgesState<RFEdge>([]);

  // Synchronise le state Zustand → React Flow quand le store change
  // (ajout/suppression de nœuds, edges — pas les changements de position
  // qui passent par le drag de RF)
  useEffect(() => {
    const nextNodes = toReactFlowNodes(state);
    const knownIds = new Set(nextNodes.map((n) => n.id));

    setRfNodes((current) => {
      // Préserve le state interne (position pendant drag, mesures, sélection)
      // pour les nœuds qui existent déjà des deux côtés
      const currentById = new Map(current.map((n) => [n.id, n]));
      const nodesToUpdate: string[] = [];

      const result = nextNodes.map((n) => {
        const existing = currentById.get(n.id);
        if (!existing) {
          if (n.parentId && !knownIds.has(n.parentId)) {
            console.warn(
              `[useEffect sync] strip parentId fantôme ${n.parentId} sur ${n.id} (nouveau nœud)`
            );
            const stripped: RFNode<NodalRFData> = { ...n };
            delete stripped.parentId;
            nodesToUpdate.push(stripped.id);
            return stripped;
          }
          nodesToUpdate.push(n.id);
          if (n.parentId) nodesToUpdate.push(n.parentId);
          return n;
        }
        const parentChanged = (existing.parentId ?? null) !== (n.parentId ?? null);
        const merged: RFNode<NodalRFData> = {
          ...n,
          // Toujours appliquer la position du store (source de vérité).
          // Sinon, lors d'un hydrate/import sur des ids déjà présents,
          // RF conserve des positions obsolètes et la reconstruction diverge.
          position: n.position,
        };
        if (merged.parentId && !knownIds.has(merged.parentId)) {
          console.warn(`[useEffect sync] strip parentId fantôme ${merged.parentId} sur ${merged.id}`);
          delete merged.parentId;
        }
        if (parentChanged) {
          nodesToUpdate.push(merged.id);
          if (merged.parentId) nodesToUpdate.push(merged.parentId);
          const prevParent = existing.parentId;
          if (prevParent) nodesToUpdate.push(prevParent);
        }
        if (existing.selected !== undefined) merged.selected = existing.selected;
        if (existing.measured !== undefined) merged.measured = existing.measured;
        const prevD = existing.data as NodalRFData | undefined;
        const nextD = merged.data as NodalRFData;
        if (
          prevD?.collapsed !== nextD?.collapsed ||
          prevD?.synthGotoTargetCount !== nextD?.synthGotoTargetCount ||
          prevD?.containerCollapsed !== nextD?.containerCollapsed ||
          prevD?.sceneBoxSynthGotoTargetCount !== nextD?.sceneBoxSynthGotoTargetCount ||
          prevD?.sceneBoxActionCount !== nextD?.sceneBoxActionCount
        ) {
          nodesToUpdate.push(merged.id);
        }
        return merged;
      });

      for (const n of result) {
        if (!currentById.has(n.id)) {
          nodesToUpdate.push(n.id);
          if (n.parentId) nodesToUpdate.push(n.parentId);
        }
      }

      if (nodesToUpdate.length > 0) {
        const unique = [...new Set(nodesToUpdate)];
        setTimeout(() => updateNodeInternals(unique), 0);
      }
      return result;
    });
  }, [
    state.scenes,
    state.actions,
    state.satellites,
    state.media,
    state.layout,
    state.meta.startSceneId,
    setRfNodes,
    updateNodeInternals,
  ]);

  useEffect(() => {
    setRfEdges(toReactFlowEdges(state));
  }, [state.edges, state.layout, state.actions, state.scenes, setRfEdges]);

  // Persistance des positions + passage des changements RF (suppression gérée par `onBeforeDelete` C8.2.2).
  const onNodesChange = useCallback(
    (changes: NodeChange<RFNode<NodalRFData>>[]) => {
      onNodesChangeRF(changes);
      const snap = store.getState();
      for (const change of changes) {
        if (change.type === "position" && change.position && !change.dragging) {
          snap.updateNodeLayout(change.id as AnyNodeId, {
            x: change.position.x,
            y: change.position.y,
          });
        }
      }
    },
    [onNodesChangeRF, store]
  );

  /**
   * RF v12 : appelé **avant** la suppression clavier — retourner `false` annule ;
   * retourner `{ nodes, edges }` restreint évite de supprimer les enfants en cascade dans le store
   * (ex. chaîne REQ1>REQ2>REQ3 : un seul `removeNode` sur REQ2).
   */
  const onBeforeDelete = useCallback<OnBeforeDelete<RFNode<NodalRFData>, RFEdge>>(
    async ({ nodes: deletedNodes, edges: deletedEdges }) => {
      const snap = store.getState();
      const locale = detectNodalLocale();

      const nonSat = deletedNodes.filter((n) => !(n.id in snap.satellites));
      if (nonSat.length === 0) return false;

      const rootsRf = filterRfDeletionRoots(nonSat);

      const storeTargets: AnyNodeId[] = [];
      const seen = new Set<string>();
      for (const n of rootsRf) {
        const t = normalizeDeletionTarget(snap, n.id as AnyNodeId);
        if (t == null) continue;
        if (seen.has(t)) continue;
        seen.add(t);
        storeTargets.push(t);
      }
      if (storeTargets.length === 0) return false;

      const pairs: { target: AnyNodeId; desc: NonNullable<ReturnType<typeof describeNodeForDeletion>> }[] = [];
      for (const tid of storeTargets) {
        const d = describeNodeForDeletion(snap, tid, locale);
        if (d) pairs.push({ target: d.storeTargetId, desc: d });
      }
      if (pairs.length === 0) return { nodes: rootsRf, edges: deletedEdges };

      const needConfirm = pairs.some((p) => p.desc.needsConfirm);
      if (!needConfirm) {
        return { nodes: rootsRf, edges: deletedEdges };
      }

      const bodies = pairs.filter((p) => p.desc.needsConfirm).map((p) => p.desc.body);
      const titles = pairs.filter((p) => p.desc.needsConfirm).map((p) => p.desc.title);
      const title =
        titles.length === 1
          ? titles[0]!
          : locale === "fr"
            ? "Confirmer la suppression"
            : "Confirm deletion";
      const body = bodies.join("\n\n");

      return await new Promise<boolean | { nodes: RFNode<NodalRFData>[]; edges: RFEdge[] }>((resolve) => {
        pendingDeleteFlowRef.current = {
          resolve,
          pendingStoreIds: pairs.map((p) => p.target),
        };
        setDeleteConfirm({
          title,
          body,
          confirmLabel: locale === "fr" ? "Supprimer" : "Delete",
          cancelLabel: locale === "fr" ? "Annuler" : "Cancel",
        });
      });
    },
    [store]
  );

  // Wrap onEdgesChange pour passer à React Flow
  const onEdgesChange = useCallback(
    (changes: EdgeChange[]) => {
      onEdgesChangeRF(changes);
    },
    [onEdgesChangeRF]
  );

  const onConnect: OnConnect = useCallback(
    (connection) => {
      if (!isValidConnection(connection, state)) return;
      const family = detectFamily(connection);
      if (!family || !connection.source || !connection.target) return;
      state.connect({
        id: asEdgeId(`edge-${family}-${connection.source}-${connection.target}-${Date.now()}`),
        family,
        sourceId: connection.source as AnyNodeId,
        targetId: connection.target as AnyNodeId,
      });
    },
    [state]
  );

  const onMoveEnd: OnMove = useCallback(
    (_event, viewport) => {
      state.setViewport(viewport);
    },
    [state]
  );

  const onNodeDragStop: OnNodeDrag<RFNode<NodalRFData>> = useCallback(
    (_event, draggedNode) => {
      const allNodes = reactFlow.getNodes();
      const latestDragged = allNodes.find((n) => n.id === draggedNode.id) ?? draggedNode;
      const live = store.getState();
      const draggedMedia = live.media[draggedNode.id as MediaNodeId];
      const draggedAction = live.actions[draggedNode.id as keyof typeof live.actions];
      const nodesById = new Map(allNodes.map((n) => [n.id, n as unknown as NestedNodeLike]));
      const draggedLayout = live.layout[draggedNode.id as AnyNodeId];
      if (!draggedLayout) return;

      /* C8.1.b.5-fix : pas de drag-detach pour les media (overlap nul = placement normal à côté du parent). */
      if (draggedMedia) return;

      if (!draggedAction) return;
      const childRect = toAbsoluteRect(latestDragged as unknown as NestedNodeLike, nodesById);

      if (draggedLayout.parentId && draggedLayout.parentId in live.sceneBoxes) {
        const parentNode = nodesById.get(draggedLayout.parentId);
        if (parentNode) {
          const parentRect = toAbsoluteRect(parentNode, nodesById);
          const overlap = overlapRatioByChild(childRect, parentRect);
          if (overlap < DETACH_OVERLAP_THRESHOLD) {
            live.detachChild(draggedNode.id as AnyNodeId, { x: childRect.x, y: childRect.y });
            return;
          }
        }
        const pl = store.getState().layout[draggedNode.id as AnyNodeId];
        const bid = draggedLayout.parentId as SceneBoxNodeId;
        if (pl && (pl.x < SCENE_PADDING_X || pl.y < SCENE_PADDING_TOP)) {
          store.getState().reanchorSBox(bid);
        }
      } else if (draggedLayout.parentId && draggedLayout.parentId in live.actions) {
        const parentNode = nodesById.get(draggedLayout.parentId);
        if (!parentNode) return;
        const parentRect = toAbsoluteRect(parentNode, nodesById);
        const overlap = overlapRatioByChild(childRect, parentRect);
        if (overlap < DETACH_OVERLAP_THRESHOLD) {
          live.detachChild(draggedNode.id as AnyNodeId, { x: childRect.x, y: childRect.y });
        }
        return;
      }

      const hasFlowInFromScene = live.edges.some(
        (edge) => edge.family === "flow" && edge.targetId === draggedNode.id && edge.sourceId in live.scenes
      );
      if (hasFlowInFromScene) return;

      // Chaîne parentId lue sur le store à jour (getState) : plusieurs onNodeDragStop
      // peuvent s'enchaîner avant re-render React ; state.layout du closure serait obsolète.
      const getAncestors = (nodeId: string): Set<string> => {
        const ancestors = new Set<string>();
        let current: string | null | undefined = store.getState().layout[nodeId as AnyNodeId]?.parentId as
          | string
          | null
          | undefined;
        while (current) {
          if (ancestors.has(current)) break;
          ancestors.add(current);
          current = store.getState().layout[current as AnyNodeId]?.parentId as string | null | undefined;
        }
        return ancestors;
      };

      let bestRewardParentId: AnyNodeId | null = null;
      let bestRewardOverlap = 0;
      let bestChoiceParentId: AnyNodeId | null = null;
      let bestChoiceOverlap = 0;

      for (const candidate of allNodes) {
        if (candidate.id === draggedNode.id) continue;
        if (candidate.type === "sceneBoxNode") continue;
        if (candidate.id in live.sceneBoxes) continue;
        const candidateAction = live.actions[candidate.id as keyof typeof live.actions];
        if (!candidateAction) continue;
        const parentRect = toAbsoluteRect(candidate as unknown as NestedNodeLike, nodesById);
        const overlap = overlapRatioByChild(childRect, parentRect);

        if (candidateAction.actionType === "req" || candidateAction.actionType === "pwd") {
          if (overlap > bestRewardOverlap) {
            bestRewardOverlap = overlap;
            bestRewardParentId = candidate.id as AnyNodeId;
          }
        } else if (candidateAction.actionType === "selector") {
          const candidateAncestors = getAncestors(candidate.id);
          const draggedAncestors = getAncestors(draggedNode.id);
          if (candidateAncestors.has(draggedNode.id)) continue;
          if (draggedAncestors.has(candidate.id)) continue;
          if (overlap > bestChoiceOverlap) {
            bestChoiceOverlap = overlap;
            bestChoiceParentId = candidate.id as AnyNodeId;
          }
        }
      }

      const useRewardParent =
        bestRewardParentId !== null && bestRewardOverlap >= ATTACH_OVERLAP_THRESHOLD;
      const useChoiceParent =
        !useRewardParent &&
        bestChoiceParentId !== null &&
        bestChoiceOverlap >= ATTACH_OVERLAP_THRESHOLD;

      if (!useRewardParent && !useChoiceParent) return;

      const bestParentId = useRewardParent ? bestRewardParentId! : bestChoiceParentId!;
      live.attachChild(bestParentId, draggedNode.id as AnyNodeId);

      if (useRewardParent) {
        const parentNode = nodesById.get(bestParentId);
        if (!parentNode) return;
        const parentSize = parentNode.measured?.width ?? parentNode.width ?? 180;
        live.updateNodeLayout(draggedNode.id as AnyNodeId, {
          parentId: bestParentId,
          x: parentSize + REWARD_CHILD_GAP_X,
          y: 0,
        });
      } else {
        const parentNode = nodesById.get(bestParentId);
        if (!parentNode) return;
        const parentAbsRect = toAbsoluteRect(parentNode, nodesById);
        live.updateNodeLayout(draggedNode.id as AnyNodeId, {
          parentId: bestParentId,
          x: childRect.x - parentAbsRect.x,
          y: childRect.y - parentAbsRect.y,
        });
      }
    },
    [reactFlow, state, store]
  );

  const layoutClassName =
    mapColorMode === "dark" ? "nodal-canvas-layout dark-mode" : "nodal-canvas-layout";
  const objectSatellite =
    objectEditorSatelliteId && state.satellites[objectEditorSatelliteId]?.satelliteType === "object"
      ? (state.satellites[objectEditorSatelliteId] as ObjectSatelliteNode)
      : null;
  const objectEntry: ObjectEntry | null = objectSatellite?.data.objectId
    ? state.meta.objects[objectSatellite.data.objectId] ?? null
    : null;
  const coordsSatellite =
    coordsEditorSatelliteId && state.satellites[coordsEditorSatelliteId]?.satelliteType === "coords-options"
      ? (state.satellites[coordsEditorSatelliteId] as CoordsOptionsSatelliteNode)
      : null;
  const choiceSatellite =
    choiceEditorSatelliteId && state.satellites[choiceEditorSatelliteId]?.satelliteType === "choice-options"
      ? (state.satellites[choiceEditorSatelliteId] as ChoiceOptionsSatelliteNode)
      : null;
  const findParentAction = (sid: SatelliteNodeId | null): ActionNode | null => {
    if (!sid) return null;
    const e = state.edges.find((edge) => edge.family === "meta" && edge.targetId === sid);
    if (!e) return null;
    const a = state.actions[e.sourceId as keyof typeof state.actions];
    return (a as ActionNode) || null;
  };
  const coordsParentAction = findParentAction(coordsEditorSatelliteId);
  const choiceParentAction = findParentAction(choiceEditorSatelliteId);
  const mediaToEdit: MediaNode | null =
    mediaEditorMediaId && state.media[mediaEditorMediaId] ? state.media[mediaEditorMediaId] : null;
  const msgToEdit: MsgActionNode | null =
    msgEditorActionId &&
    state.actions[msgEditorActionId] &&
    state.actions[msgEditorActionId].actionType === "msg"
      ? (state.actions[msgEditorActionId] as MsgActionNode)
      : null;
  const pickToEdit: PickActionNode | null =
    pickEditorActionId &&
    state.actions[pickEditorActionId] &&
    state.actions[pickEditorActionId].actionType === "pick"
      ? (state.actions[pickEditorActionId] as PickActionNode)
      : null;
  const gotoToEdit: GotoActionNode | null =
    gotoEditorActionId &&
    state.actions[gotoEditorActionId] &&
    state.actions[gotoEditorActionId].actionType === "goto"
      ? (state.actions[gotoEditorActionId] as GotoActionNode)
      : null;
  const reqToEdit: ReqActionNode | null =
    reqEditorActionId &&
    state.actions[reqEditorActionId] &&
    state.actions[reqEditorActionId].actionType === "req"
      ? (state.actions[reqEditorActionId] as ReqActionNode)
      : null;
  const pwdToEdit: PwdActionNode | null =
    pwdEditorActionId &&
    state.actions[pwdEditorActionId] &&
    state.actions[pwdEditorActionId].actionType === "pwd"
      ? (state.actions[pwdEditorActionId] as PwdActionNode)
      : null;
  const selectorToEdit: SelectorActionNode | null =
    selectorEditorActionId &&
    state.actions[selectorEditorActionId] &&
    state.actions[selectorEditorActionId].actionType === "selector"
      ? (state.actions[selectorEditorActionId] as SelectorActionNode)
      : null;

  return (
    <NodalUiContext.Provider
      value={{
        store,
        objectEditorSatelliteId,
        setObjectEditorSatelliteId,
        coordsEditorSatelliteId,
        setCoordsEditorSatelliteId,
        choiceEditorSatelliteId,
        setChoiceEditorSatelliteId,
        mediaEditorMediaId,
        setMediaEditorMediaId,
        msgEditorActionId,
        setMsgEditorActionId,
        openMsgContentEditor,
        pickEditorActionId,
        setPickEditorActionId,
        openPickContentEditor,
        gotoEditorActionId,
        setGotoEditorActionId,
        openGotoContentEditor,
        reqEditorActionId,
        setReqEditorActionId,
        openReqContentEditor,
        pwdEditorActionId,
        setPwdEditorActionId,
        openPwdContentEditor,
        selectorEditorActionId,
        setSelectorEditorActionId,
        openSelectorContentEditor,
        globalSettingsHubOpen,
        setGlobalSettingsHubOpen,
        popupThemeCustomizationOpen,
        setPopupThemeCustomizationOpen,
      }}
    >
      <div className={layoutClassName} ref={canvasRef}>
        <NodePalette
          store={store}
          canvasRef={canvasRef}
          selectedSceneId={paletteSelectedSceneId}
          searchFieldRef={nodalSearchFieldRef}
        />
        <div className="nodal-canvas-pane">
        <button
          type="button"
          className="nodal-canvas-theme-toggle"
          aria-label={mapColorMode === "dark" ? "Passer en mode clair" : "Passer en mode sombre"}
          title={mapColorMode === "dark" ? "Mode clair" : "Mode sombre"}
          onClick={() => setMapColorMode((m) => (m === "dark" ? "light" : "dark"))}
        >
          {mapColorMode === "dark" ? "☀" : "☾"}
        </button>
        <ReactFlow
          colorMode={mapColorMode}
          nodes={rfNodes}
          edges={rfEdges}
          nodeTypes={nodeTypes}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          deleteKeyCode={["Delete", "Backspace"]}
          onBeforeDelete={onBeforeDelete}
          onNodesDelete={(deleted) => {
            const snap = store.getState();
            const roots = filterRfDeletionRoots(deleted);
            for (const n of roots) {
              if (n.id in snap.satellites) continue;
              snap.removeNode(n.id as AnyNodeId);
            }
          }}
          onEdgesDelete={(deleted) => {
            for (const e of deleted) state.disconnect(e.id as EdgeId);
          }}
          isValidConnection={(connectionLike) =>
            isValidConnection(
              {
                source: connectionLike.source,
                target: connectionLike.target,
                sourceHandle: connectionLike.sourceHandle ?? null,
                targetHandle: connectionLike.targetHandle ?? null,
              },
              state
            )
          }
          onMoveEnd={onMoveEnd}
          onNodeDragStop={onNodeDragStop}
          fitView
        >
          <NodalMapSelectionSync onSelectedSceneId={setPaletteSelectedSceneId} />
          <Background />
          <MiniMap />
          <Controls />
        </ReactFlow>
        <WarningsPanel warnings={state.warnings} />
        <DeleteConfirmDialog
          open={deleteConfirm != null}
          title={deleteConfirm?.title ?? ""}
          body={deleteConfirm?.body ?? ""}
          confirmLabel={deleteConfirm?.confirmLabel ?? ""}
          cancelLabel={deleteConfirm?.cancelLabel ?? ""}
          onCancel={() => {
            const p = pendingDeleteFlowRef.current;
            pendingDeleteFlowRef.current = null;
            setDeleteConfirm(null);
            p?.resolve(false);
          }}
          onConfirm={() => {
            const p = pendingDeleteFlowRef.current;
            if (p) {
              const chain = flattenDeleteChains(store.getState(), p.pendingStoreIds);
              for (const step of chain) {
                const s = store.getState();
                if (step in s.scenes || step in s.actions || step in s.media) {
                  store.getState().removeNode(step);
                }
              }
              pendingDeleteFlowRef.current = null;
              p.resolve(false);
            }
            setDeleteConfirm(null);
          }}
        />
        <ObjectEditorPopup
          satellite={objectSatellite}
          objectEntry={objectEntry}
          objectEntries={state.meta.objects}
          objectIds={Object.keys(state.meta.objects)}
          onChangeObjectId={(objectId) => {
            if (!objectEditorSatelliteId) return;
            state.updateNodeData(objectEditorSatelliteId, { data: { objectId } } as never);
          }}
          onUpsertObject={(entry) => state.upsertObject(entry)}
          onClose={() => setObjectEditorSatelliteId(null)}
        />
        <CoordsOptionsPopup
          satellite={coordsSatellite}
          parentAction={coordsParentAction}
          onChangeSatellite={(patch) => {
            if (!coordsEditorSatelliteId) return;
            state.updateNodeData(coordsEditorSatelliteId, { data: patch } as never);
          }}
          onChangeActionOptions={(patch) => {
            if (!coordsParentAction) return;
            state.updateNodeData(coordsParentAction.id, {
              visibility: patch.visibility as ActionNode["visibility"],
            } as never);
          }}
          onClose={() => setCoordsEditorSatelliteId(null)}
        />
        <ChoiceOptionsPopup
          satellite={choiceSatellite}
          parentAction={choiceParentAction}
          onChangeSatellite={(patch) => {
            if (!choiceEditorSatelliteId) return;
            state.updateNodeData(choiceEditorSatelliteId, { data: patch } as never);
          }}
          onChangeActionOptions={(patch) => {
            if (!choiceParentAction) return;
            const cur = choiceParentAction.visibility;
            state.updateNodeData(choiceParentAction.id, {
              visibility: {
                requiresItem: patch.visibility.requiresItem,
                hiddenIfHasItem: patch.visibility.hiddenIfHasItem,
                clickWhenInvisible: cur.clickWhenInvisible,
              },
            } as never);
          }}
          onClose={() => setChoiceEditorSatelliteId(null)}
        />
        <MediaEditorPopup
          media={mediaToEdit}
          onChange={(patch) => {
            if (!mediaEditorMediaId) return;
            const snap = store.getState();
            const cur = snap.media[mediaEditorMediaId];
            if (!cur) return;
            snap.updateNodeData(mediaEditorMediaId, {
              ...(typeof patch.label === "string" ? { label: patch.label } : {}),
              data: { ...cur.data, ...(patch.url !== undefined ? { url: patch.url } : {}), ...(patch.volume !== undefined ? { volume: patch.volume } : {}) },
            } as never);
          }}
          onClose={() => setMediaEditorMediaId(null)}
        />
        <MsgContentPopup
          store={store}
          action={msgToEdit}
          onSave={({ label, copy }) => {
            if (!msgEditorActionId) return;
            store.getState().updateNodeData(msgEditorActionId, {
              label,
              payload: { copy },
            } as never);
          }}
          onClose={() => setMsgEditorActionId(null)}
        />
        <PickContentPopup
          store={store}
          action={pickToEdit}
          onSave={({ label, copy }) => {
            if (!pickEditorActionId) return;
            const snap = store.getState();
            const cur = snap.actions[pickEditorActionId];
            if (!cur || cur.actionType !== "pick") return;
            snap.updateNodeData(pickEditorActionId, {
              label,
              payload: { ...cur.payload, copy },
            } as never);
          }}
          onClose={() => setPickEditorActionId(null)}
        />
        <GotoContentPopup
          store={store}
          action={gotoToEdit}
          onSave={({ label, copy }) => {
            if (!gotoEditorActionId) return;
            const snap = store.getState();
            const cur = snap.actions[gotoEditorActionId];
            if (!cur || cur.actionType !== "goto") return;
            snap.updateNodeData(gotoEditorActionId, {
              label,
              payload: { ...cur.payload, copy },
            } as never);
          }}
          onClose={() => setGotoEditorActionId(null)}
        />
        <ReqContentPopup
          store={store}
          action={reqToEdit}
          onSave={({ label, copy }) => {
            if (!reqEditorActionId) return;
            const snap = store.getState();
            const cur = snap.actions[reqEditorActionId];
            if (!cur || cur.actionType !== "req") return;
            snap.updateNodeData(reqEditorActionId, {
              label,
              payload: { ...cur.payload, copy },
            } as never);
          }}
          onClose={() => setReqEditorActionId(null)}
        />
        <PwdContentPopup
          store={store}
          action={pwdToEdit}
          onSave={({ label, bodyHtml, answer, rememberSuccess }) => {
            if (!pwdEditorActionId) return;
            const snap = store.getState();
            const cur = snap.actions[pwdEditorActionId];
            if (!cur || cur.actionType !== "pwd") return;
            snap.updateNodeData(pwdEditorActionId, {
              label,
              payload: { ...cur.payload, copy: { ...cur.payload.copy, bodyHtml }, answer, rememberSuccess },
            } as never);
          }}
          onClose={() => setPwdEditorActionId(null)}
        />
        <SelectorContentPopup
          store={store}
          action={selectorToEdit}
          onSave={({ label, title, bodyHtml, displayMode }) => {
            if (!selectorEditorActionId) return;
            const snap = store.getState();
            const cur = snap.actions[selectorEditorActionId];
            if (!cur || cur.actionType !== "selector") return;
            snap.updateNodeData(selectorEditorActionId, {
              label,
              payload: {
                ...cur.payload,
                nested: {
                  ...cur.payload.nested,
                  title,
                  displayMode,
                  copy: { ...cur.payload.nested.copy, bodyHtml },
                },
              },
            } as never);
          }}
          onClose={() => setSelectorEditorActionId(null)}
        />
        <GlobalSettingsHubPopup
          open={globalSettingsHubOpen}
          onClose={() => setGlobalSettingsHubOpen(false)}
          onOpenPopupTheme={() => {
            setGlobalSettingsHubOpen(false);
            setPopupThemeCustomizationOpen(true);
          }}
        />
        <PopupThemeCustomizationPopup
          store={store}
          open={popupThemeCustomizationOpen}
          onClose={() => setPopupThemeCustomizationOpen(false)}
          onBackToHub={() => {
            setPopupThemeCustomizationOpen(false);
            setGlobalSettingsHubOpen(true);
          }}
        />
      </div>
    </div>
    </NodalUiContext.Provider>
  );
}

export function NodalCanvas({ store }: { store: StoreApi<NodalProjectStore> }) {
  return (
    <ReactFlowProvider>
      <NodalCanvasInner store={store} />
    </ReactFlowProvider>
  );
}

