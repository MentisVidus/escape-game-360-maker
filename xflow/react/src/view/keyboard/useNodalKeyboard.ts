import { useEffect, useRef } from "react";

import { isEditingContext } from "./isEditingContext";

/** Handlers pour les raccourcis nodaux (C8.2.1+). */
export type NodalKeyboardHandlers = {
  anyPopupOpen: boolean;
  /** Ferme la modale / popup au premier plan (Échap — même depuis Quill). */
  closeActiveModal?: () => void;
  deselectAll: () => void;
  focusSearchField: () => void;
  /** C8.5.2 — copier la sélection RF (optionnel si non branché). */
  copySelection?: () => void;
  /** C8.5.2 — coller sous le pointeur / centre carte (optionnel). */
  pasteFromClipboard?: () => void;
  /** C8.2.3 — ouvre la popup « Raccourcis » (touche `?`). */
  openShortcutsHelp?: () => void;
};

/**
 * Traite un `keydown` global carte nodale.
 * @returns `true` si l’événement a été consommé (`preventDefault` appliqué quand pertinent).
 */
export function nodalKeyboardHandleKeyDown(e: KeyboardEvent, h: NodalKeyboardHandlers): boolean {
  /* Échap + surface modale : fermer en priorité (sinon RF consomme Échap et désélectionne). */
  if (e.key === "Escape" && h.anyPopupOpen) {
    e.preventDefault();
    e.stopPropagation();
    h.closeActiveModal?.();
    return true;
  }

  if (isEditingContext(e.target)) return false;

  const mod = e.ctrlKey || e.metaKey;

  if (mod && (e.key === "c" || e.key === "C")) {
    if (h.anyPopupOpen) return false;
    if (!h.copySelection) return false;
    e.preventDefault();
    h.copySelection();
    return true;
  }
  if (mod && (e.key === "v" || e.key === "V")) {
    if (h.anyPopupOpen) return false;
    if (!h.pasteFromClipboard) return false;
    e.preventDefault();
    h.pasteFromClipboard();
    return true;
  }

  const modF = mod && (e.key === "f" || e.key === "F");
  if (modF) {
    if (h.anyPopupOpen) return false;
    e.preventDefault();
    h.focusSearchField();
    return true;
  }

  if (e.key === "?") {
    if (h.anyPopupOpen) return false;
    if (!h.openShortcutsHelp) return false;
    e.preventDefault();
    h.openShortcutsHelp();
    return true;
  }

  if (h.anyPopupOpen) return false;

  if (e.key === "Escape") {
    e.preventDefault();
    e.stopPropagation();
    h.deselectAll();
    return true;
  }

  return false;
}

/** C8.2.1+ — raccourcis globaux (Échap, Ctrl/Cmd+F, `?`, copier/coller). */
export function useNodalKeyboard(handlers: NodalKeyboardHandlers): void {
  const ref = useRef(handlers);
  ref.current = handlers;
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      nodalKeyboardHandleKeyDown(e, ref.current);
    };
    /* Capture : Échap doit fermer les popups avant que RF / le pane ne désélectionne. */
    window.addEventListener("keydown", onKeyDown, true);
    return () => window.removeEventListener("keydown", onKeyDown, true);
  }, []);
}
