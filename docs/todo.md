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

---

## Idées / plus tard (non bloquant)

- **Règle Cursor** du type *« maintenir la doc à jour »* lors d’ajouts de fonction — seulement si le backlog léger le justifie (éviter les règles `alwaysApply` sans effet).

---

## Backlog idées (avril 2026 — à prioriser, une PR / thème)

Synthèse des pistes à traiter **plus tard** (pas tout en parallèle). Détail volontairement ici pour ne pas perdre le fil.

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
