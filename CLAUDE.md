# CLAUDE.md — Briefing pour reprise de session (escape-game-360-maker)

> **Usage** : lis ce fichier en premier dans une nouvelle session.
> Il décrit le projet, le workflow de chantier, les conventions de
> numérotation/branches/commits, et trois **déclencheurs** qui
> couvrent 95 % des sessions : préparer un chantier, ajouter un
> chantier au backlog, aider sur un fix difficile.
>
> Ce dossier `.claude/worktrees/loving-joliot-1ca2d7/.claude/` est
> **gitignoré** et **non lu par Cursor**. Tu peux y écrire librement.

---

## 1. Le projet en 30 secondes

`escape-game-360-maker` — éditeur web pour créer des escape games en
panorama 360°. **Deux interfaces coexistent** :

- **Formulaire vanilla** (legacy) — `editeur.html` + `editor_en.html` +
  `js/editeur-app.js` / `editor-en-app.js`. DOM `#scenes-container`
  avec des `.scene-block`.
- **Carte nodale React** (la nouvelle) — `xflow/react/`. Stack :
  React 19 + React Flow v12 + Zustand vanilla. Build via
  `npm run build:editor-map` → `xflow/react/dist/*` (hors Git).

Les deux éditent le **même JSON projet** (`schemaVersion: 2`). La carte
nodale est désormais **la source de vérité** ; elle fait un flush
périodique (toutes les 8 s) vers le DOM legacy via
`js/editor-shared-nodal-to-dom.js` pour que `getCurrentProjectData()`
(legacy) reste cohérent au moment de `generateGame()`.

**Document de référence #1** :
`C:/Users/RenaldGauthier/Documents/GitHub/escape-game-360-maker/.cursor/rules/NODAL_MAP_SPEC.mdc`.
C'est la spec normative + journal courant. Tout discours d'architecture
ou de comportement repart de ce fichier.

**Branches actives** :
- `main` — production / refs.
- `feat/nodal-map` — branche d'intégration des chantiers.
- `feat/cN-<slug>` — branche d'un chantier en cours (créée à
  l'ouverture, supprimée après merge).

---

## 2. Workflow de chantier (§8 de NODAL_MAP_SPEC.mdc)

### 2.1 Pattern « questions d'abord »

Pour tout chantier non trivial, on (Claude et/ou Cursor) doit :

1. Lire la spec et le code, **poser des questions en texte**.
2. Attendre validation utilisateur.
3. **Puis seulement** coder.

Si l'agent saute l'étape questions et part en défaut, c'est un warning
à corriger.

### 2.2 Un commit = un sous-chantier

Sous-chantiers numérotés : `C10.1`, `C10.2`, `C10.3`, etc.

Variantes :
- **Sous-découpage** : `C10.1.a`, `C10.1.b` si une étape doit être
  splittée pendant l'implémentation.
- **Fixes** : si un sous-chantier `C10.5` a besoin de correctifs après
  livraison initiale, ils s'appellent `C10.5-fix`, `C10.5-fix2`,
  `C10.5-fix3`. Le premier reste sans suffixe (`C10.5-fix`), les
  suivants sont numérotés.
- **Hotfix de clôture** : si un bug bloquant émerge pendant le test
  plan de la PR de clôture, il est livré comme `CN.X-fix` sur la
  branche du chantier avant le merge (cf. cas `C8.7-fix` round-trip
  layout).

### 2.3 Annexe D vivante → Annexe B à la clôture

Pendant un chantier en cours :
- L'**Annexe D** est ouverte dans `NODAL_MAP_SPEC.mdc`. C'est un
  journal de décisions, plans détaillés par étape, traces de bugs et
  fixes. Croît au fil du chantier.
