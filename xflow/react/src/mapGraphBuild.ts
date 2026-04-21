import type { Edge, Node } from "@xyflow/react";
import dagre from "dagre";

const SELECTOR_GRAPH_MAX_DEPTH = 48;

export type EditorLang = "fr" | "en";

export type EditorProject = {
  schemaVersion?: number;
  title?: string;
  useGlobalAudio?: boolean;
  globalMusic?: {
    url?: string;
    volume?: number;
  };
  scenes?: EditorScene[];
};

export type EditorScene = {
  id?: string;
  scId?: string;
  title?: string;
  scTitle?: string;
  media?: {
    panoramaUrl?: string;
    ambiance?: {
      url?: string;
      volume?: number;
    };
  };
  scAudio?: string;
  scAudioVol?: number;
  hotspots?: EditorHotspot[];
};

type EditorHotspot = { action?: LooseAction } & Record<string, unknown>;

type LooseAction = { type?: string; payload?: Record<string, unknown> } | null | undefined;

export type MapSceneNodeData = {
  kind: "scene";
  label: string;
  scId: string;
  sceneKey: string;
  sceneIndex: number;
  viewMode: "active" | "collapsed" | "full" | "tree";
  /** Vue arbre : scène jamais atteinte depuis la scène d’entrée (îlot orphelin). */
  orphanIsland?: boolean;
};

export type MapHotspotNodeData = {
  kind: "hotspot";
  label: string;
  actionType: string;
  sceneIndex: number;
  hotspotIndex: number;
  parentSceneKey: string;
  /** Reliure sur la carte : uniquement action `scene` (champ f-target). */
  mapDragSceneOut?: boolean;
  /** Présent si action `selector` : nombre de choix (amorce B3 / lisibilité graphe). */
  selectorChoiceCount?: number;
};

export type MapSelectorChoiceNodeData = {
  kind: "selectorChoice";
  label: string;
  sceneIndex: number;
  hotspotIndex: number;
  choiceIndex: number;
  targetCount: number;
};

export type MapSceneGroupNodeData = {
  kind: "sceneGroup";
  label: string;
  sceneKey: string;
  sceneIndex: number;
  viewMode: "focus" | "full" | "tree";
};

export type MapResourceNodeData = {
  kind: "resource";
  label: string;
  resourceType: "sceneAmbiance" | "sceneImage" | "hotspotSfx" | "globalMusic";
  sceneKey?: string;
  sceneIndex?: number;
  hotspotIndex?: number;
  url: string;
  volume: number;
};

export type MapRedirectNodeData = {
  kind: "redirect";
  label: string;
  targetSceneKey: string;
  targetTitle: string;
};

export type MapGraphOptions = {
  viewMode: "focus" | "full" | "tree";
  activeSceneKey?: string | null;
  narrationOnly: boolean;
  lang: EditorLang;
};

function collectTargetSceneIdsFromAction(
  action: LooseAction,
  out: Record<string, boolean>,
  depthLeft: number
): void {
  if (!action || typeof action !== "object" || depthLeft <= 0) return;
  const t = action.type;
  const p = action.payload || {};
  if (t === "scene") {
    const v = String(p.target ?? "").trim();
    if (v) out[v] = true;
    return;
  }
  if (t === "req") {
    const rr = p.rewardAction as LooseAction;
    if (!rr || typeof rr !== "object" || rr.type !== "scene") return;
    const rp = (rr.payload || {}) as Record<string, unknown>;
    const r = String(rp.target ?? "").trim();
    if (r) out[r] = true;
    return;
  }
  if (t === "pwd") {
    const rp = p.rewardAction as LooseAction;
    if (!rp || typeof rp !== "object" || rp.type !== "scene") return;
    const rpp = (rp.payload || {}) as Record<string, unknown>;
    const pt = String(rpp.target ?? "").trim();
    if (pt) out[pt] = true;
    return;
  }
  if (t === "selector") {
    const nested = (p.nested || {}) as Record<string, unknown>;
    const choices = Array.isArray(nested.choices) ? nested.choices : [];
    for (const ch of choices) {
      if (ch && typeof ch === "object" && "action" in ch) {
        collectTargetSceneIdsFromAction(
          (ch as { action?: LooseAction }).action,
          out,
          depthLeft - 1
        );
      }
    }
  }
}

export function getTargetSceneIdsFromHotspot(hs: EditorHotspot | undefined): string[] {
  const out: Record<string, boolean> = {};
  if (!hs) return [];
  let a = hs.action as LooseAction;
  if (!a || typeof a !== "object") a = hs as unknown as LooseAction;
  collectTargetSceneIdsFromAction(a, out, SELECTOR_GRAPH_MAX_DEPTH);
  return Object.keys(out);
}

export function sceneKey(scene: EditorScene | undefined, index: number): string {
  const k = scene?.id != null ? String(scene.id).trim() : "";
  if (k) return k;
  const sc = scene?.scId != null ? String(scene.scId).trim() : "";
  if (sc) return sc;
  return `__idx_${index}`;
}

export function sceneIdLabel(scene: EditorScene | undefined): string {
  if (!scene) return "—";
  const id = scene.id != null ? String(scene.id).trim() : "";
  if (id) return id;
  if (scene.scId != null && String(scene.scId).trim()) return String(scene.scId).trim();
  return "—";
}

export function sceneTitleForGraph(
  scene: EditorScene | undefined,
  index: number,
  lang: EditorLang
): string {
  if (!scene) return lang === "en" ? `Scene ${index + 1}` : `Scène ${index + 1}`;
  const title = scene.title != null ? String(scene.title).trim() : "";
  if (title) return title;
  const st = scene.scTitle != null ? String(scene.scTitle).trim() : "";
  if (st) return st;
  const id = scene.id != null ? String(scene.id).trim() : "";
  if (id) return id;
  const scId = scene.scId != null ? String(scene.scId).trim() : "";
  if (scId) return scId;
  return lang === "en" ? `Scene ${index + 1}` : `Scène ${index + 1}`;
}

export function sceneLabelWithFallback(
  scene: EditorScene | undefined,
  index: number,
  keyFallback: string,
  lang: EditorLang
): string {
  if (!scene) return keyFallback != null ? String(keyFallback) : "—";
  const hasAny =
    (scene.title && String(scene.title).trim()) ||
    (scene.id && String(scene.id).trim()) ||
    (scene.scTitle && String(scene.scTitle).trim()) ||
    (scene.scId && String(scene.scId).trim());
  if (!hasAny && keyFallback != null && String(keyFallback).trim()) {
    return String(keyFallback).trim();
  }
  return sceneTitleForGraph(scene, index, lang);
}

