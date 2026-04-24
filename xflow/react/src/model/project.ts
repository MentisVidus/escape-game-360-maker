import type { Edge } from "./edges";
import type { ActionNodeId, AnyNodeId, MediaNodeId, SatelliteNodeId, SceneNodeId } from "./ids";
import type { NodeLayout, Viewport } from "./layout";
import type { ActionNode, MediaNode, SatelliteNode, SceneNode } from "./nodes";
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
  satellites: Record<SatelliteNodeId, SatelliteNode>;
  media: Record<MediaNodeId, MediaNode>;
  edges: Edge[];
  layout: Record<AnyNodeId, NodeLayout>;
};

