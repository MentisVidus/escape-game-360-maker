# Plan — Éditeur nodal & schéma projet unifié

Document de **référence** pour l’architecture **hybride** (graphe Drawflow + formulaire classique) et le **schéma JSON V2**. Il complète [ARCHITECTURE.md](./ARCHITECTURE.md) sur les choix de conception.

**Statut (printemps 2026)** : les chantiers **données V2**, **panneau latéral**, **carte Drawflow** (vues multiples, narration), **bundle éditeur `.escapegame`**, **export ZIP hébergement Web** (`exportGameWebZip`) et **réglages audio côté joueur** (HUD + `localStorage`) sont **livrés**. La représentation **dédiée des selectors comme nœuds multi-sorties** dans le graphe reste une **piste d’évolution** (priorité moindre).

**Versioning** : le dépôt reste présenté en **bêta** ; les sauvegardes récentes incluent **`schemaVersion: 2`**. Le terme **schéma projet v2** désigne ce format, distinct des brouillons historiques de développement.

**Rétrocompatibilité** : `EditorCore` détecte les fichiers **legacy V1** (sans `schemaVersion`) et les normalise en mémoire ; l’objectif produit est toutefois d’**enregistrer** exclusivement du V2.

---

## 1. Objectifs (atteints ou en cours)

1. **Une seule notion d’« action »** dans les données : même structure pour un clic **hotspot** ou un **choix** dans un menu selector (y compris imbrication `nested`).
2. **Options transverses** (`sfx`, `visibility`) au même endroit pour tous les déclencheurs, sans duplication entre formulaire hotspot et cartes de choix.
3. **UI hybride** : **carte** (Drawflow) pour la cartographie et la navigation ; **panneau latéral** pour l’édition détaillée, **sans dupliquer** la logique métier (réutilisation des blocs DOM existants).
4. **Graphe enrichi (partiel)** : scènes, hotspots et transitions vers d’autres scènes ; filtres (ex. mode **narration**). Extension future : nœuds selector explicites si le besoin pédagogique le justifie.

Références : [ARCHITECTURE.md](./ARCHITECTURE.md), [SELECTOR_SPEC.md](./SELECTOR_SPEC.md), [xflow/README.md](../xflow/README.md), [xflow/project-graph.js](../xflow/project-graph.js).

### Couche headless — `EditorCore`

- **Fichier** : [`js/editor-core.js`](../js/editor-core.js) — aucun accès `document` / Drawflow ; exposé sur `window.EditorCore`.
- **Rôle** : `SCHEMA_VERSION`, projet vide, **action unifiée** par défaut, normalisation **payload** (dont **`payload.copy`** pour les textes, **`{ url, volume }`** pour l’audio), parse JSON avec branche **`legacyV1`**.
- **Adaptateurs** : `editeur-app.js` / `editor-en-app.js` lisent et écrivent le DOM ; `getCurrentProjectData()` / `loadProject` s’alignent sur le V2. La carte appelle `getCurrentProjectData()` et synchronise le panneau sur le DOM réel.

### Migration React Flow (Chemin B — long terme)

Remplacer **uniquement** la couche « rendu graphe » (aujourd’hui Drawflow) par des adaptateurs équivalents ; **`EditorCore`** et le **JSON V2** restent la source de vérité logique.

---

## 2. Schéma JSON V2 (rappel)

- **`schemaVersion`** : `2` en tête de fichier.
- **Scène** : `id`, titre, `media` (panorama, ambiance `{ url, volume }`), `hotspots[]`.
- **Hotspot** : géométrie / apparence, puis **`action`** unifiée (`type`, `payload`, `sfx`, `visibility`).
- **Texte** : contenus riches dans **`payload.copy`** — typiquement `bodyHtml` (HTML issu de Quill), `buttonLabel` pour les transitions.
- **Audio** : clips normalisés **`{ url, volume }`** (musique globale, ambiance de scène, `action.sfx`).
- **Selector** : `payload.nested` avec `copy.bodyHtml` (intro), `choices[]` ; chaque choix porte une **`action`** du même gabarit.

Exemple minimal d’action message :

```json
{
  "type": "msg",
  "payload": {
    "copy": {
      "bodyHtml": "<p>Bienvenue.</p>",
      "buttonLabel": ""
    }
  },
  "sfx": { "url": "", "volume": 1 },
  "visibility": { "requiresItem": "", "hiddenIfHasItem": "" }
}
```

Le moteur joueur généré reste compatible via une couche d’**adaptation** (`choiceV2ToLegacy`, `actionV2ToPlayerArgs`, etc. dans `editeur-generate.js` / `editor-en-generate.js`).

---

## 3. Comportement implémenté — panneau latéral & carte

Modale **Carte du projet** (Drawflow, plein écran) :

| Sélection | Comportement |
|-----------|----------------|
| **Nœud Scène** | Le panneau latéral **accueille** le `.scene-block` correspondant (déplacement DOM depuis `#scenes-container` vers `#project-map-side-content`). Édition identique au formulaire principal ; à la fermeture, le bloc est **replacé** dans le flux des scènes. |
| **Nœud Hotspot** | Montage du bloc hotspot dans le panneau (même principe de **déplacement DOM**), accès placement 360°, action, etc. |
| **Vue Focus** | Scène « active » détaillée + cibles **compactes** ; double-clic sur une cible pour recentrer le graphe. |
| **Vue complète** | Graphe élargi (profondeur BFS depuis la première scène). |
| **Vue acyclique** | Flux gauche → droite avec **nœuds alias** pour les retours vers des scènes déjà visitées. |
| **Mode narration** | Filtre (case à cocher) pour mettre l’accent sur les **transitions** (parcours type récit). |

Synchronisation : après ajout de scène depuis la carte, **`refreshAllSceneTargetSelects`** et **`mountProjectMapSidePanelElement`** maintiennent listes d’IDs et panneau cohérents avec le DOM.

---

## 4. Phases de réalisation

| Phase | Contenu | État |
|-------|---------|------|
| **1** | Schéma V2, `EditorCore`, save/load, génération, refactor actions | **Livré** |
| **2** | Panneau latéral Drawflow + déplacement DOM + vues carte | **Livré** |
| **3** | Nœuds selector « câblés » dans Drawflow (multi-sorties dédiées) | **Non prioritaire** — le selector reste pleinement éditable dans le formulaire classique |
| **4** | Bundle `.escapegame` + export Web ZIP + audio joueur | **Livré** — voir [ARCHITECTURE.md](./ARCHITECTURE.md) |

**Suite prioritaire (produit)** : voir [README.md](../README.md) — affinage **Chemin A** (ergonomie bundle, jeux multi-fichiers), **Chemin B** : **React Flow** ou équivalent si refonte graphe un jour.

Heuristiques de layout avancées (auto-layout graphique) : hors périmètre immédiat.

---

## 5. Synthèse

| Thème | Décision |
|--------|----------|
| Source de vérité | **JSON V2** + DOM formulaire ; graphe = **vue** + navigation |
| Anciennes sauvegardes | Chargement possible via normalisation **legacy V1** ; nouvelles sauvegardes en **V2** |
| Graphe | **Drawflow** (vanilla) ; **React Flow** = objectif long terme si stack évolue |
| Documentation vivante | **ARCHITECTURE.md** (détail technique), ce fichier (intention & planning) |
