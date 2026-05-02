# Travail local — backlog issu des tests (avril 2026)

Fichier **`docs/todo.md`** (versionné pour sync entre machines). Synchroniser avec la règle Cursor **`.cursor/rules/todo.mdc`** : quand une entrée est réglée, la mettre à jour ici ; quand il n’y a plus de tâches ouvertes, on pourra supprimer ce fichier et la règle.

Document de suivi : **prioriser par chantier**, éviter de tout mélanger dans une même PR.

---

## Traitée ou partiellement adressée ici

- **Bundle `.escapegame` + carte nodale** — nodal = source de vérité stricte : save via `serializeForBundle()` (écriture directe `project.json` nodal + `map-layout.json`), sans passer par `getCurrentProjectData()` ; load ZIP : `hydrateFromBundle` puis projection DOM (`flushNodalStoreToEditorDom`) ; ouverture carte sans bundle nodal = graphe d’exemple (pas d’hydratation depuis le DOM) ; synchro 8 s + flush sortie (`editor-shared-bundle.js`, `*-app.js`, `editor-nodal-map-bootstrap.js`, `editor-map-main.tsx` + `dist/editor-map.js`).
- **Export ZIP + médias mixtes** — extension de `eachPortableMediaUrlInProject` / `rewritePortableUrlsInProjectClone` (FR + EN) : `globalAudioUrl`, `invIcon` (URL), `media.ambianceUrl` (legacy). Alerte si des `blob:` subsistent dans `index.html` après remplacement (export ZIP).
- **README — tests localhost** — rechargement forcé / cache (`Ctrl+F5`, etc.) ajouté dans les conseils FR + EN.
- **Sauvegarde `.json` + médias locaux** — `saveProject()` : `confirm` si `collectPortableBundleEmbeds` non vide ; recommande **`.escapegame`** (FR + EN).
- **SFX selector (sous-menu → scène / pick)** — `choiceToPayload` inclut `sfxUrl` / `sfxVolume` ; `closeSelectorOverlay(false)` avant `executeAction` pour ne pas appeler `stopSFX()` et couper le son ; joueur FR+EN (`editeur-generate.js` / `editor-en-generate.js`).
- **Quill au rechargement projet / bundle** — chargement du HTML via `ql-editor` + `update(api)` plutôt que seul `dangerouslyPasteHTML` ; synchro textarea sur `text-change` réservée au source **user** + recopie explicite après init (`js/editor-quill-scenes.js`).
- **Volume musique / ambiance + défaut hotspot 120×120** — curseurs `globalAudioVol` + `sc-audio-vol` (FR/EN `editeur.html` / `editor_en.html`, `editeur-app.js` / `editor-en-app.js`) ; schéma déjà `{ url, volume }` ; joueur inchangé (`editeur-generate.js` lisait déjà les volumes). Hotspot neuf : **120×120** px (CSS + UI no-code).
- **Placeholder scène (grille PNG)** — `EditorCore.DEFAULT_SCENE_PANORAMA_PLACEHOLDER_URL` → jsDelivr `media/equirectangular_placeholder_grid.png` (dépôt `MentisVidus/escape-game-360-maker@main`) ; nouvelles scènes + chargement projet sans `panoramaUrl` (FR/EN, `editor-quill-scenes.js`).
- **Revue documentation (printemps 2026)** — `README.md` (FR+EN), `docs/ARCHITECTURE.md`, `PLAN_EDITEUR_NODAL.md`, `CONTRIBUTING.md`, `docs/README.md`, `SELECTOR_SPEC.md`, `todo.md` : alignement sur **bundle `.escapegame`**, **export ZIP Web**, **HUD audio joueur**, feuille de route et liens croisés.
- **Revue documentation post-C7 (mai 2026)** — Suppression de `docs/PLAN_REACT_INTEGRATION.md` (ancêtre de `NODAL_MAP_SPEC.mdc`). Refonte du `README.md` racine (FR+EN) : carte nodale comme **source de vérité d'édition** sur `feat/nodal-map`, section dédiée C7, suppression de la ligne C7.5 morte. Enrichissement de `PLAN_EDITEUR_NODAL.md` (statut printemps 2026, jalons B0→B5 marqués livrés/partiels/à faire). Nouvelle section « React nodal map » dans `ARCHITECTURE.md` + diagramme Mermaid de haut niveau revu (carte nodale + IndexedDB + projection nodal→DOM) + nouveau diagramme runtime joueur (`playerSaveMode`). Notes « implémenté » dans `PLAN_SAUVEGARDE_LOCALE_EDITEUR.md` et `plan_sauvegarde_locale_joueur.md`. Note carte nodale dans `SELECTOR_SPEC.md` et `PLAN_NODAL_PEDAGOGIE.md`. Ajout de `ACTION_FIELDS_MAPPING.md` à l'index `docs/README.md`. FUNDING.yml cherry-pick depuis `main`.
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
- **Timer / fins — retours tests (avril 2026)** — UI globale : timer et **scène de victoire** découplés ; **`gameOverSceneId`** (scène dédiée game over) + runtime export FR/EN (`tryNavigateToGameOverSceneFromTimer`, `checkGameOverForScene`, JSON timer) ; correctif **`readTimerSettingsFromDom`** : lecture de `#gameOverSceneId` pour ne plus perdre la valeur à la sauvegarde ; `css/editor.css` : **checkbox / radio** exclus du `width:100%` global (alignement label + timer local) ; **formulaire scène** : bloc **`<details>`** « Paramètres optionnels » (ambiance, volume, timer local), replié par défaut, ouvert au chargement si données présentes ; **écrans de fin** : corps Game Over / Victoire en **Quill** (cohérence hotspots).
- **Placeholders / export (point 2 retours tests)** — `editor-shared-export-text.js` : suggestions **non exportées** (catalogue + HTML vide Quill + titres/boutons modales d’usine) ; hotspots / selector / titres de scène / timer **read path** branchés ; champs riches en **placeholder** dans les gabarits FR/EN.

