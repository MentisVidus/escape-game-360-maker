import "quill/dist/quill.snow.css";
import "../quill/nodalQuillRich.css";

import { useEffect, useRef, useState } from "react";

import type { CopyPayload, MsgActionNode } from "../../model/nodes";
import {
  Quill,
  loadHtmlIntoNodalQuill,
  nodalQuillToolbar,
  registerNodalQuillFormats,
  type NodalQuillInstance,
} from "../quill/nodalQuillSetup";

type Locale = "fr" | "en";

const LABELS: Record<
  Locale,
  { title: string; body: string; btn: string; cancel: string; save: string; hint: string }
> = {
  fr: {
    title: "Message — contenu",
    body: "Corps (texte riche)",
    btn: "Libellé du bouton",
    cancel: "Annuler",
    save: "Enregistrer",
    hint: "Même barre d’outils Quill que le formulaire (polices, tailles, listes, couleurs…). Le rendu suit le thème clair / sombre de la carte.",
  },
  en: {
    title: "Message — content",
    body: "Body (rich text)",
    btn: "Button label",
    cancel: "Cancel",
    save: "Save",
    hint: "Same Quill toolbar as the main form (fonts, sizes, lists, colors…). Styling follows the map light / dark theme.",
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
  const [buttonLabel, setButtonLabel] = useState("");
  const hostRef = useRef<HTMLDivElement | null>(null);
  const quillRef = useRef<NodalQuillInstance | null>(null);

  useEffect(() => {
    if (!action) {
      setButtonLabel("");
      return;
    }
    setButtonLabel(String(action.payload?.copy?.buttonLabel ?? ""));
  }, [action]);

  useEffect(() => {
    if (!action) {
      quillRef.current = null;
      return;
    }
    const el = hostRef.current;
    if (!el) return;

    registerNodalQuillFormats();
    el.innerHTML = "";
    const q = new Quill(el, {
      theme: "snow",
      modules: { toolbar: nodalQuillToolbar() },
    }) as NodalQuillInstance;
    loadHtmlIntoNodalQuill(q, String(action.payload?.copy?.bodyHtml ?? ""));
    quillRef.current = q;

    return () => {
      quillRef.current = null;
      el.innerHTML = "";
    };
  }, [action?.id]);

  if (!action) return null;

  const handleSave = () => {
    const html = quillRef.current?.root.innerHTML ?? "";
    onSave({
      bodyHtml: html,
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
          <div className="nodal-popup-quill wysiwyg-wrap">
            <div ref={hostRef} />
          </div>
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
