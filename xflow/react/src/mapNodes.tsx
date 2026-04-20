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

  return (
    <div className={wrapClass}>
      <Handle type="target" position={Position.Left} id="in" />
      <Handle type="source" position={Position.Right} id="out" />
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
  return (
    <div className="rf-map-hotspot-root">
      <Handle type="target" position={Position.Left} id="in" />
      <Handle type="source" position={Position.Right} id="out" />
      <div className="xflow-node-hotspot">
        <div className="xflow-node-title">Hotspot</div>
        <div className="xflow-node-body">{data.label}</div>
        <div className="xflow-node-sub">
          {labAction} {data.actionType}
        </div>
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
