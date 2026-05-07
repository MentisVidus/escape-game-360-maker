/** Lecture des champs « thème popup joueur » dans le formulaire vanilla (#pop-*, #useCustomPopup). */
import type { PopupThemeSettings } from "../../model/project";

export type PlayerPopupTheme = PopupThemeSettings;

/** @deprecated alias — préférer `PlayerPopupTheme`. */
export type PlayerPopupDomFields = PopupThemeSettings;

/** Valeurs par défaut alignées sur `readPlayerPopupFieldsFromDom` quand les champs absents. */
export const DEFAULT_PLAYER_POPUP_THEME: PlayerPopupTheme = {
  useCustom: false,
  font: "Arial, sans-serif",
  color: "#ffffff",
  bg: "#000000",
  bgAlpha: 0.9,
  btnBg: "#27ae60",
  btnColor: "#ffffff",
};

function el<T extends HTMLElement>(id: string): T | null {
  if (typeof document === "undefined") return null;
  return document.getElementById(id) as T | null;
}

export function readPlayerPopupFieldsFromDom(): PlayerPopupTheme {
  const useCustom = el<HTMLInputElement>("useCustomPopup");
  const font = el<HTMLSelectElement>("pop-font");
  const color = el<HTMLInputElement>("pop-color");
  const bgc = el<HTMLInputElement>("pop-bgc");
  const bga = el<HTMLInputElement>("pop-bga");
  const btnBg = el<HTMLInputElement>("pop-btn-bg");
  const btnCol = el<HTMLInputElement>("pop-btn-col");
  return {
    useCustom: !!(useCustom && useCustom.checked),
    font: font?.value ?? "Arial, sans-serif",
    color: color?.value ?? "#ffffff",
    bg: bgc?.value ?? "#000000",
    bgAlpha: Number(bga?.value ?? "0.9") || 0.9,
    btnBg: btnBg?.value ?? "#27ae60",
    btnColor: btnCol?.value ?? "#ffffff",
  };
}
