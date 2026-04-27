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
};

export const NodalUiContext = createContext<NodalUiContextValue | null>(null);

export function useNodalUi(): NodalUiContextValue {
  const v = useContext(NodalUiContext);
  if (!v) throw new Error("useNodalUi doit être utilisé sous NodalUiContext.Provider");
  return v;
}
