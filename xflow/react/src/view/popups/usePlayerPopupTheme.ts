import { useSyncExternalStore } from "react";
import type { StoreApi } from "zustand/vanilla";

import type { NodalProjectStore } from "../../store/nodalProjectStore";
import { DEFAULT_PLAYER_POPUP_THEME, type PlayerPopupTheme } from "./playerPopupDomRead";

/** Abonnement au thème popup dans `meta.settings.popupTheme` (source de vérité UI nodale). */
export function usePlayerPopupTheme(store: StoreApi<NodalProjectStore>): PlayerPopupTheme {
  return useSyncExternalStore(
    store.subscribe,
    () => store.getState().meta.settings?.popupTheme ?? DEFAULT_PLAYER_POPUP_THEME,
    () => store.getState().meta.settings?.popupTheme ?? DEFAULT_PLAYER_POPUP_THEME
  );
}
