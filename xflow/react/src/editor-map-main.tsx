/**
 * Point d’entrée **bundle éditeur** (IIFE) : montage de la carte nodale dans
 * `editeur.html` / `editor_en.html`. Global : `Escape360EditorNodalMap`.
 *
 * Après `mount()` : `window.__ESCAPE360_NODAL_STORE__` pointe sur le même
 * `StoreApi<NodalProjectStore>` (Zustand vanilla), pour C6+.
 */
import "@xyflow/react/dist/style.css";
import { StrictMode } from "react";
import { createRoot, type Root } from "react-dom/client";
import type { StoreApi } from "zustand/vanilla";

import type { MapLayoutJson } from "./serialize/mapLayoutJson";
import { serializeLayout } from "./serialize/mapLayoutJson";
import { serializeToProjectJson, type ProjectJsonV2, type ProjectJsonV2Action } from "./serialize/toProjectJson";
import { createNodalProjectStore } from "./store/nodalProjectStore";
import type { NodalProjectStore } from "./store/nodalProjectStore";
import { NodalCanvas } from "./view/NodalCanvas";
import { createDemoStore } from "./view/demoProject";

declare global {
  interface Window {
    __ESCAPE360_NODAL_STORE__?: StoreApi<NodalProjectStore>;
  }
}

const roots = new WeakMap<HTMLElement, Root>();
let storeSingleton: StoreApi<NodalProjectStore> | null = null;

const emptyMapLayoutJson = (): MapLayoutJson => ({
  positions: {},
  parentId: {},
  collapsed: {},
  drafts: [],
  viewport: { x: 0, y: 0, zoom: 1 },
});

/** Crée un store vide si besoin (hydrate avant premier `mount`). */
function ensureStoreShell(): StoreApi<NodalProjectStore> {
  if (!storeSingleton) {
    storeSingleton = createNodalProjectStore();
    window.__ESCAPE360_NODAL_STORE__ = storeSingleton;
  }
  return storeSingleton;
}

/**
 * Sérialise l’état nodal pour le bundle `.escapegame` : `project.json` (arbre V2)
 * + `map-layout.json` (positions, arêtes implicites via layout, satellites, médias liés).
 * Aligné `persistence/zipBundle.ts` : **layout complet** (pas de strip des satellites auto).
 */
export function serializeForBundle(): { nodalProjectJson: ProjectJsonV2; mapLayoutJson: MapLayoutJson } | null {
  const st = storeSingleton ?? window.__ESCAPE360_NODAL_STORE__ ?? null;
  if (!st) return null;
  const state = st.getState();
  const nodalProjectJson = serializeToProjectJson(state);
  const mapLayoutJson = serializeLayout(state);
  return { nodalProjectJson, mapLayoutJson };
}

/**
 * Hydrate le store nodal depuis un chargement `.escapegame` / JSON (sans monter React).
 * Peut être appelé avant le premier `mount`.
 */
export function hydrateFromBundle(projectJson: ProjectJsonV2, layoutJson?: MapLayoutJson | null): void {
  const st = ensureStoreShell();
  const layout = layoutJson && typeof layoutJson === "object" ? layoutJson : emptyMapLayoutJson();
  st.getState().hydrateFromProject(projectJson, layout);
}

/** Projet éditeur complet (DOM / `getCurrentProjectData`) → JSON V2 minimal attendu par `deserializeFromProjectJson`. */
export function editorProjectLikeToProjectJsonV2(raw: unknown): ProjectJsonV2 | null {
  if (!raw || typeof raw !== "object") return null;
  const p = raw as Record<string, unknown>;
  if (p.schemaVersion !== 2) return null;
  const scenesIn = p.scenes;
  if (!Array.isArray(scenesIn)) return null;
  const scenes: ProjectJsonV2["scenes"] = [];
  for (const s of scenesIn) {
    if (!s || typeof s !== "object") continue;
    const sc = s as Record<string, unknown>;
    const id = String(sc.id ?? "").trim();
    if (!id) continue;
    const media = sc.media && typeof sc.media === "object" ? (sc.media as Record<string, unknown>) : {};
    const hotspotsIn = Array.isArray(sc.hotspots) ? sc.hotspots : [];
    const hotspots: ProjectJsonV2["scenes"][number]["hotspots"] = [];
    for (const hs of hotspotsIn) {
      if (!hs || typeof hs !== "object") continue;
      const h = hs as Record<string, unknown>;
      if (!h.action || typeof h.action !== "object") continue;
      try {
        hotspots.push({ action: JSON.parse(JSON.stringify(h.action)) as ProjectJsonV2Action });
      } catch {
        continue;
      }
    }
    scenes.push({
      id,
      title: String(sc.title ?? ""),
      panoramaUrl: String(media.panoramaUrl ?? ""),
      hotspots,
    });
  }
  const startRaw = p.startSceneId;
  const startSceneId =
    typeof startRaw === "string" && startRaw.trim() !== ""
      ? startRaw.trim()
      : scenes[0]
        ? scenes[0].id
        : null;
  return {
    schemaVersion: 2,
    title: typeof p.title === "string" ? p.title : "",
    startSceneId,
    scenes,
  };
}

/** Hydrate le graphe nodal depuis le projet éditeur (sans `map-layout.json` : positions par défaut). Migration / outils uniquement — pas à l’ouverture de la carte. */
export function hydrateFromEditorProject(editorProject: unknown): void {
  const v2 = editorProjectLikeToProjectJsonV2(editorProject);
  if (!v2) return;
  hydrateFromBundle(v2, emptyMapLayoutJson());
}

export function mount(container: HTMLElement): StoreApi<NodalProjectStore> {
  if (roots.has(container) && storeSingleton) {
    return storeSingleton;
  }
  if (!storeSingleton) {
    storeSingleton = createDemoStore();
    window.__ESCAPE360_NODAL_STORE__ = storeSingleton;
  }
  const root = createRoot(container);
  roots.set(container, root);
  root.render(
    <StrictMode>
      <NodalCanvas store={storeSingleton} />
    </StrictMode>
  );
  return storeSingleton;
}

export function unmount(container: HTMLElement): void {
  roots.get(container)?.unmount();
  roots.delete(container);
  delete window.__ESCAPE360_NODAL_STORE__;
  storeSingleton = null;
}

export function getStore(): StoreApi<NodalProjectStore> | null {
  return storeSingleton ?? window.__ESCAPE360_NODAL_STORE__ ?? null;
}
