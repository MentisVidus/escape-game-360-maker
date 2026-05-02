/** Lecture des champs « thème popup joueur » dans le formulaire vanilla (#pop-*, #useCustomPopup). */

export type PlayerPopupTheme = {
  useCustomPopup: boolean;
  popFont: string;
  popColor: string;
  popBgc: string;
  popBga: number;
  popBtnBg: string;
  popBtnCol: string;
};

/** @deprecated alias — préférer `PlayerPopupTheme`. */
export type PlayerPopupDomFields = PlayerPopupTheme;

/** Valeurs par défaut alignées sur `readPlayerPopupFieldsFromDom` quand les champs absents. */
export const DEFAULT_PLAYER_POPUP_THEME: PlayerPopupTheme = {
  useCustomPopup: false,
  popFont: "Arial, sans-serif",
  popColor: "#ffffff",
  popBgc: "#000000",
  popBga: 0.9,
  popBtnBg: "#27ae60",
  popBtnCol: "#ffffff",
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
    useCustomPopup: !!(useCustom && useCustom.checked),
    popFont: font?.value ?? "Arial, sans-serif",
    popColor: color?.value ?? "#ffffff",
    popBgc: bgc?.value ?? "#000000",
    popBga: Number(bga?.value ?? "0.9") || 0.9,
    popBtnBg: btnBg?.value ?? "#27ae60",
    popBtnCol: btnCol?.value ?? "#ffffff",
  };
}
