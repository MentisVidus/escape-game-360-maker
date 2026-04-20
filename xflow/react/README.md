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

Sur les nœuds **scène** : **+** appelle `addHotspotSkeletonFromMapSceneIndex` (FR : `editeur-app.js`, EN : `editor-en-app.js`) → `addHotspot` + rafraîchissement carte + panneau sur le nouveau hotspot ; **×** supprime la scène (confirm, bloqué s’il n’y a qu’une scène). Sur les nœuds **hotspot** : **×** supprime le hotspot (confirm).

### B2 (suite — à faire avant le gros B3)

**Priorité** : finir le périmètre **B2** (édition structurelle / transitions plus lisibles depuis le graphe) avant le chantier **B3** (sous-graphes scène / selector). Pistes documentées :

- **Transitions « évidentes »** : depuis le graphe (ex. choix de scène cible pour une action `scene`, ou autre flux guidé), sans remplacer tout le formulaire.
- **Nouvelle scène** : raccourci sur un nœud ou équivalent (aujourd’hui le FAB **+** de la modale appelle `addSceneFromMap`).

### B3 (sous-graphes) — plus tard

Scène = groupe, selector = sous-flot interactif (voir [PLAN_EDITEUR_NODAL.md](../../docs/PLAN_EDITEUR_NODAL.md) §9). En attendant, une **pastille d’info** seulement : les hotspots **selector** affichent le **nombre de choix** (`payload.nested.choices`) sous le type — ce n’est pas le sous-flot B3, seulement une aide à la lecture du graphe.

Voir aussi [docs/PLAN_REACT_INTEGRATION.md](../../docs/PLAN_REACT_INTEGRATION.md).
