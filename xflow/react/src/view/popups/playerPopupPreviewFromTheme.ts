import type { CSSProperties } from "react";

import { hexToRgba } from "../../model/hotspotAppearance";
import type { PlayerPopupTheme } from "./playerPopupDomRead";

/** Boîte démo (popup thème nodale) : fond + texte + police. */
export function playerPopupThemeToDemoBoxStyle(s: PlayerPopupTheme): Pick<CSSProperties, "backgroundColor" | "color" | "fontFamily"> {
  if (!s.useCustomPopup) {
    return {
      backgroundColor: hexToRgba("#000000", 0.95),
      color: "#ffffff",
      fontFamily: "Arial, sans-serif",
    };
  }
  return {
    backgroundColor: hexToRgba(s.popBgc, s.popBga),
    color: s.popColor,
    fontFamily: s.popFont,
  };
}

export function playerPopupThemeToDemoBtnStyle(s: PlayerPopupTheme): Pick<CSSProperties, "backgroundColor" | "color" | "fontFamily"> {
  if (!s.useCustomPopup) {
    return { backgroundColor: "#27ae60", color: "#ffffff", fontFamily: "inherit" };
  }
  return { backgroundColor: s.popBtnBg, color: s.popBtnCol, fontFamily: "inherit" };
}

/** Aperçu runtime `afficherPopup` joueur (viewport sombre + panneau + boutons). */
export function playerPopupThemeToMsgPreviewChrome(s: PlayerPopupTheme): {
  viewport: CSSProperties;
  panel: CSSProperties;
  closeBtn: CSSProperties;
  btn: CSSProperties;
} {
  const box = playerPopupThemeToDemoBoxStyle(s);
  const bs = playerPopupThemeToDemoBtnStyle(s);
  return {
    viewport: {
      position: "relative",
      width: "100%",
      height: "100%",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: 12,
      boxSizing: "border-box",
      background: "rgba(0,0,0,0.82)",
      borderRadius: 6,
    },
    panel: {
      background: box.backgroundColor,
      color: box.color,
      fontFamily: box.fontFamily ?? "Arial, sans-serif",
      padding: 24,
      borderRadius: 8,
      border: "2px solid #888",
      maxWidth: 420,
      width: "100%",
      boxSizing: "border-box",
      maxHeight: "85%",
      overflow: "auto",
      textAlign: "center",
      boxShadow: "0 8px 32px rgba(0, 0, 0, 0.5)",
      position: "relative",
    },
    closeBtn: {
      position: "absolute",
      top: 8,
      right: 8,
      background: "transparent",
      border: "none",
      color: "inherit",
      cursor: "default",
      fontSize: 20,
      lineHeight: 1,
      opacity: 0.9,
    },
    btn: {
      marginTop: 15,
      cursor: "default",
      padding: "10px 20px",
      background: bs.backgroundColor,
      color: bs.color,
      fontFamily: bs.fontFamily ?? "inherit",
      border: "none",
      borderRadius: 5,
      fontSize: 16,
    },
  };
}
