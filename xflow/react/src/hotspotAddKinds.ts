import type { EditorLang } from "./mapGraphBuild";

export type HotspotKindId = "msg" | "pick" | "req" | "pwd" | "scene" | "selector";

export type MapAddMenuEntry =
  | { type: "addScene" }
  | { type: "hotspot"; kind: HotspotKindId }
  | { type: "media"; field: "panorama" | "ambiance" }
  | { type: "globalSettings" };

export type MapAddMenuRow = { id: string; label: string; entry: MapAddMenuEntry };

export type MapAddMenuGroup = { id: string; title: string; rows: MapAddMenuRow[] };

export type MapAddMenuSection = { id: string; title: string; groups: MapAddMenuGroup[] };

export type MapAddMenuCopy = {
  hintBranch: string;
  hintAltCopy: string;
  sections: MapAddMenuSection[];
};

/** Menu d’ajout (scène + palette carte) : hotspots, médias scène, réglages globaux. */
export function mapGraphAddMenuCopy(lang: EditorLang): MapAddMenuCopy {
  if (lang === "en") {
    return {
      hintBranch: "For « Go to scene », drag from the hotspot to a scene node.",
      hintAltCopy: "Hold Alt while dragging from any hotspot to a scene to copy it there.",
      sections: [
        {
          id: "scene",
          title: "Scene",
          groups: [
            {
              id: "newsc",
              title: "Project",
              rows: [{ id: "addScene", label: "New scene", entry: { type: "addScene" } }],
            },
          ],
        },
        {
          id: "hotspot",
          title: "Hotspot",
          groups: [
            {
              id: "simple",
              title: "Simple",
              rows: [
                { id: "msg", label: "Message", entry: { type: "hotspot", kind: "msg" } },
                { id: "pick", label: "Pick up item", entry: { type: "hotspot", kind: "pick" } },
              ],
            },
            {
              id: "cond",
              title: "Conditional",
              rows: [
                { id: "req", label: "Required item", entry: { type: "hotspot", kind: "req" } },
                { id: "pwd", label: "Riddle / code", entry: { type: "hotspot", kind: "pwd" } },
              ],
            },
            {
              id: "trans",
              title: "Transition",
              rows: [
                { id: "scene", label: "Go to scene", entry: { type: "hotspot", kind: "scene" } },
              ],
            },
            {
              id: "sel",
              title: "Selector",
              rows: [
                { id: "selector", label: "Choice menu", entry: { type: "hotspot", kind: "selector" } },
              ],
            },
          ],
        },
        {
          id: "media",
          title: "Media (this scene)",
          groups: [
            {
              id: "med",
              title: "Fields",
              rows: [
                { id: "pano", label: "Panorama image", entry: { type: "media", field: "panorama" } },
                { id: "amb", label: "Scene ambiance audio", entry: { type: "media", field: "ambiance" } },
              ],
            },
          ],
        },
        {
          id: "rules",
          title: "Game rules",
          groups: [
            {
              id: "glob",
              title: "Global",
              rows: [
                {
                  id: "settings",
                  label: "Global settings (audio, end screens…)",
                  entry: { type: "globalSettings" },
                },
              ],
            },
          ],
        },
      ],
    };
  }
  return {
    hintBranch: "Pour « Aller à une scène », tirez une ligne du hotspot vers un nœud scène.",
    hintAltCopy:
      "Maintenez Alt en tirant depuis un hotspot vers une scène pour le copier dans cette scène.",
    sections: [
      {
        id: "scene",
        title: "Scène",
        groups: [
          {
            id: "newsc",
            title: "Projet",
            rows: [{ id: "addScene", label: "Nouvelle scène", entry: { type: "addScene" } }],
          },
        ],
      },
      {
        id: "hotspot",
        title: "Hotspot",
        groups: [
          {
            id: "simple",
            title: "Simple",
            rows: [
              { id: "msg", label: "Message", entry: { type: "hotspot", kind: "msg" } },
              { id: "pick", label: "Ramasser un objet", entry: { type: "hotspot", kind: "pick" } },
            ],
          },
          {
            id: "cond",
            title: "Conditionnel",
            rows: [
              { id: "req", label: "Objet requis", entry: { type: "hotspot", kind: "req" } },
              { id: "pwd", label: "Énigme / code", entry: { type: "hotspot", kind: "pwd" } },
            ],
          },
          {
            id: "trans",
            title: "Transition",
            rows: [
              { id: "scene", label: "Aller à une scène", entry: { type: "hotspot", kind: "scene" } },
            ],
          },
          {
            id: "sel",
            title: "Selector",
            rows: [
              { id: "selector", label: "Menu de choix", entry: { type: "hotspot", kind: "selector" } },
            ],
          },
        ],
      },
      {
        id: "media",
        title: "Média (cette scène)",
        groups: [
          {
            id: "med",
            title: "Champs",
            rows: [
              { id: "pano", label: "Image panorama", entry: { type: "media", field: "panorama" } },
              { id: "amb", label: "Audio ambiance", entry: { type: "media", field: "ambiance" } },
            ],
          },
        ],
      },
      {
        id: "rules",
        title: "Règles du jeu",
        groups: [
          {
            id: "glob",
            title: "Global",
            rows: [
              {
                id: "settings",
                label: "Paramètres globaux (audio, fins de partie…)",
                entry: { type: "globalSettings" },
              },
            ],
          },
        ],
      },
    ],
  };
}

/** @deprecated utiliser mapGraphAddMenuCopy */
export function hotspotAddMenuCopy(lang: EditorLang): MapAddMenuCopy {
  return mapGraphAddMenuCopy(lang);
}
