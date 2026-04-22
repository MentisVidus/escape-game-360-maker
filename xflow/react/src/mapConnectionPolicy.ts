/**
 * Règles centralisées des liaisons carte React (flux bleu Est↔Ouest, médias Sud↔Nord violet).
 * Voir `mapFlowHandles.ts`, `mapConnectionMatrix.ts` (N/E/S/O) et `docs/PLAN_MAP_CONNEXIONS_FUTUR.md`.
 */
import type { Connection, Node } from "@xyflow/react";
import {
  EDITOR_MAP_STAGING_SCENE_KEY,
  type MapHotspotNodeData,
  type MapRedirectNodeData,
  type MapResourceNodeData,
  type MapSceneNodeData,
  type MapSelectorChoiceNodeData,
} from "./mapGraphBuild";
import { isFlowEastToWestConnection, isMetaSouthToNorthConnection } from "./mapConnectionMatrix";

export type MapFlowConnectionContext = {
  nodes: Node[];
  connection: Connection;
  /** <kbd>Alt</kbd> pendant le drag : copie hotspot vers autre scène. */
  altConnect: boolean;
};

export function isValidMapFlowConnection(ctx: MapFlowConnectionContext): boolean {
  const { nodes, connection: c, altConnect } = ctx;
  const sNode = nodes.find((n) => n.id === c.source);
  const tNode = nodes.find((n) => n.id === c.target);
  if (!sNode || !tNode) return false;

  if (sNode.type === "mapScene" && tNode.type === "mapHotspot") {
    if (!isFlowEastToWestConnection(c)) return false;
    const sd = sNode.data as MapSceneNodeData;
    const hd = tNode.data as MapHotspotNodeData;
    if (sd.sceneKey === EDITOR_MAP_STAGING_SCENE_KEY) return false;
    if (
      hd.parentSceneKey === sd.sceneKey &&
      hd.parentSceneKey !== EDITOR_MAP_STAGING_SCENE_KEY
    ) {
      return false;
    }
    return true;
  }

  if (sNode.type === "mapHotspot" && tNode.type === "mapScene") {
    if (!isFlowEastToWestConnection(c)) return false;
    const sd = sNode.data as MapHotspotNodeData;
    const td = tNode.data as MapSceneNodeData;
    if (
      sd.parentSceneKey === EDITOR_MAP_STAGING_SCENE_KEY &&
      td.sceneKey !== EDITOR_MAP_STAGING_SCENE_KEY
    ) {
      return true;
    }
    if (sd.mapDragSceneOut) return true;
    if (altConnect) {
      return sd.sceneIndex !== td.sceneIndex;
    }
    return false;
  }

  if (sNode.type === "mapHotspot" && tNode.type === "mapSelectorChoice") {
    if (!isFlowEastToWestConnection(c)) return false;
    const sd = sNode.data as MapHotspotNodeData;
    const cd = tNode.data as MapSelectorChoiceNodeData;
    if (sd.parentSceneKey !== EDITOR_MAP_STAGING_SCENE_KEY) return false;
    if (!cd.parentSceneKey) return false;
    return true;
  }

  if (sNode.type === "mapSelectorChoice" && tNode.type === "mapHotspot") {
    if (!isFlowEastToWestConnection(c)) return false;
    const cd = sNode.data as MapSelectorChoiceNodeData;
    const hd = tNode.data as MapHotspotNodeData;
    if (!cd.parentSceneKey) return false;
    if (hd.hotspotIndex === cd.hotspotIndex && hd.sceneIndex === cd.sceneIndex) return false;
    if (hd.actionType === "selector") return false;
    if (cd.parentSceneKey === EDITOR_MAP_STAGING_SCENE_KEY) {
      if (hd.parentSceneKey === EDITOR_MAP_STAGING_SCENE_KEY) return true;
      return hd.parentSceneKey !== EDITOR_MAP_STAGING_SCENE_KEY;
    }
    if (hd.parentSceneKey === EDITOR_MAP_STAGING_SCENE_KEY) return true;
    return false;
  }

  if (sNode.type === "mapHotspot" && tNode.type === "mapHotspot") {
    if (!isFlowEastToWestConnection(c)) return false;
    const sd = sNode.data as MapHotspotNodeData;
    const td = tNode.data as MapHotspotNodeData;
    if (sd.actionType !== "selector") return false;
    if (sd.sceneIndex === td.sceneIndex && sd.hotspotIndex === td.hotspotIndex) return false;
    if (td.parentSceneKey === EDITOR_MAP_STAGING_SCENE_KEY) {
      return td.actionType !== "selector";
    }
    if (
      sd.parentSceneKey === EDITOR_MAP_STAGING_SCENE_KEY &&
      td.parentSceneKey !== EDITOR_MAP_STAGING_SCENE_KEY
    ) {
      return true;
    }
    return false;
  }

  if (sNode.type === "mapSelectorChoice" && tNode.type === "mapScene") {
    if (!isFlowEastToWestConnection(c)) return false;
    const td = tNode.data as MapSceneNodeData;
    if (td.sceneKey === EDITOR_MAP_STAGING_SCENE_KEY) return false;
    return true;
  }

  if (sNode.type === "mapSelectorChoice" && tNode.type === "mapRedirect") {
    if (!isFlowEastToWestConnection(c)) return false;
    const rd = tNode.data as MapRedirectNodeData;
    return Boolean(String(rd.targetSceneKey || "").trim());
  }

  if (tNode.type === "mapResource" && isMetaSouthToNorthConnection(c)) {
    const rd = tNode.data as MapResourceNodeData;
    if (sNode.type === "mapScene") {
      return rd.resourceType === "sceneAmbiance" || rd.resourceType === "sceneImage";
    }
    if (sNode.type === "mapHotspot") {
      return rd.resourceType === "hotspotSfx";
    }
    if (sNode.type === "mapSelectorChoice") {
      return rd.resourceType === "choiceSfx";
    }
  }

  return false;
}
