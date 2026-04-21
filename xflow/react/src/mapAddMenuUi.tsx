import type { MouseEvent as ReactMouseEvent } from "react";
import type { EditorLang } from "./mapGraphBuild";
import { mapGraphAddMenuCopy, type MapAddMenuEntry } from "./hotspotAddKinds";

declare global {
  interface Window {
    addSceneFromMap?: () => void;
    addHotspotFromMapWithKind?: (sceneIndex: number, kind: string, opts?: { openPanel?: boolean }) => void;
    focusSceneMediaFromMap?: (sceneIndex: number, field: string) => void;
    mountProjectMapGlobalSettings?: () => void;
  }
}

export function dispatchMapAddMenuEntry(entry: MapAddMenuEntry, sceneIndex: number): void {
  if (entry.type === "addScene") {
    window.addSceneFromMap?.();
    return;
  }
  if (entry.type === "hotspot") {
    window.addHotspotFromMapWithKind?.(sceneIndex, entry.kind);
  } else if (entry.type === "media") {
    window.focusSceneMediaFromMap?.(sceneIndex, entry.field);
  } else if (entry.type === "globalSettings") {
    window.mountProjectMapGlobalSettings?.();
  }
}

type Props = {
  lang: EditorLang;
  sceneIndex: number;
  onPick?: () => void;
};

export function MapAddMenuPanelContent({ lang, sceneIndex, onPick }: Props) {
  const copy = mapGraphAddMenuCopy(lang);
  return (
    <div className="rf-map-add-menu-nested" onMouseDown={(e) => e.stopPropagation()}>
      {copy.sections.map((sec) => (
        <div key={sec.id} className="rf-map-add-section">
          <div className="rf-map-add-section-title">{sec.title}</div>
          {sec.groups.map((g) => (
            <div key={g.id} className="rf-map-add-subgroup">
              <div className="rf-map-add-subgroup-title">{g.title}</div>
              {g.rows.map((row) => (
                <button
                  key={row.id}
                  type="button"
                  className="rf-map-add-hotspot-item"
                  role="menuitem"
                  onClick={(ev: ReactMouseEvent) => {
                    ev.stopPropagation();
                    dispatchMapAddMenuEntry(row.entry, sceneIndex);
                    onPick?.();
                  }}
                >
                  {row.label}
                </button>
              ))}
            </div>
          ))}
        </div>
      ))}
      <div className="rf-map-add-hotspot-hint">{copy.hintBranch}</div>
      <div className="rf-map-add-hotspot-hint rf-map-add-hint-alt">{copy.hintAltCopy}</div>
    </div>
  );
}
