import type {
  ActionNode,
  GotoActionNode,
  MsgActionNode,
  PickActionNode,
  PwdActionNode,
  ReqActionNode,
} from "../../model/nodes";

export type PlayerPreviewVariantSpec =
  | {
      kind: "button";
      html: string;
      buttonLabel: string;
      titleText?: string;
    }
  | {
      kind: "input";
      html: string;
      buttonLabel: string;
      titleText?: string;
    }
  | {
      kind: "selector-buttons";
      html: string;
      titleText?: string;
      choices: string[];
    }
  | {
      kind: "selector-dropdown";
      html: string;
      titleText?: string;
      choices: string[];
    };

export type PlayerPreviewLocale = "fr" | "en";

const DEFAULT_BTN_LABEL: Record<PlayerPreviewLocale, string> = {
  fr: "Fermer",
  en: "Close",
};

const PWD_SUBMIT_FALLBACK: Record<PlayerPreviewLocale, string> = {
  fr: "Valider",
  en: "Submit",
};

/**
 * C18.5.1 / C18.5.2 — Variante visuelle `PlayerPopupPreview` pour une action
 * **terminale** (msg, pick, goto, req, pwd). Les **selector** sont rendus
 * dans `<PlayerPreviewOverlay>` via `getOrderedSelectorChildActionIds` +
 * navigation par stack (pas via ce helper — il renverrait `null`).
 *
 * Aucune logique métier : pas de check inventaire, pas de simulation.
 */
export function buildPlayerPreviewVariant(
  action: ActionNode,
  locale: PlayerPreviewLocale
): PlayerPreviewVariantSpec | null {
  const fallbackBtn = DEFAULT_BTN_LABEL[locale];

  if (action.actionType === "msg") {
    const msg = action as MsgActionNode;
    return {
      kind: "button",
      html: String(msg.payload?.copy?.bodyHtml ?? ""),
      buttonLabel: pickLabel(msg.payload?.copy?.buttonLabel, fallbackBtn),
    };
  }

  if (action.actionType === "pick") {
    const pick = action as PickActionNode;
    const itemName = String(pick.payload?.itemName ?? "").trim();
    return {
      kind: "button",
      html: String(pick.payload?.copy?.bodyHtml ?? ""),
      buttonLabel: pickLabel(pick.payload?.copy?.buttonLabel, fallbackBtn),
      titleText: itemName || undefined,
    };
  }

  if (action.actionType === "goto") {
    const g = action as GotoActionNode;
    return {
      kind: "button",
      html: String(g.payload?.copy?.bodyHtml ?? ""),
      buttonLabel: pickLabel(g.payload?.copy?.buttonLabel, fallbackBtn),
    };
  }

  if (action.actionType === "req") {
    const r = action as ReqActionNode;
    return {
      kind: "button",
      html: String(r.payload?.copy?.bodyHtml ?? ""),
      buttonLabel: pickLabel(r.payload?.copy?.buttonLabel, fallbackBtn),
    };
  }

  if (action.actionType === "pwd") {
    const p = action as PwdActionNode;
    return {
      kind: "input",
      html: String(p.payload?.copy?.bodyHtml ?? ""),
      buttonLabel: pickLabel(p.payload?.copy?.buttonLabel, PWD_SUBMIT_FALLBACK[locale]),
    };
  }

  return null;
}

function pickLabel(value: string | undefined, fallback: string): string {
  const trimmed = String(value ?? "").trim();
  return trimmed.length > 0 ? trimmed : fallback;
}
