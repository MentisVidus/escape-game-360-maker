# Travail local — backlog issu des tests (avril 2026)

Fichier **`docs/todo.md`** (versionné pour sync entre machines). Synchroniser avec la règle Cursor **`.cursor/rules/todo.mdc`** : quand une entrée est réglée, la mettre à jour ici ; quand il n’y a plus de tâches ouvertes, on pourra supprimer ce fichier et la règle.

Document de suivi : **prioriser par chantier**, éviter de tout mélanger dans une même PR.

---

## Traitée ou partiellement adressée ici

- **Export ZIP + médias mixtes** — extension de `eachPortableMediaUrlInProject` / `rewritePortableUrlsInProjectClone` (FR + EN) : `globalAudioUrl`, `invIcon` (URL), `media.ambianceUrl` (legacy). Alerte si des `blob:` subsistent dans `index.html` après remplacement (export ZIP).
- **README — tests localhost** — rechargement forcé / cache (`Ctrl+F5`, etc.) ajouté dans les conseils FR + EN.
- **Sauvegarde `.json` + médias locaux** — `saveProject()` : `confirm` si `collectPortableBundleEmbeds` non vide ; recommande **`.escapegame`** (FR + EN).
- **SFX selector (sous-menu → scène / pick)** — `choiceToPayload` inclut `sfxUrl` / `sfxVolume` ; `closeSelectorOverlay(false)` avant `executeAction` pour ne pas appeler `stopSFX()` et couper le son ; joueur FR+EN (`editeur-generate.js` / `editor-en-generate.js`).
- **Quill au rechargement projet / bundle** — chargement du HTML via `ql-editor` + `update(api)` plutôt que seul `dangerouslyPasteHTML` ; synchro textarea sur `text-change` réservée au source **user** + recopie explicite après init (`js/editor-quill-scenes.js`).
- **Volume musique / ambiance + défaut hotspot 120×120** — curseurs `globalAudioVol` + `sc-audio-vol` (FR/EN `editeur.html` / `editor_en.html`, `editeur-app.js` / `editor-en-app.js`) ; schéma déjà `{ url, volume }` ; joueur inchangé (`editeur-generate.js` lisait déjà les volumes). Hotspot neuf : **120×120** px (CSS + UI no-code).
- **Placeholder scène (grille PNG)** — `EditorCore.DEFAULT_SCENE_PANORAMA_PLACEHOLDER_URL` → jsDelivr `media/equirectangular_placeholder_grid.png` (dépôt `MentisVidus/escape-game-360-maker@main`) ; nouvelles scènes + chargement projet sans `panoramaUrl` (FR/EN, `editor-quill-scenes.js`).
- **Revue documentation (printemps 2026)** — `README.md` (FR+EN), `docs/ARCHITECTURE.md`, `PLAN_EDITEUR_NODAL.md`, `CONTRIBUTING.md`, `docs/README.md`, `SELECTOR_SPEC.md`, `todo.md` : alignement sur **bundle `.escapegame`**, **export ZIP Web**, **HUD audio joueur**, feuille de route et liens croisés.
- **UX — cible après « + nouvelle scène »** — `addScene` transmet `{ preferSelect, preferVal }` à `refreshAllSceneTargetSelects` ; priorité à ce couple dans `js/editor-quill-scenes.js` pour que le `<select>` qui a ouvert le flux reste sur le **nouvel ID** (évite le premier refresh sans opts qui remettait `dataset.prevValue`). FR : `editeur-app.js` ; EN : `editor-en-app.js`.
- **Refactor FR/EN — phase 1 (helpers bundle)** — extraction des helpers `.escapegame` communs dans `js/editor-shared-bundle.js`; `editeur-app.js` et `editor-en-app.js` branchés sur cette API partagée; script chargé dans `editeur.html` / `editor_en.html`.
- **Refactor FR/EN — phase 2 (helpers UI sans i18n)** — extraction dans `js/editor-shared-ui-utils.js` des fonctions communes non localisées (`toggleCollapse`, `toggleAllHotspotsInScene`, `moveUp`, `moveDown`, `buildCss`, auto-fill pick/hidden). `editeur-app.js` / `editor-en-app.js` consomment `window.EditorSharedUi`; script chargé dans les deux HTML.
- **Refactor FR/EN — phase 3 (cœur selector technique)** — extraction dans `js/editor-shared-selector-core.js` des helpers selector non localisés (`getOwnChoiceField`, `collectChoicesFromList`, sync/listeners textarea JSON, move/remove choice, parse textarea). `editeur-app.js` / `editor-en-app.js` branchés sur `window.EditorSharedSelectorCore`; script chargé dans les deux HTML.
- **Refactor FR/EN — phase 4 (sérialisation hotspot)** — extraction de `extractHotspotData` dans `js/editor-shared-hotspot-serialization.js` (duplication/copie hotspot). `editeur-app.js` / `editor-en-app.js` branchés sur `window.EditorSharedHotspotSerialization`; script chargé dans les deux HTML.
- **Refactor FR/EN — phase 5 (mappers actions legacy↔V2)** — extraction dans `js/editor-shared-action-mappers.js` des conversions `selectorChoiceLegacyToV2`, `legacyActionToV2`, `legacyRewardToV2`, `actionV2ToLegacyChoice` avec options de locale (label transition par défaut). `editeur-app.js` / `editor-en-app.js` branchés sur `window.EditorSharedActionMappers`; script chargé dans les deux HTML.
- **Refactor FR/EN — phase 6 (shared hotspot DOM mapper core)** — extraction de `hotspotDomToV2` dans `js/editor-shared-hotspot-dom-mapper.js` avec dépendances injectées (`selectorChoicesFromTextarea`, `legacyActionToV2`) et option de locale (`defaultTransitionLabel`). `editeur-app.js` / `editor-en-app.js` branchés sur `window.EditorSharedHotspotDomMapper`; script chargé dans les deux HTML.
- **Refactor FR/EN — phase 7 (shared project serialization core)** — extraction de `getCurrentProjectData` dans `js/editor-shared-project-serialization.js` avec dépendances injectées (`EditorCore`, `hotspotDomToV2`) pour aligner la sérialisation DOM→V2 entre FR/EN. `editeur-app.js` / `editor-en-app.js` branchés sur `window.EditorSharedProjectSerialization`; script chargé dans les deux HTML.
- **Refactor FR/EN — phase 8 (shared preview/picker core)** — extraction des outils 360 (`openPicker`, `validerCoordonnees`, `closePicker`, `previewScene`, `closeScenePreview`) dans `js/editor-shared-preview-picker.js`, avec message d’alerte localisable (`Image manquante !` / `Missing image!`). `editeur-app.js` / `editor-en-app.js` branchés sur `window.EditorSharedPreviewPicker`; script chargé dans les deux HTML.
- **Refactor FR/EN — phase 9 (finalisation mappers V2/legacy hotspot)** — extraction de `actionV2ToLegacyHotspotData` vers `js/editor-shared-action-mappers.js` (factory `createActionMappers`), pour compléter la migration des conversions V2↔legacy hors des fichiers FR/EN. `editeur-app.js` / `editor-en-app.js` branchés sur `ActionMappers.actionV2ToLegacyHotspotData`.
- **Refactor FR/EN — phase 10 (duplication scène / hotspot)** — extraction de `duplicateHotspot` et `duplicateScene` dans `js/editor-shared-duplication.js` (`createDuplicationHelpers`), avec dépendances injectées (`addHotspot`, `addScene`, `extractHotspotData`, `refreshAllSceneTargetSelects`) et chaînes localisées (prompt, alerte, suffixes `_copie` / `_copy`, titres). Script chargé dans `editeur.html` et `editor_en.html` avant les `*-app.js`.
- **Timer + écrans de fin — phase A (schéma + UI éditeur)** — ajout des paramètres globaux `timer`, `victorySceneId`, `endScreens` dans `editor-core.js` (defaults + normalisation), ajout des contrôles FR/EN dans `editeur.html` / `editor_en.html`, et branchement save/load via `js/editor-shared-timer.js` + `js/editor-shared-project-serialization.js` + `applyLoadedProject` FR/EN.
- **Timer joueur — phase B (runtime export)** — `js/editeur-generate.js` + `js/editor-en-generate.js` : JSON embarqué `escape360-timer-config` (timer + copie `endScreens.gameOver`), HUD `#player-timer`, CSS modale Game Over ; logique tick countdown / countup, expiration → écran Game Over (destroy Pannellum, masquage HUD, `location.reload()` sur le bouton) ; option **pause pendant popups** branchée sur paramètres, `afficherPopup`, sélecteur, énigme mot de passe ; `initPlayerTimerAfterStart()` après `startGame` ; garde **`gameOverTriggered`** sur `executeAction` et clics `hotspotDispatcher`.
- **Timer joueur — phase C (victoire) + sens « démarrage auto »** — `js/editeur-generate.js` + `js/editor-en-generate.js` : modale victoire (`victorySceneId`, contenus `endScreens.victory`), déclenchement sur la scène courante (chargement initial + `scenechange`) ; si `timer.autoStart` est désactivé, le compteur ne tourne qu’après le premier clic hotspot ou la première exécution `executeAction` (ex. choix selector). Aide contextuelle sous la case à cocher dans `editeur.html` / `editor_en.html`.
- **Timer joueur — phase D (overrides par scène)** — `EditorCore.normalizeSceneTimerOverride` + normalisation dans `normalizeProjectV2` ; formulaire par scène (FR/EN `editeur-app.js` / `editor-en-app.js`) + sérialisation `editor-shared-project-serialization.js` + duplication `editor-shared-duplication.js` ; runtime export : JSON `#escape360-scene-timer-overrides`, compte à rebours local sur la scène active, pause du timer global le temps du local si besoin, fin : Game Over global / `loadScene` / popup HTML.
- **Timer / fins — retours tests (avril 2026)** — UI globale : timer et **scène de victoire** découplés ; **`gameOverSceneId`** (scène dédiée game over) + runtime export FR/EN (`tryNavigateToGameOverSceneFromTimer`, `checkGameOverForScene`, JSON timer) ; correctif **`readTimerSettingsFromDom`** : lecture de `#gameOverSceneId` pour ne plus perdre la valeur à la sauvegarde ; `css/editor.css` : **checkbox / radio** exclus du `width:100%` global (alignement label + timer local) ; **formulaire scène** : bloc **`<details>`** « Paramètres optionnels » (ambiance, volume, timer local), replié par défaut, ouvert au chargement si données présentes.

