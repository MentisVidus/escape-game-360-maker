import { useEffect, useState } from "react";
import type { StoreApi } from "zustand/vanilla";

import type { AudioGlobalSettings } from "../../model/project";
import type { NodalProjectStore } from "../../store/nodalProjectStore";
import { PalettePopupModal } from "../palette/PalettePopupModal";

type Locale = "fr" | "en";

const COPY: Record<
  Locale,
  {
    title: string;
    hint: string;
    enabled: string;
    url: string;
    volume: string;
    done: string;
  }
> = {
  fr: {
    title: "Audio",
    hint: "Musique globale du jeu (synchronisée avec le formulaire principal).",
    enabled: "Activer la musique globale",
    url: "URL audio",
    volume: "Volume (0 à 1)",
    done: "Terminé",
  },
  en: {
    title: "Audio",
    hint: "Global game music (synced with the main form).",
    enabled: "Enable global music",
    url: "Audio URL",
    volume: "Volume (0 to 1)",
    done: "Done",
  },
};

function locale(): Locale {
  if (typeof document === "undefined") return "fr";
  return document.documentElement.lang?.toLowerCase().startsWith("en") ? "en" : "fr";
}

function flushNodalToDom() {
  const Ex = typeof window !== "undefined" ? window.EditorSharedBundle : undefined;
  if (Ex && typeof Ex.flushNodalStoreToEditorDom === "function") {
    Ex.flushNodalStoreToEditorDom();
  }
}

const DEFAULT_AUDIO: AudioGlobalSettings = {
  enabled: false,
  url: "",
  volume: 0.5,
};

type Props = {
  open: boolean;
  onClose: () => void;
  onBack?: () => void;
  store: StoreApi<NodalProjectStore>;
};

/** C10.2.d — popup dédiée Audio global (useGlobalAudio + globalMusic.url/volume côté legacy). */
export function AudioGlobalSettingsPopup({ open, onClose, onBack, store }: Props) {
  const L = COPY[locale()];
  const [audio, setAudio] = useState<AudioGlobalSettings>(
    store.getState().meta.settings?.audio ?? DEFAULT_AUDIO
  );

  useEffect(() => {
    if (!open) return;
    setAudio(store.getState().meta.settings?.audio ?? DEFAULT_AUDIO);
    return store.subscribe((s) => setAudio(s.meta.settings?.audio ?? DEFAULT_AUDIO));
  }, [open, store]);

  const commit = (patch: Partial<AudioGlobalSettings>) => {
    store.getState().setMetaSettingsAudio(patch);
    flushNodalToDom();
  };

  const vol = Number.isFinite(Number(audio.volume)) ? Number(audio.volume) : 0.5;

  return (
    <PalettePopupModal
      title={L.title}
      isOpen={open}
      onClose={onClose}
      onBack={onBack}
      panelModifier="nodal-popup-panel--global-hub"
      labelledById="nodal-audio-settings-title"
      locale={locale()}
      footerActions={
        <button type="button" onClick={onClose}>
          {L.done}
        </button>
      }
    >
      <p className="nodal-popup-hint">{L.hint}</p>
      <div className="nodal-global-hub-section-body">
        <label className="nodal-popup-check">
          <input
            type="checkbox"
            checked={!!audio.enabled}
            onChange={(e) => commit({ enabled: e.target.checked })}
          />
          <span>{L.enabled}</span>
        </label>

        <label className="nodal-global-hub-label" htmlFor="nodal-global-audio-url">
          {L.url}
        </label>
        <input
          id="nodal-global-audio-url"
          className="nodal-global-hub-input"
          type="text"
          value={audio.url}
          disabled={!audio.enabled}
          onChange={(e) => commit({ url: e.target.value })}
          autoComplete="off"
        />

        <label className="nodal-global-hub-label" htmlFor="nodal-global-audio-vol">
          {L.volume} ({vol.toFixed(2)})
        </label>
        <input
          id="nodal-global-audio-vol"
          type="range"
          min={0}
          max={1}
          step={0.05}
          value={vol}
          disabled={!audio.enabled}
          onChange={(e) => commit({ volume: Number(e.target.value) })}
        />
      </div>
    </PalettePopupModal>
  );
}

