# Journal chantier C10 — Autonomie carte nodale

> **Statut** : journal archivé (clôture 2026-05-07). Synthèse livrée :
> **Annexe B — C10** dans `.cursor/rules/NODAL_MAP_SPEC.mdc` (spec **v1.9**).

---

## Annexe D — Chantier C10 *(archivée 2026-05-07)*

> **Historique** — contenu de l’Annexe D **vivante** au moment de la
> clôture ; conservé tel quel pour référence (plans, audits, journal).
> Ne plus éditer sous ce format dans la spec principale.

**Date d'ouverture** : 2026-05-06.
**Branche** : `feat/c10-autonomy` (depuis `feat/nodal-map`).
**Statut** : cadrage validé (Q-C10-1 → Q-C10-bis-4) — **C10.0**
complété (audit ci-dessous, 2026-05-06).

### Scope figé

Synthèse des décisions issues de la phase questions (Claude ↔ user,
2026-05-06) :

- **Périmètre élargi** : les 3 axes A/B/C de §7 → C10 sont **tous**
  couverts dans ce chantier. Le chantier **C6.1** (désactivation
  legacy) est **absorbé** dans **C10.4** ; il ne reste plus de chantier
  C6.1 séparé après C10.
- **Audit chiffré obligatoire avant code** : sous-chantier **C10.0**
  doc-only, produit le tableau `champ legacy ↔ store nodal ↔ flush
  DOM ↔ project.json V2` qui figera le sous-découpage `C10.2.a → .x`.
- **Bouton « Publier »** : ajouté dans le bas de la palette latérale,
  entre `[Charger]` et le bouton actuellement nommé `[Formulaire]`
  (renommé `[Vérifier]` en C10.3). Ouvre une modale unique
  **« Publication du jeu »**.
- **Modale « Publication du jeu »** : 3 boutons —
  - **HTML autonome** (appel `generateGame()`).
  - **ZIP web hors-ligne** (appel `exportGameWebZip()`).
  - **Déployer** (placeholder `disabled`, branché en C11).
  - *Note libellé* : remplacer « jeu » par « visite » quand un mode
    « visite virtuelle » sera configuré (cf. C15) — détail UX, pas une
    règle dure de C10.
- **Flush DOM** : passage du périodique 8 s à **flush-on-demand** aux
  points d'entrée DOM-reading (clic `[Publier]`, clic `[Vérifier]`,
  sauver `.escapegame`, et tout autre point découvert pendant l'audit).
  **Suppression complète** du `setInterval` 8 s. Indicateur
  « chargement en cours » dans la modale tant que le flush + l'export
  ne sont pas terminés.
- **Modale « Paramètres globaux »** : la modale placeholder déjà
  accessible depuis le **haut** de la palette (avec actuellement seul
  le sous-onglet *popup theme* branché) devient le point d'entrée
  unique pour l'ensemble des paramètres globaux. Sections internes
  organisées par groupe métier — sous-découpage figé après C10.0.
- **Sérialisation** : nouveau sous-objet `meta.settings` regroupant
  `audio`, `timer`, `endScreens`, `popupTheme`, `inventoryGlobal`,
  `language`, `theme`, et tout champ révélé par l'audit. **Pas** de
  champs plats sur `ProjectMeta`.
- **Source de vérité pendant la transition** : tout-ou-rien
  (Q-C10-B-3 b). Le DOM legacy reste éditable jusqu'à C10.4 ;
  l'utilisateur s'engage à ne pas y toucher pendant les sous-chantiers
  C10.0 → C10.3. Pas de bandeau intermédiaire par champ.
- **Ouverture par défaut** (C10.3) : `editeur.html` / `editor_en.html`
  bootstrappent directement sur la carte nodale. Bouton `[Formulaire]`
  renommé `[Vérifier]`, conservé comme toggle vers la vue legacy en
  lecture seule (debug rapide).
- **Upload média local** (C10.5, inséré post-cadrage initial) :
  bouton d'upload local pour images + audio dans toutes les popups
  carte consommatrices d'URL média (panorama scène, hotspot icon,
  audio/image media nodes, audio global, inventaire icon). **Précondition
  à C10.4** — sans cette fonction côté carte, désactiver le formulaire
  priverait l'utilisateur de l'upload local (seul accessible via
  legacy aujourd'hui).
- **Désactivation legacy** (C10.4, absorbe C6.1) : bandeau « Vue de
  vérification — l'édition se fait via la carte nodale » + tous
  inputs/textareas/selects/buttons d'édition `disabled`. Renommage
  bouton `[Formulaire]` → `[Vérifier]` côté palette. Vue de
  vérification §0.2 règle 2. **Pré-requis : C10.5 livré.**
- **Hors scope C10** : migration des `.escapegame` pré-existants (la
  fusion `feat/nodal-map` → `main` n'arrivera qu'après C11, donc pas
  de version publiée à préserver) ; refonte palette latérale (on
  ajoute juste un bouton).
- **Découvert pendant C10.0 / C10.2 — à formaliser en chantiers
  futurs** :
  - **C18 candidat — Aperçu de scène + placement coords hotspots** :
    aperçu scène 360° (image preview du panorama, cible nœud
    **s-box**) + modale placement coords hotspots (cible satellite
    **`coords-options`**).
  - **C19 candidat — Audio preview / écouter** : bouton lecture sur
    les inputs URL audio (popup audio global C10.2.d + audio media
    nodes) pour permettre le pré-mix volumes en authoring.
  - **C20 candidat — Aperçus latéraux globaux** : aperçu inventaire
    HUD dans `InventoryGlobalSettingsPopup`, aperçu écran
    Game Over / Victory dans `EndScreensSettingsPopup` (avec
    application du thème popup), et autres aperçus pertinents.
    L'item **C10.2.b-fix** (preview inventaire + retrofit pattern
    visible+disabled au lieu de masquage) s'absorbe ici.
  - **C21 candidat — End-screens scene-level** : refonte UX game
    over / victory — clic droit scène → « Définir comme victoire » /
    « Définir comme défaite », multi-scènes possibles, chacune
    personnalisable. Rendrait obsolète C10.2.f dans sa forme actuelle
    (sélecteur global). À cadrer ultérieurement.
  Numéros candidats à figer à l'ajout effectif des chantiers en §7
  (cf. §5 du briefing CLAUDE.md).
- **Découpage hiérarchique illimité** : convention `C10.n` pour les
  grands sous-chantiers, `C10.n.a / .b / .c …` pour les modules à
  l'intérieur. Pas de plafond — l'utilisateur est ouvert à du
  sous-découpage fin si l'audit le justifie.

### Stratégie de découpage

| # | Périmètre | Dépend de | Type |
|---|---|---|---|
| **C10.0** | Audit globals — tableau exhaustif champ legacy ↔ store nodal ↔ flush DOM ↔ project.json V2, dans Annexe D | — | **doc-only — livré** |
| **C10.1** | Bouton `[Publier]` palette + modale « Publication du jeu » (HTML autonome + ZIP web + placeholder Deploy) + flush synchrone garanti + suppression flush périodique 8 s | C10.0 (recommandé : repérer les autres points DOM-reading à équiper) | code |
| **C10.2** | Rapatriement paramètres globaux dans la modale « Paramètres globaux » + extension `meta.settings`. Sous-découpage `C10.2.a → .x` figé après C10.0 (probable : end-screens, timer, audio, popup theme, inventaire, langue, thème) | C10.0 | code |
| **C10.3** | Ouverture par défaut sur la carte nodale (default landing au load page) | C10.2 | code |
| **C10.5** | Upload média local (images + audio) — boutons file picker dans toutes les popups carte consommatrices d'URL média (inséré post-cadrage initial) | C10.3 | code |
| **C10.4** | Désactivation legacy + bandeau « Vue de vérification » + renommage `[Formulaire]` → `[Vérifier]` ; absorbe **C6.1** | C10.5 (l'autonomie nécessite l'upload local pour vraiment fermer la porte legacy) | code |

### Décisions de design

- **Stockage `meta.settings`** : sous-objet structuré dans `ProjectMeta`
  pour préserver la lisibilité du type principal et faciliter une
  migration future (ajout/retrait de paramètres). Sérialisé dans
  `project.json` V2 sous `meta.settings`.
- **Réutilisation `nodalQuillTheme` (C7.6)** : pour tous les textes
  riches HTML (end-screens body, popups globales, etc.), réutiliser
  le wrapper `.nodal-quill-theme` posé en C7.6. Si une factor commune
  émerge entre les sections globales, l'inscrire dans le plan détaillé
  du sous-chantier C10.2.x concerné (refactoring opportuniste, §8.3).
- **Pattern modal palette** : la modale « Publication du jeu » et la
  modale « Paramètres globaux » suivent le même pattern UI (titre,
  body sectionné, boutons d'action en bas, fermeture par croix +
  Échap). Si un composant commun n'existe pas encore, le créer en
  C10.1 et le réutiliser en C10.2.