- À la clôture, son contenu est **synthétisé** dans une nouvelle
  section **Annexe B — CN** (concise, axée fichiers livrés et
  périmètre figé), puis **archivé** sous
  `docs/archives/chantier_N.md` (l'Annexe D est retirée de la spec).

### 2.4 Pas de rétrocompat

Tout nouveau chantier peut casser le format en mémoire si nécessaire ;
seul `project.json` schemaVersion 2 est intangible.

### 2.5 Versions

- **vX.Y** majeure ou mineure pour clôture de chantier (ex. v1.7 = C8,
  v1.8 = C9, v1.9 réservée pour C10).
- **vX.Y.Z** patch pour les mises à jour de doc / roadmap entre deux
  clôtures (ex. v1.8.5 = formalisation roadmap C10-C16, v1.8.6 = ajout
  C11 Deploy + renumérotation).
- Le bump n'est **pas automatique** — uniquement quand l'utilisateur
  le demande explicitement, ou en clôture de chantier.
- Pas de fichier CHANGELOG.md séparé : tout vit dans le header
  bloc-citation de `NODAL_MAP_SPEC.mdc` lignes 1-90 environ. Chaque
  bloc est précédé d'une ligne vide.

### 2.6 README / docs produit

Le README.md a une section « Récent (carte nodale React) » + une
section « Notes de version 2.0 ». Bilingue FR/EN — synchroniser les
deux blocs si on touche à l'un. **Mise à jour optionnelle** —
généralement reportée aux releases marketing (basculement
`feat/nodal-map` → `main`).

### 2.7 Clôture d'un chantier — checklist

Quand l'utilisateur dit *« on clôture C10 »*, *« prépare la PR de
C11 »*, *« archive le chantier »*, suivre cette procédure dans
l'ordre.

**1. Pré-vérifications** :

```bash
git -C "<repo>" status   # working tree propre attendu
git -C "<repo>" log --oneline origin/feat/nodal-map..feat/cN-<slug>  # commits livrés
cd <repo>/xflow/react && npm test  # Vitest tout vert
```

Si rouge : ne pas clôturer, fixer d'abord.

**2. Synthèse Annexe D → Annexe B** :

- Repérer le bloc `## Annexe D — Chantier CN` dans la spec.
- Créer / amender la section `### CN — <titre>` dans **Annexe B**
  (l. ~960 selon état spec) avec :
  - Branche du chantier (`feat/cN-<slug>`).
  - **Périmètre livré (synthèse)** : un bullet par sous-chantier
    `**CN.X**` — code fait, fichiers ajoutés, décisions clés.
  - **Écartés** : sous-chantiers retirés du plan + raison.
  - **Reste éventuel** : items hors clôture stricte (smoke
    optionnel, follow-ups).

**3. Archivage du journal** :

- Extraire le contenu intégral du bloc `## Annexe D — Chantier CN`
  vers `docs/archives/chantier_<N>.md` (créer le fichier si absent).
- Supprimer le bloc Annexe D de `NODAL_MAP_SPEC.mdc`.
- Mettre à jour Annexe B — CN pour pointer le journal archivé :
  `**Journal détaillé** (plans + décisions) :
  \`docs/archives/chantier_<N>.md\``.

**4. Bump de version** :

- Header l. 5 : `**Version** : 1.X (<date>)` → `1.X+1 (<aujourd'hui>)`.
- Insérer un nouveau bloc `> **Changelog v1.X+1**` au-dessus de
  l'ancien (l. 12), format style des changelogs précédents :
  périmètre livré, écartés, détail Annexe B + lien archive.

**5. §0.1 et §7** :

- §0.1 : ajuster « Annexes A–C (chantiers C1–CN livrés) ».
- §7 → CN : ajouter `- **Livré** (<date>) — synthèse **Annexe B —
  CN**, journal `docs/archives/chantier_<N>.md`.` en tête de la
  section.
- §7 intro : ajuster « C1–CN livrés » si pertinent.

**6. Commits de clôture** :

```bash
git add .cursor/rules/NODAL_MAP_SPEC.mdc docs/archives/chantier_<N>.md
git commit -m "docs(nodal): clôture chantier CN — archive Annexe D, bump v1.X+1"
git push
```

**7. PR GitHub** (si `gh` non installé, pré-remplir l'URL) :

```
https://github.com/MentisVidus/escape-game-360-maker/compare/feat/nodal-map...feat/cN-<slug>?expand=1
```

Titre suggéré : `CN — <titre court> (clôture)`. Corps :
- ## Résumé (X commits sur `feat/cN-<slug>`)
- ## Périmètre livré (bullets `**CN.X**` repris d'Annexe B)
- ## Écartés (si applicable)
- ## Documentation (Annexe D archivée, version bumpée)
- ## Tests (suite Vitest verte, smoke notes)
- ## Test plan (checklist round-trip / repro / non-régression)

**8. Test plan & hotfix éventuel** :

- Si le test plan révèle un bug bloquant → livrer un `CN.7-fix` (ou
  numérotation libre selon convention §2.2) sur la même branche
  AVANT le merge. Ne pas merger une PR avec régression connue dans
  `feat/nodal-map`.
- Mettre à jour Annexe B — CN avec une ligne sur le hotfix.

**9. Post-merge cleanup** :

```bash
git switch feat/nodal-map
git pull --ff-only origin feat/nodal-map
git branch -d feat/cN-<slug>   # safe-delete (échoue si non mergé → vérifier)
git fetch --prune origin       # synchroniser remote-tracking
```

GitHub supprime souvent la branche distante au merge (option
« Delete branch »). Sinon : `git push origin --delete feat/cN-<slug>`
avec confirmation utilisateur.

`docs/temporaire/<chantier-fixtures>/` reste local (gitignored), à
nettoyer manuellement par l'utilisateur s'il veut libérer.

**10. Préparer le chantier suivant** :

- Si l'utilisateur enchaîne directement → §4 (« prépare CN+1 »).
- Sinon → confirmer que tout est clean et attendre.

---

## 3. État courant (snapshot dynamique)

**Plutôt que figer l'état ici** (ça vieillit vite), interroge la spec
et le ROADMAP :

```bash
# version courante
head -10 .cursor/rules/NODAL_MAP_SPEC.mdc | grep "Version"

# chantiers livrés vs planifiés (intro §7)
grep -A 4 "^## 7" .cursor/rules/NODAL_MAP_SPEC.mdc | head -10

# liste des chantiers en §7
grep "^### C" .cursor/rules/NODAL_MAP_SPEC.mdc | head -30

# Annexe D ouverte ?
grep "^## Annexe D" .cursor/rules/NODAL_MAP_SPEC.mdc

# Backlog ordonné (suggestions priorité d'implémentation)
cat ROADMAP.md
```

Au démarrage de session, fais ce check et résume en 2-3 lignes à
l'utilisateur.

**Index ordonné des chantiers** : `ROADMAP.md` à la racine du repo —
livrés (table avec versions) + backlog avec ordre d'implémentation
suggéré, raison du choix, et descriptif court de l'apport. Format
minimal qui renvoie à `NODAL_MAP_SPEC.mdc` et aux archives pour les
détails. **À tenir à jour à chaque clôture de chantier** (déplacer
livré + ajuster ordre backlog si priorité produit a évolué).

**Archives chantiers** : `docs/archives/chantier_<N>.md` pour C8 et
ultérieurs. Y trouver le journal détaillé, plans Cursor, décisions de
design.

---

## 4. Déclencheur **« prépare le chantier CN »**

Quand l'utilisateur dit *« prépare C10 »*, *« cadrons C11 »*, *« on
attaque le chantier Netlify »* etc., applique cette procédure.

### 4.1 Lecture du scope existant

1. Lis `§7 → CN` dans `NODAL_MAP_SPEC.mdc`.
2. Repère les zones de flou (ce qui est cadré vs ce qui ne l'est pas).
3. Si le chantier précédent est en cours (Annexe D non vide) ou si la
   version courante n'est pas alignée avec la livraison du précédent,
   **signale-le** avant d'enchaîner.

### 4.2 Phase questions (§8.1 strict)

Pose des questions numérotées **Q-CN-1**, **Q-CN-2**, ... avec :

- Une question claire (un point précis à trancher).
- Plusieurs options *(a)*, *(b)*, *(c)* quand il y a des choix
  d'implémentation ou d'UX.
- **Mes votes/recommandations explicites** quand pertinent : « *Mon
  vote : (a). Raison : ...* ». L'utilisateur les apprécie et s'en sert
  comme défaut.
- Les questions d'edge cases en bonus (`Q-CN-3-bis`).

Couvre au minimum :
- Périmètre exact (qu'est-ce qui rentre, qu'est-ce qui sort).
- Découpage (combien de sous-chantiers, lesquels, dépendances).
- Décisions de design structurantes (architecture, schémas de données,
  cibles UX).
- Réutilisation de code existant (refactoring opportuniste — c'est
  notre rôle de le repérer, Cursor n'a pas la vision globale).
- Pièges anticipés vs éléments laissés à Cursor.

**Ne rédige rien en doc tant que le user n'a pas validé les réponses.**

### 4.3 Création de la branche

Une fois les réponses validées :

```bash
git -C "<repo>" switch feat/nodal-map
git -C "<repo>" pull --ff-only origin feat/nodal-map
git -C "<repo>" switch -c feat/cN-<slug-court>
```

Slug court : 2-3 mots descriptifs (`feat/c10-autonomy`,
`feat/c11-netlify-deploy`).

### 4.4 Rédaction de l'Annexe D — structure obligatoire

Insérer après Annexe C dans `NODAL_MAP_SPEC.mdc` :

```markdown
## Annexe D — Chantier CN (en cours)

> **Vivante** (§8.4) — journal de décisions, plans détaillés, traces
> de bugs et fixes. Sera synthétisée dans **Annexe B — CN** à la
> clôture du chantier puis archivée sous `docs/archives/chantier_N.md`.

**Date d'ouverture** : YYYY-MM-DD.
**Branche** : `feat/cN-<slug>` (depuis `feat/nodal-map`).
**Statut** : cadrage validé (Q-CN-1 à X) — démarrage CN.0/1 imminent.

### Scope figé
[Synthèse des décisions issues de la phase questions, avec bullets.]

### Stratégie de découpage
[Tableau markdown : # | Périmètre | Dépend de — pour CN.1 → CN.X.]

### Décisions de design
[Bullets sur architecture, schémas, conventions choisies. Inclure les
liens vers exemples / docs externes si pertinent.]

### Plan détaillé CN.1 — directives pour Cursor

**Pré-requis** : ...

**Contexte** : ...

**Fichiers à lire avant de coder** :
- `chemin/fichier1.ext`
- `chemin/fichier2.ext`

**Phase questions (workflow §8.1)** :
- **Q-CN.1-1** — ... *Vote : ...*
- **Q-CN.1-2** — ...

**Périmètre** :
- ...

**Critères de fin** :
- ...
- Test Vitest : ...

**Branche / commit** :
- Branche : `feat/cN-<slug>`.
- Commit : `feat(nodal): CN.1 <résumé court>`.
- Annexe D — Journal de chantier mis à jour (entrée 1-2 lignes).

### Plan détaillé CN.2 — directives pour Cursor
... (même structure)

### Plan détaillé CN.3 — directives pour Cursor
... etc.

### Journal de chantier

- YYYY-MM-DD — Ouverture Annexe D. Cadrage validé en phase questions
  (Q-CN-1 à X). Découpage N sous-chantiers, branche `feat/cN-<slug>`
  créée depuis `feat/nodal-map`.
- YYYY-MM-DD — Plans détaillés CN.1 → CN.X rédigés (Annexe D), prêts
  à être livrés à Cursor sous-chantier par sous-chantier.
```

Chaque **« Plan détaillé CN.X »** doit être **self-contained** : un
développeur (ou Cursor) qui ne connaît rien d'autre que ce bloc doit
pouvoir partir.

### 4.5 Commits doc-only d'ouverture

Deux commits possibles (ou un seul gros) :

1. `docs(nodal): ouverture Annexe D — chantier CN (cadrage)` —
   contient juste scope, découpage, décisions, journal initial.
2. `docs(nodal): plans détaillés CN.0–CN.X (Annexe D)` — ajoute les
   plans Cursor.

Push avec `-u origin feat/cN-<slug>` au premier commit.

### 4.6 Hand-off à Cursor

Pour démarrer CN.1 (ou CN.0 s'il y a un pré-requis), donner à Cursor
**la section « Plan détaillé CN.X » telle quelle** copie-collée. Pas
besoin d'autre contexte — la section est self-contained.

---

## 5. Déclencheur **« ajoute un chantier »**

Quand l'utilisateur dit *« ajoute un chantier C18 qui fait Y »*, *« je
veux ajouter le chantier visite virtuelle »*, etc.

### 5.1 Choix de la place

Deux cas :

- **Append** (priorité basse, ajout au backlog) → numéro suivant
  disponible (`grep "^### C" §7 | tail -1` pour trouver le dernier).
  Pas de renumérotation.
- **Insertion** (priorité haute, doit passer avant un chantier déjà
  numéroté) → renumérotation des chantiers suivants. Demander
  confirmation au user avant de renuméroter (risque d'invalider des
  notes externes — même si en interne tout est dans la spec).

### 5.2 Format de section dans §7

Reproduire le style des chantiers existants (cf. C10–C17) :

```markdown
### CN — Titre court *(qualifier optionnel)*

[Description courte 1-2 phrases : objectif et valeur.]

[Sections principales en bold :]

**Cœur technique** / **Périmètre fonctionnel** / **Axes A/B/C** :

- Bullet 1
- Bullet 2

**Points à cadrer en phase questions** :
- ...

Découpage attendu (à valider §8.1) : **CN.1** ... ; **CN.2** ... ;
**CN.3** ...
```

### 5.3 Mises à jour collatérales

- **§7 intro** : ajuster la borne haute (« C10–C17 planifiés » →
  « C10–C18 »).
- **§0.1** : mettre à jour la mention « C1–C9 livrés » si relevant.
- **Header changelog** : bumper version (patch v1.X.Y → v1.X.Y+1) avec
  bloc « Changelog v1.X.Y+1 » expliquant l'ajout.

### 5.4 Commit

Doc-only directement sur `feat/nodal-map` (pas de branche dédiée pour
ces ajouts) :

```
docs(nodal): §7 ajout CN <titre court> + bump v1.X.Y
```

---

## 6. Déclencheur **« aide-moi sur ce fix »** / debug Cursor

Quand l'utilisateur revient avec *« Cursor coince sur CN.X »*,
*« le bug round-trip persiste »*, *« le test passe mais visuellement
c'est cassé »*.

### 6.1 Aller chercher dans la doc

Sources par priorité :

1. **§7 → CN** dans la spec — cadrage initial.
2. **Annexe D → Plan détaillé CN.X** — directives Cursor pour ce
   sous-chantier (s'il existe encore).
3. **Annexe B — CN** — synthèse fin de chantier (si chantier livré).
4. **`docs/archives/chantier_<N>.md`** — journal complet archivé
   (décisions de design, fixes successifs, raisons d'abandon).
5. **Tests Vitest** — `xflow/react/src/__tests__/c<N>*.test.ts` —
   ce qui est censé fonctionner.
6. **§7 Pièges connus** de ce briefing.

### 6.2 Demander des artefacts

Pour bisecter un bug runtime :

- `git status`, `git log --oneline -10`, fichiers modifiés non commit.
- Pour un bug round-trip / hydrate : demander que l'utilisateur
  produise un cas réel et le dépose dans `docs/temporaire/<bug-name>/`
  (ce dossier est gitignored — `.gitignore` l. 17 `docs/temporaire/`).
- Pour un bug visuel : screenshots avant/après. **Cursor ne peut PAS
  voir ces screenshots** — c'est moi (Claude) qui les analyse.

### 6.3 Méthode de bisect (à imposer à Cursor)

Si Cursor a déjà tenté un fix qui n'a pas marché :

- Ses tests Vitest verts ne suffisent pas — exiger une repro headless
  qui **FAIL avant fix puis PASS après**, sur le **chemin réel** du
  bug (`hydrateFromBundle`, pas une fonction interne contournée).
- Si Cursor ne peut pas reproduire : c'est qu'il n'est pas sur le bon
  chemin. Le forcer à tracer depuis le point d'entrée
  (`editeur-app.js`, `NodalCanvas.tsx`, etc.) plutôt que de modifier
  une couche interne au hasard.
- Si plusieurs hypothèses : ajouter `console.log` à chaque étape de la
  chaîne suspecte et faire afficher le diff après chaque mutation.

### 6.4 Rédaction d'une directive d'itération suivante

Si Cursor a livré un fix incorrect, ne pas juste répéter — adapter la
directive avec :

- Mes hypothèses ordonnées (probabilité décroissante).
- Méthode de debug imposée (artefacts à fournir, points de trace).
- Critères de fin renforcés (test FAIL→PASS sur chemin réel).
- Référence aux pièges connus (§7) qui matchent le symptôme.

---

## 7. Pièges connus (héritage des sessions précédentes)

### 7.1 Coordonnées relatives ↔ absolues

Beaucoup de bugs C8 venaient de la confusion entre coordonnées
absolues (canvas) et relatives au parent React Flow. La fonction
`getAbsolutePosition` dans `xflow/react/src/view/nesting/geometry.ts`
remonte la chaîne `parentId`. À utiliser systématiquement avant de
manipuler des positions cross-parent.

### 7.2 `reanchorSBox` et bornes positives

Les enfants d'un s-box doivent avoir des coordonnées relatives
**positives** (≥ `SCENE_PADDING_X`, `SCENE_PADDING_TOP`). Si une
opération crée une coord négative, appeler `reanchorSBox` pour décaler
le s-box et préserver les positions absolues des enfants.

### 7.3 Source de vérité = nodal store

`window.__ESCAPE360_NODAL_STORE__` est l'unique source de vérité. Le
DOM legacy est un **miroir** alimenté par
`editor-shared-nodal-to-dom.js`. Toute logique qui veut connaître
l'état du projet doit lire le store, pas le DOM. Inversement, modifier
le DOM directement est déconseillé — passer par les actions du store.

### 7.4 `reconcileAutoSatellites` est appelé partout

Le store appelle `reconcileAutoSatellites` après quasi chaque mutation
(connect, disconnect, attachChild, removeNode, ...). Il crée/détruit
les satellites auto pour rester cohérent. Si tu ajoutes une nouvelle
mutation, **n'oublie pas l'appel** sinon les satellites deviennent
incohérents. Pareil pour `reconcileSceneBoxes`.

### 7.5 Mismatch d'ids action `act__…` vs `action-…`

Détecté en C8.7-fix. À l'hydrate, `applyStableSceneAndActionLayout`
peut laisser `parentId === null` pour les hotspots racines si
`map-layout.json` n'a que des ids `action-…` legacy alors que la
désérialisation produit des `act__…`. `migrateSceneToSBoxParenting`
traite ensuite des coords relatives comme du monde et casse le graphe.
Fix : dériver le parent `sbox-…` depuis `extId + state.scenes` via
`sceneBoxParentIdFromRootHotspotPathKey`.

### 7.6 Sources de vérité dupliquées sur s-box

`nodalSceneBoxLayoutByExternalId` ET `nodalSceneLayoutByExternalId`
portent toutes les deux le monde de la scène. Chercher laquelle est lue
en priorité dans `applyHydratedLayout` / `applyStableSceneBoxLayout`.
Si modification, vérifier que les deux restent cohérents (ou décider
laquelle déprécier).

### 7.7 Les tests Vitest verts ne prouvent pas un fix UI

Si l'utilisateur observe un bug visuellement et que les tests passent,
c'est que les tests ne couvrent pas le chemin réel. Toujours exiger un
test qui FAIL **avant** le fix et PASS **après**, sur le chemin
d'entrée utilisateur (`hydrateFromBundle` complet, pas
`toReactFlowNodes` directement).

### 7.8 Le worktree de Claude (.claude/) vs le repo principal

Cette `CLAUDE.md` vit **à la racine du repo principal**
(`C:/Users/RenaldGauthier/Documents/GitHub/escape-game-360-maker/CLAUDE.md`)
et est **versionnée** dans Git. Le dossier `.claude/worktrees/.../` est
un espace harness auto-créé par Claude Code à chaque session, **gitignoré**.

**Règle stricte (directive utilisateur)** : Claude doit **TOUJOURS**
travailler sur les fichiers du repo principal et **NE JAMAIS** créer
une branche dédiée à Claude (genre `claude/<slug-auto>`). Le harness
peut auto-créer un worktree et y poser une branche `claude/...` —
**l'ignorer**. Tous les `git`, `Read`, `Edit`, `Write`, `Bash` doivent
cibler explicitement
`C:/Users/RenaldGauthier/Documents/GitHub/escape-game-360-maker/...`.

Cursor et Claude **partagent les mêmes branches** :
- `feat/nodal-map` — branche d'intégration (édition doc transverse,
  ajout chantier au backlog).
- `feat/cN-<slug>` — branche du chantier en cours, créée à l'ouverture
  selon §4.3, supprimée après merge selon §2.7 étape 9. **Cette
  branche est partagée avec Cursor** — `git pull` / `git status` avant
  toute édition pour rester synchro.

Pour modifier `NODAL_MAP_SPEC.mdc`, `ROADMAP.md`, `CLAUDE.md` ou les
sources : **toujours** sur le chemin du repo principal, sur la branche
`feat/nodal-map` (doc transverse) ou `feat/cN-<slug>` (travail de
chantier). Jamais sur une branche `claude/...`.

Si une session démarre dans un worktree `.claude/worktrees/.../`
(working directory imposé par le harness), continuer mais cibler le
repo principal via chemins absolus dans toutes les commandes.

### 7.9 Cursor ne lit pas `.claude/`

`.claude/` est dans `.gitignore` ET non indexé par Cursor
(`.cursorignore`). Le contenu de `.claude/worktrees/.../` est invisible
pour Cursor. En revanche, **`CLAUDE.md` à la racine du repo est
versionnée et indexée par Cursor** — toute modification y est visible
de Cursor au prochain pull.

---

## 8. Conventions de communication & briefing Cursor

### 8.1 Avec l'utilisateur (ce qui marche)

- **Tableaux markdown** pour résumer bugs / fixes / décisions / état.
- **Citations exactes du code** avec liens (`fichier.ts:42`).
- **Mes votes / recommandations explicites** quand un choix design est
  posé (« Mon vote : (a). Raison : ... »).
- **Énumérer les questions par bloc Q-CN-X numéroté** — facilite la
  réponse point par point.
- **Distinguer ce qui est livré, en cours, et reporté** dans tout
  status update.
- **Demander confirmation avant les actions destructrices ou
  ambiguës** (renumérotation, suppression branche, force-push).

### 8.2 Avec l'utilisateur (ce qui agace)

- **Sur-précision sur le code** : laisser Cursor implémenter, on guide.
- **Décisions unilatérales** sans demander quand les Q sont ambiguës.
- **Affirmer qu'un truc est fait sans avoir vérifié** (lire le diff /
  fichier après edit, pas juste « j'ai édité »).
- **Trop de doc générée pour rien** : si une mise à jour est triviale,
  un commit suffit, pas besoin d'une nouvelle Annexe.

### 8.3 Briefing à Cursor (constraintes invariantes)

Quand tu rédiges une directive pour Cursor (Plan détaillé CN.X) :

- **Cursor n'a PAS de navigateur**. Ne jamais lui demander une repro
  visuelle, des screenshots, une vérif d'UI. La repro = headless via
  Vitest sur fixtures (ou via script Node si nécessaire).
- **Donner contexte + directive + critères de fin**, **pas du code
  clé en main**. Cursor garde la main sur l'implémentation (noms de
  fonctions, structure interne, choix de bibliothèques mineures).
- **Refactoring opportuniste imposé par nous** : repérer les
  redondances (ex. C9 réutilisant `pasteClipboardAt` → helper
  `insertNodeAtAbsolute` factorisé) et l'inscrire explicitement dans
  le plan. Cursor n'a pas la vision globale, c'est notre rôle.
- **Phase questions §8.1 systématique** dans chaque plan : Cursor doit
  poser ses propres Q-CN.X-Y avant de coder.
- **Critères de fin testables** : test Vitest qui échoue avant fix et
  passe après. Si jsdom limite (cas drag-and-drop natif), accepter une
  note manuelle dans le journal.

### 8.4 Tone

Direct, concis, technique. Tutoiement. Pas de smileys. Code en
backticks, paths en italique ou backticks selon contexte. Tableaux
quand ça aide. Prohibition des fioritures (pas de « Excellent ! »,
« Avec plaisir ! » — aller direct au contenu).

---

## 9. Quick-start — routing par déclencheur

| L'utilisateur dit... | Va voir... |
|---|---|
| « prépare le chantier C10 » / « cadrons C12 » / « on attaque C11 » | §4 |
| « clôture C10 » / « on prépare la PR de C11 » / « archive le chantier » | §2.7 |
| « ajoute un chantier C18 qui fait Y » / « rajoute le chantier visite virtuelle » | §5 |
| « quoi faire ensuite ? » / « quel chantier après ? » / « le prochain c'est quoi ? » | `ROADMAP.md` (backlog ordonné) |
| « Cursor coince sur CN.X » / « le bug persiste » / « tests verts mais visuellement cassé » | §6 |
| « état du projet ? » / « où on en est ? » | §3 (snapshot dynamique) |
| Question architecture / comportement | NODAL_MAP_SPEC.mdc d'abord, §7 (pièges) ensuite |
| Bump version / changelog seul | §2.5 + édition directe spec |

**Avant tout** : lis ce fichier en entier la première fois, puis fais
le snapshot §3 pour comprendre où on en est, puis applique le routing.

---

*Document maintenu par Claude pour Claude. Si l'utilisateur le
modifie, considérer ses ajouts comme directives prioritaires.*
