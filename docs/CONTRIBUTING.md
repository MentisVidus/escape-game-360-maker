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
4. Test **Generate** → open `index.html` locally or on a static host; check scenes, inventory, audio, hotspots.

### Extra checklist for selector-related work

When implementing selector / nested selector behavior later, verify all layers:

1. Editor UI: hotspot type dropdown + dynamic choice blocks.
2. Persistence: save/load JSON keeps selector trees intact.
3. Generation: selector payload is injected into generated player config.
4. Runtime: classic hotspots still work, selector choices work, nested selector works.
5. If the project JSON schema changes (e.g. selector v2), confirm whether old files still load or document breaking changes — **no automatic obligation** unless explicitly required.

## Style

- Prefer **small, focused** changes; avoid reformatting unrelated code.
- Match existing patterns (inline styles in editor, `var` in player template, French variable names like `inventaire` until a dedicated rename pass).
- Do not commit secrets or personal machine paths.

## Pull requests / GitHub

If you use GitHub: describe **what** changed and **how to test** in the PR. Link issues if any.

## Documentation

- User docs: [README.md](../README.md).
- Technical docs: [ARCHITECTURE.md](./ARCHITECTURE.md) — update it when you add subsystems (new audio channels, new hotspot type, file split, etc.).
