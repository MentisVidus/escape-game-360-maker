/**
 * Identifiants des poignées React Flow — alignement avec la convention NESW produit
 * (même forme / couleur pour une même famille de lien).
 *
 * Flow principal (rond bleu, Est ↔ Ouest) :
 * - Scène : Est = sortie vers hotspot ; Ouest = entrée depuis hotspot ou choix (transition).
 * - Hotspot : Est = sortie (ex. scène cible, branche menu) ; Ouest = entrée depuis scène ou choix menu.
 * - Choix (selector) : Est = sortie (scène, renvoi, …) ; Ouest = entrée depuis orphelin (promotion).
 *
 * Médias (carré violet) : sur la **scène / hotspot / choix**, `metaOut` est en **bas** (Sud) ;
 * sur le **nœud ressource**, `metaIn` est en **haut** (Nord) — arête graphe **source Sud → cible Nord**
 * (ex. image scène : sortie bas de la scène vers entrée haut de la ressource).
 */
export const RF_FLOW_IN = "in";
export const RF_FLOW_OUT = "out";
export const RF_META_IN = "metaIn";
export const RF_META_OUT = "metaOut";
