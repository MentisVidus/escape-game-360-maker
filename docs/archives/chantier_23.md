# Chantier C23 — Persistance bundle médias (audio + image)

**Branche** : `feat/c23-bundle-audio-image` (depuis `feat/nodal-map`).
**Date d'ouverture** : 2026-05-17.
**Date de clôture** : 2026-05-17.
**Version de clôture** : 1.12.

---

## Annexe D — Chantier C23 (archivé)

> **Archivé** (clôture v1.12, 2026-05-17) — journal de décisions, plans
> détaillés, traces d'audit. Synthèse produit : **Annexe B — C23** dans
> `NODAL_MAP_SPEC.mdc`.

**Date d'ouverture** : 2026-05-17.
**Branche** : `feat/c23-bundle-audio-image` (depuis `feat/nodal-map`).
**Statut** : cadrage validé en phase questions (Q-C23-1 à Q-C23-8,
2026-05-17). **Plan détaillé C23.1 (audit doc-only) rédigé** — prêt à
être livré à Cursor. Plans C23.2 et C23.3 en **squelette** — à
affiner post-audit C23.1.

### Scope figé

Synthèse des décisions issues de la phase questions (Claude ↔ user,
2026-05-17) :

- **Bug d'origine** : pendant le smoke C19.1 (2026-05-14), test
  save/reload d'un projet avec 3 mp3 bundle local (1 global, 1
  ambient `media-audio` enfant scène, 1 SFX `media-audio` enfant
  hotspot). Résultats :
  - Sur `2294253` (post-merge C18, AVANT C19) : **0/3** dans le
    `.escapegame` exporté.
  - Sur `2d15e05` (C19.1 livré) : **1/3** (le SFX, grâce à la
    projection `actionSfxProjection.ts` câblée par C19.1).
  - Au reload : même le SFX embarqué ne se reconnecte pas au nœud
    `media-audio` source (blob disconnect).
  - Bug latent **pré-C18** révélé par les tests audio systématiques
    C19.
- **Scope étendu aux médias image local** (Q-C23-1 a, demande
  utilisateur) — audit obligatoire de **tous les emplacements
  image** :
  - Panoramas scène (`scene.panoramaUrl` blob:).
  - Hotspot images (visuel custom — à identifier dans `appearance`
    ou ailleurs).
  - Inventaire icône (`meta.settings.inventoryGlobal.iconUrl` ou
    similaire).
  - End-screens images (Game Over / Victory backgrounds).
  - Si certains emplacements fonctionnent déjà → documenter et
    continuer ; si bugués → corriger dans le scope C23.
- **Approche projection sérialisation symétrique à C19.1** (Q-C23-2 a)
  — créer des helpers miroir de `actionSfxProjection.ts` :
  - `sceneAmbianceProjection.ts` (`resolveLinkedMediaAudioForScene`)
    — résout l'edge `meta` scène→media-audio, alimente
    `scene.media.ambiance` dans `toProjectJson`.
  - Projection global : audit obligatoire pour savoir si
    `meta.settings.audio.url` est déjà projeté ou s'il faut un
    chemin similaire.
  - Projection image : selon résultat audit, créer des helpers
    similaires ou un mécanisme de collecte directe si pas de
    "cible projection" naturelle (bascule locale (c) du Q-C23-2).
- **Reconnexion blob via pont vers legacy** (Q-C23-3 a, garde-fou
  user) — **consommer uniquement la Map JS pure**
  `bundleAssetPathBlobs` du legacy, **sans toucher au DOM**. La règle
  « nodal React = source de vérité » est **préservée** : le pont est
  un simple effet React qui lit cette Map au load et appelle
  `updateNodeData(nodeId, { url: blobUrl })` pour reconnecter les
  nœuds `media-*` du store.
  - **Audit obligatoire C23.1** : vérifier que `bundleAssetPathBlobs`
    est bien une Map JS pure dans `editor-shared-bundle.js`
    (probable) — pas une dépendance DOM. Si dépendance DOM →
    bascule vers mécanisme React parallèle (Q-C23-3 b).
- **Découpage 3 sous-chantiers** (Q-C23-4 a) — audit, projection,
  reconnexion (cf. § Stratégie de découpage). Pas de séparation
  audio/image — le mécanisme bundle est partagé.
- **Tests round-trip mixte** (Q-C23-5 c) — tests dédiés `c23_*` pour
  traçabilité + extension des fixtures roundtrip existants pour
  protection long terme.