export function hotspotLabel(hs: EditorHotspot | undefined, index: number): string {
  if (!hs) return `Hotspot ${index + 1}`;
  const t = hs.title != null ? String(hs.title).trim() : "";
  if (t) return t;
  const ht = hs.hsTitle != null ? String(hs.hsTitle).trim() : "";
  if (ht) return ht;
  return `Hotspot ${index + 1}`;
}

export function hotspotActionType(hs: EditorHotspot | undefined): string {
  if (hs && hs.action && typeof hs.action === "object" && "type" in hs.action) {
    return String((hs.action as { type?: string }).type);
  }
  if (hs && typeof (hs as { type?: string }).type === "string") {
    return String((hs as { type: string }).type);
  }
  return "?";
}

/** Nombre de choix pour une action selector V2 (sinon `undefined`). */
export function selectorChoiceCount(hs: EditorHotspot | undefined): number | undefined {
  const choices = selectorChoicesRaw(hs);
  return choices.length > 0 ? choices.length : undefined;
}

function targetSceneIdsFromAction(action: LooseAction): string[] {
  const out: Record<string, boolean> = {};
  if (!action || typeof action !== "object") return [];
  collectTargetSceneIdsFromAction(action, out, SELECTOR_GRAPH_MAX_DEPTH);
  return Object.keys(out);
}

type SelectorChoiceGraphInfo = {
  label: string;
  targetSceneIds: string[];
};

function selectorChoicesRaw(hs: EditorHotspot | undefined): unknown[] {
  const a = hs?.action as LooseAction;
  if (a && a.type === "selector") {
    const p = (a.payload || {}) as Record<string, unknown>;
    const nested = (p.nested || {}) as Record<string, unknown>;
    if (Array.isArray(nested.choices)) return nested.choices;
  }
  const legacyNested = hs && typeof hs === "object" ? (hs as Record<string, unknown>).nested : undefined;
  if (legacyNested && typeof legacyNested === "object") {
    const c = (legacyNested as Record<string, unknown>).choices;
    if (Array.isArray(c)) return c;
  }
  const legacyRaw = hs && typeof hs === "object" ? (hs as Record<string, unknown>).f_sel_choices : undefined;
  if (typeof legacyRaw === "string" && legacyRaw.trim()) {
    try {
      const parsed = JSON.parse(legacyRaw);
      if (Array.isArray(parsed)) return parsed;
    } catch {
      return [];
    }
  }
  return [];
}

function targetSceneIdsFromLegacyChoice(choice: Record<string, unknown>): string[] {
  const out: Record<string, boolean> = {};
  const at = choice.actionType != null ? String(choice.actionType).trim() : "";
  if (at === "scene") {
    const t = choice.target != null ? String(choice.target).trim() : "";
    if (t) out[t] = true;
  } else if (at === "req" || at === "pwd") {
    const reward = at === "req" ? choice.f_req_action : choice.f_pwd_action;
    const rk = reward != null ? String(reward).trim() : "";
    if (rk === "scene") {
      const t = choice.f_target != null ? String(choice.f_target).trim() : "";
      if (t) out[t] = true;
    } else if (rk === "selector") {
      const rn = choice.rewardNested;
      const rChoices =
        rn && typeof rn === "object" && Array.isArray((rn as Record<string, unknown>).choices)
          ? ((rn as Record<string, unknown>).choices as unknown[])
          : [];
      for (let i = 0; i < rChoices.length; i++) {
        const ch = rChoices[i];
        if (!ch || typeof ch !== "object") continue;
        const nestedTargets = targetSceneIdsFromLegacyChoice(ch as Record<string, unknown>);
        for (let j = 0; j < nestedTargets.length; j++) out[nestedTargets[j]] = true;
      }
    }
  } else if (at === "selector") {
    const nested = choice.nested;
    const nChoices =
      nested && typeof nested === "object" && Array.isArray((nested as Record<string, unknown>).choices)
        ? ((nested as Record<string, unknown>).choices as unknown[])
        : [];
    for (let i = 0; i < nChoices.length; i++) {
      const ch = nChoices[i];
      if (!ch || typeof ch !== "object") continue;
      const nestedTargets = targetSceneIdsFromLegacyChoice(ch as Record<string, unknown>);
      for (let j = 0; j < nestedTargets.length; j++) out[nestedTargets[j]] = true;
    }
  }
  return Object.keys(out);
}

function selectorChoicesForGraph(
  hs: EditorHotspot | undefined,
  lang: EditorLang
): SelectorChoiceGraphInfo[] {
  const choices = selectorChoicesRaw(hs);
  if (choices.length === 0) return [];
  const defaultPrefix = lang === "en" ? "Choice" : "Choix";
  return choices.map((raw, idx) => {
    let label = `${defaultPrefix} ${idx + 1}`;
    let targetSceneIds: string[] = [];
    if (raw && typeof raw === "object") {
      const ro = raw as Record<string, unknown>;
      const direct = ro.label != null ? String(ro.label).trim() : "";
      if (direct) {
        label = direct;
      } else {
        const cp = ro.copy as Record<string, unknown> | undefined;
        const viaCopy = cp?.buttonLabel != null ? String(cp.buttonLabel).trim() : "";
        if (viaCopy) label = viaCopy;
      }
      const chAction = ro.action as LooseAction;
      if (chAction && typeof chAction === "object") {
        targetSceneIds = targetSceneIdsFromAction(chAction);
      } else {
        targetSceneIds = targetSceneIdsFromLegacyChoice(ro);
      }
    }
    return { label, targetSceneIds };
  });
}

export function findSceneByKey(
  project: EditorProject,
  key: string
): { scene: EditorScene; index: number; key: string } | null {
  const scenes = project.scenes || [];
  for (let i = 0; i < scenes.length; i++) {
    const sk = sceneKey(scenes[i], i);
    if (sk === key) return { scene: scenes[i], index: i, key: sk };
  }
  return null;
}

function keepHotspotForNarration(hs: EditorHotspot, validIds: Record<string, boolean>): boolean {
  const ids = getTargetSceneIdsFromHotspot(hs);
  for (let i = 0; i < ids.length; i++) {
    const t = (ids[i] || "").trim();
    if (t && validIds[t]) return true;
  }
  return false;
}

export function filterProjectForNarrationSkeleton(
  project: EditorProject,
  lang: EditorLang
): EditorProject {
  let p: EditorProject;
  try {
    p = JSON.parse(JSON.stringify(project)) as EditorProject;
  } catch {
    return project;
  }
  const scenes = p.scenes || [];
  const validIds: Record<string, boolean> = {};
  for (let si = 0; si < scenes.length; si++) {
    const s = scenes[si];
    const id = s && s.id != null ? String(s.id).trim() : "";
    if (id) validIds[id] = true;
  }
  for (let si = 0; si < scenes.length; si++) {
    const sc = scenes[si];
    if (!sc || !Array.isArray(sc.hotspots)) continue;
    sc.hotspots = sc.hotspots.filter((hs) =>
      keepHotspotForNarration(hs as EditorHotspot, validIds)
    );
  }
  return p;
}

