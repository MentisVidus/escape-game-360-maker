import type { Edge } from "./edges";
import type { ActionNodeId, AnyNodeId, MediaNodeId, SatelliteNodeId, SceneBoxNodeId, SceneNodeId } from "./ids";
import type { NodeLayout, Viewport } from "./layout";
import type { ActionNode, MediaNode, SatelliteNode, SceneBoxNode, SceneNode } from "./nodes";
import type { ObjectEntry } from "./objects";

export type ProjectMeta = {
  title: string;
  startSceneId: SceneNodeId | null;
  viewport: Viewport;
  draftActionIds: ActionNodeId[];
  objects: Record<string, ObjectEntry>;
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

