import { useCallback, useState } from "react";

import { PalettePopupModal } from "../palette/PalettePopupModal";

type Locale = "fr" | "en";

const COPY: Record<
  Locale,
  {
    title: string;
    hint: string;
    standalone: string;
    standaloneDesc: string;
    webZip: string;
    webZipDesc: string;
    deploy: string;
    deployTooltip: string;
    generating: string;
  }
> = {
  fr: {
    title: "Publication du jeu",
    hint: "Choisissez un format de livraison.",
    standalone: "HTML autonome",
    standaloneDesc:
      "Un seul fichier index.html (CDN Pannellum + URLs des médias).",
    webZip: "ZIP web hors-ligne",
    webZipDesc:
      "index.html + Pannellum + médias bundle/blobs locaux dans media/ — prêt à héberger.",
    deploy: "Déployer",
    deployTooltip: "Disponible avec C11",
    generating: "Génération…",
  },
  en: {
    title: "Publish your game",
    hint: "Pick a delivery format.",
    standalone: "Standalone HTML",
    standaloneDesc:
      "Single index.html file (Pannellum CDN + media URLs).",
    webZip: "Offline web ZIP",
    webZipDesc:
      "index.html + Pannellum + bundled / local-blob media in media/ — ready to host.",
    deploy: "Deploy",
    deployTooltip: "Available in C11",
    generating: "Generating…",
  },
};

function locale(): Locale {
  if (typeof document === "undefined") return "fr";
  return document.documentElement.lang?.toLowerCase().startsWith("en") ? "en" : "fr";
}

function nodalChrome() {
  return typeof window !== "undefined" ? window.__escape360NodalChrome : undefined;
}

type Props = {
  open: boolean;
  onClose: () => void;
};

/**
 * C10.1 — Modale « Publication du jeu » : 3 chemins de publication exposés
 * depuis la palette nodale. Le flush nodal → DOM legacy est garanti **dans**
 * `generateGame` / `exportGameWebZip` (defense in depth Q-C10.1.x-3) — la
 * modale n’a pas à le déclencher.
 */
export function PublishGamePopup({ open, onClose }: Props) {
  const L = COPY[locale()];
  const [busy, setBusy] = useState(false);

  const onStandalone = useCallback(() => {
    /* `generateGame()` est synchrone (< 50 ms) — pas de busy state (Q-C10.1.x-6 α). */
    const c = nodalChrome();
    if (!c) {
      window.alert(
        locale() === "en"
          ? "Editor bridge not ready. Reload the page."
          : "Pont éditeur indisponible. Rechargez la page."
      );
      return;
    }
    c.generateGameHtml();
  }, []);

  const onWebZip = useCallback(async () => {
    /* `exportGameWebZip()` async (fetch CDN + JSZip) — busy state (Q-C10.1.x-6 β). */
    const c = nodalChrome();
    if (!c) {
      window.alert(
        locale() === "en"
          ? "Editor bridge not ready. Reload the page."
          : "Pont éditeur indisponible. Rechargez la page."
      );
      return;
    }
    setBusy(true);
    try {
      await c.exportGameWebZip();
    } finally {
      setBusy(false);
    }
  }, []);

  return (
    <PalettePopupModal
      title={L.title}
      isOpen={open}
      onClose={onClose}
      panelModifier="nodal-popup-panel--publish"
      labelledById="nodal-publish-title"
    >
      <p className="nodal-popup-hint">{L.hint}</p>
      <div className="nodal-publish-actions">
        <button
          type="button"
          className="nodal-publish-btn nodal-publish-btn--primary"
          onClick={onStandalone}
          disabled={busy}
        >
          <strong>{L.standalone}</strong>
          <br />
          <small>{L.standaloneDesc}</small>
        </button>
        <button
          type="button"
          className="nodal-publish-btn"
          onClick={onWebZip}
          disabled={busy}
        >
          <strong>{busy ? L.generating : L.webZip}</strong>
          <br />
          <small>{L.webZipDesc}</small>
        </button>
        <button
          type="button"
          className="nodal-publish-btn"
          disabled
          title={L.deployTooltip}
          aria-label={L.deploy + " — " + L.deployTooltip}
        >
          <strong>{L.deploy}</strong>
          <br />
          <small>{L.deployTooltip}</small>
        </button>
      </div>
    </PalettePopupModal>
  );
}
