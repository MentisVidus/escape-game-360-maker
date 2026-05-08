import type { ActionNodeId, SceneNodeId, SatelliteNodeId } from "../../model/ids";
import { buildCustomCssFromAppearance, mergeHotspotAppearance } from "../../model/hotspotAppearance";
import type { ActionNode, CoordsOptionsSatelliteNode } from "../../model/nodes";
import type { NodalProject } from "../../model/project";

export type PannellumHotSpotProjection = {
  pitch: number;
  yaw: number;
  cssClass: string;
  /** C18.3 — actionId source (pour identifier le hotspot au pointerdown en mode édition). */
  actionId: ActionNodeId;
  /** C18.3 — id du satellite coords-options qui porte pitch/yaw (`null` si pas encore relié). */
  coordsSatelliteId: SatelliteNodeId | null;
  /** C18.3 — CSS du satellite (sans outline preview), pour cloner visuellement le fantôme drag. */
  ghostBaseCss: string;
};

function sanitizeCssDeclarationText(value: string): string {
  return String(value || "")
    .replace(/<\/style/gi, "<\\/style")
    .replace(/[\u0000-\u001F\u007F]/g, " ")
    .replace(/[\r\n\f]/g, " ");
}

function escapeForCssContentString(value: string): string {
  return String(value || "")
    .replace(/\\/g, "\\\\")
    .replace(/'/g, "\\'")
    .replace(/[\r\n\f]/g, " ")
    .replace(/<\/style/gi, "<\\/style");
}

function truncateLabel(text: string, max = 48): string {
  const t = text.trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max - 1)}…`;
}

function coordsOptionsForAction(
  state: NodalProject,
  actionId: ActionNodeId
): CoordsOptionsSatelliteNode | null {
  for (const e of state.edges) {
    if (e.family !== "meta" || e.sourceId !== actionId) continue;
    const sat = state.satellites[e.targetId as SatelliteNodeId];
    if (sat?.satelliteType === "coords-options") return sat;
  }
  return null;
}

function sceneFlowHotspotActions(state: NodalProject, sceneId: SceneNodeId): ActionNodeId[] {
  const out: ActionNodeId[] = [];
  const seen = new Set<ActionNodeId>();
  for (const e of state.edges) {
    if (e.family !== "flow" || e.sourceId !== sceneId) continue;
    const tid = e.targetId as ActionNodeId;
    if (!(tid in state.actions) || seen.has(tid)) continue;
    seen.add(tid);
    out.push(tid);
  }
  return out;
}

function effectiveHotspotCss(sat: CoordsOptionsSatelliteNode): string {
  const raw = sat.data.customCss?.trim();
  if (raw) return sanitizeCssDeclarationText(raw);
  return buildCustomCssFromAppearance(mergeHotspotAppearance(sat.data.appearance));
}

/**
 * Hotspots « état 2 » (flow scène → action) : pitch/yaw + classes CSS pour Pannellum.
 * Retourne aussi le bloc `<style>` à injecter (legacy `previewScene`).
 */
export function collectSceneHotspotProjections(
  state: NodalProject,
  sceneId: SceneNodeId,
  options?: { excludeIds?: ActionNodeId[]; cssVariant?: "preview" | "picker-bg" }
): { projections: PannellumHotSpotProjection[]; cssText: string } {
  const exclude = new Set(options?.excludeIds ?? []);
  const variant = options?.cssVariant ?? "preview";
  const outlineColor = variant === "picker-bg" ? "#888888" : "red";

  const actionIds = sceneFlowHotspotActions(state, sceneId).filter((id) => !exclude.has(id));

  const projections: PannellumHotSpotProjection[] = [];
  let cssText = "";

  actionIds.forEach((actionId, index) => {
    const act = state.actions[actionId] as ActionNode | undefined;
    if (!act) return;
    const sat = coordsOptionsForAction(state, actionId);
    const pitch = sat ? Number(sat.data.pitch) || 0 : 0;
    const yaw = sat ? Number(sat.data.yaw) || 0 : 0;
    const rawCss = sat ? effectiveHotspotCss(sat) : "";
    const labelText = truncateLabel(act.label || `HS ${index + 1}`);
    const hsIdText = escapeForCssContentString(labelText);
    const safeScene = String(sceneId).replace(/[^a-zA-Z0-9_-]/g, "_");
    const cssClass = `prev-hs-${safeScene}-${index}`;

    const pointerPe = variant === "picker-bg" ? "none" : "auto";
    const opacity = variant === "picker-bg" ? "opacity: 0.5; " : "";
    cssText += `.${cssClass} { ${rawCss} outline: 3px dashed ${outlineColor} !important; outline-offset: 2px; pointer-events: ${pointerPe}; ${opacity}display: flex; align-items: center; justify-content: center; }\n`;
    cssText += `.${cssClass}::after { content: '${hsIdText}'; background: black; color: white; padding: 2px 5px; font-size: 12px; font-weight: bold; border-radius: 3px; }\n`;
    projections.push({
      pitch,
      yaw,
      cssClass,
      actionId,
      coordsSatelliteId: sat?.id ?? null,
      ghostBaseCss: rawCss,
    });
  });

  return { projections, cssText };
}
