import type { MediaNodeId } from "./ids";

/** Données inventaire partagées (clé = objectId). */
export type ObjectEntry = {
  objectId: string;
  displayName: string;
  iconMediaId: MediaNodeId | null;
  /** URL d’icône temporaire (C3a) ; upload média plus tard. */
  iconUrl: string;
};
