# xflow — Carte projet (graphe)

Tout ce qui concerne la **vue graphe** de l’éditeur est regroupé ici, en deux dossiers :

| Dossier | Contenu |
|---------|---------|
| **`draw/`** | Carte **Drawflow** actuelle : `project-graph.js`, `project-graph.css` (modale « Carte du projet », vues Focus / complète / acyclique, panneau latéral). |
| **`react/`** | Sous-projet **Vite + React + React Flow** (carte nodale, branche `feat/nodal-map`) — voir `react/README.md` et [`.cursor/rules/NODAL_MAP_SPEC.mdc`](../.cursor/rules/NODAL_MAP_SPEC.mdc). |

Les pages racine **`editeur.html`** / **`editor_en.html`** chargent la carte via **`xflow/draw/project-graph.*`**.

L’ancienne POC (`poc.html` / `poc.js` / `poc.css`) a été retirée : le comportement utile est dans l’éditeur + `draw/project-graph.js`.

---

## Drawflow vs React Flow (rappel)

| Critère | Drawflow (`draw/`) | React Flow (`react/`) |
|--------|---------------------|-------------------------|
| Stack | Vanilla JS | React + Vite |
| Branche | `main` (et `feat/nodal-map` côté Drawflow legacy) | `feat/nodal-map` — carte nodale livrée (C5–C7) |
| Aujourd’hui | **En production** sur `main` (vue carte modale uniquement) | **Source de vérité d’édition** sur `feat/nodal-map` (popups, chaînes REQ/PWD, palette) |
| Demain | Remplacé par la carte nodale lors d’un futur merge `feat/nodal-map` → `main` | Voir [`NODAL_MAP_SPEC.mdc`](../.cursor/rules/NODAL_MAP_SPEC.mdc) (spec autoritative) et [docs/PLAN_EDITEUR_NODAL.md](../docs/PLAN_EDITEUR_NODAL.md) §9 |

---

## Synchronisation graphe ↔ JSON / formulaire

- **Source de vérité** : `getCurrentProjectData()` / `saveProject` / `loadProject`.
- **Données sur chaque nœud Drawflow** : argument `data` de `addNode` (`{ kind: 'scene', scId: '...' }`, `{ kind: 'hotspot', hId: 12 }`, etc.) — voir `draw/project-graph.js`.
- **Clic sur un nœud** : `nodeSelected` → scroll ou panneau latéral.

### Comportement de `draw/project-graph.js` (rappel)

- **`generateGraphFromJson(editor, project, …)`** : nœuds Scène / Hotspot et liens de transition.
- Barre dans la modale : **Vue Focus** / **Vue complète** / **Vue acyclique** (`setProjectMapView('focus'|'full'|'tree')`).
- **Mode focus** : première scène active ; transitions en blocs compacts ; double-clic pour recentrer.
