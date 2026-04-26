# xflow/react — React Flow + Vite (Chemin B)

Dossier réservé au sous-projet **Vite + React + React Flow** sur la branche **`feat/react-map`**.

- **`xflow/draw/`** : carte **Drawflow** actuelle (`project-graph.js` / `.css`).
- **`xflow/react/`** : outillage npm **local** ici uniquement (`package.json`, `src/`, build).

Voir **[docs/PLAN_REACT_INTEGRATION.md](../../docs/PLAN_REACT_INTEGRATION.md)**. Tant que ce dossier ne contient pas encore de `package.json` sur `main`, l’éditeur vanilla ne nécessite pas Node.

## Intégration éditeur HTML (chantier C6.0, `feat/nodal-map`)

Après modification des sources React, régénérer le bundle servi par
`editeur.html` / `editor_en.html` :

```bash
cd xflow/react && npm install && npm run build:editor-map
```

Sortie versionnée : **`dist/editor-map.js`** + **`dist/editor-map.css`**
(IIFE global `Escape360EditorNodalMap` : `mount`, `unmount`, `getStore`).
Le store courant est aussi exposé sur **`window.__ESCAPE360_NODAL_STORE__`**
après le premier `mount` sur `#nodal-map-root` (voir
`js/editor-nodal-map-bootstrap.js`).
