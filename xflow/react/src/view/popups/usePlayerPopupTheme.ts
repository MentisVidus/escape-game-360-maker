import { useSyncExternalStore } from "react";
import type { StoreApi } from "zustand/vanilla";

import type { NodalProjectStore } from "../../store/nodalProjectStore";
import type { PlayerPopupTheme } from "./playerPopupDomRead";

/** Abonnement au slice `playerPopupTheme` du store carte (source de vérité UI nodale). */
export function usePlayerPopupTheme(store: StoreApi<NodalProjectStore>): PlayerPopupTheme {
  return useSyncExternalStore(
    store.subscribe,
    () => store.getState().playerPopupTheme,
    () => store.getState().playerPopupTheme
  );
}
