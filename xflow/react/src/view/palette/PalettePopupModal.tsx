import { useEffect, useRef, type ReactNode } from "react";

import "./PalettePopupModal.css";

type Locale = "fr" | "en";

type Props = {
  /** Titre affiché en haut du panneau (`<h2>`). */
  title: string;
  /** Visibilité de la modale. `false` ⇒ rien dans le DOM (parent contrôle l’état). */
  isOpen: boolean;
  /** Appelé sur clic overlay, clic croix. Échap est géré globalement (`useNodalKeyboard` → `closeActiveModal`). */
  onClose: () => void;
  /** Contenu principal (corps de la modale). */
  children: ReactNode;
  /** Boutons d’action en bas optionnels (alignés à droite par défaut). */
  footerActions?: ReactNode;
  /** Modificateur CSS optionnel sur `.nodal-popup-panel` (p. ex. `nodal-popup-panel--publish`). */
  panelModifier?: string;
  /** id ARIA pour `aria-labelledby` sur le rôle dialog. Défaut : auto. */
  labelledById?: string;
  /** Locale pour le label de fermeture (croix). */
  locale?: Locale;
};

/**
 * C10.1 — Composant modale partagé pour les surfaces déclenchées **depuis la palette
 * carte nodale** (Publication, Paramètres globaux à venir). Périmètre minimal
 * (Q-C10.1.x-1 (a)) : ne migre pas les popups d’éditeurs d’action C7.x —
 * facorisation globale = chantier hygiène séparé (`NodalPopupModal` réservé).
 *
 * Reprend le pattern visuel des autres popups nodaux
 * (`nodal-popup-overlay` / `nodal-popup-backdrop` / `nodal-popup-panel`)
 * et y ajoute :
 *  - bouton croix de fermeture dans le coin haut-droit ;
 *  - focus initial sur le titre, restauration du focus à la fermeture ;
 *  - clic overlay ⇒ `onClose` ;
 *  - `panelModifier` pour ajuster la largeur / l’habillage par cas d’usage.
 *
 * Échap : volontairement non géré ici (responsabilité de `useNodalKeyboard` +
 * `closeActiveModal` dans `NodalCanvas` qui priorise les surfaces ouvertes).
 */
export function PalettePopupModal({
  title,
  isOpen,
  onClose,
  children,
  footerActions,
  panelModifier,
  labelledById,
  locale,
}: Props) {
  const titleRef = useRef<HTMLHeadingElement>(null);
  const previouslyFocusedRef = useRef<HTMLElement | null>(null);
  const autoIdRef = useRef<string>(
    `palette-popup-${Math.random().toString(36).slice(2, 10)}`
  );
  const headingId = labelledById ?? autoIdRef.current;
  const closeLabel =
    (locale ?? detectLocale()) === "en" ? "Close" : "Fermer";

  useEffect(() => {
    if (!isOpen) return;
    /* Sauvegarde du focus précédent pour restauration à la fermeture. */
    const active = (typeof document !== "undefined" ? document.activeElement : null) as
      | HTMLElement
      | null;
    previouslyFocusedRef.current = active ?? null;
    /* Focus initial sur le titre (tabindex=-1) — annonce SR du titre, navigation Tab à partir du titre. */
    titleRef.current?.focus();

    return () => {
      const prev = previouslyFocusedRef.current;
      previouslyFocusedRef.current = null;
      if (prev && typeof prev.focus === "function") {
        try {
          prev.focus();
        } catch {
          /* ignore : élément précédent peut avoir été démonté. */
        }
      }
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const panelClass =
    "nodal-popup-panel" + (panelModifier ? " " + panelModifier : "");

  return (
    <div
      className="nodal-popup-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby={headingId}
    >
      <div className="nodal-popup-backdrop" onClick={onClose} />
      <div className={panelClass}>
        <button
          type="button"
          className="palette-popup-close"
          aria-label={closeLabel}
          title={closeLabel}
          onClick={onClose}
        >
          ×
        </button>
        <h2 id={headingId} ref={titleRef} tabIndex={-1}>
          {title}
        </h2>
        <div className="palette-popup-body">{children}</div>
        {footerActions ? (
          <div className="nodal-popup-actions">{footerActions}</div>
        ) : null}
      </div>
    </div>
  );
}

function detectLocale(): Locale {
  if (typeof document === "undefined") return "fr";
  return document.documentElement.lang?.toLowerCase().startsWith("en") ? "en" : "fr";
}
