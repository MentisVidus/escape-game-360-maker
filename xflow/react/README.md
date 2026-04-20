# xflow/react — React Flow + Vite (Chemin B)

Micro-app **Vite + React + TypeScript + @xyflow/react** pour le jalon **B0** (graphe lecture seule). La carte **Drawflow** (`xflow/draw/`) reste la vue principale ; ce bundle est chargé **uniquement** si le feature flag est actif (`?reactMap=1` ou `localStorage.setItem('reactMap','1')`).

## Build (option B — artifacts non versionnés)

Le dossier **`dist/`** est listé dans **`.gitignore`** à la racine du repo. Avant de tester l’éditeur avec le flag, depuis ce dossier :

```bash
cd xflow/react
npm install
npm run build
```

Les fichiers **`xflow/react/dist/editor-map.js`** et **`editor-map.css`** sont alors servis par les chemins relatifs depuis `editeur.html` / `editor_en.html`. Sans build, le bandeau React ne s’affiche pas (404 silencieuse côté navigateur).

## Dev local

```bash
npm run dev
```

Ouvre l’URL indiquée par Vite ; le conteneur `#react-map-root` est dans `index.html` de ce sous-projet (hors modale éditeur).

## Voir l’intégration dans l’éditeur

1. `npm run build` dans `xflow/react/`.
2. Ouvrir `editeur.html?reactMap=1` ou `editor_en.html?reactMap=1` (ou activer le flag via `localStorage`).
3. Ouvrir la **Carte du projet** : bandeau React Flow au-dessus de Drawflow ; données issues de `getCurrentProjectData()` si disponible, sinon graphe **mock** à deux nœuds.

Voir aussi [docs/PLAN_REACT_INTEGRATION.md](../../docs/PLAN_REACT_INTEGRATION.md).
