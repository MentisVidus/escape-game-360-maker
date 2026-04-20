import type { Edge, Node } from "@xyflow/react";

const MAX_DEPTH = 48;

type LooseRecord = Record<string, unknown>;

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

type EditorHotspot = {
  action?: LooseAction;
} & LooseRecord;

type LooseAction = {
  type?: string;
  payload?: LooseRecord;
} | null | undefined;

function collectTargetSceneIdsFromAction(
  action: LooseAction,
  out: Set<string>,
  depthLeft: number
): void {
  if (!action || typeof action !== "object" || depthLeft <= 0) return;
  const t = action.type;
  const p = (action.payload || {}) as LooseRecord;
  if (t === "scene") {
    const v = String(p.target ?? "").trim();
    if (v) out.add(v);
    return;
  }
  if (t === "req") {
    const rr = (p.rewardAction || {}) as LooseAction;
    if (!rr || typeof rr !== "object" || rr.type !== "scene") return;
    const rp = (rr.payload || {}) as LooseRecord;
    const r = String(rp.target ?? "").trim();
    if (r) out.add(r);
    return;
  }
  if (t === "pwd") {
    const rp = (p.rewardAction || {}) as LooseAction;
    if (!rp || typeof rp !== "object" || rp.type !== "scene") return;
    const rpp = (rp.payload || {}) as LooseRecord;
    const pt = String(rpp.target ?? "").trim();
    if (pt) out.add(pt);
    return;
  }
  if (t === "selector") {
    const nested = (p.nested || {}) as LooseRecord;
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

function sceneKey(scene: EditorScene | undefined, index: number): string {
  const k = scene?.id != null ? String(scene.id).trim() : "";
  if (k) return k;
  const sc = scene?.scId != null ? String(scene.scId).trim() : "";
  if (sc) return sc;
  return `__idx_${index}`;
}

function sceneLabel(scene: EditorScene | undefined, index: number, keyFallback: string): string {
  if (!scene) return keyFallback;
  const title = scene.title != null ? String(scene.title).trim() : "";
  if (title) return title;
  const st = scene.scTitle != null ? String(scene.scTitle).trim() : "";
  if (st) return st;
  const id = scene.id != null ? String(scene.id).trim() : "";
  if (id) return id;
  const scId = scene.scId != null ? String(scene.scId).trim() : "";
  if (scId) return scId;
  return `Scène ${index + 1}`;
}

/** Graphe simplifié scène → scène (transitions / selectors), aligné sur l’esprit de project-graph.js. */
export function projectToFlowElements(project: EditorProject | null | undefined): {
  nodes: Node[];
  edges: Edge[];
} {
  const scenes = Array.isArray(project?.scenes) ? project!.scenes! : [];
  if (!scenes.length) {
    return { nodes: [], edges: [] };
  }

  const nodes: Node[] = scenes.map((scene, i) => {
    const id = sceneKey(scene, i);
    const label = sceneLabel(scene, i, id);
    const col = i % 4;
    const row = Math.floor(i / 4);
    return {
      id,
      type: "default",
      position: { x: col * 220, y: row * 100 },
      data: { label },
    };
  });

  const sceneIdSet = new Set(nodes.map((n) => n.id));
  const edges: Edge[] = [];
  let edgeSeq = 0;

  scenes.forEach((scene, si) => {
    const fromId = sceneKey(scene, si);
    const hotspots = Array.isArray(scene.hotspots) ? scene.hotspots : [];
    const targets = new Set<string>();
    for (const hs of hotspots) {
      const action = (hs?.action ?? hs) as LooseAction;
      collectTargetSceneIdsFromAction(action, targets, MAX_DEPTH);
    }
    for (const tid of targets) {
      if (!tid || !sceneIdSet.has(tid) || tid === fromId) continue;
      edges.push({
        id: `e-${fromId}-${tid}-${edgeSeq++}`,
        source: fromId,
        target: tid,
        animated: false,
      });
    }
  });

  return { nodes, edges };
}
