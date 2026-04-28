/** Pont posé par `editeur-app.js` / `editor-en-app.js` pour la palette carte nodale. */
export type Escape360NodalChromeApi = {
  saveEscapegameBundle: () => void;
  flushThenSaveJson: () => void;
  flushThenLocalDraftSnapshot: () => Promise<void>;
  triggerLoadEscapegame: () => void;
  closeProjectMapModal: () => void;
  updatePreview?: () => void;
};

declare global {
  interface Window {
    __escape360NodalChrome?: Escape360NodalChromeApi;
    /** Synchronise aperçus inventaire / popups + thème Quill (formulaire principal). */
    updatePreview?: () => void;
  }
}

export {};
