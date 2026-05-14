import { useId, type CSSProperties, type MouseEvent as ReactMouseEvent } from "react";

type ButtonVariant = {
  kind: "button";
  label: string;
};

type InputVariant = {
  kind: "input";
  buttonLabel: string;
};

type SelectorButtonsVariant = {
  kind: "selector-buttons";
  choices: string[];
};

type SelectorDropdownVariant = {
  kind: "selector-dropdown";
  choices: string[];
};

type PreviewVariant = ButtonVariant | InputVariant | SelectorButtonsVariant | SelectorDropdownVariant;

/**
 * C18.5.1 — quand fourni, active les contrôles de la popup (boutons cliquables,
 * curseur pointer). Rétrocompatible : si `interactive` est `undefined`,
 * comportement legacy "preview disabled" inchangé (utilisé par
 * `MsgContentPopup` / `PickContentPopup` / etc. pour leur aperçu d'éditeur).
 *
 * - `onClose` : clic sur le bouton de fermeture (X).
 * - `onConfirm` : clic sur le bouton principal (variant `button` / `input`).
 *   Optionnel : si absent, le bouton agit comme `onClose`.
 * - `onChoice` : clic sur un choix selector (variant `selector-buttons`) ou
 *   changement de sélection (variant `selector-dropdown`). Reçoit l'index du
 *   choix dans le tableau `choices`.
 */
export type PlayerPopupPreviewInteractive = {
  onClose: () => void;
  onConfirm?: () => void;
  onChoice?: (index: number) => void;
};

type Props = {
  viewportStyle: CSSProperties;
  panelStyle: CSSProperties;
  closeBtnStyle: CSSProperties;
  buttonStyle: CSSProperties;
  closeAriaLabel: string;
  html: string;
  titleText?: string;
  variant: PreviewVariant;
  /** C18.5.1 — si fourni, active les contrôles (sinon : preview disabled, legacy). */
  interactive?: PlayerPopupPreviewInteractive;
  /**
   * C18.5.1 — clic sur le viewport (backdrop) hors panel → ferme l'overlay.
   * Vérifie `event.target === event.currentTarget` pour ne pas réagir aux
   * clics qui ont bullé depuis le panel.
   */
  onBackdropClick?: () => void;
  /**
   * C18.5.2-fix — bouton « ← Retour » intégré dans le panel (top bar
   * gauche), aligné sur le runtime joueur `openSelector` /
   * `renderSelectorPanel` qui place le retour dans la popup elle-même
   * (pas en overlay externe). Si fourni : bouton visible et cliquable.
   * Si `undefined` : top bar absent (legacy / niveau racine).
   * `backLabel` : texte du bouton (défaut « ← Retour » / « ← Back »).
   *
   * Note : `| undefined` explicite pour cohabiter avec
   * `exactOptionalPropertyTypes: true` côté `PlayerPreviewOverlay` où on
   * passe `undefined` conditionnellement (niveau racine vs profond).
   */
  onBack?: (() => void) | undefined;
  backLabel?: string | undefined;
};