---

## Idées / plus tard (non bloquant)

- **Règle Cursor** du type *« maintenir la doc à jour »* lors d’ajouts de fonction — seulement si le backlog léger le justifie (éviter les règles `alwaysApply` sans effet).

---

## Backlog idées (avril 2026 — à prioriser, une PR / thème)

Synthèse des pistes à traiter **plus tard** (pas tout en parallèle). Détail volontairement ici pour ne pas perdre le fil.

### UX éditeur (retours tests — suite)

- **Placeholders grisés partout** — étendre le comportement « suggestion non exportée » à tous les champs texte concernés (hotspots, scènes, etc.) ; voir commentaires `<!-- TODO(UX) -->` dans `editeur.html` / `editor_en.html`.
- **Quill sur Game Over / Victoire** — remplacer les textarea « Contenu HTML » des écrans de fin par l’éditeur riche (comme les hotspots) ; même TODO HTML que ci-dessus.
- ~~**Formulaire scène** — `<details>` optionnel par scène~~ — **Fait** : `scene-optional-details` dans `addScene` (FR/EN), styles `css/editor.css`, ouverture auto au chargement JSON si ambiance renseignée ou timer local actif.

### Refactor code & séparation FR / EN

- Passer en revue **`editeur-app.js`** / **`editor-en-app.js`** : repérer les fonctions **strictement identiques** (aucun texte UI) et les **extraire** vers un ou plusieurs modules JS **thématiques** (ex. `editor-scenes.js`, `editor-hotspots-logic.js`) chargés par les deux HTML — objectif : **ne dupliquer que** ce qui affiche ou formate des chaînes **spécifiques à la langue** (labels, `confirm`, messages d’erreur, placeholders). *(Phase 1 bundle déjà faite.)*
- Vérifier s’il existe du **code mort** ou des chemins jamais appelés côté éditeur dans l’un des deux fichiers.

