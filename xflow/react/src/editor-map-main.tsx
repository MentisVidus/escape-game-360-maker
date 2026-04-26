/**
 * Point d’entrée **bundle éditeur** (IIFE) : montage de la carte nodale dans
 * `editeur.html` / `editor_en.html`. Global : `Escape360EditorNodalMap`.
 *
 * Après `mount()` : `window.__ESCAPE360_NODAL_STORE__` pointe sur le même
 * `StoreApi<NodalProjectStore>` (Zustand vanilla), pour C6.1+.
 */
import "@xyflow/react/dist/style.css";
import { StrictMode } from "react";
import { createRoot, type Root } from "react-dom/client";
import type { StoreApi } from "zustand/vanilla";

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

export function mount(container: HTMLElement): StoreApi<NodalProjectStore> {
  if (roots.has(container) && storeSingleton) {
    return storeSingleton;
  }
  storeSingleton = createDemoStore();
  window.__ESCAPE360_NODAL_STORE__ = storeSingleton;
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
