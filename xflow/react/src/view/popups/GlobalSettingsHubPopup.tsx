type Locale = "fr" | "en";

const COPY: Record<
  Locale,
  { title: string; popups: string; soon1: string; soon2: string; close: string }
> = {
  fr: {
    title: "Réglages globaux",
    popups: "Personnalisation des popups",
    soon1: "Inventaire global — bientôt",
    soon2: "Audio / timer — bientôt",
    close: "Fermer",
  },
  en: {
    title: "Global settings",
    popups: "Popup appearance",
    soon1: "Global inventory — coming soon",
    soon2: "Audio / timer — coming soon",
    close: "Close",
  },
};

function locale(): Locale {
  if (typeof document === "undefined") return "fr";
  return document.documentElement.lang?.toLowerCase().startsWith("en") ? "en" : "fr";
}

type Props = {
  open: boolean;
  onClose: () => void;
  onOpenPopupTheme: () => void;
};

export function GlobalSettingsHubPopup({ open, onClose, onOpenPopupTheme }: Props) {
  if (!open) return null;
  const L = COPY[locale()];

  return (
    <div className="nodal-popup-overlay" role="dialog" aria-modal="true" aria-labelledby="nodal-global-hub-title">
      <div className="nodal-popup-backdrop" onClick={onClose} />
      <div className="nodal-popup-panel nodal-popup-panel--global-hub">
        <h2 id="nodal-global-hub-title">{L.title}</h2>
        <p className="nodal-popup-hint">
          {locale() === "fr"
            ? "Choisissez une section. Les réglages sont synchronisés avec le formulaire principal."
            : "Pick a section. Settings stay in sync with the main form."}
        </p>
        <div className="nodal-global-hub-actions">
          <button type="button" className="nodal-global-hub-btn nodal-global-hub-btn--primary" onClick={onOpenPopupTheme}>
            {L.popups}
          </button>
          <button type="button" className="nodal-global-hub-btn" disabled>
            {L.soon1}
          </button>
          <button type="button" className="nodal-global-hub-btn" disabled>
            {L.soon2}
          </button>
        </div>
        <div className="nodal-popup-actions">
          <button type="button" onClick={onClose}>
            {L.close}
          </button>
        </div>
      </div>
    </div>
  );
}
