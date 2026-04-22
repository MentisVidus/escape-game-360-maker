import type { Node } from "@xyflow/react";

import type { EditorLang, EditorProject } from "./mapGraphBuild";
import { sceneKey } from "./mapGraphBuild";
import { RF_REWARD_IN, RF_REWARD_OUT } from "./mapFlowHandles";
import {
  createMinimalRewardActionV2,
  type MapRewardActionDraft,
  type MapRewardTargetKind,
} from "./mapRewardActionV2";
import {
  emptyRewardOverlay,
  type RewardHotspotPatch,
  type RewardOverlayState,
} from "./mapRewardOverlayMerge";

/** Schéma minimal `map-layout.json` (ZIP .escapegame). */
export type MapLayoutFileV1 = {
  version: 1;
  nodes: Record<string, { x: number; y: number }>;
  rewardTargets: Array<{ id: string; kind: MapRewardTargetKind; x: number; y: number }>;
  rewardEdges: Array<{ source: string; target: string }>;
  backgrounds: unknown[];
};

type LooseAction = { type?: string; payload?: Record<string, unknown> } | null | undefined;

/** Aligné sur `buildProjectMapGraphBase` / `js/editor-shared-map-layout.js`. */
export function computeReactMapLayoutStorageKey(project: EditorProject | null): string {
  const viewMode = (typeof window !== "undefined" && (window as { _projectMapViewMode?: string })._projectMapViewMode) || "full";
  let narr = "0";
  if (typeof document !== "undefined") {
    const el = document.getElementById("project-map-narration-only");
    if (el instanceof HTMLInputElement && el.checked) narr = "1";
  }
  const nScenes = project?.scenes?.length ?? 0;
  const title = String(project?.title ?? "").slice(0, 120);
  return `escape360-reactMap-pos:v1:${viewMode}:${narr}:${nScenes}:${title}`;
}

function stubLabel(kind: MapRewardTargetKind, lang: EditorLang): string {
  if (lang === "en") {
    if (kind === "msg") return "Message";
    if (kind === "scene") return "Scene transition";
    if (kind === "pick") return "Pick";
    return "Selector";
  }
  if (kind === "msg") return "Message";
  if (kind === "scene") return "Transition scène";
  if (kind === "pick") return "Objet (pick)";
  return "Menu (selector)";
}

function parseHsNodeId(hsId: string): { sceneKey: string; hotspotIndex: number } | null {
  if (!hsId.startsWith("hs:")) return null;
  const rest = hsId.slice(3);
  const last = rest.lastIndexOf(":");
  if (last <= 0) return null;
  const sk = rest.slice(0, last);
  const hi = parseInt(rest.slice(last + 1), 10);
  if (Number.isNaN(hi)) return null;
  return { sceneKey: sk, hotspotIndex: hi };
}

function findHotspot(
  project: EditorProject,
  targetSceneKey: string,
  hotspotIndex: number
): Record<string, unknown> | null {
  const scenes = project.scenes ?? [];
  for (let si = 0; si < scenes.length; si++) {
    if (sceneKey(scenes[si], si) !== targetSceneKey) continue;
    const hss = scenes[si].hotspots;
    if (!Array.isArray(hss)) return null;
    const hs = hss[hotspotIndex];
    return hs && typeof hs === "object" ? (hs as Record<string, unknown>) : null;
  }
  return null;
}

function readRewardAction(hs: Record<string, unknown> | null): LooseAction {
  if (!hs) return null;
  const a = hs.action as LooseAction;
  if (!a || typeof a !== "object") return null;
  const t = String(a.type || "");
  if (t !== "req" && t !== "pwd") return null;
  const p = a.payload;
  const ra = p && typeof p === "object" ? (p as { rewardAction?: unknown }).rewardAction : undefined;
  return ra && typeof ra === "object" ? (ra as LooseAction) : null;
}

