import { useEffect, useState } from "react";
import type { StoreApi } from "zustand/vanilla";

import type {
  PlayerSaveMode,
  PlayerSaveSettings,
  TimerGlobalSettings,
  TimerMode,
} from "../../model/project";
import type { NodalProjectStore } from "../../store/nodalProjectStore";
import { PalettePopupModal } from "../palette/PalettePopupModal";

type Locale = "fr" | "en";

const COPY: Record<
  Locale,
  {
    title: string;
    hint: string;
    timerEnabled: string;
    timerMode: string;
    timerStartSeconds: string;
    timerAutoStart: string;
    timerPauseOnPopup: string;
    playerSaveHeading: string;
    playerSaveMode: string;
    done: string;
    timerCountdown: string;
    timerCountup: string;
    saveNone: string;
    saveManual: string;
    saveAuto: string;
  }
> = {
  fr: {
    title: "Timer & sauvegarde",
    hint: "Réglages timer global et mode de sauvegarde joueur.",
    timerEnabled: "Activer le timer",
    timerMode: "Mode timer",
    timerStartSeconds: "Durée initiale (secondes)",
    timerAutoStart: "Démarrage automatique",
    timerPauseOnPopup: "Pause pendant les popups",
    playerSaveHeading: "Sauvegarde progression joueur",
    playerSaveMode: "Mode",
    done: "Terminé",
    timerCountdown: "Compte à rebours",
    timerCountup: "Chrono (compte croissant)",
    saveNone: "Aucune sauvegarde",
    saveManual: "Manuelle (.escapegame + reprise locale)",
    saveAuto: "Auto + manuel",
  },
  en: {
    title: "Timer & save",
    hint: "Global timer settings and player save mode.",
    timerEnabled: "Enable timer",
    timerMode: "Timer mode",
    timerStartSeconds: "Initial duration (seconds)",
    timerAutoStart: "Auto start",
    timerPauseOnPopup: "Pause while popups are open",
    playerSaveHeading: "Player progression save",
    playerSaveMode: "Mode",
    done: "Done",
    timerCountdown: "Countdown",
    timerCountup: "Count up",
    saveNone: "No save",
    saveManual: "Manual (.escapegame + local continue)",
    saveAuto: "Auto + manual",
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

const DEFAULT_TIMER: TimerGlobalSettings = {
  enabled: false,
  mode: "countdown",
  startSeconds: 1800,
  autoStart: true,
  pauseWhenPopupOpen: false,
};

const DEFAULT_PLAYER_SAVE: PlayerSaveSettings = {
  mode: "manual",
};

type Props = {
  open: boolean;
  onClose: () => void;
  onBack?: () => void;
  store: StoreApi<NodalProjectStore>;
};

/** C10.2.e — popup dédiée timer global + sauvegarde progression joueur. */
export function TimerAndSavePlayerSettingsPopup({ open, onClose, onBack, store }: Props) {
  const L = COPY[locale()];
  const [timer, setTimer] = useState<TimerGlobalSettings>(
    store.getState().meta.settings?.timer ?? DEFAULT_TIMER
  );
  const [playerSave, setPlayerSave] = useState<PlayerSaveSettings>(
    store.getState().meta.settings?.playerSave ?? DEFAULT_PLAYER_SAVE
  );

  useEffect(() => {
    if (!open) return;
    setTimer(store.getState().meta.settings?.timer ?? DEFAULT_TIMER);
    setPlayerSave(store.getState().meta.settings?.playerSave ?? DEFAULT_PLAYER_SAVE);
    return store.subscribe((s) => {
      setTimer(s.meta.settings?.timer ?? DEFAULT_TIMER);
      setPlayerSave(s.meta.settings?.playerSave ?? DEFAULT_PLAYER_SAVE);
    });
  }, [open, store]);

  const commitTimer = (patch: Partial<TimerGlobalSettings>) => {
    store.getState().setMetaSettingsTimer(patch);
    flushNodalToDom();
  };

  const commitPlayerSave = (patch: Partial<PlayerSaveSettings>) => {
    store.getState().setMetaSettingsPlayerSave(patch);
    flushNodalToDom();
  };

  return (
    <PalettePopupModal
      title={L.title}
      isOpen={open}
      onClose={onClose}
      onBack={onBack}
      panelModifier="nodal-popup-panel--global-hub"
      labelledById="nodal-timer-save-settings-title"
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
            checked={!!timer.enabled}
            onChange={(e) => commitTimer({ enabled: e.target.checked })}
          />
          <span>{L.timerEnabled}</span>
        </label>

        <label className="nodal-global-hub-label" htmlFor="nodal-timer-mode">
          {L.timerMode}
        </label>
        <select
          id="nodal-timer-mode"
          className="nodal-global-hub-input"
          value={timer.mode}
          disabled={!timer.enabled}
          onChange={(e) => commitTimer({ mode: e.target.value as TimerMode })}
        >
          <option value="countdown">{L.timerCountdown}</option>
          <option value="countup">{L.timerCountup}</option>
        </select>

        <label className="nodal-global-hub-label" htmlFor="nodal-timer-start-seconds">
          {L.timerStartSeconds}
        </label>
        <input
          id="nodal-timer-start-seconds"
          className="nodal-global-hub-input"
          type="number"
          min={0}
          step={1}
          value={timer.startSeconds}
          disabled={!timer.enabled}
          onChange={(e) => commitTimer({ startSeconds: Number(e.target.value) })}
        />

        <label className="nodal-popup-check">
          <input
            type="checkbox"
            checked={!!timer.autoStart}
            disabled={!timer.enabled}
            onChange={(e) => commitTimer({ autoStart: e.target.checked })}
          />
          <span>{L.timerAutoStart}</span>
        </label>

        <label className="nodal-popup-check">
          <input
            type="checkbox"
            checked={!!timer.pauseWhenPopupOpen}
            disabled={!timer.enabled}
            onChange={(e) => commitTimer({ pauseWhenPopupOpen: e.target.checked })}
          />
          <span>{L.timerPauseOnPopup}</span>
        </label>

        <h4 className="scene-block-heading" style={{ margin: "10px 0 4px 0" }}>
          {L.playerSaveHeading}
        </h4>
        <label className="nodal-global-hub-label" htmlFor="nodal-player-save-mode">
          {L.playerSaveMode}
        </label>
        <select
          id="nodal-player-save-mode"
          className="nodal-global-hub-input"
          value={playerSave.mode}
          onChange={(e) => commitPlayerSave({ mode: e.target.value as PlayerSaveMode })}
        >
          <option value="none">{L.saveNone}</option>
          <option value="manual">{L.saveManual}</option>
          <option value="auto">{L.saveAuto}</option>
        </select>
      </div>
    </PalettePopupModal>
  );
}

