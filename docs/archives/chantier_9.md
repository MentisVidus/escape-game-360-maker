## Annexe D — Chantier C9 (clôturée 2026-05-05)

**Statut** : **clôturé** — voir Annexe B — C9 + ce journal pour le détail.

**Date d'ouverture** : 2026-05-05.
**Branche** : `feat/c9-palette-dnd` (depuis `feat/nodal-map`).

### Scope figé

Voir §7 → C9. Précisions issues de la phase questions :

- **Palette latérale** : items draggables **remplacent** les boutons
  « Ajouter X ». Clic = create top-level au centre canvas (comportement
  actuel préservé), drag = create à position drop.
- **Cibles de drop valides** :
  - **Canvas vide** → nœud orphelin (état 1) à la position du drop.
  - **S-box** → action devient hotspot (état 2), auto-edge flow
    scène→action généré.
  - **Selector** → action devient choix (état 3), satellite
    `choice-options` auto-créé. Résolution **topmost-first** pour
    sous-selectors imbriqués (cohérence C8.6.1).
  - **REQ/PWD** → action devient récompense (état 4), déposée dans
    la pince (zone d’accroche C8.6.3).
- **Drop incompatible** (ex. `scene` sur s-box, `media-*` n’importe
  où) → fallback **silencieux** en top-level à la position du drop.
  L’auto-parentage existant (médias) prend le relais ensuite.
  - *Note future* : ouverture prévue d’un type « retour vers scène »
    (référence par select, comme satellite `object`) pour éviter
    les edges spaghetti vers scènes précédentes — **hors scope C9**.
- **Ghost pendant drag** : apparence du nœud type cible (comme un
  nœud déjà posé sur le canvas). Pas de tracking de validité par
  zone (fallback silencieux rend les nuances inutiles).
- **Exclusions palette** : `coords-options`, `choice-options`,
  `object`, s-box restent auto-managés (hors palette).
- **Pré-requis ergonomique** : la suppression d’edge devient
  fastidieuse avec des edges auto-créés (drop s-box) → **clic droit
  sur edge métier = suppression immédiate** (sous-chantier **C9.0**,
  livré avant C9.2).

### Stratégie de découpage

Convention C8 reconduite : un commit par sous-chantier ; fixes
numérotés (`C9.x.y-fix`) si correctifs en cours de chantier.

| # | Périmètre | Dépend de |
|---|---|---|
| **C9.0** | Clic droit edge métier → suppression directe (`disconnect`) | — |
| **C9.1** | Palette items draggables + drop canvas → orphelin + helper `insertNodeAtAbsolute` factorisé avec `pasteClipboardAt` | — |
| **C9.2** | Drop sur s-box → hotspot état 2 + auto-edge flow | C9.0, C9.1 |
| **C9.3** | Drop sur selector (état 3, résolution sous-selector) + REQ/PWD (état 4) | C9.1 |
| **C9.4** | Ghost node pendant drag (apparence nœud canvas) | C9.1 |

### Décisions de design

- **Architecture commune insertion** : `pasteClipboardAt` (C8.5.2)
  et le drop palette partagent un helper unique
  `insertNodeAtAbsolute(type, payload, position, opts)` qui :
  1. Crée le nœud via `addNode`.
  2. Détecte le conteneur topmost compatible à `position` (selector,
     REQ/PWD ou s-box) selon les règles d’overlap C8.6.
  3. Si incompatible (`scene` sur conteneur, etc.) ou hors conteneur
     → top-level à `position`.
  4. Si conteneur valide → `attachChild` + (cas s-box) création edge
     flow auto.
