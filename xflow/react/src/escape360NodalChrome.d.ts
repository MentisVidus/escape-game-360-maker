/** Pont posé par `editeur-app.js` / `editor-en-app.js` pour la palette carte nodale. */
export type Escape360NodalChromeApi = {
  saveEscapegameBundle: () => void;
  flushThenSaveJson: () => void;
  flushThenLocalDraftSnapshot: () => Promise<void>;
  triggerLoadEscapegame: () => void;
  closeProjectMapModal: () => void;
  /** C10.1 — Publication HTML autonome (modale Publication). */
  generateGameHtml: () => void;
  /** C10.1 — Publication ZIP web hors-ligne (modale Publication). Async (fetch CDN + JSZip). */
  exportGameWebZip: () => Promise<void> | void;
  /** C10.5 — fichier local → URL `blob:` (session bundle). Annuler la boîte de dialogue → résout `null`. */
  pickLocalBundleMedia?: (accept: string) => Promise<string | null>;
  updatePreview?: () => void;
};

declare global {
  interface Window {
    __escape360NodalChrome?: Escape360NodalChromeApi;
    /** Legacy bundle API (`js/editor-shared-bundle.js`) — flush nodal → DOM ; upload local C10.5. */
    EditorSharedBundle?: {
      flushNodalStoreToEditorDom?: () => void;
      pickLocalMediaFromBundle?: (accept: string) => Promise<string | null>;
      releaseBundleTrackedBlobUrl?: (url?: string | null) => void;
    };
    /** Synchronise aperçus inventaire / popups + thème Quill (formulaire principal). */
    updatePreview?: () => void;
  }
}

export {};
