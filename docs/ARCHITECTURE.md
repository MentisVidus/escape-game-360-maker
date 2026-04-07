# Architecture — Escape Game 360° Maker

This document is for **developers** and **AI assistants** working on the repository. End-user instructions stay in the root [README.md](../README.md).

## Repository layout

| Path | Role |
|------|------|
| [editeur.html](../editeur.html) | Main editor (French UI): markup + `<link>` / `<script src>`. |
| [editor_en.html](../editor_en.html) | Same behavior, English UI; comments in English; default save as `project.json`. |
| [css/editor.css](../css/editor.css) | Shared editor chrome (layout, buttons, modals, form controls). |
| [js/editeur-app.js](../js/editeur-app.js) | French editor: UI, scenes/hotspots, save/load, previews — everything except `generateGame`. |
| [js/editeur-generate.js](../js/editeur-generate.js) | French: `generateGame()` (player template) + `window.onload` boot. |
| [js/editor-en-app.js](../js/editor-en-app.js) | English editor — same split as FR; mirrors `editeur-app.js`. |
| [js/editor-en-generate.js](../js/editor-en-generate.js) | English: `generateGame()` + boot; mirrors `editeur-generate.js`. |
| [README.md](../README.md) | User-facing documentation (FR + EN). |

There is **no build step**. Open either HTML file from disk or host statically (e.g. GitHub Pages). HTML files live at the repo root; assets use relative paths (`css/`, `js/`). Load order: **`*-app.js` then `*-generate.js`** (both `defer`); the second file defines `generateGame` and `window.onload`.

## Editor shell vs generated player

Each editor page loads:

1. **Editor application** — the `*-app.js` then `*-generate.js` pair runs in the browser tab; builds the form, preview modals, saves JSON, calls `generateGame()`.
2. **Generated output** — not stored in the repo; `generateGame()` builds a **string** (`htmlTemplate`) and triggers download of **`index.html`**. That file is a **standalone player**: Pannellum + inventory + audio + hotspot logic.

Important: the **player** code is embedded as a large template literal inside `generateGame()`. Changing gameplay requires editing that template (or later extracting it to a shared script).

## Data flow

```
Form DOM  →  saveProject()  →  projet.json / project.json
projet.json / project.json   →  loadProject()  →  rebuild DOM (addScene, addHotspot)

Form DOM  →  generateGame()  →  index.html (download)
```

```mermaid
flowchart LR
    A[Editor form DOM] --> B[saveProject]
    B --> C[project JSON file]
    C --> D[loadProject]
    D --> A

    A --> E[generateGame]
    E --> F[index.html download]
    F --> G[Standalone player]
    G --> H[Pannellum viewer]
    G --> I[Inventory + dialogs + audio]
```

- **First scene** in document order becomes Pannellum’s `firstScene` / start scene.
- Scene **id** is the short id from `.sc-id` (not the internal `scene_<n>` block id). Pannellum scenes are keyed by that id.

## Project JSON (save file)

Top-level keys (see `saveProject()`):

- `title`, `useInv`, `invPos`, `invIcon`, `invBgc`, `invBga`, `invColor`
- `useCustomPopup`, `popFont`, `popColor`, `popBgc`, `popBga`, `popBtnBg`, `popBtnCol`
- `useGlobalAudio`, `globalAudioUrl`
- `scenes`: array of `{ scId, scImg, scTitle, scAudio, hotspots: [...] }`

Each hotspot object is produced by `extractHotspotData()` — dynamic field names use underscores (e.g. `f_trans_txt` from class `f-trans-txt`), plus `ui_*` for visual CSS editor, `expertMode`, `hsTitle`, `pitch`, `yaw`, `customCss`, `type`.

## Editor: main functions (reference)

| Function | Purpose |
|----------|---------|
| `addScene` / `addHotspot` | Inject scene or hotspot blocks; defaults for new items. |
| `extractHotspotData` | Serialize one hotspot for JSON or duplication. |
| `duplicateHotspot` / `duplicateScene` | Copy helpers; scene duplicate copies ambient URL. |
| `buildCss` / `toggleExpertMode` | No-code CSS vs raw textarea. |
| `openPicker` / `previewScene` | Fullscreen Pannellum for coordinates / scene preview (`#live-preview-styles`). |
| `updateHsFields` | Swap dynamic fields by hotspot type (`msg`, `pick`, `req`, `pwd`, `scene`, `selector`). |
| `saveProject` / `loadProject` | JSON persistence. |
| `updatePreview` | Inventory + dialog preview widgets in global settings. |
| `generateGame` | Read DOM → build `scenesConfig`, `sceneAudios`, CSS, inject into template → download. |

Hotspot **types** in the player are handled in `hotspotDispatcher` inside the generated script.

## Pannellum integration

- Editor previews: `pannellum.viewer` on `#picker-panorama` and `#scene-preview-panorama`.
- Player: single viewer on `#panorama` with `default.firstScene` and `scenes` object.

Hotspots use `createTooltipFunc` pointing to **`hotspotDispatcher`** (a real function in the player). The config is built with `JSON.stringify` then a string replace converts `"createTooltipFunc": "hotspotDispatcher"` to a **bare identifier** so the output is valid JavaScript.