---

## Idées / plus tard (non bloquant)

- **Règle Cursor** du type *« maintenir la doc à jour »* lors d’ajouts de fonction — seulement si le backlog léger le justifie (éviter les règles `alwaysApply` sans effet).
- **Undo / redo éditeur** (hors MVP sauvegarde locale) : démarrer par un retour au dernier snapshot/brouillon via le pipeline de chargement existant, puis envisager une vraie pile d’historique plus tard.

---

## Backlog idées (avril 2026 — à prioriser, une PR / thème)

Synthèse des pistes à traiter **plus tard** (pas tout en parallèle). Détail volontairement ici pour ne pas perdre le fil.

### UX éditeur (retours tests — suite)

- ~~**Placeholders grisés partout**~~ — **Fait** : `js/editor-shared-export-text.js` (`readExportAwareFieldValue`, catalogue snippets FR/EN, HTML « vide » Quill, `sanitizeSelectorChoicesForExport`) ; branchement sérialisation (`editor-shared-hotspot-dom-mapper.js`, `editor-shared-hotspot-serialization.js`, `editor-shared-selector-core.js`, `editor-shared-timer.js`, `editor-shared-project-serialization.js`) ; gabarits hotspots + selector + titres menu (`editeur-app.js` / `editor-en-app.js`) : champs riches en **placeholder** + valeurs vides, boutons de transition vides + placeholder, titres d’écran de fin traités comme **usine** si inchangés.
- ~~**Quill sur Game Over / Victoire**~~ — **Fait** : `#endGameOverBody` / `#endVictoryBody` en `textarea.editor-rich-text` dans `.wysiwyg-wrap` ; `flushRichEditorsIn` avant sérialisation ; `applyTimerSettingsToDom` fait `destroy` + `re-init` Quill ; init au chargement page (`*-app.js`) ; **placeholder** Quill optionnel pour tout champ `.editor-rich-text` (`editor-quill-scenes.js`).
- ~~**Formulaire scène** — `<details>` optionnel par scène~~ — **Fait** : `scene-optional-details` dans `addScene` (FR/EN), styles `css/editor.css`, ouverture auto au chargement JSON si ambiance renseignée ou timer local actif.

### Refactor code & séparation FR / EN

- Passer en revue **`editeur-app.js`** / **`editor-en-app.js`** : repérer les fonctions **strictement identiques** (aucun texte UI) et les **extraire** vers un ou plusieurs modules JS **thématiques** (ex. `editor-scenes.js`, `editor-hotspots-logic.js`) chargés par les deux HTML — objectif : **ne dupliquer que** ce qui affiche ou formate des chaînes **spécifiques à la langue** (labels, `confirm`, messages d’erreur, placeholders). *(Phase 1 bundle déjà faite.)*
- Vérifier s’il existe du **code mort** ou des chemins jamais appelés côté éditeur dans l’un des deux fichiers.

### Documentation

- ~~**`docs/ARCHITECTURE.md`** : le **diagramme Mermaid** (flux sauvegarde / rechargement / bundle) n'est plus fidèle.~~ — **Fait (mai 2026)** : diagramme de haut niveau revu (carte nodale React, IndexedDB, projection nodal→DOM, `blob:` au chargement bundle), second diagramme remplacé par un schéma dédié au runtime joueur + `playerSaveMode`.
- **Doc « guide éditeur »** : amorce avec la nouvelle section « React nodal map » d'`ARCHITECTURE.md` + spec `NODAL_MAP_SPEC.mdc` (Annexe B). Une refonte plus large pour le **médiateur EPN** (vocabulaire produit, captures, parcours d'atelier) reste à envisager — à priorisé après les retours d'usage de la carte nodale.

### Éditeur — brouillon / récupération après F5 accidentel

Plan détaillé (risques, options, phases) : **`docs/PLAN_SAUVEGARDE_LOCALE_EDITEUR.md`**.