- **Convention path `./assets/...`** (Q-C23-6, à trancher en audit
  C23.1) :
  - Actuel probable : `./assets/<filename>` (cf. note `editor-shared-
    bundle.js:38` `if (t.startsWith("./assets/")) return t;`).
  - Cible idéale user : `./assets/<type>/<sous-type>/<filename>` avec
    organisation par type :
    - `./assets/image360/<filename>` (panoramas scène)
    - `./assets/audio/global/<filename>`
    - `./assets/audio/ambiance/<filename>`
    - `./assets/audio/sfx/<filename>`
    - `./assets/icone/inventaire/<filename>`
    - `./assets/icone/objet/<filename>`
    - `./assets/icone/hotspot/<filename>`
    - `./assets/end-screens/<filename>` (Game Over / Victory bg)
    - `./assets/orphelin/<mediaNodeId>/<filename>` (Q-C23-8 user)
  - **Rétrocompat path** : §0.2-6 dit "pas de rétrocompat" sauf
    `project.json` schemaVersion 2 (intangible). Le path bundle
    n'est pas dans schemaVersion 2 → on peut casser. Mais cela
    affecte les `.escapegame` archivés existants qui contiendraient
    l'ancienne convention. **Audit C23.1** doit identifier si des
    `.escapegame` existants sont en circulation et trancher : (i)
    casser proprement (et signaler aux utilisateurs) ; (ii) compat
    lecture (détecter ancienne convention, remapper au load) ; (iii)
    migration au load. Vote claude initial : (ii) compat lecture
    (charge bidirectionnelle au load, write toujours en nouvelle
    convention) si peu d'effort, sinon (i).
- **Médias orphelins** (Q-C23-8 user) — nœuds `media-*` non rattachés
  (sans edge `meta` vers un parent) doivent :
  - Être **sauvegardés quand même** dans le bundle (ne pas perdre
    les uploads utilisateur).
  - Path : `./assets/orphelin/<mediaNodeId>/<filename>`.
  - **Warning UI** pour prévenir l'utilisateur (probablement
    extension du panel §6 warnings — `MEDIA_ORPHANED` ou similaire,
    à cadrer en C23.3).
- **URLs externes hors scope** (Q-C23-7) — médias référencés par
  `https://...`, `data:...` ne passent pas par le bundle (déjà
  hébergés). Le scope C23 = uniquement les blob: et `./assets/...`.
  Aucune régression sur les URL externes.

### Stratégie de découpage

| # | Périmètre | Dépend de | Type | Statut |
|---|-----------|-----------|------|--------|
| **C23.1** | **Audit complet doc-only** du flux save/load des médias bundle local (audio + image). Rapport tableau dans Annexe D § Journal de chantier : pour chaque emplacement (audio global / ambient / sfx, image panorama / hotspot / inventaire / end-screens, médias orphelins), tracer (i) projection JSON, (ii) embarquement asset, (iii) reconnexion blob au load. Identifier `bundleAssetPathBlobs` (Map JS pure ou dépendance DOM). Trancher convention path actuelle. Identifier impact rétrocompat. Recommandations pour découpage final C23.2 et C23.3 | — | doc | **livré** (2026-05-17, voir Journal) |
| **C23.2** | **Projection sérialisation** + **walker bundle** : helpers (`sceneAmbianceProjection`, `scenePanoramaProjection`, hotspot `ui_img` dans JSON ou walker layout), extension `eachPortableMediaUrlInProject` / `rewritePortableUrlsInProjectClone` (`meta.settings.*`, `scene.media.*`, orphelins via scan layout). Paths write-only `./assets/<type>/…`. Tests `c23_2_*` round-trip JSON | C23.1 | code | **livré** (2026-05-17) |
| **C23.3** | **Reconnexion blob** : `getBundleAssetPathBlobs()`, réécriture URLs `map-layout.json` au load, pont post-`hydrateFromBundle` (médias `media-*` + champs hors nœud : `meta.settings.audio`, `inventoryGlobal.icon`, `inventoryObjects`, `nodalAutoSatelliteData` ui_img). Warning `MEDIA_ORPHANED`. Pas de compat lecture path (sauf arbitrage user Q-C23.1-4). Tests `c23_3_*` + fixtures roundtrip | C23.2 | code | **livré** (2026-05-17) |

Convention : un commit par sous-chantier ; fixes numérotés
`C23.x.y-fix` si correctifs en cours de chantier (cf. §8.2 + §2.2 du
briefing CLAUDE.md). C23.2 et C23.3 sont **dépendants** de C23.1 —
l'audit informera leur cadrage final (plans détaillés affinés
post-audit, ajout au journal Annexe D avant livraison C23.2).

### Décisions de design

- **Helpers projection symétriques à C19.1** :
  - `xflow/react/src/model/sceneAmbianceProjection.ts` —
    `resolveLinkedMediaAudioForScene(state, sceneId): { url, volume }
    | null`. Logique : parcourt `state.edges` pour trouver l'edge
    `meta` source = sceneId, target = `media-audio` ; lit url+volume
    avec clamping 0-1. Miroir de `actionSfxProjection.ts` livré
    C19.1.
  - Projection global : à auditer si nécessaire (peut-être déjà
    projeté correctement).
  - Projections image : selon audit. Si helpers nécessaires, suivre
    le même pattern (un fichier helper par emplacement).
