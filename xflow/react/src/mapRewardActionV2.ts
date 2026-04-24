/**
 * Brouillon d’actions V2 pour les récompenses req/pwd (aligné sur `js/editor-core.js` — createDefaultAction).
 * Ne sérialise pas le projet : uniquement données nœud carte / lot suivant.
 */

/** Types d’action V2 pour une cible « récompense » sur la carte (pas le libellé produit « Message »). */
export type MapRewardTargetKind = "msg" | "scene" | "pick" | "selector";

export type MapRewardActionDraft = {
  type: string;
  payload: Record<string, unknown>;
  sfx: { url: string; volume: number };
  visibility: { requiresItem: string; hiddenIfHasItem: string; clickWhenInvisible: boolean };
};

function baseSfx() {
  return { url: "", volume: 1 };
}

function baseVisibility() {
  return { requiresItem: "", hiddenIfHasItem: "", clickWhenInvisible: true };
}

function defaultCopy() {
  return { bodyHtml: "", buttonLabel: "" };
}

/** Minimal mais structure V2 complète (payload + sfx + visibility). */
export function createMinimalRewardActionV2(kind: MapRewardTargetKind): MapRewardActionDraft {
  const sfx = baseSfx();
  const visibility = baseVisibility();
  if (kind === "msg") {
    return {
      type: "msg",
      payload: { copy: defaultCopy() },
      sfx,
      visibility,
    };
  }
  if (kind === "scene") {
    return {
      type: "scene",
      payload: {
        target: "",
        copy: { bodyHtml: "", buttonLabel: "Continuer" },
      },
      sfx,
      visibility,
    };
  }
  if (kind === "pick") {
    return {
      type: "pick",
      payload: {
        itemId: "",
        itemName: "",
        copy: defaultCopy(),
      },
      sfx,
      visibility,
    };
  }
  return {
    type: "selector",
    payload: {
      nested: {
        title: "",
        copy: defaultCopy(),
        displayMode: "buttons",
        choices: [],
      },
    },
    sfx,
    visibility,
  };
}