function rewardKindFromAction(ra: LooseAction): MapRewardTargetKind | null {
  if (!ra || typeof ra !== "object") return null;
  const t = String((ra as { type?: string }).type || "").trim();
  if (t === "msg" || t === "scene" || t === "pick" || t === "selector") return t;
  return null;
}

function patchFromRewardAction(ra: LooseAction): RewardHotspotPatch | null {
  const kind = rewardKindFromAction(ra);
  if (!kind) return null;
  return {
    rewardType: kind,
    rewardActionDraft: ra as unknown as MapRewardActionDraft,
  };
}

const REWARD_STUB_DX = 230;

/**
 * Rétrocompat : si `map-layout.json` (et session overlay) absents, reconstruit stubs/arêtes
 * depuis `action.payload.rewardAction` sur les hotspots REQ/PWD du projet.
 */
export function inferRewardOverlayFromProject(
  project: EditorProject | null,
  lang: EditorLang,
  validHotspotIds: Set<string>,
  baseHotspotNodes: Node[]
): RewardOverlayState {
  const out = emptyRewardOverlay();
  if (!project?.scenes?.length) return out;

  const posById = new Map<string, { x: number; y: number }>();
  for (const n of baseHotspotNodes) {
    if (n.type === "mapHotspot") posById.set(n.id, { x: n.position.x, y: n.position.y });
  }

  const scenes = project.scenes ?? [];
  scenes.forEach((scene, si) => {
    const sk = sceneKey(scene, si);
    const hotspots = Array.isArray(scene.hotspots) ? scene.hotspots : [];
    hotspots.forEach((hs, hi) => {
      const rec = hs as Record<string, unknown>;
      const hsId = `hs:${sk}:${hi}`;
      if (!validHotspotIds.has(hsId)) return;
      const ra = readRewardAction(rec);
      if (!ra) return;
      const patch = patchFromRewardAction(ra);
      if (!patch) return;

      const rwtId = `rwt:${sk}:${hi}`;
      const anchor = posById.get(hsId) ?? { x: 120, y: 160 + si * 280 + hi * 24 };
      const stub: Node = {
        id: rwtId,
        type: "mapRewardTarget",
        position: { x: anchor.x + REWARD_STUB_DX, y: anchor.y },
        draggable: true,
        selectable: true,
        data: {
          kind: "rewardTarget",
          rewardKind: patch.rewardType,
          label: stubLabel(patch.rewardType, lang),
          lang,
        },
      };
      out.stubNodes.push(stub);
      out.edges.push({
        id: `e:rw:${hsId}>${rwtId}:infer`,
        source: hsId,
        target: rwtId,
        sourceHandle: RF_REWARD_OUT,
        targetHandle: RF_REWARD_IN,
        type: "smoothstep",
        style: { stroke: "#f59e0b", strokeWidth: 2 },
      });
      out.patchByHotspotId[hsId] = patch;
    });
  });

  return out;
}

/** Sérialise positions + overlay récompense au format `map-layout.json` v1. */
export function serializeMapLayout(
  nodePositionsById: Record<string, { x: number; y: number }>,
  overlay: RewardOverlayState
): MapLayoutFileV1 {
  const rewardTargets: MapLayoutFileV1["rewardTargets"] = [];
  for (const sn of overlay.stubNodes) {
    if (sn.type !== "mapRewardTarget") continue;
    const d = sn.data as Record<string, unknown>;
    const kind = String(d.rewardKind || "scene") as MapRewardTargetKind;
    const safeKind: MapRewardTargetKind =
      kind === "msg" || kind === "scene" || kind === "pick" || kind === "selector" ? kind : "scene";
    rewardTargets.push({
      id: sn.id,
      kind: safeKind,
      x: sn.position.x,
      y: sn.position.y,
    });
  }
  const rewardEdges = overlay.edges
    .filter((e) => e.sourceHandle === RF_REWARD_OUT && e.targetHandle === RF_REWARD_IN)
    .map((e) => ({ source: e.source, target: e.target }));
  return {
    version: 1,
    nodes: { ...nodePositionsById },
    rewardTargets,
    rewardEdges,
    backgrounds: [],
  };
}

