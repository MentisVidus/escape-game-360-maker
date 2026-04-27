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

/** Panneau type `afficherPopup` joueur + bouton (aperçu message nodal). */
export function playerPopupThemeToMsgPreviewChrome(s: PlayerPopupTheme): { panel: CSSProperties; btn: CSSProperties } {
  const box = playerPopupThemeToDemoBoxStyle(s);
  const bs = playerPopupThemeToDemoBtnStyle(s);
  return {
    panel: {
      background: box.backgroundColor,
      color: box.color,
      fontFamily: box.fontFamily ?? "Arial, sans-serif",
      padding: 24,
      borderRadius: 8,
      border: "2px solid #888",
      maxWidth: "100%",
      width: "100%",
      boxSizing: "border-box",
      maxHeight: "min(320px, 42vh)",
      overflow: "auto",
      textAlign: "center",
      boxShadow: "0 8px 24px rgba(0, 0, 0, 0.35)",
      position: "relative",
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
