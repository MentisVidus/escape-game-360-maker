# Plan — Éditeur nodal & schéma projet unifié

Document de **feuille de route** pour passer du visualiseur de graphe (`xflow/` + Drawflow) à un **éditeur hybride** (graphe + formulaire), et pour **unifier** le modèle des actions (hotspot classique vs choix de selector).

**Statut** : plan validé ; implémentation par phases (voir §4).  
**Versioning** : ce plan n’est pas lié à un numéro marketing (le dépôt est en **bêta** sans semver). On parle de **schéma projet v2** pour désigner le **nouveau format JSON** cible, distinct des fichiers historiques de développement.

**Rétrocompatibilité** : **non requise** pour les anciens `.json` de test / PoC. L’objectif est la **meilleure architecture** pour la suite de l’outil ; les sauvegardes générées après migration suivront exclusivement le schéma v2 (ou version de schéma explicite dans le fichier).

---

## 1. Objectifs

1. **Une seule notion d’« Action »** dans le code et dans les données : même structure pour une action déclenchée par un **clic hotspot** (msg, scène, pick, etc.) ou par un **choix** dans un menu selector (y compris sous-menus).
2. **Options transverses** (SFX, conditions de visibilité, etc.) **au même endroit** pour tous les déclencheurs, sans duplication de logique entre `updateHsFields` et le formulaire des choix.
3. **UI hybride** : vue graphe pour la **cartographie** et la **navigation** ; **panneau latéral** pour l’édition détaillée (textes, coordonnées, URLs) sans tout faire par câbles.
4. **Graphe enrichi** : représenter les **selectors** (nœuds multi-sorties ou équivalent) une fois le modèle de données stabilisé.

Références code actuel : [ARCHITECTURE.md](./ARCHITECTURE.md), [SELECTOR_SPEC.md](./SELECTOR_SPEC.md), dossier [xflow/](../xflow/).

### Couche headless — `EditorCore` (UI-agnostique)

- **Fichier** : [`js/editor-core.js`](../js/editor-core.js) — aucun accès `document` / Drawflow ; exposé sur `window.EditorCore`.
- **Rôle** : constante `SCHEMA_VERSION`, fabrique de projet vide, **action unifiée** par défaut (`createDefaultAction`), sérialisation / parse JSON avec détection `legacyV1` (fichiers sans `schemaVersion`).
- **Adaptateurs** (à enrichir) : `editeur-app.js` / `editor-en-app.js` lisent et écrivent le DOM ; ils appellent `EditorCore` pour construire ou consommer le modèle. **Drawflow** (`xflow/project-graph.js`) continue de consommer un objet projet obtenu via `getCurrentProjectData()` jusqu’à ce que ce dernier s’appuie sur le v2.
- **Migration React Flow** : remplacer uniquement les adaptateurs « graphe » ; le même `EditorCore` reste la source de vérité logique.

---

## 2. Schéma JSON cible (schéma projet v2)

Le détail exact peut évoluer en implémentation ; l’intention est :

- **`schemaVersion`** (entier, ex. `2`) en tête de fichier pour les futurs outils / migrations.
- **Scène** : identifiant stable, titre, médias (image 360, ambiance), liste de **hotspots**.
- **Hotspot** : géométrie / apparence (pitch, yaw, CSS ou bloc `appearance` structuré), puis **déclencheur** :
  - soit une **action unique** (équivalent des types `msg`, `scene`, `pick`, `req`, `pwd` aujourd’hui) ;
  - soit un **selector** : titre, intro, mode d’affichage, **liste de choix**.

**Action unifiée** (même objet pour « hotspot simple » et pour chaque entrée de `choices[]`) — exemple conceptuel :

```json
{
  "type": "msg",
  "payload": {
    "html": "..."
  },
  "sfx": {
    "url": "",
    "volume": 0.8
  },
  "visibility": {
    "requiresItem": "",
    "hiddenIfHasItem": ""
  }
}
```