- **Pont React → `bundleAssetPathBlobs`** :
  - Effet React au load `.escapegame` (probablement dans le store
    ou un hook post-`fromProjectJson`) qui lit la Map JS
    `window.bundleAssetPathBlobs` (ou équivalent accessible) et,
    pour chaque entrée matching un nœud `media-*` du store, appelle
    `updateNodeData(nodeId, { url: blobUrl })`.
  - **Pas d'accès au DOM** : on lit une Map JS pure, on appelle des
    actions du store. La règle nodal React = source de vérité est
    préservée.
  - À tester en audit : la Map `bundleAssetPathBlobs` est-elle
    accessible depuis React (variable globale, export module, ou
    paramètre passé à une fonction d'init) ? Si non accessible
    proprement → pont via un événement custom (le legacy émet, React
    consomme) ou une convention d'export module.
- **Nouvelle convention path par type** :
  - Helper `getAssetPath(node: MediaNode, parentInfo): string` qui
    retourne le path canonique selon le type + sous-type.
  - Mapping :
    - `scene.panoramaUrl` blob: → `./assets/image360/<filename>`
    - `media-audio` enfant scène → `./assets/audio/ambiance/<filename>`
    - `media-audio` enfant action (hotspot/choice) →
      `./assets/audio/sfx/<filename>`
    - `meta.settings.audio.url` blob: → `./assets/audio/global/<filename>`
    - `meta.settings.inventoryGlobal.iconUrl` blob: →
      `./assets/icone/inventaire/<filename>`
    - hotspot image (selon audit où c'est stocké) →
      `./assets/icone/hotspot/<filename>`
    - end-screens images → `./assets/end-screens/<filename>`
    - médias orphelins → `./assets/orphelin/<mediaNodeId>/<filename>`
- **Rétrocompat lecture** (si décidée en audit) :
  - Au load, accepter à la fois l'ancienne convention
    `./assets/<filename>` et la nouvelle `./assets/<type>/.../<filename>`.
  - Au save, toujours en nouvelle convention.
  - Effet de bord : 2 entrées dans le bundle pendant la transition,
    mais le projet une fois re-sauvegardé est en nouvelle convention
    pure.
- **Warning médias orphelins** :
  - Extension du panel warnings §6 : nouveau type `MEDIA_ORPHANED`
    (ou similaire) listant les nœuds `media-*` sans edge `meta`.
  - Texte : « Média non rattaché : "<filename>" — il sera sauvegardé
    dans `./assets/orphelin/` mais n'apparaîtra pas dans le jeu. »
  - Pas bloquant — juste informatif.

### Plan détaillé C23.1 — directives pour Cursor

**Pré-requis** : C19 livré (C19.1 + C19.2 inclus). C23 cadrage validé
(Annexe D ouverte). Branche `feat/c23-bundle-audio-image` créée
depuis `feat/nodal-map`.

**Contexte** : audit doc-only du flux complet save/load des médias
bundle local (audio + image), pour identifier précisément ce qui est
cassé / ce qui fonctionne, et informer le découpage final C23.2 et
C23.3. Aucune modification de code dans cette étape — uniquement
documentation dans l'Annexe D § Journal de chantier.

**Fichiers à lire avant d'auditer** :

- `js/editor-shared-bundle.js` — mécanisme bundle legacy : collecte
  URLs, `bundleAssets`, `bundleAssetPathBlobs`, normalisation path
  `./assets/`, `pickLocalMediaFromBundle`, sauvegarde/reload des
  assets. Comprendre intégralement.
- `js/editor-shared-project-serialization.js` — sérialisation côté
  legacy (collecte des URLs à embarquer dans le bundle).
- `xflow/react/src/serialize/toProjectJson.ts` — projection React →
  JSON. Identifier ce qui est projeté pour chaque emplacement
  (audio global, ambient, sfx déjà câblé C19.1, image panorama,
  image hotspot, image inventaire, image end-screens).
- `xflow/react/src/serialize/fromProjectJson.ts` — hydrate JSON →
  store. Identifier comment les URLs `./assets/...` ou blob: sont
  traitées au load.
- `xflow/react/src/view/components/MediaUploadButton.tsx` —
  `pickLocalMediaFromBundle` entry point côté React. Comprendre le
  flux upload local.
- `xflow/react/src/model/actionSfxProjection.ts` — référence C19.1
  (modèle pour helpers similaires C23.2).
- `xflow/react/src/view/playerPreview/playerPreviewAudio.ts` —
  `resolveSceneAmbiance` (pattern à reproduire pour la projection
  `sceneAmbianceProjection`).
- `xflow/react/src/model/nodes.ts` — types `MediaNode`, `SceneNode`,
  `ActionNode` (champs URL relevants).
- `xflow/react/src/model/project.ts` — `ProjectSettings`,
  `meta.settings.audio`, `meta.settings.inventoryGlobal`, etc.

**Phase questions (workflow §8.1)** — Cursor doit poser ses propres
questions avant de produire le rapport, par exemple :

- **Q-C23.1-1** — Pour les images : où exactement sont stockés les
  visuels custom de hotspot ? `appearance.iconUrl` ou ailleurs ?
- **Q-C23.1-2** — `bundleAssetPathBlobs` est-il accessible depuis
  React ? Variable globale `window.bundleAssetPathBlobs`, export
  module, ou autre ?
- **Q-C23.1-3** — La sérialisation legacy
  (`editor-shared-project-serialization.js`) est-elle encore active
  pour produire le bundle, ou tout passe par le `toProjectJson`
  React ? (Important pour savoir où ajouter la projection.)
- **Q-C23.1-4** — Y a-t-il déjà des `.escapegame` archivés en
  circulation avec l'ancienne convention path ? (Impact rétrocompat
  — si oui, compat lecture nécessaire ; si non, casser proprement.)

Attendre validation user avant de produire le rapport.

**Périmètre de l'audit** :

Pour chaque emplacement de média ci-dessous, tracer **3 étapes** :

| Étape | Description |
|---|---|
| (i) Projection JSON | Le chemin source (store React, edge `meta`, `meta.settings.*`, etc.) est-il bien projeté dans le JSON exporté (`scene.media.ambiance`, `meta.settings.audio.url`, `scene.panoramaUrl`, etc.) ? |
| (ii) Embarquement asset | L'URL blob: du JSON est-elle bien collectée et embarquée dans le `.escapegame` sous `./assets/...` ? Avec quel path canonique ? |
| (iii) Reconnexion au load | Au reload du `.escapegame`, l'URL `./assets/...` du JSON est-elle bien remplacée par une URL blob: réelle pointant vers le buffer embarqué, et est-ce que le nœud `media-*` du store React reflète cette URL blob: ? |

Emplacements à auditer :

- **Audio global** : `meta.settings.audio.url`.
- **Audio ambient** : nœud `media-audio` enfant scène via edge `meta`,
  projeté en `scene.media.ambiance`.
- **Audio SFX** : nœud `media-audio` enfant action via edge `meta`,
  projeté en `action.sfx` (déjà câblé C19.1 — confirmer (ii) et
  (iii) marchent).
- **Image panorama** : `scene.panoramaUrl`.
- **Image hotspot** : visuel custom — à identifier où c'est stocké
  (Q-C23.1-1).
- **Image inventaire icône** : `meta.settings.inventoryGlobal.iconUrl`
  ou équivalent.
- **Image end-screens** : Game Over / Victory backgrounds — à
  identifier la structure exacte.
- **Médias orphelins** : nœuds `media-*` sans edge `meta` — comment
  traités actuellement ?

**Points spécifiques à investiguer en plus** :

1. **`bundleAssetPathBlobs` Map** :
   - Type exact (Map JS pure, dictionnaire, autre) ?
   - Accessible depuis React (variable globale, export, événement) ?
   - Couplée au DOM ou indépendante ?
2. **Convention path actuelle** :
   - Le code construit-il les paths `./assets/<filename>` ou autre ?
   - Y a-t-il déjà des sous-dossiers `./assets/<type>/` ?
3. **Médias orphelins** :
   - Le bundle les inclut-il ? Sous quel nom ?
   - Y a-t-il un warning UI actuel ?
4. **Rétrocompat** :
   - Y a-t-il des `.escapegame` archivés (cf. `docs/temporaire/`,
     ou autres) qui utiliseraient l'ancienne convention ?
   - Si on adopte la nouvelle convention par type, faut-il une compat
     lecture ?

**Critères de fin** :

- Rapport d'audit complet dans Annexe D § Journal de chantier (entrée
  datée 2026-05-17 ou jour de livraison).
