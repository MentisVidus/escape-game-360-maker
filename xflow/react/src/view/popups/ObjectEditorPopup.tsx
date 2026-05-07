import { useEffect, useId, useRef, useState } from "react";
import type { ObjectEntry } from "../../model/objects";
import type { ObjectSatelliteNode } from "../../model/nodes";

import { MediaUploadButton } from "../components/MediaUploadButton";
import { MEDIA_ACCEPT_IMAGE_LOOSE } from "../components/mediaUploadAccept";

type Props = {
  satellite: ObjectSatelliteNode | null;
  objectEntry: ObjectEntry | null;
  objectEntries: Record<string, ObjectEntry>;
  objectIds: string[];
  onChangeObjectId: (objectId: string) => void;
  onUpsertObject: (entry: ObjectEntry) => void;
  onClose: () => void;
};

export function ObjectEditorPopup({
  satellite,
  objectEntry,
  objectEntries,
  objectIds,
  onChangeObjectId,
  onUpsertObject,
  onClose,
}: Props) {
  const listId = useId();
  const lastSatelliteIdRef = useRef<string | null>(null);

  const [objectIdInput, setObjectIdInput] = useState("");
  const [displayNameInput, setDisplayNameInput] = useState("");
  const [iconUrlInput, setIconUrlInput] = useState("");

  useEffect(() => {
    if (!satellite) {
      lastSatelliteIdRef.current = null;
      setObjectIdInput("");
      setDisplayNameInput("");
      setIconUrlInput("");
      return;
    }

    if (lastSatelliteIdRef.current !== satellite.id) {
      lastSatelliteIdRef.current = satellite.id;
      setObjectIdInput(satellite.data.objectId ?? "");
      setDisplayNameInput(objectEntry?.displayName ?? "");
      setIconUrlInput(objectEntry?.iconUrl ?? "");
    }
  }, [satellite, objectEntry]);

  useEffect(() => {
    if (!satellite || !objectEntry) return;
    if (lastSatelliteIdRef.current !== satellite.id) return;
    // Pas de branche else volontaire: on ne reset jamais à vide ici
    // pour éviter la régression C3a.2 (écrasement pendant édition active).
    setDisplayNameInput(objectEntry.displayName ?? "");
    setIconUrlInput(objectEntry.iconUrl ?? "");
  }, [satellite?.id, satellite?.data.objectId, objectEntry]);

  if (!satellite) return null;
  const safeObjectIds = objectIds.filter((id): id is string => typeof id === "string" && id.trim().length > 0);

  return (
    <div className="nodal-popup-overlay" role="dialog" aria-modal="true" aria-labelledby="object-editor-title">
      <div className="nodal-popup-backdrop" onClick={onClose} />
      <div className="nodal-popup-panel">
        <h2 id="object-editor-title">Objet (inventaire)</h2>
        <label className="nodal-popup-field">
          <span>objectId</span>
          <input
            list={listId}
            value={objectIdInput}
            onChange={(e) => setObjectIdInput(e.target.value)}
            onBlur={() => {
              const trimmed = objectIdInput.trim();
              if (!trimmed) {
                setObjectIdInput(satellite.data.objectId ?? "");
                return;
              }
              onChangeObjectId(trimmed);
              const existingEntry = objectEntries[trimmed];
              if (!existingEntry) {
                onUpsertObject({
                  objectId: trimmed,
                  displayName: displayNameInput,
                  iconMediaId: null,
                  iconUrl: iconUrlInput,
                });
              }
            }}
          />
          <datalist id={listId}>
            {safeObjectIds.map((k) => (
              <option key={k} value={k} />
            ))}
          </datalist>
        </label>
        <label className="nodal-popup-field">
          <span>displayName</span>
          <input
            value={displayNameInput}
            onChange={(e) => setDisplayNameInput(e.target.value)}
            onBlur={() => {
              const oid = objectIdInput.trim();
              // Ne pas écrire sur un objectId vide ou non-existant.
              if (!oid || !objectEntries[oid]) return;
              onUpsertObject({
                objectId: oid,
                displayName: displayNameInput,
                iconMediaId: objectEntries[oid].iconMediaId,
                iconUrl: objectEntries[oid].iconUrl,
              });
            }}
          />
        </label>
        <label className="nodal-popup-field">
          <span>Icône (URL)</span>
          <div className="nodal-url-with-upload">
            <input
              className="nodal-url-with-upload__input"
              value={iconUrlInput}
              onChange={(e) => setIconUrlInput(e.target.value)}
              onBlur={() => {
                const oid = objectIdInput.trim();
                // Ne pas écrire sur un objectId vide ou non-existant.
                if (!oid || !objectEntries[oid]) return;
                onUpsertObject({
                  objectId: oid,
                  displayName: objectEntries[oid].displayName,
                  iconMediaId: objectEntries[oid].iconMediaId,
                  iconUrl: iconUrlInput,
                });
              }}
            />
            <MediaUploadButton
              accept={MEDIA_ACCEPT_IMAGE_LOOSE}
              currentUrl={iconUrlInput.trim().startsWith("blob:") ? iconUrlInput.trim() : undefined}
              onPicked={(next) => {
                setIconUrlInput(next);
                const oid = objectIdInput.trim();
                if (!oid || !objectEntries[oid]) return;
                onUpsertObject({
                  objectId: oid,
                  displayName: objectEntries[oid].displayName,
                  iconMediaId: objectEntries[oid].iconMediaId,
                  iconUrl: next,
                });
              }}
            />
          </div>
        </label>
        <div className="nodal-popup-actions">
          <button type="button" onClick={onClose}>
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
}
