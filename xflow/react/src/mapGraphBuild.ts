import type { Edge, Node } from "@xyflow/react";

const SELECTOR_GRAPH_MAX_DEPTH = 48;

export type EditorLang = "fr" | "en";

export type EditorProject = {
  schemaVersion?: number;
  title?: string;
  scenes?: EditorScene[];
};

export type EditorScene = {
  id?: string;
  scId?: string;
  title?: string;
  scTitle?: string;
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

  scenes.forEach((scene, si) => {
    const sk = sceneKey(scene, si);
    const title = sceneTitleForGraph(scene, si, lang);
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
    nodes.push({
      id,
      type: "mapScene",
      position: { x: p.sx, y: p.sy },
      data: { ...data, lang, chrome: "full" as const },
    });
  });

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
        } satisfies MapHotspotNodeData & { lang: EditorLang },
      });
      pushMapEdge(edges, sceneNodeId, hsId);
      const targetIds = getTargetSceneIdsFromHotspot(hs as EditorHotspot);
      for (let tj = 0; tj < targetIds.length; tj++) {
        const targetId = targetIds[tj];
        const targetNid = sceneKeyToRfId[targetId];
        if (targetNid) {
          pushMapEdge(edges, hsId, targetNid);
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
  const STUB_X = 700;
  const STUB_START_Y = 80;
  const STUB_STEP = 100;

  const activeTitle = sceneTitleForGraph(activeScene, resolved.index, lang);
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
      } satisfies MapHotspotNodeData & { lang: EditorLang },
    });
    pushMapEdge(edges, activeId, hsId);
    const targetIds = getTargetSceneIdsFromHotspot(hs as EditorHotspot);
    for (let tk = 0; tk < targetIds.length; tk++) {
      const targetId = targetIds[tk];
      const targetNid = sceneKeyToRfId[targetId];
      if (targetNid) {
        pushMapEdge(edges, hsId, targetNid);
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

    const hsList = Array.isArray(meta.scene.hotspots) ? meta.scene.hotspots : [];
    const baseHy = yCenter - ((Math.max(hsList.length, 1) - 1) * HS_STEP) / 2;
    let subtreeRight = x + 200;
    let nextChildX = x + HOTSPOT_DX + 280;

    hsList.forEach((hs, i) => {
      const hy = baseHy + i * HS_STEP;
      const label = hotspotLabel(hs as EditorHotspot, i);
      const at = hotspotActionType(hs as EditorHotspot);
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
        } satisfies MapHotspotNodeData & { lang: EditorLang },
      });
      pushMapEdge(edges, sceneRfId, hsRfId);

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
  placeScene(entryKey, 60, 320);

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
    return { nodes, edges, activeSceneKey: null };
  }

  if (vm === "tree") {
    buildGraphTree(workProject, options.lang, nodes, edges);
    return { nodes, edges, activeSceneKey: null };
  }

  let k = activeKey;
  if (k == null || k === "") {
    k = sceneKey(scenesList[0], 0);
  }
  const newActive = buildGraphFocus(workProject, k, options.lang, nodes, edges);
  return { nodes, edges, activeSceneKey: newActive };
}
