import { createContext, useContext } from "react";

import type { SatelliteNodeId } from "../model/ids";

export type NodalUiContextValue = {
  objectEditorSatelliteId: SatelliteNodeId | null;
  setObjectEditorSatelliteId: (id: SatelliteNodeId | null) => void;
};

export const NodalUiContext = createContext<NodalUiContextValue | null>(null);

export function useNodalUi(): NodalUiContextValue {
  const v = useContext(NodalUiContext);
  if (!v) throw new Error("useNodalUi doit être utilisé sous NodalUiContext.Provider");
  return v;
}
