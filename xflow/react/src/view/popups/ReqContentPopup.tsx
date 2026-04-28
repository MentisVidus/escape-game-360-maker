import "quill/dist/quill.snow.css";
import "../quill/nodalQuillRich.css";

import { useEffect, useMemo, useRef, useState } from "react";
import type { StoreApi } from "zustand/vanilla";

import type { CopyPayload, ReqActionNode } from "../../model/nodes";
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
    preview: string;
    fallback: string;
    defaultBtn: string;
    cancel: string;
    save: string;
    hint: string;
  }
> = {
  fr: {
    title: "Req — contenu KO",
    nodeLabel: "Titre du node",
    body: "Message si objet manquant",
    preview: "Aperçu (popup joueur)",
    fallback: "Il vous manque quelque chose...",
    defaultBtn: "Fermer",
    cancel: "Annuler",
    save: "Enregistrer",
    hint: "Message affiché si l’objet requis est absent. La récompense chainée et l’objet requis restent hors périmètre de cette popup.",
  },
  en: {
    title: "Req — KO content",
    nodeLabel: "Node title",
    body: "Missing-item message",
    preview: "Preview (player popup)",
    fallback: "You are missing something...",
    defaultBtn: "Close",
    cancel: "Cancel",
    save: "Save",
    hint: "Message shown when the required item is missing. Chained reward and required item remain out of scope for this popup.",
  },
};

function detectLocale(): Locale {
  if (typeof document === "undefined") return "fr";
  const lang = document.documentElement.lang?.toLowerCase() ?? "";
  return lang.startsWith("en") ? "en" : "fr";
}

type Props = {
  store: StoreApi<NodalProjectStore>;
  action: ReqActionNode | null;
  onSave: (payload: { label: string; copy: CopyPayload }) => void;
  onClose: () => void;
};

function isQuillHtmlEmpty(html: string): boolean {
  const t = String(html || "").trim().toLowerCase();
  return t === "" || t === "<p><br></p>" || t === "<p></p>";
}

export function ReqContentPopup({ store, action, onSave, onClose }: Props) {
  const [locale] = useState<Locale>(() => detectLocale());
  const L = LABELS[locale];
  const popupTheme = usePlayerPopupTheme(store);
  const previewStyles = useMemo(() => playerPopupThemeToMsgPreviewChrome(popupTheme), [popupTheme]);

  const [previewHtml, setPreviewHtml] = useState("");
  const [nodeLabel, setNodeLabel] = useState("");
  const hostRef = useRef<HTMLDivElement | null>(null);
  const quillRef = useRef<NodalQuillInstance | null>(null);

  useEffect(() => {
    if (!action) {
      setNodeLabel("");
      quillRef.current = null;
      return;
    }
    setNodeLabel(String(action.label ?? ""));
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

  const handleSave = () => {
    const html = quillRef.current?.root.innerHTML ?? "";
    onSave({
      label: nodeLabel.trim(),
      copy: {
        bodyHtml: html,
        buttonLabel: action.payload.copy.buttonLabel ?? "",
      },
    });
    onClose();
  };

  const effectivePreviewHtml = isQuillHtmlEmpty(previewHtml) ? `<p>${L.fallback}</p>` : previewHtml;

  return (
    <div className="nodal-popup-overlay" role="dialog" aria-modal="true" aria-labelledby="req-content-editor-title">
      <div className="nodal-popup-backdrop" onClick={onClose} />
      <div className="nodal-popup-panel nodal-popup-panel--msg-content nodal-popup-panel--hotspot-appearance">
        <h2 id="req-content-editor-title">{L.title}</h2>
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
          </div>

          <aside className="nodal-general-preview" aria-label={L.preview}>
            <span className="nodal-general-preview-label">{L.preview}</span>
            <div className="nodal-general-preview-canvas">
              <div style={previewStyles.viewport}>
                <div className="nodal-msg-preview-chrome" style={previewStyles.panel}>
                  <button type="button" aria-label={L.defaultBtn} disabled style={previewStyles.closeBtn}>
                    ✕
                  </button>
                  <div className="play-html-rich" dangerouslySetInnerHTML={{ __html: effectivePreviewHtml }} />
                  <br />
                  <button type="button" disabled style={previewStyles.btn}>
                    {L.defaultBtn}
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
