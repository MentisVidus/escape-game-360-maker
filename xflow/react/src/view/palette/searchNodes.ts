import type { AnyNodeId } from "../../model/ids";
import type { NodalProject } from "../../model/project";
import type { ObjectSatelliteNode, SatelliteNode } from "../../model/nodes";

export type SearchHit = {
  nodeId: AnyNodeId;
  /** Libellé affichable (debug / compteur). */
  label: string;
};

function isObjectSatellite(s: SatelliteNode): s is ObjectSatelliteNode {
  return s.satelliteType === "object";
}

/** Recherche case-insensitive (sous-chaîne) — périmètre C8.4.1 spec. */
export function searchNodalNodes(state: NodalProject, query: string): SearchHit[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];

  const hits: SearchHit[] = [];

  for (const scene of Object.values(state.scenes)) {
    const lab = (scene.label || "").toLowerCase();
    const sid = (scene.sceneId || "").toLowerCase();
    if (lab.includes(q) || sid.includes(q)) {
      hits.push({ nodeId: scene.id, label: scene.label || scene.sceneId || String(scene.id) });
    }
  }

  for (const action of Object.values(state.actions)) {
    let match = (action.label || "").toLowerCase().includes(q);
    if (!match && action.actionType === "selector") {
      const t = action.payload.nested?.title;
      match = (t || "").toLowerCase().includes(q);
    }
    if (match) hits.push({ nodeId: action.id, label: action.label || action.actionType });
  }

  for (const m of Object.values(state.media)) {
    if ((m.label || "").toLowerCase().includes(q)) hits.push({ nodeId: m.id, label: m.label || String(m.id) });
  }

  for (const [objectId, entry] of Object.entries(state.meta.objects)) {
    const inObj =
      objectId.toLowerCase().includes(q) || (entry.displayName || "").toLowerCase().includes(q);
    if (!inObj) continue;
    for (const sat of Object.values(state.satellites)) {
      if (isObjectSatellite(sat) && sat.data.objectId === objectId) {
        hits.push({ nodeId: sat.id, label: entry.displayName || objectId });
      }
    }
  }

  const seen = new Set<string>();
  return hits.filter((h) => {
    const id = String(h.nodeId);
    if (seen.has(id)) return false;
    seen.add(id);
    return true;
  });
}