- **Flush-on-demand vs périodique** : raison du choix « jamais »
  (Q-C10-bis-3) — un flush = une intention utilisateur. Plus prévisible
  qu'un timer, élimine les races de timing pendant les exports, et
  trivial à compléter si une régression révèle un point DOM-reading
  oublié (ajouter un appel `flushNodalStoreToEditorDom()` au point
  d'entrée concerné).
- **Bouton `[Publier]` plutôt que `[Générer]`** : terme plus neutre,
  couvre HTML autonome + ZIP web + Deploy futur. Cohérent avec le
  titre de la modale « Publication du jeu ».
- **Renommage `[Formulaire]` → `[Vérifier]`** (C10.3) : signale le
  changement de rôle (édition → vérification read-only) tout en
  préservant l'accessibilité au formulaire pour debug.
- **Préservation des aperçus live (contrainte C10.2.c)** : la
  migration `playerPopupTheme` (slice racine du store) →
  `meta.settings.popupTheme` doit préserver la réactivité live des
  aperçus DOM (`#popup-preview-*` se met à jour à chaque changement
  via `projectPlayerPopupThemeToDom`). Les sélecteurs Zustand sur
  `meta.settings.popupTheme.*` doivent déclencher le re-render avec
  la même fréquence que le slice actuel (probablement OK — Zustand
  shallow compare par défaut). À expliciter dans le plan détaillé
  C10.2.c et à valider par recette manuelle (saisie couleur popup
  dans la modale Paramètres globaux → aperçu mis à jour sans délai).

### Plan détaillé C10.0 — directives pour Cursor

**Pré-requis** : aucun (premier sous-chantier de C10). Branche
`feat/c10-autonomy` créée et active.

**Contexte** : §7 → C10 axe B mentionne explicitement « inventaire
des champs globaux du formulaire legacy à dresser au démarrage ». C10.0
livre cet inventaire dans **Annexe D** (nouvelle section
`### Audit globals (C10.0)`). Le tableau produit est le **fil
directeur** de tout le chantier C10 : il fige le sous-découpage
`C10.2.a → .x` (rapatriement des globals) et révèle les points
d'entrée DOM-reading à équiper d'un flush synchrone en C10.1. **Aucun
code ne doit être modifié dans ce sous-chantier** — C10.0 est
strictement doc-only.

**Fichiers à lire avant de coder** :

- `editeur.html` et `editor_en.html` — sections `#global-settings`,
  `#global-sub-inv-body`, `#global-sub-popup-body`,
  `#global-sub-audio-body`, `#global-sub-timer-body`, end-screens
  (`#endGameOver*`, `#endVictory*`), titre, langue, thème, et tout
  autre champ d'entrée trouvé hors `#scenes-container`.
- `js/editeur-app.js` et `js/editor-en-app.js` — recherche `id=` →
  lecture/écriture des champs globaux ; chercher
  `flushNodalStoreToEditorDom` pour repérer tous les points d'appel
  actuels.
- `js/editor-shared-nodal-to-dom.js` — implémentation du flush :
  inventorier précisément quels champs globaux sont projetés par le
  miroir aujourd'hui (pour la colonne « Flush DOM ? »).
- `js/editor-shared-bundle.js` — exposition de l'API
  `EditorSharedBundleApi`.
- `xflow/react/src/model/project.ts` — type `ProjectMeta` actuel.
- `xflow/react/src/serialize/fromProjectJson.ts` et `toProjectJson.ts`
  — sérialisation/désérialisation `project.json` V2 (pour la colonne
  « project.json V2 ? »).
- `js/editeur-generate.js` et `js/editor-en-generate.js` —
  `generateGame()`, points de lecture du DOM (utile pour C10.1).
- Module `exportGameWebZip` (chercher dans `js/` — utile pour C10.1).

**Phase questions (workflow §8.1)** — Cursor doit poser ses propres
**Q-C10.0-Y** avant de produire l'audit. Pistes :

- **Q-C10.0-1** — Granularité du tableau : un row par `id` HTML, ou un
  row par **champ logique** (un row pour `globalAudioUrl` +
  `globalAudioVol` regroupés sous « audio global ») ? *Vote : par champ
  logique, avec mention des `id` HTML en sous-puce — plus lisible pour
  le découpage C10.2.x.*
- **Q-C10.0-2** — Faut-il aussi inventorier les champs **runtime**
  consommés par le jeu généré (au-delà du formulaire d'authoring) ?
  *Vote : non, scope authoring uniquement — les consommateurs runtime
  ne sont pas modifiés en C10.*
- **Q-C10.0-3** — Cas particulier `meta.startSceneId` (déjà géré
  C8.3) : à inclure dans le tableau pour la complétude, ou à mentionner
  comme « déjà OK, hors scope C10 » ? *Vote : à inclure pour la
  complétude — sert de référence d'un champ déjà rapatrié.*

**Périmètre** :

- Recenser **toutes** les sections globales du formulaire legacy
  (FR + EN). Liste de départ (à compléter par lecture exhaustive du
  HTML) :
  - Inventaire global (`#global-sub-inv-body`).
  - Popup theme global (`#global-sub-popup-body`).
  - Audio global (`#global-sub-audio-body` — `#globalAudioUrl`,
    `#globalAudioVol`, etc.).
  - Timer global (`#global-sub-timer-body`).
  - End-screens game over (`#endGameOverTitle`, `#endGameOverBody`,
    `#endGameOverBtn`).
  - End-screens victory (`#endVictoryTitle`, `#endVictoryBody`,
    `#endVictoryBtn`).
  - Titre du projet, langue, thème visuel global, mode
    (escape vs visite), tout champ système restant.
- Pour chaque champ logique, produire 4 colonnes :
  - **Champ legacy** (libellé + `id` HTML — sous-puces).
  - **Store nodal** (chemin actuel ou `manquant`). Doit refléter
    la nouvelle convention `meta.settings.<group>.<field>` même si
    le champ est aujourd'hui ailleurs (proposition de cible).
  - **Flush DOM** (`oui` / `non` — projeté par
    `flushNodalStoreToEditorDom` aujourd'hui ?).
  - **`project.json` V2** (chemin sérialisé actuel ou `manquant`).
- Identifier les **dépendances** entre champs (ex. checkbox
  d'activation timer qui conditionne d'autres champs) en notes sous
  le tableau.
- Identifier les **points DOM-reading** existants (clic « Générer le
  jeu » legacy, sauver `.escapegame`, etc.) pour préparer l'inventaire
  des appels `flushNodalStoreToEditorDom` à poser en C10.1.
- Insérer le tout dans **Annexe D** sous une nouvelle section
  `### Audit globals (C10.0)`, juste avant `### Plan détaillé C10.1`.
- **Proposer** un sous-découpage `C10.2.a → .x` basé sur les
  regroupements logiques révélés par l'audit. Format : liste à puces
  sous le tableau, avec dépendances entre sous-modules. *Le découpage
  proposé sera validé en phase questions C10.1 avant toute écriture
  des plans détaillés C10.2.x.*

**Critères de fin** :

- Tableau exhaustif (relire le HTML legacy section par section ; pas
  de section globale oubliée).
- Sous-découpage `C10.2.a → .x` proposé sous le tableau.
- Liste des points DOM-reading à équiper d'un flush en C10.1 (au
  minimum : clic Publier, clic Vérifier, sauver `.escapegame` ; à
  compléter).
- Aucun fichier code touché (commit doc-only sur Annexe D + Journal
  de chantier).

**Branche / commit** :

- Branche : `feat/c10-autonomy`.
- Commit : `docs(nodal): C10.0 audit globals (Annexe D)`.
- Annexe D — Journal de chantier mis à jour (entrée 1-2 lignes citant
  la complétion C10.0 et le sous-découpage C10.2.x proposé).

### Audit globals (C10.0)

**Phase questions C10.0 (réponses)**

- **Q-C10.0-1** — Granularité : **un rang par champ logique**, avec les
  `id` HTML listés en sous-puces dans la colonne « Champ legacy ».
- **Q-C10.0-2** — Périmètre : **authoring uniquement** (formulaire +
  sérialisation éditeur) ; pas d’inventaire des champs runtime purs du
  HTML joueur généré.
- **Q-C10.0-3** — `meta.startSceneId` / `startSceneId` export : **inclus**
  comme ligne de référence (déjà rapatrié côté nodal + flush via ordre
  des blocs scène).

**Sources relues** : `editeur.html` / `editor_en.html` (`#editor-global-root`,
`#global-settings` … hors `#scenes-container`) ; `js/editor-shared-project-serialization.js`
(`getCurrentProjectData`) ; `js/editor-shared-timer.js` (`readTimerSettingsFromDom`) ;
`js/editor-shared-nodal-to-dom.js` (`applyFromStore` → scènes + `projectPlayerPopupThemeToDom`) ;
`js/editor-shared-bundle.js` (`flushNodalStoreToEditorDom`) ;
`xflow/react/src/model/project.ts` (`ProjectMeta`) ;
`xflow/react/src/serialize/toProjectJson.ts` (`serializeToProjectJson` / `ProjectJsonV2`) ;
`xflow/react/src/serialize/mapLayoutJson.ts` (`MapLayoutJson.nodalPlayerPopupTheme`, …) ;
`xflow/react/src/editor-map-main.tsx` (`serializeForBundle`) ;
`js/editor-core.js` (`createEmptyProject`) ; `js/editeur-generate.js` /
`js/editor-en-generate.js` (`generateGame`, `exportGameWebZip`) ;
`js/editeur-app.js` / `js/editor-en-app.js` (`saveProject`, `saveProjectBundle`,
`window.__escape360NodalChrome`, chargement bundle).

**Convention colonne « Store nodal »** : cible long terme **C10**
`meta.settings.<groupe>.<champ>` lorsque le champ n’existe pas encore dans
le store ; aujourd’hui le store Zustand expose surtout `meta.*`,
`scenes` / `actions` / `edges` / `layout` / `media` / `satellites` /
`sceneBoxes`, plus **`playerPopupTheme`** (racine du state étendu, hors
`ProjectMeta` — voir `nodalProjectStore.ts`).

**Convention colonne « `project.json` V2 »** : distinguer (1) le
**JSON métier minimal** écrit dans le bundle `.escapegame` comme
`project.json` via `serializeToProjectJson` (type `ProjectJsonV2` :
`schemaVersion`, `title`, `startSceneId`, `scenes[]`) ; (2) le
**JSON éditeur complet** `EditorCore` / `getCurrentProjectData` (champs
plats historiques : `useInv`, `timer`, `endScreens`, …) pour export
`.json` legacy. Les extensions nodales hors `ProjectJsonV2` sont dans
`map-layout.json` (ex. `nodalPlayerPopupTheme`).

| Champ legacy (libellé + `id` / mécanisme) | Store nodal (actuel → cible `meta.settings`) | Flush DOM (`flushNodalStoreToEditorDom`) | `project.json` / persistance |
| --- | --- | --- | --- |
| **Titre du projet** — `#gameTitle` | `meta.title` → `meta.settings.project.title` (option cohérence) | non | (1) `title` racine. (2) idem champs plats legacy. |
| **Scène de départ** — priorité `__ESCAPE360_NODAL_STORE__` dans `getCurrentProjectData` ; pas d’`id` global dédié (ordre `#scenes-container` + C8.3) | `meta.startSceneId` (id interne) + `scenes[id].sceneId` (externe) | **oui** (réordonnancement + projection scènes / hotspots) | (1) `startSceneId` (externe). (2) `startSceneId` legacy. |
| **Inventaire — activer** — `#useInventory` | manquant → `meta.settings.inventoryGlobal.enabled` | non | (2) `useInv`. (1) **manquant** bundle. |
| **Inventaire — position** — `#inv-pos` | manquant → `meta.settings.inventoryGlobal.position` | non | (2) `invPos`. (1) manquant. |
| **Inventaire — icône** — `#inv-icon` | manquant → `meta.settings.inventoryGlobal.icon` | non | (2) `invIcon`. (1) manquant. |
| **Inventaire — fond** — `#inv-bgc`, `#inv-bga` | manquant → `meta.settings.inventoryGlobal.panelBg` / `panelBgAlpha` | non | (2) `invBgc`, `invBga`. (1) manquant. |
| **Inventaire — couleur texte** — `#inv-color` | manquant → `meta.settings.inventoryGlobal.textColor` | non | (2) `invColor`. (1) manquant. |
| **Popups — activer thème perso** — `#useCustomPopup` | `playerPopupTheme.useCustomPopup` (slice store) → `meta.settings.popupTheme.useCustom` | **oui** (`projectPlayerPopupThemeToDom`) | (2) `useCustomPopup`. (1) manquant ; **(3)** `map-layout.json` → `nodalPlayerPopupTheme.useCustomPopup`. |
| **Popups — police / couleurs** — `#pop-font`, `#pop-color`, `#pop-bgc`, `#pop-bga`, `#pop-btn-bg`, `#pop-btn-col` | idem slice → `meta.settings.popupTheme.*` | **oui** | (2) champs `popFont` … `popBtnCol`. (1) manquant ; **(3)** `nodalPlayerPopupTheme`. |
| **Audio global — activer** — `#useGlobalAudio` | manquant → `meta.settings.audio.enabled` | non | (2) `useGlobalAudio`. (1) manquant. |
| **Audio global — URL / volume** — `#globalAudioUrl`, `#globalAudioVol` (`#globalAudioVolVal` affichage) | manquant → `meta.settings.audio.url` / `volume` | non | (2) `globalMusic` {url,volume} (+ alias `globalAudioUrl`). (1) manquant. |
| **Timer — activer** — `#useTimer` | manquant → `meta.settings.timer.enabled` | non | (2) `timer.enabled`. (1) manquant. |
| **Timer — mode / durée / options** — `#timerMode`, `#timerStartSeconds`, `#timerAutoStart`, `#timerPauseOnPopup` | manquant → `meta.settings.timer.mode` / `startSeconds` / `autoStart` / `pauseWhenPopupOpen` | non | (2) sous-objet `timer`. (1) manquant. |
| **Sauvegarde progression joueur** — `#playerSaveMode` | manquant → `meta.settings.playerSave.mode` | non | (2) `playerSave.mode`. (1) manquant. |
| **Fin victoire — scène déclenchante** — `#victorySceneId` | manquant → `meta.settings.endScreens.victorySceneExternalId` | non | (2) `victorySceneId`. (1) manquant. |
| **Fin défaite — scène déclenchante** — `#gameOverSceneId` | manquant → `meta.settings.endScreens.gameOverSceneExternalId` | non | (2) `gameOverSceneId`. (1) manquant. |
| **Écran Game Over (modale)** — `#endGameOverTitle`, `#endGameOverBody`, `#endGameOverBtn` | manquant → `meta.settings.endScreens.gameOver.*` | non | (2) `endScreens.gameOver.{title,bodyHtml,buttonLabel}`. (1) manquant. |
| **Écran Victoire (modale)** — `#endVictoryTitle`, `#endVictoryBody`, `#endVictoryBtn` | manquant → `meta.settings.endScreens.victory.*` | non | (2) idem `endScreens.victory.*`. (1) manquant. |

**Champs hors périmètre « paramètres du jeu »** (hors tableau principal) :
aperçus `#preview-inv-*`, `#preview-pop-*` (dérivés DOM) ; modales
outil `#picker-modal`, `#scene-preview-modal` ; chrome carte
`#project-map-*`, `#project-map-narration-only` (filtre d’affichage
graphe, pas donnée projet). Les **timers locaux par scène** et leurs
`class="sc-timer-override-*"` restent dans `#scenes-container` (hors
C10.0 globals).

**Dépendances entre champs**

- `#useInventory` masque / affiche `#inv-settings-container` et les
  sous-champs inventaire.
- `#useCustomPopup` masque / affiche `#popup-settings-container` et les
  `#pop-*`.
- `#useGlobalAudio` masque / affiche `#audio-settings-container`.
- `#useTimer` masque / affiche `#timer-settings-container`.
- `#victorySceneId` / `#gameOverSceneId` : options peuplées depuis les
  scènes du projet (liste `sel-endstate-scene`).
- Rich text `#endGameOverBody` / `#endVictoryBody` : `flushRichEditorsIn`
  sur `#end-screens-form-container` avant lecture dans
  `getCurrentProjectData`.

**Points DOM-reading** — à garantir avec **flush synchrone** en **C10.1**
(compléter si de nouveaux appels apparaissent) :

- `getCurrentProjectData()` — utilisé pour tout export qui repasse par
  le legacy : **`saveProject()`** (JSON plein), **`generateGame()`**,
  **`exportGameWebZip()`**, **`buildPlayerHtmlTemplate()`** (via
  `getCurrentProjectData` dans generate), **captures brouillon local**
  (`editor-shared-local-draft.js` → `getCurrentProjectData`).
- **`saveProject()`** (barre d’outils) : **pas** de `flushNodalStoreToEditorDom`
  aujourd’hui — risque majeur si édition uniquement nodale.
- **`saveProjectBundle()`** (barre d’outils) : **ne lit pas** le DOM pour
  le graphe ( `serializeForBundle` ) ; les **globals** hors nodal ne sont
  **pas** dans `project.json` du bundle — rattrapage prévu C10.2 ; le
  pont palette **`window.__escape360NodalChrome.saveEscapegameBundle`**
  fait déjà un flush avant sauvegarde.
- Après **hydrate bundle** nodal : `flushNodalStoreToEditorDom` déjà appelé
  (`*-app.js` chargement `.escapegame`).
- **Périodique** : `editor-nodal-map-bootstrap.js` (`NODAL_DOM_SYNC_MS =
  8000`) — à **supprimer** en C10.1 au profit du flush on-demand.

**Sous-découpage `C10.2.a` → `.x` proposé** (validation phase questions
C10.1 avant rédaction des plans détaillés) :

- **C10.2.a** — Titre / identité projet (`gameTitle` ↔ `meta.title` /
  racine `ProjectJsonV2`) — peu de dépendances.
- **C10.2.b** — Inventaire HUD (`useInventory`, `inv-*`) — dépend listes
  scène uniquement pour cohérence visuelle (aperçu).
- **C10.2.c** — Thème popups joueur (déjà partiellement nodal +
  `nodalPlayerPopupTheme`) — **dépend** de C7.6 / Quill theme si textes
  riches ajoutés plus tard ; aujourd’hui champs simples.
- **C10.2.d** — Audio global (`useGlobalAudio`, `globalAudioUrl`,
  `globalAudioVol`) — indépendant.
- **C10.2.e** — Timer global (`useTimer`, `timer*`, `#playerSaveMode`) —
  dépend C10.2.f pour cohérence UX modale « Paramètres globaux » mais
  pas techniquement sur les données fin de partie.
- **C10.2.f** — Fin de partie : scènes `victorySceneId` /
  `gameOverSceneId` + textes modales `end*` — **dépend** des ids de
  scène exportés (lien `meta.startSceneId` / liste scènes).
- **C10.2.g** — Alignement sérialisation : étendre `serializeToProjectJson`
  / hydrate et **ou** documenter le mapping `meta.settings` ↔ JSON
  legacy / bundle — **transversal** ; clôt après a–f ou en parallèle
  contrôlé (évite double vérité).

### Plan détaillé C10.1 — directives pour Cursor

**Pré-requis** : C10.0 livré (audit globals dans Annexe D présent ;
tableau de mapping et inventaire des points DOM-reading disponibles
pour référence). Branche `feat/c10-autonomy` active.

**Contexte** : C10.1 livre l'**infrastructure de publication** depuis
la carte nodale et **rationalise les flush DOM**. Trois axes en un
seul commit :

1. **Suppression du flush périodique 8 s** (`NODAL_DOM_SYNC_MS` dans
   `editor-nodal-map-bootstrap.js`) au profit d'un **flush-on-demand**
   garanti aux points d'entrée DOM-reading identifiés par C10.0.
2. **Création d'un composant modale palette commun** (`PalettePopupModal`)
   réutilisable par « Publication du jeu » (ce sous-chantier) et
   « Paramètres globaux » (C10.2).
3. **Bouton `[Publier]`** dans le bas de la palette + **modale
   « Publication du jeu »** exposant les 3 chemins de publication :
   HTML autonome, ZIP web hors-ligne, Déployer (placeholder C11).

**Trouvaille critique C10.0 corrigée ici** : `saveProject()` (barre
d'outils legacy) ne fait actuellement **pas** d'appel
`flushNodalStoreToEditorDom()` avant la lecture du DOM. Risque de
perte silencieuse de modifications en cas d'édition uniquement nodale.
C10.1 ferme ce trou en équipant **tous** les points DOM-reading
recensés par l'audit.

**Fichiers à lire avant de coder** :

- `xflow/react/src/editor-nodal-map-bootstrap.js` — `NODAL_DOM_SYNC_MS
  = 8000` et `setInterval` à supprimer.
- `js/editor-shared-bundle.js` — `flushNodalStoreToEditorDom`,
  `EditorSharedBundleApi` (point de contact carte nodale → legacy).
- `js/editeur-app.js` / `js/editor-en-app.js` — `saveProject`,
  `saveProjectBundle`, et tous les points qui appellent
  `getCurrentProjectData` directement ou indirectement.
- `js/editeur-generate.js` / `js/editor-en-generate.js` —
  `generateGame()`, `exportGameWebZip()`.
- `js/editor-shared-local-draft.js` — capture brouillon local.
- `xflow/react/src/view/palette/NodePalette.tsx` — structure de la
  palette (zone bas avec `[Sauver]` / `[Charger]` / `[Formulaire]` ;
  modale « Paramètres globaux » placeholder existante en haut pour
  référence du pattern modale).
- Modales C7.2/C7.3 (popups d'actions) — pattern fermeture Échap +
  overlay + focus trap.

**Phase questions (workflow §8.1)** — Cursor doit poser ses propres
**Q-C10.1.x-Y** avant de coder. Pistes :

- **Q-C10.1.x-1** — Composant modale palette commun :
  *(a)* nouveau fichier `xflow/react/src/view/palette/PalettePopupModal.tsx`
  factorisant le placeholder existant ;
  *(b)* copier le pattern d'une modale C7.2 popup d'action ;
  *(c)* wrapper sur une lib externe.
  *Vote : (a) — réutilisé immédiatement en C10.2 sur la modale
  Paramètres globaux ; pas de dépendance externe nécessaire.*
- **Q-C10.1.x-2** — Indicateur loading pendant `flush + export` :
  *(a)* overlay semi-transparent sur la modale avec spinner ;
  *(b)* état désactivé des 3 boutons + label « Génération… » ;
  *(c)* les deux.
  *Vote : (b) — moins intrusif, suffisant si le flush+export reste
  rapide (<2 s en pratique). Si l'export prend > 2 s on bascule sur
  (c) en fix de suivi.*
- **Q-C10.1.x-3** — `exportGameWebZip()` exposition :
  *(a)* `window.exportGameWebZip` (parallèle à `generateGame`) ;
  *(b)* nouvelle entrée de `EditorSharedBundleApi`.
  *Vote : (b) — le bridge `EditorSharedBundleApi` est déjà le point
  de contact carte nodale → legacy ; éviter la pollution `window`.*
- **Q-C10.1.x-4** — Position exacte du bouton `[Publier]` dans
  `NodePalette.tsx` : entre `[Charger]` et `[Formulaire]`. Lever le
  slot exact (ordre des items en zone bas) avant l'insertion.
- **Q-C10.1.x-5** — Libellés bilingues. FR : « Publication du jeu » /
  « HTML autonome » / « ZIP web hors-ligne » / « Déployer ». EN :
  Cursor propose les pendants en cohérence avec la palette EN
  existante (ex. « Publishing » / « Standalone HTML » / « Offline
  web ZIP » / « Deploy »).

**Périmètre** :

1. **Suppression du flush périodique** :
   - Retirer la constante `NODAL_DOM_SYNC_MS` et le `setInterval`
     correspondant dans `editor-nodal-map-bootstrap.js`.
   - Vérifier qu'aucun autre fichier n'instaure un flush périodique
     parallèle (grep `setInterval.*flush` ou similaire).

2. **Flush-on-demand garanti** sur tous les points DOM-reading recensés
   par l'audit C10.0 :
   - **`saveProject()`** (FR + EN) : ajouter
     `flushNodalStoreToEditorDom()` synchrone avant la lecture du DOM
     (= **fix sécurité** identifié C10.0).
   - **`generateGame()`** (FR + EN) : confirmer la présence du flush ;
     ajouter si absent.
   - **`exportGameWebZip()`** (FR + EN) : idem.
   - **`editor-shared-local-draft.js`** (capture brouillon) : ajouter
     flush avant `getCurrentProjectData` si absent.
   - **`buildPlayerHtmlTemplate()`** : indirect via
     `getCurrentProjectData`, OK si le caller flush.
   - **`saveProjectBundle()`** : pas concerné (utilise
     `serializeForBundle`, ne lit pas le DOM legacy) — laisser inchangé.
   - Documenter la liste finale des callsites en commentaire
     au-dessus de la déclaration `flushNodalStoreToEditorDom`.

3. **Composant modale palette commun** `PalettePopupModal` :
   - Props : `title: string`, `isOpen: boolean`, `onClose: () => void`,
     `children: ReactNode` (body), `footerActions?: ReactNode` (boutons
     en bas optionnels).
   - Fermeture par **Échap** + clic overlay + bouton croix (cohérent
     C8.2 Échap global — vérifier qu'on ne casse pas le hook
     `isEditingContext`).
   - Focus trap basique (focus initial sur le titre ou le premier
     bouton ; restauration du focus à la fermeture).
   - Style cohérent avec la palette latérale.
   - Pas de dépendance externe sauf si déjà présente.

4. **Bouton `[Publier]`** dans `NodePalette.tsx` :
   - Position : zone bas, **entre `[Charger]` et `[Formulaire]`**
     (cf. Q-C10.1.x-4).
   - Icône + label « Publier » / « Publish ».
   - Ouvre la modale « Publication du jeu » au clic.

5. **Modale « Publication du jeu »** :
   - Titre : « Publication du jeu » (FR) / EN à confirmer
     Q-C10.1.x-5.
   - 3 boutons d'action en liste verticale ou grille 1×3 :
     - **HTML autonome** — flush + appel `generateGame()`
       (`window.generateGame`).
     - **ZIP web hors-ligne** — flush + appel `exportGameWebZip()`
       via `EditorSharedBundleApi` (Q-C10.1.x-3).
     - **Déployer** — `disabled` + tooltip « Disponible avec C11 ».
   - Indicateur loading (Q-C10.1.x-2) pendant `flush + export`.
   - Bouton fermeture (croix + Échap) toujours actif (même pendant
     l'export — l'export peut continuer en arrière-plan, à confirmer
     par recette).

6. **Pas de migration `playerPopupTheme`** : reportée à **C10.2.c**
   (cf. Décisions de design — contrainte live preview).

**Critères de fin** :

- `editor-nodal-map-bootstrap.js` ne contient plus de `setInterval`
  ni de constante `NODAL_DOM_SYNC_MS` (relire le fichier après edit
  pour confirmer).
- `saveProject()` (FR + EN) appelle `flushNodalStoreToEditorDom()`
  avant la lecture DOM (vérifier par lecture de code après edit ;
  écrire un commentaire en début de fonction listant la garantie).
- `generateGame()` et `exportGameWebZip()` (FR + EN) idem.
- `editor-shared-local-draft.js` idem.
- Bouton `[Publier]` visible dans la palette FR + EN, position entre
  `[Charger]` et `[Formulaire]`.
- Modale s'ouvre, affiche les 3 boutons, ferme par croix + Échap +
  clic overlay.
- Bouton « Déployer » `disabled` avec tooltip explicite.
- **Tests Vitest** :
  - Rendering du composant `PalettePopupModal` (titre, fermeture par
    Échap, fermeture par clic overlay, focus restoration).
  - Rendering du bouton `[Publier]` ouvrant la modale (mock onClick
    handlers pour `generateGame` / `exportGameWebZip`).
  - Vérification que `flushNodalStoreToEditorDom` est appelé avant
    chaque handler de bouton (mock du flush, expect appelé une fois).
- **Recette manuelle** (à consigner dans le journal de chantier
  Annexe D) : édite nodale → clic `[Publier]` → HTML autonome → ouvrir
  le fichier téléchargé : il contient les modifications **sans** avoir
  attendu de flush périodique.

**Branche / commit** :

- Branche : `feat/c10-autonomy`.
- Commit : `feat(nodal): C10.1 bouton Publier + modale Publication +
  flush-on-demand`.
- Annexe D — Journal de chantier : entrée 2-3 lignes avec liste des
  callsites flush équipés, confirmation suppression périodique, et
  notes de recette manuelle.

### Plans détaillés C10.2.a → C10.2.f — directives pour Cursor

**Ordre d'exécution** validé (Q-C10.1-5) : `.a → .c → .d → .b → .e →
.f`. Chaque sous-chantier = un commit. Sérialisation V2 branchée
**in-line** dans chaque sous-chantier (Q-C10.1-2 (a), pas de `.g`
séparé).

**Conventions communes** (établies en C10.2.a, suivies par .b → .f) :

- **Modèle** : `ProjectMeta.settings: ProjectSettings` (sous-objet
  optionnel `?`) regroupant tous les groupes `inventoryGlobal`,
  `popupTheme`, `audio`, `timer`, `playerSave`, `endScreens`.
  `meta.title` et `meta.startSceneId` restent **flat** (identité
  projet, pas paramètre de jeu — Q-C10.2.a-1 (a)).
- **Store actions** : pour chaque groupe, ajouter une mutation
  `setMetaSettings<Group>(partial: Partial<...>)` au store nodal qui
  fait un merge superficiel + appelle `reconcile*` si pertinent (peu
  probable pour les paramètres globaux).
- **Flush store → DOM** : étendre `applyFromStore` dans
  `js/editor-shared-nodal-to-dom.js` pour projeter chaque champ vers
  son `id` legacy. Lire les valeurs depuis `state.meta.settings.<group>`
  ; si le sous-objet est `undefined` (projet legacy non-migré), ne
  pas toucher au DOM legacy (le formulaire conserve ses valeurs
  d'init).
- **Sérialisation V2** (`serializeToProjectJson` /
  `toProjectJson.ts`) : ajouter `meta.settings.<group>` dans le bundle
  `project.json` lorsque le sous-objet existe. Ne pas écrire
  `meta.settings: {}` vide.
- **Hydrate V2** (`deserializeFromProjectJson`) : lire
  `meta.settings.<group>` si présent ; fallback sur `undefined` (pas
  de valeur par défaut côté store — la modale Paramètres globaux et
  le DOM legacy ont leurs propres valeurs init).
- **UI section** : chaque groupe a une **popup dédiée** (sous
  `xflow/react/src/view/popups/`) ouverte depuis un bouton du hub
  `GlobalSettingsHubPopup` (refondu en **C10.2.a-fix** en liste
  verticale de 6 boutons — voir plan dédié). Le sous-chantier crée
  la popup dédiée + active son bouton dans le hub (retire `disabled`
  + tooltip, branche `onClick`). Le binding popup → store → DOM input
  → `setMetaSettings<Group>(...)` au `onChange`.
- **Bouton Retour générique** (depuis **C10.2.a-fix2**) : toute popup
  hub-origin expose `PalettePopupModal.onBack` qui ferme la popup et
  ré-ouvre le hub `GlobalSettingsHubPopup`. Bouton `[Retour]` /
  `[Back]` en footer-gauche, rendu auto par `PalettePopupModal` quand
  `onBack` est fourni. Pour les futures popups (C10.2.d/e/f),
  intégrer `onBack` dès création.
- **Tests Vitest** par sous-chantier :
  - **Round-trip** : `serialize → deserialize → equality` sur le
    sous-objet `meta.settings.<group>`.
  - **Flush** : mutation store → `applyFromStore` (mocké jsdom DOM)
    → `id` legacy reflète la valeur.
  - **Hydrate** : `project.json` avec `meta.settings.<group>` →
    `deserializeFromProjectJson` → store contient la valeur.
- **Recette manuelle** par sous-chantier (à consigner journal) :
  - Édite valeur dans modale Paramètres globaux → DOM legacy mis à
    jour en live (preuve flush).
  - Édite valeur → `[Sauver .escapegame]` → reload bundle → modale
    re-affiche la valeur (preuve serialize/hydrate).
  - Édite valeur → `[Publier]` → HTML autonome → fichier généré
    contient la valeur (preuve flush + generateGame).

### Plan détaillé C10.2.a — Identité projet (titre) + structure accordion

**Pré-requis** : C10.1 livré (commit `1d3c3f7` : `PalettePopupModal`,
flush-on-demand). Branche `feat/c10-autonomy` active.

**Note post-livraison (2026-05-08)** : pivot UX décidé en revue après
livraison initiale (commit `4d57e99`). Le pattern accordion 6 sections
ajoute un clic inutile pour les sections qui ouvrent juste une popup
secondaire. Décision : passer à un **hub bouton-liste** (cohérent avec
la modale Publication C10.1). Voir le **plan détaillé C10.2.a-fix**
ci-dessous. Ce plan reflète la version *initiale* livrée ; le pivot
est documenté dans son propre plan.

**Contexte** : C10.2.a pose la **fondation** des sous-chantiers
C10.2.b → .f en deux temps :

1. **Restructure** la modale `GlobalSettingsHubPopup` en accordion à
   **6 sections** (`Identité projet`, `Inventaire`, `Thème popups`,
   `Audio`, `Timer & sauvegarde`, `Fins de partie`). Chaque section
   non-active affiche un placeholder « Bientôt — C10.2.x ».
2. **Branche** la section `Identité projet` avec l'unique champ
   `Titre du projet`, lié à `meta.title` (déjà existant ; pas de
   migration vers `meta.settings` — Q-C10.2.a-1 (a)).

Le sous-chantier établit aussi la **convention `meta.settings`**
(type `ProjectSettings` créé vide dans `ProjectMeta`, étendu au fil
des C10.2.b → .f) et la **convention de tests** (round-trip + flush
+ hydrate).

**Section `Thème popups` cas particulier** : actuellement branchée
via le slice racine `playerPopupTheme` (sérialisé `map-layout.json`).
**Conserver le fonctionnement actuel** dans C10.2.a (pas de
migration). La migration `playerPopupTheme` → `meta.settings.popupTheme`
+ déplacement vers `project.json` est faite en **C10.2.c**. Adapter
juste le markup pour fitter dans le nouveau pattern accordion.

**Fichiers à lire avant de coder** :

- `xflow/react/src/model/project.ts` — `ProjectMeta` à étendre avec
  `settings?: ProjectSettings`.
- `xflow/react/src/view/popups/GlobalSettingsHubPopup.tsx` —
  composant à restructurer (chemin réel : `view/popups/`, **pas**
  `view/palette/`).
- `xflow/react/src/view/palette/PalettePopupModal.tsx` — pattern modale
  C10.1 (référence d'usage).
- `xflow/react/src/store/nodalProjectStore.ts` — méthodes
  `updateMeta` ou équivalent (chercher comment `meta.title` est
  actuellement modifié).
- `js/editor-shared-nodal-to-dom.js` — `applyFromStore` (chercher si
  `#gameTitle` est déjà projeté ; sinon ajouter).
- `js/editor-shared-project-serialization.js` —
  `getCurrentProjectData` (lecture `#gameTitle`).
- `editeur.html` / `editor_en.html` — `#gameTitle` (input à miroiter).

**Phase questions (workflow §8.1)** — Cursor pose ses Q-C10.2.a-Y :

- **Q-C10.2.a-1** — Composant accordion : (a) implémentation custom
  inline (sections + chevron, déjà patternisé dans la palette
  latérale C8.1 ?) ; (b) lib externe légère ; (c) `<details>` natif
  HTML5. *Vote : (c) — `<details>` natif suffit, accessibilité
  gratuite, zéro dépendance, animation CSS basique.*
- **Q-C10.2.a-2** — Toutes les sections ouvertes par défaut, ou seule
  la section active (`Identité projet` en C10.2.a) ? *Vote : seule
  la section qui contient des champs branchés ouverte au démarrage ;
  les autres fermées avec placeholder « Bientôt — C10.2.x » visible
  sur titre cliqué.*
- **Q-C10.2.a-3** — Type `ProjectSettings` : (a) tous les champs
  optionnels (`?`) au niveau du sous-objet (`inventoryGlobal?`,
  `popupTheme?`, …) — `meta.settings` est partiellement rempli ;
  (b) tous obligatoires avec valeurs par défaut. *Vote : (a) — le
  legacy actuel n'a pas ces champs dans le store, et tant que la
  migration C10.2.b → .f n'a pas eu lieu, ils sont `undefined`. Plus
  honnête que des valeurs par défaut qui masquent le fait que la
  source de vérité est encore le DOM.*

**Périmètre** :

1. **Étendre `ProjectMeta`** dans `xflow/react/src/model/project.ts`
   avec :
   ```ts
   export type ProjectSettings = {
     inventoryGlobal?: { /* C10.2.b */ };
     popupTheme?: { /* C10.2.c */ };
     audio?: { /* C10.2.d */ };
     timer?: { /* C10.2.e */ };
     playerSave?: { /* C10.2.e */ };
     endScreens?: { /* C10.2.f */ };
   };
   ```
   Ajouter `settings?: ProjectSettings` dans `ProjectMeta`. Les
   commentaires `/* C10.2.x */` indiquent le sous-chantier qui
   remplit chaque sous-objet.

2. **Restructurer `GlobalSettingsHubPopup`** :
   - Wrapper `PalettePopupModal` (titre « Paramètres globaux » /
     « Global settings »).
   - Body : 6 `<details>` (un par groupe), avec `<summary>` cliquable.
   - `Identité projet` : ouvert par défaut, contient un input texte
     « Titre du projet » lié à `meta.title`.
   - `Thème popups` : conserver le contenu actuel (popup theme branché
     via `playerPopupTheme` slice racine — ne pas migrer ici).
   - 4 autres : placeholder « Bientôt — C10.2.b/.d/.e/.f ».

3. **Flush `meta.title` → `#gameTitle`** dans `applyFromStore` :
   - Vérifier si déjà projeté (audit C10.0 disait « non »).
   - Sinon ajouter `el = document.getElementById("gameTitle"); if (el)
     el.value = state.meta.title || "";`.

4. **Sérialisation** : aucune extension nécessaire — `meta.title` est
   déjà sérialisé comme `title` racine dans `ProjectJsonV2`. **Ne
   pas** écrire `meta.settings` dans le bundle si vide (`undefined`
   ou `{}` sans clés).

5. **Hydrate** : aucune extension nécessaire pour le titre. Préparer
   le terrain : `deserializeFromProjectJson` doit lire un éventuel
   `meta.settings` du JSON et le placer dans `state.meta.settings`
   (sera utile à partir de .b).

**Critères de fin** :

- `ProjectMeta` étend bien avec `settings?: ProjectSettings`.
- `GlobalSettingsHubPopup` affiche 6 sections, dont 1 active
  (`Identité projet`) et 5 placeholders.
- L'input « Titre du projet » modifie `meta.title` en live et le DOM
  `#gameTitle` reflète la valeur.
- Test Vitest : rendu des 6 sections + interaction sur l'input titre
  (mutation store + flush DOM mockés).
- Recettes manuelles consignées :
  - Modifie titre dans modale → `#gameTitle` legacy reflète.
  - Modifie titre → `[Sauver .escapegame]` → reload → modale
    re-affiche.
  - Modifie titre → `[Publier]` → HTML autonome contient le titre.

**Branche / commit** :

- Branche : `feat/c10-autonomy`.
- Commit : `feat(nodal): C10.2.a identité projet + accordion modale
  Paramètres globaux`.
- Annexe D — Journal de chantier : entrée 2-3 lignes (structure
  accordion posée, titre branché, conventions `meta.settings`
  établies).

### Plan détaillé C10.2.a-fix — Hub bouton-liste + popup Identité projet

**Pré-requis** : C10.2.a livré (commit `4d57e99` sur `feat/c10-autonomy`
— hub accordion + champ titre branché + conventions `meta.settings`
établies).

**Contexte** : pivot UX post-livraison. L'accordion 6 sections ajoute
un clic inutile pour les sections qui ouvrent juste une popup secondaire
(cas Thème popups : clic accordion → un seul bouton à cliquer →
ouvre la popup réelle = 2 clics au lieu de 1). Le pattern bouton-hub
aligne le hub Paramètres globaux sur la modale Publication du jeu
(C10.1) : liste verticale de boutons, chacun ouvre une popup dédiée
ou est `disabled` jusqu'à son sous-chantier.

**Décision validée** (Q-C10.2.a-fix-1 (a)) : popup dédiée pour
**chaque** section, y compris Identité projet. Forward-looking : la
popup `ProjectIdentitySettingsPopup` pourra accueillir plus tard
d'autres champs identité (URL souhaitée Netlify pour C11, mode
escape vs visite, page de titre, etc.). Justifie la création d'une
popup dédiée même pour un champ unique.

**Fichiers à lire avant de coder** :

- `xflow/react/src/view/popups/GlobalSettingsHubPopup.tsx` —
  hub accordion à refondre.
- `xflow/react/src/view/popups/GlobalSettingsHubPopup.css` — styles
  accordion à nettoyer.
- `xflow/react/src/view/popups/PublishGamePopup.tsx` — pattern de
  référence pour la liste de boutons (3 boutons d'action sur la
  modale Publication, C10.1).
- `xflow/react/src/view/popups/PopupThemeCustomizationPopup.tsx` —
  popup secondaire existante (modèle pour les futures popups
  dédiées C10.2.b → .f).
- `xflow/react/src/view/palette/PalettePopupModal.tsx` — wrapper
  modale (C10.1).
- `xflow/react/src/__tests__/c102aGlobalSettingsHub.test.tsx` —
  tests accordion à mettre à jour.

**Phase questions (workflow §8.1)** — Cursor pose ses Q-C10.2.a-fix-Y :

- **Q-C10.2.a-fix-1** — Style des boutons hub : *(a)* plein largeur,
  même style que les 3 boutons d'action de la modale Publication
  (C10.1) ; *(b)* tile/card avec icône + label.
  *Vote : (a) — alignement direct avec C10.1, zéro icône à concevoir.*
- **Q-C10.2.a-fix-2** — Comportement bouton désactivé (Inventaire,
  Audio, Timer, Fins) : *(a)* `disabled` + tooltip
  « Bientôt — C10.2.x » comme `[Déployer]` dans modale Publication ;
  *(b)* bouton actif qui ouvre une popup placeholder « Bientôt ».
  *Vote : (a) — cohérent avec C10.1 et plus honnête (rien à cliquer
  derrière).*
- **Q-C10.2.a-fix-3** — Layout du hub : *(a)* 6 boutons en colonne
  unique ; *(b)* 2 colonnes × 3 lignes pour gain de hauteur.
  *Vote : (a) — colonne unique, lecture verticale, scaling vertical
  trivial si on ajoute une 7e section plus tard.*

**Périmètre** :

1. **Refactor `GlobalSettingsHubPopup`** :
   - Retirer les 6 `<details>` accordion.
   - Remplacer par une liste verticale de **6 boutons** (button list).
   - 1 bouton par section, libellés conservés : `Identité projet`,
     `Inventaire`, `Thème popups`, `Audio`, `Timer & sauvegarde`,
     `Fins de partie` (FR) + pendants EN.
   - **Boutons actifs** :
     - `Identité projet` → ouvre `ProjectIdentitySettingsPopup`
       (nouveau).
     - `Thème popups` → ouvre `PopupThemeCustomizationPopup`
       existante via `onOpenPopupTheme` (inchangé).
   - **Boutons désactivés** (4) avec tooltip « Bientôt — C10.2.x » :
     `Inventaire` (C10.2.b), `Audio` (C10.2.d), `Timer & sauvegarde`
     (C10.2.e), `Fins de partie` (C10.2.f).

2. **Créer `ProjectIdentitySettingsPopup`** dans
   `xflow/react/src/view/popups/` :
   - Wrapper `PalettePopupModal` (titre « Identité projet » /
     « Project identity »).
   - Body : champ « Titre du projet » lié à `meta.title` (réutiliser
     le binding déjà branché en C10.2.a — `setMetaTitle` + flush).
   - Footer : bouton « Terminé » / « Done » qui ferme la popup.
   - Forward-looking : structure prête à recevoir d'autres champs
     identité plus tard (URL Netlify C11, mode escape/visite, page
     de titre…). Ne **pas** les ajouter ici, juste prévoir la place
     visuelle (laisser l'espace, pas de gabarit fixe qui contraint).

3. **Mettre à jour les tests Vitest** :
   - `c102aGlobalSettingsHub.test.tsx` :
     - Remplacer les tests accordion (« 6 sections, 1 ouverte par
       défaut, clic toggle ») par tests bouton-liste (6 boutons
       rendus, 4 `disabled`, clic sur `Identité projet` ouvre la
       popup, clic sur `Thème popups` appelle `onOpenPopupTheme`).
     - Garder le test round-trip `meta.settings` (inchangé — la
       structure du modèle ne change pas).
   - Ajouter un fichier `c102aFixProjectIdentityPopup.test.tsx`
     (ou étendre l'existant) pour `ProjectIdentitySettingsPopup` :
     rendering, binding `meta.title`, fermeture.

4. **Nettoyer `GlobalSettingsHubPopup.css`** :
   - Retirer les styles spécifiques accordion (`<details>`,
     `<summary>`, transitions chevron…).
   - Conserver / ajouter styles bouton-liste cohérents avec
     `PublishGamePopup`.

5. **Pas de changement modèle/store/sérialisation** : le pivot UX
   ne touche pas `ProjectMeta`, `setMetaTitle`, le flush DOM, ni la
   sérialisation V2. Toutes ces couches restent comme livrées en
   C10.2.a.

**Critères de fin** :

- Hub affiche 6 boutons en colonne (pas d'accordion).
- 2 boutons actifs (`Identité projet`, `Thème popups`) ouvrent leur
  popup respective.
- 4 boutons `disabled` avec tooltip « Bientôt — C10.2.x ».
- `ProjectIdentitySettingsPopup` créé, branché sur `meta.title`.
- Tests Vitest mis à jour (couverture ≥ celle de C10.2.a — pas de
  régression).
- **Recettes manuelles inchangées par rapport à C10.2.a** (titre
  dans modale → `#gameTitle` legacy → bundle → publier — toujours
  OK, juste via la nouvelle popup dédiée). Re-consigner en journal
  pour confirmer.

**Branche / commit** :

- Branche : `feat/c10-autonomy`.
- Commit : `feat(nodal): C10.2.a-fix hub bouton-liste +
  ProjectIdentitySettingsPopup`.
- Annexe D — Journal : entrée 2-3 lignes (pivot UX, popup identité
  créée, tests réécrits, recettes confirmées).

### Plan détaillé C10.2.a-fix2 — Bouton Retour générique sur popups hub

**Pré-requis** : C10.2.a-fix (commit `34bbbda`), C10.2.b (commit
`e043eec`), C10.2.c (commit `5efefaa`) tous livrés sur
`feat/c10-autonomy`.

**Contexte** : finalisation du pattern hub navigation introduit par
C10.2.a-fix. Le bouton **Retour** existe déjà dans
`PopupThemeCustomizationPopup` (footer-gauche, ferme la popup +
réouvre le hub) avec une logique custom locale. Il manque sur
`ProjectIdentitySettingsPopup` (créé en a-fix) et
`InventoryGlobalSettingsPopup` (créé en .b). Sans Retour, l'utilisateur
doit fermer puis rouvrir le hub manuellement à chaque fois — friction
inutile.

**Objectif** : factoriser le pattern Retour dans `PalettePopupModal`
via un prop `onBack` auto-rendu, l'appliquer aux 3 popups existantes,
et acter la convention pour les futures (C10.2.d/e/f).

**Pas de changement** : modèle `ProjectMeta`, store mutations,
sérialisation V2, flush DOM legacy. Pure UX / composant.

**Fichiers à lire avant de coder** :

- `xflow/react/src/view/palette/PalettePopupModal.tsx` — composant à
  étendre.
- `xflow/react/src/view/palette/PalettePopupModal.css` — styles footer
  (compléter pour le slot footer-gauche si nécessaire).
- `xflow/react/src/view/popups/PopupThemeCustomizationPopup.tsx` —
  logique Retour custom à retirer (relever l'implémentation actuelle
  pour comprendre le pattern à généraliser).
- `xflow/react/src/view/popups/ProjectIdentitySettingsPopup.tsx` —
  popup à équiper.
- `xflow/react/src/view/popups/InventoryGlobalSettingsPopup.tsx` —
  popup à équiper.
- `xflow/react/src/view/NodalCanvas.tsx` — états des modales
  (`projectIdentitySettingsOpen`, `inventoryGlobalSettingsOpen`,
  `popupThemeOpen`, `globalSettingsHubOpen`) pour câbler les `onBack`
  handlers (`close + open hub`).
- Tests existants : `c102aGlobalSettingsHub.test.tsx`,
  `c102bInventoryGlobalSettings.test.tsx`,
  `c102cPopupThemeMigration.test.tsx`,
  `c10PaletteModalAndPublish.test.tsx` — étendre / vérifier non-régression.

**Phase questions (workflow §8.1)** — Cursor pose ses
Q-C10.2.a-fix2-Y :

- **Q-C10.2.a-fix2-1** — API du prop `onBack` :
  *(a)* `onBack?: () => void` — le caller fait le `close + open hub`
  manuellement ; `PalettePopupModal` rend juste le bouton Retour qui
  appelle `onBack`.
  *(b)* prop dédié `onCloseToHub?: () => void` qui combine close + back
  côté `PalettePopupModal` (interne).
  *Vote : (a) — plus simple, plus testable. Le caller détient la
  logique d'enchaînement. Pattern cohérent avec `onClose`.*
- **Q-C10.2.a-fix2-2** — Layout footer quand `onBack` ET
  `footerActions` sont fournis :
  *(a)* Retour à gauche + `footerActions` à droite (justify-between).
  *(b)* tout aligné à droite (Retour en premier).
  *Vote : (a) — convention UI courante (action primaire à droite,
  navigation à gauche).*
- **Q-C10.2.a-fix2-3** — Libellés bilingues. *Vote : « Retour » /
  « Back ».*
- **Q-C10.2.a-fix2-4** — Bouton Retour conditionnel : si `onBack` est
  `undefined`, **rien n'est rendu** (pas de placeholder désactivé).
  *Confirmer simplement.*

**Périmètre** :

1. **Étendre `PalettePopupModal`** :
   - Nouveau prop `onBack?: () => void`.
   - Quand `onBack` fourni : rendu d'un bouton `[Retour]` / `[Back]`
     en footer-gauche avec `onClick={onBack}`.
   - Quand absent : aucun rendu (pas de placeholder).
   - Compat : la modale Publication (`PublishGamePopup`, qui n'utilise
     pas `onBack`) reste inchangée — tests C10.1 passent toujours.

2. **Migrer `PopupThemeCustomizationPopup`** :
   - Retirer la logique Retour custom locale.
   - Passer `onBack={() => { closePopupTheme();
     openGlobalSettingsHub(); }}` (noms réels selon
     `NodalCanvas.tsx`).
   - Vérifier rendu identique (un seul bouton Retour, plus de
     duplication).

3. **Équiper `ProjectIdentitySettingsPopup`** :
   - Passer `onBack={() => { closeProjectIdentitySettings();
     openGlobalSettingsHub(); }}`.
   - Le bouton « Terminé » dans `footerActions` reste à droite.

4. **Équiper `InventoryGlobalSettingsPopup`** :
   - Idem `ProjectIdentitySettingsPopup`.

5. **Tests Vitest** :
   - `PalettePopupModal` : bouton Retour rendu si `onBack` fourni,
     absent sinon ; le clic appelle `onBack` ; layout footer respecté
     (Retour gauche + `footerActions` droite si les deux présents).
   - `ProjectIdentitySettingsPopup` : clic Retour appelle bien le
     handler combiné close + hub-open (mocks).
   - `InventoryGlobalSettingsPopup` : idem.
   - `PopupThemeCustomizationPopup` : bouton Retour migré fonctionne
     identique à avant.
   - Vérifier que `c10PaletteModalAndPublish.test.tsx` (C10.1) passe
     toujours (pas de régression sur la modale Publication).

**Critères de fin** :

- `PalettePopupModal` accepte `onBack?: () => void` et le rend
  conditionnellement en footer-gauche.
- 3 popups hub-origin (Identité, Inventaire, Thème popups) ont un
  bouton Retour fonctionnel qui ferme la popup + réouvre le hub.
- Plus de logique Retour custom résiduelle dans les popups.
- Tests Vitest verts (couverture étendue, pas de régression C10.1).
- **Recette manuelle** (à consigner journal) : ouvrir le hub →
  cliquer Identité → cliquer Retour → hub réouvert (idem Inventaire
  et Thème popups).
- Convention Annexe D (préambule conventions communes) mise à jour
  par cette doc — Cursor n'a pas à la modifier.

**Branche / commit** :

- Branche : `feat/c10-autonomy`.
- Commit : `feat(nodal): C10.2.a-fix2 bouton Retour générique sur
  popups hub`.
- Annexe D — Journal : entrée 2-3 lignes
  (`PalettePopupModal.onBack` ajouté, 3 popups équipées, factor
  unifiée, recette manuelle confirmée).

### Plan détaillé C10.2.b — Inventaire HUD

**Pré-requis** : C10.2.a livré (accordion + conventions).

**Contexte** : rapatrier les 6 champs du formulaire legacy
`#useInventory`, `#inv-pos`, `#inv-icon`, `#inv-bgc`, `#inv-bga`,
`#inv-color` dans la section `Inventaire` de la modale, sous
`meta.settings.inventoryGlobal`. `#useInventory` masque
`#inv-settings-container` côté legacy — la modale doit reproduire ce
masquage (afficher / cacher les sous-champs selon `enabled`).

**Fichiers à lire avant de coder** :

- `editeur.html` / `editor_en.html` — `#global-sub-inv-body` et
  `#inv-settings-container`.
- `js/editor-shared-project-serialization.js` —
  `getCurrentProjectData` (clés `useInv`, `invPos`, `invIcon`,
  `invBgc`, `invBga`, `invColor`).
- `js/editor-shared-nodal-to-dom.js` — `applyFromStore` (extension).
- `xflow/react/src/model/project.ts` — type `ProjectSettings` à
  remplir.
- `xflow/react/src/serialize/toProjectJson.ts` /
  `fromProjectJson.ts` — extension serialize/hydrate.
- Plan détaillé C10.2.a (référence pour les conventions).

**Phase questions** : Q-C10.2.b-Y standards (champs optionnels,
binding, etc.). Pas de question structurelle inattendue.

**Périmètre** :

1. **Type** : `ProjectSettings.inventoryGlobal = { enabled: boolean;
   position: string; icon: string; panelBg: string; panelBgAlpha:
   number; textColor: string }`. Adapter les types stricts (enum
   `position`) si Cursor identifie une liste fermée dans le legacy.

2. **Popup dédiée `InventoryGlobalSettingsPopup`** (nouveau,
   `xflow/react/src/view/popups/`, wrapper `PalettePopupModal`) :
   checkbox `enabled` toujours visible ; les 5 autres champs cachés
   tant que `enabled === false` (cohérent legacy
   `#inv-settings-container`). Activer le bouton « Inventaire » du
   hub `GlobalSettingsHubPopup` (retirer `disabled` + tooltip,
   brancher `onClick` qui ouvre la popup).

3. **Store mutation** : `setMetaSettingsInventory(patch: Partial<...>)`.

4. **Flush DOM** : projeter sur `#useInventory`, `#inv-pos`,
   `#inv-icon`, `#inv-bgc`, `#inv-bga`, `#inv-color`. Déclencher le
   `change` event sur `#useInventory` après mise à jour pour que le
   masquage `#inv-settings-container` legacy se fasse (à confirmer en
   recette manuelle).

5. **Sérialisation V2** : ajouter `meta.settings.inventoryGlobal` au
   `project.json` du bundle si non-`undefined`.

6. **Hydrate V2** : lire `meta.settings.inventoryGlobal` → store.

**Critères de fin** :

- Section accordion `Inventaire` activée (placeholder retiré).
- Mutation store ↔ DOM legacy ↔ `project.json` cohérente.
- Tests Vitest : round-trip + flush + hydrate sur le sous-objet.
- Recettes manuelles consignées (les 3 standards).

**Branche / commit** :

- Branche : `feat/c10-autonomy`.
- Commit : `feat(nodal): C10.2.b inventaire HUD (meta.settings.inventoryGlobal)`.

### Plan détaillé C10.2.c — Thème popups (migration `playerPopupTheme`)

**Pré-requis** : C10.2.a livré.

**Contexte** : sous-chantier le **plus délicat** de C10.2 :
**migration** du slice racine `playerPopupTheme` (state Zustand,
sérialisé `map-layout.json.nodalPlayerPopupTheme`) vers
`meta.settings.popupTheme` (state Zustand sous `meta.settings`,
sérialisé `project.json.meta.settings.popupTheme`). Casse le format
in-memory et bundle (`map-layout.json` perd la clé, `project.json`
gagne la clé) — accepté §0.2 règle 6 (pas de rétrocompat avant
fusion `feat/nodal-map` → `main` post-C11).

**Contrainte critique** (cf. Décisions de design Annexe D —
« Préservation des aperçus live ») : la **réactivité live** des
aperçus DOM `#popup-preview-*` (mis à jour à chaque changement via
`projectPlayerPopupThemeToDom`) doit être préservée à l'identique.
Vérifier que les sélecteurs Zustand sur `meta.settings.popupTheme.*`
déclenchent le re-render avec la même fréquence que le slice actuel.

**Fichiers à lire avant de coder** :

- `xflow/react/src/store/nodalProjectStore.ts` — slice
  `playerPopupTheme` actuel + ses actions.
- `xflow/react/src/serialize/mapLayoutJson.ts` —
  `MapLayoutJson.nodalPlayerPopupTheme` (à retirer).
- `js/editor-shared-nodal-to-dom.js` —
  `projectPlayerPopupThemeToDom` (à brancher sur la nouvelle source).
- `xflow/react/src/view/palette/PopupThemeCustomizationPopup.tsx` (ou
  équivalent — chercher) pour repérer les sélecteurs actuels.
- `xflow/react/src/view/palette/GlobalSettingsHubPopup.tsx` — section
  `Thème popups` à brancher sur la nouvelle source.

**Phase questions** :

- **Q-C10.2.c-1** — Migration des projets en cours : un
  `.escapegame` sauvegardé en C10.2.a-précédent contient
  `nodalPlayerPopupTheme` dans `map-layout.json`. À l'hydrate :
  *(a)* lire les deux emplacements (`meta.settings.popupTheme`
  prioritaire, fallback `nodalPlayerPopupTheme`) pour ne pas casser
  les bundles que tu as générés depuis C10.0 ; *(b)* casse stricte —
  les bundles pré-C10.2.c sont à régénérer manuellement (hors le tien
  qui n'as encore rien diffusé). *Vote : (a) lecture compatible 1×
  pour 1 cycle, écriture toujours sur la nouvelle clé. Cleanup du
  fallback à un futur sous-chantier (ou jamais — coût marginal).*

**Périmètre** :

1. **Type** : `ProjectSettings.popupTheme = { useCustom: boolean;
   font: string; color: string; bg: string; bgAlpha: number;
   btnBg: string; btnColor: string }`.

2. **Migration store** : retirer le slice racine `playerPopupTheme`,
   placer ses valeurs dans `meta.settings.popupTheme`. Mettre à jour
   tous les sélecteurs (`useStore(s => s.playerPopupTheme...)` →
   `useStore(s => s.meta.settings?.popupTheme?...)`).

3. **Popup `PopupThemeCustomizationPopup`** (existante, créée en C7.2,
   déjà branchée sur le bouton « Thème popups » du hub depuis
   C10.2.a-fix) : conserver l'UI existante (champs + aperçu live).
   Mettre à jour le binding pour lire/écrire
   `meta.settings.popupTheme` au lieu du slice racine
   `playerPopupTheme`. **Pas** de nouveau composant, **pas** de
   modification du hub (déjà branché). Seul le binding store change.

4. **Flush DOM** : `projectPlayerPopupThemeToDom` doit lire
   `meta.settings.popupTheme` (ou continuer à recevoir les valeurs en
   paramètre — refactor à voir).

5. **Sérialisation V2** : écrire `meta.settings.popupTheme` dans
   `project.json`. **Retirer** `nodalPlayerPopupTheme` de
   `map-layout.json`.

6. **Hydrate** : lire `meta.settings.popupTheme` du `project.json`.
   Compat Q-C10.2.c-1 (a) : si absent, fallback
   `mapLayout.nodalPlayerPopupTheme` 1× pour 1 cycle.

**Critères de fin** :

- Slice racine `playerPopupTheme` n'existe plus (recherche
  `playerPopupTheme` dans les sources retourne 0 hit hors compat
  hydrate).
- `map-layout.json` n'écrit plus `nodalPlayerPopupTheme`.
- `project.json` écrit `meta.settings.popupTheme`.
- **Recette manuelle live preview** (critique) : ouvrir modale →
  changer la couleur de fond popup → aperçu joueur (`#popup-preview-*`)
  se met à jour **immédiatement** (même temps de réaction qu'avant).
- Tests Vitest : round-trip + flush + hydrate + compat
  `nodalPlayerPopupTheme` legacy.

**Branche / commit** :

- Branche : `feat/c10-autonomy`.
- Commit : `feat(nodal): C10.2.c thème popups migration → meta.settings.popupTheme`.

### Plan détaillé C10.2.d — Audio global

**Pré-requis** : C10.2.a livré.

**Contexte** : rapatrier `#useGlobalAudio`, `#globalAudioUrl`,
`#globalAudioVol` sous `meta.settings.audio`. `#useGlobalAudio` masque
`#audio-settings-container` côté legacy.

**Fichiers à lire** :
- `editeur.html` / `editor_en.html` — `#global-sub-audio-body`.
- `js/editor-shared-project-serialization.js` (clés
  `useGlobalAudio`, `globalMusic`).
- Plan C10.2.b (pattern de référence).

**Phase questions** : Q-C10.2.d-Y standards.

**Périmètre** :

1. Type `audio = { enabled: boolean; url: string; volume: number }`.
2. Popup dédiée `AudioGlobalSettingsPopup` (nouveau,
   `xflow/react/src/view/popups/`, wrapper `PalettePopupModal`) :
   checkbox + 2 champs (URL + slider volume). Activer le bouton
   « Audio » du hub `GlobalSettingsHubPopup`.
3. Store mutation `setMetaSettingsAudio`.
4. Flush DOM sur les 3 ids.
5. Sérialisation/Hydrate `meta.settings.audio`.
6. **Cas particulier** : le legacy sérialise `globalMusic: { url,
   volume }` (objet imbriqué) avec un alias `globalAudioUrl` plat.
   Choisir la forme V2 : `meta.settings.audio = { enabled, url,
   volume }` plat (sans aliasing) — Cursor justifie son choix.

**Critères de fin** : tests Vitest standards + recettes manuelles.

**Commit** : `feat(nodal): C10.2.d audio global (meta.settings.audio)`.

### Plan détaillé C10.2.e — Timer global + sauvegarde joueur

**Pré-requis** : C10.2.a livré.

**Contexte** : rapatrier `#useTimer`, `#timerMode`,
`#timerStartSeconds`, `#timerAutoStart`, `#timerPauseOnPopup` sous
`meta.settings.timer` ; et `#playerSaveMode` sous
`meta.settings.playerSave`. Deux groupes mais une seule section UI
« Timer & sauvegarde » (cohérent avec le legacy qui les regroupe dans
`#global-sub-timer-body`).

**Fichiers à lire** :

- `editeur.html` / `editor_en.html` — `#global-sub-timer-body`.
- `js/editor-shared-timer.js` — `readTimerSettingsFromDom` (utile pour
  la convention de naming des champs timer).
- Plans C10.2.b et .d (pattern de référence).

**Phase questions** :

- **Q-C10.2.e-1** — Type `timer.mode` : enum (`'countdown'`,
  `'stopwatch'`, …) ou string libre ? Lever depuis
  `readTimerSettingsFromDom` la liste des modes valides. *Vote : enum
  strict pour cohérence runtime.*

**Périmètre** :

1. Types :
   ```ts
   timer = { enabled: boolean; mode: TimerMode; startSeconds: number;
             autoStart: boolean; pauseWhenPopupOpen: boolean }
   playerSave = { mode: PlayerSaveMode }
   ```
2. Popup dédiée `TimerAndSavePlayerSettingsPopup` (nouveau,
   `xflow/react/src/view/popups/`, wrapper `PalettePopupModal`) :
   sous-bloc timer (masqué si `!enabled`) + bloc `playerSave`
   toujours visible. Activer le bouton « Timer & sauvegarde » du
   hub `GlobalSettingsHubPopup`.
3. Mutations `setMetaSettingsTimer` + `setMetaSettingsPlayerSave`.
4. Flush DOM sur les 6 ids.
5. Sérialisation/Hydrate `meta.settings.timer` + `meta.settings.playerSave`.

**Commit** : `feat(nodal): C10.2.e timer + sauvegarde joueur
(meta.settings.timer / .playerSave)`.

### Plan détaillé C10.2.f — Fins de partie

**Pré-requis** : C10.2.a livré, C10.2.e livré (réutilise le pattern
sélecteur de scène).

**Contexte** : dernier rapatriement — sections
`#endGameOverTitle/Body/Btn`, `#endVictoryTitle/Body/Btn`,
`#victorySceneId`, `#gameOverSceneId` sous
`meta.settings.endScreens`. Les `Body` sont des **textes riches Quill**
— réutiliser l'infra `nodalQuillTheme` (C7.6).

**Fichiers à lire** :

- `editeur.html` / `editor_en.html` — `#end-screens-form-container`.
- `js/editor-shared-project-serialization.js` — clés
  `endScreens.{gameOver,victory}.{title,bodyHtml,buttonLabel}` +
  `victorySceneId` / `gameOverSceneId`.
- Composants C7.2/C7.3 popups — pattern d'usage `nodalQuillTheme`.
- Plan C10.2.e (pattern sélecteur scène — `victorySceneId` /
  `gameOverSceneId` peuplés depuis liste scènes du store).

**Phase questions** :

- **Q-C10.2.f-1** — Stockage des `*SceneId` : (a) externe (`extScene`
  string lisible) ; (b) interne (`SceneNodeId` opaque). *Vote : (a)
  externe — cohérent avec le legacy qui sérialise `victorySceneId`
  externe ; le store résout l'interne au runtime.*
- **Q-C10.2.f-2** — Sélecteur scène UI : (a) `<select>` natif peuplé
  depuis `Object.values(state.scenes).map(s => s.sceneId)` ; (b)
  composant custom avec recherche. *Vote : (a) — simple, 5-20 scènes
  en pratique, pas besoin de recherche.*
- **Q-C10.2.f-3** — Quill : réutiliser le wrapper
  `nodalQuillTheme` posé en C7.6. *Vote : oui (cf. décisions de
  design Annexe D).*

**Périmètre** :

1. Type :
   ```ts
   endScreens = {
     victorySceneExternalId: string;
     gameOverSceneExternalId: string;
     gameOver: { title: string; bodyHtml: string; buttonLabel: string };
     victory: { title: string; bodyHtml: string; buttonLabel: string };
   }
   ```
2. Popup dédiée `EndScreensSettingsPopup` (nouveau,
   `xflow/react/src/view/popups/`, wrapper `PalettePopupModal`) :
   2 sélecteurs scène + 6 champs (3 par fin) avec Quill sur les
   `bodyHtml`. Activer le bouton « Fins de partie » du hub
   `GlobalSettingsHubPopup`.
3. Mutations `setMetaSettingsEndScreens(...)`.
4. Flush DOM sur les 8 ids. Pour `bodyHtml` : passer par
   `flushRichEditorsIn` après mise à jour pour que Quill soit synchro.
5. Sérialisation/Hydrate `meta.settings.endScreens`.
6. **Cas particulier hydrate** : si une scène référencée
   (`victorySceneExternalId`) n'existe plus au moment de l'hydrate
   (utilisateur a supprimé la scène), conserver la string mais la
   modale affichera `(scène introuvable)` dans le `<select>`. Pas
   de purge automatique.

**Critères de fin** : tests Vitest standards + recettes manuelles +
recette spéciale Quill (édite body Game Over → save → reload →
HTML restauré).

**Commit** : `feat(nodal): C10.2.f fins de partie (meta.settings.endScreens)`.

### Plan détaillé C10.3 — Ouverture nodale par défaut

**Pré-requis** : C10.2 livré dans son ensemble (.a → .f, plus
fixes 1 et 2). Branche `feat/c10-autonomy` active.

**Contexte** : aujourd'hui `editeur.html` / `editor_en.html` ouvrent
sur le formulaire legacy ; l'utilisateur clique le bouton
`[Formulaire]` de la palette pour basculer vers la carte. Avec
C10.2 complet, l'authoring est intégralement disponible côté carte ;
le formulaire n'a plus de raison d'être la vue par défaut. C10.3
inverse la valeur initiale.

**Décision validée** (Q-C10.3-1 (a)) : déclencher l'ouverture nodale
au load (équivalent d'un clic auto sur le bouton actuel). Pas de
refonte HTML — celle-ci viendra ultérieurement quand le formulaire
sera totalement retiré.

**Pas de changement** : structure HTML, modèle store, sérialisation.
Pure orchestration init.

**Fichiers à lire avant de coder** :

- `editeur.html` / `editor_en.html` — état initial DOM (formulaire
  visible par défaut, carte ouverte via toggle).
- `js/editeur-app.js` / `js/editor-en-app.js` — `DOMContentLoaded`
  handler, init éditeur, point d'entrée pour le trigger d'ouverture
  carte.
- `xflow/react/src/editor-nodal-map-bootstrap.js` — bootstrap React
  de la carte (mount, init store).
- Recherche : handler du bouton `[Formulaire]` actuel pour réutiliser
  sa fonction d'ouverture (`onClick` doit pouvoir être appelé en
  programmatique).

**Phase questions (workflow §8.1)** — Cursor pose ses Q-C10.3-Y :

- **Q-C10.3-1** — Timing trigger :
  *(a)* `DOMContentLoaded` direct.
  *(b)* Après `editor-init` complet.
  *(c)* Après l'hydrate du store nodal (chargement
  `.escapegame` / `map-layout.json`).
  *Vote : (c) — éviter un flash visuel formulaire→carte si l'hydrate
  prend du temps. La carte s'affiche directement avec son contenu
  correct.*
- **Q-C10.3-2** — Persistance préférence utilisateur :
  *(a)* Toujours auto-ouvrir, ignore localStorage.
  *(b)* Respecter une préférence sauvegardée.
  *Vote : (a) — simple, prévisible. L'utilisateur peut toujours
  cliquer `[Formulaire]` (`[Vérifier]` post-C10.4) pour voir le
  legacy.*
- **Q-C10.3-3** — Camera initiale : *vote utilisateur (c) ne rien
  toucher.* `meta.viewport` déjà sérialisé/restauré. Cursor confirme
  juste que rien ne régresse.

**Périmètre** :

1. **Trigger ouverture auto** au point convenu (Q-C10.3-1) : appeler
   la même fonction que le handler `[Formulaire]`. Vérifier pour :
   (a) projet vierge, (b) chargement `.escapegame`, (c) reload page.

2. **Pas de changement** : bouton `[Formulaire]` reste fonctionnel et
   nommé « Formulaire » (renommage en C10.4). Contenu/comportement
   formulaire inchangé (désactivation en C10.4).

3. **Tests Vitest** : test minimal au mount du composant racine, la
   carte est visible (DOM jsdom). Pas de test du flow complet
   (intégration HTML legacy + React = trop large).

4. **Recette manuelle** :
   - Ouvrir `editeur.html` neuf → carte visible immédiatement.
   - Charger un `.escapegame` → carte visible avec contenu.
   - Reload page → carte visible (état restauré).
   - Cliquer `[Formulaire]` → bascule vers formulaire (toujours
     fonctionnel).

**Critères de fin** :

- À l'ouverture de `editeur.html` / `editor_en.html` : la carte
  nodale est la vue active.
- Bouton `[Formulaire]` toujours fonctionnel (toggle vers
  formulaire).
- Aucune régression sur le pipeline V2 → DOM → generateGame.
- Recettes manuelles consignées dans le journal Annexe D.

**Branche / commit** :

- Branche : `feat/c10-autonomy`.
- Commit : `feat(nodal): C10.3 ouverture nodale par défaut`.
- Annexe D — Journal : 1-2 lignes (timing trigger, recettes).

### Plan détaillé C10.5 — Upload média local (images + audio)

**Pré-requis** : C10.3 livré (default landing nodal). Branche
`feat/c10-autonomy` active.

**Contexte** : C10.5 inséré post-cadrage initial. Sans cette fonction
côté carte, la promesse d'« authoring standalone » de C10 serait
partielle — l'utilisateur devrait toujours retourner au formulaire
legacy pour ajouter une image ou un audio depuis son ordinateur.
C10.5 expose cette capacité dans toutes les popups carte qui
consomment une URL média, débloquant ainsi C10.4 (désactivation
totale legacy).

Le formulaire legacy a déjà cette fonction via le bouton 📎 paperclip
qui appelle `openBundleLocalMediaPicker(input, accept)` (cf.
`editeur.html`). C10.5 réutilise l'API existante — pas de refonte du
système bundle media.

**Pas de changement** : modèle `ProjectMeta`, sérialisation V2,
format `.escapegame` ZIP. Pure UI + bridge.

**Fichiers à lire avant de coder** :

- `js/editor-shared-bundle.js` — implémentation
  `openBundleLocalMediaPicker` (signature complète à relever).
- `editeur.html` / `editor_en.html` — usages actuels (pattern bouton
  📎 à côté des inputs URL).
- `xflow/react/src/types/escape360NodalChrome.d.ts` — bridge typing.
- Popups carte consommatrices d'URL média (audit exhaustif —
  Q-C10.5-5).

**Phase questions (workflow §8.1)** — Cursor pose ses Q-C10.5-Y :

- **Q-C10.5-1** — Surface bridge :
  *(a)* `__escape360NodalChrome.openBundleLocalMediaPicker`
  (cohérent avec `generateGameHtml` C10.1).
  *(b)* Via `EditorSharedBundle` directement.
  *(c)* Wrapper React local au composant `MediaUploadButton`.
  *Vote : (a) — pattern bridge palette↔legacy établi C10.1. Adapter
  `openBundleLocalMediaPicker` pour retourner une promesse plutôt
  qu'écrire dans un `<input>` legacy si nécessaire.*
- **Q-C10.5-2** — Composant React partagé :
  *(a)* Composant unique `MediaUploadButton` (`accept`, `onPicked`)
  réutilisé dans toutes les popups.
  *(b)* Bouton inline dans chaque popup (duplication).
  *Vote : (a) — refactoring opportuniste impératif. Sous
  `xflow/react/src/view/components/MediaUploadButton.tsx`.*
- **Q-C10.5-3** — Position UI vs champ URL :
  *(a)* Bouton à côté du champ URL (à droite, pattern legacy 📎 mais
  icône upload).
  *(b)* Toggle URL/local.
  *Vote : (a) — moins de friction.*
- **Q-C10.5-4** — Icône bouton :
  *(a)* `<svg>` inline upload (flèche-haut-dans-cadre, type Lucide
  `upload`).
  *(b)* Lib d'icônes existante.
  *(c)* Emoji 📤.
  *Vote : (a) — `<svg>` inline, pas de dépendance, taille uniforme.
  Tooltip « Importer depuis l'ordinateur » / « Import from computer ».*
- **Q-C10.5-5** — Liste exhaustive popups à équiper. Cursor établit
  par audit. Seed (à compléter) :
  - Panorama scène (popup édition scène — chercher où on saisit
    l'URL panorama 360°).
  - Hotspot icon (`HotspotAppearancePopup` ?).
  - Audio media node (popup édition audio — `MediaEditorPopup` ?).
  - Image media node (popup édition image — `MediaEditorPopup` ?).
  - Audio global (`AudioGlobalSettingsPopup` C10.2.d) pour
    `globalAudioUrl`.
  - Inventaire icon (`InventoryGlobalSettingsPopup` C10.2.b) pour
    `inv-icon`.
  - Tout autre champ URL média repéré en lecture exhaustive.

**Périmètre** :

1. **Audit popups consommatrices** (Cursor, point Q-C10.5-5). Liste
   finale en commentaire dans le commit.

2. **Bridge `__escape360NodalChrome.openBundleLocalMediaPicker`** :
   - Wrapper sur `EditorSharedBundle.openBundleLocalMediaPicker` ou
     refonte légère pour API basée promesse :
     `pickLocalMedia(accept: string): Promise<string | null>`.
   - Mettre à jour `escape360NodalChrome.d.ts`.

3. **Composant `MediaUploadButton`** dans
   `xflow/react/src/view/components/` (créer dossier si absent) :
   - Props : `accept: string`, `onPicked: (url: string) => void`,
     `disabled?: boolean`, `tooltip?: string`.
   - Rendu : bouton + icône upload SVG, tooltip bilingue par défaut.
   - Au clic : appel
     `__escape360NodalChrome.openBundleLocalMediaPicker(accept)`,
     puis `onPicked(url)` si retour non-`null`.

4. **Intégration** dans chaque popup (liste finale Q-C10.5-5) :
   - À côté de chaque champ URL média : `<MediaUploadButton ... />`.
   - `onPicked: (url) => setStoreField(url)` — mute le store, le flush
     DOM legacy se charge ensuite via `applyFromStore`.

5. **Tests Vitest** :
   - `MediaUploadButton` : rendu, clic appelle bridge mock
     (`vi.stubGlobal`), `onPicked` appelé avec URL retournée.
   - Au moins une popup intégrée testée pour le wiring complet
     (mock bridge + assert mutation store).

6. **Recette manuelle** (à consigner) :
   - Popup audio global → upload `.mp3` local → URL bundle écrite →
     sauver `.escapegame` → reload → audio référencé.
   - Idem image (panorama scène, hotspot icon, etc.).
   - `[Publier]` HTML autonome → ZIP contient le média.

**Critères de fin** :

- Toutes les popups consommatrices d'URL média ont un bouton upload
  fonctionnel.
- Composant `MediaUploadButton` factorisé.
- Bridge typé dans `escape360NodalChrome.d.ts`.
- Tests Vitest verts.
- Recettes manuelles consignées (au minimum 1 image + 1 audio).
- Pas de régression sur l'upload legacy 📎 (le formulaire reste
  fonctionnel jusqu'à C10.4).

**Branche / commit** :

- Branche : `feat/c10-autonomy`.
- Commit : `feat(nodal): C10.5 upload média local (images + audio)`.
- Annexe D — Journal : 2-3 lignes (liste popups équipées, composant
  créé, bridge exposé).

### Plan détaillé C10.4 — Désactivation legacy + bandeau + renommage

**Pré-requis** : C10.5 livré (l'upload média local est désormais
disponible côté carte — sans cela, désactiver le formulaire priverait
l'utilisateur de cette fonction). Branche `feat/c10-autonomy` active.

**Contexte** : dernier sous-chantier de C10. Le formulaire legacy
devient une **vue de vérification read-only**. L'édition se fait
exclusivement via la carte. Bouton `[Formulaire]` renommé `[Vérifier]`
côté palette pour signaler le changement de fonction. Bandeau
permanent en haut du formulaire pour rappeler le mode. Absorbe le
chantier optionnel **C6.1** mentionné depuis v1.5.

**Décisions validées** :

- Q-C10.4-1 (a) : désactiver tout côté formulaire ; seul reste actif
  le bouton **du haut** qui retourne à la carte (les boutons de la
  palette sont déjà tous fonctionnels via la carte).
- Q-C10.4-2 (a) : bandeau fixe en haut du formulaire.
- Q-C10.4-3 OK : « Vue de vérification — l'édition se fait via la
  carte nodale » (FR) / « Verification view — editing happens via
  the nodal map » (EN).
- Q-C10.4-4 (a) : `disabled` CSS standard.
- Q-C10.4-5 : « Vérifier » / « Verify ».

**Pas de changement** : modèle `ProjectMeta`, sérialisation V2, flux
V2 → DOM → generateGame. Pure UI legacy + un renommage de bouton
côté palette.

**Fichiers à lire avant de coder** :

- `editeur.html` / `editor_en.html` — recenser tous les inputs,
  textareas, selects, buttons à désactiver. Identifier le bouton
  « du haut » à conserver (probable : un toggle vers la carte ou la
  fermeture du panneau formulaire — Cursor remontera).
- `js/editeur-app.js` / `js/editor-en-app.js` — handlers des
  contrôles legacy (laissés en place, contrôles inactifs).
- `xflow/react/src/view/palette/NodePalette.tsx` — bouton
  `[Formulaire]` à renommer.
- Tests C10.x existants (vérifier non-régression flush/serialize).

**Phase questions (workflow §8.1)** — Cursor pose ses Q-C10.4-Y :

- **Q-C10.4-1** — Méthode de désactivation :
  *(a)* Attribut HTML `disabled` posé en JS au DOMContentLoaded
  (boucle sur tous les éléments d'édition). Réversible si besoin.
  *(b)* CSS `pointer-events: none` + style disabled sur racine. Plus
  rapide, moins ciblé.
  *(c)* Refonte React miroir.
  *Vote : (a) — sémantiquement correct, accessible (lecteurs
  d'écran), réversible. (b) interfère avec scroll et éléments
  d'affichage. (c) hors scope.*
- **Q-C10.4-2** — Périmètre exact :
  Liste à valider par Cursor au début du sous-chantier — tout ce
  qui modifie le projet :
  - `<input>`, `<textarea>`, `<select>` dans `#editor-global-root`
    et `#scenes-container`.
  - Boutons « Ajouter scène/hotspot/média », « Supprimer », etc.
  - Boutons d'action transverses (`#saveBundle`, `#load`,
    `#generateGame`, `#snapshot`) — désactivés (la palette les
    couvre).
  - Drag-and-drop scènes, sélecteurs scène, ré-ordonnancement.
  - **Conserver actif** : seul le bouton de retour vers carte (à
    identifier par Cursor — probable bouton du haut).
- **Q-C10.4-3** — Style bandeau :
  *(a)* Banner sticky/fixe en haut du conteneur formulaire, fond
  contrasté (couleur d'avertissement douce), texte centré.
  *(b)* Banner avec icône info à gauche.
  *Vote : Cursor choisit selon cohérence visuelle globale (s'aligner
  sur les patterns existants si bandeau de tutoriel/mode démo
  existe).*
- **Q-C10.4-4** — Désactivation runtime ou load :
  *(a)* Au load, désactiver une fois ; gérer aussi les contrôles
  ajoutés dynamiquement par les flush successifs via
  `MutationObserver`.
  *(b)* CSS sur racine + JS pour éléments dynamiques.
  *Vote : (a) avec MutationObserver — robuste vs flush nodal → DOM.*

**Périmètre** :

1. **Bandeau « Vue de vérification »** :
   - Insérer en haut de `#editor-global-root` (ou conteneur racine
     formulaire) avec `position: sticky` ou `fixed`, fond contrasté.
   - Texte bilingue (FR par défaut + check `editor_en.html`).
   - Icône info optionnelle.

2. **Désactivation des contrôles** :
   - Au DOMContentLoaded (après init formulaire), itérer sur tous
     les `<input>`, `<textarea>`, `<select>`, `<button>` du
     conteneur formulaire.
   - Poser `disabled = true` sauf sur le bouton de retour vers
     carte (à identifier).
   - `MutationObserver` pour appliquer aux contrôles ajoutés par
     flush nodal → DOM.

3. **Renommage palette** :
   - Bouton `[Formulaire]` → `[Vérifier]` / `[Verify]` dans
     `NodePalette.tsx`.
   - Tooltip : « Vue de vérification (read-only) » /
     « Verification view (read-only) ».

4. **CSS standard disabled** :
   - Vérifier que le CSS legacy `disabled` est lisible. Sinon
     renforcer dans une feuille spécifique C10.4.

5. **Tests Vitest** :
   - Bouton palette renommé (`NodePalette.tsx` rendu).
   - Pas de test côté legacy disabled (jsdom + MutationObserver
     finement = recette manuelle).

6. **Recette manuelle** (à consigner) :
   - Ouvrir éditeur → carte visible (default landing C10.3) →
     `[Vérifier]` → formulaire visible avec bandeau et tous champs/
     boutons disabled.
   - Bouton retour carte → carte réouverte.
   - Pipeline `[Publier]` HTML autonome reste fonctionnel
     (`getCurrentProjectData` non affecté par `disabled`).
   - `[Sauver .escapegame]` flush + bundle marche.

**Critères de fin** :

- Bandeau « Vue de vérification » visible en haut du formulaire.
- Tous les contrôles d'édition formulaire `disabled`.
- Bouton de retour vers carte actif.
- Bouton palette `[Formulaire]` renommé `[Vérifier]` / `[Verify]`.
- Pipeline V2 → DOM → generateGame inchangé (recette manuelle).
- Tests Vitest verts (rendu palette).
- Recettes manuelles consignées.
- §0.2 règle 2 (« cible produit : formulaire en lecture seule ») =
  livrée.

**Branche / commit** :

- Branche : `feat/c10-autonomy`.
- Commit : `feat(nodal): C10.4 désactivation legacy + bandeau Vérifier`.
- Annexe D — Journal : 2-3 lignes (banner posé, contrôles désactivés,
  renommage `[Vérifier]`, recettes manuelles).

**Note de clôture C10** : après le commit C10.4, le chantier C10 est
livré. Procéder à la clôture selon §2.7 du briefing CLAUDE.md
(synthèse Annexe D → Annexe B, archivage `docs/archives/chantier_10.md`,
bump v1.9, PR `feat/c10-autonomy` → `feat/nodal-map`).

### Journal de chantier

- 2026-05-07 — **C10.1 livré** sur `feat/c10-autonomy`. Phase questions
  Q-C10.1.x-1→7 validée (votes : (a) `PalettePopupModal` minimal /
  (a) bridge `__escape360NodalChrome.generateGameHtml` +
  `exportGameWebZip` / (a) defense in depth flush / (c) noteDirty
  inchangé / (c) bouton entre `[Charger]` et `[Formulaire]` / libellés
  EN OK / α-β-γ confirmés / t1 + t1-bis recette + t3 mocks).
  Suppression du `setInterval` 8 s (`js/editor-nodal-map-bootstrap.js`,
  pas `xflow/react/src/` — chemin du plan corrigé). Defense in depth :
  flush ajouté **dans** `saveProject()`, `generateGame()`,
  `exportGameWebZip()` (FR + EN, 6 callsites au total). Bridge
  `__escape360NodalChrome` nettoyé : flush retirés de
  `saveEscapegameBundle` (saveProjectBundle ne lit pas le DOM legacy)
  et `flushThenSaveJson` (saveProject flush désormais en interne) ;
  `flushThenLocalDraftSnapshot` conserve son flush (captureSnapshot
  ne flushe pas — refonte autosave store-driven hors scope). Ajout
  bridge : `generateGameHtml`, `exportGameWebZip` + typage
  `escape360NodalChrome.d.ts`. Composant partagé
  `PalettePopupModal.tsx` (+ `.css`) — scope minimal Q-C10.1.x-1 (a).
  Modale `PublishGamePopup.tsx` consomme le composant + le bridge.
  Bouton `[Publier]` dans `NodePalette.tsx` (libellé FR « Publier » /
  EN « Publish », tooltip explicatif), entre `[Charger]` et
  `[Formulaire]`. State `publishHubOpen` ajouté à `NodalCanvas` +
  `NodalUiContext`, intégré à `closeActiveModal` (priorité Échap après
  raccourcis et avant `popupThemeCustomizationOpen`) et à `anyPopupOpen`
  / effet de fermeture auto raccourcis. 14/14 tests Vitest verts
  (`c10PaletteModalAndPublish.test.tsx`) ; `vite.config.ts` étendu
  pour inclure `*.test.tsx`. Build `editor-map.js` vert. Suite Vitest
  globale : 173 passed + 1 skipped + 2 failed pré-existants
  (`c8RoundtripReal.test.ts` dépend de fixtures locales gitignored
  `docs/temporaire/c8-roundtrip-broken/*.json`, sans rapport avec C10.1).

  **Audit `noteDirty` (Q-C10.1.x-3-bis (c) confirmé)** :
  - Source unique de déclenchement : `editor-shared-local-draft-ui.js:545-546`
    — `doc.addEventListener("input", noteDirty, true)` +
    `doc.addEventListener("change", noteDirty, true)` (capture-phase
    sur `document`).
  - Alias `noteLocalDraftDirty = localDraftUi.noteDirty;` exposé en
    `js/editeur-app.js:266` et `js/editor-en-app.js:262` mais
    **jamais appelé** (`rg "noteLocalDraftDirty\("` → 0 match).
  - Conclusion : aucune session 100 % nodale (drag/connect React Flow,
    palette, popups d'éditeurs C7.x sans champ HTML natif) ne
    déclenche d'autosave dirty → pas de stale possible. Cas résiduel :
    un popup React C7.x qui modifie un `<input>` peut déclencher
    `noteDirty`, mais ce risque préexistait avec le flush 8 s
    (jusqu'à 8 s de stale) et n'est qu'aggravé de quelques secondes.
    Refonte autosave store-driven = chantier dédié post-C10.

  **Recettes manuelles à exécuter (β + flush effective + t1-bis Échap)** :
  1. **β fermeture pendant ZIP** : ouvrir éditeur → carte nodale →
     `[Publier]` → `ZIP web hors-ligne` → fermer modale (croix) pendant
     1–2 s → vérifier que le download `EscapeGame_Web.zip` arrive
     malgré la fermeture (promesse non annulée).
  2. **Flush effectif sans périodique** : éditer la carte nodale
     (renommer une scène, déplacer un hotspot) → **sans attendre 8 s**
     → `[Publier]` → `HTML autonome` → ouvrir `index.html` téléchargé →
     vérifier que les modifications sont présentes.
  3. **t1-bis Échap palette** : ouvrir `[Publier]` → presser **Échap** →
     la modale Publication doit se fermer (priorité dans
     `closeActiveModal` confirmée par lecture du code).

- 2026-05-07 — **C10.2.a livré** (`feat/c10-autonomy`). Votes Q-C10.2.a-1→3 :
- 2026-05-07 — **C10.2.c livré** (`feat/c10-autonomy`) : migration
  thème popup depuis le slice racine `playerPopupTheme` vers
  `meta.settings.popupTheme` (type strict ajouté dans `project.ts` :
  `useCustom`, `font`, `color`, `bg`, `bgAlpha`, `btnBg`,
  `btnColor`). Store migré (`nodalProjectStore.ts`) :
  suppression du slice racine + nouvelles mutations
  `setMetaSettingsPopupTheme(...)` et
  `syncMetaSettingsPopupThemeFromDom()`. `PopupThemeCustomizationPopup`
  conserve son UI mais rebinde lecture/écriture sur
  `meta.settings.popupTheme`. Hook `usePlayerPopupTheme` lit désormais
  ce sous-objet avec fallback `DEFAULT_PLAYER_POPUP_THEME`.
  Projection DOM legacy (`editor-shared-nodal-to-dom.js`) branchée sur
  `meta.settings.popupTheme` pour préserver la réactivité live
  (`#pop-*`, `#useCustomPopup`, `updatePreview`, `updateQuillTheme`).
  `map-layout.json` n’écrit plus `nodalPlayerPopupTheme` ; compat
  hydrate conservée 1× : si `project.json.meta.settings.popupTheme`
  absent, fallback sur `layoutJson.nodalPlayerPopupTheme`.
  Tests Vitest : nouveau `c102cPopupThemeMigration.test.tsx`
  (round-trip `project.json`, flush DOM preview, compat fallback
  legacy). Build `editor-map` vert.

- 2026-05-07 — **C10.2.b livré** (`feat/c10-autonomy`) : migration Inventaire
  HUD vers `meta.settings.inventoryGlobal` avec type strict
  (`enabled`, `position`, `icon`, `panelBg`, `panelBgAlpha`,
  `textColor`) dans `project.ts` et mutation store
  `setMetaSettingsInventory(...)` (`nodalProjectStore.ts`).
  Création `InventoryGlobalSettingsPopup.tsx` (checkbox `enabled`
  + masquage des 5 sous-champs comme `#inv-settings-container` legacy),
  activation du bouton `Inventaire` dans `GlobalSettingsHubPopup`
  (placeholder retiré), et wiring `NodalCanvas` (`inventoryGlobalSettingsOpen`
  + priorité Échap dans `closeActiveModal`).
  Flush store→DOM étendu dans `editor-shared-nodal-to-dom.js` :
  projection sur `#useInventory`, `#inv-pos`, `#inv-icon`,
  `#inv-bgc`, `#inv-bga`, `#inv-color` + `dispatchEvent("change")`
  sur `#useInventory` pour préserver le masquage legacy.
  Tests Vitest ajoutés/ajustés :
  `c102aGlobalSettingsHub.test.tsx` (Inventaire actif, 3 disabled)
  + nouveau `c102bInventoryGlobalSettings.test.tsx`
  (popup binding+flush, round-trip serialize/hydrate,
  flush `applyFromStore` vers DOM legacy). Recettes manuelles C10.2.b :
  (1) modale Inventaire ↔ formulaire legacy en live ; (2) save `.escapegame`
  puis reload conserve les champs ; (3) publication HTML conserve les valeurs.

 - 2026-05-07 — **C10.2.a-fix livré** (`feat/c10-autonomy`) : pivot UX
  hub accordion → **liste verticale de 6 boutons** (alignement C10.1
  Publish). `GlobalSettingsHubPopup` : 2 boutons actifs
  (`Identité projet`, `Thème popups`) et 4 boutons `disabled` avec
  tooltip `Bientôt — C10.2.x` (`.b`, `.d`, `.e`, `.f`). Création
  `ProjectIdentitySettingsPopup.tsx` (titre + champ `meta.title` +
  flush DOM `#gameTitle` + bouton Terminé). Wiring `NodalCanvas` :
  state `projectIdentitySettingsOpen`, ouverture depuis le hub, fermeture
  Échap via `closeActiveModal`, coexistence avec `PopupThemeCustomizationPopup`.
  `GlobalSettingsHubPopup.css` nettoyé (suppression styles accordion,
  conservation styles bouton-liste). Tests réécrits :
  `c102aGlobalSettingsHub.test.tsx` (bouton-liste, 4 disabled, callbacks)
  + nouveau `c102aFixProjectIdentityPopup.test.tsx` (rendering, binding
  titre, fermeture). Aucune modification modèle/store/sérialisation
  C10.2.a (maintien de `ProjectMeta.settings`/hydrate/serialize tel quel).
  Recettes manuelles C10.2.a reconfirmées via le nouveau flux
  Hub → popup Identité.

- 2026-05-07 — **C10.2.a livré** (`feat/c10-autonomy`). Votes Q-C10.2.a-1→3 :
  accordion `<details>` natif / seule **Identité projet** ouverte par
  défaut / `ProjectSettings` entièrement optionnel. `ProjectMeta` étendu
  avec `settings?: ProjectSettings` (`project.ts`). `GlobalSettingsHubPopup`
  restructuré : wrapper `PalettePopupModal`, 6 sections (Identité,
  Inventaire placeholder **C10.2.b**, Thème popups avec bouton vers
  l’éditeur existant `playerPopupTheme` sans migration, Audio **.d**,
  Timer & sauvegarde **.e**, Fins de partie **.f**). Champ titre lié à
  `meta.title` + `setMetaTitle` dans `nodalProjectStore` ; après chaque
  `onChange`, `EditorSharedBundle.flushNodalStoreToEditorDom()` pour
  refléter `#gameTitle` en live. `applyFromStore` étendu
  (`editor-shared-nodal-to-dom.js`) : projection `meta.title` →
  `#gameTitle`. `ProjectJsonV2` : `meta?: { settings? }` ;
  `deserializeFromProjectJson` lit `json.meta.settings` ;
  `serializeToProjectJson` n’écrit `meta` que si `settings` a au moins
  une clé. Typage `window.EditorSharedBundle` dans
  `escape360NodalChrome.d.ts`. `NodalCanvas` passe `store` au hub.
  Styles `GlobalSettingsHubPopup.css`. **6 tests Vitest** verts
  (`c102aGlobalSettingsHub.test.tsx`). Build `editor-map` vert.
  **Recettes manuelles** (journal) : (1) modale Paramètres → titre →
  vérifier `#gameTitle` legacy ; (2) titre → `[Sauver .escapegame]` →
  reload → titre modale ; (3) titre → `[Publier]` → `index.html` contient
  le titre.

- 2026-05-07 — **C10.3 livré** (`feat/c10-autonomy`) : ouverture nodale **par défaut**.
  Timing **Q-C10.3-1 (c)** : après `await initLocalDraftFeature()` (+ prompt restore
  éventuel, synchrone) dans le handler **`window`** `load` (+ 80 ms), appel à
  `escape360TryOpenDefaultNodalMap("load")` → même flux que `openNodalMapEditor`
  (modale carte + onglet moteur nodal). Second déclenchement après chargement
  `.escapegame` lorsque `hydrateFromBundle` a réussi (fin de chaîne ZIP), pour
  afficher tout de suite le graphe hydraté. **Q-C10.3-2 (a)** : pas de
  localStorage. **Q-C10.3-3** : aucun changement sur `meta.viewport`. Fichiers :
  `js/editor-nodal-map-bootstrap.js`, `js/editeur-app.js`, `js/editor-en-app.js`.
  Vitest : `c103DefaultNodalMapVisible.test.tsx` (mock `ResizeObserver`, `.nodal-palette`
  + `.react-flow` présents au mount).
  Recettes manuelles : éditeur neuf → modale carte nodale sans clic ; charger
  `.escapegame` → carte avec contenu ; reload → carte ; `[Formulaire]` ferme encore
  vers le formulaire legacy.

- 2026-05-07 — **C10.4 livré** (`feat/c10-autonomy`) : formulaire legacy **read-only**.
  Module `js/editor-shared-legacy-verify-mode.js` (bandeau sous `#editor-global-root`,
  désactivation input/textarea/select/button + zones `[onclick]` + gel Quill,
  `MutationObserver` sur `#editor-global-root` / `#scenes-container`, modales
  picker / aperçu scène ; barre d’outils : seuls `toolbar-open-drawflow-map` et
  `toolbar-open-nodal-map` restent actifs ; entrées `file-import` / `bundle-media-file`
  non désactivées). Styles `css/editor.css`. Palette : bouton **Vérifier** /
  **Verify** + tooltip read-only (`NodePalette.tsx`). Vitest
  `c104NodePaletteVerify.test.tsx`. FR/EN : `editeur.html` / `editor_en.html`.

- 2026-05-07 — **C10.5 livré** (`feat/c10-autonomy`) : upload média local sur la carte nodale.
  `js/editor-shared-bundle.js` : `pickLocalMediaFromBundle` (input fichier dédié),
  `releaseBundleTrackedBlobUrl`, annulation `abortBundleReactPickPromise` avant le 📎 legacy.
  Bridge `window.__escape360NodalChrome.pickLocalBundleMedia` (FR + EN). Composant
  `MediaUploadButton.tsx` (+ `.css`), constantes `mediaUploadAccept.ts`. Popups équipées :
  `AudioGlobalSettingsPopup`, `InventoryGlobalSettingsPopup`, `MediaEditorPopup`,
  `HotspotAppearancePopup`, `ObjectEditorPopup`. **Pas** d’éditeur dédié « URL panorama 360° »
  en React (pas dans l’audit des popups). Vitest `c105MediaUploadButton.test.tsx`.

- 2026-05-06 — **C10.0 livré** : section « Audit globals (C10.0) »
  (tableau + DOM-reading + proposition **C10.2.a–g**). Plans C10.1+
  peuvent intégrer la liste des flush et la suppression du timer 8 s.
- 2026-05-06 — Ouverture Annexe D. Cadrage validé en phase questions
  (Q-C10-1 → Q-C10-bis-4). Découpage 5 sous-chantiers (C10.0 → C10.4),
  branche `feat/c10-autonomy` créée depuis `feat/nodal-map`. Plan
  détaillé C10.0 rédigé.

