import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import type { StoreApi } from "zustand/vanilla";

import type { ActionNodeId, MediaNodeId, SceneNodeId } from "../../model/ids";
import type { NodalProjectStore } from "../../store/nodalProjectStore";
import { getAudioChannelsService, type AudioChannel, type AudioChannelState } from "../../services/audioChannelsService";
import { resolveSceneAmbianceMeta } from "../playerPreview/playerPreviewAudio";

export type ScenePreviewAudioBarLabels = {
  muteAll: string;
  unmuteAll: string;
  replaySfx: string;
  sliderGlobal: string;
  sliderAmbient: string;
  sliderLastSfx: string;
};

type Props = {
  store: StoreApi<NodalProjectStore>;
  sceneId: SceneNodeId;
  labels: ScenePreviewAudioBarLabels;
  audioMuted: boolean;
  onAudioMutedChange: (muted: boolean) => void;
};

function useChannelState(channel: AudioChannel): AudioChannelState {
  const [st, setSt] = useState(() => getAudioChannelsService().getState(channel));
  useEffect(() => getAudioChannelsService().subscribe(channel, setSt), [channel]);
  return st;
}

/**
 * C19.2 — Panneau repliable : mute global, 3 sliders (persistance store),
 * replay dernier SFX.
 */
export function ScenePreviewAudioBar({ store, sceneId, labels, audioMuted, onAudioMutedChange }: Props) {
  const snap = useSyncExternalStore(store.subscribe, () => store.getState(), () => store.getState());
  const sfxSt = useChannelState("sfx");

  const globalMeta = snap.meta.settings?.audio;
  const globalApplicable = !!(globalMeta?.enabled && String(globalMeta?.url ?? "").trim());
  const ambMeta = resolveSceneAmbianceMeta(snap, sceneId);

  const onGlobalVol = useCallback(
    (v: number) => {
      const svc = getAudioChannelsService();
      svc.setVolume("global", v);
      store.getState().setMetaSettingsAudio({ volume: v });
    },
    [store]
  );

  const onAmbientVol = useCallback(
    (v: number) => {
      if (!ambMeta) return;
      const svc = getAudioChannelsService();
      svc.setVolume("ambient", v);
      const m = snap.media[ambMeta.mediaNodeId];
      if (m?.mediaType === "media-audio") {
        store.getState().updateNodeData(ambMeta.mediaNodeId, {
          data: { ...m.data, volume: v },
        } as never);
      }
    },
    [ambMeta, snap.media, store]
  );

  const persistSfxBaseVolume = useCallback(
    (nodeId: string, v: number) => {
      const st = store.getState();
      const act = st.actions[nodeId as ActionNodeId];
      if (act && "sfx" in act && act.sfx) {
        store.getState().updateNodeData(act.id, {
          sfx: { ...act.sfx, volume: v },
        } as never);
        return;
      }
      const med = st.media[nodeId as MediaNodeId];
      if (med?.mediaType === "media-audio") {
        store.getState().updateNodeData(med.id, {
          data: { ...med.data, volume: v },
        } as never);
      }
    },
    [store]
  );

  const onSfxVol = useCallback(
    (v: number) => {
      const svc = getAudioChannelsService();
      svc.setVolume("sfx", v);
      const ls = sfxSt.lastSfx;
      if (ls?.nodeId) persistSfxBaseVolume(ls.nodeId, v);
    },
    [persistSfxBaseVolume, sfxSt.lastSfx]
  );

  const onMuteToggle = () => {
    const svc = getAudioChannelsService();
    if (!audioMuted) {
      svc.stopAll({ clearLastSfx: false });
      onAudioMutedChange(true);
    } else {
      onAudioMutedChange(false);
    }
  };

  const onReplay = () => {
    const ls = sfxSt.lastSfx;
    if (!ls?.url) return;
    getAudioChannelsService().play("sfx", ls.url, {
      volume: ls.volume,
      nodeId: ls.nodeId || undefined,
    });
  };

  const globalVol = globalMeta && typeof globalMeta.volume === "number" ? globalMeta.volume : 1;
  const ambientVol = ambMeta?.volume ?? 1;

  return (
    <div className="nodal-scene-preview-modal__audio-drawer-inner">
      <div className="nodal-scene-preview-modal__audio-drawer-actions">
        <button type="button" className="nodal-scene-preview-modal__audio-mute-btn" onClick={onMuteToggle}>
          {audioMuted ? `🔊 ${labels.unmuteAll}` : `🔇 ${labels.muteAll}`}
        </button>
        <button
          type="button"
          className="nodal-scene-preview-modal__audio-replay-btn"
          disabled={!sfxSt.lastSfx?.url}
          onClick={onReplay}
        >
          {labels.replaySfx}
        </button>
      </div>
      <div className="nodal-scene-preview-modal__audio-sliders">
        {globalApplicable ? (
          <label className="nodal-scene-preview-modal__audio-slider-row">
            <span>{labels.sliderGlobal}</span>
            <input
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={globalVol}
              onChange={(e) => onGlobalVol(Number(e.target.value))}
            />
          </label>
        ) : null}
        {ambMeta ? (
          <label className="nodal-scene-preview-modal__audio-slider-row">
            <span>{labels.sliderAmbient}</span>
            <input
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={ambientVol}
              onChange={(e) => onAmbientVol(Number(e.target.value))}
            />
          </label>
        ) : null}
        {sfxSt.lastSfx ? (
          <label className="nodal-scene-preview-modal__audio-slider-row">
            <span>{labels.sliderLastSfx}</span>
            <input
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={sfxSt.lastSfx.volume}
              onChange={(e) => onSfxVol(Number(e.target.value))}
            />
          </label>
        ) : null}
      </div>
    </div>
  );
}