- Tableau structuré : une ligne par emplacement × 3 colonnes
  (projection / embarquement / reconnexion), avec statut ✅ OK / ❌
  cassé / ⚠ partiel + diagnostic court.
- Réponses aux 4 points spécifiques (Map, convention, orphelins,
  rétrocompat).
- **Recommandations explicites** pour le découpage final C23.2 et
  C23.3 (quelles projections créer en priorité, quel mécanisme de
  pont retenir pour la reconnexion, compat lecture ou pas, etc.).
- **Aucune modification de code source** (sauf éventuellement
  documentation inline d'observation `// TODO C23.2 / C23.3` si
  utile, à minimum).

**Branche / commit** :
- Branche : `feat/c23-bundle-audio-image` (existante).
- Commit : `docs(nodal): C23.1 audit complet flux save/load médias bundle local (audio + image)`.
- Push en `-u` (première poussée de la branche).

### Plan détaillé C23.2 — affiné post-audit C23.1

**Pré-requis** : C23.1 livré (Journal 2026-05-17).

**Contexte** : corriger (i) projections `project.json` nodal et (ii)
collecte ZIP — le walker legacy ne parcourt pas `meta.settings` ni
`map-layout.json` ; `saveProjectBundle` lit uniquement
`serializeForBundle().nodalProjectJson`.

