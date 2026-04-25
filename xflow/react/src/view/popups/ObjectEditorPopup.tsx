import { useEffect, useId, useState } from "react";
import type { ObjectEntry } from "../../model/objects";
import type { ObjectSatelliteNode } from "../../model/nodes";
import "./ObjectEditorPopup.css";

type Props = {
  satellite: ObjectSatelliteNode | null;
  objectEntry: ObjectEntry | null;
  objectIds: string[];
  onChangeObjectId: (objectId: string) => void;
  onUpsertObject: (entry: ObjectEntry) => void;
  onClose: () => void;
};

export function ObjectEditorPopup({
  satellite,
  objectEntry,
  objectIds,
  onChangeObjectId,
  onUpsertObject,
  onClose,
}: Props) {
  const listId = useId();

  const [objectIdInput, setObjectIdInput] = useState("");
  const [displayNameInput, setDisplayNameInput] = useState("");
  const [iconUrlInput, setIconUrlInput] = useState("");

  useEffect(() => {
    if (!satellite) return;
    setObjectIdInput(satellite.data.objectId);
    setDisplayNameInput(objectEntry?.displayName ?? "");
    setIconUrlInput(objectEntry?.iconUrl ?? "");
  }, [satellite, objectEntry]);

  if (!satellite) return null;

  return (
    <div className="object-editor-overlay" role="dialog" aria-modal="true" aria-labelledby="object-editor-title">
      <div className="object-editor-backdrop" onClick={onClose} />
      <div className="object-editor-panel">
        <h2 id="object-editor-title">Objet (inventaire)</h2>
        <label className="object-editor-field">
          <span>objectId</span>
          <input
            list={listId}
            value={objectIdInput}
            onChange={(e) => setObjectIdInput(e.target.value)}
            onBlur={() => {
              const oid = objectIdInput.trim();
              onChangeObjectId(oid);
              if (!oid) return;
              onUpsertObject({
                objectId: oid,
                displayName: displayNameInput,
                iconMediaId: objectEntry?.iconMediaId ?? null,
                iconUrl: iconUrlInput,
              });
            }}
          />
          <datalist id={listId}>
            {objectIds.map((k) => (
              <option key={k} value={k} />
            ))}
          </datalist>
        </label>
        <label className="object-editor-field">
          <span>displayName</span>
          <input
            value={displayNameInput}
            onChange={(e) => setDisplayNameInput(e.target.value)}
            onBlur={() => {
              const oid = objectIdInput.trim();
              if (!oid) return;
              onUpsertObject({
                objectId: oid,
                displayName: displayNameInput,
                iconMediaId: objectEntry?.iconMediaId ?? null,
                iconUrl: iconUrlInput,
              });
            }}
          />
        </label>
        <label className="object-editor-field">
          <span>Icône (URL)</span>
          <input
            value={iconUrlInput}
            onChange={(e) => setIconUrlInput(e.target.value)}
            onBlur={() => {
              const oid = objectIdInput.trim();
              if (!oid) return;
              onUpsertObject({
                objectId: oid,
                displayName: displayNameInput,
                iconMediaId: objectEntry?.iconMediaId ?? null,
                iconUrl: iconUrlInput,
              });
            }}
          />
        </label>
        <div className="object-editor-actions">
          <button type="button" onClick={onClose}>
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
}