/**
 * Relit `map-layout.json` : positions + overlay (patches complétés depuis le projet si besoin).
 */
export function deserializeMapLayout(
  json: unknown,
  project: EditorProject,
  validHotspotIds: Set<string>,
  lang: EditorLang
): { nodePositions: Record<string, { x: number; y: number }>; rewardOverlay: RewardOverlayState } {
  const emptyPos: Record<string, { x: number; y: number }> = {};
  const emptyOverlay = emptyRewardOverlay();
  if (!json || typeof json !== "object") return { nodePositions: emptyPos, rewardOverlay: emptyOverlay };
  const o = json as Record<string, unknown>;
  if (o.version !== 1) return { nodePositions: emptyPos, rewardOverlay: emptyOverlay };

  const nodesRaw = o.nodes;
  const nodePositions: Record<string, { x: number; y: number }> =
    nodesRaw && typeof nodesRaw === "object" ? { ...(nodesRaw as Record<string, { x: number; y: number }>) } : {};

  const targets = Array.isArray(o.rewardTargets) ? o.rewardTargets : [];
  const targetById: Record<string, { id: string; kind: MapRewardTargetKind; x: number; y: number }> = {};
  for (const t of targets) {
    if (!t || typeof t !== "object") continue;
    const row = t as Record<string, unknown>;
    const id = row.id != null ? String(row.id) : "";
    if (!id) continue;
    let kind = String(row.kind || "scene") as MapRewardTargetKind;
    if (kind !== "msg" && kind !== "scene" && kind !== "pick" && kind !== "selector") kind = "scene";
    const x = typeof row.x === "number" ? row.x : 0;
    const y = typeof row.y === "number" ? row.y : 0;
    targetById[id] = { id, kind, x, y };
  }

  const stubNodes: Node[] = [];
  for (const rt of Object.values(targetById)) {
    stubNodes.push({
      id: rt.id,
      type: "mapRewardTarget",
      position: { x: rt.x, y: rt.y },
      draggable: true,
      selectable: true,
      data: {
        kind: "rewardTarget",
        rewardKind: rt.kind,
        label: stubLabel(rt.kind, lang),
        lang,
      },
    });
  }

  const rewardOverlay: RewardOverlayState = {
    stubNodes,
    edges: [],
    patchByHotspotId: {},
  };

  const edgesRaw = Array.isArray(o.rewardEdges) ? o.rewardEdges : [];
  edgesRaw.forEach((e, i) => {
    if (!e || typeof e !== "object") return;
    const row = e as Record<string, unknown>;
    const source = row.source != null ? String(row.source) : "";
    const target = row.target != null ? String(row.target) : "";
    if (!source || !target || !targetById[target]) return;
    if (!validHotspotIds.has(source)) return;
    rewardOverlay.edges.push({
      id: `e:rw:${source}>${target}:${i}`,
      source,
      target,
      sourceHandle: RF_REWARD_OUT,
      targetHandle: RF_REWARD_IN,
      type: "smoothstep",
      style: { stroke: "#f59e0b", strokeWidth: 2 },
    });
    let patch: RewardHotspotPatch | null = null;
    const parsed = parseHsNodeId(source);
    if (parsed) {
      const hs = findHotspot(project, parsed.sceneKey, parsed.hotspotIndex);
      patch = patchFromRewardAction(readRewardAction(hs));
    }
    if (!patch) {
      const rt = targetById[target];
      const draftKind = rt?.kind ?? "scene";
      patch = {
        rewardType: draftKind,
        rewardActionDraft: createMinimalRewardActionV2(draftKind),
      };
    }
    rewardOverlay.patchByHotspotId[source] = patch;
  });

  return { nodePositions, rewardOverlay };
}
