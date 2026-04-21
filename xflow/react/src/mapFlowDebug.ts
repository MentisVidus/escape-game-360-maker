/**
 * Diagnostic carte React : arêtes « extras » (pointillés), connexions.
 * Console : `escape360MapFlow.help()` (voir aussi `window.escape360MapFlow`).
 */

const LS_DEBUG = "escape360_mapFlowDebug";
const LS_EXTRAS_OFF = "escape360_mapFlowExtrasOff";

type MapFlowRingRow = { ts: number; kind: string; payload?: unknown };
const RING: MapFlowRingRow[] = [];
const RING_MAX = 36;

export function mapFlowDebugOn(): boolean {
  try {
    if (typeof window === "undefined") return false;
    if ((window as Window & { __ESCAPE360_MAP_FLOW_DEBUG?: boolean }).__ESCAPE360_MAP_FLOW_DEBUG === true) {
      return true;
    }
    if (typeof localStorage !== "undefined" && localStorage.getItem(LS_DEBUG) === "1") return true;
  } catch {
    /* ignore */
  }
  return false;
}

/** Si vrai, aucune arête extra n’est chargée ni enregistrée (pointillés « coupés »). */
export function mapFlowManualEdgesDisabled(): boolean {
  try {
    return typeof localStorage !== "undefined" && localStorage.getItem(LS_EXTRAS_OFF) === "1";
  } catch {
    return false;
  }
}

export function mapFlowLog(kind: string, payload?: unknown): void {
  const row: MapFlowRingRow = { ts: Date.now(), kind, payload };
  RING.push(row);
  while (RING.length > RING_MAX) RING.shift();
  if (mapFlowDebugOn()) {
    console.info(`[escape360-map-flow] ${kind}`, payload ?? "");
  }
}

export function getMapFlowDebugRing(): readonly MapFlowRingRow[] {
  return RING;
}

export function clearMapFlowDebugRing(): void {
  RING.length = 0;
}

export function setMapFlowDebugStorage(on: boolean): void {
  try {
    if (on) localStorage.setItem(LS_DEBUG, "1");
    else localStorage.removeItem(LS_DEBUG);
  } catch {
    /* ignore */
  }
}

export function setMapFlowManualEdgesStorage(on: boolean): void {
  try {
    if (on) localStorage.removeItem(LS_EXTRAS_OFF);
    else localStorage.setItem(LS_EXTRAS_OFF, "1");
  } catch {
    /* ignore */
  }
}

export function getMapFlowStaticHelp(): string {
  return `
[escape360-map-flow] Arêtes en pointillés = liens manuels « extras », session navigateur uniquement
(pas dans project.json). Créées quand tu relies menu/choix → hotspot sans action DOM dédiée.

  escape360MapFlow.help()            — ce message + clé de layout
  escape360MapFlow.log()             — derniers événements (mémoire page)
  escape360MapFlow.clearLog()        — vide le journal mémoire
  escape360MapFlow.debugOn()         — logs console détaillés (localStorage)
  escape360MapFlow.debugOff()
  escape360MapFlow.clearManualEdges() — supprime tous les pointillés (session, layout actuel)
  escape360MapFlow.manualEdgesOff()   — ne plus afficher / enregistrer d’extras
  escape360MapFlow.manualEdgesOn()
`.trim();
}
