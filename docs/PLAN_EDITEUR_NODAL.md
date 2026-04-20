# Plan — Éditeur nodal & schéma projet unifié

Document de **référence** pour l’architecture **hybride actuelle** (graphe Drawflow + formulaire classique), le **schéma JSON V2**, et la **vision long terme** d’un éditeur **full nodal** (React Flow ou équivalent). Il complète [ARCHITECTURE.md](./ARCHITECTURE.md) sur les choix de conception.

**Statut (printemps 2026)** : les chantiers **données V2**, **panneau latéral**, **carte Drawflow** (vues multiples, narration), **bundle éditeur `.escapegame`**, **export ZIP hébergement Web** (`exportGameWebZip`), **réglages audio côté joueur** (HUD + `localStorage`), **brouillon éditeur IndexedDB** et **sauvegarde progression joueur** (`playerSaveMode`, IndexedDB + export manuel) sont **livrés**. Les sections **5 à 9** décrivent une **cible produit** et une **planification** à affiner **avant** tout chantier React majeur ; rien n’y est engagé au calendrier. L’**intention pédagogique** (publics, Scratch / LEGO, risque spaghetti, graphe comme entrée principale) est développée dans **[PLAN_NODAL_PEDAGOGIE.md](./PLAN_NODAL_PEDAGOGIE.md)**.

**Versioning** : le dépôt reste présenté en **bêta** ; les sauvegardes récentes incluent **`schemaVersion: 2`**. Le terme **schéma projet v2** désigne ce format, distinct des brouillons historiques de développement.

**Rétrocompatibilité** : `EditorCore` détecte les fichiers **legacy V1** (sans `schemaVersion`) et les normalise en mémoire ; l’objectif produit est toutefois d’**enregistrer** exclusivement du V2.

---

## 1. Objectifs (atteints ou en cours)

1. **Une seule notion d’« action »** dans les données : même structure pour un clic **hotspot** ou un **choix** dans un menu selector (y compris imbrication `nested`).
2. **Options transverses** (`sfx`, `visibility`) au même endroit pour tous les déclencheurs, sans duplication entre formulaire hotspot et cartes de choix.
3. **UI hybride** : **carte** (Drawflow) pour la cartographie et la navigation ; **panneau latéral** pour l’édition détaillée, **sans dupliquer** la logique métier (réutilisation des blocs DOM existants).
4. **Graphe enrichi (partiel)** : scènes, hotspots et transitions vers d’autres scènes ; filtres (ex. mode **narration**). Extension future : nœuds selector explicites si le besoin pédagogique le justifie.

Références : [ARCHITECTURE.md](./ARCHITECTURE.md), [SELECTOR_SPEC.md](./SELECTOR_SPEC.md), [xflow/README.md](../xflow/README.md), [xflow/draw/project-graph.js](../xflow/draw/project-graph.js).

### Couche headless — `EditorCore`

- **Fichier** : [`js/editor-core.js`](../js/editor-core.js) — aucun accès `document` / Drawflow ; exposé sur `window.EditorCore`.
- **Rôle** : `SCHEMA_VERSION`, projet vide, **action unifiée** par défaut, normalisation **payload** (dont **`payload.copy`** pour les textes, **`{ url, volume }`** pour l’audio), parse JSON avec branche **`legacyV1`**.
- **Adaptateurs** : `editeur-app.js` / `editor-en-app.js` lisent et écrivent le DOM ; `getCurrentProjectData()` / `loadProject` s’alignent sur le V2. La carte appelle `getCurrentProjectData()` et synchronise le panneau sur le DOM réel.

### Migration React Flow (Chemin B — long terme)

Deux niveaux d’ambition (à distinguer explicitement dans les décisions futures) :

1. **Chemin B1 — remplacement moteur de graphe** : React Flow **remplace Drawflow** pour la **carte** (navigation, vues, panneau latéral possible en réutilisant le DOM formulaire comme aujourd’hui). **`EditorCore`** et le **JSON V2** restent la source de vérité sérialisée ; le graphe est surtout une **vue** + sélection.

2. **Chemin B2 — édition full nodal** (vision cible produit, voir §6) : le graphe devient aussi le **lieu principal d’édition** (ajout de scènes / hotspots par nœuds et liens, paramètres exprimés par des nœuds « primitifs » réutilisables, sous-graphes par scène, etc.). Le JSON V2 reste au minimum le **contrat d’export** vers le joueur ; la **représentation interne** peut, si besoin, évoluer vers un **graphe de projet** compilé ou normalisé vers V2 (voir §8).

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

## 4. Phases de réalisation (état livré aujourd’hui)