type Pos = { sx: number; sy: number };

function computeFullViewPositionsByDepth(project: EditorProject): Record<string, Pos> {
  const scenes = project.scenes || [];
  const posByKey: Record<string, Pos> = {};
  if (scenes.length === 0) return posByKey;

  const entryKey = sceneKey(scenes[0], 0);
  const queue: { key: string; level: number }[] = [{ key: entryKey, level: 0 }];
  const visited = new Set<string>();
  const levelByKey: Record<string, number> = {};

  while (queue.length > 0) {
    const cur = queue.shift()!;
    const k = cur.key;
    const lv = cur.level;
    if (visited.has(k)) continue;
    visited.add(k);
    levelByKey[k] = lv;

    const meta = findSceneByKey(project, k);
    if (!meta) continue;
    const hsList = Array.isArray(meta.scene.hotspots) ? meta.scene.hotspots : [];
    for (let hi = 0; hi < hsList.length; hi++) {
      const tids = getTargetSceneIdsFromHotspot(hsList[hi] as EditorHotspot);
      for (let ti = 0; ti < tids.length; ti++) {
        const t = tids[ti];
        if (t && findSceneByKey(project, t) && !visited.has(t)) {
          queue.push({ key: t, level: lv + 1 });
        }
      }
    }
  }

  let maxL = 0;
  Object.keys(levelByKey).forEach((k2) => {
    maxL = Math.max(maxL, levelByKey[k2]);
  });

  scenes.forEach((scene, si) => {
    const sk = sceneKey(scene, si);
    if (levelByKey[sk] === undefined) {
      levelByKey[sk] = maxL + 1;
    }
  });

  maxL = 0;
  Object.keys(levelByKey).forEach((k3) => {
    maxL = Math.max(maxL, levelByKey[k3]);
  });

  const byLevel: Record<number, string[]> = {};
  scenes.forEach((scene, si) => {
    const sk = sceneKey(scene, si);
    const lev = levelByKey[sk];
    if (!byLevel[lev]) byLevel[lev] = [];
    byLevel[lev].push(sk);
  });

  const LEVEL_DX = 520;
  const ROW_DY = 280;
  const ORIGIN_X = 50;
  const ORIGIN_Y = 50;

  Object.keys(byLevel)
    .map((x) => parseInt(x, 10))
    .sort((a, b) => a - b)
    .forEach((lev) => {
      const list = byLevel[lev];
      for (let j = 0; j < list.length; j++) {
        posByKey[list[j]] = {
          sx: ORIGIN_X + lev * LEVEL_DX,
          sy: ORIGIN_Y + j * ROW_DY,
        };
      }
    });

  return posByKey;
}

let edgeSeq = 0;
function nextEdgeId(): string {
  return `e:${edgeSeq++}`;
}

/** Arêtes avec handles explicites (nœuds custom @xyflow/react). */
function pushMapEdge(edges: Edge[], source: string, target: string): void {
  edges.push({
    id: nextEdgeId(),
    source,
    target,
    sourceHandle: "out",
    targetHandle: "in",
    type: "smoothstep",
  });
}

function pushMapMetaEdge(edges: Edge[], source: string, target: string): void {
  edges.push({
    id: nextEdgeId(),
    source,
    target,
    sourceHandle: "metaOut",
    targetHandle: "metaIn",
    type: "smoothstep",
    style: { stroke: "#c084fc", strokeDasharray: "4 4", strokeWidth: 1.8 },
  });
}

function readSceneAmbiance(scene: EditorScene | undefined): { url: string; volume: number } | null {
  if (!scene) return null;
  const viaMedia = scene.media?.ambiance;
  const url =
    viaMedia?.url != null && String(viaMedia.url).trim()
      ? String(viaMedia.url).trim()
      : scene.scAudio != null && String(scene.scAudio).trim()
        ? String(scene.scAudio).trim()
        : "";
  if (!url) return null;
  const rawVol =
    viaMedia?.volume != null && !Number.isNaN(Number(viaMedia.volume))
      ? Number(viaMedia.volume)
      : scene.scAudioVol != null && !Number.isNaN(Number(scene.scAudioVol))
        ? Number(scene.scAudioVol)
        : 1;
  const volume = Math.max(0, Math.min(1, rawVol));
  return { url, volume };
}

function readScenePanorama(scene: EditorScene | undefined): { url: string } | null {
  if (!scene) return null;
  const viaMedia = scene.media?.panoramaUrl;
  const url =
    viaMedia != null && String(viaMedia).trim()
      ? String(viaMedia).trim()
      : scene && (scene as Record<string, unknown>).scImg != null && String((scene as Record<string, unknown>).scImg).trim()
        ? String((scene as Record<string, unknown>).scImg).trim()
        : "";
  if (!url) return null;
  return { url };
}

function readHotspotSfx(hs: EditorHotspot | undefined): { url: string; volume: number } | null {
  if (!hs || typeof hs !== "object") return null;
  const a = hs.action as Record<string, unknown> | undefined;
  const sfx = a && typeof a.sfx === "object" ? (a.sfx as Record<string, unknown>) : null;
  const rawUrl =
    (sfx && sfx.url != null ? String(sfx.url).trim() : "") ||
    ((hs as Record<string, unknown>).sfxUrl != null
      ? String((hs as Record<string, unknown>).sfxUrl).trim()
      : "") ||
    ((hs as Record<string, unknown>).f_sfx_url != null
      ? String((hs as Record<string, unknown>).f_sfx_url).trim()
      : "");
  if (!rawUrl) return null;
  const rawVol =
    sfx && sfx.volume != null
      ? Number(sfx.volume)
      : (hs as Record<string, unknown>).sfxVolume != null
        ? Number((hs as Record<string, unknown>).sfxVolume)
        : (hs as Record<string, unknown>).f_sfx_vol != null
          ? Number((hs as Record<string, unknown>).f_sfx_vol)
          : 1;
  const volume = Number.isNaN(rawVol) ? 1 : Math.max(0, Math.min(1, rawVol));
  return { url: rawUrl, volume };
}

function pushSceneGroupNode(
  nodes: Node[],
  id: string,
  x: number,
  y: number,
  w: number,
  h: number,
  data: MapSceneGroupNodeData & { lang: EditorLang }
): void {
  nodes.push({
    id,
    type: "mapSceneGroup",
    position: { x, y },
    draggable: false,
    selectable: false,
    data,
    style: {
      width: Math.max(220, w),
      height: Math.max(180, h),
    },
  });
}

type LayoutSize = { width: number; height: number };

