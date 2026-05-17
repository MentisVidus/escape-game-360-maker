import { describe, expect, it } from "vitest";

import { enrichProjectJsonForBundleWalker } from "../serialize/enrichProjectForBundleWalker";
import type { ProjectJsonV2 } from "../serialize/toProjectJson";
import { serializeToProjectJson } from "../serialize/toProjectJson";
import { createNodalProjectStore } from "../store/nodalProjectStore";
import {
  buildFixtureStore as buildC23FixtureStore,
  BLOB as C23_BLOB,
} from "./c23_3_roundtrip.test";

/** Miroir `EditorSharedBundlePaths.computeSceneAmbianceClipsForPlayer` (generate). */
function computeSceneAmbianceClipsLikePlayer(
  project: ProjectJsonV2,
  pathFn: (u: string) => string = (u) => u
): Record<string, { url: string; volume: number }> {
  const clips: Record<string, { url: string; volume: number }> = {};
  (project.scenes || []).forEach((scene, index) => {
    if (!scene) return;
    const scId = scene.id || `scene_${index + 1}`;
    const amb = scene.media?.ambiance;
    const scAudioRaw =
      typeof amb === "string"
        ? amb.trim()
        : amb?.url != null
          ? String(amb.url).trim()
          : "";
    if (!scAudioRaw) return;
    const ambVol =
      amb && typeof amb === "object" && amb.volume !== undefined && !Number.isNaN(Number(amb.volume))
        ? Math.max(0, Math.min(1, Number(amb.volume)))
        : 1;
    clips[scId] = { url: pathFn(scAudioRaw), volume: ambVol };
  });
  return clips;
}

describe("C23.3-fix — Generate Game web sceneAmbianceClips", () => {
  it("projet nodal sérialisé + enrich → scene.media.ambiance non vide", () => {
    const { store } = buildC23FixtureStore();
    const raw = serializeToProjectJson(store.getState());
    const enriched = enrichProjectJsonForBundleWalker(raw);
    const scene = enriched.scenes.find((s) => s.id === "room");
    expect(scene?.media?.ambiance?.url).toBe(C23_BLOB.amb);
  });

  it("computeSceneAmbianceClips sur projet enrichi → url ambiance par scène", () => {
    const { store } = buildC23FixtureStore();
    const enriched = enrichProjectJsonForBundleWalker(serializeToProjectJson(store.getState()));
    const clips = computeSceneAmbianceClipsLikePlayer(enriched);
    expect(clips.room?.url).toBe(C23_BLOB.amb);
    expect(clips.room?.volume).toBeCloseTo(0.7, 5);
    expect(Object.keys(clips).length).toBeGreaterThanOrEqual(1);
  });

  it("sans projection ambiance (JSON brut sans media) → clips vides", () => {
    const { store } = buildC23FixtureStore();
    const raw = serializeToProjectJson(store.getState());
    const stripped = JSON.parse(JSON.stringify(raw)) as ProjectJsonV2;
    for (const sc of stripped.scenes || []) {
      if (sc.media) sc.media.ambiance = { url: "", volume: 1 };
    }
    const clips = computeSceneAmbianceClipsLikePlayer(stripped);
    expect(Object.keys(clips).length).toBe(0);
  });

  it("store vide → clips vides", () => {
    const store = createNodalProjectStore();
    const enriched = enrichProjectJsonForBundleWalker(serializeToProjectJson(store.getState()));
    expect(computeSceneAmbianceClipsLikePlayer(enriched)).toEqual({});
  });

  it("enrich préserve pitch/yaw/customCss hotspots (format DOM legacy)", () => {
    const domLike: ProjectJsonV2 = {
      schemaVersion: 2,
      title: "Test",
      scenes: [
        {
          id: "room",
          title: "Room",
          panoramaUrl: C23_BLOB.pano,
          media: {
            panoramaUrl: C23_BLOB.pano,
            ambiance: { url: C23_BLOB.amb, volume: 0.7 },
          },
          hotspots: [
            {
              id: "hs_1",
              title: "HS",
              pitch: 12.5,
              yaw: -30,
              customCss: "background:red;",
              appearance: { ui_img: C23_BLOB.hs },
              action: {
                type: "msg",
                payload: { copy: { bodyHtml: "<p>x</p>", buttonLabel: "OK" } },
                sfx: { url: C23_BLOB.sfx, volume: 1 },
                visibility: {
                  requiresItem: "",
                  hiddenIfHasItem: "",
                  clickWhenInvisible: true,
                },
              },
            },
          ],
        },
      ],
    };
    const enriched = enrichProjectJsonForBundleWalker(domLike);
    const hs = enriched.scenes[0]?.hotspots[0];
    expect(hs?.pitch).toBe(12.5);
    expect(hs?.yaw).toBe(-30);
    expect(hs?.customCss).toContain("red");
    expect(enriched.scenes[0]?.media?.ambiance?.url).toBe(C23_BLOB.amb);
    const clips = computeSceneAmbianceClipsLikePlayer(enriched);
    expect(clips.room?.url).toBe(C23_BLOB.amb);
  });
});
