# xflow — Carte projet (graphe)

Tout ce qui concerne la **vue graphe** de l’éditeur est regroupé ici, en deux dossiers :

| Dossier | Contenu |
|---------|---------|
| **`draw/`** | Carte **Drawflow** actuelle : `project-graph.js`, `project-graph.css` (modale « Carte du projet », vues Focus / complète / acyclique, panneau latéral). |
| **`react/`** | Réservé au futur **Vite + React + React Flow** (Chemin B) — voir `react/README.md` et [docs/PLAN_REACT_INTEGRATION.md](../docs/PLAN_REACT_INTEGRATION.md). |

Les pages racine **`editeur.html`** / **`editor_en.html`** chargent la carte via **`xflow/draw/project-graph.*`**.

L’ancienne POC (`poc.html` / `poc.js` / `poc.css`) a été retirée : le comportement utile est dans l’éditeur + `draw/project-graph.js`.

---

## Drawflow vs React Flow (rappel)

| Critère | Drawflow (`draw/`) | React Flow (`react/`) |
|--------|---------------------|-------------------------|
| Stack | Vanilla JS | React + Vite |
| Aujourd’hui | **En production** dans la modale carte | Spike / remplacement sur branche `feat/react-map` |
| Demain | Remplacé ou complété selon jalons B0–B1 | Voir [PLAN_EDITEUR_NODAL.md](../docs/PLAN_EDITEUR_NODAL.md) §9 |

---

## Synchronisation graphe ↔ JSON / formulaire

- **Source de vérité** : `getCurrentProjectData()` / `saveProject` / `loadProject`.
- **Données sur chaque nœud Drawflow** : argument `data` de `addNode` (`{ kind: 'scene', scId: '...' }`, `{ kind: 'hotspot', hId: 12 }`, etc.) — voir `draw/project-graph.js`.
- **Clic sur un nœud** : `nodeSelected` → scroll ou panneau latéral.

### Comportement de `draw/project-graph.js` (rappel)

- **`generateGraphFromJson(editor, project, …)`** : nœuds Scène / Hotspot et liens de transition.
- Barre dans la modale : **Vue Focus** / **Vue complète** / **Vue acyclique** (`setProjectMapView('focus'|'full'|'tree')`).
- **Mode focus** : première scène active ; transitions en blocs compacts ; double-clic pour recentrer.
