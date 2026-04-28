import "quill/dist/quill.snow.css";
import "../quill/nodalQuillRich.css";

import { useEffect, useMemo, useRef, useState } from "react";
import type { StoreApi } from "zustand/vanilla";

import type { CopyPayload, GotoActionNode } from "../../model/nodes";
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
    body: string;
    btn: string;
    preview: string;
    defaultBtn: string;
    cancel: string;
    save: string;
    hint: string;
  }
> = {
  fr: {
    title: "Goto — contenu",
    body: "Texte de transition (riche)",
    btn: "Libellé du bouton",
    preview: "Aperçu (popup joueur)",
    defaultBtn: "Continuer",
    cancel: "Annuler",
    save: "Enregistrer",
    hint: "Texte et bouton optionnels pour la transition. Le ciblage de scène reste géré par la connexion goto.",
  },
  en: {
    title: "Goto — content",
    body: "Transition text (rich)",
    btn: "Button label",
    preview: "Preview (player popup)",
    defaultBtn: "Continue",
    cancel: "Cancel",
    save: "Save",
    hint: "Optional transition text and button label. Scene targeting remains handled by the goto connection.",
  },
};

function detectLocale(): Locale {
  if (typeof document === "undefined") return "fr";
  const lang = document.documentElement.lang?.toLowerCase() ?? "";
  return lang.startsWith("en") ? "en" : "fr";
}

type Props = {
  store: StoreApi<NodalProjectStore>;
  action: GotoActionNode | null;
  onSave: (copy: CopyPayload) => void;
  onClose: () => void;
};

export function GotoContentPopup({ store, action, onSave, onClose }: Props) {
  const [locale] = useState<Locale>(() => detectLocale());
  const L = LABELS[locale];
  const popupTheme = usePlayerPopupTheme(store);
  const previewStyles = useMemo(() => playerPopupThemeToMsgPreviewChrome(popupTheme), [popupTheme]);

  const [buttonLabel, setButtonLabel] = useState("");
  const [previewHtml, setPreviewHtml] = useState("");
  const hostRef = useRef<HTMLDivElement | null>(null);
  const quillRef = useRef<NodalQuillInstance | null>(null);

  useEffect(() => {
    if (!action) {
      setButtonLabel("");
      quillRef.current = null;
      return;
    }
    setButtonLabel(String(action.payload?.copy?.buttonLabel ?? ""));
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

  const previewBtnText = buttonLabel.trim() || L.defaultBtn;

  const handleSave = () => {
    onSave({
      bodyHtml: quillRef.current?.root.innerHTML ?? "",
      buttonLabel: buttonLabel.trim(),
    });
    onClose();
  };

  return (
    <div className="nodal-popup-overlay" role="dialog" aria-modal="true" aria-labelledby="goto-content-editor-title">
      <div className="nodal-popup-backdrop" onClick={onClose} />
      <div className="nodal-popup-panel nodal-popup-panel--msg-content nodal-popup-panel--hotspot-appearance">
        <h2 id="goto-content-editor-title">{L.title}</h2>
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
              <span>{L.btn}</span>
              <input aria-label={L.btn} type="text" value={buttonLabel} onChange={(e) => setButtonLabel(e.target.value)} />
            </div>
          </div>

          <aside className="nodal-general-preview" aria-label={L.preview}>
            <span className="nodal-general-preview-label">{L.preview}</span>
            <div className="nodal-general-preview-canvas">
              <div style={previewStyles.viewport}>
                <div className="nodal-msg-preview-chrome" style={previewStyles.panel}>
                  <button type="button" aria-label={L.defaultBtn} disabled style={previewStyles.closeBtn}>
                    ✕
                  </button>
                  <div className="play-html-rich" dangerouslySetInnerHTML={{ __html: previewHtml || "<p><br></p>" }} />
                  <br />
                  <button type="button" disabled style={previewStyles.btn}>
                    {previewBtnText}
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
          <button type="button" onClick={handleSave}>
            {L.save}
          </button>
        </div>
      </div>
    </div>
  );
}