function nodeSizeForLayout(n: Node): LayoutSize {
  if (n.type === "mapScene") return { width: 240, height: 120 };
  if (n.type === "mapHotspot") return { width: 220, height: 100 };
  if (n.type === "mapSelectorChoice") return { width: 180, height: 74 };
  if (n.type === "mapResource") return { width: 210, height: 86 };
  if (n.type === "mapRedirect") return { width: 190, height: 82 };
  if (n.style && typeof n.style.width === "number" && typeof n.style.height === "number") {
    return { width: n.style.width, height: n.style.height };
  }
  return { width: 180, height: 80 };
}

function refreshSceneGroupBoundsFromChildren(nodes: Node[]): void {
  const groups = nodes.filter((n) => n.type === "mapSceneGroup");
  if (groups.length === 0) return;
  const PAD_X = 24;
  const PAD_Y = 24;
  groups.forEach((g) => {
    const d = (g.data || {}) as Partial<MapSceneGroupNodeData>;
    const sk = d.sceneKey != null ? String(d.sceneKey) : "";
    if (!sk) return;
    const sceneId = `sc:${sk}`;
    const hsPrefix = `hs:${sk}:`;
    const selPrefix = `sel:${sk}:`;
    const resPrefix = `res:${sk}:`;
    const kids = nodes.filter(
      (n) =>
        n.id === sceneId ||
        n.id.startsWith(hsPrefix) ||
        n.id.startsWith(selPrefix) ||
        n.id.startsWith(resPrefix)
    );
    if (kids.length === 0) return;
    let minX = Number.POSITIVE_INFINITY;
    let minY = Number.POSITIVE_INFINITY;
    let maxX = Number.NEGATIVE_INFINITY;
    let maxY = Number.NEGATIVE_INFINITY;
    kids.forEach((k) => {
      const sz = nodeSizeForLayout(k);
      minX = Math.min(minX, k.position.x);
      minY = Math.min(minY, k.position.y);
      maxX = Math.max(maxX, k.position.x + sz.width);
      maxY = Math.max(maxY, k.position.y + sz.height);
    });
    g.position = { x: minX - PAD_X, y: minY - PAD_Y };
    g.style = {
      ...(g.style || {}),
      width: Math.max(220, maxX - minX + PAD_X * 2),
      height: Math.max(180, maxY - minY + PAD_Y * 2),
    };
  });
}

function applyDagreLayout(nodes: Node[], edges: Edge[]): void {
  const g = new dagre.graphlib.Graph();
  g.setGraph({
    rankdir: "LR",
    ranksep: 120,
    nodesep: 80,
    edgesep: 30,
    marginx: 30,
    marginy: 30,
  });
  g.setDefaultEdgeLabel(() => ({}));

  const layoutNodeIds = new Set<string>();
  nodes.forEach((n) => {
    if (n.type === "mapSceneGroup") return;
    const sz = nodeSizeForLayout(n);
    g.setNode(n.id, { width: sz.width, height: sz.height });
    layoutNodeIds.add(n.id);
  });
  edges.forEach((e) => {
    if (!layoutNodeIds.has(e.source) || !layoutNodeIds.has(e.target)) return;
    g.setEdge(e.source, e.target);
  });

  dagre.layout(g);

  nodes.forEach((n) => {
    if (!layoutNodeIds.has(n.id)) return;
    const p = g.node(n.id) as { x: number; y: number } | undefined;
    if (!p) return;
    const sz = nodeSizeForLayout(n);
    n.position = { x: p.x - sz.width / 2, y: p.y - sz.height / 2 };
  });
  refreshSceneGroupBoundsFromChildren(nodes);
}

