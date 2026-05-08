import type { ActionNode, MsgActionNode, PickActionNode } from "../../model/nodes";

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

/**
 * C18.5.1 — Sélection de la variante visuelle de `PlayerPopupPreview` à partir
 * d'une action. Couvre **msg** et **pick** dans ce sous-jalon ; les autres
 * types renvoient `null` (à étendre en C18.5.2 — goto / req / pwd / selector).
 *
 * Aucune logique métier : pas de check inventaire, pas de simulation, pas de
 * lecture du store. C'est une fonction pure des données de l'action — testable
 * sans React ni store.
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

  return null;
}

function pickLabel(value: string | undefined, fallback: string): string {
  const trimmed = String(value ?? "").trim();
  return trimmed.length > 0 ? trimmed : fallback;
}
