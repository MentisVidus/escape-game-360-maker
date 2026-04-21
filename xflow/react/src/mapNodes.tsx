import { useEffect, useRef, useState, type MouseEvent as ReactMouseEvent } from "react";
import { Handle, Position, type Node as FlowNode, type NodeProps } from "@xyflow/react";
import type {
  EditorLang,
  MapHotspotNodeData,
  MapRedirectNodeData,
  MapSceneGroupNodeData,
  MapSceneNodeData,
  MapSelectorChoiceNodeData,
} from "./mapGraphBuild";
import { hotspotAddMenuCopy, type HotspotKindId } from "./hotspotAddKinds";

import "./mapNodeChrome.css";

type SceneChrome = "active" | "collapsed" | "full" | "tree";

type SceneNodeDataExt = MapSceneNodeData & {
  lang: EditorLang;
  chrome: SceneChrome;
  orphanIsland?: boolean;
};

type SceneNodeProps = NodeProps<FlowNode<SceneNodeDataExt>>;

declare global {
  interface Window {
    addHotspotFromMapWithKind?: (
      sceneIndex: number,
      kind: string,
      opts?: { openPanel?: boolean }
    ) => void;
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
  const [menuOpen, setMenuOpen] = useState(false);
  const menuWrapRef = useRef<HTMLDivElement>(null);
  const copy = hotspotAddMenuCopy(data.lang);

  const wrapClass = [
    "rf-map-scene-root",
    data.chrome === "active" ? "rf-map-scene-active-wrap" : "",
    collapsed ? "rf-map-scene-collapsed-wrap" : "",
    data.chrome === "tree" ? "rf-map-scene-tree-wrap" : "",
    data.chrome === "full" ? "rf-map-scene-full-wrap" : "",
  ]
    .filter(Boolean)
    .join(" ");

  useEffect(() => {
    if (!menuOpen) return;
    function onDocDown(e: globalThis.MouseEvent) {
      const el = menuWrapRef.current;
      const t = e.target;
      if (el && t instanceof Element && !el.contains(t)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", onDocDown);
    return () => document.removeEventListener("mousedown", onDocDown);
  }, [menuOpen]);

  const onToggleAddMenu = (e: ReactMouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    setMenuOpen((v) => !v);
  };

  const onPickKind = (e: ReactMouseEvent, kind: HotspotKindId) => {
    e.stopPropagation();
    setMenuOpen(false);
    window.addHotspotFromMapWithKind?.(data.sceneIndex, kind);
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
        <div className="rf-map-scene-add-wrap" ref={menuWrapRef}>
          <button
            type="button"
            className="rf-map-node-btn rf-map-node-btn-add"
            title={en ? "Add hotspot…" : "Ajouter un hotspot…"}
            onClick={onToggleAddMenu}
          >
            +
          </button>
          {menuOpen ? (
            <div
              className="rf-map-add-hotspot-menu"
              role="menu"
              onMouseDown={(e) => e.stopPropagation()}
            >
              {copy.groups.map((g) => (
                <div key={g.id} className="rf-map-add-hotspot-group">
                  <div className="rf-map-add-hotspot-group-title">{g.title}</div>
                  {g.kinds.map((row) => (
                    <button
                      key={row.kind}
                      type="button"
                      className="rf-map-add-hotspot-item"
                      role="menuitem"
                      onClick={(ev) => onPickKind(ev, row.kind)}
                    >
                      {row.label}
                    </button>
                  ))}
                </div>
              ))}
              <div className="rf-map-add-hotspot-hint">{copy.hintBranch}</div>
            </div>
          ) : null}
        </div>
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

type HotspotNodeProps = NodeProps<FlowNode<MapHotspotNodeData & { lang: EditorLang }>>;

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
      <Handle
        type="source"
        position={Position.Right}
        id="out"
        isConnectable={!!data.mapDragSceneOut}
      />
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

type RedirectNodeProps = NodeProps<FlowNode<MapRedirectNodeData & { lang: EditorLang }>>;

type SceneGroupNodeProps = NodeProps<FlowNode<MapSceneGroupNodeData & { lang: EditorLang }>>;

export function MapSceneGroupNode({ data }: SceneGroupNodeProps) {
  const en = data.lang === "en";
  return (
    <div className="rf-map-scene-group-root">
      <div className="rf-map-scene-group-title">
        {en ? "Scene group" : "Groupe scène"} · {data.label}
      </div>
    </div>
  );
}

type SelectorChoiceNodeProps = NodeProps<FlowNode<MapSelectorChoiceNodeData & { lang: EditorLang }>>;

export function MapSelectorChoiceNode({ data }: SelectorChoiceNodeProps) {
  const en = data.lang === "en";
  const tgt = en ? "target" : "cible";
  return (
    <div className="rf-map-choice-root">
      <Handle type="target" position={Position.Left} id="in" />
      <Handle type="source" position={Position.Right} id="out" />
      <div className="rf-map-choice-title">{en ? "Choice" : "Choix"}</div>
      <div className="rf-map-choice-body">{data.label}</div>
      {data.targetCount > 0 ? (
        <div className="rf-map-choice-sub">
          {data.targetCount} {tgt}
          {data.targetCount === 1 ? "" : "s"}
        </div>
      ) : null}
    </div>
  );
}

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
