import { useEffect, useState } from "react";

import type { ActionNode, ChoiceOptionsSatelliteNode } from "../../model/nodes";

type Props = {
  satellite: ChoiceOptionsSatelliteNode | null;
  parentAction: ActionNode | null;
  onChangeSatellite: (patch: ChoiceOptionsSatelliteNode["data"]) => void;
  onChangeActionOptions: (patch: {
    visibility: { requiresItem: string; hiddenIfHasItem: string };
  }) => void;
  onClose: () => void;
};

export function ChoiceOptionsPopup({
  satellite,
  parentAction,
  onChangeSatellite,
  onChangeActionOptions,
  onClose,
}: Props) {
  const [requiresItem, setRequiresItem] = useState("");
  const [hiddenIfHasItem, setHiddenIfHasItem] = useState("");

  useEffect(() => {
    if (!satellite) return;
    const satVis = satellite.data.visibility;
    const aVis = parentAction?.visibility;
    setRequiresItem(String((aVis?.requiresItem ?? satVis.requiresItem) || ""));
    setHiddenIfHasItem(String((aVis?.hiddenIfHasItem ?? satVis.hiddenIfHasItem) || ""));
  }, [satellite, parentAction]);

  if (!satellite) return null;

  const apply = () => {
    const visibility = {
      requiresItem: requiresItem.trim(),
      hiddenIfHasItem: hiddenIfHasItem.trim(),
    };
    onChangeSatellite({
      ...satellite.data,
      visibility,
    });
    onChangeActionOptions({ visibility });
  };

  return (
    <div className="nodal-popup-overlay" role="dialog" aria-modal="true" aria-labelledby="choice-options-title">
      <div className="nodal-popup-backdrop" onClick={onClose} />
      <div className="nodal-popup-panel">
        <h2 id="choice-options-title">Options choix (selector)</h2>
        <label className="nodal-popup-field">
          <span>requiresItem</span>
          <input type="text" value={requiresItem} onChange={(e) => setRequiresItem(e.target.value)} onBlur={apply} />
        </label>
        <label className="nodal-popup-field">
          <span>hiddenIfHasItem</span>
          <input
            type="text"
            value={hiddenIfHasItem}
            onChange={(e) => setHiddenIfHasItem(e.target.value)}
            onBlur={apply}
          />
        </label>
        <p className="nodal-popup-hint">
          SFX : relier un nœud <strong>média audio</strong> à l’action enfant (handle meta) et régler l’URL / le volume
          dans la popup du nœud média.
        </p>
        <div className="nodal-popup-actions">
          <button type="button" onClick={onClose}>
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
}
