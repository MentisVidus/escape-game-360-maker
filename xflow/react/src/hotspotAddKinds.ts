import type { EditorLang } from "./mapGraphBuild";

export type HotspotKindId = "msg" | "pick" | "req" | "pwd" | "scene" | "selector";

export function hotspotAddMenuCopy(lang: EditorLang): {
  hintBranch: string;
  groups: { id: string; title: string; kinds: { kind: HotspotKindId; label: string }[] }[];
} {
  if (lang === "en") {
    return {
      hintBranch: "For « Go to scene », drag from the hotspot to a scene node.",
      groups: [
        {
          id: "simple",
          title: "Display / inventory",
          kinds: [
            { kind: "msg", label: "Show message" },
            { kind: "pick", label: "Pick up item" },
          ],
        },
        {
          id: "branch",
          title: "Branches & puzzles",
          kinds: [
            { kind: "scene", label: "Go to scene" },
            { kind: "selector", label: "Choice menu (selector)" },
            { kind: "req", label: "Required item" },
            { kind: "pwd", label: "Riddle / code" },
          ],
        },
      ],
    };
  }
  return {
    hintBranch: "Pour « Aller à une scène », tirez une ligne du hotspot vers un nœud scène.",
    groups: [
      {
        id: "simple",
        title: "Affichage / inventaire",
        kinds: [
          { kind: "msg", label: "Afficher un message" },
          { kind: "pick", label: "Ramasser un objet" },
        ],
      },
      {
        id: "branch",
        title: "Branches & énigmes",
        kinds: [
          { kind: "scene", label: "Aller à une scène" },
          { kind: "selector", label: "Menu de choix (selector)" },
          { kind: "req", label: "Objet requis" },
          { kind: "pwd", label: "Énigme / code" },
        ],
      },
    ],
  };
}
