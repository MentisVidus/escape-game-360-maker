import type { Edge } from "./edges";
import type { ActionNodeId, AnyNodeId, MediaNodeId, SatelliteNodeId, SceneBoxNodeId, SceneNodeId } from "./ids";
import type { NodeLayout, Viewport } from "./layout";
import type { ActionNode, MediaNode, SatelliteNode, SceneBoxNode, SceneNode } from "./nodes";
import type { ObjectEntry } from "./objects";

/**
 * Paramètres globaux du jeu — remplis au fil de **C10.2.b–f** dans `project.json`
 * sous `meta.settings`. Tous les groupes optionnels tant que la migration n’a pas
 * eu lieu (Q-C10.2.a-3 (a)).
 */
export type ProjectSettings = {
  /** C10.2.b — inventaire HUD */
  inventoryGlobal?: InventoryGlobalSettings;
  /** C10.2.c — thème popups (migration depuis `playerPopupTheme` / map-layout) */
  popupTheme?: PopupThemeSettings;
  /** C10.2.d — audio global */
  audio?: AudioGlobalSettings;
  /** C10.2.e — timer global */
  timer?: TimerGlobalSettings;
  /** C10.2.e — sauvegarde progression joueur */
  playerSave?: PlayerSaveSettings;
  /** C10.2.f — fins de partie */
  endScreens?: Record<string, unknown>;
};

export type InventoryGlobalPosition = "top-right" | "top-left" | "bottom-right" | "bottom-left";

export type InventoryGlobalSettings = {
  enabled: boolean;
  position: InventoryGlobalPosition;
  icon: string;
  panelBg: string;
  panelBgAlpha: number;
  textColor: string;
};

export type PopupThemeSettings = {
  useCustom: boolean;
  font: string;
  color: string;
  bg: string;
  bgAlpha: number;
  btnBg: string;
  btnColor: string;
};

export type AudioGlobalSettings = {
  enabled: boolean;
  url: string;
  volume: number;
};

export type TimerMode = "countdown" | "countup";

export type TimerGlobalSettings = {
  enabled: boolean;
  mode: TimerMode;
  startSeconds: number;
  autoStart: boolean;
  pauseWhenPopupOpen: boolean;
};

export type PlayerSaveMode = "none" | "manual" | "auto";

export type PlayerSaveSettings = {
  mode: PlayerSaveMode;
};

export type ProjectMeta = {
  title: string;
  startSceneId: SceneNodeId | null;
  viewport: Viewport;
  draftActionIds: ActionNodeId[];
  objects: Record<string, ObjectEntry>;
  /** C10.2+ — réglages globaux persistés bundle ; absent tant que non migrés. */
  settings?: ProjectSettings;
};

export type NodalProject = {
  meta: ProjectMeta;
  actions: Record<ActionNodeId, ActionNode>;
  scenes: Record<SceneNodeId, SceneNode>;
  /** Conteneurs visuels scène+hotspots (non exportés dans project.json). */
  sceneBoxes: Record<SceneBoxNodeId, SceneBoxNode>;
  satellites: Record<SatelliteNodeId, SatelliteNode>;
  media: Record<MediaNodeId, MediaNode>;
  edges: Edge[];
  layout: Record<AnyNodeId, NodeLayout>;
};

