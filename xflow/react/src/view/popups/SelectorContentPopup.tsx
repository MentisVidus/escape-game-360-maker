import "quill/dist/quill.snow.css";
import "../quill/nodalQuillRich.css";

import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import type { StoreApi } from "zustand/vanilla";

import type { SelectorActionNode } from "../../model/nodes";
import type { NodalProjectStore } from "../../store/nodalProjectStore";
import {
  Quill,
  loadHtmlIntoNodalQuill,
  nodalQuillToolbar,
  registerNodalQuillFormats,
  type NodalQuillInstance,
} from "../quill/nodalQuillSetup";
import { playerPopupThemeToMsgPreviewChrome } from "./playerPopupPreviewFromTheme";
import { PlayerPopupPreview } from "./PlayerPopupPreview";
import { usePlayerPopupTheme } from "./usePlayerPopupTheme";

type Locale = "fr" | "en";
type DisplayMode = "buttons" | "dropdown";

const LABELS: Record<
  Locale,
  {
    title: string;
    nodeLabel: string;
    nestedTitle: string;
    body: string;
    displayMode: string;
    displayButtons: string;
    displayDropdown: string;
    preview: string;
    previewTitleFallback: string;
    choicePlaceholder: string;
    noChoicePlaceholder: string;
    cancel: string;
    save: string;
    hint: string;
  }
> = {
  fr: {
    title: "Selector — contenu",
    nodeLabel: "Titre du node",
    nestedTitle: "Titre du menu",
    body: "Texte introductif (riche)",
    displayMode: "Mode d'affichage",
    displayButtons: "Boutons",
    displayDropdown: "Liste déroulante",
    preview: "Aperçu (popup joueur)",
    previewTitleFallback: "Faites un choix",
    choicePlaceholder: "Choix",
    noChoicePlaceholder: "Aucune option",
    cancel: "Annuler",
    save: "Enregistrer",
    hint: "Phase B : aperçu branché sur les enfants directs du selector (ordre nodal).",
  },
  en: {
    title: "Selector — content",
    nodeLabel: "Node title",
    nestedTitle: "Menu title",
    body: "Intro text (rich)",
    displayMode: "Display mode",
    displayButtons: "Buttons",
    displayDropdown: "Dropdown",
    preview: "Preview (player popup)",
    previewTitleFallback: "Make a choice",
    choicePlaceholder: "Choice",
    noChoicePlaceholder: "No option",
    cancel: "Cancel",
    save: "Save",
    hint: "Phase B: preview uses selector direct children labels (nodal order).",
  },
};

function detectLocale(): Locale {
  if (typeof document === "undefined") return "fr";
  const lang = document.documentElement.lang?.toLowerCase() ?? "";
  return lang.startsWith("en") ? "en" : "fr";
}

type Props = {
  store: StoreApi<NodalProjectStore>;
  action: SelectorActionNode | null;
  onSave: (patch: { label: string; title: string; bodyHtml: string; displayMode: DisplayMode }) => void;
  onClose: () => void;
};