**Modales joueur** (`openSelector`, `afficherPopup`, énigme mot de passe) partagent le même **chrome** : overlay plein écran assombri (`rgba(0,0,0,0.82)`), `z-index: 10050`, panneau centré `max-width: 420px`, `border-radius: 8px`, ombre. Clic sur le fond : fermeture (pour `afficherPopup`, sans appeler `onConfirm`).

Scene changes: player listens to **`scenechange`** and calls **`applySceneAmbiance(sceneId)`** so per-scene ambient audio stays aligned with the current room.

## Audio (player)

- **Music**: optional loop on `#audio-music`, URL from global settings; started after splash.
- **Ambiance**: loop on `#audio-ambiance`; URL map `sceneAmbianceUrls` built from each scene’s `.sc-audio`; empty URL → stop and clear channel.
- **SFX**: `#audio-sfx` ; `playSFX(url, relVol)` (volume relatif 0–1). Utilisé par les **choix selector** (`sfxUrl` / `sfxVolume` dans le JSON des choix).
- **Selector + message** : les choix `msg` ouvrent une **vue message** dans la même modale (scroll), pas une `afficherPopup` séparée ; **pick** ouvre le panneau inventaire si l’inventaire est activé dans les paramètres globaux du jeu généré.
- **Pick** : depuis un hotspot classique, la zone est masquée après ramassage ; depuis un **selector**, la zone **reste** (troisième argument `fromSelector` à `executeAction`) pour pouvoir rouvrir le menu.

Splash screen exists so audio can start after a **user gesture** (browser autoplay policies).

## Notable DOM hooks

- `#scenes-container` — all `.scene-block` elements.
- `.sc-id`, `.sc-img`, `.sc-title`, `.sc-audio` per scene.
- `.hotspot-block` / `.hs-pitch`, `.hs-yaw`, `.hs-type`, `.hs-custom-css`, `#fields_<id>`.

## Hosting and CORS

- **HTTPS URLs** for panoramas/audio are the most reliable when testing from `file://` is problematic.
- Local relative paths (`./image.jpg`) work when the game is served from a proper origin (same folder as assets).

## Evolutions (planned / discussed)

These are **not** fully implemented unless marked otherwise; listed so assistants know intent:

- Split editor into `*.css` / `*.js` modules (same repo, still zero build or simple static hosting).
- Optional **local Pannellum** bundle instead of CDN.
- **SFX** per hotspot (URLs + volume).
- **Player** volume UI: master / music / ambiance / SFX; editor-side gain × player gain.
- **Levels**: multiple generated HTML files + `localStorage` inventory handoff.
- **Picked items persistence** when revisiting a scene (hide picked hotspots across visits).
- i18n: today FR/EN = **two files**; a shared JSON string table could reduce duplication later.

## Planned selector refactor (future)

Detailed **draft** specification: [SELECTOR_SPEC.md](./SELECTOR_SPEC.md).

The next major gameplay evolution is a new hotspot type: **`selector`**.

Goal:

- A hotspot click opens a menu popup with multiple choices.
- Each choice can run an action (`msg`, `scene`, `pick`, `req`, `pwd`).
- Later, a choice may itself open another selector (nested menus).

### Why refactor first

Current generated player logic is mostly linear in `hotspotDispatcher`.  
For selectors and nested selectors, action execution should be centralized in one reusable function.

### Target architecture

1. Keep `hotspotDispatcher` as the trigger layer (Pannellum integration).
2. **`executeAction(payload, hsDiv)`** — implemented in the **generated** `index.html` (template in `*-generate.js`). Handles `msg` / `scene` / `pick`; `executeReward` delegates req/pwd success branches to the same engine.
3. Add `openSelector(...)` for selector UI: **one modal container**; sub-menus **replace** inner content (logical history stack only — **no** stacked popups).
4. `hotspotDispatcher` behavior:
   - classic hotspot (`msg` / `scene` / `pick` / `req` / `pwd`): `executeAction` / `executeReward` / inline pwd UI
   - selector hotspot: `openSelector(...)` then `choiceToPayload` → `executeAction` for each choice (`msg` / `scene` / `pick` in v1)
5. A selector choice click:
   - if `actionType !== "selector"`: call `executeAction(...)`
   - if `actionType === "selector"`: push next level into the **same** modal (replace view)

```mermaid
flowchart TD
    A[Hotspot click] --> B{type}
    B -->|classic| C[executeAction payload]
    B -->|selector| D[openSelector same modal]
    D --> E[Choice click]
    E --> F{choice actionType}
    F -->|classic| C
    F -->|selector| D
```

### Data model direction

Current model stays valid for classic hotspot types.  
Add selector payload on top:

- Hotspot: `type: "selector"`
- Hotspot args: `choices: []`
- Each choice entry:
  - `label`
  - `actionType`
  - action-specific fields (`target`, `txt`, `itemId`, etc.)
  - optional nested `choices` for recursive selector

### Implementation notes

- The **same extraction and restore path** must support selector data:
  - `extractHotspotData`
  - `saveProject`
  - `loadProject`
  - `generateGame`
- Selector UI editor should be dynamic (add / remove / reorder choices).
- **JSON compatibility**: project author prefers **no** guarantee of loading old project files after a breaking schema change; simplify code over legacy support (see [SELECTOR_SPEC.md](./SELECTOR_SPEC.md) §1 / §6).

## Versioning

Feature list for **non-developers** is maintained in README (bump version there when you ship meaningful changes). This file does not duplicate marketing version numbers unless useful for debugging.