### Documentation

- **`docs/ARCHITECTURE.md`** : le **diagramme Mermaid** (flux sauvegarde / rechargement / bundle) n’est plus fidèle au comportement actuel — le **mettre à jour** ou le remplacer par un schéma à jour (JSON V2, `.escapegame`, `blob:`, export ZIP, Quill…).
- **Doc « guide éditeur »** (nouveau fichier ou refonte ciblée) : reprendre les **fonctions principales**, leurs **interactions** (liste + carte + panneau latéral + selector + export), et une **amorce de vision** éditeur full nodal (ex. React) — incluant l’idée de **nœuds réutilisables** en logique (ex. même primitive « slider 0–1 » pour volume SFX vs opacité hotspot, avec **noms / rôles UI distincts** côté produit). Croiser **`docs/PLAN_EDITEUR_NODAL.md`** (Chemin B).

### Éditeur — brouillon / récupération après F5 accidentel

- **Sauvegarde locale** (ex. `localStorage` ou **IndexedDB** pour gros projets) du brouillon éditeur pour limiter la perte sur actualisation ou crash.
- **Contraintes** : éviter une écriture à **chaque frappe** ; privilégier **snapshot périodique** (ex. toutes les *n* minutes) + éventuellement à la fermeture d’onglet (`beforeunload` léger) ; **quota / rotation** (une ou quelques versions, purge explicite dans l’UI « Effacer le brouillon » / paramètres).
- UX : ne **pas** écraser silencieusement un fichier projet chargé sans demande — distinguer « brouillon navigateur » vs « dernier fichier ouvert ».

