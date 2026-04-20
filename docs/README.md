# Documentation (developers / assistants)

| File | Contents |
|------|----------|
| [ARCHITECTURE.md](./ARCHITECTURE.md) | Layout, **JSON V2** / `EditorCore`, **`.escapegame`** bundle, **`exportGameWebZip`**, Drawflow map & side panel, **Quill**, Pannellum, audio, player HUD, selector, roadmap |
| [CONTRIBUTING.md](./CONTRIBUTING.md) | FR/EN sync, how to change code safely |
| [SELECTOR_SPEC.md](./SELECTOR_SPEC.md) | Spec + implementation status for hotspot **`selector`** (menus, nesting, SFX) |
| [PLAN_EDITEUR_NODAL.md](./PLAN_EDITEUR_NODAL.md) | **Hybrid / nodal** — V2, panneau latéral, bundle & ZIP livrés ; Chemin B (React Flow, full nodal), jalons B0–B5 |
| [PLAN_NODAL_PEDAGOGIE.md](./PLAN_NODAL_PEDAGOGIE.md) | **Pédagogie & intention produit** — publics EPN / jeunes, Scratch & LEGO comme repères, graphe vs formulaire, anti-spaghetti, apprentissage par l’expérience |
| [PLAN_REACT_INTEGRATION.md](./PLAN_REACT_INTEGRATION.md) | **Branche Git + intégration React** — `main` stable, **`xflow/react/`** (Vite), carte Drawflow dans **`xflow/draw/`**, feature flag |
| [PLAN_SAUVEGARDE_LOCALE_EDITEUR.md](./PLAN_SAUVEGARDE_LOCALE_EDITEUR.md) | **Brouillon éditeur** (IndexedDB, snapshots, dock) : cadrage risques / UX — **implémenté** ; le plan reste la référence d’intention |
| [plan_sauvegarde_locale_joueur.md](./plan_sauvegarde_locale_joueur.md) | **Progression joueur** : IndexedDB, `playerSaveMode`, export/import `.escapegame` de sauvegarde — **implémenté** ; le plan documente le contrat et les phases |
| [ICONOGRAPHIE_UI.md](./ICONOGRAPHIE_UI.md) | Plan de migration des emoji UI vers des SVG dédiés (`media/icons/`) |
| [todo.md](./todo.md) | Short **living backlog** (tests, follow-ups) — not a functional spec like ARCHITECTURE / PLAN / SELECTOR_SPEC |
| [`js/editor-core.js`](../js/editor-core.js) | **Headless** core: `EditorCore`, schema V2, `payload.copy`, `{ url, volume }` audio, `DEFAULT_SCENE_PANORAMA_PLACEHOLDER_URL`, no DOM |
| [`js/editor-quill-scenes.js`](../js/editor-quill-scenes.js) | Quill WYSIWYG, scene target selects, `updateQuillTheme()` |
| [`xflow/draw/project-graph.js`](../xflow/draw/project-graph.js) | Drawflow project map (focus / full / tree), narration filter, side panel DOM mount |

User-facing guide: [README.md](../README.md) in the repository root.
