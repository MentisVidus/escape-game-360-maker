import { useCallback, useEffect, useState } from "react";

import type { MediaNodeId } from "../../model/ids";
import {
  getAudioChannelsService,
  type AudioChannel,
  type AudioChannelState,
} from "../../services/audioChannelsService";

export type AudioPreviewButtonProps = {
  url: string;
  channel: AudioChannel;
  volume: number;
  nodeId?: MediaNodeId;
  className?: string;
  disabled?: boolean;
};

/**
 * C19.1 — Lecture preview sur un canal du service singleton (loop dérivé
 * du canal). Auto-`stop(channel)` au unmount. ARIA minimal.
 */
export function AudioPreviewButton({
  url,
  channel,
  volume,
  nodeId,
  className,
  disabled,
}: AudioPreviewButtonProps) {
  const [state, setState] = useState<AudioChannelState>(() => getAudioChannelsService().getState(channel));

  useEffect(() => {
    const svc = getAudioChannelsService();
    return svc.subscribe(channel, setState);
  }, [channel]);

  useEffect(() => {
    const svc = getAudioChannelsService();
    svc.setVolume(channel, volume);
  }, [channel, volume]);

  useEffect(() => {
    return () => {
      getAudioChannelsService().stop(channel);
    };
  }, [channel]);

  const trimmed = String(url ?? "").trim();
  const isDisabled = !!disabled || !trimmed;
  const playing = state.isPlaying && !state.readyToResume;
  const label = playing ? "Pause la lecture audio" : "Lire l'aperçu audio";
  const errTip = state.error ?? "";

  const onClick = useCallback(() => {
    if (isDisabled) return;
    const svc = getAudioChannelsService();
    const t = trimmed;
    if (state.isPlaying) {
      svc.pause(channel);
      return;
    }
    if (state.readyToResume && state.currentSrc === t) {
      svc.resume(channel);
      return;
    }
    svc.play(channel, t, { volume, nodeId });
  }, [channel, isDisabled, nodeId, state.currentSrc, state.isPlaying, state.readyToResume, trimmed, volume]);

  return (
    <span className={className} style={{ display: "inline-flex", flexDirection: "column", alignItems: "stretch", gap: 2 }}>
      <button
        type="button"
        disabled={isDisabled}
        aria-label={label}
        aria-pressed={playing}
        title={errTip || label}
        onClick={onClick}
        style={{ minWidth: 36, padding: "2px 8px" }}
      >
        {playing ? "⏸" : "▶"}
      </button>
      <span
        aria-hidden
        style={{
          display: "block",
          height: 3,
          width: "100%",
          minWidth: 48,
          background: "#3333",
          borderRadius: 2,
          overflow: "hidden",
        }}
      >
        <span
          style={{
            display: "block",
            height: "100%",
            width: `${Math.round((state.progress || 0) * 100)}%`,
            background: state.error ? "#c0392b" : "#2980b9",
          }}
        />
      </span>
    </span>
  );
}
