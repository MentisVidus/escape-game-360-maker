import type { MouseEvent as ReactMouseEvent } from "react";
import { Handle, Position, type Node, type NodeProps } from "@xyflow/react";
import type {
  EditorLang,
  MapHotspotNodeData,
  MapRedirectNodeData,
  MapSceneNodeData,
} from "./mapGraphBuild";

import "./mapNodeChrome.css";

type SceneChrome = "active" | "collapsed" | "full" | "tree";

type SceneNodeDataExt = MapSceneNodeData & {
  lang: EditorLang;
  chrome: SceneChrome;
  orphanIsland?: boolean;
};

type SceneNodeProps = NodeProps<Node<SceneNodeDataExt>>;

declare global {
  interface Window {
    addHotspotSkeletonFromMapSceneIndex?: (sceneIndex: number) => void;
    deleteSceneFromMapByIndex?: (sceneIndex: number) => void;
    deleteHotspotFromMapIndices?: (sceneIndex: number, hotspotIndex: number) => void;
  }
}

export function MapSceneNode({ data }: SceneNodeProps) {
  const en = data.lang === "en";
  const labScene = en ? "Scene" : "Scène";
  const labId = en ? "ID:" : "ID :";
  const collapsed = data.chrome === "collapsed";
  const wrapClass = [
    "rf-map-scene-root",
    data.chrome === "active" ? "rf-map-scene-active-wrap" : "",
    collapsed ? "rf-map-scene-collapsed-wrap" : "",
    data.chrome === "tree" ? "rf-map-scene-tree-wrap" : "",
    data.chrome === "full" ? "rf-map-scene-full-wrap" : "",
  ]
    .filter(Boolean)
    .join(" ");

  const onAddHs = (e: ReactMouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    window.addHotspotSkeletonFromMapSceneIndex?.(data.sceneIndex);
  };
  const onDelScene = (e: ReactMouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    window.deleteSceneFromMapByIndex?.(data.sceneIndex);
  };

  return (
    <div className={wrapClass}>
      <Handle type="target" position={Position.Left} id="in" />
      <Handle type="source" position={Position.Right} id="out" />
      <div className="rf-map-node-actions">
        <button
          type="button"
          className="rf-map-node-btn rf-map-node-btn-add"
          title={en ? "Add hotspot (skeleton)" : "Ajouter un hotspot (squelette)"}
          onClick={onAddHs}
        >
          +
        </button>
        <button
          type="button"
          className="rf-map-node-btn rf-map-node-btn-del"
          title={en ? "Delete scene" : "Supprimer la scène"}
          onClick={onDelScene}
        >
          ×
        </button>
      </div>
      <div className="xflow-node-scene">
        <div className="xflow-node-title">
          {labScene}
          {collapsed ? (en ? " · compact" : " · aperçu") : ""}
        </div>
        <div className="xflow-node-body">{data.label}</div>
        <div className="xflow-node-sub">
          {labId} <code style={{ fontSize: "0.75rem" }}>{data.scId || "—"}</code>
        </div>
        {collapsed ? (
          <div className="xflow-node-collapsed-hint">
            {en ? "Double-click to focus" : "Double-clic pour ouvrir"}
          </div>
        ) : null}
        {data.orphanIsland ? (
          <div className="xflow-node-collapsed-hint">
            {en ? "Not linked from the start scene" : "Non reliée depuis la scène d'entrée"}
          </div>
        ) : null}
      </div>
    </div>
  );
}

type HotspotNodeProps = NodeProps<Node<MapHotspotNodeData & { lang: EditorLang }>>;

export function MapHotspotNode({ data }: HotspotNodeProps) {
  const en = data.lang === "en";
  const labAction = en ? "Action:" : "Action :";
  const onDelHs = (e: ReactMouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    window.deleteHotspotFromMapIndices?.(data.sceneIndex, data.hotspotIndex);
  };
  return (
    <div className="rf-map-hotspot-root">
      <Handle type="target" position={Position.Left} id="in" />
      <Handle type="source" position={Position.Right} id="out" />
      <div className="rf-map-node-actions">
        <button
          type="button"
          className="rf-map-node-btn rf-map-node-btn-del"
          title={en ? "Delete hotspot" : "Supprimer le hotspot"}
          onClick={onDelHs}
        >
          ×
        </button>
      </div>
      <div className="xflow-node-hotspot">
        <div className="xflow-node-title">Hotspot</div>
        <div className="xflow-node-body">{data.label}</div>
        <div className="xflow-node-sub">
          {labAction} {data.actionType}
        </div>
        {data.actionType === "selector" && data.selectorChoiceCount !== undefined ? (
          <div className="rf-map-selector-hint">
            {en
              ? `Selector · ${data.selectorChoiceCount} choice${data.selectorChoiceCount === 1 ? "" : "s"}`
              : `Menu · ${data.selectorChoiceCount} choix`}
          </div>
        ) : null}
      </div>
    </div>
  );
}

type RedirectNodeProps = NodeProps<Node<MapRedirectNodeData & { lang: EditorLang }>>;

export function MapRedirectNode({ data }: RedirectNodeProps) {
  const en = data.lang === "en";
  const head = en ? "Shortcut" : "Renvoi";
  const body = en ? `Back: ${data.targetTitle}` : `Renvoi : ${data.targetTitle}`;
  return (
    <div className="rf-map-redirect-root">
      <Handle type="target" position={Position.Left} id="in" />
      <div className="xflow-node-redirect-inner">
        <div className="xflow-node-title">{head}</div>
        <div className="xflow-node-body">{body}</div>
        <div className="xflow-node-sub">
          <code style={{ fontSize: "0.7rem" }}>{data.targetSceneKey}</code>
        </div>
      </div>
    </div>
  );
}
