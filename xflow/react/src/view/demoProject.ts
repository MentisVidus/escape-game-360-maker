import { asActionNodeId, asEdgeId, asMediaNodeId } from "../model/ids";
import type { ActionNode, MediaImageNode, SceneNode } from "../model/nodes";
import { stableActionNodeIdFromPathKey, stableSceneNodeIdFromExternal } from "../serialize/fromProjectJson";
import { createNodalProjectStore } from "../store/nodalProjectStore";
import { DEFAULT_MEDIA_IMAGE_PLACEHOLDER_URL } from "./preview/scenePanoramaDisplay";

export function createDemoStore() {
  const store = createNodalProjectStore();
  const state = store.getState();

  const sceneA: SceneNode = {
    id: stableSceneNodeIdFromExternal("scene-a"),
    nodeType: "scene",
    sceneId: "scene-a",
    label: "Hall",
    panoramaUrl: "",
  };
  const sceneB: SceneNode = {
    id: stableSceneNodeIdFromExternal("scene-b"),
    nodeType: "scene",
    sceneId: "scene-b",
    label: "Lab",
    panoramaUrl: "",
  };

  const msg: ActionNode = {
    id: stableActionNodeIdFromPathKey("scene-a:h:0"),
    nodeType: "action",
    actionType: "msg",
    label: "Read Note",
    payload: { copy: { bodyHtml: "Hint", buttonLabel: "OK" } },
    sfx: { url: "", volume: 1 },
    visibility: { requiresItem: "", hiddenIfHasItem: "", clickWhenInvisible: true },
  };
  const goto: ActionNode = {
    id: stableActionNodeIdFromPathKey("scene-a:h:1"),
    nodeType: "action",
    actionType: "goto",
    label: "Go To Lab",
    payload: { target: "scene-b", copy: { bodyHtml: "Move", buttonLabel: "Go" } },
    sfx: { url: "", volume: 1 },
    visibility: { requiresItem: "", hiddenIfHasItem: "", clickWhenInvisible: true },
  };

  // C18.5-followup — Démo d'accueil enrichie avec un nœud image média
  // **par scène**, relié à la scène via un edge meta (scène → image).
  // L'URL par défaut pointe sur le panorama placeholder (grille
  // équirectangulaire jsDelivr, alignée sur
  // `EditorCore.DEFAULT_SCENE_PANORAMA_PLACEHOLDER_URL`), pour que
  // l'aperçu 360° fonctionne immédiatement et que les utilisateurs
  // EPN visualisent à quoi sert un nœud image dans la carte nodale.
  const imageA: MediaImageNode = {
    id: asMediaNodeId("demo-image-a"),
    nodeType: "media",
    mediaType: "media-image",
    label: "Image Hall",
    data: { url: DEFAULT_MEDIA_IMAGE_PLACEHOLDER_URL },
  };
  const imageB: MediaImageNode = {
    id: asMediaNodeId("demo-image-b"),
    nodeType: "media",
    mediaType: "media-image",
    label: "Image Lab",
    data: { url: DEFAULT_MEDIA_IMAGE_PLACEHOLDER_URL },
  };

  state.addScene(sceneA, { x: 80, y: 120 });
  state.addScene(sceneB, { x: 740, y: 120 });
  state.addAction(msg, { x: 350, y: 80 });
  state.addAction(goto, { x: 350, y: 260 });
  state.addMedia(imageA, { x: 80, y: 440 });
  state.addMedia(imageB, { x: 740, y: 440 });
  state.connect({ id: asEdgeId("demo-flow-1"), family: "flow", sourceId: sceneA.id, targetId: msg.id });
  state.connect({ id: asEdgeId("demo-flow-2"), family: "flow", sourceId: sceneA.id, targetId: goto.id });
  state.connect({ id: asEdgeId("demo-trans-1"), family: "transition", sourceId: goto.id, targetId: sceneB.id });
  // Edges meta scène→image : sourceId = scène, targetId = média.
  // `resolveScenePanoramaDisplayUrl` parcourt ces edges pour résoudre
  // l'URL d'aperçu 360° quand `scene.panoramaUrl` est vide (cas démo).
  state.connect({ id: asEdgeId("demo-meta-a"), family: "meta", sourceId: sceneA.id, targetId: imageA.id });
  state.connect({ id: asEdgeId("demo-meta-b"), family: "meta", sourceId: sceneB.id, targetId: imageB.id });
  state.setStartScene(sceneA.id);

  return store;
}