### Joueur — sauvegarde de progression (option éditeur)

- Option à activer dans l’éditeur : **aucune** / **manuelle** (ex. bouton dans le HUD) / **auto** (ex. à chaque changement de scène).
- Stockage côté client (`localStorage` ou similaire), clé par jeu ou par export ; réflexion **vie privée** + **reset** (nouvelle partie) + taille des données (inventaire, flags).

---

## Notes Windows / ZIP

Décompression : **Propriétés → Débloquer** puis extraire ; si besoin **7-Zip**. Ce n’est pas un défaut du générateur ; une phrase dans la doc joueur (`Lisez-moi.txt` / README) peut suffire.

---
## Nouveau chantier proposé — Timer + écrans de fin (V1 puis V2)

### Objectif produit
Ajouter une boucle de fin claire côté joueur avec :
- un **timer** configurable dans l’éditeur,
- un **écran Game Over** à l’expiration d’un compte à rebours,
- un **écran Victoire** (déclencheur simple en V1),
tout en restant compatible avec le schéma V2 et l’existant FR/EN.

---

### Périmètre V1 (prioritaire)

#### 1) Paramètres globaux projet (éditeur)
Ajouter dans les réglages globaux :
- `timer.enabled` (bool)
- `timer.mode` (`countdown` | `countup`)
- `timer.startSeconds` (number, utilisé si `countdown`)
- `timer.autoStart` (bool)
- `timer.pauseWhenPopupOpen` (bool, optionnel)
- `victorySceneId` (string, optionnel, V1 simple)

Écrans de fin globaux :
- `endScreens.gameOver.title`
- `endScreens.gameOver.bodyHtml`
- `endScreens.gameOver.buttonLabel`
- `endScreens.victory.title`
- `endScreens.victory.bodyHtml`
- `endScreens.victory.buttonLabel`

#### 2) Runtime joueur
- Afficher un timer dans le HUD.
- Démarrer/arrêter selon config.
- En `countdown`, quand `0` est atteint -> ouvrir écran **Game Over**.
- Déclencher **Victoire** quand la scène courante == `victorySceneId`.
- Bouton principal écran de fin : “Rejouer” (reload propre de la partie).

#### 3) Compatibilité
- Si les champs n’existent pas dans un ancien projet : comportement inchangé (timer désactivé, pas d’écran final forcé).
- Pas de rupture sur SFX, inventaire, selector, popup.

---

### Périmètre V2 (optionnel, après validation V1)

Overrides par scène :
- `scene.timerOverride.enabled`
- `scene.timerOverride.seconds`
- `scene.timerOverride.onExpire` (`gameOver` | `gotoScene` | `showMessage`)
- `scene.timerOverride.targetScene` (si `gotoScene`)

Objectif : scènes “pression” avec compte à rebours local.

---

### Découpage en phases (1 commit = 1 thème)

- **Phase A — Schéma + UI éditeur**
  - Ajouter les champs globaux timer/end screens dans le modèle + formulaires FR/EN.
- **Phase B — Joueur timer** *(livré : HTML export FR/EN — HUD, config JSON, Game Over, pause popups / réglages / selector / mot de passe)*
  - HUD timer, mode countup/countdown, expiration -> Game Over.
- **Phase C — Victoire** *(livré : runtime export FR/EN + doc UI « auto-start »)*
  - Déclenchement via `victorySceneId` + écran victoire.
- **Phase D — Overrides scène (V2)** *(livré : `scene.timerOverride` + runtime HUD / `scenechange`)*
  - Compte à rebours local par scène + actions à expiration.

---

### Critères de validation (smoke tests)

- [ ] Projet sans timer: comportement identique à avant.
- [ ] Timer countdown: décrémente, atteint 0, affiche Game Over.
- [ ] Timer countup: incrémente sans interrompre le jeu.
- [x] `victorySceneId`: arrivée sur la scène cible -> écran victoire.
- [ ] Bouton “Rejouer”: redémarrage propre.
- [ ] Save/load JSON + bundle `.escapegame`: paramètres conservés.
- [ ] FR/EN: labels/messages corrects dans chaque langue.
- [ ] Aucune régression visible sur selector, inventaire, SFX, transitions.

---

### Notes techniques
- Conserver la logique technique partagée autant que possible; laisser FR/EN surtout pour les chaînes affichées.
- Éviter d’introduire i18n complet dans ce chantier (hors scope).
- Favoriser un ajout progressif pour limiter les risques de régression.