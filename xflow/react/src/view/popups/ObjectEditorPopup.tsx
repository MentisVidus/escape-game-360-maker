import { useCallback, useEffect, useId, useState, useSyncExternalStore } from "react";
import type { StoreApi } from "zustand/vanilla";

import type { SatelliteNodeId } from "../../model/ids";
import type { ObjectEntry } from "../../model/objects";
import type { NodalProjectStore } from "../../store/nodalProjectStore";
import "./ObjectEditorPopup.css";

type Props = {
  store: StoreApi<NodalProjectStore>;
  satelliteId: SatelliteNodeId | null;
  onClose: () => void;
};

function readSnapshot(store: StoreApi<NodalProjectStore>, satelliteId: SatelliteNodeId | null) {
  if (!satelliteId) return null;
  const st = store.getState();
  const sat = st.satellites[satelliteId];
  if (!sat || sat.satelliteType !== "object") return null;
  const oid = sat.data.objectId;
  const entry = oid ? st.meta.objects[oid] : undefined;
  return { oid, entry };
}

export function ObjectEditorPopup({ store, satelliteId, onClose }: Props) {
  const listId = useId();
  const snap = useSyncExternalStore(
    store.subscribe,
    () => readSnapshot(store, satelliteId),
    () => readSnapshot(store, satelliteId)
  );

  const [objectIdInput, setObjectIdInput] = useState("");
  const [displayNameInput, setDisplayNameInput] = useState("");
  const [iconUrlInput, setIconUrlInput] = useState("");

  useEffect(() => {
    if (!snap) return;
    setObjectIdInput(snap.oid);
    setDisplayNameInput(snap.entry?.displayName ?? "");
    setIconUrlInput(snap.entry?.iconUrl ?? "");
  }, [snap, satelliteId]);

  const pushEntry = useCallback(
    (oid: string, partial: Partial<ObjectEntry>) => {
      const st = store.getState();
      const prev = st.meta.objects[oid] ?? {
        objectId: oid,
        displayName: "",
        iconMediaId: null,
        iconUrl: "",
      };
      st.upsertObject({ ...prev, ...partial, objectId: oid });
    },
    [store]
  );

  if (!satelliteId || !snap) return null;

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
              if (!oid) {
                store.getState().updateNodeData(satelliteId, { data: { objectId: "" } } as never);
                return;
              }
              pushEntry(oid, { displayName: displayNameInput, iconUrl: iconUrlInput, iconMediaId: null });
              store.getState().updateNodeData(satelliteId, { data: { objectId: oid } } as never);
            }}
          />
          <datalist id={listId}>
            {Object.keys(store.getState().meta.objects).map((k) => (
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
              pushEntry(oid, { displayName: displayNameInput });
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
              pushEntry(oid, { iconUrl: iconUrlInput });
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