function buildGraphFull(
  project: EditorProject,
  lang: EditorLang,
  nodes: Node[],
  edges: Edge[]
): void {
  const scenes = project.scenes || [];
  const sceneKeyToRfId: Record<string, string> = {};
  const posByKey = computeFullViewPositionsByDepth(project);
  const HS_OFFSET_X = 240;
  const HS_OFFSET_Y = 30;
  const HS_STEP_Y = 108;
  const CHOICE_OFFSET_X = 230;
  const CHOICE_STEP_Y = 72;

  scenes.forEach((scene, si) => {
    const sk = sceneKey(scene, si);
    const title = sceneTitleForGraph(scene, si, lang);
    const hotspots = Array.isArray(scene.hotspots) ? scene.hotspots : [];
    const data: MapSceneNodeData = {
      kind: "scene",
      label: title,
      scId: sceneIdLabel(scene),
      sceneKey: sk,
      sceneIndex: si,
      viewMode: "full",
    };
    const p = posByKey[sk] || { sx: 50, sy: 50 + si * 280 };
    const id = `sc:${sk}`;
    sceneKeyToRfId[sk] = id;
    pushSceneGroupNode(nodes, `sg:${sk}`, p.sx - 30, p.sy - 30, 680, hotspots.length * 108 + 180, {
      kind: "sceneGroup",
      label: title,
      sceneKey: sk,
      sceneIndex: si,
      viewMode: "full",
      lang,
    });
    nodes.push({
      id,
      type: "mapScene",
      position: { x: p.sx, y: p.sy },
      data: { ...data, lang, chrome: "full" as const },
    });
    const amb = readSceneAmbiance(scene);
    if (amb) {
      const rid = `res:${sk}:amb`;
      nodes.push({
        id: rid,
        type: "mapResource",
        position: { x: p.sx + 18, y: p.sy + 156 },
        data: {
          kind: "resource",
          label: lang === "en" ? "Scene ambiance" : "Ambiance scène",
          resourceType: "sceneAmbiance",
          sceneKey: sk,
          sceneIndex: si,
          url: amb.url,
          volume: amb.volume,
          lang,
        } satisfies MapResourceNodeData & { lang: EditorLang },
      });
      pushMapMetaEdge(edges, id, rid);
    }
    const pano = readScenePanorama(scene);
    if (pano) {
      const rid = `res:${sk}:img`;
      nodes.push({
        id: rid,
        type: "mapResource",
        position: { x: p.sx + 248, y: p.sy + 156 },
        data: {
          kind: "resource",
          label: lang === "en" ? "Scene image" : "Image scène",
          resourceType: "sceneImage",
          sceneKey: sk,
          sceneIndex: si,
          url: pano.url,
          volume: 1,
          lang,
        } satisfies MapResourceNodeData & { lang: EditorLang },
      });
      pushMapMetaEdge(edges, id, rid);
    }
  });

  if (project.useGlobalAudio && project.globalMusic && String(project.globalMusic.url || "").trim()) {
    const gurl = String(project.globalMusic.url || "").trim();
    const gvolRaw = Number(project.globalMusic.volume ?? 0.5);
    const gvol = Number.isNaN(gvolRaw) ? 0.5 : Math.max(0, Math.min(1, gvolRaw));
    nodes.push({
      id: "res:global:music",
      type: "mapResource",
      position: { x: 30, y: -20 },
      data: {
        kind: "resource",
        label: lang === "en" ? "Global music" : "Musique globale",
        resourceType: "globalMusic",
        url: gurl,
        volume: gvol,
        lang,
      } satisfies MapResourceNodeData & { lang: EditorLang },
    });
  }

  scenes.forEach((scene, si) => {
    const sk = sceneKey(scene, si);
    const sceneNodeId = sceneKeyToRfId[sk];
    if (!sceneNodeId) return;
    const p = posByKey[sk] || { sx: 50, sy: 50 + si * 280 };
    const sx = p.sx;
    const sy = p.sy;
    const hotspots = Array.isArray(scene.hotspots) ? scene.hotspots : [];
    hotspots.forEach((hs, hi) => {
      const label = hotspotLabel(hs as EditorHotspot, hi);
      const at = hotspotActionType(hs as EditorHotspot);
      const selN = selectorChoiceCount(hs as EditorHotspot);
      const mapDragSceneOut = at === "scene";
      const hsId = `hs:${sk}:${hi}`;
      const hx = sx + HS_OFFSET_X;
      const hy = sy + HS_OFFSET_Y + hi * HS_STEP_Y;
      nodes.push({
        id: hsId,
        type: "mapHotspot",
        position: { x: hx, y: hy },
        data: {
          kind: "hotspot",
          label,
          actionType: at,
          sceneIndex: si,
          hotspotIndex: hi,
          parentSceneKey: sk,
          lang,
          mapDragSceneOut,
          ...(selN !== undefined ? { selectorChoiceCount: selN } : {}),
        } satisfies MapHotspotNodeData & { lang: EditorLang },
      });
      const hsSfx = readHotspotSfx(hs as EditorHotspot);
      if (hsSfx) {
        const rsId = `res:${sk}:hs:${hi}:sfx`;
        nodes.push({
          id: rsId,
          type: "mapResource",
          position: { x: hx + 240, y: hy + 10 },
          data: {
            kind: "resource",
            label: lang === "en" ? "Hotspot SFX" : "SFX hotspot",
            resourceType: "hotspotSfx",
            sceneKey: sk,
            sceneIndex: si,
            hotspotIndex: hi,
            url: hsSfx.url,
            volume: hsSfx.volume,
            lang,
          } satisfies MapResourceNodeData & { lang: EditorLang },
        });
        pushMapMetaEdge(edges, hsId, rsId);
      }
      pushMapEdge(edges, sceneNodeId, hsId);
      const selectorChoices = at === "selector" ? selectorChoicesForGraph(hs as EditorHotspot, lang) : [];
      if (selectorChoices.length > 0) {
        const baseCy = hy - ((selectorChoices.length - 1) * CHOICE_STEP_Y) / 2;
        for (let ci = 0; ci < selectorChoices.length; ci++) {
          const ch = selectorChoices[ci];
          const cid = `sel:${sk}:${hi}:${ci}`;
          nodes.push({
            id: cid,
            type: "mapSelectorChoice",
            position: { x: hx + CHOICE_OFFSET_X, y: baseCy + ci * CHOICE_STEP_Y },
            draggable: false,
            selectable: true,
            data: {
              kind: "selectorChoice",
              label: ch.label,
              sceneIndex: si,
              hotspotIndex: hi,
              choiceIndex: ci,
              targetCount: ch.targetSceneIds.length,
              lang,
            } satisfies MapSelectorChoiceNodeData & { lang: EditorLang },
          });
          pushMapEdge(edges, hsId, cid);
          for (let tj = 0; tj < ch.targetSceneIds.length; tj++) {
            const targetId = ch.targetSceneIds[tj];
            const targetNid = sceneKeyToRfId[targetId];
            if (targetNid) {
              pushMapEdge(edges, cid, targetNid);
            }
          }
        }
      } else {
        const targetIds = getTargetSceneIdsFromHotspot(hs as EditorHotspot);
        for (let tj = 0; tj < targetIds.length; tj++) {
          const targetId = targetIds[tj];
          const targetNid = sceneKeyToRfId[targetId];
          if (targetNid) {
            pushMapEdge(edges, hsId, targetNid);
          }
        }
      }
    });
  });
}

