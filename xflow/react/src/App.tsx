import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type MouseEvent,
} from "react";
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
  type EdgeChange,
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
  type MapRewardTargetNodeData,
  type MapSceneNodeData,
  type MapSelectorChoiceNodeData,
  buildProjectMapGraph,
  EDITOR_MAP_STAGING_SCENE_KEY,
  recomputeMapLayoutGroups,
  sceneKey,
} from "./mapGraphBuild";
import { MapAddMenuPanelContent } from "./mapAddMenuUi";
import { isValidMapFlowConnection, isValidMapRewardConnection } from "./mapConnectionPolicy";
import { isFlowEastToWestConnection, isMetaSouthToNorthConnection } from "./mapConnectionMatrix";
import { RF_REWARD_IN, RF_REWARD_OUT } from "./mapFlowHandles";
import { computeReactMapLayoutStorageKey, inferRewardOverlayFromProject } from "./mapLayoutFile";
import { createMinimalRewardActionV2 } from "./mapRewardActionV2";
import {
  deserializeRewardOverlay,
  emptyRewardOverlay,
  mergeRewardOverlay,
  pruneRewardOverlayForHotspotGraphId,
  pruneRewardOverlayToGraph,
  rewardOverlayStorageKey,
  serializeRewardOverlay,
  type RewardOverlayState,
} from "./mapRewardOverlayMerge";
import { MapRewardToolbar } from "./mapRewardToolbar";
import {
  MapHotspotNode,
  MapRedirectNode,
  MapResourceNode,
  MapRewardTargetNode,
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
    applyMapHotspotRewardAction?: (
      sceneIndex: number,
      hotspotIndex: number,
      rewardAction: Record<string, unknown> | null
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
  mapRewardTarget: MapRewardTargetNode,
};

function hostLang(): EditorLang {
  return document.documentElement.lang.toLowerCase().startsWith("en") ? "en" : "fr";
}

function readNarrationOnly(): boolean {
  const el = document.getElementById("project-map-narration-only");
  return el instanceof HTMLInputElement && el.checked;
}

/** `hs_12` → id nœud graphe `hs:<sceneKey>:<index>` (aligné sur applyMap* côté hôte). */
function resolveGraphHotspotIdFromDomId(domId: string): string | null {
  const m = /^hs_(\d+)$/.exec(domId);
  if (!m) return null;
  const blocks = document.querySelectorAll("#scenes-container > .scene-block");
  for (let si = 0; si < blocks.length; si++) {
    const wrap = blocks[si].querySelector('[id^="hs-container-"]');
    if (!wrap) continue;
    const hss = wrap.querySelectorAll(":scope > .hotspot-block");
    for (let hi = 0; hi < hss.length; hi++) {
      if (hss[hi].id !== domId) continue;
      const fn = window.getCurrentProjectData;
      const project = typeof fn === "function" ? fn() : null;
      const scene = project?.scenes?.[si];
      if (!scene) return null;
      return `hs:${sceneKey(scene, si)}:${hi}`;
    }
  }
  return null;
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

/** Graphe projet sans overlay récompense — pour `layoutKey` / IDs hotspots à l’hydratation session. */
function buildProjectMapGraphBase(project: EditorProject | null): {
  nodes: Node[];
  edges: Edge[];
  layoutKey: string;
  activeSceneKey: string | null;
} {
  const viewMode = (window._projectMapViewMode || "full") as "focus" | "full" | "tree";
  const activeSceneKey = window._projectMapActiveSceneKey ?? null;
  const narr = readNarrationOnly();
  const lang = hostLang();
  if (!project?.scenes?.length) {
    const layoutKey = computeReactMapLayoutStorageKey(project);
    return { nodes: [], edges: [], layoutKey, activeSceneKey: null };
  }
  const { nodes, edges, activeSceneKey: nextActive } = buildProjectMapGraph(project, {
    viewMode,
    activeSceneKey,
    narrationOnly: narr,
    lang,
  });
  const layoutKey = computeReactMapLayoutStorageKey(project);
  return { nodes, edges, layoutKey, activeSceneKey: nextActive };
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
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [paletteSceneIndex, setPaletteSceneIndex] = useState(0);
  const [rewardOverlay, setRewardOverlay] = useState<RewardOverlayState>(() => emptyRewardOverlay());
  const rewardOverlayHydratedRef = useRef(false);
  const layoutKeyPersistRef = useRef("");
  const packHotspotIdsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    const onBus = (ev: Event) => {
      const ce = ev as CustomEvent<{ type?: string; hotspotDomId?: string }>;
      const t = ce.detail?.type;
      if (!t) return;
      if (t === "rewardOverlayInvalidate") {
        const domId = ce.detail?.hotspotDomId;
        if (domId) {
          const graphHsId = resolveGraphHotspotIdFromDomId(domId);
          if (graphHsId) {
            setRewardOverlay((prev) => pruneRewardOverlayForHotspotGraphId(prev, graphHsId));
          }
        }
        return;
      }
      bump();
    };
    document.addEventListener("react-project-map", onBus);
    return () => document.removeEventListener("react-project-map", onBus);
  }, [bump]);

  useEffect(() => {
    const modal = document.getElementById("project-map-modal");
    if (modal && modal.style.display === "flex") bump();
  }, [bump]);

  const pack = useMemo(() => {
    const project = readProject();
    const viewMode = (window._projectMapViewMode || "full") as "focus" | "full" | "tree";
    const { nodes, edges, layoutKey, activeSceneKey: nextActive } = buildProjectMapGraphBase(project);
    if (viewMode === "focus" && nextActive) {
      window._projectMapActiveSceneKey = nextActive;
    }
    let savedPos: Record<string, { x: number; y: number }> | null = null;
    try {
      const raw = sessionStorage.getItem(layoutKey);
      if (raw) {
        const parsed = JSON.parse(raw) as unknown;
        if (parsed && typeof parsed === "object") {
          savedPos = parsed as Record<string, { x: number; y: number }>;
        }
      }
    } catch {
      /* ignore */
    }
    const merged = mergeRewardOverlay(nodes, edges, rewardOverlay, savedPos);
    return { nodes: merged.nodes, edges: merged.edges, layoutKey };
  }, [graphRev, rewardOverlay]);

  const rewardWarnings = useMemo(() => {
    const pl = hostLang();
    const hs = pack.nodes.filter((n) => {
      if (n.type !== "mapHotspot") return false;
      const d = n.data as MapHotspotNodeData;
      const t = String(d.actionType || "").trim();
      return t === "req" || t === "pwd";
    });
    const missing = hs.filter(
      (n) => !pack.edges.some((e) => e.source === n.id && e.sourceHandle === RF_REWARD_OUT)
    );
    return missing.map((n) => {
      const d = n.data as MapHotspotNodeData;
      const lab = d.label || (pl === "en" ? "Hotspot" : "Hotspot");
      return pl === "en" ? `${lab} · REQ/PWD needs reward ★` : `${lab} · REQ/PWD sans cible ★`;
    });
  }, [pack.nodes, pack.edges]);

  const [nodes, setNodes, onNodesChange] = useNodesState(pack.nodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(pack.edges);

  useEffect(() => {
    setNodes(pack.nodes);
    setEdges(pack.edges);
  }, [pack, setNodes, setEdges]);

  layoutKeyPersistRef.current = pack.layoutKey;
  packHotspotIdsRef.current = new Set(
    pack.nodes.filter((n) => n.type === "mapHotspot").map((n) => n.id)
  );

  useLayoutEffect(() => {
    rewardOverlayHydratedRef.current = false;
    const project = readProject();
    const lang = hostLang();
    const { nodes: baseNodes } = buildProjectMapGraphBase(project);
    const ids = new Set(baseNodes.filter((n) => n.type === "mapHotspot").map((n) => n.id));
    let next = emptyRewardOverlay();
    try {
      const raw = sessionStorage.getItem(rewardOverlayStorageKey(pack.layoutKey));
      if (raw) {
        next = deserializeRewardOverlay(JSON.parse(raw) as unknown, ids);
      }
    } catch {
      /* ignore */
    }
    const hasReward =
      next.edges.length > 0 ||
      next.stubNodes.length > 0 ||
      Object.keys(next.patchByHotspotId).length > 0;
    if (!hasReward && project?.scenes?.length) {
      const inferred = inferRewardOverlayFromProject(project, lang, ids, baseNodes);
      if (inferred.edges.length > 0) next = inferred;
    }
    setRewardOverlay(next);
    rewardOverlayHydratedRef.current = true;
  }, [pack.layoutKey]);

  useEffect(() => {
    if (!rewardOverlayHydratedRef.current) return;
    try {
      const pruned = pruneRewardOverlayToGraph(packHotspotIdsRef.current, rewardOverlay);
      sessionStorage.setItem(
        rewardOverlayStorageKey(layoutKeyPersistRef.current),
        JSON.stringify(serializeRewardOverlay(pruned))
      );
    } catch {
      /* ignore */
    }
  }, [rewardOverlay]);

  useEffect(() => {
    const project = readProject();
    const { nodes: baseNodes } = buildProjectMapGraphBase(project);
    const ids = new Set(baseNodes.filter((n) => n.type === "mapHotspot").map((n) => n.id));
    setRewardOverlay((prev) => pruneRewardOverlayToGraph(ids, prev));
  }, [graphRev]);

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
    (c: Connection) =>
      isValidMapFlowConnection({
        nodes,
        connection: c,
        altConnect: altConnectRef.current,
      }),
    [nodes]
  );

  const onConnect = useCallback(
    (c: Connection) => {
      try {
        const sNode = nodes.find((n) => n.id === c.source);
        const tNode = nodes.find((n) => n.id === c.target);
        if (!sNode || !tNode) return;
        if (
          isValidMapRewardConnection({
            nodes,
            connection: c,
            altConnect: altConnectRef.current,
          })
        ) {
          const rw = tNode.data as MapRewardTargetNodeData;
          const draft = createMinimalRewardActionV2(rw.rewardKind);
          setRewardOverlay((prev) => {
            const nextEdges = prev.edges.filter(
              (e) => !(e.source === c.source && e.sourceHandle === RF_REWARD_OUT)
            );
            nextEdges.push({
              id: `e:rw:${c.source}>${c.target}`,
              source: c.source,
              target: c.target,
              sourceHandle: RF_REWARD_OUT,
              targetHandle: RF_REWARD_IN,
              type: "smoothstep",
              style: { stroke: "#f59e0b", strokeWidth: 2 },
            });
            return {
              ...prev,
              edges: nextEdges,
              patchByHotspotId: {
                ...prev.patchByHotspotId,
                [c.source]: { rewardType: rw.rewardKind, rewardActionDraft: draft },
              },
            };
          });
          const hd = sNode.data as MapHotspotNodeData;
          queueMicrotask(() => {
            window.applyMapHotspotRewardAction?.(
              hd.sceneIndex,
              hd.hotspotIndex,
              draft as unknown as Record<string, unknown>
            );
          });
          return;
        }
        if (sNode.type === "mapScene" && tNode.type === "mapHotspot") {
          const sd = sNode.data as MapSceneNodeData;
          const hd = tNode.data as MapHotspotNodeData;
          if (!isFlowEastToWestConnection(c)) return;
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
          if (!isFlowEastToWestConnection(c)) return;
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
          if (!isFlowEastToWestConnection(c)) return;
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
          if (!isFlowEastToWestConnection(c)) return;
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
            bump();
          }
          return;
        }
        if (sNode.type === "mapHotspot" && tNode.type === "mapHotspot") {
          const sd = sNode.data as MapHotspotNodeData;
          const td = tNode.data as MapHotspotNodeData;
          if (!isFlowEastToWestConnection(c)) return;
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
          return;
        }
        if (sNode.type === "mapSelectorChoice" && tNode.type === "mapScene") {
          const cd = sNode.data as MapSelectorChoiceNodeData;
          const td = tNode.data as MapSceneNodeData;
          if (!isFlowEastToWestConnection(c)) return;
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
          if (!isFlowEastToWestConnection(c)) return;
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
        if (!isMetaSouthToNorthConnection(c)) return;
        const rd = tNode.data as MapResourceNodeData;
        if (sNode.type === "mapScene") {
          const sd = sNode.data as MapSceneNodeData;
          window.applyMapSceneMediaConnection?.(sd.sceneIndex, rd.resourceType, rd.url, rd.volume);
          return;
        }
        if (sNode.type === "mapHotspot") {
          if (rd.resourceType !== "hotspotSfx") return;
          const hd = sNode.data as MapHotspotNodeData;
          window.applyMapHotspotSfxConnection?.(hd.sceneIndex, hd.hotspotIndex, rd.url, rd.volume);
          return;
        }
        if (sNode.type === "mapSelectorChoice" && rd.resourceType === "choiceSfx") {
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
      const rewardRemoved = removed.filter(
        (e) => e.sourceHandle === RF_REWARD_OUT && e.targetHandle === RF_REWARD_IN
      );
      if (rewardRemoved.length > 0) {
        setRewardOverlay((prev) => {
          const removedIds = new Set(rewardRemoved.map((e) => e.id));
          const nextEdges = prev.edges.filter((e) => !removedIds.has(e.id));
          const patch = { ...prev.patchByHotspotId };
          for (const e of rewardRemoved) {
            delete patch[e.source];
          }
          return { ...prev, edges: nextEdges, patchByHotspotId: patch };
        });
        queueMicrotask(() => {
          for (const e of rewardRemoved) {
            const srcNode = nodes.find((n) => n.id === e.source);
            if (srcNode?.type !== "mapHotspot") continue;
            const hd = srcNode.data as MapHotspotNodeData;
            window.applyMapHotspotRewardAction?.(hd.sceneIndex, hd.hotspotIndex, null);
          }
        });
      }
      for (const edge of removed) {
        if (!isFlowEastToWestConnection(edge)) continue;
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
    [nodes]
  );

  const onEdgesChangeWrapped = useCallback(
    (changes: EdgeChange[]) => {
      onEdgesChange(changes);
      const removeIds = changes
        .filter((c) => c.type === "remove")
        .map((c) => (c as { id?: string }).id)
        .filter((id): id is string => typeof id === "string" && id.length > 0);
      if (removeIds.length === 0) return;
      queueMicrotask(() => {
        setRewardOverlay((prev) => {
          let nextEdges = [...prev.edges];
          const patch = { ...prev.patchByHotspotId };
          let touched = false;
          const rewardSources: string[] = [];
          for (const rid of removeIds) {
            const hit = nextEdges.find((e) => e.id === rid);
            if (!hit || hit.sourceHandle !== RF_REWARD_OUT) continue;
            nextEdges = nextEdges.filter((e) => e.id !== rid);
            delete patch[hit.source];
            rewardSources.push(hit.source);
            touched = true;
          }
          if (touched && rewardSources.length) {
            queueMicrotask(() => {
              for (const sid of rewardSources) {
                const srcNode = store.getState().nodes.find((n) => n.id === sid);
                if (srcNode?.type !== "mapHotspot") continue;
                const hd = srcNode.data as MapHotspotNodeData;
                window.applyMapHotspotRewardAction?.(hd.sceneIndex, hd.hotspotIndex, null);
              }
            });
          }
          return touched ? { ...prev, edges: nextEdges, patchByHotspotId: patch } : prev;
        });
      });
    },
    [onEdgesChange, store]
  );

  const onNodesDelete = useCallback((removed: Node[]) => {
    const rwIds = new Set(removed.filter((n) => n.type === "mapRewardTarget").map((n) => n.id));
    if (rwIds.size === 0) return;
    setRewardOverlay((prev) => {
      const stubNodes = prev.stubNodes.filter((n) => !rwIds.has(n.id));
      const lostSources = prev.edges.filter((e) => rwIds.has(e.target)).map((e) => e.source);
      const nextEdges = prev.edges.filter((e) => !rwIds.has(e.target) && !rwIds.has(e.source));
      const patch = { ...prev.patchByHotspotId };
      for (const sid of lostSources) {
        delete patch[sid];
      }
      return { ...prev, stubNodes, edges: nextEdges, patchByHotspotId: patch };
    });
  }, []);

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
        const live = store.getState().nodes;
        setRewardOverlay((prev) => {
          let touched = false;
          const stubNodes = prev.stubNodes.map((sn) => {
            const n = live.find((x) => x.id === sn.id);
            if (!n || n.type !== "mapRewardTarget") return sn;
            if (n.position.x === sn.position.x && n.position.y === sn.position.y) return sn;
            touched = true;
            return { ...sn, position: { ...n.position } };
          });
          return touched ? { ...prev, stubNodes } : prev;
        });
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
    [onNodesChange, setNodes, setRewardOverlay, store, pack.layoutKey]
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
        onEdgesChange={onEdgesChangeWrapped}
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
        onNodesDelete={onNodesDelete}
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
                pool hotspot <strong>left</strong> (attach). Menu on queue → scene hotspot: attach
                whole selector. Orphan ↔ scene. <strong>Delete</strong> edge: <kbd>Delete</kbd>.{" "}
                <strong>Copy</strong> hotspot: <kbd>Alt</kbd>. <strong>Orphan → menu:</strong> pool
                out → choice in (promotion).
              </>
            ) : (
              <>
                <strong>Liaisons (rond bleu) :</strong> scène ou <strong>choix</strong> (sortie
                droite) → hotspot <strong>file d’attente</strong> (entrée gauche) : rattachement DOM ;
                idem <strong>menu selector</strong> → orphelin. Menu sur la file → hotspot sur scène
                : déplacement du bloc menu. Orphelin ↔ scène. <strong>Suppr</strong> arête :{" "}
                <kbd>Suppr</kbd>. <strong>Copier</strong> hotspot : <kbd>Alt</kbd>.{" "}
                <strong>Orphelin → menu :</strong> sortie orphelin → entrée <strong>choix</strong>{" "}
                (<code>choices[]</code>).
              </>
            )}
          </div>
        </Panel>
        <Panel position="bottom-right">
          <MapRewardToolbar
            lang={hostLang()}
            enUi={enUi}
            warnings={rewardWarnings}
            onAddStub={(node) => {
              setRewardOverlay((prev) => ({ ...prev, stubNodes: [...prev.stubNodes, node] }));
            }}
          />
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
