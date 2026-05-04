export type Brand<T, TBrand extends string> = T & { readonly __brand: TBrand };

export type SceneNodeId = Brand<string, "SceneNodeId">;
/** Conteneur visuel auto (1.b.2.x) — un s-box par scène, non sérialisé dans project.json. */
export type SceneBoxNodeId = Brand<string, "SceneBoxNodeId">;
export type ActionNodeId = Brand<string, "ActionNodeId">;
export type SatelliteNodeId = Brand<string, "SatelliteNodeId">;
export type MediaNodeId = Brand<string, "MediaNodeId">;
export type EdgeId = Brand<string, "EdgeId">;

export type AnyNodeId = SceneNodeId | SceneBoxNodeId | ActionNodeId | SatelliteNodeId | MediaNodeId;

export const asSceneNodeId = (value: string): SceneNodeId => value as SceneNodeId;
export const asSceneBoxNodeId = (value: string): SceneBoxNodeId => value as SceneBoxNodeId;
export const asActionNodeId = (value: string): ActionNodeId => value as ActionNodeId;
export const asSatelliteNodeId = (value: string): SatelliteNodeId => value as SatelliteNodeId;
export const asMediaNodeId = (value: string): MediaNodeId => value as MediaNodeId;
export const asEdgeId = (value: string): EdgeId => value as EdgeId;