| Phase | Contenu | État |
|-------|---------|------|
| **1** | Schéma V2, `EditorCore`, save/load, génération, refactor actions | **Livré** |
| **2** | Panneau latéral Drawflow + déplacement DOM + vues carte | **Livré** |
| **3** | Nœuds selector « câblés » dans Drawflow (multi-sorties dédiées) | **Non prioritaire** — le selector reste pleinement éditable dans le formulaire classique |
| **4** | Bundle `.escapegame` + export Web ZIP + audio joueur | **Livré** — voir [ARCHITECTURE.md](./ARCHITECTURE.md) |

Les **jalons Chemin B** (React / full nodal) sont décrits au **§9** ; ils ne remplacent pas la feuille de route **Chemin A** du [README.md](../README.md) (polish, bundle, diffusion).

Heuristiques de layout avancées (auto-layout graphique) : pertinent surtout une fois un moteur type **React Flow** en place ; reste hors périmètre Drawflow actuel.

---

## 5. Limites de Drawflow et rôle du panneau latéral

Drawflow a permis une **carte** utile (parcours, vues focus / complète / arbre, filtre narration) sans réécrire tout l’éditeur. En revanche, il **ne convient pas** à une vision **full nodal** :

- Modèle surtout **scène + nœuds plats** ; peu adapté aux **sous-graphes** (selector imbriqué, « scène comme îlot » relié au reste).
- **Peu expressif** pour des **liens sémantiques** riches (condition sur objet, volume branché sur une valeur, même primitive réutilisée pour des rôles différents).
- **Pas de graphe de données** : difficile de représenter proprement « ce slider alimente le volume de **ce** clip » vs « le même type de nœud alimente l’opacité d’un autre paramètre ».

D’où le **panneau latéral** : il compense en **réinjectant** le formulaire HTML existant (Quill, champs complexes) dans un contexte « carte ». C’est un **pont pédagogique et technique**, pas la forme finale si l’on veut **tout** éditer dans le graphe.

**React Flow** (entre autres) offre plutôt : nœuds React arbitraires, **groupes / sous-flots**, edges typés, interactions de **drag & drop** et de **connexion** — de quoi **planifier** une UI nodale sérieuse, à condition d’investir dans la **taxonomie des nœuds** et la **lisibilité** (voir [PLAN_NODAL_PEDAGOGIE.md](./PLAN_NODAL_PEDAGOGIE.md)).

---

## 6. Vision cible — édition full nodal

Objectif exprimé pour **l’horizon long terme** : une interface où **presque tout** est un **nœud** et une **liaison** lisible, tout en restant **pédagogique** — intentions et garde-fous : [PLAN_NODAL_PEDAGOGIE.md](./PLAN_NODAL_PEDAGOGIE.md).

### 6.1 Construction du jeu dans le graphe

- **Scènes** : ajout par bouton ou par **glisser-déposer** (patron « nouvelle scène »).
- **Hotspots** : création dans une scène ; **placement 360** peut rester une **vue satellite** (aperçu **Pannellum** lié au nœud hotspot), ou intégration progressive dans l’UI nodale.
- **Liens hotspot → scène** : arêtes de type « transition » / « aller à la scène » ; le joueur exporté reste basé sur le **modèle V2** actuel (actions `scene`, etc.).
- **Même logique hotspot reliée à plusieurs scènes** : règle produit à trancher au planning — **duplication par scène** (instances distinctes, même « gabarit » éventuellement synchronisé) est souvent la plus simple pour l’export **liste de hotspots par scène** du JSON actuel ; une alternative serait un nœud « définition » + nœuds « instance », avec compilation vers des hotspots dupliqués en V2.

### 6.2 Nœuds « ressources » et « primitifs »

- Exemple discuté : un nœud **son** (référence média) + nœud **slider 0–1** relié à son **volume** ; le même type **slider** pourrait, dans un autre contexte, piloter un autre paramètre (avec **libellés et ports** clairs côté produit pour éviter l’absurde visuel type « opacité popup branchée au hasard »).
- Objectif : **réutiliser des primitives** (slider, couleur, bool, texte riche dans un nœud ou panneau d’inspecteur) avec des **rôles** et des **connexions** explicites, pour que le graphe **enseigne** les dépendances (audio, visibilité, conditions).

### 6.3 Selectors et imbrication

- Représenter un **selector** comme un **sous-graphe** (nœud menu, choix comme sorties ou sous-nœuds), aligné sur [SELECTOR_SPEC.md](./SELECTOR_SPEC.md) côté données.
- Lien avec la **pédagogie** : voir un **arbre de choix** dans l’espace, pas seulement du JSON ou une liste de cartes — voir [PLAN_NODAL_PEDAGOGIE.md](./PLAN_NODAL_PEDAGOGIE.md).

### 6.4 Scènes comme espaces fermés

