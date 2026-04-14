# Contributing — Escape Game 360° Maker

## Who this is for

Contributors comfortable editing HTML/CSS/JS, and **AI tools** applying patches. Read [ARCHITECTURE.md](./ARCHITECTURE.md) first for the mental model (editor vs generated `index.html`).

## French / English editors

- **Canonical behavior** should stay identical between the French and English **pairs** (`js/editeur-app.js` / `js/editeur-generate.js` vs `js/editor-en-app.js` / `js/editor-en-generate.js`), loaded by [editeur.html](../editeur.html) and [editor_en.html](../editor_en.html).
- Typical workflow when adding a feature:
  1. Implement in the French files (or English first, then port).
  2. Port the same logic: form fields, `saveProject` / `loadProject`, and the **`generateGame()` template** in `*-generate.js` if gameplay changes.
  3. In the English files, use **English comments**; user-visible strings in English.
  4. Shared styling goes in [css/editor.css](../css/editor.css) when it applies to both UIs.

Save filenames: `projet.json` (FR editor) vs `project.json` (EN editor) — **same JSON shape**; either editor can load a file saved by the other.

## Making changes safely

1. **Grep** for related symbols (`generateGame`, `sceneAudios`, `hotspotDispatcher`, etc.).
2. If you touch **generated** behavior, update the **template string** inside `generateGame()` — not only the editor UI.
3. Test **Save project** → **Load project** so JSON round-trips.
4. If you touch **bundle** code: test **Save project (.escapegame)** → **Load**, and a round-trip with **local media** pickers (`openBundleLocalMediaPicker`).
5. If you touch **export** code: test **`generateGame()`** and **`exportGameWebZip()`**; confirm `lib/` + `media/` in the ZIP when using local assets.
6. Test **Generate** → open `index.html` locally or on a static host; check scenes, inventory, audio, hotspots, **player settings** (volume sliders) if relevant.

### Extra checklist for selector-related work

When touching selector / nested selector code, verify all layers:

1. **Editor UI** : cartes de choix, champs par `actionType`, bloc `nested`, textarea JSON + mode expert — **sélecteurs DOM bornés à la carte courante** (éviter `querySelector` trop large entre parent et enfant).
2. **Persistence** : **Save project → Load project** round-trip avec plusieurs niveaux ; si vous modifiez `updateHsFields` / `addHotspot`, garder **`deferSelectorInit`** tant que `f_sel_choices` n’est pas restauré depuis le JSON.
3. **Generation** : le payload `choices` (y compris `nested`) est bien injecté dans le template joueur (`*-generate.js`).
4. **Runtime** : hotspots classiques inchangés ; selector racine + sous-menus ; SFX coupés à la fermeture / retour message si vous touchez l’audio.
5. **FR / EN** : porter les mêmes changements dans `editeur-app.js` / `editor-en-app.js` et les paires `*-generate.js`.
6. Schéma JSON : pas d’obligation de rétrocompatibilité automatique — documenter les ruptures si besoin (voir [SELECTOR_SPEC.md](./SELECTOR_SPEC.md)).

## Style

- Prefer **small, focused** changes; avoid reformatting unrelated code.
- Match existing patterns (inline styles in editor, `var` in player template, French variable names like `inventaire` until a dedicated rename pass).
- Do not commit secrets or personal machine paths.

## Pull requests / GitHub

If you use GitHub: describe **what** changed and **how to test** in the PR. Link issues if any.

## Documentation

- User docs: [README.md](../README.md).
- Technical docs: [ARCHITECTURE.md](./ARCHITECTURE.md) — update it when you add subsystems (new audio channels, new hotspot type, **bundle / export** paths, file split, etc.).