**Livrables code** :

1. **Helpers projection** (miroir `actionSfxProjection.ts`) :
   - `sceneAmbianceProjection.ts` → alimente `scene.media.ambiance`
     (ou champ canonique aligné `EditorCore.normalizeSceneMedia`) dans
     `serializeToProjectJson`.
   - `scenePanoramaProjection.ts` (Q-C23.1-8 **B**) → si edge meta
     scène→`media-image`, projeter `data.url` dans `scene.panoramaUrl` ;
     sinon conserver `scene.panoramaUrl` direct.
   - Hotspot image : projeter `appearance.ui_img` dans le JSON exporté
     **ou** documenter extension walker layout (préférence audit :
     **projection dans `project.json`** via extension schéma hotspot
     / sidecar `meta` — à trancher en implémentation ; minimum :
     walker lit `map-layout` pour `nodalAutoSatelliteData.*.coords.appearance.ui_img`).
2. **Audio global** : pas de nœud `media-*` — projeter
   `meta.settings.audio` **et** alias legacy `globalMusic` dans le
   clone passé au walker (ou étendre le walker pour
   `meta.settings.audio.url`).
3. **Inventaire** : walker + rewrite pour
   `meta.settings.inventoryGlobal.icon` **et**
   `map-layout.inventoryObjects[].iconUrl` (icônes objet).
4. **`getAssetPath(mediaNode | context, parentInfo)`** — paths
   write-only Annexe D (`./assets/audio/global/`, `ambiance/`, `sfx/`,
   `image360/`, `icone/inventaire|objet|hotspot/`, `orphelin/<id>/`).
5. **`js/editor-shared-bundle.js`** — étendre
   `eachPortableMediaUrlInProject` + `rewritePortableUrlsInProjectClone`
   ; fonction **`collectOrphanMediaFromLayout(layout)`** (vote Q-C23.1-6
   **C**) appelée depuis `saveProjectBundle` en plus du `project.json`.
6. **`saveProjectBundle`** (`editeur-app.js` / `editor-en-app.js`) :
   passer `map-layout.json` (ou liste orphelins) à la collecte ;
   appliquer `getAssetPath` à l'écriture ZIP (sous-dossiers `assets/`).
7. Tests Vitest `c23_2_projection_*.test.ts` + extension walker (si
   testable en Node avec mocks).

**Critères de fin** : tableau C23.1 → colonnes (i) et (ii) en ✅ pour
tous les emplacements sauf N/A ; paths typés au save ; tests JSON verts.

**Commit** : `feat(nodal): C23.2 projection sérialisation médias
bundle (audio ambient/global + image selon audit) + tests round-trip
JSON`.

### Plan détaillé C23.3 — affiné post-audit C23.1

**Pré-requis** : C23.2 livré.

**Contexte** : (iii) reconnexion — aujourd'hui `rewriteLoadedProjectPathsToBlobUrls`
ne touche que le walker `project.json` ; **`map-layout.json` n'est pas
réécrit** (`nodalMedia`, `inventoryObjects`, `nodalAutoSatelliteData`
gardent `blob:` morts ou `./assets/` non résolus). Le pont ne doit pas
lire le DOM (Q-C23-3).

**Livrables code** :

1. **`EditorSharedBundle.getBundleAssetPathBlobs()`** (Q-C23.1-2 **b**)
   — wrapper sur la Map interne ; React n'utilise pas
   `window.bundleAssetPathBlobs` nu.
2. **`loadProject` ZIP** (`*-app.js`) : après `mapZipAssetsToEditorSession`,
   réécrire les URLs **`./assets/…`** → `blob:` dans **`map-layout.json`**
   (parcours `nodalMedia`, `inventoryObjects`, `nodalAutoSatelliteData`,
   champs texte du layout) **avant** `hydrateFromBundle`.
3. **Pont post-`hydrateFromBundle`** (hook store ou
   `nodalProjectStore.hydrateFromProject` fin de chaîne) :
   - Pour chaque nœud `media-*` : si `data.url` est `./assets/…`, remplacer
     par `URL.createObjectURL` depuis `getBundleAssetPathBlobs()` +
     enregistrer dans `bundleAssets` session.
   - **Hors nœud média** (obligatoire audit) : mettre à jour
     `meta.settings.audio.url`, `meta.settings.inventoryGlobal.icon`,
     `meta.objects[*].iconUrl`, satellites `appearance.ui_img` via
     la même Map (pas seulement `updateNodeData` sur `media-*`).
   - Utiliser `nodalMetaMediaLinks` / `nodalSceneMetaMediaLinks` pour
     corréler paths projetés ↔ nœuds.
4. **Warning `MEDIA_ORPHANED`** dans `computeWarnings.ts` + panel §6.
5. **Pas de compat lecture** path (vote audit Q-C23.1-4 **(i)**) — sauf
   **reconfirmation user** bundles externes (signalé dans le rapport).
