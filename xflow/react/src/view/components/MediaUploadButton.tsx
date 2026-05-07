import { useCallback, useState } from "react";

import "./MediaUploadButton.css";

type Locale = "fr" | "en";

const TOOLTIP: Record<Locale, string> = {
  fr: "Importer depuis l'ordinateur",
  en: "Import from computer",
};

const ALERT: Record<Locale, string> = {
  fr: "Pont éditeur indisponible (pickLocalBundleMedia). Rechargez la page.",
  en: "Editor bridge unavailable (pickLocalBundleMedia). Reload the page.",
};

function locale(): Locale {
  if (typeof document === "undefined") return "fr";
  return document.documentElement.lang?.toLowerCase().startsWith("en") ? "en" : "fr";
}

function releasePrevBlob(url: string | undefined) {
  const b = typeof window !== "undefined" ? window.EditorSharedBundle : undefined;
  if (b && typeof b.releaseBundleTrackedBlobUrl === "function") {
    b.releaseBundleTrackedBlobUrl(url);
  }
}

export type MediaUploadButtonProps = {
  accept: string;
  onPicked: (url: string) => void;
  disabled?: boolean;
  /** URL `blob:` actuelle à révoquer si l’utilisateur en choisit une nouvelle (session bundle). */
  currentUrl?: string;
  tooltip?: string;
};

/**
 * C10.5 — bouton upload local (ZIP `.escapegame` / session `blob:`).
 * Popups équipées : `AudioGlobalSettingsPopup`, `InventoryGlobalSettingsPopup`, `MediaEditorPopup`,
 * `HotspotAppearancePopup`, `ObjectEditorPopup`. Pas d’éditeur d’URL panorama scène dédié en React
 * (panorama porté par `SceneNode` + nœud média image meta).
 */
export function MediaUploadButton({ accept, onPicked, disabled, currentUrl, tooltip }: MediaUploadButtonProps) {
  const localeCode = locale();
  const title = tooltip ?? TOOLTIP[localeCode];
  const [busy, setBusy] = useState(false);

  const onClick = useCallback(async () => {
    if (disabled || busy) return;
    const chrome = typeof window !== "undefined" ? window.__escape360NodalChrome : undefined;
    if (!chrome || typeof chrome.pickLocalBundleMedia !== "function") {
      window.alert(ALERT[locale()]);
      return;
    }
    setBusy(true);
    try {
      const next = await chrome.pickLocalBundleMedia(accept);
      if (next == null || next === "") return;
      releasePrevBlob(currentUrl);
      onPicked(next);
    } finally {
      setBusy(false);
    }
  }, [accept, busy, currentUrl, disabled, onPicked]);

  return (
    <button
      type="button"
      className="nodal-media-upload-btn"
      title={title}
      aria-label={title}
      disabled={!!disabled || busy}
      onClick={() => void onClick()}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
      >
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
        <polyline points="17 8 12 3 7 8" />
        <line x1="12" x2="12" y1="3" y2="15" />
      </svg>
    </button>
  );
}
