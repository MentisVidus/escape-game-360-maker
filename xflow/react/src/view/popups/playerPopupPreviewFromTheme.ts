import type { CSSProperties } from "react";

import { hexToRgba } from "../../model/hotspotAppearance";
import type { PlayerPopupTheme } from "./playerPopupDomRead";

/** Boîte démo (popup thème nodale) : fond + texte + police. */
export function playerPopupThemeToDemoBoxStyle(s: PlayerPopupTheme): Pick<CSSProperties, "backgroundColor" | "color" | "fontFamily"> {
  if (!s.useCustom) {
    return {
      backgroundColor: hexToRgba("#000000", 0.95),
      color: "#ffffff",
      fontFamily: "Arial, sans-serif",
    };
  }
  return {
    backgroundColor: hexToRgba(s.bg, s.bgAlpha),
    color: s.color,
    fontFamily: s.font,
  };
}

export function playerPopupThemeToDemoBtnStyle(s: PlayerPopupTheme): Pick<CSSProperties, "backgroundColor" | "color" | "fontFamily"> {
  if (!s.useCustom) {
    return { backgroundColor: "#27ae60", color: "#ffffff", fontFamily: "inherit" };
  }
  return { backgroundColor: s.btnBg, color: s.btnColor, fontFamily: "inherit" };
}

/** Aperçu runtime `afficherPopup` joueur (viewport sombre + panneau + boutons). */
export function playerPopupThemeToMsgPreviewChrome(s: PlayerPopupTheme): {
  viewport: CSSProperties;
  panel: CSSProperties;
  closeBtn: CSSProperties;
  btn: CSSProperties;
} {
  return playerPopupThemeToChromeImpl(s, "embedded");
}

/**
 * C18.5.1 — variante plein écran pour l'overlay preview joueur déclenché
 * depuis l'aperçu scène. Diffère de `MsgPreviewChrome` (utilisé par les
 * éditeurs) uniquement sur le viewport (`fixed inset:0` + z-index élevé,
 * curseur pointer pour signifier la zone de fermeture backdrop).
 *
 * Boutons close + actions : `cursor: "default"` est conservé ici ; le
 * composant `PlayerPopupPreview` les surcharge en `cursor: "pointer"`
 * quand `interactive` est fourni.
 */
export function playerPopupThemeToPlayerOverlayChrome(s: PlayerPopupTheme): {
  viewport: CSSProperties;
  panel: CSSProperties;
  closeBtn: CSSProperties;
  btn: CSSProperties;
} {
  return playerPopupThemeToChromeImpl(s, "overlay");
}

function playerPopupThemeToChromeImpl(
  s: PlayerPopupTheme,
  flavor: "embedded" | "overlay"
): { viewport: CSSProperties; panel: CSSProperties; closeBtn: CSSProperties; btn: CSSProperties } {
  const box = playerPopupThemeToDemoBoxStyle(s);
  const bs = playerPopupThemeToDemoBtnStyle(s);
  const viewport: CSSProperties =
    flavor === "overlay"
      ? {
          position: "fixed",
          inset: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 24,
          boxSizing: "border-box",
          background: "rgba(0,0,0,0.82)",
          zIndex: 10050,
          cursor: "pointer",
        }
      : {
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
        };
  return {
    viewport,
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
