import type { StoreApi } from "zustand/vanilla";

import { serializeLayout, type MapLayoutJson } from "../serialize/mapLayoutJson";
import { serializeToProjectJson, type ProjectJsonV2 } from "../serialize/toProjectJson";
import type { NodalProjectStore } from "../store/nodalProjectStore";

/** Enveloppe stockée dans `projectData` d’un brouillon IndexedDB nodal. */
export type NodalDraftEnvelopeV1 = {
  _nodalV1: true;
  projectJson: ProjectJsonV2;
  layoutJson: MapLayoutJson;
};

/**
 * Les 4 callbacks attendus par `EditorSharedLocalDraft.createManager()`.
 * Médias : no-ops pour C5 (pas de `blob:` dans le flux nodal actuel).
 */
export function buildNodalDraftCallbacks(store: StoreApi<NodalProjectStore>) {
  return {
    getCurrentProjectData: (): NodalDraftEnvelopeV1 => {
      const state = store.getState();
      return {
        _nodalV1: true,
        projectJson: serializeToProjectJson(state),
        layoutJson: serializeLayout(state),
      };
    },

    /** TODO C7+ : parcourir les URLs médias portables (`blob:`, `./assets/`) dans le JSON nodal. */
    eachPortableMediaUrlInProject: (_project: unknown, _visit: (u: string) => void) => {},

    /** TODO C7+ : réécrire les URLs médias dans le clone si besoin. */
    rewritePortableUrlsInProjectClone: (_project: unknown, _rewrite: (u: string) => string) => {},

    /** TODO C7+ : résoudre `blob:` / jetons draftasset vers Blob. */
    getBlobOrFileForPortableUrl: (_url: string): File | Blob | null => null,
  };
}

export function parseDraftEnvelope(data: unknown): {
  projectJson: ProjectJsonV2;
  layoutJson: MapLayoutJson;
} | null {
  if (!data || typeof data !== "object") return null;
  const d = data as Record<string, unknown>;
  if (!d._nodalV1 || !d.projectJson || !d.layoutJson) return null;
  return {
    projectJson: d.projectJson as ProjectJsonV2,
    layoutJson: d.layoutJson as MapLayoutJson,
  };
}

export function isNodalDraftRecord(rec: { projectData?: unknown } | null | undefined): boolean {
  return parseDraftEnvelope(rec?.projectData) !== null;
}
