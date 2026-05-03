import { useEffect, useRef } from "react";

import { isEditingContext } from "./isEditingContext";

/** Handlers pour les raccourcis nodaux (C8.2.1+). */
export type NodalKeyboardHandlers = {
  anyPopupOpen: boolean;
  deselectAll: () => void;
  /** C8.5.3 — duplication ; stub vide en C8.2.1. */
  duplicateSelection: () => void;
  focusSearchField: () => void;
};

/**
 * Traite un `keydown` global carte nodale.
 * @returns `true` si l’événement a été consommé (`preventDefault` appliqué quand pertinent).
 */
export function nodalKeyboardHandleKeyDown(e: KeyboardEvent, h: NodalKeyboardHandlers): boolean {
  if (isEditingContext(e.target)) return false;

  const modF = (e.ctrlKey || e.metaKey) && (e.key === "f" || e.key === "F");
  if (modF) {
    if (h.anyPopupOpen) return false;
    e.preventDefault();
    h.focusSearchField();
    return true;
  }

  if (h.anyPopupOpen) return false;

  if (e.key === "Escape") {
    e.preventDefault();
    h.deselectAll();
    return true;
  }

  if (e.key === "d" || e.key === "D") {
    if (e.ctrlKey || e.metaKey) return false;
    e.preventDefault();
    h.duplicateSelection();
    return true;
  }

  return false;
}

/** C8.2.1 — raccourcis globaux (Échap, D, Ctrl/Cmd+F recherche). */
export function useNodalKeyboard(handlers: NodalKeyboardHandlers): void {
  const ref = useRef(handlers);
  ref.current = handlers;
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      nodalKeyboardHandleKeyDown(e, ref.current);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);
}
