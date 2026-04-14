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

---

## Phase suivante (éditeur / UX audio)

*(Rien d’ouvert ici pour l’instant — voir revue doc ci-dessous ou backlog produit.)*

---

## Revue documentation (dépôt public)

8. **Audit global `docs/`** — pour chaque fichier : encore pertinent par rapport au code actuel ? doublons ou contradictions avec `README`, `PLAN_EDITEUR_NODAL`, `CONTRIBUTING`, `ARCHITECTURE` ? Mettre à jour ou retirer ce qui est obsolète ; ajuster la feuille de route du README si l’export / le bundle ont évolué.
9. **(Plus tard)** Règle Cursor du type *« maintenir la doc à jour »* lors d’ajouts de fonction — à introduire seulement quand le backlog ci-dessus est plus léger, pour éviter de multiplier les règles `alwaysApply` sans effet.

---

## Notes Windows / ZIP

Décompression : **Propriétés → Débloquer** puis extraire ; si besoin **7-Zip**. Ce n’est pas un défaut du générateur ; une phrase dans la doc joueur (`Lisez-moi.txt` / README) peut suffire.
