import { useReactFlow } from "@xyflow/react";
import type { RefObject } from "react";
import type { StoreApi } from "zustand/vanilla";

import { asActionNodeId, asMediaNodeId } from "../../model/ids";
import type { ActionNode, MediaNode, SceneNode } from "../../model/nodes";
import { stableSceneNodeIdFromExternal } from "../../serialize/fromProjectJson";
import type { NodalProjectStore } from "../../store/nodalProjectStore";
import "./palette.css";

let counter = 0;
const nextId = (prefix: string) => `${prefix}-${Date.now()}-${++counter}`;

type PaletteProps = {
  store: StoreApi<NodalProjectStore>;
  canvasRef: RefObject<HTMLDivElement | null>;
};

export function NodePalette({ store, canvasRef }: PaletteProps) {
  const reactFlow = useReactFlow();
  const getCenterPosition = () => {
    const host = canvasRef.current;
    if (!host) return { x: 0, y: 0 };
    const rect = host.getBoundingClientRect();
    return reactFlow.screenToFlowPosition({
      x: rect.left + rect.width / 2,
      y: rect.top + rect.height / 2,
    });
  };

  const addScene = () => {
    const sceneId = nextId("scene");
    const id = stableSceneNodeIdFromExternal(sceneId);
    const node: SceneNode = {
      id,
      nodeType: "scene",
      sceneId,
      label: "New Scene",
      panoramaUrl: "",
    };
    const center = getCenterPosition();
    store.getState().addScene(node, { x: center.x, y: center.y });
  };

  const addAction = (actionType: ActionNode["actionType"]) => {
    const id = asActionNodeId(nextId("action"));
    const base = {
      id,
      nodeType: "action" as const,
      actionType,
      label: actionType.toUpperCase(),
      sfx: { url: "", volume: 1 },
      visibility: { requiresItem: "", hiddenIfHasItem: "", clickWhenInvisible: true },
    };
    const node: ActionNode =
      actionType === "msg"
        ? { ...base, actionType, payload: { copy: { bodyHtml: "", buttonLabel: "" } } }
        : actionType === "pick"
          ? { ...base, actionType, payload: { itemId: "", itemName: "", copy: { bodyHtml: "", buttonLabel: "" } } }
          : actionType === "goto"
            ? { ...base, actionType, payload: { target: "", copy: { bodyHtml: "", buttonLabel: "" } } }
            : actionType === "selector"
              ? {
                  ...base,
                  actionType,
                  payload: { nested: { title: "", copy: { bodyHtml: "", buttonLabel: "" }, displayMode: "buttons" } },
                }
              : actionType === "req"
                ? { ...base, actionType, payload: { itemId: "", copy: { bodyHtml: "", buttonLabel: "" } }, rewardActionId: null }
                : { ...base, actionType: "pwd", payload: { answer: "", copy: { bodyHtml: "", buttonLabel: "" } }, rewardActionId: null };
    const center = getCenterPosition();
    store.getState().addAction(node, { x: center.x, y: center.y });
  };

  const addMedia = (mediaType: MediaNode["mediaType"]) => {
    const id = asMediaNodeId(nextId("media"));
    const node: MediaNode =
      mediaType === "media-image"
        ? { id, nodeType: "media", mediaType, data: { url: "" } }
        : { id, nodeType: "media", mediaType: "media-audio", data: { url: "", volume: 1 } };
    const center = getCenterPosition();
    store.getState().addMedia(node, { x: center.x, y: center.y });
  };

  return (
    <aside className="nodal-palette">
      <h3>Scene</h3>
      <button onClick={addScene}>Add Scene</button>

      <h3>Actions</h3>
      <button onClick={() => addAction("msg")}>Msg</button>
      <button onClick={() => addAction("pick")}>Pick</button>
      <button onClick={() => addAction("goto")}>Goto</button>
      <button onClick={() => addAction("selector")}>Selector</button>
      <button onClick={() => addAction("req")}>Req</button>
      <button onClick={() => addAction("pwd")}>Pwd</button>

      <h3>Media</h3>
      <button onClick={() => addMedia("media-image")}>Image</button>
      <button onClick={() => addMedia("media-audio")}>Audio</button>
    </aside>
  );
}