- ~~**Sauvegarde locale** (ex. `localStorage` ou **IndexedDB** pour gros projets) du brouillon éditeur pour limiter la perte sur actualisation ou crash.~~ — **Fait** : implémentation IndexedDB + snapshots + restauration explicite + purge/gestion via dock latéral.
- ~~**Contraintes** : éviter une écriture à **chaque frappe** ; privilégier **snapshot périodique** (ex. toutes les *n* minutes) + éventuellement à la fermeture d’onglet (`beforeunload` léger) ; **quota / rotation** (une ou quelques versions, purge explicite dans l’UI « Effacer le brouillon » / paramètres).~~ — **Fait** : autosave debounced, stockage/quota affichés, rétention/purge opérationnelles.
- ~~UX : ne **pas** écraser silencieusement un fichier projet chargé sans demande — distinguer « brouillon navigateur » vs « dernier fichier ouvert ».~~ — **Fait** : restauration avec confirmation et métadonnées (source/date/titre), sans overwrite silencieux.

### Joueur — sauvegarde de progression (option éditeur)

Plan détaillé (nouveau) : **`docs/plan_sauvegarde_locale_joueur.md`**.

- ~~Sauvegarde locale joueur : privilégier **IndexedDB** (réutilisation du socle technique partagé avec l’éditeur).~~ — **Fait (Phase B)** : slot local unique branché dans le runtime joueur (FR/EN), avec reprise d’état (scène, inventaire, unlocks, timer).
- ~~Slot local : **1 seul slot** (écrasement volontaire du précédent pour éviter l’accumulation en phase de test).~~ — **Fait (Phase B)** : clé `latest` unique.
- ~~Écran titre joueur : **Continuer** + activation explicite via case à cocher sur l’écran de démarrage.~~ — **Fait (Phase B)**.
- ~~Sauvegarde manuelle joueur en `.escapegame` + import fichier~~ — **Fait (Phase C)** : export/import manuel `.escapegame` (FR/EN), validation `kind/saveSchemaVersion/gameFingerprint`, import possible depuis l’écran titre et depuis les réglages en cours de partie.
- ~~Compléter l’écran titre avec un parcours **Nouvelle partie** explicite~~ — **Fait** : bouton dédié FR/EN, confirmation guidée et purge locale optionnelle du quicksave avant démarrage.
- ~~Option éditeur complète **none/manual/auto** (par défaut `manual`) et propagation stricte dans l’export joueur~~ — **Fait (Phase D)** : nouveau réglage global `playerSaveMode` (FR/EN), sérialisation + chargement projet, normalisation `EditorCore`, payload export joueur, et comportement runtime aligné (`none` désactive l’UI/les actions de sauvegarde ; `manual` = reprise/import/export manuels ; `auto` = auto-save + manuel).

---

## Notes Windows / ZIP

Décompression : **Propriétés → Débloquer** puis extraire ; si besoin **7-Zip**. Ce n’est pas un défaut du générateur ; une phrase dans la doc joueur (`Lisez-moi.txt` / README) peut suffire.

---

## Archive — Timer + écrans de fin (**livré**)

Le périmètre détaillé (V1/V2, phases A–D) est **implémenté** ; le résumé technique est dans **`docs/ARCHITECTURE.md`** (timer global, `victorySceneId`, `gameOverSceneId`, `scene.timerOverride`, JSON embarqués côté joueur). Les entrées correspondantes sont aussi dans la section **Traitée** ci-dessus.

**Checklist QA manuelle** (pas de CI — à cocher au fil des campagnes) :

- [ ] Projet sans timer : comportement identique à avant.
- [ ] Timer countdown : décrémente, atteint 0, affiche Game Over.
- [ ] Timer countup : incrémente sans interrompre le jeu.
- [x] `victorySceneId` : arrivée sur la scène cible → écran victoire.
- [ ] `gameOverSceneId` : entrée sur la scène cible → modale Game Over ; expiration timer / pression locale avec navigation si configurée.
- [ ] Bouton « Rejouer » : redémarrage propre.
- [ ] Save/load JSON + bundle `.escapegame` : paramètres conservés.
- [ ] FR/EN : labels/messages corrects dans chaque langue.
- [ ] Aucune régression visible sur selector, inventaire, SFX, transitions.

---

## Orientation produit (discussion, sans calendrier)

- **Pause ajout de grosses fonctions** : produit déjà riche ; polish UI et tests manuels peuvent suffire pendant un temps.
- **Chemin B — graphe nodal** : intérêt pédagogique pour un **vrai** graphe (au-delà de Drawflow). **React Flow** (ou équivalent) reste l’option documentée dans `docs/PLAN_EDITEUR_NODAL.md` / `docs/ARCHITECTURE.md` : **remplacer la couche « vue graphe »** en gardant **`EditorCore` + JSON V2** comme contrat ; le formulaire liste / panneau latéral peut rester l’éditeur détaillé — pas besoin de « tout casser » le pipeline `project.json` / `.escapegame` / génération joueur.

**Quand ce chantier redémarrera** : spike ou PR dédiée (build tool si besoin, montage dans la modale carte, lecture depuis `getCurrentProjectData()`, puis aller-retour minimal graphe ↔ DOM / sélection comme aujourd’hui).