export function PlayerPopupPreview({
  viewportStyle,
  panelStyle,
  closeBtnStyle,
  buttonStyle,
  closeAriaLabel,
  html,
  titleText,
  variant,
  interactive,
  onBackdropClick,
  onBack,
  backLabel,
}: Props) {
  const isInteractive = !!interactive;
  const interactiveCloseBtnStyle: CSSProperties = isInteractive
    ? { ...closeBtnStyle, cursor: "pointer", opacity: 1 }
    : closeBtnStyle;
  const interactiveBtnStyle: CSSProperties = isInteractive
    ? { ...buttonStyle, cursor: "pointer" }
    : buttonStyle;

  const handleViewportClick = (ev: ReactMouseEvent<HTMLDivElement>) => {
    if (!onBackdropClick) return;
    if (ev.target === ev.currentTarget) onBackdropClick();
  };

  // C18.5.2-fix — bouton retour intégré au panel (style aligné runtime joueur
  // `editeur-generate.js` `renderSelectorPanel` : padding 6/10, fond
  // semi-transparent, radius 4, font hérité, couleur héritée).
  const backBtnStyle: CSSProperties = {
    cursor: "pointer",
    padding: "6px 10px",
    border: "none",
    borderRadius: 4,
    background: "rgba(255,255,255,0.15)",
    color: "inherit",
    font: "inherit",
  };

  // C18.5.3 — IDs locaux pour ARIA. `role="dialog"` + `aria-modal="true"`
  // marquent la popup comme modale pour les lecteurs d'écran. `aria-labelledby`
  // référence le titre si présent (titleText), sinon on retombe sur
  // `aria-label={closeAriaLabel}` (lecteur d'écran annonce au moins
  // "Fermer" comme repère). `aria-describedby` référence le corps Quill.
  const titleId = useId();
  const bodyId = useId();
  const hasTitle = !!titleText;

  return (
    <div style={viewportStyle} onClick={onBackdropClick ? handleViewportClick : undefined}>
      <div
        className="nodal-msg-preview-chrome"
        style={panelStyle}
        role="dialog"
        aria-modal="true"
        {...(hasTitle ? { "aria-labelledby": titleId } : { "aria-label": closeAriaLabel })}
        aria-describedby={bodyId}
      >
        {onBack ? (
          <button
            type="button"
            className="nodal-player-popup-back"
            style={backBtnStyle}
            onClick={onBack}
          >
            {backLabel || "← Retour"}
          </button>
        ) : null}
        <button
          type="button"
          aria-label={closeAriaLabel}
          disabled={!isInteractive}
          style={interactiveCloseBtnStyle}
          onClick={interactive?.onClose}
        >
          ✕
        </button>
        {titleText ? (
          <p>
            <strong id={titleId}>{titleText}</strong>
          </p>
        ) : null}
        <div id={bodyId} className="play-html-rich" dangerouslySetInnerHTML={{ __html: html }} />
        <br />
        {variant.kind === "button" ? (
          <button
            type="button"
            disabled={!isInteractive}
            style={interactiveBtnStyle}
            onClick={interactive?.onConfirm ?? interactive?.onClose}
          >
            {variant.label}
          </button>
        ) : null}
        {variant.kind === "input" ? (
          <>
            {/* C18.5.1 — input pwd reste désactivé en preview (pas de check
                amené dans le périmètre Q-C18.5-2 amendée). Le bouton ferme. */}
            <input
              type="text"
              value=""
              disabled
              style={{ width: "100%", marginTop: "8px", boxSizing: "border-box" }}
              readOnly
            />
            <button
              type="button"
              disabled={!isInteractive}
              style={interactiveBtnStyle}
              onClick={interactive?.onConfirm ?? interactive?.onClose}
            >
              {variant.buttonLabel}
            </button>
          </>
        ) : null}
        {variant.kind === "selector-buttons" ? (
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
            {variant.choices.map((choice, index) => (
              <button
                key={`${index}-${choice}`}
                type="button"
                disabled={!isInteractive}
                style={interactiveBtnStyle}
                onClick={isInteractive ? () => interactive!.onChoice?.(index) : undefined}
              >
                {choice}
              </button>
            ))}
          </div>
        ) : null}
        {variant.kind === "selector-dropdown" ? (
          <select
            disabled={!isInteractive}
            style={{ width: "100%", padding: "6px 8px", boxSizing: "border-box" }}
            onChange={
              isInteractive
                ? (ev) => interactive!.onChoice?.(ev.target.selectedIndex)
                : undefined
            }
            defaultValue=""
          >
            {variant.choices.map((choice, index) => (
              <option key={`${index}-${choice}`} value={String(index)}>
                {choice}
              </option>
            ))}
          </select>
        ) : null}
      </div>
    </div>
  );
}
