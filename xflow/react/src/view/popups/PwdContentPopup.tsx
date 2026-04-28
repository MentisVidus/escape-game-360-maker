import "quill/dist/quill.snow.css";
import "../quill/nodalQuillRich.css";

import { useEffect, useMemo, useRef, useState } from "react";
import type { StoreApi } from "zustand/vanilla";

import type { PwdActionNode } from "../../model/nodes";
import type { NodalProjectStore } from "../../store/nodalProjectStore";
import {
  Quill,
  loadHtmlIntoNodalQuill,
  nodalQuillToolbar,
  registerNodalQuillFormats,
  type NodalQuillInstance,
} from "../quill/nodalQuillSetup";
import { playerPopupThemeToMsgPreviewChrome } from "./playerPopupPreviewFromTheme";
import { usePlayerPopupTheme } from "./usePlayerPopupTheme";

type Locale = "fr" | "en";

const LABELS: Record<
  Locale,
  {
    title: string;
    nodeLabel: string;
    body: string;
    answer: string;
    answerRequired: string;
    preview: string;
    fallback: string;
    submit: string;
    cancel: string;
    save: string;
    hint: string;
  }
> = {
  fr: {
    title: "Pwd — contenu",
    nodeLabel: "Titre du node",
    body: "Texte de l’énigme (riche)",
    answer: "Réponse attendue",
    answerRequired: "La réponse est obligatoire.",
    preview: "Aperçu (popup joueur)",
    fallback: "Code :",
    submit: "Valider",
    cancel: "Annuler",
    save: "Enregistrer",
    hint: "Renseigne l’énigme affichée au joueur et la réponse attendue. La chaîne reward et l’objet restent hors périmètre de cette popup.",
  },
  en: {
    title: "Pwd — content",
    nodeLabel: "Node title",
    body: "Riddle text (rich)",
    answer: "Expected answer",
    answerRequired: "Answer is required.",
    preview: "Preview (player popup)",
    fallback: "Code:",
    submit: "Submit",
    cancel: "Cancel",
    save: "Save",
    hint: "Set the text shown to the player and the expected answer. Reward chaining and item binding remain out of scope for this popup.",
  },
};

function detectLocale(): Locale {
  if (typeof document === "undefined") return "fr";
  const lang = document.documentElement.lang?.toLowerCase() ?? "";
  return lang.startsWith("en") ? "en" : "fr";
}

function isQuillHtmlEmpty(html: string): boolean {
  const t = String(html || "").trim().toLowerCase();
  return t === "" || t === "<p><br></p>" || t === "<p></p>";
}

type Props = {
  store: StoreApi<NodalProjectStore>;
  action: PwdActionNode | null;
  onSave: (payload: { label: string; bodyHtml: string; answer: string }) => void;
  onClose: () => void;
};

export function PwdContentPopup({ store, action, onSave, onClose }: Props) {
  const [locale] = useState<Locale>(() => detectLocale());
  const L = LABELS[locale];
  const popupTheme = usePlayerPopupTheme(store);
  const previewStyles = useMemo(() => playerPopupThemeToMsgPreviewChrome(popupTheme), [popupTheme]);

  const [answer, setAnswer] = useState("");
  const [nodeLabel, setNodeLabel] = useState("");
  const [previewHtml, setPreviewHtml] = useState("");
  const hostRef = useRef<HTMLDivElement | null>(null);
  const quillRef = useRef<NodalQuillInstance | null>(null);

  useEffect(() => {
    if (!action) {
      setAnswer("");
      setNodeLabel("");
      quillRef.current = null;
      return;
    }
    setNodeLabel(String(action.label ?? ""));
    setAnswer(String(action.payload?.answer ?? ""));
  }, [action?.id]);

  useEffect(() => {
    if (!action) return;
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

    const syncHtml = () => {
      setPreviewHtml(q.root.innerHTML);
    };
    syncHtml();
    q.on("text-change", syncHtml);

    return () => {
      q.off("text-change", syncHtml);
      quillRef.current = null;
      el.innerHTML = "";
    };
  }, [action?.id]);

  if (!action) return null;

  const answerTrimmed = answer.trim();
  const canSave = answerTrimmed.length > 0;
  const effectivePreviewHtml = isQuillHtmlEmpty(previewHtml) ? `<p>${L.fallback}</p>` : previewHtml;

  const handleSave = () => {
    if (!canSave) return;
    onSave({
      label: nodeLabel.trim(),
      bodyHtml: quillRef.current?.root.innerHTML ?? "",
      answer: answerTrimmed,
    });
    onClose();
  };

  return (
    <div className="nodal-popup-overlay" role="dialog" aria-modal="true" aria-labelledby="pwd-content-editor-title">
      <div className="nodal-popup-backdrop" onClick={onClose} />
      <div className="nodal-popup-panel nodal-popup-panel--msg-content nodal-popup-panel--hotspot-appearance">
        <h2 id="pwd-content-editor-title">{L.title}</h2>
        <div className="nodal-popup-field nodal-msg-popup-btn-field">
          <span>{L.nodeLabel}</span>
          <input aria-label={L.nodeLabel} type="text" value={nodeLabel} onChange={(e) => setNodeLabel(e.target.value)} />
        </div>
        <p className="nodal-popup-hint">{L.hint}</p>

        <div className="nodal-general-layout nodal-msg-preview-layout">
          <div className="nodal-general-main nodal-msg-popup-main">
            <div className="nodal-popup-field nodal-msg-popup-body-field">
              <span>{L.body}</span>
              <div className="nodal-popup-quill nodal-quill-theme wysiwyg-wrap nodal-msg-quill-wrap">
                <div ref={hostRef} />
              </div>
            </div>
            <div className="nodal-popup-field nodal-msg-popup-btn-field">
              <span>{L.answer}</span>
              <input aria-label={L.answer} type="text" value={answer} onChange={(e) => setAnswer(e.target.value)} />
              {!canSave ? <small>{L.answerRequired}</small> : null}
            </div>
          </div>

          <aside className="nodal-general-preview" aria-label={L.preview}>
            <span className="nodal-general-preview-label">{L.preview}</span>
            <div className="nodal-general-preview-canvas">
              <div style={previewStyles.viewport}>
                <div className="nodal-msg-preview-chrome" style={previewStyles.panel}>
                  <button type="button" aria-label={L.submit} disabled style={previewStyles.closeBtn}>
                    ✕
                  </button>
                  <div className="play-html-rich" dangerouslySetInnerHTML={{ __html: effectivePreviewHtml }} />
                  <br />
                  <input type="text" value="" disabled style={{ width: "100%", marginTop: "8px", boxSizing: "border-box" }} />
                  <button type="button" disabled style={previewStyles.btn}>
                    {L.submit}
                  </button>
                </div>
              </div>
            </div>
          </aside>
        </div>

        <div className="nodal-popup-actions nodal-popup-actions--split">
          <button type="button" className="nodal-ha-btn-secondary" onClick={onClose}>
            {L.cancel}
          </button>
          <button type="button" onClick={handleSave} disabled={!canSave}>
            {L.save}
          </button>
        </div>
      </div>
    </div>
  );
}
