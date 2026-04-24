import { createContext, useContext } from "react";
import type { StoreApi } from "zustand/vanilla";

import type { SatelliteNodeId } from "../model/ids";
import type { NodalProjectStore } from "../store/nodalProjectStore";

export type NodalUiContextValue = {
  store: StoreApi<NodalProjectStore>;
  objectEditorSatelliteId: SatelliteNodeId | null;
  setObjectEditorSatelliteId: (id: SatelliteNodeId | null) => void;
};

export const NodalUiContext = createContext<NodalUiContextValue | null>(null);

export function useNodalUi(): NodalUiContextValue {
  const v = useContext(NodalUiContext);
  if (!v) throw new Error("useNodalUi doit être utilisé sous NodalUiContext.Provider");
  return v;
}