- Idée : **conteneur** « scène » (groupe React Flow) avec hotspots et liens **internes** ; **ports** sur la frontière pour « sortir » vers une autre scène ou une logique globale.
- Utile pour **raisonner par chambre / lieu** et réduire le bruit sur le graphe global ; à valider en prototype (lisibilité vs zoom constant).

---

## 7. Pédagogie (document dédié)

Les objectifs **publics EPN / jeunes**, l’hypothèse « **graphe plus intuitif** qu’un long formulaire », les références **Scratch / LEGO**, le risque **spaghetti** et les **leviers de lisibilité** sont traités dans **[PLAN_NODAL_PEDAGOGIE.md](./PLAN_NODAL_PEDAGOGIE.md)** pour ne pas alourdir ce fichier technique.

---

## 8. Données — JSON V2, graphe interne, export joueur

- **Aujourd’hui** : vérité = **DOM formulaire** + sérialisation **`getCurrentProjectData()`** → **JSON V2** ; le joueur est généré depuis ce JSON.
- **Demain (B1)** : inchangé côté fichier ; React Flow lit/écrit surtout via les **mêmes** chemins (adaptation minimale).
- **Demain (B2)** : options à étudier avant code :
  - **A)** Graphe interne + **compilation** systématique vers V2 à l’export (et éventuellement au save) — le fichier reste **V2** pour rétrocompat et simplicité joueur.
  - **B)** Extension du schéma (V3) incluant une **couche graphe** — plus lourd pour migration et générateur ; à n’envisager que si V2 s’avère trop limitant pour représenter fidèlement l’édition nodale.

Dans tous les cas, **`EditorCore`** (normalisation, defaults, règles métier) reste le **socle** ; les adaptateurs (DOM, React Flow) s’y branchent.

**Duplication** (hotspot multi-scènes, instances) : quelle que soit l’UI, le **runtime joueur** actuel attend des **hotspots par scène** ; la compilation doit garantir cette forme.

---

## 9. Jalons de migration (planification — à affiner avant développement)

**Branche dédiée, `main` stable, où placer Vite / le bundle** : voir **[PLAN_REACT_INTEGRATION.md](./PLAN_REACT_INTEGRATION.md)**.

Ordre **indicatif** ; chaque jalon peut faire l’objet d’un spike ou d’une PR dédiée. Rien n’est figé au calendrier.

| Jalon | But | Réduit le risque |
|-------|-----|------------------|
| **B0 — Spike** | Petite app React Flow embarquée (build Vite), graphe **lecture seule** depuis `getCurrentProjectData()`, sélection → focus liste / scroll | Chaîne outillage + intégration HTML racine |
| **B1 — Parité navigation** | Remplacer Drawflow par React Flow **sans** édition nodale des actions : mêmes vues métier que la carte actuelle + panneau DOM | Régression maîtrisée |
| **B2 — Édition structurelle dans le graphe** | Ajout / suppression scène, liens de transition évidents, création hotspot « squelette » | Valider UX médiateur |
| **B3 — Sous-graphes** | Scène = groupe ; selector = sous-flot | Alignement [pédagogie](./PLAN_NODAL_PEDAGOGIE.md) / SELECTOR_SPEC |
| **B4 — Primitifs & ressources** | Sliders, médias, ports typés ; règles de duplication instance | Cohérence export V2 |
| **B5 — Richesse texte / Quill** | Décision inspecteur vs nœud « document » | Performance et habitudes utilisateurs |

Entre deux jalons, des **pauses** (polish Chemin A, tests solo) restent **cohérentes** avec une équipe réduite.

---

## 10. Synthèse

| Thème | Décision actuelle | Direction documentée |
|--------|-------------------|----------------------|
| Source de vérité | **JSON V2** + DOM formulaire ; graphe Drawflow = **vue** + navigation | **B1** : idem + React Flow. **B2** : graphe comme éditeur principal, avec compilation / adaptateurs vers V2 (§8). |
| Panneau latéral | Compense les **limites Drawflow** en réutilisant le formulaire | Peut évoluer en **inspecteur** (texte riche, champs longs) même en full nodal — [PLAN_NODAL_PEDAGOGIE](./PLAN_NODAL_PEDAGOGIE.md). |
| Anciennes sauvegardes | Chargement **legacy V1** ; enregistrement **V2** | Inchangé tant que le fichier projet reste V2 (ou V3 seulement si décision explicite). |
| Graphe | **Drawflow** (vanilla) | **React Flow** (ou équivalent) pour **B1** puis, si validé, **B2**. |
| Documentation | **ARCHITECTURE.md** (technique), ce fichier (intention & planning), [PLAN_NODAL_PEDAGOGIE](./PLAN_NODAL_PEDAGOGIE.md) (pédagogie & intention produit) | Mettre à jour **ARCHITECTURE** (diagrammes) quand **B0** démarre. |
