# Documentation (developers / assistants)

| File | Contents |
|------|----------|
| [ARCHITECTURE.md](./ARCHITECTURE.md) | Layout, **JSON V2** / `EditorCore`, Drawflow map & side panel, **Quill**, Pannellum, audio, selector, roadmap pointers |
| [CONTRIBUTING.md](./CONTRIBUTING.md) | FR/EN sync, how to change code safely |
| [SELECTOR_SPEC.md](./SELECTOR_SPEC.md) | Spec + implementation status for hotspot **`selector`** (menus, nesting, SFX) |
| [PLAN_EDITEUR_NODAL.md](./PLAN_EDITEUR_NODAL.md) | **Hybrid / nodal** vision — V2 & side panel **delivered**; selector-as-graph-node & React Flow = future; **ZIP offline** = next product priority |
| [todo.md](./todo.md) | Short **living backlog** (tests, follow-ups) — not a functional spec like ARCHITECTURE / PLAN / SELECTOR_SPEC |
| [`js/editor-core.js`](../js/editor-core.js) | **Headless** core: `EditorCore`, schema V2, `payload.copy`, `{ url, volume }` audio, `DEFAULT_SCENE_PANORAMA_PLACEHOLDER_URL`, no DOM |
| [`js/editor-quill-scenes.js`](../js/editor-quill-scenes.js) | Quill WYSIWYG, scene target selects, `updateQuillTheme()` |
| [`xflow/project-graph.js`](../xflow/project-graph.js) | Drawflow project map (focus / full / tree), narration filter, side panel DOM mount |

User-facing guide: [README.md](../README.md) in the repository root.
