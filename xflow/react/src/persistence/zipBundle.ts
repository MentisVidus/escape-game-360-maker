import { strFromU8, strToU8, unzipSync, zipSync } from "fflate";

import type { NodalProject } from "../model/project";
import { applyLayout, serializeLayout, type MapLayoutJson } from "../serialize/mapLayoutJson";
import { deserializeFromProjectJson } from "../serialize/fromProjectJson";
import type { ProjectJsonV2 } from "../serialize/toProjectJson";
import { serializeToProjectJson } from "../serialize/toProjectJson";

/** Sérialise le store nodal en archive `.escapegame` (ZIP : `project.json` + `map-layout.json`). */
export function exportProjectEscapegameZip(project: NodalProject): Blob {
  const projectJson = serializeToProjectJson(project);
  const layoutJson = serializeLayout(project);
  const zipped = zipSync({
    "project.json": strToU8(JSON.stringify(projectJson, null, 2)),
    "map-layout.json": strToU8(JSON.stringify(layoutJson, null, 2)),
  });
  return new Blob([new Uint8Array(zipped)], { type: "application/zip" });
}

export type ImportedNodalBundle = {
  projectJson: ProjectJsonV2;
  layoutJson: MapLayoutJson;
};

/**
 * Lit un ZIP `.escapegame`, retourne les deux JSON.
 * @throws si `project.json` ou `map-layout.json` est absent ou JSON invalide
 */
export function importProjectEscapegameZip(buf: ArrayBuffer): ImportedNodalBundle {
  const files = unzipSync(new Uint8Array(buf));
  const pjRaw = files["project.json"];
  const mlRaw = files["map-layout.json"];
  if (!pjRaw) {
    throw new Error("Archive invalide : fichier project.json absent.");
  }
  if (!mlRaw) {
    throw new Error("Archive invalide : fichier map-layout.json absent.");
  }
  try {
    return {
      projectJson: JSON.parse(strFromU8(pjRaw)) as ProjectJsonV2,
      layoutJson: JSON.parse(strFromU8(mlRaw)) as MapLayoutJson,
    };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    throw new Error(`Archive corrompue ou JSON malformé : ${msg}`);
  }
}

/** Reconstruit un `NodalProject` en mémoire (sans passer par le store). */
export function buildNodalProjectFromBundle(projectJson: ProjectJsonV2, layoutJson: MapLayoutJson) {
  const project = deserializeFromProjectJson(projectJson);
  applyLayout(project, layoutJson);
  return project;
}