export function SelectorContentPopup({ store, action, onSave, onClose }: Props) {
  const state = useSyncExternalStore(store.subscribe, store.getState, store.getState);
  const [locale] = useState<Locale>(() => detectLocale());
  const L = LABELS[locale];
  const popupTheme = usePlayerPopupTheme(store);
  const previewStyles = useMemo(() => playerPopupThemeToMsgPreviewChrome(popupTheme), [popupTheme]);

  const [title, setTitle] = useState("");
  const [nodeLabel, setNodeLabel] = useState("");
  const [displayMode, setDisplayMode] = useState<DisplayMode>("buttons");
  const [previewHtml, setPreviewHtml] = useState("");
  const hostRef = useRef<HTMLDivElement | null>(null);
  const quillRef = useRef<NodalQuillInstance | null>(null);

  useEffect(() => {
    if (!action) {
      setNodeLabel("");
      setTitle("");
      setDisplayMode("buttons");
      quillRef.current = null;
      return;
    }
    setNodeLabel(String(action.label ?? ""));
    setTitle(String(action.payload?.nested?.title ?? ""));
    setDisplayMode(action.payload?.nested?.displayMode === "dropdown" ? "dropdown" : "buttons");
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
    loadHtmlIntoNodalQuill(q, String(action.payload?.nested?.copy?.bodyHtml ?? ""));
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

  const selectorChildIds = (() => {
    const viaParentId = Object.keys(state.actions).filter((candidateId) => state.layout[candidateId]?.parentId === action.id);
    const ordered = viaParentId.length
      ? viaParentId
      : state.edges
          .filter((edge) => edge.family === "flow" && edge.sourceId === action.id && edge.targetId in state.actions)
          .map((edge) => edge.targetId);
    return [...ordered].sort((a, b) => {
      const ya = state.layout[a]?.y ?? 0;
      const yb = state.layout[b]?.y ?? 0;
      if (ya !== yb) return ya - yb;
      return String(a).localeCompare(String(b));
    });
  })();
  const selectorChildLabels = selectorChildIds.map((id, index) => {
    const label = String(state.actions[id]?.label ?? "").trim();
    return label || `${L.choicePlaceholder} ${index + 1}`;
  });
  if (selectorChildLabels.length === 0) selectorChildLabels.push(`${L.noChoicePlaceholder} 1`);

  const handleSave = () => {
    onSave({
      label: nodeLabel.trim(),
      title: title.trim(),
      bodyHtml: quillRef.current?.root.innerHTML ?? "",
      displayMode,
    });
    onClose();
  };

  const previewTitle = title.trim() || L.previewTitleFallback;

  return (
    <div className="nodal-popup-overlay" role="dialog" aria-modal="true" aria-labelledby="selector-content-editor-title">
      <div className="nodal-popup-backdrop" onClick={onClose} />
      <div className="nodal-popup-panel nodal-popup-panel--msg-content nodal-popup-panel--hotspot-appearance">
        <h2 id="selector-content-editor-title">{L.title}</h2>
        <div className="nodal-popup-field nodal-msg-popup-btn-field">
          <span>{L.nodeLabel}</span>
          <input aria-label={L.nodeLabel} type="text" value={nodeLabel} onChange={(e) => setNodeLabel(e.target.value)} />
        </div>
        <p className="nodal-popup-hint">{L.hint}</p>

        <div className="nodal-general-layout nodal-msg-preview-layout">
          <div className="nodal-general-main nodal-msg-popup-main">
            <div className="nodal-popup-field nodal-msg-popup-btn-field">
              <span>{L.nestedTitle}</span>
              <input aria-label={L.nestedTitle} type="text" value={title} onChange={(e) => setTitle(e.target.value)} />
            </div>
            <div className="nodal-popup-field nodal-msg-popup-body-field">
              <span>{L.body}</span>
              <div className="nodal-popup-quill nodal-quill-theme wysiwyg-wrap nodal-msg-quill-wrap">
                <div ref={hostRef} />
              </div>
            </div>
            <div className="nodal-popup-field nodal-msg-popup-btn-field">
              <span>{L.displayMode}</span>
              <select value={displayMode} onChange={(e) => setDisplayMode(e.target.value === "dropdown" ? "dropdown" : "buttons")}>
                <option value="buttons">{L.displayButtons}</option>
                <option value="dropdown">{L.displayDropdown}</option>
              </select>
            </div>
          </div>

          <aside className="nodal-general-preview" aria-label={L.preview}>
            <span className="nodal-general-preview-label">{L.preview}</span>
            <div className="nodal-general-preview-canvas">
              <PlayerPopupPreview
                viewportStyle={previewStyles.viewport}
                panelStyle={previewStyles.panel}
                closeBtnStyle={previewStyles.closeBtn}
                buttonStyle={previewStyles.btn}
                closeAriaLabel="Close"
                titleText={previewTitle}
                html={previewHtml || "<p><br></p>"}
                variant={
                  displayMode === "buttons"
                    ? { kind: "selector-buttons", choices: selectorChildLabels }
                    : { kind: "selector-dropdown", choices: selectorChildLabels }
                }
              />
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