6. Tests `c23_3_roundtrip_*.test.tsx` (3 mp3 + 2 jpg mock `blob:`) ;
   étendre `c8EscapegameLayoutRoundtrip.test.ts` / `c5EscapegameRoundtrip`
   avec assets réels dans le ZIP (pas seulement JSON).

**Critères de fin** : colonne (iii) ✅ sur le tableau audit ; smoke
3 mp3 + 2 jpg ; Annexe D Journal C23.3.

**Commit** : `feat(nodal): C23.3 reconnexion blob au load (audio +
image) + warning orphelins + tests round-trip complet`.

### Journal de chantier

- **2026-05-17** — Ouverture Annexe D. Cadrage validé en phase
  questions (Q-C23-1 à Q-C23-8). Scope étendu aux médias image local
  (Q-C23-1 a, demande user). Découpage 3 sous-chantiers (C23.1 audit
  doc-only, C23.2 projection, C23.3 reconnexion). Garde-fou user :
  pas de dépendance DOM dans le pont vers `bundleAssetPathBlobs` —
  consommation Map JS pure uniquement. Plan détaillé C23.1 (audit)
  rédigé ; plans C23.2 et C23.3 en squelette à affiner post-audit.
  Branche `feat/c23-bundle-audio-image` créée depuis `feat/nodal-map`.

- **2026-05-17 — C23.1 livré (audit doc-only)** — Phase questions
  §8.1 (Q-C23.1-1…9) validée par le user. Rapport ci-dessous.
  Plans C23.2 / C23.3 affinés dans cette Annexe. Aucune modification
  de code source.

#### C23.1 — Rapport d'audit flux save/load médias bundle (audio + image)

**Chaîne save** : `Escape360EditorNodalMap.serializeForBundle()` →
`serializeToProjectJson` + `serializeLayout` → `saveProjectBundle()`
(`editeur-app.js`) clone `project.json`, collecte via
`eachPortableMediaUrlInProject`, réécriture `./assets/<filename>` plat,
ZIP `assets/` + `map-layout.json`. **Pas** de `getCurrentProjectData()`
ni flush DOM.

**Chaîne load** : `mapZipAssetsToEditorSession` remplit
`bundleAssetPathBlobs` + `bundleAssets` ; `rewriteLoadedProjectPathsToBlobUrls`
sur **`project.json` seulement** ; `hydrateFromBundle` →
`hydrateFromProject` + `applyHydratedLayout` (`nodalMedia`,
`inventoryObjects`, `nodalAutoSatelliteData`, liens meta).

**Réponses validées (phase questions)** : Q-C23.1-1 grille 3 couches ;
Q-C23.1-2 getter API C23.3 ; Q-C23.1-3 étendre `toProjectJson` + walker ;
Q-C23.1-4 **(i) write-only** — *à reconfirmer user* bundles hors repo ;
Q-C23.1-5 end-screens N/A ; Q-C23.1-6 mix projection + scan orphelins ;
Q-C23.1-7 inventaire HUD + icônes objet ; Q-C23.1-8 panorama **(B)** ;
Q-C23.1-9 taxonomie paths Annexe D dès C23.2.

##### Tableau principal (emplacements bundle-éligibles)

Légende : **(i)** projection / présence dans `project.json` exporté ;
**(ii)** embarquement dans `.escapegame` (`assets/`) ;
**(iii)** reconnexion session (`blob:`) + store React après reload.

