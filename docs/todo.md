# Travail local — backlog issu des tests (avril 2026)

Fichier **`docs/todo.md`** (versionné pour sync entre machines). Synchroniser avec la règle Cursor **`.cursor/rules/todo.mdc`** : quand une entrée est réglée, la mettre à jour ici ; quand il n’y a plus de tâches ouvertes, on pourra supprimer ce fichier et la règle.

Document de suivi : **prioriser par chantier**, éviter de tout mélanger dans une même PR.

---

## Traitée ou partiellement adressée ici

- **Export ZIP + médias mixtes** — extension de `eachPortableMediaUrlInProject` / `rewritePortableUrlsInProjectClone` (FR + EN) : `globalAudioUrl`, `invIcon` (URL), `media.ambianceUrl` (legacy). Alerte si des `blob:` subsistent dans `index.html` après remplacement (export ZIP).
- **README — tests localhost** — rechargement forcé / cache (`Ctrl+F5`, etc.) ajouté dans les conseils FR + EN.
- **Sauvegarde `.json` + médias locaux** — `saveProject()` : `confirm` si `collectPortableBundleEmbeds` non vide ; recommande **`.escapegame`** (FR + EN).
- **SFX selector (sous-menu → scène / pick)** — `choiceToPayload` inclut `sfxUrl` / `sfxVolume` ; `closeSelectorOverlay(false)` avant `executeAction` pour ne pas appeler `stopSFX()` et couper le son ; joueur FR+EN (`editeur-generate.js` / `editor-en-generate.js`).

---

## Phase suivante (éditeur / UX audio)

1. **Volume par type de source** — aujourd’hui volume dédié surtout côté **SFX** (selector) ; étendre **ambiance** et **musique globale** (sliders ou logique alignée sur les SFX), côté formulaire + schéma déjà `{ url, volume }` où c’est pertinent.
2. **Placeholder scène (grille PNG)** — après commit sur `main`, remplacer toute URL locale par l’URL **raw GitHub** ou **jsDelivr** du fichier dans `media/` (GitHub accepte sans problème les petits PNG).

---

## Bugs / qualité à investiguer (hors ZIP)

4. **Quill au rechargement `.escapegame`** — titres (Heading 1, etc.) ou tailles perdues alors que couleurs OK : vérifier **sérialisation Delta/HTML**, enregistrements Quill personnalisés, et ordre `initRichEditorsIn` après injection DOM.

---

## Petits réglages produit

6. **Taille par défaut des hotspots** — passer **120×120** px (valeurs par défaut à la création / template hotspot).

---

## Revue documentation (dépôt public)

8. **Audit global `docs/`** — pour chaque fichier : encore pertinent par rapport au code actuel ? doublons ou contradictions avec `README`, `PLAN_EDITEUR_NODAL`, `CONTRIBUTING`, `ARCHITECTURE` ? Mettre à jour ou retirer ce qui est obsolète ; ajuster la feuille de route du README si l’export / le bundle ont évolué.
9. **(Plus tard)** Règle Cursor du type *« maintenir la doc à jour »* lors d’ajouts de fonction — à introduire seulement quand le backlog ci-dessus est plus léger, pour éviter de multiplier les règles `alwaysApply` sans effet.

---

## Notes Windows / ZIP

Décompression : **Propriétés → Débloquer** puis extraire ; si besoin **7-Zip**. Ce n’est pas un défaut du générateur ; une phrase dans la doc joueur (`Lisez-moi.txt` / README) peut suffire.
