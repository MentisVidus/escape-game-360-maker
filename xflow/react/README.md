# xflow/react — React Flow + Vite (Chemin B)

Micro-app **Vite + React + TypeScript + @xyflow/react**. Avec **`?reactMap=1`** (ou `localStorage.setItem('reactMap','1')`), la modale carte utilise **React Flow à la place de Drawflow** (**jalon B1** : vues Focus / complète / arbre, mode narration, double-clic focus, panneau latéral DOM inchangé). Sans flag, seul **Drawflow** est utilisé.

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
3. Ouvrir la **Carte du projet** : graphe React Flow pleine zone (Drawflow masqué) ; données `getCurrentProjectData()` ; comportement aligné sur `xflow/draw/project-graph.js`.

Détails techniques utiles : les nœuds custom exposent des **`Handle`** (`in` / `out`) pour que les arêtes s’affichent ; **`zoomOnDoubleClick={false}`** pour que le double-clic refocus en mode Focus ne soit pas mangé par le zoom pane.

### B2 (première tranche) — structure depuis le graphe

Sur les nœuds **scène** : **+** appelle `addHotspotSkeletonFromMapSceneIndex` (FR : `editeur-app.js`, EN : `editor-en-app.js`) → `addHotspot` + rafraîchissement carte + panneau sur le nouveau hotspot ; **×** supprime la scène (confirm, bloqué s’il n’y a qu’une scène). Sur les nœuds **hotspot** : **×** supprime le hotspot (confirm). Les **transitions** restent à éditer dans le formulaire / panneau (pas de tirage de lien seul dans cette PR).

### Vers B3 (sous-graphes)

Amorce : sur le graphe, les hotspots en action **selector** affichent le **nombre de choix** (`payload.nested.choices`) sous le type — pas encore un sous-flot interactif (scène = groupe, selector = îlot dédié : chantier suivant).

Voir aussi [docs/PLAN_REACT_INTEGRATION.md](../../docs/PLAN_REACT_INTEGRATION.md).
