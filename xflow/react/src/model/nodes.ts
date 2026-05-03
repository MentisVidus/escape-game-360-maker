import type { ActionNodeId, MediaNodeId, SatelliteNodeId } from "./ids";
import type { HotspotAppearanceUi } from "./hotspotAppearance";

export type CopyPayload = {
  bodyHtml: string;
  buttonLabel: string;
};

export type ActionSfx = {
  url: string;
  volume: number;
};

export type ActionVisibility = {
  requiresItem: string;
  hiddenIfHasItem: string;
  clickWhenInvisible: boolean;
};

export type BaseActionNode<TType extends string, TPayload> = {
  id: ActionNodeId;
  nodeType: "action";
  actionType: TType;
  label: string;
  payload: TPayload;
  sfx: ActionSfx;
  visibility: ActionVisibility;
};

export type MsgActionNode = BaseActionNode<"msg", { copy: CopyPayload }>;
export type PickActionNode = BaseActionNode<"pick", { itemId: string; itemName: string; copy: CopyPayload }>;
export type GotoActionNode = BaseActionNode<"goto", { target: string; copy: CopyPayload }>;
export type SelectorActionNode = BaseActionNode<
  "selector",
  { nested: { title: string; copy: CopyPayload; displayMode: "buttons" | "dropdown" } }
>;
export type ReqActionNode = BaseActionNode<"req", { itemId: string; copy: CopyPayload }> & {
  rewardActionId: ActionNodeId | null;
};
export type PwdActionNode = BaseActionNode<"pwd", { answer: string; rememberSuccess?: boolean; copy: CopyPayload }> & {
  rewardActionId: ActionNodeId | null;
};

export type ActionNode =
  | MsgActionNode
  | PickActionNode
  | GotoActionNode
  | SelectorActionNode
  | ReqActionNode
  | PwdActionNode;

export type SceneNode = {
  id: import("./ids").SceneNodeId;
  nodeType: "scene";
  sceneId: string;
  label: string;
  panoramaUrl: string;
};

/** Cadre RF auto (1.b.2.x) — un par scène, réconcilié comme les satellites. */
export type SceneBoxNode = {
  id: import("./ids").SceneBoxNodeId;
  nodeType: "sceneBox";
  sceneId: import("./ids").SceneNodeId;
};

export type CoordsOptionsSatelliteNode = {
  id: SatelliteNodeId;
  nodeType: "satellite";
  satelliteType: "coords-options";
  data: {
    pitch: number;
    yaw: number;
    visibility: Pick<ActionVisibility, "requiresItem" | "hiddenIfHasItem" | "clickWhenInvisible">;
    sfx: ActionSfx;
    /** Zone cliquable : mêmes champs que l’accordéon legacy « Éditeur de style visuel ». */
    appearance?: HotspotAppearanceUi;
    /** CSS complet ; si vide en projection, dérivé de `appearance`. */
    customCss?: string;
    /** Dernière session popup : mode expert = CSS libre (désactive la régénération depuis les jauges). */
    hotspotCssExpert?: boolean;
  };
};

export type ChoiceOptionsSatelliteNode = {
  id: SatelliteNodeId;
  nodeType: "satellite";
  satelliteType: "choice-options";
  data: {
    visibility: Pick<ActionVisibility, "requiresItem" | "hiddenIfHasItem">;
    sfx: ActionSfx;
  };
};

export type ObjectSatelliteNode = {
  id: SatelliteNodeId;
  nodeType: "satellite";
  satelliteType: "object";
  data: {
    objectId: string;
  };
};

export type SatelliteNode = CoordsOptionsSatelliteNode | ChoiceOptionsSatelliteNode | ObjectSatelliteNode;

export type MediaImageNode = {
  id: MediaNodeId;
  nodeType: "media";
  mediaType: "media-image";
  label: string;
  data: {
    url: string;
  };
};

export type MediaAudioNode = {
  id: MediaNodeId;
  nodeType: "media";
  mediaType: "media-audio";
  label: string;
  data: {
    url: string;
    volume: number;
  };
};

export type MediaNode = MediaImageNode | MediaAudioNode;