Autres `type` : `scene`, `pick`, `req`, `pwd`, `selector` (avec `nested` pour sous-menu, aligné sur la sémantique actuelle du jeu).

**Choix selector** : chaque élément de `choices` contient au minimum `id`, `label`, et le même objet **`action`** (récursion pour `type: "selector"` + `nested`).

**Principes** :

- Un seul **parseur / validateur** d’`action` côté éditeur et un seul chemin de **génération** vers le format attendu par le **template joueur** (éventuellement avec une couche fine d’adaptation si le runtime garde des noms historiques en interne).
- Les champs globaux du jeu (inventaire, popups, audio global, etc.) restent au **niveau racine** du projet, comme aujourd’hui, mais peuvent être renommés / regroupés si ça clarifie le fichier.

---

## 3. Comportement attendu — panneau latéral (futur)

Lorsque la modale **Carte** / graphe Drawflow est ouverte (ou un panneau docké équivalent) :

| Sélection | Contenu du panneau |
|-----------|-------------------|
| **Nœud Scène** | Champs alignés sur l’éditeur classique : identifiant / titre, URL image 360, URL audio d’ambiance (et tout champ métier associé). |
| **Nœud Hotspot** | Pitch, yaw, bouton **placement 360** (réutilisation de la logique `openPicker` / équivalent), apparence si pertinent, puis **édition de l’action unifiée** (type + payload + SFX + visibilité). |
| **Nœud Selector** (phase 3) | Titre, intro, mode liste/boutons ; liste des choix avec la même **action unifiée** par ligne (ou lien vers sous-éditeur). |
| **Nœud Renvoi** (vue acyclique) | Lecture seule ou lien « ouvrir la scène cible » ; pas d’édition de données métier sur l’alias. |

**Règles UX** :

- Éditer dans le panneau **met à jour** la source de vérité (DOM synchronisé ou modèle intermédiaire commun avec le formulaire principal).
- Pas d’obligation d’éditer les longs textes en tirant des câbles : le graphe sert surtout à la **structure** et à la **navigation**.

---

## 4. Ordre des chantiers (validé)

1. **Refactorisation JS + schéma projet v2** *(démarré : noyau `EditorCore` ; suite : migration DOM + save/load + generate)*  
   - Introduire `schemaVersion` et le nouveau modèle **action unifiée** (hotspots + choix selector).  
   - Refactoriser `saveProject` / `loadProject` / `extractHotspotData` / sérialisation des choix / `generateGame` pour ce schéma.  
   - Factoriser la logique d’édition des actions (descripteurs de champs, sérialisation) pour un seul pipeline « type d’action → champs → JSON ».

2. **Panneau latéral**  
   - Branché sur `nodeSelected` (Drawflow), remplissant le panneau depuis les données courantes et écrivant vers le même modèle que l’éditeur ligne par ligne.  
   - Commencer par **Scène** + **Hotspot** (sans selector dans le graphe si besoin), puis étendre quand les nœuds selector existent.

3. **Nœuds selector dans Drawflow**  
   - Représentation : nœud **multi-sorties** (une sortie par choix menant à une scène ou à une sous-branche), ou variante documentée dans [xflow/README.md](../xflow/README.md).  
   - Connexions lecture / future édition alignées sur le schéma v2.

Les heuristiques de layout (ex. barycentre dans la vue complète) restent **hors périmètre** prioritaire (voir discussions dans l’historique du projet).

---

## 5. Synthèse

| Thème | Décision |
|--------|----------|
| Nom de version produit | Pas de « v5 » ; référence **bêta** + **schéma projet v2**. |
| Anciennes sauvegardes | Pas de garantie de chargement ; migration manuelle ou reprise dans l’éditeur si besoin ponctuel. |
| Ordre de travail | **1** Données + JS unifié → **2** Panneau latéral → **3** Graphe selector. |

Prochaine session : démarrer le **chantier 1** (schéma v2 + refactor actions dans le JS FR/EN et génération).
