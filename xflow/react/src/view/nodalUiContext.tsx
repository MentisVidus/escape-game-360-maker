import { createContext, useContext } from "react";
import type { StoreApi } from "zustand/vanilla";

import type { ActionNodeId, MediaNodeId, SatelliteNodeId } from "../model/ids";
import type { NodalProjectStore } from "../store/nodalProjectStore";

export type NodalUiContextValue = {
  store: StoreApi<NodalProjectStore>;
  objectEditorSatelliteId: SatelliteNodeId | null;
  setObjectEditorSatelliteId: (id: SatelliteNodeId | null) => void;
  coordsEditorSatelliteId: SatelliteNodeId | null;
  setCoordsEditorSatelliteId: (id: SatelliteNodeId | null) => void;
  choiceEditorSatelliteId: SatelliteNodeId | null;
  setChoiceEditorSatelliteId: (id: SatelliteNodeId | null) => void;
  mediaEditorMediaId: MediaNodeId | null;
  setMediaEditorMediaId: (id: MediaNodeId | null) => void;
  msgEditorActionId: ActionNodeId | null;
  setMsgEditorActionId: (id: ActionNodeId | null) => void;
  /** Ouvre l’éditeur de contenu message et ferme les autres popups carte. */
  openMsgContentEditor: (id: ActionNodeId) => void;
  pickEditorActionId: ActionNodeId | null;
  setPickEditorActionId: (id: ActionNodeId | null) => void;
  /** Ouvre l’éditeur de contenu pick et ferme les autres popups carte. */
  openPickContentEditor: (id: ActionNodeId) => void;
  gotoEditorActionId: ActionNodeId | null;
  setGotoEditorActionId: (id: ActionNodeId | null) => void;
  /** Ouvre l’éditeur de contenu goto et ferme les autres popups carte. */
  openGotoContentEditor: (id: ActionNodeId) => void;
  reqEditorActionId: ActionNodeId | null;
  setReqEditorActionId: (id: ActionNodeId | null) => void;
  /** Ouvre l’éditeur de contenu req et ferme les autres popups carte. */
  openReqContentEditor: (id: ActionNodeId) => void;
  pwdEditorActionId: ActionNodeId | null;
  setPwdEditorActionId: (id: ActionNodeId | null) => void;
  /** Ouvre l’éditeur de contenu pwd et ferme les autres popups carte. */
  openPwdContentEditor: (id: ActionNodeId) => void;
  selectorEditorActionId: ActionNodeId | null;
  setSelectorEditorActionId: (id: ActionNodeId | null) => void;
  /** Ouvre l’éditeur de contenu selector et ferme les autres popups carte. */
  openSelectorContentEditor: (id: ActionNodeId) => void;
  globalSettingsHubOpen: boolean;
  setGlobalSettingsHubOpen: (open: boolean) => void;
  popupThemeCustomizationOpen: boolean;
  setPopupThemeCustomizationOpen: (open: boolean) => void;
  /** C8.2.3 — popup aide raccourcis. */
  keyboardShortcutsOpen: boolean;
  setKeyboardShortcutsOpen: (open: boolean) => void;
};

export const NodalUiContext = createContext<NodalUiContextValue | null>(null);

export function useNodalUi(): NodalUiContextValue {
  const v = useContext(NodalUiContext);
  if (!v) throw new Error("useNodalUi doit être utilisé sous NodalUiContext.Provider");
  return v;
}
