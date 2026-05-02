/** Aligné sur `editor-shared-ui-utils.js` (`buildCss` / defaults hotspot legacy). */

export type HotspotAppearanceUi = {
  ui_w: number;
  ui_h: number;
  ui_shape: string;
  ui_bgc: string;
  ui_bga: number;
  ui_img: string;
  ui_brd_style: string;
  ui_brd_w: number;
  ui_brd_c: string;
};

export const DEFAULT_HOTSPOT_APPEARANCE: HotspotAppearanceUi = {
  ui_w: 120,
  ui_h: 120,
  ui_shape: "0px",
  ui_bgc: "#ff0000",
  ui_bga: 0.2,
  ui_img: "",
  ui_brd_style: "none",
  ui_brd_w: 2,
  ui_brd_c: "#ffffff",
};

export function mergeHotspotAppearance(partial: Partial<HotspotAppearanceUi> | null | undefined): HotspotAppearanceUi {
  return { ...DEFAULT_HOTSPOT_APPEARANCE, ...partial };
}

function byteFromHexPair(hexNoHash: string, start: number): number {
  const n = parseInt(hexNoHash.slice(start, start + 2), 16);
  if (Number.isNaN(n)) return 0;
  return Math.max(0, Math.min(255, n));
}

export function hexToRgba(hex: string, alpha: number): string {
  const h = (hex || "#ff0000").replace(/^#/, "");
  const r = byteFromHexPair(h, 0);
  const g = byteFromHexPair(h, 2);
  const b = byteFromHexPair(h, 4);
  const a = Number.isFinite(alpha) ? Math.max(0, Math.min(1, alpha)) : 1;
  return `rgba(${r}, ${g}, ${b}, ${a})`;
}

/** Même chaîne CSS que `EditorSharedUi.buildCss` côté legacy. */
export function buildCustomCssFromAppearance(app: HotspotAppearanceUi): string {
  const w = Number.isFinite(app.ui_w) ? app.ui_w : 120;
  const h = Number.isFinite(app.ui_h) ? app.ui_h : 120;
  const shape = app.ui_shape || "0px";
  const bgc = app.ui_bgc || "#ff0000";
  const bga = Number.isFinite(app.ui_bga) ? app.ui_bga : 0.2;
  const brdStyle = app.ui_brd_style || "none";
  const brdW = Number.isFinite(app.ui_brd_w) ? app.ui_brd_w : 2;
  const brdC = app.ui_brd_c || "#ffffff";
  const img = (app.ui_img || "").trim();

  let css = `width: ${w}px; height: ${h}px; background: ${hexToRgba(bgc, bga)}; border-radius: ${shape}; cursor: pointer; display: flex; align-items: center; justify-content: center;`;
  if (brdStyle !== "none") {
    css += ` border: ${brdW}px ${brdStyle} ${brdC};`;
  }
  if (img) {
    css += ` background-image: url('${img.replace(/'/g, "\\'")}'); background-size: contain; background-repeat: no-repeat; background-position: center;`;
  }
  return css;
}
