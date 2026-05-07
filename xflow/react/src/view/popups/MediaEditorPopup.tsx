import { useEffect, useState } from "react";

import type { MediaAudioNode, MediaNode } from "../../model/nodes";
import { MediaUploadButton } from "../components/MediaUploadButton";
import { MEDIA_ACCEPT_AUDIO, MEDIA_ACCEPT_PANORAMA_IMAGE } from "../components/mediaUploadAccept";

type Props = {
  media: MediaNode | null;
  onChange: (patch: { label?: string; url?: string; volume?: number }) => void;
  onClose: () => void;
};

export function MediaEditorPopup({ media, onChange, onClose }: Props) {
  const [label, setLabel] = useState("");
  const [url, setUrl] = useState("");
  const [volume, setVolume] = useState("1");

  useEffect(() => {
    if (!media) {
      setLabel("");
      setUrl("");
      setVolume("1");
      return;
    }
    setLabel(String(media.label ?? ""));
    setUrl(String(media.data.url ?? ""));
    setVolume(String(media.mediaType === "media-audio" ? (media.data as MediaAudioNode["data"]).volume ?? 1 : 1));
  }, [media]);

  if (!media) return null;

  const isAudio = media.mediaType === "media-audio";
  const title = isAudio ? "Média — audio" : "Média — image";

  const flushUrl = () => {
    const trimmed = url.trim();
    const nextLabel = label.trim();
    if (isAudio) {
      const v = Number(volume);
      const vol = Number.isFinite(v) ? Math.max(0, Math.min(1, v)) : 1;
      onChange({ label: nextLabel, url: trimmed, volume: vol });
    } else {
      onChange({ label: nextLabel, url: trimmed });
    }
  };

  return (
    <div className="nodal-popup-overlay" role="dialog" aria-modal="true" aria-labelledby="media-editor-title">
      <div className="nodal-popup-backdrop" onClick={onClose} />
      <div className="nodal-popup-panel">
        <h2 id="media-editor-title">{title}</h2>
        <label className="nodal-popup-field">
          <span>Titre du node</span>
          <input type="text" value={label} onChange={(e) => setLabel(e.target.value)} onBlur={flushUrl} />
        </label>
        <label className="nodal-popup-field">
          <span>URL</span>
          <div className="nodal-url-with-upload">
            <input
              className="nodal-url-with-upload__input"
              type="text"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              onBlur={flushUrl}
            />
            <MediaUploadButton
              accept={isAudio ? MEDIA_ACCEPT_AUDIO : MEDIA_ACCEPT_PANORAMA_IMAGE}
              currentUrl={url.trim().startsWith("blob:") ? url.trim() : undefined}
              onPicked={(next) => {
                setUrl(next);
                const nextLabel = label.trim();
                if (isAudio) {
                  const v = Number(volume);
                  const vol = Number.isFinite(v) ? Math.max(0, Math.min(1, v)) : 1;
                  onChange({ label: nextLabel, url: next, volume: vol });
                } else {
                  onChange({ label: nextLabel, url: next });
                }
              }}
            />
          </div>
        </label>
        {!isAudio && url.trim() ? (
          <div className="nodal-popup-media-preview">
            <img key={url.trim()} src={url.trim()} alt="" />
          </div>
        ) : null}
        {isAudio ? (
          <label className="nodal-popup-field">
            <span>Volume ({volume})</span>
            <input
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={Number.isFinite(Number(volume)) ? Number(volume) : 1}
              onChange={(e) => {
                setVolume(e.target.value);
                const v = Number(e.target.value);
                if (Number.isFinite(v)) {
                  onChange({ label: label.trim(), url: url.trim(), volume: Math.max(0, Math.min(1, v)) });
                }
              }}
            />
          </label>
        ) : null}
        <div className="nodal-popup-actions">
          <button type="button" onClick={onClose}>
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
}
