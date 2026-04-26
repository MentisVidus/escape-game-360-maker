import { useEffect, useRef } from "react";
import type { StoreApi } from "zustand/vanilla";

import type { NodalProjectStore } from "../store/nodalProjectStore";

import { buildNodalDraftCallbacks, isNodalDraftRecord, parseDraftEnvelope } from "./nodalDraftAdapter";

type LocalDraftManager = {
  captureSnapshot: (reason: string) => Promise<unknown>;
  markSynchronizedAfterSave: (kind: string) => Promise<void>;
  listRestorableDrafts: () => Promise<Array<{ id: string; projectData?: unknown; savedAt?: string }>>;
  restoreDraftById: (id: string) => Promise<{ project: unknown }>;
  setSourceHint: (hint: string) => void;
};

function getLegacyDraftApi():
  | { createManager: (opts: Record<string, unknown>) => LocalDraftManager }
  | undefined {
  return (globalThis as unknown as { EditorSharedLocalDraft?: { createManager: (o: Record<string, unknown>) => LocalDraftManager } })
    .EditorSharedLocalDraft;
}

/** Préfixes distincts du legacy (`escape360:draft:*`) pour localStorage / sessionStorage sur localhost. */
const NODAL_DRAFT_KEYS = {
  enabledKey: "escape360:nodal-map-draft:enabled",
  lightModeKey: "escape360:nodal-map-draft:light-mode",
  tabStorageKey: "escape360:nodal-map-draft:tab-id",
} as const;

/**
 * Auto-save IndexedDB (module legacy inchangé) + restauration au montage (brouillons nodaux uniquement).
 * Debounce 2 s ; compatible StrictMode (cleanup `cancelled`).
 */
export function useNodalAutoSave(store: StoreApi<NodalProjectStore>) {
  const managerRef = useRef<LocalDraftManager | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let cancelled = false;
    const EditorSharedLocalDraft = getLegacyDraftApi();
    if (!EditorSharedLocalDraft) {
      console.warn("[useNodalAutoSave] EditorSharedLocalDraft indisponible — auto-save désactivé");
      return;
    }

    const manager = EditorSharedLocalDraft.createManager({
      ...buildNodalDraftCallbacks(store),
      ...NODAL_DRAFT_KEYS,
    });
    managerRef.current = manager;
    manager.setSourceHint("nodal-map");

    void (async () => {
      try {
        const drafts = await manager.listRestorableDrafts();
        if (cancelled) return;
        const nodalOnly = drafts.filter(isNodalDraftRecord);
        if (!nodalOnly.length) return;
        nodalOnly.sort((a, b) => String(b.savedAt || "").localeCompare(String(a.savedAt || "")));
        const latest = nodalOnly[0];
        if (!latest) return;
        const parsed = parseDraftEnvelope(latest.projectData);
        if (!parsed) return;
        const label = latest.savedAt ? new Date(latest.savedAt).toLocaleTimeString() : "?";
        if (typeof window !== "undefined" && window.confirm(`Brouillon nodal (${label}) — restaurer ?`)) {
          if (cancelled) return;
          const { project } = await manager.restoreDraftById(latest.id);
          if (cancelled) return;
          const again = parseDraftEnvelope(project);
          if (again) {
            store.getState().hydrateFromProject(again.projectJson, again.layoutJson);
          }
        }
      } catch (e) {
        console.warn("[useNodalAutoSave] restauration initiale ignorée", e);
      }
    })();

    const unsub = store.subscribe(() => {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        void manager.captureSnapshot("autosave");
      }, 2000);
    });

    return () => {
      cancelled = true;
      unsub();
      if (timerRef.current) clearTimeout(timerRef.current);
      managerRef.current = null;
    };
  }, [store]);

  return managerRef;
}

export function markNodalDraftSynchronized(manager: LocalDraftManager | null): Promise<void> {
  if (!manager) return Promise.resolve();
  return manager.markSynchronizedAfterSave("nodal-manual-save");
}