function buildGraphFocus(
  project: EditorProject,
  activeSceneKey: string,
  lang: EditorLang,
  nodes: Node[],
  edges: Edge[]
): string {
  const scenes = project.scenes || [];
  if (scenes.length === 0) return activeSceneKey;

  let resolved = findSceneByKey(project, activeSceneKey);
  if (!resolved) {
    resolved = { scene: scenes[0], index: 0, key: sceneKey(scenes[0], 0) };
  }
  const activeKey = resolved.key;
  const activeScene = resolved.scene;
  const sceneKeyToRfId: Record<string, string> = {};

  const ACTIVE_X = 80;
  const ACTIVE_Y = 220;
  const HS_X = 380;
  const HS_START_Y = 60;
  const HS_STEP = 112;
  const CHOICE_OFFSET_X = 230;
  const CHOICE_STEP_Y = 72;
  const STUB_X = 700;
  const STUB_START_Y = 80;
  const STUB_STEP = 100;

  const activeTitle = sceneTitleForGraph(activeScene, resolved.index, lang);
  const activeHotspots = Array.isArray(activeScene.hotspots) ? activeScene.hotspots : [];
  const sceneTop = ACTIVE_Y;
  const sceneBottom = ACTIVE_Y + 120;
  const hasHotspots = activeHotspots.length > 0;
  const hsTop = hasHotspots ? HS_START_Y : sceneTop;
  const hsBottom = hasHotspots ? HS_START_Y + (activeHotspots.length - 1) * HS_STEP + 92 : sceneBottom;
  const groupTop = Math.min(sceneTop, hsTop) - 30;
  const groupBottom = Math.max(sceneBottom, hsBottom) + 30;
  pushSceneGroupNode(
    nodes,
    `sg:${activeKey}`,
    ACTIVE_X - 30,
    groupTop,
    680,
    groupBottom - groupTop,
    {
      kind: "sceneGroup",
      label: activeTitle,
      sceneKey: activeKey,
      sceneIndex: resolved.index,
      viewMode: "focus",
      lang,
    }
  );
  const activeId = `sc:${activeKey}`;
  sceneKeyToRfId[activeKey] = activeId;
  nodes.push({
    id: activeId,
    type: "mapScene",
    position: { x: ACTIVE_X, y: ACTIVE_Y },
    data: {
      kind: "scene",
      label: activeTitle,
      scId: sceneIdLabel(activeScene),
      sceneKey: activeKey,
      sceneIndex: resolved.index,
      viewMode: "active",
      lang,
      chrome: "active" as const,
    },
  });
  const activeAmb = readSceneAmbiance(activeScene);
  if (activeAmb) {
    const rid = `res:${activeKey}:amb`;
    nodes.push({
      id: rid,
      type: "mapResource",
      position: { x: ACTIVE_X + 20, y: ACTIVE_Y + 160 },
      data: {
        kind: "resource",
        label: lang === "en" ? "Scene ambiance" : "Ambiance scène",
        resourceType: "sceneAmbiance",
        sceneKey: activeKey,
        sceneIndex: resolved.index,
        url: activeAmb.url,
        volume: activeAmb.volume,
        lang,
      } satisfies MapResourceNodeData & { lang: EditorLang },
    });
    pushMapMetaEdge(edges, activeId, rid);
  }
  const activePano = readScenePanorama(activeScene);
  if (activePano) {
    const rid = `res:${activeKey}:img`;
    nodes.push({
      id: rid,
      type: "mapResource",
      position: { x: ACTIVE_X + 252, y: ACTIVE_Y + 160 },
      data: {
        kind: "resource",
        label: lang === "en" ? "Scene image" : "Image scène",
        resourceType: "sceneImage",
        sceneKey: activeKey,
        sceneIndex: resolved.index,
        url: activePano.url,
        volume: 1,
        lang,
      } satisfies MapResourceNodeData & { lang: EditorLang },
    });
    pushMapMetaEdge(edges, activeId, rid);
  }
  if (project.useGlobalAudio && project.globalMusic && String(project.globalMusic.url || "").trim()) {
    const gurl = String(project.globalMusic.url || "").trim();
    const gvolRaw = Number(project.globalMusic.volume ?? 0.5);
    const gvol = Number.isNaN(gvolRaw) ? 0.5 : Math.max(0, Math.min(1, gvolRaw));
    const gid = "res:global:music";
    nodes.push({
      id: gid,
      type: "mapResource",
      position: { x: ACTIVE_X + 6, y: ACTIVE_Y - 132 },
      data: {
        kind: "resource",
        label: lang === "en" ? "Global music" : "Musique globale",
        resourceType: "globalMusic",
        url: gurl,
        volume: gvol,
        lang,
      } satisfies MapResourceNodeData & { lang: EditorLang },
    });
    pushMapMetaEdge(edges, activeId, gid);
  }

  const hotspots = Array.isArray(activeScene.hotspots) ? activeScene.hotspots : [];
  const uniqueTargets: string[] = [];
  hotspots.forEach((hs) => {
    const tids = getTargetSceneIdsFromHotspot(hs as EditorHotspot);
    for (let ut = 0; ut < tids.length; ut++) {
      const tid = tids[ut];
      if (!tid || tid === activeKey) continue;
      if (uniqueTargets.indexOf(tid) !== -1) continue;
      if (findSceneByKey(project, tid)) uniqueTargets.push(tid);
    }
  });

  uniqueTargets.forEach((tid, ti) => {
    const meta = findSceneByKey(project, tid);
    if (!meta) return;
    const tTitle = sceneLabelWithFallback(meta.scene, meta.index, tid, lang);
    const stubId = `sc:${tid}`;
    sceneKeyToRfId[tid] = stubId;
    nodes.push({
      id: stubId,
      type: "mapScene",
      position: { x: STUB_X, y: STUB_START_Y + ti * STUB_STEP },
      data: {
        kind: "scene",
        label: tTitle,
        scId: sceneIdLabel(meta.scene),
        sceneKey: tid,
        sceneIndex: meta.index,
        viewMode: "collapsed",
        lang,
        chrome: "collapsed" as const,
      },
    });
  });

  hotspots.forEach((hs, hi) => {
    const label = hotspotLabel(hs as EditorHotspot, hi);
    const at = hotspotActionType(hs as EditorHotspot);
    const selN = selectorChoiceCount(hs as EditorHotspot);
    const mapDragSceneOut = at === "scene";
    const hsId = `hs:${activeKey}:${hi}`;
    nodes.push({
      id: hsId,
      type: "mapHotspot",
      position: { x: HS_X, y: HS_START_Y + hi * HS_STEP },
      data: {
        kind: "hotspot",
        label,
        actionType: at,
        sceneIndex: resolved.index,
        hotspotIndex: hi,
        parentSceneKey: activeKey,
        lang,
        mapDragSceneOut,
        ...(selN !== undefined ? { selectorChoiceCount: selN } : {}),
      } satisfies MapHotspotNodeData & { lang: EditorLang },
    });
    const hsSfx = readHotspotSfx(hs as EditorHotspot);
    if (hsSfx) {
      const rsId = `res:${activeKey}:hs:${hi}:sfx`;
      nodes.push({
        id: rsId,
        type: "mapResource",
        position: { x: HS_X + 242, y: HS_START_Y + hi * HS_STEP + 10 },
        data: {
          kind: "resource",
          label: lang === "en" ? "Hotspot SFX" : "SFX hotspot",
          resourceType: "hotspotSfx",
          sceneKey: activeKey,
          sceneIndex: resolved.index,
          hotspotIndex: hi,
          url: hsSfx.url,
          volume: hsSfx.volume,
          lang,
        } satisfies MapResourceNodeData & { lang: EditorLang },
      });
      pushMapMetaEdge(edges, hsId, rsId);
    }
    pushMapEdge(edges, activeId, hsId);
    const selectorChoices = at === "selector" ? selectorChoicesForGraph(hs as EditorHotspot, lang) : [];
    if (selectorChoices.length > 0) {
      const baseCy = HS_START_Y + hi * HS_STEP - ((selectorChoices.length - 1) * CHOICE_STEP_Y) / 2;
      for (let ci = 0; ci < selectorChoices.length; ci++) {
        const ch = selectorChoices[ci];
        const cid = `sel:${activeKey}:${hi}:${ci}`;
        nodes.push({
          id: cid,
          type: "mapSelectorChoice",
          position: { x: HS_X + CHOICE_OFFSET_X, y: baseCy + ci * CHOICE_STEP_Y },
          draggable: false,
          selectable: true,
          data: {
            kind: "selectorChoice",
            label: ch.label,
            sceneIndex: resolved.index,
            hotspotIndex: hi,
            choiceIndex: ci,
            targetCount: ch.targetSceneIds.length,
            lang,
          } satisfies MapSelectorChoiceNodeData & { lang: EditorLang },
        });
        pushMapEdge(edges, hsId, cid);
        for (let tk = 0; tk < ch.targetSceneIds.length; tk++) {
          const targetId = ch.targetSceneIds[tk];
          const targetNid = sceneKeyToRfId[targetId];
          if (targetNid) {
            pushMapEdge(edges, cid, targetNid);
          }
        }
      }
    } else {
      const targetIds = getTargetSceneIdsFromHotspot(hs as EditorHotspot);
      for (let tk = 0; tk < targetIds.length; tk++) {
        const targetId = targetIds[tk];
        const targetNid = sceneKeyToRfId[targetId];
        if (targetNid) {
          pushMapEdge(edges, hsId, targetNid);
        }
      }
    }
  });

  return activeKey;
}

