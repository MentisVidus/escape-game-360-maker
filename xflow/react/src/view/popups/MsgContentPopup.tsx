import { useEffect, useState } from "react";

import type { CopyPayload, MsgActionNode } from "../../model/nodes";

type Locale = "fr" | "en";

const LABELS: Record<
  Locale,
  { title: string; body: string; btn: string; cancel: string; save: string; hint: string }
> = {
  fr: {
    title: "Message — contenu",
    body: "Corps (HTML)",
    btn: "Libellé du bouton",
    cancel: "Annuler",
    save: "Enregistrer",
    hint: "Édition HTML brut sur la carte ; parité Quill / legacy prévue plus tard (chantier C7).",
  },
  en: {
    title: "Message — content",
    body: "Body (HTML)",
    btn: "Button label",
    cancel: "Cancel",
    save: "Save",
    hint: "Raw HTML on the map; Quill / legacy WYSIWYG parity planned later (C7).",
  },
};

function detectLocale(): Locale {
  if (typeof document === "undefined") return "fr";
  const lang = document.documentElement.lang?.toLowerCase() ?? "";
  return lang.startsWith("en") ? "en" : "fr";
}

type Props = {
  action: MsgActionNode | null;
  onSave: (copy: CopyPayload) => void;
  onClose: () => void;
};

export function MsgContentPopup({ action, onSave, onClose }: Props) {
  const [locale] = useState<Locale>(() => detectLocale());
  const L = LABELS[locale];
  const [bodyHtml, setBodyHtml] = useState("");
  const [buttonLabel, setButtonLabel] = useState("");

  useEffect(() => {
    if (!action) {
      setBodyHtml("");
      setButtonLabel("");
      return;
    }
    setBodyHtml(String(action.payload?.copy?.bodyHtml ?? ""));
    setButtonLabel(String(action.payload?.copy?.buttonLabel ?? ""));
  }, [action]);

  if (!action) return null;

  const handleSave = () => {
    onSave({
      bodyHtml,
      buttonLabel: buttonLabel.trim(),
    });
    onClose();
  };

  return (
    <div className="nodal-popup-overlay" role="dialog" aria-modal="true" aria-labelledby="msg-content-editor-title">
      <div className="nodal-popup-backdrop" onClick={onClose} />
      <div className="nodal-popup-panel nodal-popup-panel--msg-content">
        <h2 id="msg-content-editor-title">{L.title}</h2>
        <p className="nodal-popup-hint">{L.hint}</p>
        <label className="nodal-popup-field">
          <span>{L.body}</span>
          <textarea
            className="nodal-popup-textarea"
            rows={14}
            value={bodyHtml}
            onChange={(e) => setBodyHtml(e.target.value)}
            spellCheck={false}
          />
        </label>
        <label className="nodal-popup-field">
          <span>{L.btn}</span>
          <input type="text" value={buttonLabel} onChange={(e) => setButtonLabel(e.target.value)} />
        </label>
        <div className="nodal-popup-actions nodal-popup-actions--split">
          <button type="button" className="nodal-ha-btn-secondary" onClick={onClose}>
            {L.cancel}
          </button>
          <button type="button" onClick={handleSave}>
            {L.save}
          </button>
        </div>
      </div>
    </div>
  );
}
