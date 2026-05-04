import type { ActionNodeId, AnyNodeId, SceneBoxNodeId, SceneNodeId } from "../../model/ids";
import type { NodalProjectStore } from "../../store/nodalProjectStore";
import { sboxIdFromScene } from "../../store/reconcileSceneBoxes";

export type NodalContextMenuAction =
  | "open"
  | "copy-target"
  | "copy-selection"
  | "paste"
  | "delete"
  /** Fond de carte / rectangle de sélection RF : supprime tous les nœuds sélectionnés (hors flux satellite seul géré par RF). */
  | "delete-selection"
  | "set-start-scene"
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
    deleteSelection: L ? "Delete selection" : "Supprimer la sélection",
    setStart: L ? "Set as start scene" : "Définir comme scène de départ",
    fold: L ? "Collapse" : "Replier",
    unfold: L ? "Expand" : "Déplier",
    goParent: L ? "Go to parent" : "Aller au parent",
  };
}

/**
 * Construit les entrées du menu contextuel (C8.5.1 + C8.5.2 copier/coller).
 * s-box : pas d’entrée « Dupliquer la scène » (C8.5.3 écartée ; copier-coller C8.5.2).
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

  if (targetId == null) {
    const storeSelectable = selectedIds.filter((id) => {
      const k = id as AnyNodeId;
      return (
        k in snap.scenes ||
        k in snap.sceneBoxes ||
        k in snap.actions ||
        k in snap.media ||
        k in snap.satellites
      );
    });
    const hasPaneMenu = storeSelectable.length > 0 || !clipboardEmpty;
    if (!hasPaneMenu) return [];
    if (!clipboardEmpty) {
      out.push({ action: "paste", label: t.paste, disabled: false });
    }
    if (storeSelectable.length > 0) {
      out.push({ action: "copy-selection", label: t.copySelection });
      out.push({ action: "delete-selection", label: t.deleteSelection });
    }
    return out;
  }

  if (targetId in snap.scenes) {
    const sid = targetId as SceneNodeId;
    if (snap.meta.startSceneId !== sid) {
      out.push({ action: "set-start-scene", label: t.setStart });
    }
    out.push({ action: "copy-target", label: t.copy });
    if (selectedIds.length > 1) {
      out.push({ action: "copy-selection", label: t.copySelection });
    }
    out.push({ action: "delete", label: t.delete });
    return out;
  }

  if (targetId in snap.sceneBoxes) {
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
    out.push({ action: "copy-target", label: t.copy });
    if (selectedIds.length > 1) {
      out.push({ action: "copy-selection", label: t.copySelection });
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
    out.push({ action: "copy-target", label: t.copy });
    if (selectedIds.length > 1) {
      out.push({ action: "copy-selection", label: t.copySelection });
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
