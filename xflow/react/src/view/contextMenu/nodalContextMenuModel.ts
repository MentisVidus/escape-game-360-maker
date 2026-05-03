import type { ActionNodeId, AnyNodeId, SceneBoxNodeId, SceneNodeId } from "../../model/ids";
import type { NodalProjectStore } from "../../store/nodalProjectStore";
import { sboxIdFromScene } from "../../store/reconcileSceneBoxes";

export type NodalContextMenuAction =
  | "open"
  | "copy-target"
  | "copy-selection"
  | "paste"
  | "delete"
  | "set-start-scene"
  | "duplicate-scene"
  | "toggle-fold"
  | "go-parent";

export type NodalContextMenuItem = {
  action: NodalContextMenuAction;
  label: string;
  disabled?: boolean;
};

function labels(locale: "fr" | "en") {
  const L = locale === "en";
  return {
    open: L ? "Open" : "Ouvrir",
    copy: L ? "Copy" : "Copier",
    copySelection: L ? "Copy selection" : "Copier la sélection",
    paste: L ? "Paste" : "Coller",
    delete: L ? "Delete" : "Supprimer",
    setStart: L ? "Set as start scene" : "Définir comme scène de départ",
    duplicateScene: L ? "Duplicate entire scene" : "Dupliquer la scène complète",
    fold: L ? "Collapse" : "Replier",
    unfold: L ? "Expand" : "Déplier",
    goParent: L ? "Go to parent" : "Aller au parent",
  };
}

/**
 * Construit les entrées du menu contextuel (C8.5.1).
 * Copier / Coller : désactivés jusqu’à C8.5.2 ; duplication scène : C8.5.3.
 */
export function buildNodalContextMenuItems(
  snap: NodalProjectStore,
  locale: "fr" | "en",
  targetId: AnyNodeId | null,
  selectedIds: string[],
  clipboardEmpty: boolean
): NodalContextMenuItem[] {
  const t = labels(locale);
  const out: NodalContextMenuItem[] = [];
  const copyDisabled = true;
  const dupDisabled = true;

  if (targetId == null) {
    if (clipboardEmpty) return [];
    out.push({ action: "paste", label: t.paste, disabled: false });
    return out;
  }

  if (targetId in snap.scenes) {
    const sid = targetId as SceneNodeId;
    if (snap.meta.startSceneId !== sid) {
      out.push({ action: "set-start-scene", label: t.setStart });
    }
    out.push({ action: "copy-target", label: t.copy, disabled: copyDisabled });
    if (selectedIds.length > 1) {
      out.push({ action: "copy-selection", label: t.copySelection, disabled: copyDisabled });
    }
    out.push({ action: "delete", label: t.delete });
    return out;
  }

  if (targetId in snap.sceneBoxes) {
    out.push({ action: "duplicate-scene", label: t.duplicateScene, disabled: dupDisabled });
    const collapsed = !!snap.layout[targetId as SceneBoxNodeId]?.collapsed;
    out.push({
      action: "toggle-fold",
      label: collapsed ? t.unfold : t.fold,
    });
    return out;
  }

  if (targetId in snap.actions) {
    const act = snap.actions[targetId as ActionNodeId];
    const isSelector = act.actionType === "selector";
    out.push({ action: "open", label: t.open });
    out.push({ action: "copy-target", label: t.copy, disabled: copyDisabled });
    if (selectedIds.length > 1) {
      out.push({ action: "copy-selection", label: t.copySelection, disabled: copyDisabled });
    }
    if (isSelector) {
      const collapsed = !!snap.layout[targetId]?.collapsed;
      out.push({
        action: "toggle-fold",
        label: collapsed ? t.unfold : t.fold,
      });
    }
    out.push({ action: "delete", label: t.delete });
    return out;
  }

  if (targetId in snap.media) {
    out.push({ action: "open", label: t.open });
    out.push({ action: "copy-target", label: t.copy, disabled: copyDisabled });
    if (selectedIds.length > 1) {
      out.push({ action: "copy-selection", label: t.copySelection, disabled: copyDisabled });
    }
    out.push({ action: "delete", label: t.delete });
    return out;
  }

  if (targetId in snap.satellites) {
    out.push({ action: "go-parent", label: t.goParent });
    return out;
  }

  return out;
}

/** Pour « Aller au parent » : parent `layout` ou s-box englobant une scène. */
export function contextMenuParentTarget(snap: NodalProjectStore, nodeId: AnyNodeId): AnyNodeId | null {
  if (nodeId in snap.scenes) {
    return sboxIdFromScene(nodeId as SceneNodeId);
  }
  const lo = snap.layout[nodeId];
  const p = lo?.parentId;
  return p ?? null;
}
