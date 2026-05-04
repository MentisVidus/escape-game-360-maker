import { useEffect, useRef } from "react";

import "./KeyboardShortcutsPopup.css";

type Locale = "fr" | "en";

type Copy = {
  title: string;
  close: string;
  editTitle: string;
  navTitle: string;
  selTitle: string;
  foldTitle: string;
  rows: { keys: string; desc: string }[][];
};

const STRINGS: Record<Locale, Copy> = {
  fr: {
    title: "Raccourcis clavier",
    close: "Fermer",
    editTitle: "Édition",
    navTitle: "Navigation",
    selTitle: "Sélection",
    foldTitle: "Repli",
    rows: [
      [
        { keys: "Ctrl+C", desc: "Copier la sélection" },
        { keys: "Ctrl+V", desc: "Coller (souris ou centre vue)" },
        { keys: "Suppr / Retour arrière", desc: "Supprimer la sélection (confirmations si besoin)" },
      ],
      [{ keys: "Ctrl+F", desc: "Focus recherche nœuds" }, { keys: "Échap", desc: "Désélectionner ou fermer une popup" }],
      [
        { keys: "Maj+clic", desc: "Multi-sélection" },
        { keys: "Maj+glisser", desc: "Sélection rectangle" },
      ],
      [{ keys: "Chevron ▾/▸", desc: "Replier / déplier selector ou scène (cadre)" }],
    ],
  },
  en: {
    title: "Keyboard shortcuts",
    close: "Close",
    editTitle: "Editing",
    navTitle: "Navigation",
    selTitle: "Selection",
    foldTitle: "Fold",
    rows: [
      [
        { keys: "Ctrl+C / Cmd+C", desc: "Copy selection" },
        { keys: "Ctrl+V / Cmd+V", desc: "Paste (pointer or view centre)" },
        { keys: "Delete / Backspace", desc: "Delete selection (confirms when needed)" },
      ],
      [
        { keys: "Ctrl+F / Cmd+F", desc: "Focus node search" },
        { keys: "Escape", desc: "Clear selection or close a popup" },
      ],
      [{ keys: "Shift+click", desc: "Multi-select" }, { keys: "Shift+drag", desc: "Rectangle selection" }],
      [{ keys: "Chevron ▾/▸", desc: "Fold / unfold selector or scene frame" }],
    ],
  },
};

function locale(): Locale {
  if (typeof document === "undefined") return "fr";
  return document.documentElement.lang?.toLowerCase().startsWith("en") ? "en" : "fr";
}

type Props = {
  open: boolean;
  onClose: () => void;
};

/** C8.2.3 — aide raccourcis (bouton palette + touche `?`). */
export function KeyboardShortcutsPopup({ open, onClose }: Props) {
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    closeRef.current?.focus();
  }, [open]);

  /* Échap : `useNodalKeyboard` → `closeActiveModal` (NodalCanvas). */

  if (!open) return null;

  const L = STRINGS[locale()];
  const sectionTitles = [L.editTitle, L.navTitle, L.selTitle, L.foldTitle];

  return (
    <div className="nodal-popup-overlay" role="dialog" aria-modal="true" aria-labelledby="nodal-kbd-shortcuts-title">
      <div className="nodal-popup-backdrop" onClick={onClose} />
      <div className="nodal-popup-panel nodal-popup-panel--keyboard-shortcuts">
        <h2 id="nodal-kbd-shortcuts-title">{L.title}</h2>
        <div className="nodal-kbd-shortcuts-body">
          {L.rows.map((section, i) => (
            <section key={sectionTitles[i]} className="nodal-kbd-shortcuts-section">
              <h3 className="nodal-kbd-shortcuts-section-title">{sectionTitles[i]}</h3>
              <ul className="nodal-kbd-shortcuts-list">
                {section.map((row) => (
                  <li key={row.keys}>
                    <kbd className="nodal-kbd-shortcuts-kbd">{row.keys}</kbd>
                    <span className="nodal-kbd-shortcuts-desc">{row.desc}</span>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
        <div className="nodal-popup-actions">
          <button ref={closeRef} type="button" className="nodal-ha-btn-secondary" onClick={onClose}>
            {L.close}
          </button>
        </div>
      </div>
    </div>
  );
}