function buildGraphTree(project: EditorProject, lang: EditorLang, nodes: Node[], edges: Edge[]): void {
  const scenes = project.scenes || [];
  if (scenes.length === 0) return;

  const HS_STEP = 108;
  const HOTSPOT_DX = 230;
  const SUBTREE_GAP = 72;
  const REDIRECT_DX = 380;
  const TARGET_STAGGER_Y = 88;

  const visitedFull = new Set<string>();
  /** Scènes pour lesquelles un nœud `sc:…` a été créé sur le graphe (y compris îlots orphelins). */
  const placedSceneKeys = new Set<string>();
  let redirectCounter = 0;

  function redirectNodeData(targetKey: string): MapRedirectNodeData & { lang: EditorLang } {
    const meta = findSceneByKey(project, targetKey);
    const title = sceneLabelWithFallback(
      meta ? meta.scene : undefined,
      meta ? meta.index : 0,
      targetKey,
      lang
    );
    const head = lang === "en" ? "Shortcut" : "Renvoi";
    return {
      kind: "redirect",
      label: `${head}: ${title}`,
      targetSceneKey: targetKey,
      targetTitle: title,
      lang,
    };
  }

  function placeScene(sk: string, x: number, yCenter: number): { right: number; rootSceneRfId: string | null } {
    const meta = findSceneByKey(project, sk);
    if (!meta) return { right: x, rootSceneRfId: null };

    if (visitedFull.has(sk)) {
      return { right: x, rootSceneRfId: null };
    }

    visitedFull.add(sk);
    placedSceneKeys.add(sk);

    const title = sceneTitleForGraph(meta.scene, meta.index, lang);
    const hsList = Array.isArray(meta.scene.hotspots) ? meta.scene.hotspots : [];
    pushSceneGroupNode(nodes, `sg:${sk}`, x - 30, yCenter - 50, 650, hsList.length * 108 + 200, {
      kind: "sceneGroup",
      label: title,
      sceneKey: sk,
      sceneIndex: meta.index,
      viewMode: "tree",
      lang,
    });
    const sceneRfId = `sc:${sk}`;
    nodes.push({
      id: sceneRfId,
      type: "mapScene",
      position: { x, y: yCenter },
      data: {
        kind: "scene",
        label: title,
        scId: sceneIdLabel(meta.scene),
        sceneKey: sk,
        sceneIndex: meta.index,
        viewMode: "tree",
        lang,
        chrome: "tree" as const,
      },
    });
    const amb = readSceneAmbiance(meta.scene);
    if (amb) {
      const rid = `res:${sk}:amb`;
      nodes.push({
        id: rid,
        type: "mapResource",
        position: { x: x + 18, y: yCenter + 140 },
        data: {
          kind: "resource",
          label: lang === "en" ? "Scene ambiance" : "Ambiance scène",
          resourceType: "sceneAmbiance",
          sceneKey: sk,
          sceneIndex: meta.index,
          url: amb.url,
          volume: amb.volume,
          lang,
        } satisfies MapResourceNodeData & { lang: EditorLang },
      });
      pushMapMetaEdge(edges, sceneRfId, rid);
    }
    const pano = readScenePanorama(meta.scene);
    if (pano) {
      const rid = `res:${sk}:img`;
      nodes.push({
        id: rid,
        type: "mapResource",
        position: { x: x + 246, y: yCenter + 140 },
        data: {
          kind: "resource",
          label: lang === "en" ? "Scene image" : "Image scène",
          resourceType: "sceneImage",
          sceneKey: sk,
          sceneIndex: meta.index,
          url: pano.url,
          volume: 1,
          lang,
        } satisfies MapResourceNodeData & { lang: EditorLang },
      });
      pushMapMetaEdge(edges, sceneRfId, rid);
    }

    const baseHy = yCenter - ((Math.max(hsList.length, 1) - 1) * HS_STEP) / 2;
    let subtreeRight = x + 200;
    let nextChildX = x + HOTSPOT_DX + 280;
    const CHOICE_OFFSET_X = 200;
    const CHOICE_STEP_Y = 70;

    hsList.forEach((hs, i) => {
      const hy = baseHy + i * HS_STEP;
      const label = hotspotLabel(hs as EditorHotspot, i);
      const at = hotspotActionType(hs as EditorHotspot);
      const selN = selectorChoiceCount(hs as EditorHotspot);
      const mapDragSceneOut = at === "scene";
      const hsRfId = `hs:${sk}:${i}`;
      nodes.push({
        id: hsRfId,
        type: "mapHotspot",
        position: { x: x + HOTSPOT_DX, y: hy },
        data: {
          kind: "hotspot",
          label,
          actionType: at,
          sceneIndex: meta.index,
          hotspotIndex: i,
          parentSceneKey: sk,
          lang,
          mapDragSceneOut,
          ...(selN !== undefined ? { selectorChoiceCount: selN } : {}),
        } satisfies MapHotspotNodeData & { lang: EditorLang },
      });
      const hsSfx = readHotspotSfx(hs as EditorHotspot);
      if (hsSfx) {
        const rsId = `res:${sk}:hs:${i}:sfx`;
        nodes.push({
          id: rsId,
          type: "mapResource",
          position: { x: x + HOTSPOT_DX + 240, y: hy + 10 },
          data: {
            kind: "resource",
            label: lang === "en" ? "Hotspot SFX" : "SFX hotspot",
            resourceType: "hotspotSfx",
            sceneKey: sk,
            sceneIndex: meta.index,
            hotspotIndex: i,
            url: hsSfx.url,
            volume: hsSfx.volume,
            lang,
          } satisfies MapResourceNodeData & { lang: EditorLang },
        });
        pushMapMetaEdge(edges, hsRfId, rsId);
      }
      pushMapEdge(edges, sceneRfId, hsRfId);

      const selectorChoices = at === "selector" ? selectorChoicesForGraph(hs as EditorHotspot, lang) : [];
      if (selectorChoices.length > 0) {
        const baseCy = hy - ((selectorChoices.length - 1) * CHOICE_STEP_Y) / 2;
        let branchX = nextChildX;
        for (let ci = 0; ci < selectorChoices.length; ci++) {
          const ch = selectorChoices[ci];
          const choiceId = `sel:${sk}:${i}:${ci}`;
          const cy = baseCy + ci * CHOICE_STEP_Y;
          nodes.push({
            id: choiceId,
            type: "mapSelectorChoice",
            position: { x: x + HOTSPOT_DX + CHOICE_OFFSET_X, y: cy },
            draggable: false,
            selectable: true,
            data: {
              kind: "selectorChoice",
              label: ch.label,
              sceneIndex: meta.index,
              hotspotIndex: i,
              choiceIndex: ci,
              targetCount: ch.targetSceneIds.length,
              lang,
            } satisfies MapSelectorChoiceNodeData & { lang: EditorLang },
          });
          pushMapEdge(edges, hsRfId, choiceId);
          subtreeRight = Math.max(subtreeRight, x + HOTSPOT_DX + CHOICE_OFFSET_X + 170);
          for (let tg = 0; tg < ch.targetSceneIds.length; tg++) {
            const target = ch.targetSceneIds[tg];
            const yBranch = cy + tg * TARGET_STAGGER_Y;
            if (!visitedFull.has(target)) {
              const sub = placeScene(target, branchX, yBranch);
              if (sub.rootSceneRfId) {
                pushMapEdge(edges, choiceId, sub.rootSceneRfId);
              }
              branchX = sub.right + SUBTREE_GAP;
              subtreeRight = Math.max(subtreeRight, sub.right);
            } else {
              const redId = `rd:${redirectCounter++}`;
              nodes.push({
                id: redId,
                type: "mapRedirect",
                position: { x: x + REDIRECT_DX, y: yBranch },
                data: redirectNodeData(target),
              });
              pushMapEdge(edges, choiceId, redId);
              subtreeRight = Math.max(subtreeRight, x + REDIRECT_DX + 200);
            }
          }
        }
        nextChildX = branchX;
        return;
      }

      const targets = getTargetSceneIdsFromHotspot(hs as EditorHotspot);
      if (targets.length === 0) {
        subtreeRight = Math.max(subtreeRight, x + HOTSPOT_DX + 200);
        return;
      }

      let branchX = nextChildX;
      for (let tg = 0; tg < targets.length; tg++) {
        const target = targets[tg];
        const yBranch = hy + tg * TARGET_STAGGER_Y;
        if (!visitedFull.has(target)) {
          const sub = placeScene(target, branchX, yBranch);
          if (sub.rootSceneRfId) {
            pushMapEdge(edges, hsRfId, sub.rootSceneRfId);
          }
          branchX = sub.right + SUBTREE_GAP;
          subtreeRight = Math.max(subtreeRight, sub.right);
        } else {
          const redId = `rd:${redirectCounter++}`;
          nodes.push({
            id: redId,
            type: "mapRedirect",
            position: { x: x + REDIRECT_DX, y: yBranch },
            data: redirectNodeData(target),
          });
          pushMapEdge(edges, hsRfId, redId);
          subtreeRight = Math.max(subtreeRight, x + REDIRECT_DX + 200);
        }
      }
      nextChildX = branchX;
    });

    return { right: subtreeRight, rootSceneRfId: sceneRfId };
  }

  const entryKey = sceneKey(scenes[0], 0);
  const entryPlaced = placeScene(entryKey, 60, 320);
  if (
    entryPlaced.rootSceneRfId &&
    project.useGlobalAudio &&
    project.globalMusic &&
    String(project.globalMusic.url || "").trim()
  ) {
    const gurl = String(project.globalMusic.url || "").trim();
    const gvolRaw = Number(project.globalMusic.volume ?? 0.5);
    const gvol = Number.isNaN(gvolRaw) ? 0.5 : Math.max(0, Math.min(1, gvolRaw));
    const gid = "res:global:music";
    nodes.push({
      id: gid,
      type: "mapResource",
      position: { x: 20, y: 40 },
      data: {
        kind: "resource",
        label: lang === "en" ? "Global music" : "Musique globale",
        resourceType: "globalMusic",
        url: gurl,
        volume: gvol,
        lang,
      } satisfies MapResourceNodeData & { lang: EditorLang },
    });
    pushMapMetaEdge(edges, entryPlaced.rootSceneRfId, gid);
  }

  const ORPHAN_GAP_X = 100;
  const ORPHAN_STEP_Y = 140;
  let maxRight = 60;
  for (const n of nodes) {
    maxRight = Math.max(maxRight, n.position.x + 260);
  }
  const orphanBaseX = maxRight + ORPHAN_GAP_X;
  let orphanY = 60;
  let orphanIndex = 0;
  scenes.forEach((scene, si) => {
    const sk = sceneKey(scene, si);
    if (placedSceneKeys.has(sk)) return;
    placedSceneKeys.add(sk);
    const title = sceneTitleForGraph(scene, si, lang);
    pushSceneGroupNode(
      nodes,
      `sg:${sk}`,
      orphanBaseX - 30,
      orphanY + orphanIndex * ORPHAN_STEP_Y - 40,
      340,
      210,
      {
        kind: "sceneGroup",
        label: title,
        sceneKey: sk,
        sceneIndex: si,
        viewMode: "tree",
        lang,
      }
    );
    nodes.push({
      id: `sc:${sk}`,
      type: "mapScene",
      position: { x: orphanBaseX, y: orphanY + orphanIndex * ORPHAN_STEP_Y },
      data: {
        kind: "scene",
        label: title,
        scId: sceneIdLabel(scene),
        sceneKey: sk,
        sceneIndex: si,
        viewMode: "tree",
        lang,
        chrome: "tree" as const,
        orphanIsland: true,
      },
    });
    orphanIndex++;
  });
}