| Emplacement | Source store (vérité nodale) | (i) Projection JSON | (ii) Embarquement asset | (iii) Reconnexion load |
|-------------|------------------------------|---------------------|-------------------------|------------------------|
| **Audio global** | `meta.settings.audio` (`url`, `volume`) — **pas** de nœud `media-*` | ⚠ `meta.settings` passé tel quel par `serializeToProjectJson` ; **pas** d'alias `globalMusic` pour le joueur / walker | ❌ Walker lit `globalMusic.url` / `globalAudioUrl`, **pas** `meta.settings.audio.url` → blob ignoré au save nodal | ❌ `rewritePortableUrls…` ne parcourt pas `meta.settings` ; hydrate recopie `./assets/` ou `blob:` mort ; preview nodal lit le store, pas reconnecté depuis Map |
| **Audio ambient** | Nœud `media-audio` + edge `meta` scène→média ; preview via `resolveSceneAmbiance` | ❌ Pas de `scene.media.ambiance` dans `toProjectJson` ; graphe média hors V2 (layout + liens) | ❌ Walker attend `scene.media.ambiance` sur JSON aplati — absent du bundle nodal | ❌ `nodalMedia` dans layout non réécrit au load ; edge meta restaurée mais `data.url` reste `blob:` invalide ; **flush DOM** ne projette pas l'ambiance vers `.sc-audio` (`editor-shared-nodal-to-dom.js` sans équivalent `mediaAudioLinkedFromScene`) |
| **Audio SFX** | Nœud `media-audio` + edge `meta` action→média ; C19.1 | ✅ `resolveLinkedMediaAudioSfxForAction` → `action.sfx` dans `toProjectJson` | ✅ Si URL projetée en `action.sfx.url` et blob en session `bundleAssets` | ⚠ `project.json` : `action.sfx` → `blob:` via rewrite ; **nœud** `media-*` dans `nodalMedia` souvent **non** mis à jour (URL `blob:` morte) — preview nodal peut marcher via `action.sfx` fallback, reconnexion média graphe incomplète |
| **Image panorama** | `scene.panoramaUrl` **ou** `media-image` meta (Q-C23.1-8 **B**) ; `resolveScenePanoramaDisplayUrl` | ⚠ Seul `scene.panoramaUrl` exporté ; **pas** de projection depuis `media-image` lié | ⚠ Embarqué **seulement** si URL dans `scene.panoramaUrl` ; cas « panorama uniquement sur nœud média » → ❌ | ⚠ Rewrite sur `scene.panoramaUrl` si présent ; `nodalMedia` non réécrit ; edge scène→image restaurée (`nodalSceneMetaMediaLinks`) mais blob média souvent mort |
| **Image hotspot** | `satellites[coords-options].data.appearance.ui_img` ; UI `HotspotAppearancePopup` | **Couche A store** : ✅ en session. **B `map-layout`** : ✅ `nodalAutoSatelliteData[path].coords.appearance.ui_img`. **C `project.json`** : ❌ hotspots V2 = `{ action }` seulement, pas `appearance` | ❌ Walker lit `hs.appearance.ui_img` sur JSON **projet** — absent ; layout **non** scanné | ❌ Layout non réécrit ; `applyNodalAutoSatelliteData` restaure `ui_img` `./assets/` ou `blob:` mort ; flush DOM projette `ui_img` **si** URL valide — sinon visuel cassé |
| **Inventaire HUD** | `meta.settings.inventoryGlobal.icon` ; `MediaUploadButton` | ✅ Round-trip `meta.settings` (tests C10.2.b) | ❌ Walker lit `project.invIcon` racine, **pas** `meta.settings.inventoryGlobal.icon` | ❌ `meta.settings` hors rewrite ; flush DOM vers `#inv-icon` si valeur résolue |
| **Icônes objet** | `meta.objects[id].iconUrl` + `iconMediaId` ; `map-layout.inventoryObjects` | **Store** : ✅. **`project.json`** : ❌ objets hors V2. **Layout** : ✅ `inventoryObjects` | ❌ Aucune URL objet dans le walker `project.json` | ❌ `inventoryObjects` non réécrit ; `iconMediaId` peut recâbler un nœud média dont l'URL reste invalide |
| **End-screens image** | — | **N/A** — pas de champ image (`EndScreensSettings` = texte seul ; Q-C23.1-5) | **N/A** | **N/A** |
| **Médias orphelins** | Nœuds `media-*` sans edge `meta` parent ; persistés dans `nodalMedia` | ❌ Pas de cible `project.json` (vote Q-C23.1-6 **C**) | ❌ Non collectés (URLs seulement dans layout) | ❌ Présents dans layout avec `blob:` mort ; **aucun** warning `MEDIA_ORPHANED` (`computeWarnings.ts`) |

##### Grille multi-couches (Q-C23.1-1 / Q-C23.1-6 / Q-C23.1-7)

| Emplacement | Store React | `map-layout.json` | `project.json` (runtime joueur) | Walker / ZIP |
|-------------|-------------|-------------------|----------------------------------|--------------|
| Hotspot `ui_img` | `satellite.appearance` | `nodalAutoSatelliteData` | ❌ (export generate via DOM flush seulement) | ❌ |
| Panorama | `scene` + `media-image` meta | `nodalMedia` + `nodalSceneMetaMediaLinks` | `scene.panoramaUrl` (partiel) | partiel |
| Ambient / SFX | `media-*` + edges meta | idem + `nodalMetaMediaLinks` | SFX ✅ ambient ❌ | SFX partiel |
| Inventaire HUD | `meta.settings.inventoryGlobal` | — (dans `project.json`) | via `meta.settings` si generate lit JSON nodal — **generate** lit `getCurrentProjectData` → `invIcon` DOM | ❌ |
| Icônes objet | `meta.objects` | `inventoryObjects` | ❌ V2 | ❌ |

##### 4 points spécifiques

**1. `bundleAssetPathBlobs` (Map JS)**

| Attribut | Constat |
|----------|---------|
| Type | `Map` JS (`path canonique ./assets/…` → `Blob`) |
| Couplage DOM | **Non** pour la Map ; remplissage ZIP pur (`mapZipAssetsToEditorSession`) |
| Accès React | Aujourd'hui `window.bundleAssetPathBlobs` ; **pas** exporté par `EditorSharedBundle` → **C23.3** : `getBundleAssetPathBlobs()` |
| Upload | `pickLocalMediaFromBundle` utilise un `<input type="file">` caché (DOM) — hors périmètre pont load |
| Session blobs | `bundleAssets` : `blob:` → `File` ; `getBlobOrFileForPortableUrl` résout les deux |

