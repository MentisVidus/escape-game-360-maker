# xflow/react — React Flow + Vite (carte nodale)

Sous-projet **Vite + React + React Flow** porté par la branche **`feat/nodal-map`** (la précédente `feat/react-map` est archivée — voir tag `archive/feat-react-map`).

- **`xflow/draw/`** : carte **Drawflow** legacy (`project-graph.js` / `.css`) toujours présente sur `main`.
- **`xflow/react/`** : outillage npm **local** ici uniquement (`package.json`, `src/`, build).

Spec autoritative : **[`.cursor/rules/NODAL_MAP_SPEC.mdc`](../../.cursor/rules/NODAL_MAP_SPEC.mdc)**.

## Intégration éditeur HTML (chantier C6.0, `feat/nodal-map`)

Le dépôt **ignore** `xflow/react/dist/` : chaque clone / machine doit
régénérer le bundle avant d’ouvrir la carte nodale dans l’éditeur :

```bash
cd xflow/react && npm install && npm run build:editor-map
```

Sortie locale : **`dist/editor-map.js`** + **`dist/editor-map.css`**
(IIFE global `Escape360EditorNodalMap` : `mount`, `unmount`, `getStore`).
Le store courant est aussi exposé sur **`window.__ESCAPE360_NODAL_STORE__`**
après le premier `mount` sur `#nodal-map-root` (voir
`js/editor-nodal-map-bootstrap.js`).

**Accès UI** : dans l’éditeur, bouton **« Afficher la carte »** → dans
l’en-tête de la modale, onglets **Drawflow** | **Carte nodale (bêta)**.
