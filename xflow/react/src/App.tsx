import { useCallback, useEffect, useMemo, useRef, useState, type MouseEvent } from "react";
import {
  Background,
  Controls,
  MiniMap,
  Panel,
  ReactFlow,
  ReactFlowProvider,
  useEdgesState,
  useNodesState,
  useStoreApi,
  type Connection,
  type Edge,
  type Node,
  type NodeChange,
  type NodePositionChange,
  type NodeTypes,
  type OnConnectStart,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

import {
  type EditorLang,
  type EditorProject,
  type MapHotspotNodeData,
  type MapRedirectNodeData,
  type MapResourceNodeData,
  type MapSceneNodeData,
  type MapSelectorChoiceNodeData,
  buildProjectMapGraph,
  EDITOR_MAP_STAGING_SCENE_KEY,
  recomputeMapLayoutGroups,
  sceneKey,
} from "./mapGraphBuild";
import { MapAddMenuPanelContent } from "./mapAddMenuUi";
import { RF_FLOW_IN, RF_FLOW_OUT, RF_META_IN, RF_META_OUT } from "./mapFlowHandles";
import {
  clearMapFlowDebugRing,
  getMapFlowDebugRing,
  getMapFlowStaticHelp,
  setMapFlowDebugStorage,
  setMapFlowManualEdgesStorage,
} from "./mapFlowDebug";
import {
  appendFlowExtraConnection,
  clearAllFlowExtraEdges,
  loadFlowExtraEdges,
  mergePackEdgesWithExtras,
  removeFlowExtraEdgesByIds,
} from "./mapFlowExtraEdges";
import {
  MapHotspotNode,
  MapRedirectNode,
  MapResourceNode,
  MapSceneGroupNode,
  MapSceneNode,
  MapSelectorChoiceNode,
  MapSelectorGroupNode,
} from "./mapNodes";

declare global {
  interface Window {
    getCurrentProjectData?: () => EditorProject;
    _projectMapViewMode?: string;
    _projectMapActiveSceneKey?: string | null;
    applyMapHotspotSceneConnection?: (
      sceneIndex: number,
      hotspotIndex: number,
      targetSceneIndex: number
    ) => void;
    applyMapSceneMediaConnection?: (
      sceneIndex: number,
      resourceType: string,
      mediaUrl: string,
      mediaVolume?: number
    ) => void;
    applyMapHotspotSfxConnection?: (
      sceneIndex: number,
      hotspotIndex: number,
      mediaUrl: string,
      mediaVolume?: number
    ) => void;
    applyMapSelectorChoiceSfxConnection?: (
      sceneIndex: number,
      hotspotIndex: number,
      choicePath: number[],
      mediaUrl: string,
      mediaVolume?: number
    ) => void;
    applyMapSelectorChoiceSceneConnection?: (
      sceneIndex: number,
      hotspotIndex: number,
      choicePath: number[],
      targetSceneIndex: number
    ) => void;
    applyMapSelectorChoiceSceneTarget?: (
      sceneIndex: number,
      hotspotIndex: number,
      choicePath: number[],
      targetDomSceneId: string
    ) => void;
    copyHotspotToMapScene?: (
      fromSceneIndex: number,
      hotspotIndex: number,
      toSceneIndex: number
    ) => void;
    attachHotspotToMapScene?: (
      fromSceneIndex: number,
      hotspotIndex: number,
      targetSceneIndex: number
    ) => void;
    detachHotspotToStaging?: (sceneIndex: number, hotspotIndex: number) => void;
    promoteMapOrphanHotspotIntoSelectorRoot?: (
      fromSceneIndex: number,
      fromHotspotIndex: number,
      toSceneIndex: number,
      toHotspotIndex: number
    ) => void;
    projectMapSidePanelHasStash?: () => boolean;
    restoreProjectMapSidePanelDomOnly?: () => void;
    _projectMapReactBridge?: {
      mountFromNodeData: (d: Record<string, unknown> | null | undefined) => void;
      clearSelectionAndRefresh: () => void;
      setToolbar: (mode: string) => void;
    };
  }
}

const nodeTypes: NodeTypes = {
  mapSceneGroup: MapSceneGroupNode,
  mapSelectorGroup: MapSelectorGroupNode,
  mapScene: MapSceneNode,
  mapHotspot: MapHotspotNode,
  mapSelectorChoice: MapSelectorChoiceNode,
  mapResource: MapResourceNode,
  mapRedirect: MapRedirectNode,
};

function hostLang(): EditorLang {
  return document.documentElement.lang.toLowerCase().startsWith("en") ? "en" : "fr";
}

function readNarrationOnly(): boolean {
  const el = document.getElementById("project-map-narration-only");
  return el instanceof HTMLInputElement && el.checked;
}

function resolveSceneIndexFromActiveKey(project: EditorProject | null): number {
  const k = window._projectMapActiveSceneKey;
  if (!project?.scenes?.length || k == null || String(k).trim() === "") return 0;
  const scenes = project.scenes;
  for (let i = 0; i < scenes.length; i++) {
    if (sceneKey(scenes[i], i) === String(k).trim()) return i;
  }
  return 0;
}

function readProject(): EditorProject | null {
  try {
    const modal = document.getElementById("project-map-modal");
    if (
      modal &&
      (modal as HTMLElement).style.display === "flex" &&
      typeof window.projectMapSidePanelHasStash === "function" &&
      window.projectMapSidePanelHasStash() &&
      typeof window.restoreProjectMapSidePanelDomOnly === "function"
    ) {
      window.restoreProjectMapSidePanelDomOnly();
    }
    const fn = window.getCurrentProjectData;
    if (typeof fn !== "function") return null;
    const p = fn();
    return p && typeof p === "object" ? p : null;
  } catch {
    return null;
  }
}

function mergeSavedNodePositions(nodes: Node[], saved: Record<string, { x: number; y: number }>): Node[] {
  if (!saved || Object.keys(saved).length === 0) return nodes;
  return nodes.map((node) => {
    if (node.type === "mapSceneGroup" || node.type === "mapSelectorGroup") {
      return { ...node };
    }
    const p = saved[node.id];
    if (!p || typeof p.x !== "number" || typeof p.y !== "number") return node;
    return { ...node, position: { x: p.x, y: p.y } };
  });
}

/** Déplace en bloc hotspots / choix / médias / cadre `sg:` quand on traîne le nœud scène (`sc:`). */
function expandMapSceneDragWithGroup(nodes: Node[], changes: NodeChange[]): NodeChange[] {
  const movedByPointer = new Set<string>();
  for (const c of changes) {
    if (c.type !== "position") continue;
    const pc = c as NodePositionChange;
    if (
      pc.position == null ||
      typeof pc.position.x !== "number" ||
      typeof pc.position.y !== "number"
    ) {
      continue;
    }
    movedByPointer.add(pc.id);
  }

  const extras: NodeChange[] = [];

  for (const change of changes) {
    if (change.type !== "position") continue;
    const pc = change as NodePositionChange;
    if (
      pc.position == null ||
      typeof pc.position.x !== "number" ||
      typeof pc.position.y !== "number"
    ) {
      continue;
    }

    const id = pc.id;
    if (!id.startsWith("sc:")) continue;

    const n = nodes.find((x) => x.id === id);
    if (n?.type !== "mapScene") continue;

    const sk = (n.data as MapSceneNodeData).sceneKey;
    if (!sk || typeof sk !== "string") continue;

    const dx = pc.position.x - n.position.x;
    const dy = pc.position.y - n.position.y;
    if (Math.abs(dx) < 1e-4 && Math.abs(dy) < 1e-4) continue;

    const hsP = `hs:${sk}:`;
    const selP = `sel:${sk}:`;
    const resP = `res:${sk}:`;
    const ssgP = `ssg:${sk}:`;

    for (const child of nodes) {
      if (child.id === id) continue;
      if (
        !child.id.startsWith(hsP) &&
        !child.id.startsWith(selP) &&
        !child.id.startsWith(resP) &&
        !child.id.startsWith(ssgP)
      ) {
        continue;
      }
      if (movedByPointer.has(child.id)) continue;
      const follow: NodePositionChange = {
        type: "position",
        id: child.id,
        position: { x: child.position.x + dx, y: child.position.y + dy },
      };
      if ("dragging" in pc && typeof pc.dragging === "boolean") follow.dragging = pc.dragging;
      extras.push(follow);
    }

    const sgId = `sg:${sk}`;
    const sg = nodes.find((x) => x.id === sgId);
    if (sg && !movedByPointer.has(sgId)) {
      const g: NodePositionChange = {
        type: "position",
        id: sgId,
        position: { x: sg.position.x + dx, y: sg.position.y + dy },
      };
      if ("dragging" in pc && typeof pc.dragging === "boolean") g.dragging = pc.dragging;
      extras.push(g);
    }
  }

  if (extras.length === 0) return changes;
  return changes.concat(extras);
}

function InnerMap() {
  const [graphRev, setGraphRev] = useState(0);
  const bump = useCallback(() => setGraphRev((n) => n + 1), []);
  const store = useStoreApi();
  const layoutSaveTimer = useRef<number | null>(null);
  const altConnectRef = useRef(false);
  const layoutKeyRef = useRef("");
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [paletteSceneIndex, setPaletteSceneIndex] = useState(0);

  useEffect(() => {
    const onBus = (ev: Event) => {
      const ce = ev as CustomEvent<{ type?: string }>;
      if (ce.detail?.type) bump();
    };
    document.addEventListener("react-project-map", onBus);
    return () => document.removeEventListener("react-project-map", onBus);
  }, [bump]);

  useEffect(() => {
    const modal = document.getElementById("project-map-modal");
    if (modal && modal.style.display === "flex") bump();
  }, [bump]);

  useEffect(() => {
    const w = window as Window & {
      escape360MapFlow?: {
        help: () => void;
        log: () => ReturnType<typeof getMapFlowDebugRing>;
        clearLog: () => void;
        debugOn: () => void;
        debugOff: () => void;
        clearManualEdges: () => number;
        manualEdgesOff: () => void;
        manualEdgesOn: () => void;
      };
    };
    w.escape360MapFlow = {
      help() {
        console.info(getMapFlowStaticHelp());
        console.info("[escape360-map-flow] layoutKey courant :", layoutKeyRef.current);
      },
      log() {
        const r = getMapFlowDebugRing();
        console.table(
          r.map((x) => ({
            iso: new Date(x.ts).toISOString(),
            kind: x.kind,
            payload: x.payload != null ? JSON.stringify(x.payload) : "",
          }))
        );
        return r;
      },
      clearLog: clearMapFlowDebugRing,
      debugOn() {
        setMapFlowDebugStorage(true);
        (window as Window & { __ESCAPE360_MAP_FLOW_DEBUG?: boolean }).__ESCAPE360_MAP_FLOW_DEBUG = true;
        console.info("[escape360-map-flow] debug console ON");
      },
      debugOff() {
        setMapFlowDebugStorage(false);
        (window as Window & { __ESCAPE360_MAP_FLOW_DEBUG?: boolean }).__ESCAPE360_MAP_FLOW_DEBUG = false;
        console.info("[escape360-map-flow] debug console OFF");
      },
      clearManualEdges() {
        const n = clearAllFlowExtraEdges(layoutKeyRef.current);
        bump();
        console.info(`[escape360-map-flow] ${n} arête(s) manuelle(s) supprimée(s) (session).`);
        return n;
      },
      manualEdgesOff() {
        setMapFlowManualEdgesStorage(false);
        bump();
        console.info("[escape360-map-flow] Arêtes manuelles désactivées (plus de pointillés).");
      },
      manualEdgesOn() {
        setMapFlowManualEdgesStorage(true);
        bump();
        console.info("[escape360-map-flow] Arêtes manuelles réactivées.");
      },
    };
    return () => {
      delete w.escape360MapFlow;
    };
  }, [bump]);

  const pack = useMemo(() => {
    const project = readProject();
    const viewMode = (window._projectMapViewMode || "full") as "focus" | "full" | "tree";
    const activeSceneKey = window._projectMapActiveSceneKey ?? null;
    const narr = readNarrationOnly();
    const { nodes, edges, activeSceneKey: nextActive } = buildProjectMapGraph(project, {
      viewMode,
      activeSceneKey,
      narrationOnly: narr,
      lang: hostLang(),
    });
    if (viewMode === "focus" && nextActive) {
      window._projectMapActiveSceneKey = nextActive;
    }
    const title = String(project?.title ?? "").slice(0, 120);
    const nScenes = project?.scenes?.length ?? 0;
    const layoutKey = `escape360-reactMap-pos:v1:${viewMode}:${narr ? "1" : "0"}:${nScenes}:${title}`;
    let mergedNodes = nodes;
    try {
      const raw = sessionStorage.getItem(layoutKey);
      if (raw) {
        const parsed = JSON.parse(raw) as unknown;
        if (parsed && typeof parsed === "object") {
          mergedNodes = mergeSavedNodePositions(nodes, parsed as Record<string, { x: number; y: number }>);
        }
      }
    } catch {
      /* ignore */
    }
    mergedNodes = recomputeMapLayoutGroups(mergedNodes);
    return { nodes: mergedNodes, edges, layoutKey };
  }, [graphRev]);

  const [nodes, setNodes, onNodesChange] = useNodesState(pack.nodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(pack.edges);

  useEffect(() => {
    layoutKeyRef.current = pack.layoutKey;
    const extras = loadFlowExtraEdges(pack.layoutKey);
    setNodes(pack.nodes);
    setEdges(mergePackEdgesWithExtras(pack.edges, extras, pack.nodes));
  }, [pack, setNodes, setEdges]);

  const mode = window._projectMapViewMode || "full";
  const selectable = mode === "focus" || mode === "tree" || mode === "full";
  const enUi = hostLang() === "en";

  const onNodeClick = useCallback((_: MouseEvent, node: Node) => {
    if (node.type === "mapScene") {
      const d = node.data as MapSceneNodeData;
      if (typeof d.sceneIndex === "number") setPaletteSceneIndex(d.sceneIndex);
    }
    window._projectMapReactBridge?.mountFromNodeData(node.data as Record<string, unknown>);
  }, []);

  const onPaneClick = useCallback(() => {
    window._projectMapReactBridge?.clearSelectionAndRefresh();
  }, []);

  const readAltForConnect = useCallback((event: MouseEvent | TouchEvent): boolean => {
    const me = event as MouseEvent;
    if (typeof me.altKey === "boolean" && me.altKey) return true;
    if (typeof me.getModifierState === "function" && me.getModifierState("Alt")) return true;
    return false;
  }, []);

  const onConnectStart = useCallback<OnConnectStart>(
    (event) => {
      altConnectRef.current = readAltForConnect(event as unknown as MouseEvent | TouchEvent);
    },
    [readAltForConnect]
  );

  const onNodeDoubleClick = useCallback((evt: MouseEvent, node: Node) => {
    evt.stopPropagation();
    if (node.type !== "mapScene") return;
    const d = node.data as {
      chrome?: string;
      sceneKey?: string;
    };
    if (d.chrome !== "collapsed" || !d.sceneKey) return;
    window._projectMapActiveSceneKey = d.sceneKey;
    window._projectMapViewMode = "focus";
    window._projectMapReactBridge?.setToolbar("focus");
    document.dispatchEvent(
      new CustomEvent("react-project-map", { detail: { type: "setView", mode: "focus" } })
    );
  }, []);

  const isValidConnection = useCallback(
    (c: Connection) => {
      const sNode = nodes.find((n) => n.id === c.source);
      const tNode = nodes.find((n) => n.id === c.target);
      if (!sNode || !tNode) return false;
      /** Scène (Est / flow out) → hotspot (Ouest / flow in) : rattachement (orphelin ou autre scène). */
      if (sNode.type === "mapScene" && tNode.type === "mapHotspot") {
        if (c.sourceHandle !== RF_FLOW_OUT || c.targetHandle !== RF_FLOW_IN) return false;
        const sd = sNode.data as MapSceneNodeData;
        const hd = tNode.data as MapHotspotNodeData;
        if (sd.sceneKey === EDITOR_MAP_STAGING_SCENE_KEY) return false;
        if (
          hd.parentSceneKey === sd.sceneKey &&
          hd.parentSceneKey !== EDITOR_MAP_STAGING_SCENE_KEY
        ) {
          return false;
        }
        return true;
      }
      if (sNode.type === "mapHotspot" && tNode.type === "mapScene") {
        if (c.sourceHandle !== RF_FLOW_OUT || c.targetHandle !== RF_FLOW_IN) return false;
        const sd = sNode.data as MapHotspotNodeData;
        const td = tNode.data as MapSceneNodeData;
        if (sd.parentSceneKey === EDITOR_MAP_STAGING_SCENE_KEY && td.sceneKey !== EDITOR_MAP_STAGING_SCENE_KEY) {
          return true;
        }
        if (sd.mapDragSceneOut) return true;
        if (altConnectRef.current) {
          return sd.sceneIndex !== td.sceneIndex;
        }
        return false;
      }
      if (sNode.type === "mapHotspot" && tNode.type === "mapSelectorChoice") {
        if (c.sourceHandle !== RF_FLOW_OUT || c.targetHandle !== RF_FLOW_IN) return false;
        const sd = sNode.data as MapHotspotNodeData;
        const cd = tNode.data as MapSelectorChoiceNodeData;
        if (sd.parentSceneKey !== EDITOR_MAP_STAGING_SCENE_KEY) return false;
        if (!cd.parentSceneKey) return false;
        return true;
      }
      /**
       * Choix menu (Est) → hotspot (Ouest) : file d’attente (DOM) **ou** même scène que le menu
       * (arête « extra » sessionStorage, pas encore V2).
       */
      if (sNode.type === "mapSelectorChoice" && tNode.type === "mapHotspot") {
        if (c.sourceHandle !== RF_FLOW_OUT || c.targetHandle !== RF_FLOW_IN) return false;
        const cd = sNode.data as MapSelectorChoiceNodeData;
        const hd = tNode.data as MapHotspotNodeData;
        if (!cd.parentSceneKey) return false;
        if (hd.hotspotIndex === cd.hotspotIndex && hd.sceneIndex === cd.sceneIndex) return false;
        /** Pas de lien « carte seule » vers un autre menu (selector) : pas de sémantique jeu / DOM. */
        if (hd.actionType === "selector") return false;
        if (cd.parentSceneKey === EDITOR_MAP_STAGING_SCENE_KEY) {
          if (hd.parentSceneKey === EDITOR_MAP_STAGING_SCENE_KEY) return true;
          return hd.parentSceneKey !== EDITOR_MAP_STAGING_SCENE_KEY;
        }
        if (hd.parentSceneKey === EDITOR_MAP_STAGING_SCENE_KEY) return true;
        /** Choix → hotspot sur autre scène : arête « extra » uniquement (pédagogie). */
        if (hd.sceneIndex !== cd.sceneIndex || hd.parentSceneKey !== cd.parentSceneKey) {
          return hd.parentSceneKey !== EDITOR_MAP_STAGING_SCENE_KEY;
        }
        return hd.hotspotIndex !== cd.hotspotIndex;
      }
      /**
       * Hotspot menu selector (Est) → hotspot (Ouest) : orphelin (DOM) ou autre hotspot **sur la
       * même scène** (arête extra).
       */
      if (sNode.type === "mapHotspot" && tNode.type === "mapHotspot") {
        if (c.sourceHandle !== RF_FLOW_OUT || c.targetHandle !== RF_FLOW_IN) return false;
        const sd = sNode.data as MapHotspotNodeData;
        const td = tNode.data as MapHotspotNodeData;
        if (sd.actionType !== "selector") return false;
        if (sd.sceneIndex === td.sceneIndex && sd.hotspotIndex === td.hotspotIndex) return false;
        /** Orphelin sur la file : promotion seulement si la cible n’est pas déjà un menu selector. */
        if (td.parentSceneKey === EDITOR_MAP_STAGING_SCENE_KEY) {
          return td.actionType !== "selector";
        }
        /** Menu selector encore sur la file → hotspot sur scène jouable : rattacher le menu à cette scène. */
        if (
          sd.parentSceneKey === EDITOR_MAP_STAGING_SCENE_KEY &&
          td.parentSceneKey !== EDITOR_MAP_STAGING_SCENE_KEY
        ) {
          return true;
        }
        /** Pas d’arête « extra » vers un autre hotspot selector (aucune action projet / DOM). */
        if (td.actionType === "selector") return false;
        /**
         * Arête « extra » (pointillés) : menu → hotspot feuille sur scène jouable (hors selector),
         * y compris autre scène — pas de rattachement DOM.
         */
        return td.parentSceneKey !== EDITOR_MAP_STAGING_SCENE_KEY;
      }
      if (sNode.type === "mapSelectorChoice" && tNode.type === "mapScene") {
        if (c.sourceHandle !== RF_FLOW_OUT || c.targetHandle !== RF_FLOW_IN) return false;
        const td = tNode.data as MapSceneNodeData;
        if (td.sceneKey === EDITOR_MAP_STAGING_SCENE_KEY) return false;
        return true;
      }
      if (sNode.type === "mapSelectorChoice" && tNode.type === "mapRedirect") {
        if (c.sourceHandle !== RF_FLOW_OUT || c.targetHandle !== RF_FLOW_IN) return false;
        const rd = tNode.data as MapRedirectNodeData;
        return Boolean(String(rd.targetSceneKey || "").trim());
      }
      if (tNode.type === "mapResource" && c.targetHandle === RF_META_IN) {
        const rd = tNode.data as MapResourceNodeData;
        if (sNode.type === "mapScene" && c.sourceHandle === RF_META_OUT) {
          return rd.resourceType === "sceneAmbiance" || rd.resourceType === "sceneImage";
        }
        if (sNode.type === "mapHotspot" && c.sourceHandle === RF_META_OUT) {
          return rd.resourceType === "hotspotSfx";
        }
        if (sNode.type === "mapSelectorChoice" && c.sourceHandle === RF_META_OUT) {
          return rd.resourceType === "choiceSfx";
        }
      }
      return false;
    },
    [nodes]
  );

  const onConnect = useCallback(
    (c: Connection) => {
      try {
        const sNode = nodes.find((n) => n.id === c.source);
        const tNode = nodes.find((n) => n.id === c.target);
        if (!sNode || !tNode) return;
        if (sNode.type === "mapScene" && tNode.type === "mapHotspot") {
          const sd = sNode.data as MapSceneNodeData;
          const hd = tNode.data as MapHotspotNodeData;
          if (c.sourceHandle !== RF_FLOW_OUT || c.targetHandle !== RF_FLOW_IN) return;
          if (sd.sceneKey === EDITOR_MAP_STAGING_SCENE_KEY) return;
          if (
            hd.parentSceneKey === sd.sceneKey &&
            hd.parentSceneKey !== EDITOR_MAP_STAGING_SCENE_KEY
          ) {
            return;
          }
          window.attachHotspotToMapScene?.(hd.sceneIndex, hd.hotspotIndex, sd.sceneIndex);
          return;
        }
        if (sNode.type === "mapHotspot" && tNode.type === "mapScene") {
          const sd = sNode.data as MapHotspotNodeData;
          const td = tNode.data as MapSceneNodeData;
          if (c.sourceHandle !== RF_FLOW_OUT || c.targetHandle !== RF_FLOW_IN) return;
          if (
            sd.parentSceneKey === EDITOR_MAP_STAGING_SCENE_KEY &&
            td.sceneKey !== EDITOR_MAP_STAGING_SCENE_KEY
          ) {
            window.attachHotspotToMapScene?.(sd.sceneIndex, sd.hotspotIndex, td.sceneIndex);
            return;
          }
          if (sd.mapDragSceneOut) {
            window.applyMapHotspotSceneConnection?.(sd.sceneIndex, sd.hotspotIndex, td.sceneIndex);
            return;
          }
          if (altConnectRef.current) {
            window.copyHotspotToMapScene?.(sd.sceneIndex, sd.hotspotIndex, td.sceneIndex);
            return;
          }
          return;
        }
        if (sNode.type === "mapHotspot" && tNode.type === "mapSelectorChoice") {
          const sd = sNode.data as MapHotspotNodeData;
          const cd = tNode.data as MapSelectorChoiceNodeData;
          if (c.sourceHandle !== RF_FLOW_OUT || c.targetHandle !== RF_FLOW_IN) return;
          if (sd.parentSceneKey !== EDITOR_MAP_STAGING_SCENE_KEY) return;
          window.promoteMapOrphanHotspotIntoSelectorRoot?.(
            sd.sceneIndex,
            sd.hotspotIndex,
            cd.sceneIndex,
            cd.hotspotIndex
          );
          return;
        }
        if (sNode.type === "mapSelectorChoice" && tNode.type === "mapHotspot") {
          const cd = sNode.data as MapSelectorChoiceNodeData;
          const hd = tNode.data as MapHotspotNodeData;
          if (c.sourceHandle !== RF_FLOW_OUT || c.targetHandle !== RF_FLOW_IN) return;
          if (hd.parentSceneKey === EDITOR_MAP_STAGING_SCENE_KEY) {
            if (hd.actionType === "selector") return;
            window.promoteMapOrphanHotspotIntoSelectorRoot?.(
              hd.sceneIndex,
              hd.hotspotIndex,
              cd.sceneIndex,
              cd.hotspotIndex
            );
            return;
          }
          if (cd.parentSceneKey === EDITOR_MAP_STAGING_SCENE_KEY) {
            window.attachHotspotToMapScene?.(cd.sceneIndex, cd.hotspotIndex, hd.sceneIndex);
          }
          appendFlowExtraConnection(layoutKeyRef.current, c, "choiceToHotspotExtra");
          bump();
          return;
        }
        if (sNode.type === "mapHotspot" && tNode.type === "mapHotspot") {
          const sd = sNode.data as MapHotspotNodeData;
          const td = tNode.data as MapHotspotNodeData;
          if (c.sourceHandle !== RF_FLOW_OUT || c.targetHandle !== RF_FLOW_IN) return;
          if (sd.actionType !== "selector") return;
          /** Selector sur la file → hotspot déjà sur une scène : déplacer le menu vers cette scène. */
          if (
            sd.parentSceneKey === EDITOR_MAP_STAGING_SCENE_KEY &&
            td.parentSceneKey !== EDITOR_MAP_STAGING_SCENE_KEY
          ) {
            window.attachHotspotToMapScene?.(sd.sceneIndex, sd.hotspotIndex, td.sceneIndex);
            return;
          }
          if (td.parentSceneKey === EDITOR_MAP_STAGING_SCENE_KEY) {
            if (td.actionType === "selector") return;
            window.promoteMapOrphanHotspotIntoSelectorRoot?.(
              td.sceneIndex,
              td.hotspotIndex,
              sd.sceneIndex,
              sd.hotspotIndex
            );
            return;
          }
          appendFlowExtraConnection(layoutKeyRef.current, c, "selectorToHotspotExtra");
          bump();
          return;
        }
        if (sNode.type === "mapSelectorChoice" && tNode.type === "mapScene") {
          const cd = sNode.data as MapSelectorChoiceNodeData;
          const td = tNode.data as MapSceneNodeData;
          if (c.sourceHandle !== RF_FLOW_OUT || c.targetHandle !== RF_FLOW_IN) return;
          if (td.sceneKey === EDITOR_MAP_STAGING_SCENE_KEY) return;
          window.applyMapSelectorChoiceSceneConnection?.(
            cd.sceneIndex,
            cd.hotspotIndex,
            cd.choicePath,
            td.sceneIndex
          );
          return;
        }
        if (sNode.type === "mapSelectorChoice" && tNode.type === "mapRedirect") {
          const cd = sNode.data as MapSelectorChoiceNodeData;
          const red = tNode.data as MapRedirectNodeData;
          if (c.sourceHandle !== RF_FLOW_OUT || c.targetHandle !== RF_FLOW_IN) return;
          const key = String(red.targetSceneKey || "").trim();
          if (!key) return;
          window.applyMapSelectorChoiceSceneTarget?.(
            cd.sceneIndex,
            cd.hotspotIndex,
            cd.choicePath,
            key
          );
          return;
        }
        if (tNode.type !== "mapResource") return;
        const rd = tNode.data as MapResourceNodeData;
        if (c.targetHandle !== RF_META_IN) return;
        if (sNode.type === "mapScene") {
          if (c.sourceHandle !== RF_META_OUT) return;
          const sd = sNode.data as MapSceneNodeData;
          window.applyMapSceneMediaConnection?.(sd.sceneIndex, rd.resourceType, rd.url, rd.volume);
          return;
        }
        if (sNode.type === "mapHotspot") {
          if (c.sourceHandle !== RF_META_OUT) return;
          if (rd.resourceType !== "hotspotSfx") return;
          const hd = sNode.data as MapHotspotNodeData;
          window.applyMapHotspotSfxConnection?.(hd.sceneIndex, hd.hotspotIndex, rd.url, rd.volume);
          return;
        }
        if (sNode.type === "mapSelectorChoice" && rd.resourceType === "choiceSfx") {
          if (c.sourceHandle !== RF_META_OUT) return;
          const cd = sNode.data as MapSelectorChoiceNodeData;
          window.applyMapSelectorChoiceSfxConnection?.(
            cd.sceneIndex,
            cd.hotspotIndex,
            cd.choicePath,
            rd.url,
            rd.volume
          );
        }
      } finally {
        altConnectRef.current = false;
      }
    },
    [nodes, bump]
  );

  const onEdgesDelete = useCallback(
    (removed: Edge[]) => {
      const extraIds = removed.map((e) => e.id).filter((id) => id.startsWith("xflow-extra:"));
      if (extraIds.length > 0) {
        removeFlowExtraEdgesByIds(layoutKeyRef.current, extraIds);
        bump();
      }
      for (const edge of removed) {
        if (edge.sourceHandle !== RF_FLOW_OUT || edge.targetHandle !== RF_FLOW_IN) continue;
        const src = nodes.find((n) => n.id === edge.source);
        const tgt = nodes.find((n) => n.id === edge.target);
        if (src?.type !== "mapScene" || tgt?.type !== "mapHotspot") continue;
        const scd = src.data as MapSceneNodeData;
        const hd = tgt.data as MapHotspotNodeData;
        if (
          scd.sceneKey === hd.parentSceneKey &&
          hd.parentSceneKey !== EDITOR_MAP_STAGING_SCENE_KEY
        ) {
          window.detachHotspotToStaging?.(hd.sceneIndex, hd.hotspotIndex);
        }
      }
    },
    [nodes, bump]
  );

  const onNodesChangePersistLayout = useCallback(
    (changes: NodeChange[]) => {
      const expanded = expandMapSceneDragWithGroup(store.getState().nodes, changes);
      onNodesChange(expanded);
      const endedDrag = expanded.some(
        (c) =>
          c.type === "position" &&
          "dragging" in c &&
          (c as { dragging?: boolean }).dragging === false
      );
      if (!endedDrag) return;
      queueMicrotask(() => {
        setNodes((nds) => recomputeMapLayoutGroups(nds));
      });
      if (layoutSaveTimer.current != null) window.clearTimeout(layoutSaveTimer.current);
      layoutSaveTimer.current = window.setTimeout(() => {
        layoutSaveTimer.current = null;
        try {
          const all = store.getState().nodes;
          const pos: Record<string, { x: number; y: number }> = {};
          for (const n of all) {
            if (n.type === "mapSceneGroup" || n.type === "mapSelectorGroup") continue;
            if (n.id.startsWith("sg:") || n.id.startsWith("ssg:")) continue;
            pos[n.id] = { x: n.position.x, y: n.position.y };
          }
          sessionStorage.setItem(pack.layoutKey, JSON.stringify(pos));
        } catch {
          /* ignore */
        }
      }, 400);
    },
    [onNodesChange, setNodes, store, pack.layoutKey]
  );

  useEffect(
    () => () => {
      if (layoutSaveTimer.current != null) window.clearTimeout(layoutSaveTimer.current);
    },
    []
  );

  return (
    <div style={{ width: "100%", height: "100%", minHeight: 200 }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodesChange={onNodesChangePersistLayout}
        onEdgesChange={onEdgesChange}
        onNodeClick={onNodeClick}
        onNodeDoubleClick={onNodeDoubleClick}
        onPaneClick={onPaneClick}
        nodesDraggable
        nodesConnectable
        onConnect={onConnect}
        onConnectStart={onConnectStart}
        isValidConnection={isValidConnection}
        elementsSelectable={selectable}
        panOnDrag
        zoomOnScroll
        zoomOnDoubleClick={false}
        fitView
        deleteKeyCode={["Backspace", "Delete"]}
        defaultEdgeOptions={{
          type: "smoothstep",
          style: { stroke: "#9eb0c8", strokeWidth: 2 },
          deletable: true,
          selectable: true,
          interactionWidth: 28,
        }}
        onEdgesDelete={onEdgesDelete}
        onInit={({ fitView }) => fitView({ padding: 0.15 })}
        proOptions={{ hideAttribution: true }}
      >
        <Background />
        <Controls showInteractive={false} />
        <MiniMap pannable zoomable />
        <Panel position="top-right">
          <div
            className="rf-map-edge-hint"
            style={{
              fontSize: 11,
              lineHeight: 1.35,
              maxWidth: 300,
              padding: "6px 10px",
              borderRadius: 6,
              background: "rgba(15, 23, 42, 0.88)",
              color: "#e2e8f0",
              boxShadow: "0 1px 4px rgba(0,0,0,0.25)",
            }}
          >
            {enUi ? (
              <>
                <strong>Links:</strong> blue flow: scene or choice <strong>right</strong> → pool
                hotspot <strong>left</strong> (attach); selector hotspot <strong>right</strong> →
                pool hotspot <strong>left</strong> (attach). <strong>Dashed</strong> only: menu{" "}
                <strong>choice</strong> → non-selector hotspot (session only, not in project file).
                Selector → selector: not supported on map. Console: <code>escape360MapFlow.help()</code>
                . Orphan ↔ scene.{" "}
                <strong>Delete</strong> edge: <kbd>Delete</kbd>. <strong>Copy</strong> hotspot:{" "}
                <kbd>Alt</kbd>. <strong>Orphan → menu:</strong> pool out → choice in (promotion).
              </>
            ) : (
              <>
                <strong>Liaisons (rond bleu) :</strong> scène ou <strong>choix</strong> (sortie
                droite) → hotspot <strong>file d’attente</strong> (entrée gauche) : rattachement DOM ;
                idem <strong>menu selector</strong> → orphelin. <strong>Pointillés</strong> uniquement
                : <strong>choix</strong> de menu → hotspot <strong>non</strong> selector (session,
                pas dans le projet). Menu → menu : non géré sur la carte. Console :{" "}
                <code>escape360MapFlow.help()</code>. Orphelin ↔ scène.{" "}
                <strong>Suppr</strong> arête : <kbd>Suppr</kbd>. <strong>Copier</strong> hotspot :{" "}
                <kbd>Alt</kbd>. <strong>Orphelin → menu :</strong> sortie orphelin → entrée{" "}
                <strong>choix</strong> (<code>choices[]</code>).
              </>
            )}
          </div>
        </Panel>
        <Panel position="bottom-left">
          <div className="rf-map-floating-palette">
            <button
              type="button"
              className="rf-map-palette-toggle"
              title={enUi ? "Add nodes (hotspots, media…)" : "Ajouter des nœuds (hotspots, média…)"}
              onClick={(e) => {
                e.stopPropagation();
                setPaletteOpen((v) => {
                  const next = !v;
                  if (next) {
                    try {
                      const fn = window.getCurrentProjectData;
                      if (typeof fn === "function") {
                        const p = fn();
                        setPaletteSceneIndex(
                          resolveSceneIndexFromActiveKey(
                            p && typeof p === "object" ? p : null
                          )
                        );
                      }
                    } catch {
                      /* ignore */
                    }
                  }
                  return next;
                });
              }}
            >
              + {enUi ? "Add" : "Ajouter"}
            </button>
            {paletteOpen ? (
              <div className="rf-map-palette-dropdown">
                <div className="rf-map-palette-scene-hint">
                  {enUi
                    ? `Hotspots / selectors → unassigned pool · Media → scene ${paletteSceneIndex + 1}`
                    : `Hotspots / sélecteurs → file d'attente · Média → scène ${paletteSceneIndex + 1}`}
                </div>
                <MapAddMenuPanelContent
                  lang={hostLang()}
                  sceneIndex={paletteSceneIndex}
                  onPick={() => setPaletteOpen(false)}
                />
              </div>
            ) : null}
          </div>
        </Panel>
      </ReactFlow>
    </div>
  );
}

export default function App() {
  return (
    <ReactFlowProvider>
      <InnerMap />
    </ReactFlowProvider>
  );
}