**2. Convention path actuelle (save)**

- **Écriture ZIP** : `./assets/<filename>` **plat** (pas de sous-dossier type) ;
  `uniqueNameInSet` sur le basename ; fichier ZIP `assets/<filename>`.
- **Lecture ZIP** : clé `./assets/<inner>` où `inner` = chemin relatif sous
  `assets/` (supporte déjà des sous-dossiers si présents dans l'archive).
- **Cible C23.2** (validée Q-C23.1-9) : write-only
  `./assets/<type>/<sous-type>/<filename>` (cf. § Scope figé).

**3. Médias orphelins**

| Aspect | État actuel |
|--------|-------------|
| Persistés layout | ✅ `serializeLayout` → `nodalMedia` (tous les nœuds média) |
| Dans ZIP `assets/` | ❌ sauf URL aussi présente dans `project.json` walker |
| Path `./assets/orphelin/…` | ❌ non implémenté |
| Warning UI | ❌ pas de code `MEDIA_ORPHANED` |

**4. Rétrocompat path**

- **Vote audit** : **(i) casser proprement** — write-only nouvelle taxonomie ;
  **aucun** `.escapegame` versionné dans le repo.
- **⚠ À reconfirmer par le user** avant C23.3 : bundles externes critiques
  → bascule **(ii) compat lecture** si retour positif (sinon (i) maintenu).

##### Écarts structurels (cause racine)

1. **Double schéma** : nodal exporte `meta.settings` + `map-layout` ;
   walker / joueur legacy attendent souvent racine `globalMusic`, `invIcon`,
   `scene.media.ambiance`, `appearance` sur hotspots DOM.
2. **`saveProjectBundle` ne scanne pas `map-layout.json`** — tout média
   « layout-only » (orphelins, icônes objet, `ui_img`, médias liés non
   projetés) est perdu dans `assets/`.
3. **Load asymétrique** : rewrite JSON projet seulement — le layout garde
   des `blob:` de session précédente.
4. **Tests ZIP** (`zipBundle.ts`, `c5EscapegameRoundtrip`) : pas d'assets
   binaires — ne détectent pas la régression bundle médias.

##### Recommandations découpage C23.2 / C23.3

Voir plans détaillés affinés ci-dessus (§ Plan C23.2 / C23.3). Priorité
implémentation :

1. **C23.2** — `sceneAmbianceProjection` + `scenePanoramaProjection` ;
   étendre walker + `saveProjectBundle` (layout orphelins + inventaire) ;
   `getAssetPath` ; paths typés.
2. **C23.3** — `getBundleAssetPathBlobs()` ; rewrite layout au load ;
   pont post-hydrate (**médias + champs settings/objects/satellites**,
   pas DOM) ; `MEDIA_ORPHANED` ; tests 3 mp3 + 2 jpg avec vrai ZIP.

**Hors scope C23** : images end-screens (nouveau champ = C20/C21) ;
refonte « toujours panorama via nœud média » (Q-C23.1-8 **C**).

- **2026-05-17 — C23.3-fix Generate Game web HTML autoportant** — Régression
  post-clôture : `sceneAmbianceClips` calculé depuis `getCurrentProjectData()`
  sans enrich → ambiance absente du HTML. Fix : `getEnrichedProjectForPlayerExport()`
  + `computeSceneAmbianceClipsForPlayer` avant template ; un seul projet enrichi
  pour `buildPlayerHtmlTemplate` / `exportGameWebZip` / `generateGame`. Tests
  `c23_3_fix_generate_game_ambiance.test.ts`.

- **2026-05-17 — C23.3 livré** — Reconnexion blob au load via
  `getBundleAssetPathBlobs()` + `reconnectBundleMediaInStore` (médias,
  `meta.settings`, inventaire, satellites `ui_img`, orphelins) ; warning
  `MEDIA_ORPHANED` ; tests `c23_3_roundtrip.test.ts`. **Scope étendu** :
  Generate Game web (`getProjectJsonForPortableMediaExport` + enrich avant
  walker, convention `media/` plat inchangée) — projection ambiance rétablie.

- **2026-05-17 — C23.2 livré** — Projections :
  `sceneAmbianceProjection.ts`, `scenePanoramaProjection.ts`,
  `hotspotAppearanceProjection.ts` ; `toProjectJson` étendu (`scene.media`,
  `appearance.ui_img`). `enrichProjectJsonForBundleWalker` +
  `editor-shared-bundle-paths.js` (`getAssetPath`, `collectBundleMediaEntries`,
  rewrite layout). `saveProjectBundle` FR/EN : paths typés + layout réécrit
  dans le ZIP. Walker `meta.settings.*` étendu. Tests `c23_2_projection.test.ts`
  (6). Rétrocompat path : write-only confirmé user (aucun bundle externe).