/** Construit nœuds / arêtes alignés sur project-graph.js (vues focus, full, tree + narration). */
export function buildProjectMapGraph(
  project: EditorProject | null | undefined,
  options: MapGraphOptions
): { nodes: Node[]; edges: Edge[]; activeSceneKey: string | null } {
  edgeSeq = 0;
  const nodes: Node[] = [];
  const edges: Edge[] = [];

  if (!project || !Array.isArray(project.scenes) || project.scenes.length === 0) {
    return { nodes, edges, activeSceneKey: null };
  }

  const workProject = options.narrationOnly
    ? filterProjectForNarrationSkeleton(project, options.lang)
    : project;

  const scenesList = workProject.scenes;
  if (!scenesList || scenesList.length === 0) {
    return { nodes, edges, activeSceneKey: null };
  }

  const vm = options.viewMode || "focus";
  let activeKey: string | null =
    typeof options.activeSceneKey === "string" && options.activeSceneKey.trim()
      ? options.activeSceneKey.trim()
      : null;

  if (vm === "full") {
    buildGraphFull(workProject, options.lang, nodes, edges);
    applyDagreLayout(nodes, edges);
    return { nodes, edges, activeSceneKey: null };
  }

  if (vm === "tree") {
    buildGraphTree(workProject, options.lang, nodes, edges);
    applyDagreLayout(nodes, edges);
    return { nodes, edges, activeSceneKey: null };
  }

  let k = activeKey;
  if (k == null || k === "") {
    k = sceneKey(scenesList[0], 0);
  }
  const newActive = buildGraphFocus(workProject, k, options.lang, nodes, edges);
  return { nodes, edges, activeSceneKey: newActive };
}