- **Stack technique** : suivre l’exemple officiel React Flow
  `dnd-flow` (https://reactflow.dev/examples/interaction/drag-and-drop).
  HTML5 Drag-and-Drop API côté palette
  (`onDragStart` + `dataTransfer.setData('application/...')`),
  `onDrop` + `onDragOver` sur le wrapper canvas,
  `useReactFlow().screenToFlowPosition` pour la conversion
  écran → flow.

### Plan détaillé C9.0 — directives pour Cursor

**Pré-requis** : C9 cadrage validé (Annexe D ouverte). Aucune dépendance code.

**Contexte** : avec C9.2 on créera un edge flow auto à chaque drop sur
s-box. La suppression actuelle (clic + `Delete` clavier) deviendra
fastidieuse. C9.0 ajoute la **suppression immédiate au clic droit** sur
les edges métier (sans menu intermédiaire — UX préférée mai 2026).

**Fichiers à lire avant de coder** :
- `xflow/react/src/view/contextMenu/NodalContextMenu.tsx`
- `xflow/react/src/view/contextMenu/nodalContextMenuModel.ts`
- `xflow/react/src/view/NodalCanvas.tsx` (rechercher `onNodeContextMenu`,
  `onPaneContextMenu`, `onEdgeContextMenu`)
- `xflow/react/src/store/nodalProjectStore.ts` (action de suppression
  d’edge — `removeEdge` ou équivalent)

**Phase questions (workflow §8.1)** — *réalisé* :
- **Q-C9.0-1** — Pas de menu edge : handler direct dans `NodalCanvas`
  (`onEdgeContextMenu` → `disconnect`).
- **Q-C9.0-2** — Edges synthétiques `synth-trans-*` : **(a)** ignorées
  (aucune action au clic droit).
- **Q-C9.0-3** — Pas de confirmation ; clic droit = suppression tout de suite.

**Périmètre** :
- Activer `onEdgeContextMenu` dans React Flow.
- Clic droit sur arête métier → `disconnect` (sync store → RF inchangée).

**Critères de fin** :
- Clic droit sur edge métier supprime l’edge (store + RF).
- Pas de régression sur menu nœud / pane (C8.5).
- Cas `synth-*` : ignorées (Q-C9.0-2a).
- Test Vitest : helper `isSynthTransitionProjectionEdgeId` + `disconnect` store (cf. tests existants).

**Branche / commit** :
- Branche : `feat/c9-palette-dnd`.
- Commit : `feat(nodal): C9.0 clic droit edge — suppression directe`.
- Annexe D — Journal de chantier : entrée 1-2 lignes au commit.

### Plan détaillé C9.1 — directives pour Cursor

**Pré-requis** : C9.0 livré (commit présent sur `feat/c9-palette-dnd`).

**Contexte** : fondations du D&D palette. Les boutons « Ajouter X »
deviennent des items HTML5 draggables (clic = comportement actuel
préservé, drag = create à position drop). Drop sur canvas vide crée
un nœud orphelin top-level. Introduction du helper
`insertNodeAtAbsolute` factorisé avec `pasteClipboardAt` (C8.5.2).
**Pas encore** de drop sur s-box / selector / REQ-PWD (C9.2-3) ni de
ghost (C9.4) — ce commit pose les rails.

**Fichiers à lire avant de coder** :
- `xflow/react/src/view/palette/NodePalette.tsx`
- `xflow/react/src/store/clipboard.ts` (`pasteClipboardAt`)
- `xflow/react/src/store/nodalProjectStore.ts` (`addNode`)
- `xflow/react/src/view/NodalCanvas.tsx` (root canvas à équiper avec
  `onDrop` / `onDragOver`)
- Exemple React Flow `dnd-flow` :
  https://reactflow.dev/examples/interaction/drag-and-drop

**Phase questions (workflow §8.1)** :
- **Q-C9.1-1** — Convention de transfert HTML5 D&D :
  `dataTransfer.setData('application/escape360-node-type', type)` simple,
  ou JSON `{ type, payload }` plus riche ? *Vote : JSON, pour transporter
  un payload par défaut et faciliter l’évolution.*
- **Q-C9.1-2** — Le clic « simple » sur item palette doit conserver le
  comportement actuel (create top-level au centre canvas) ou être
  désactivé au profit du seul D&D ? *Vote : conserver clic =
  create centre canvas (pas de friction utilisateur habitué).*
- **Q-C9.1-3** — Emplacement du helper `insertNodeAtAbsolute` :
  - `xflow/react/src/store/insertNodeAtAbsolute.ts` (logique métier) ;
  - méthode du store nodal ;
  - `xflow/react/src/view/dnd/insertNodeAtAbsolute.ts` (couche vue) ?
  *Vote : nouveau fichier `store/insertNodeAtAbsolute.ts`, cohérent
  avec `store/clipboard.ts`.*

**Périmètre** :
- `NodePalette.tsx` : `draggable={true}` + `onDragStart` posant
  `{ type, payload }` sur `dataTransfer`. `onClick` existant conservé.
- `NodalCanvas.tsx` : `onDragOver` (preventDefault pour autoriser le
  drop) + `onDrop` qui :
  1. lit le type + payload depuis `dataTransfer` ;
  2. convertit `clientX/Y` → flow position via `screenToFlowPosition` ;
  3. appelle `insertNodeAtAbsolute(type, payload, position, { source: 'palette' })`.
- `insertNodeAtAbsolute.ts` (nouveau) :
  1. crée le nœud via `addNode` ;
  2. **C9.1 only** : applique la position en absolu, `parentId = null`.
     C9.2 / C9.3 étendront pour résoudre le conteneur cible ;
  3. refactor `pasteClipboardAt` pour appeler ce helper sur chaque
     nœud du clipboard (positions translatées).
- Pas de régression sur copier-coller (C8.5.2) ni sur `addNode` direct.

**Critères de fin** :
- Drag d’un item palette + drop sur canvas vide → nœud créé à la
  position du curseur.
- Clic simple sur item palette → comportement actuel (create centre
  canvas) préservé.
- Copier-coller (Ctrl+C/V) fonctionne via le helper unifié — tests
  `clipboard.test.ts` passent toujours.
- Test Vitest : drop palette → orphelin position OK ; helper appelé
  par les deux chemins.

**Branche / commit** :
- Branche : `feat/c9-palette-dnd`.
- Commit : `feat(nodal): C9.1 palette draggable + drop canvas + helper`.
- Annexe D — Journal de chantier mis à jour.

### Plan détaillé C9.2 — directives pour Cursor

**Pré-requis** : C9.0 et C9.1 livrés.

**Contexte** : étendre `insertNodeAtAbsolute` pour résoudre le drop
sur s-box. Quand la position de drop tombe à l’intérieur d’un s-box,
l’action devient hotspot (état 2) de la scène correspondante,
parentée au s-box, ET un edge flow scène→action est créé
automatiquement.

**Fichiers à lire avant de coder** :
- `xflow/react/src/store/insertNodeAtAbsolute.ts` (créé en C9.1)
- `xflow/react/src/store/reconcileSceneBoxes.ts` (mapping s-box ↔ scène)
- `xflow/react/src/view/nesting/containerBounds.ts`
- `xflow/react/src/view/nesting/sboxCollision.ts`
- `xflow/react/src/view/handles/handleIds.ts`
- `xflow/react/src/store/nodalProjectStore.ts` (`addEdge` ou équivalent)

**Phase questions (workflow §8.1)** — *réalisé* :
- **Q-C9.2-1** — Nouveau helper **`findSceneBoxAtFlowPoint(state, position)`**
  : `absoluteFlowPositionInPane` + `computeContainerBounds` +
  `flowPointInRect` ; chevauchement → scène la plus profonde
  (`parentIdDepth`).
- **Q-C9.2-2** — Edge store `{ family: "flow", sourceId: sceneId, targetId: actionId }`
  (équivalent handles `FLOW_OUT` / `FLOW_IN` en projection RF).
- **Q-C9.2-3** — Scène / média sur s-box : branche inchangée (top-level).
  **`goto`** : flow scène→action validé (`connectionPolicy` + test Vitest).

**Périmètre** :
- Étendre `insertNodeAtAbsolute` :
  1. avant fallback top-level, tester si position tombe dans un s-box ;
  2. si oui ET type compatible (pas scene, pas média) : créer le nœud
     enfant du s-box (position relative), créer edge flow
     `scene-node:flow-out` → `action:flow-in` ;
  3. sinon : conserver fallback top-level.
- Vérifier non-régression `c8RoundtripReal` et
  `c8EscapegameLayoutRoundtrip`.

**Critères de fin** :
- Drag msg / pick / req / pwd / selector / goto + drop sur s-box →
  action devient hotspot, parentée s-box, edge flow scène→action visible.
- Drop scene sur s-box → fallback top-level (silent).
- Drop média sur s-box → fallback top-level (silent), auto-parentage
  média existant prend le relais.
- Edge auto supprimable via clic droit (C9.0).
- Test Vitest : compatible / scene / média.

**Branche / commit** :
- Branche : `feat/c9-palette-dnd`.
- Commit : `feat(nodal): C9.2 drop s-box hotspot + auto-edge flow`.
- Annexe D — Journal de chantier mis à jour.

### Plan détaillé C9.3 — directives pour Cursor

**Pré-requis** : C9.1 livré (C9.2 indépendant — peut précéder ou suivre).

**Contexte** : étendre `insertNodeAtAbsolute` pour résoudre les drops
sur selector (création choix état 3, avec sous-selector imbriqué) et
sur REQ/PWD (création récompense état 4).

**Fichiers à lire avant de coder** :
- `xflow/react/src/store/insertNodeAtAbsolute.ts`
- `xflow/react/src/store/reconcileAutoSatellites.ts` (création satellite
  `choice-options`)
- `xflow/react/src/view/nesting/containerBounds.ts` + `sboxCollision.ts`
- C8.6.3 — zone d’accroche REQ/PWD : voir
  `docs/archives/chantier_8.md` § C8.6.3 + tests `geometryRewardZone.test.ts`
- C8.6.1 — résolution topmost-first sub-selector : déjà appliquée à
  `onNodeDragStop`, à mutualiser

**Phase questions (workflow §8.1)** — *réalisé* :
- **Q-C9.3-1** — `dropContainerResolve.ts` : `findDeepestDropContainer` +
  `rewardZoneFlowRect` (réexport depuis `insertNodeAtAbsolute` pour tests).
- **Q-C9.3-2** — Selectors triés par profondeur décroissante ; test imbriqué.
- **Q-C9.3-3** — Zone récompense géométrique (alignée C8.6.3 / `nodes.css`).
- **Q-C9.3-4** / **Q-C9.3-5** — Saturation / REQ occupé : pas de hit conteneur
  → fallback top-level (pas de remplacement implicite).

**Périmètre** :
- Étendre `insertNodeAtAbsolute` :
  1. détecter conteneur le plus profond compatible : selector ⟶
     REQ/PWD ⟶ s-box (ordre topmost-first) ;
  2. selector : créer comme enfant, `reconcileAutoSatellites` ajoute
     `choice-options` ;
  3. REQ/PWD vide : créer comme enfant (récompense unique) ;
  4. REQ/PWD occupé / selector saturé : descendre dans la hiérarchie,
     sinon top-level.
- Tests Vitest : selector seul, sub-selector imbriqué, REQ/PWD vide,
  REQ/PWD déjà occupé, selector saturé (si applicable).

**Critères de fin** :
- Drop msg sur selector → choix créé, satellite `choice-options`
  auto-créé.
- Drop sur sous-selector imbriqué → choix dans le sous-selector.
- Drop sur REQ/PWD vide → action devient récompense.
- Drop sur REQ/PWD occupé → fallback top-level.
- Pas de régression tests C8.

**Branche / commit** :
- Branche : `feat/c9-palette-dnd`.
- Commit : `feat(nodal): C9.3 drop selector + REQ/PWD`.
- Annexe D — Journal de chantier mis à jour.

### Plan détaillé C9.4 — directives pour Cursor

**Pré-requis** : C9.1 livré (C9.2 / C9.3 indépendants).

**Contexte** : finition UX — pendant le drag depuis palette, afficher
un ghost qui ressemble au nœud type cible (comme un nœud canvas en
cours de déplacement). Pas de tracking de validité par cible
(décision Q-C9-4 : fallback silencieux rend les nuances inutiles).

**Fichiers à lire avant de coder** :
- `xflow/react/src/view/nodes/ActionNodeView.tsx`
- `xflow/react/src/view/nodes/MediaNodeView.tsx`,
  `xflow/react/src/view/nodes/SceneNodeView.tsx`
- `xflow/react/src/view/palette/NodePalette.tsx`
- API HTML5 D&D : `event.dataTransfer.setDragImage(element, x, y)`
- Exemple React Flow `dnd-flow` (lien spec)

**Phase questions (workflow §8.1)** — *réalisé* :
- **Q-C9.4-1** — `paletteDragGhost.ts` : DOM off-screen + classes
  `nodal-node` / `nodes.css` (pas d’overlay React).
- **Q-C9.4-2** — `setDragImage(host, width/2, height/2)`.
- **Q-C9.4-3** — opacité hôte `0.7` ; retrait au `dragend`.

**Périmètre** :
- Au `onDragStart` palette : générer le ghost selon Q-C9.4-1 et
  l’attacher via `setDragImage`.
- Si overlay React (option c) : composant `<DragGhost />` monté dans
  `NodalCanvas`, écoute des events `dragover`, met à jour sa position.
- Aucun changement à `insertNodeAtAbsolute` (purement présentationnel).

**Critères de fin** :
- Pendant le drag, un ghost ressemblant au type cible suit le curseur.
- Au drop, le ghost disparaît.
- Pas de régression sur le drop fonctionnel (C9.1-3).
- Test Vitest si possible (jsdom limite l’API D&D — sinon note manuelle
  + screenshot dans Annexe D).

**Branche / commit** :
- Branche : `feat/c9-palette-dnd`.
- Commit : `feat(nodal): C9.4 ghost node pendant drag`.
- Annexe D — Journal de chantier mis à jour.

### Journal de chantier

- 2026-05-05 — Ouverture Annexe D. Cadrage validé en phase questions
  (Q-C9-1 à 7 + Q-C9-3-bis). Découpage 5 sous-chantiers, branche
  `feat/c9-palette-dnd` créée depuis `feat/nodal-map`.
- 2026-05-05 — Plans détaillés C9.0 → C9.4 rédigés (Annexe D), prêts à
  être livrés à Cursor sous-chantier par sous-chantier.
- 2026-05-05 — **C9.0 livré** : `onEdgeContextMenu` → `disconnect` **sans menu**
  (clic droit = suppression immédiate sur arête métier ; `synth-trans-*` ignorées).
- 2026-05-05 — **C9.1 livré** : palette `draggable` + MIME JSON, `onDrop` canvas,
  `store/insertNodeAtAbsolute.ts`, collage via `computeTranslatedAbsolutePositions`.
- 2026-05-05 — **C9.2 livré** : `findSceneBoxAtFlowPoint` + drop action sur s-box
  → `parentId` s-box + edge flow scène→action ; scène/média → fallback top-level.
  Tests Vitest ; `c8RoundtripReal` + `c8EscapegameLayoutRoundtrip` OK.
- 2026-05-05 — **C9.3 livré** : `dropContainerResolve.ts` (`findDeepestDropContainer`,
  `rewardZoneFlowRect` géométrique C8.6.3), insertion selector / REQ-PWD avant s-box ;
  tests imbriqués + choice-options + récompense.
- 2026-05-05 — **C9.4 livré** : `paletteDragGhost.ts` + `setDragImage` depuis la palette
  (ghost type canvas, centré, opacité 0.7). Pas de test jsdom (API D&D) — vérif manuelle.

- 2026-05-05 — Annexe D clôturée. Synthèse en Annexe B — C9. Archive : `docs/archives/chantier_9.md`.
