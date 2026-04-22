/**
 * Matrice N / E / S / O (intention produit) ↔ poignées React Flow stables.
 * Les `id` de handles (`in`/`out`/`metaIn`/`metaOut`) ne changent pas sans migration ;
 * ce module est le point unique pour ajouter des **ports supplémentaires** par côté
 * (ex. plusieurs entrées Est) : étendre `MAP_HANDLE_SEMANTICS` + les helpers ci-dessous.
 *
 * Référence : `docs/PLAN_MAP_CONNEXIONS_FUTUR.md` (tableau § Schéma connecteurs).
 */
import type { Connection } from "@xyflow/react";
import {
  RF_FLOW_IN,
  RF_FLOW_OUT,
  RF_META_IN,
  RF_META_OUT,
  RF_REWARD_IN,
  RF_REWARD_OUT,
} from "./mapFlowHandles";

/** N / E / S / O comme dans le plan (O = Ouest). */
export type MapCardinal = "N" | "E" | "S" | "O";

/** Famille de lien : flux narration (bleu) vs médias / métadonnées (violet). */
export type MapLinkFamily = "flow" | "meta" | "reward";

export type MapHandleSemantic = {
  family: MapLinkFamily;
  /** Côté produit sur le nœud (position visuelle actuelle dans `mapNodes.tsx`). */
  cardinal: MapCardinal;
};

/**
 * Carte (type de nœud React Flow) → (id handle) → sémantique NESO + famille.
 * Futur : plusieurs ids peuvent partager la même `cardinal` (affichage conditionnel, etc.).
 */
export const MAP_HANDLE_SEMANTICS: Readonly<
  Record<string, Readonly<Partial<Record<string, MapHandleSemantic>>>>
> = {
  mapScene: {
    [RF_FLOW_IN]: { family: "flow", cardinal: "O" },
    [RF_FLOW_OUT]: { family: "flow", cardinal: "E" },
    [RF_META_OUT]: { family: "meta", cardinal: "S" },
    /** Entrée récompense (reward-out REQ/PWD → scène cible transition). */
    [RF_REWARD_IN]: { family: "reward", cardinal: "O" },
  },
  mapHotspot: {
    [RF_FLOW_IN]: { family: "flow", cardinal: "O" },
    [RF_FLOW_OUT]: { family: "flow", cardinal: "E" },
    [RF_META_OUT]: { family: "meta", cardinal: "S" },
    /** Présent visuellement seulement sur req/pwd ; la policy filtre les autres types. */
    [RF_REWARD_OUT]: { family: "reward", cardinal: "N" },
    /** Entrée récompense pour hotspots msg|pick|selector (cible reward-out). */
    [RF_REWARD_IN]: { family: "reward", cardinal: "O" },
  },
  mapSelectorChoice: {
    [RF_FLOW_IN]: { family: "flow", cardinal: "O" },
    [RF_FLOW_OUT]: { family: "flow", cardinal: "E" },
    [RF_META_OUT]: { family: "meta", cardinal: "S" },
  },
  /** Renvoi : entrée flux uniquement (cible d’un choix). */
  mapRedirect: {
    [RF_FLOW_IN]: { family: "flow", cardinal: "O" },
  },
  /** Ressource : récepteur médias en « Nord » uniquement pour l’instant. */
  mapResource: {
    [RF_META_IN]: { family: "meta", cardinal: "N" },
  },
};

export function getMapHandleSemantic(
  nodeType: string | undefined,
  handleId: string | null | undefined
): MapHandleSemantic | null {
  if (!nodeType || !handleId) return null;
  return MAP_HANDLE_SEMANTICS[nodeType]?.[handleId] ?? null;
}

/** Flux principal : Est (sortie) → Ouest (entrée). */
export function isFlowEastToWestConnection(c: Pick<Connection, "sourceHandle" | "targetHandle">): boolean {
  return c.sourceHandle === RF_FLOW_OUT && c.targetHandle === RF_FLOW_IN;
}

/**
 * Médias : Sud sur la scène / hotspot / choix (`metaOut`) → Nord sur la ressource (`metaIn`).
 * Arête graphe source Sud → cible Nord (voir `mapFlowHandles.ts`).
 */
export function isMetaSouthToNorthConnection(c: Pick<Connection, "sourceHandle" | "targetHandle">): boolean {
  return c.sourceHandle === RF_META_OUT && c.targetHandle === RF_META_IN;
}

/** Liaison récompense req/pwd : sortie dédiée → entrée cible récompense. */
export function isRewardOutToInConnection(c: Pick<Connection, "sourceHandle" | "targetHandle">): boolean {
  return c.sourceHandle === RF_REWARD_OUT && c.targetHandle === RF_REWARD_IN;
}

/**
 * Résolution « topologie » grossière pour filtrer tôt ou instrumenter.
 * Étendre ici si une 3ᵉ famille de liens apparaît (ex. narration hors export).
 */
export function classifyMapConnectionHandles(
  c: Pick<Connection, "sourceHandle" | "targetHandle">,
  sourceType: string | undefined,
  targetType: string | undefined
): "flow" | "meta" | "none" {
  if (isFlowEastToWestConnection(c)) {
    const s = getMapHandleSemantic(sourceType, c.sourceHandle);
    const t = getMapHandleSemantic(targetType, c.targetHandle);
    if (s?.family === "flow" && t?.family === "flow") return "flow";
    return "none";
  }
  if (isMetaSouthToNorthConnection(c)) {
    const s = getMapHandleSemantic(sourceType, c.sourceHandle);
    const t = getMapHandleSemantic(targetType, c.targetHandle);
    if (s?.family === "meta" && t?.family === "meta") return "meta";
    return "none";
  }
  return "none";
}
