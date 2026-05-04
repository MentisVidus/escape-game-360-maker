## Annexe D — Chantier C8 (clôturée 2026-05-02)

> **Archive** (§8.4) — journal de décisions et plans détaillés du chantier C8.
> **Synthèse périmètre + reste éventuel** : **Annexe B — C8** + §7 **C8**.
> Ce bloc n’est pas supprimé : il sert de **fil d’ariane** (commits, pivots,
> correctifs). Les mises à jour « produit » post-clôture vont dans Annexe B — C8.

**Date d’ouverture** : 2026-05-02.  
**Date de clôture** : 2026-05-02.  
**Branche** : `feat/c8-ux-adjustments` (depuis `feat/nodal-map`).  
**Statut** : **clôturé** — lots principaux livrés (voir journal ci-dessous) ;
**C8.6.4 / S4** volontairement **non réalisé** (motif sous l’étape C8.6.4).

### Scope figé

Voir §7 → C8. Rappel synthétique :

- **C8.1** Nœuds repliables (`collapsed` déjà dans `map-layout.json`).
- **C8.2** Raccourcis clavier (`Delete`, `Ctrl+C/V`, `Ctrl+F`, `?`, `Échap`,
  confirmations suppression ; pas de touche `D` — duplication = copier/coller).
- **C8.3** Indicateur visuel de la scène initiale.
- **C8.4** Recherche de nœud (`Ctrl+F`).
- **C8.5** Copier/coller de nœuds (full version : sélection multiple,
  satellites recréés, IDs nouveaux, sous-graphes selector).
- **C8.6** Rework UX selector (**S1–S3** livrés ; **S4** drag bloqué sur
  selector-récompense REQ/PWD — **écarté**, voir étape C8.6.4).

**Hors scope** : zoom auto sur sélection (reporté), mini-map,
validation visuelle des chaînes, undo/redo.

### Décisions de design provisoires

À ajuster pendant le chantier — la phase « questions d’abord » (§8.1)
reste obligatoire pour chaque sous-item non trivial.

- **C8.1 — Nœuds repliables** *(décisions figées 2026-05-02 après cadrage
  utilisateur — voir « Plan détaillé C8.1 » plus bas)*
  - Repliage activé sur **deux types de conteneurs uniquement** :
    - **selector** (sous-chantier C8.1.a — extension de l'existant) ;
    - **scene** (sous-chantier C8.1.b — nouveau, scène = vrai conteneur RF).
  - Repliage **ne masque jamais** une scène cible : les scènes sont
    l'unité maximale, on s'arrête au bord du conteneur.
  - Conteneur replié expose un **handle synthétique** `synth-goto-out`
    qui agrège (1 edge par scène-cible distincte, dédoublonnée) tous
    les `goto` internes. Pas de variante visuelle — apparence identique
    aux transitions normales.
  - Aucun impact sur `project.json` (purement layout / projection RF).
  - `collapsed` persisté dans `map-layout.json` (champ déjà prévu côté
    actions ; à étendre côté `nodalSceneLayoutByExternalId`).

- **C8.2 — Raccourcis clavier**
  - `Delete` / `Backspace` : suppression du / des nœuds sélectionnés
    (avec confirmation si la sélection casse une chaîne REQ/PWD ?).
  - `Ctrl+C` / `Ctrl+V` : copier/coller (cf. C8.5) — **duplication** par
    copier/coller uniquement (pas de touche `D`, retirée 2026-05-02).
  - `Échap` : ferme la popup d’édition active.
  - `Ctrl+A` : sélection multiple (à coordonner avec C8.5).
  - **Désactivation** des raccourcis quand un input / Quill / popup a
    le focus.

- **C8.3 — Indicateur scène initiale**
  - Badge ou icône dédiée sur le nœud `scene` correspondant à
    `firstScene` (slot prévu en `meta`).
  - Couleur ou bordure spécifique pour distinguer immédiatement.
  - Comportement si `firstScene` invalide / absent : warning existant
    suffit, pas de double signal.

- **C8.4 — Recherche de nœud**
  - Champ dans la palette latérale ou modal `Ctrl+F`.
  - Cherche dans : titre / id de scène, label d’action, titre selector,
    nom d’objet.
  - Navigation : Entrée = nœud suivant ; Maj+Entrée = précédent ; clic
    = centrage immédiat (réutiliser la logique « centrage panel
    warnings » C4).

- **C8.5 — Copier/coller de nœuds**
  - Buffer interne (pas presse-papier OS, pour éviter conflits).
  - Coller = duplication décalée + nouveaux IDs stables.
  - Satellites auto recréés via `reconcileAutoSatellites` (même
    logique que la désérialisation).
  - Références objets (`objectId`) **non dupliquées** (l’objet reste
    unique dans `meta.objects`).
  - Sélection multiple : copie un sous-graphe complet (selector + ses
    choix, REQ/PWD + récompense imbriquée).
  - Hors périmètre initial : copier-coller entre projets / sessions.

- **C8.6 — Rework UX selector** (cf. `DEV-C8-Selector-UX.md` local)
  - **S1.** Sous-selector au premier plan : `z-index` plus élevé que
    le selector parent, peut-être basé sur la profondeur d’imbrication.
  - **S2.** Fond du selector : `rgba(...)` semi-transparent (à
    accorder avec dark/light mode), conserver la lisibilité des
    enfants.
  - **S3.** Seuil d’accrochage REQ/PWD :
    - **Piste A** : calcul du seuil sur la surface du **plus petit**
      des deux nœuds (souvent le REQ/PWD).
    - **Piste B** : zone d’accrochage **dédiée** sur la pince REQ/PWD
      (rectangle invisible avec son propre seuil).
    - Choix à valider en début de C8.6 selon faisabilité React Flow.
  - **S4.** *(Écarté à la clôture — 2026-05-02.)* Ancienne intention :
    `draggable: false` sur le selector-récompense d’un REQ/PWD. Abandonné :
    l’accroche **C8.6.3** (zone DOM + recouvrement + overlap symétrique sur
    le corps REQ) rend l’attachement fiable y compris pour les **gros**
    selectors ; bloquer le drag n’apportait plus assez de valeur UX.

### Stratégie de découpage

Un sous-chantier = un commit (cf. §8.2). Ordre indicatif (du plus
isolé au plus transverse) :

1. **C8.1.a** Nœuds repliables — selector + synth-goto-out (extension
   du commit `511871a` — voir Plan détaillé).
2. **C8.1.b** Cadre scène + repli scène (sous-chantier propre, cf.
   Plan détaillé — étapes 1.b.1 à 1.b.4).
3. **C8.3** Indicateur scène initiale (style + 1 prop).
4. **C8.4** Recherche de nœud (composant nouveau, peu invasif).
5. **C8.2** Raccourcis clavier (transverse, à brancher proprement
   sans casser les inputs Quill).
6. **C8.6** Rework UX selector (touche au cœur du moteur de
   connexion ; à isoler).
7. **C8.5** Copier/coller (dépend des raccourcis et bénéficie du
   rework selector pour les sous-graphes).

### Plan détaillé C8.1 — directives pour Cursor

> Cadrage validé le 2026-05-02 (cf. journal). Cursor doit suivre ces
> étapes dans l'ordre, **un commit par étape** (sauf indication
> contraire). Chaque étape donne le contexte, la directive et le
> critère de fin. Si une décision te paraît ambiguë, **stoppe et pose
> la question** dans le chat — ne reprends pas un défaut implicite.

#### Sous-chantier C8.1.a — Synth-goto-out sur selector replié

##### Étape 1.a.1 — Handle `synth-goto-out` + edges synthétiques

**Contexte technique** :
- L'implémentation C8.1 du commit `511871a` est conservée : chevron,
  `toggleNodeCollapsed`, `collectHiddenIdsFromCollapsedSelectors`,
  marquage `hidden:true` des descendants et edges associés.
- Manque uniquement la **représentation visuelle** des goto internes :
  un handle de sortie agrégé sur le selector replié + edges projetées.

**Directive** :

1. Ajouter `HANDLE_SYNTH_GOTO_OUT = "synth-goto-out"` dans
   [xflow/react/src/view/handles/handleIds.ts](xflow/react/src/view/handles/handleIds.ts).

2. Étendre [xflow/react/src/view/nodalReactFlowProjection.ts](xflow/react/src/view/nodalReactFlowProjection.ts) :
   - Ajouter une fonction
     `collectSynthGotoTargets(state, containerIds: Set<AnyNodeId>): Map<AnyNodeId, Set<SceneNodeId>>`.
     Pour chaque conteneur (selector replié), parcourir ses
     descendants transitifs (réutiliser la table `childrenByParent`
     déjà construite dans `collectHiddenIdsFromCollapsedSelectors` —
     factoriser dans un helper commun pour ne pas calculer deux fois).
   - Pour chaque action descendante de type `goto` avec
     `payload.target` non vide, retrouver l'`SceneNodeId` interne
     correspondant via `state.scenes` (clé `sceneId === payload.target`).
   - Dédoublonner les cibles par conteneur (`Set<SceneNodeId>`).
   - Étendre `toReactFlowEdges` : pour chaque entrée
     `(containerId, targetSceneIds)`, pousser une edge synthétique :
     ```ts
     {
       id: `synth-trans-${containerId}-${targetSceneId}`,
       source: containerId,
       target: targetSceneId,
       sourceHandle: HANDLE_SYNTH_GOTO_OUT,
       targetHandle: HANDLE_GOTO_IN,
       animated: true,
       className: "nodal-edge nodal-edge--transition",
     }
     ```
   - Étendre `NodalRFData` : ajouter
     `synthGotoTargetCount?: number` (taille du `Set` pour le selector
     replié, sinon undefined).
   - Aucune autre edge n'est touchée. Les vraies transitions internes
     restent `hidden:true` (pas de duplication visible).

3. Étendre [xflow/react/src/view/nodes/ActionNodeView.tsx](xflow/react/src/view/nodes/ActionNodeView.tsx) :
   - Quand `isSelector && isCollapsed && (synthGotoTargetCount ?? 0) > 0` :
     rendre `<Handle id={HANDLE_SYNTH_GOTO_OUT} type="source"
     position={Position.Right} isConnectable={false}
     className="nodal-handle transition nodal-handle--synth" />`.
   - Le handle classique `goto-out` reste **uniquement** sur les goto
     (inchangé).

4. Garde-fou côté policy
   ([xflow/react/src/view/connectionPolicy.ts](xflow/react/src/view/connectionPolicy.ts)) :
   ajouter un `if (connection.sourceHandle === HANDLE_SYNTH_GOTO_OUT) return false;`
   en début de fonction, pour défense en profondeur même si
   `isConnectable={false}` empêche déjà l'interaction.

5. CSS : ajouter `.nodal-handle--synth` dans
   [xflow/react/src/view/nodes/nodes.css](xflow/react/src/view/nodes/nodes.css)
   ou `handles.css`. Apparence identique au goto-out (couleur, taille) ;
   ajouter `cursor: default` (pas de `crosshair`).

6. Tests — étendre
   [xflow/react/src/__tests__/selectorCollapsed.test.ts](xflow/react/src/__tests__/selectorCollapsed.test.ts) :
   - Cas A : selector replié contenant un goto → 1 edge synthétique
     (source = selectorId, sourceHandle = `synth-goto-out`,
     target = sceneId, targetHandle = `goto-in`).
   - Cas B : selector replié contenant 2 goto vers la **même** scène →
     **1 seule** edge synthétique (dédoublonnage).
   - Cas C : selector replié contenant 2 goto vers 2 scènes
     différentes → 2 edges.
   - Cas D : selector replié sans goto interne → aucune edge
     synthétique, `synthGotoTargetCount === 0`, handle non rendu.
   - Cas E : selector déplié → aucune edge synthétique (idempotence).

**Critère de fin** :
- `npm run test --workspace xflow/react` vert (suite complète).
- `npm run build --workspace editor-map` sans nouveau warning.
- Smoke manuel : créer un selector avec un goto vers Scene B et un
  goto vers Scene C, replier → 2 edges depuis le synth-handle.
  Modifier un goto pour pointer aussi vers Scene B → après repli,
  une seule edge.
- Mise à jour journal Annexe D (étape 1.a.1 livrée).

---

#### Sous-chantier C8.1.b — Cadre scène + repli scène

> ⚠️ Sous-chantier nouveau, plus invasif (modèle layout + sérialisation).
> Pré-requis : C8.1.a livré et stabilisé. Plusieurs commits attendus.

##### Étape 1.b.1 — Conteneur scène : modèle, store, migration

**Contexte technique** :
- Aujourd'hui, lorsqu'une edge `flow scene→action` existe, l'action
  reste « top-level » (`state.layout[id].parentId === null`). Position
  absolue.
- La sérialisation `getHotspotActionIdsForScene`
  ([toProjectJson.ts:93](xflow/react/src/serialize/toProjectJson.ts:93))
  filtre justement sur `!parentId` pour récupérer les hotspots de la
  scène. Cette logique doit évoluer pour considérer
  `parentId === sceneId` comme **également** « top-level scène ».
- React Flow ne supporte qu'un seul `parentId` par nœud. La chaîne
  `choice → selector → scene` reste valide (RF gère l'imbrication
  multi-niveaux sans problème). Les choix de selector gardent leur
  `parentId = selectorId`, le selector reçoit `parentId = sceneId`.

**Directive** :

1. **Store — `connect()`**
   ([nodalProjectStore.ts:294](xflow/react/src/store/nodalProjectStore.ts:294)) :
   après l'ajout d'une edge `flow` avec `sourceId in scenes` et
   `targetId in actions`, **si** `state.layout[targetId].parentId == null` :
   - Conversion position absolue → relative à la scène :
     ```ts
     const sceneLayout = state.layout[edge.sourceId];
     const childLayout = state.layout[edge.targetId];
     state.layout[edge.targetId] = {
       ...childLayout,
       x: childLayout.x - sceneLayout.x,
       y: childLayout.y - sceneLayout.y,
       parentId: edge.sourceId,
     };
     ```
   - Si `wouldCreateCycle` détecte un cycle, refuser l'edge
     (warning console + `return state` sans mutation).

2. **Store — `disconnect()`**
   ([nodalProjectStore.ts:304](xflow/react/src/store/nodalProjectStore.ts:304)) :
   après suppression d'une edge `flow scene→action`, si l'action n'a
   plus aucune autre edge `flow` entrante depuis une scène **et** son
   `parentId === sceneId`, alors :
   - Conversion relative → absolue :
     ```ts
     state.layout[targetId] = {
       ...layout,
       x: layout.x + sceneLayout.x,
       y: layout.y + sceneLayout.y,
       parentId: null,
     };
     ```

3. **Migration projets existants** — créer
   `xflow/react/src/serialize/migrateSceneParentIds.ts` :
   - Fonction `migrateSceneParentIds(state: NodalProject): void`
     idempotente, qui parcourt `state.edges`, détecte chaque flow
     `scene→action` dont la cible a `parentId === null`, applique la
     conversion (parentId + position relative), comme dans `connect`.
   - Appelée dans `hydrateFromProject`
     ([nodalProjectStore.ts:519](xflow/react/src/store/nodalProjectStore.ts:519))
     **après** `applyHydratedLayout` et **avant** `reconcileAutoSatellites`.
   - Aussi appelée dans `deserializeFromProjectJson` (post-edges) si
     ce chemin est utilisé hors hydrate.

4. **Sérialisation — `getHotspotActionIdsForScene`**
   ([toProjectJson.ts:93](xflow/react/src/serialize/toProjectJson.ts:93)) :
   adapter le filtre :
   ```ts
   // Avant
   !state.layout[edge.targetId]?.parentId
   // Après
   const p = state.layout[edge.targetId]?.parentId;
   p == null || p === sceneId
   ```
   *Justification* : une action top-level d'une scène est désormais
   soit `parentId === null` (legacy non migré, pendant tests), soit
   `parentId === sceneId` (post-migration). Les choix de selector
   conservent `parentId === selectorId` et continuent d'être exclus.

5. **`map-layout.json`** : étendre
   [xflow/react/src/serialize/mapLayoutJson.ts](xflow/react/src/serialize/mapLayoutJson.ts)
   pour persister la chaîne `parentId` des actions vers les scènes.
   Vérifier que le slot `parentId` existe déjà dans
   `nodalActionLayoutByPathKey` (probablement OK — les choix de
   selector y sont déjà sérialisés). Si manquant, étendre — sinon
   no-op.

6. **Tests** — créer
   `xflow/react/src/__tests__/sceneAsContainer.test.ts` :
   - `connect flow scene→action` → action reçoit
     `parentId = sceneId` + position relative.
   - `disconnect flow scene→action` → action revient
     `parentId = null` + position absolue.
   - `migrateSceneParentIds` idempotent (deux passes = même état).
   - Round-trip serialize/deserialize sur un projet legacy
     (sans parentId scène) : `hotspots` sérialisés identiques avant/
     après migration.
   - Cas selector imbriqué dans une scène : selector reçoit
     `parentId = sceneId`, ses choix gardent `parentId = selectorId`.

**Critère de fin** :
- Vitest vert.
- Round-trip serialize/deserialize sur les fixtures existantes :
  diff vide vs avant-migration.
- Smoke manuel : ouvrir un projet legacy (sans cadre scène),
  vérifier que rien n'est cassé visuellement (positions inchangées).
  Créer un nouveau flow scene→action, vérifier que l'action « rentre »
  dans la scène (cohérent avec le futur cadre).

##### Étape 1.b.2 — Auto-resize de la scène (rendu cadre)

**Contexte technique** :
- React Flow ne dimensionne pas automatiquement les nœuds parent.
- Le selector utilise un `NodeResizer` manuel — pour la scène, on
  veut **automatique**.
- Référence existante :
  [xflow/react/src/view/nesting/geometry.ts](xflow/react/src/view/nesting/geometry.ts)
  pour `getAbsolutePosition` / `toAbsoluteRect`.

**Directive** :

1. Helper `computeContainerBounds(state, containerId): { width: number, height: number }`
   dans `nesting/geometry.ts` (ou nouveau fichier `containerBounds.ts`) :
   - Récupère tous les descendants transitifs (parentId chain).
   - Calcule le bounding box des positions **relatives** au conteneur,
     en tenant compte de `width`/`height` (avec fallbacks
     `DEFAULT_NODE_*`).
   - Ajoute une marge interne (constantes : `SCENE_PADDING_TOP = 32`,
     `SCENE_PADDING_X = 16`, `SCENE_PADDING_BOTTOM = 16`).
   - Renvoie `{ width: maxRight + padX, height: maxBottom + padBottom }`.

2. **Application des dimensions** :
   - **Option recommandée** : calcul dans la projection
     `toReactFlowNodes` — pour chaque scène avec ≥1 enfant et
     `!collapsed`, fixer `style: { width, height }` sur le nœud RF.
   - **Alternative** (à éviter sauf besoin) : `useEffect` dans
     `NodalCanvas` qui écoute `state.layout` et appelle
     `updateNodeLayout` — risque de boucle.

3. **`SceneNodeView.tsx`** (refonte légère) :
   - La scène devient un conteneur visible : bordure plus marquée,
     fond translucide.
   - Le titre + sous-titre + handles restent en haut (header zone).
   - Quand la scène a ≥1 enfant : appliquer la classe
     `nodal-node--scene-frame` pour le styling cadre.
   - Quand 0 enfant : rendu compact (comme aujourd'hui), pas de cadre.

4. **CSS** — ajouter dans
   [xflow/react/src/view/nodes/nodes.css](xflow/react/src/view/nodes/nodes.css) :
   ```css
   .nodal-node--scene-frame {
     background: color-mix(in srgb, var(--node-scene-bg) 70%, transparent);
     border-width: 2px;
     padding: 8px 12px 12px;
   }
   .nodal-node--scene-frame .title {
     /* le header reste lisible même quand le cadre est grand */
   }
   ```
   Variables dark mode à compléter si nécessaire.

5. **Drag** : laisser tel quel — RF déplace automatiquement les
   enfants quand on déplace le parent. Vérifier au smoke qu'aucune
   logique d'attachement existante (`onNodeDragStop`) ne casse à
   cause de la nouvelle hiérarchie.

6. Tests :
   - `computeContainerBounds` : 1 enfant en (50, 30) de taille
     180×70 → bounds attendus selon la formule + padding.
   - Projection : scène avec 3 actions chaînées → `style.width` /
     `style.height` cohérents avec le bounding box.

**Critère de fin** :
- Smoke : créer Scene A + 3 msg en chaîne flow → la scène englobe
  visuellement les 3 nœuds.
- Drag de Scene A : les 3 actions suivent.
- Drag d'une action **dans** la scène (sans sortir) : la scène
  s'adapte (re-render immédiat).
- Drag d'une action **hors** de la scène : elle se détache (cf.
  étape 1.b.1, `disconnect` non concerné ici — détachement géré
  par overlap dans `onNodeDragStop`).

##### Étape 1.b.2-fix — Bornes correctes + re-ancrage de la scène

> **À faire avant 1.b.3.** Le rendu actuel est cassé : la scène grandit
> mais ne contient pas visuellement ses actions (cf. capture 2026-05-02
> dans le journal). Deux maths à corriger.

**Diagnostic** :

Le rendu sub-flow React Flow (`reactflow.dev/examples/grouping/sub-flows`)
exige deux invariants :

1. La box d'un nœud parent commence à **son origine (0, 0)**. Sa largeur
   couvre `[0, max_right]`, pas `[min_x, max_right]`. Tout enfant à coord
   relative négative ou au-delà de la largeur est rendu **hors** de la box.
2. Les enfants doivent avoir des **coords relatives positives**, idéalement
   ≥ `(padX, padTop)` pour laisser la place du header (titre).

L'implémentation actuelle viole les deux :

- **`computeContainerBounds`** calcule `innerW = maxRight - minX`. Si un
  enfant est à relatif `(500, 50)` et size `180×70`, on obtient
  `innerW = 180` → scène large de `212` qui démarre à `0` et ne couvre que
  `[0, 212]`, alors que l'enfant est dessiné à `[500, 680]`.
- **`migrateSceneParentIds`** et **`connect()`** font simplement
  `child.x - scene.x` sans s'assurer que le résultat est positif. Une
  action absolue plus à gauche/au-dessus que la scène se retrouve à coord
  relative négative → rendu au-dessus/à gauche de la box visible.

**Directive** :

1. **Corriger `computeContainerBounds`**
   ([containerBounds.ts](xflow/react/src/view/nesting/containerBounds.ts)) :

   ```ts
   // Bornes : on part de l'origine du conteneur (0, 0).
   // Les enfants sont supposés à coords relatives ≥ (padX, padTop)
   // grâce au re-ancrage (point 2). On calcule donc max-right / max-bottom
   // et on rajoute le padding restant à droite/en bas.
   let maxRight = 0;
   let maxBottom = 0;
   for (const id of descendants) {
     const rel = positionRelativeToContainer(state, id, containerId);
     if (!rel) continue;
     const { width, height } = nodeMeasuredSize(state, id);
     maxRight = Math.max(maxRight, rel.x + width);
     maxBottom = Math.max(maxBottom, rel.y + height);
   }
   const innerW = Math.max(maxRight, SCENE_MIN_INNER_WIDTH + SCENE_PADDING_X);
   const innerH = Math.max(maxBottom, SCENE_PADDING_TOP + SCENE_MIN_INNER_HEIGHT);
   return {
     width:  innerW + SCENE_PADDING_X,
     height: innerH + SCENE_PADDING_BOTTOM,
   };
   ```

   *Note* : on ne soustrait plus `minX` / `minY`. Le re-ancrage (point 2)
   garantit qu'aucun enfant n'a de coord négative.

2. **Nouveau helper `reanchorSceneContainer(state, sceneId)`**
   (dans [containerBounds.ts](xflow/react/src/view/nesting/containerBounds.ts)
   ou nouveau `reanchorContainer.ts`) :

   ```ts
   /**
    * Garantit que tous les descendants directs ont une coord relative
    * ≥ (SCENE_PADDING_X, SCENE_PADDING_TOP). Si non, déplace la scène
    * de delta = padding - min, et translate les coords des descendants
    * directs de -delta — leurs positions absolues sont préservées.
    *
    * Idempotent : un second appel sans nouvel enfant est un no-op.
    */
   export function reanchorSceneContainer(state, sceneId): void {
     const sceneLayout = state.layout[sceneId];
     if (!sceneLayout) return;
     const directChildren = [...] // Object.entries(state.layout) avec parentId === sceneId

     if (directChildren.length === 0) return;

     let minRelX = Infinity;
     let minRelY = Infinity;
     for (const [, l] of directChildren) {
       minRelX = Math.min(minRelX, l.x);
       minRelY = Math.min(minRelY, l.y);
     }

     const targetMinX = SCENE_PADDING_X;
     const targetMinY = SCENE_PADDING_TOP;
     const dx = minRelX - targetMinX; // signé ; négatif = enfant à coord < pad
     const dy = minRelY - targetMinY;
     if (dx === 0 && dy === 0) return;

     // Décale la scène de (dx, dy) en absolu, et chaque enfant direct de (-dx, -dy)
     // pour que leurs absolus restent inchangés.
     state.layout[sceneId] = { ...sceneLayout, x: sceneLayout.x + dx, y: sceneLayout.y + dy };
     for (const [childId, l] of directChildren) {
       state.layout[childId] = { ...l, x: l.x - dx, y: l.y - dy };
     }
   }
   ```

   ⚠️ Seuls les enfants **directs** (parentId === sceneId) sont
   translatés — leurs propres descendants suivent automatiquement
   puisque les coordonnées de petits-enfants sont relatives à leur
   parent direct (selector / req…), pas à la scène.

3. **Appeler `reanchorSceneContainer` après chaque mutation qui touche
   un enfant direct de scène** :

   - Dans
     [`migrateSceneParentIds`](xflow/react/src/serialize/migrateSceneParentIds.ts) :
     après la boucle `for (const edge…)`, parcourir les scènes touchées
     et appeler le re-ancrage.
   - Dans `connect()` ([store/nodalProjectStore.ts](xflow/react/src/store/nodalProjectStore.ts:294))
     juste après l'attribution de `parentId = sceneId` à un nouvel
     enfant.
   - Dans `disconnect()` ([store/nodalProjectStore.ts](xflow/react/src/store/nodalProjectStore.ts:344))
     après le détachement (la scène peut maintenant être plus compacte —
     mais le re-ancrage avec dx ≥ 0 ne fait rien si tous les enfants
     restants sont déjà à des relatives ≥ pad ; c'est OK).
   - Dans `onNodesChange` / `onNodeDragStop`
     ([NodalCanvas.tsx](xflow/react/src/view/NodalCanvas.tsx:336)) :
     si un enfant direct d'une scène a été déplacé et que sa nouvelle
     position relative est < `(padX, padTop)`, déclencher un re-ancrage.
     **Important** : ne pas créer de boucle (re-ancrage met à jour le
     store qui retrigger `onNodesChange`) — gérer en lisant directement
     `state.layout` après le drag, pas via un effet sur `rfNodes`.

4. **Migration corrective sur les projets déjà cassés** :
   `migrateSceneParentIds` actuel ignore les actions ayant déjà
   `parentId !== null`. Étendre :
   - Si `parentId === sceneId` (déjà migré) **et** que la coord relative
     est négative, c'est un projet « contaminé » par le bug 1.b.2.
     Ré-exécuter `reanchorSceneContainer(state, sceneId)` à la fin de
     la migration corrige tout.

5. **Tests** — étendre
   [containerBounds.test.ts](xflow/react/src/__tests__/containerBounds.test.ts)
   et
   [sceneAsContainer.test.ts](xflow/react/src/__tests__/sceneAsContainer.test.ts) :

   - **`computeContainerBounds`** :
     - 1 enfant à relatif `(500, 50)` size `180×70` → bounds attendus
       `width = 500 + 180 + padX`, `height = 50 + 70 + padBottom`.
       (Plus de `maxRight - minX`.)
     - 1 enfant à relatif `(20, 40)` size `180×70` → bounds attendus
       `width = 20 + 180 + padX = 232`, `height = 40 + 70 + padBottom`.
   - **`reanchorSceneContainer`** :
     - Scène à `(200, 200)`, enfant à relatif `(-50, -10)` → après
       re-ancrage : scène à `(200 - 50 - padX, 200 - 10 - padTop)`,
       enfant à relatif `(padX, padTop)`. Position absolue de l'enfant
       inchangée (= `(200 + (-50), 200 + (-10))` = `(150, 190)` avant ;
       après = scène + relatif = même valeur).
     - Idempotent : 2 appels successifs = 1 seul effet.
     - Plusieurs enfants : tous décalés du même `(dx, dy)`, absolus
       préservés.
   - **Migration** : projet où une action a `parentId === null` mais
     position absolue **à gauche** de la scène → après hydrate, l'action
     est dans le cadre, le titre de la scène n'est pas écrasé.
   - **Connect** : créer un flow scene→action où l'action est
     pré-positionnée plus haut que la scène → après connect, elle est
     dans le cadre.

**Critère de fin** :

- Capture du smoke « Scène Hall + Read Note + Go To Lab + SELECTOR(2 MSG) »
  reproduit l'effet visuel attendu : **les 3 actions et les 2 sous-MSG
  sont visuellement à l'intérieur** du cadre Hall (comme dans
  l'exemple sub-flow React Flow référencé).
- Drag d'une action vers la gauche au-delà du `padX` interne : le cadre
  s'étend à gauche (re-ancrage immédiat), le titre reste bien aligné.
- Drag du nœud Hall : les 3 actions et les 2 MSG suivent.
- Round-trip serialize / deserialize d'un projet déjà migré sans bug
  reste idempotent (pas de drift de positions).

##### Étape 1.b.2.x — Pivot architectural : s-box (group node) auto-managé

> **Pivot validé 2026-05-XX** après smoke des étapes 1.b.1 + 1.b.2 +
> 1.b.2-fix. Bug visuel résiduel : la scène faisait office de cadre,
> donc ses handles (`flow-out`, `goto-in`, `meta-out`) étaient rendus
> aux **bords du cadre** (= bords des actions) → les edges
> scène→action partaient de l'extrémité droite du cadre et revenaient
> vers la gauche. Lecture cassée.
>
> Le pattern correct est celui décrit dans
> https://reactflow.dev/learn/layouting/sub-flows : un nœud parent
> de type `group` **sans handles, sans contenu sémantique**, qui
> sert uniquement de conteneur visuel et logique. La scène redevient
> un nœud normal avec ses handles à elle, et un nouveau nœud auto-managé
> **s-box** englobe scène + actions.
>
> Auto-managé = pendant des satellites : créé / supprimé / dimensionné
> par le store, jamais directement par l'utilisateur, jamais sérialisé
> dans `project.json`.

**Modèle final** :

```
s-box (groupNode, parentId: null)          ← géré par le store comme un satellite
 ├── scene  (parentId: sboxId, extent: 'parent')   ← handles + contenu sémantique
 ├── action top-level n°1 (parentId: sboxId)
 ├── action top-level n°2 (parentId: sboxId)
 └── selector top-level (parentId: sboxId)
      └── choice (parentId: selectorId)
           └── (sous-arbre selector inchangé)
```

- **Type RF** : `groupNode` (custom). Pas de handles. Bordure +
  fond translucide. Composant minimal — étiquette discrète facultative
  (ex. `Scene: Hall`) en haut à gauche, sinon rien.
- **Position du nœud scène** : à l'intérieur du s-box, coords
  relatives initiales `(SCENE_PADDING_X, SCENE_PADDING_TOP)`. La scène
  est draggable **dans** le s-box (`extent: 'parent'`) ; elle ne peut
  pas en sortir.
- **Position des actions top-level** : coords relatives au s-box (et
  pas à la scène). Drag libre (les actions peuvent sortir du s-box →
  détachement habituel via `onNodeDragStop`).
- **Position du s-box** : drag libre (c'est ce qui permet à
  l'utilisateur de déplacer scène + actions ensemble).
- **Auto-resize du s-box** : `computeContainerBounds(state, sboxId)`
  (le helper de l'étape 1.b.2-fix, juste recâblé sur le s-box).
- **Re-ancrage** : `reanchorSceneContainer` bascule en
  `reanchorSBox(state, sboxId)`. Logique identique : si min relative
  des enfants < `(padX, padTop)`, décaler le s-box et translater tous
  ses enfants directs (scène + actions top-level).

**Directive** :

1. **Modèle** ([model/ids.ts](xflow/react/src/model/ids.ts) +
   [model/nodes.ts](xflow/react/src/model/nodes.ts)) :
   - Nouveau brand `SceneBoxNodeId`.
   - Nouveau type :
     ```ts
     export type SceneBoxNode = {
       id: SceneBoxNodeId;
       nodeType: "sceneBox";
       sceneId: SceneNodeId; // back-reference
     };
     ```
   - Étendre `AnyNodeId` et `model/project.ts` avec
     `sceneBoxes: Record<SceneBoxNodeId, SceneBoxNode>`.

2. **Helper de réconciliation** — nouveau fichier
   `xflow/react/src/store/reconcileSceneBoxes.ts` (pendant de
   `reconcileAutoSatellites`) :
   - `sboxIdFromScene(sceneId): SceneBoxNodeId` — id déterministe,
     préfixe `sbox-` + id de la scène.
   - `reconcileSceneBoxes(state)` :
     - Pour chaque scène dans `state.scenes` sans s-box correspondant,
       crée le s-box et son `state.layout` initial
       `{ x: scene.x, y: scene.y, parentId: null, collapsed: false }`,
       puis reparente la scène (`scene.layout.parentId = sboxId`,
       position relative `(padX, padTop)`, scène en `extent: 'parent'`
       côté projection).
     - Pour chaque s-box sans scène associée (orphelin), supprime le
       s-box et son layout.
   - **Idempotent** — appelé après chaque mutation du store
     (équivalent du `reconcileAutoSatellites`).
   - Après chaque `reanchorSBox` : `enforceFrameContentMinInsetX` dans
     `containerBounds.ts` (`FRAME_CONTENT_MIN_INSET_X` = 12 px) —
     marge horizontale minimale des enfants directs d’une **scène** ou
     d’un **selector** (les **satellites** ne sont pas modifiés).

3. **Store mutations** ([store/nodalProjectStore.ts](xflow/react/src/store/nodalProjectStore.ts)) :
   - `addScene(node, layout)` :
     - Pose la scène, puis appelle `reconcileSceneBoxes`. Le s-box
       associé est créé automatiquement.
   - `removeNode(sceneId)` quand `nodeId` est une scène :
     - Supprime aussi le s-box (via `reconcileSceneBoxes` post-mutation
       qui détecte l'orphelin).
   - `connect()` flow scene→action :
     - Au lieu de `child.parentId = sceneId`, mettre
       `child.parentId = sboxIdFromScene(sceneId)`.
     - Conversion absolu → relatif au s-box (et non plus à la scène) :
       `child.x -= sboxLayout.x; child.y -= sboxLayout.y`.
     - Appel de `reanchorSBox(state, sboxId)` après l'attachement.
   - `disconnect()` flow scene→action :
     - Conversion relative → absolue par rapport au s-box.
     - `child.parentId = null`.
   - `hydrateFromProject` :
     - Après `migrateSceneToSBoxParenting` (point 4) puis
       `reconcileSceneBoxes`.

4. **Migration** — renommer/réécrire
   [serialize/migrateSceneParentIds.ts](xflow/react/src/serialize/migrateSceneParentIds.ts)
   en `migrateSceneToSBoxParenting.ts` :
   - Pour chaque scène, créer le s-box (s'il n'existe pas).
   - Reparenter la **scène elle-même** vers le s-box (parentId =
     sboxId, position relative `(padX, padTop)`).
   - Reparenter les **actions top-level** (cibles directes de
     `flow scene→action`) vers le s-box (au lieu de la scène).
   - Recalculer toutes les coords relatives en fonction du s-box.
   - Appeler `reanchorSBox` à la fin pour normaliser.
   - **Idempotent** : un projet déjà migré reste inchangé.
   - **Fix de l'état actuel cassé** : un projet où des actions ont
     `parentId === sceneId` (étape 1.b.1 actuelle) est détecté et
     converti en `parentId === sboxId`.

5. **Composant `SceneBoxNodeView.tsx`** (nouveau) :
   ```tsx
   import { type NodeProps } from "@xyflow/react";
   import "./nodes.css";

   export function SceneBoxNodeView({ data }: NodeProps) {
     // Pas de handles. Pas de logique sémantique. Juste un conteneur visuel.
     // Étiquette discrète optionnelle : data.label (= scene.label).
     return (
       <div className="nodal-node-sbox">
         {/* éventuel header très discret avec le nom de la scène */}
       </div>
     );
   }
   ```
   Enregistrer dans `nodeTypes` de
   [view/NodalCanvas.tsx](xflow/react/src/view/NodalCanvas.tsx) :
   `sceneBoxNode: SceneBoxNodeView`.

6. **`SceneNodeView.tsx`** : **revert** à l'état pré-1.b.2.
   - Retirer la classe `nodal-node--scene-frame`.
   - Retirer le flag `sceneFrame` dans `NodalRFData`.
   - Pas de `style.width/height` injecté par la projection sur la
     scène — elle redevient un nœud compact normal.

7. **Projection** ([view/nodalReactFlowProjection.ts](xflow/react/src/view/nodalReactFlowProjection.ts)) :
   - Émettre les **s-box d'abord** (parent-first). Pour chaque s-box :
     - `position = { x: sboxLayout.x, y: sboxLayout.y }` (absolu).
     - `style = computeContainerBounds(state, sboxId, { excludeIds: hiddenIds })`.
     - `parentId` non défini (s-box est top-level).
   - La scène : émettre avec `parentId = sboxId`, position relative
     telle quelle.
   - Les actions top-level : `parentId = sboxId` (déjà cohérent côté
     store si les mutations + migration ont fait leur travail —
     vérifier dans la projection sans corriger).
   - Plus de calcul `style.width/height` sur la scène.
   - **Important** — `extent: 'parent'` doit être posé sur la scène
     dans la projection (pas dans le store) :
     `if (parentId === sboxId of nodeType scene) sceneNode.extent = 'parent';`

8. **Sérialisation `toProjectJson.ts`** :
   - `getHotspotActionIdsForScene` : remplacer la condition
     `parentId === sceneId` par
     `parentId === sboxIdFromScene(sceneId)`.
   - Vérifier qu'aucun `state.sceneBoxes` ne fuit dans `project.json`
     (pas de sérialisation par défaut tant qu'on ne les ajoute pas
     à `serializeToProjectJson`).

9. **Sérialisation `mapLayoutJson.ts`** :
   - Étendre `serializeLayout` / `applyLayout` pour
     `nodalSceneBoxLayoutByExternalId` : clé = `scene.sceneId` externe,
     valeur = `{ x, y, collapsed }`.
   - Reconstruction au load : `applyLayout` restaure les positions
     des s-box, puis `reconcileSceneBoxes` complète les manquants.

10. **CSS** ([view/nodes/nodes.css](xflow/react/src/view/nodes/nodes.css)) :
    - Nouvelle classe `.nodal-node-sbox` :
      ```css
      .nodal-node-sbox {
        box-sizing: border-box;
        width: 100%;
        height: 100%;
        background: color-mix(in srgb, var(--node-scene-bg) 60%, transparent);
        border: 2px solid var(--node-scene-border);
        border-radius: 12px;
        pointer-events: all;
      }
      ```
    - Supprimer `.nodal-node.scene.nodal-node--scene-frame` et tout
      style associé.

11. **`onNodeDragStop`** ([view/NodalCanvas.tsx](xflow/react/src/view/NodalCanvas.tsx)) :
    - Aucun changement structurel requis pour le drag « action vers
      sélecteur » ou « action sortie de scène ». Le s-box ne doit
      **pas** apparaître comme candidat parent dans la détection
      d'overlap (filtrer par `nodeType !== 'sceneBox'`).
    - Si une action est draguée hors du s-box (overlap < threshold) :
      détachement + `parentId = null` + position absolue. Scène et
      s-box ne sont pas concernés.
    - `extent: 'parent'` posé sur la scène empêche RF de laisser la
      scène quitter le s-box pendant le drag → aucun cas spécial à
      gérer dans le code.

12. **Tests à mettre à jour** :
    - Renommer `sceneAsContainer.test.ts` →
      `sceneSBoxContainer.test.ts`.
    - Cas : `addScene` crée automatiquement le s-box.
    - Cas : `removeNode(sceneId)` supprime le s-box associé.
    - Cas : `connect flow scene→action` parente l'action sous le
      s-box (parentId === sboxId), pas sous la scène.
    - Cas : sérialisation → s-box absent de `project.json`, présent
      dans `map-layout.json` (`nodalSceneBoxLayoutByExternalId`).
    - Cas : round-trip projet legacy (sans s-box) → s-box auto-créé
      à l'hydrate.
    - Cas : projet "cassé" 1.b.1 actuel (action.parentId === sceneId) →
      migration corrige en parentId === sboxId.
    - Cas : `reanchorSBox` (équivalent des tests
      `reanchorSceneContainer`).

**Critère de fin** :

- Smoke `Hall + Read Note + Go To Lab + SELECTOR(2 MSG) → Lab` :
  - Le **s-box** entoure visuellement la scène + les actions.
  - Le **flow-out** de la scène part de la scène elle-même
    (handle au bord droit du *petit* nœud scène, pas au bord droit du
    s-box) → edges courtes vers Read Note / Go To Lab / SELECTOR.
  - Le **goto-out** de Go To Lab pointe vers Lab (à l'extérieur du
    s-box) sans détour.
  - Drag du s-box → scène + actions suivent.
  - Drag de la scène dans le s-box → scène se déplace mais ne sort
    pas (extent constraint).
  - Drag d'une action hors du s-box → l'action se détache (parentId
    null, position absolue restaurée).
- `project.json` reste identique avant/après bascule sur les
  fixtures connues.

##### Étape 1.b.3 — Repli du s-box (chevron + handles synthétiques)

> Adapté pour le modèle **s-box** (étape 1.b.2.x). Le `collapsed`
> bascule sur le s-box, pas sur la scène. Quand le s-box est replié,
> les actions sont cachées ; la scène reste visible (avec ses
> handles) à l'intérieur d'un s-box compact (taille = juste de quoi
> contenir la scène + padding).

**Contexte technique** :
- Étape 1.b.2.x livrée : la scène est enfant du s-box. Le s-box est
  auto-managé. La scène a ses propres handles.
- L'infrastructure de repli existe déjà via C8.1.a
  (`toggleNodeCollapsed`, `collectHidden…`, synth-goto-out). Il
  s'agit d'**élargir** les fonctions existantes pour traiter aussi
  les s-box repliés, pas de réécrire.

**Directive** :

1. **Cible du `collapsed`** :
   - Le flag `collapsed` est porté par le **s-box**
     (`state.layout[sboxId].collapsed`), pas par la scène.
   - `toggleNodeCollapsed(sboxId)` (déjà générique).
   - Persistance : étendre `nodalSceneBoxLayoutByExternalId.collapsed`
     dans `map-layout.json` (déjà prévu par 1.b.2.x point 9).

2. **Détection des conteneurs repliés** :
   - `collectHiddenIdsFromCollapsedSelectors` →
     `collectHiddenIdsFromCollapsedContainers`. Étendre la liste des
     conteneurs détectés :
     - **selectors** avec `layout.collapsed === true` (déjà OK) ;
     - **s-box** avec `layout.collapsed === true` (nouveau).
   - Pour un s-box replié, masquer **tous ses descendants sauf la
     scène** (la scène reste visible). Concrètement : ajouter à
     `hiddenIds` tous les descendants du s-box dont `nodeType !==
     "scene"`.
   - `collectSynthGotoTargets` doit accepter aussi les s-box en
     entrée (collecte des goto internes au sous-arbre s-box).

3. **Position du chevron de repli** :
   - **Pas sur le s-box** (qui n'a pas de header). À mettre **sur la
     scène elle-même** (composant `SceneNodeView.tsx`).
   - Le clic sur le chevron de la scène appelle
     `toggleNodeCollapsed(sboxIdFromScene(sceneId))` (pas
     `toggleNodeCollapsed(sceneId)`).
   - Cohérence ergonomique : l'utilisateur clique sur la scène pour
     plier/déplier sa zone, comme on cliquerait sur un selector
     pour plier ses choix.

4. **Composant `SceneNodeView.tsx`** :
   - Ajouter un chevron `▾/▸` (réutiliser le `CollapseToggle` du
     selector — factoriser si pas déjà fait).
   - Lire l'état `collapsed` du s-box parent via la projection
     (nouveau champ `NodalRFData.containerCollapsed?: boolean` posé
     en projection sur les scènes dont le s-box parent est replié).
   - Quand `containerCollapsed === true` :
     - Subtitle = « Scène — N action(s) masquée(s) ».
     - `flow-out` masqué (`display: none`) — toutes les cibles
       internes sont cachées, le handle perd son sens.
     - `goto-in` et `meta-out` **conservés actifs**.
     - `synth-goto-out` **ajouté conditionnellement** sur la scène
       (uniquement si au moins un goto interne avec cible définie),
       même règle que pour le selector (étape 1.a.1).
   - Quand `containerCollapsed === false` : rendu compact normal,
     pas de synth-goto-out.

5. **Composant `SceneBoxNodeView.tsx`** :
   - Quand le s-box est replié, sa taille via `computeContainerBounds`
     doit être réduite — la fonction reçoit déjà `excludeIds:
     hiddenIds`, donc avec les actions cachées le s-box rétrécit
     automatiquement autour de la seule scène.
   - Visuellement : aucun changement de rendu propre — c'est juste
     un cadre plus petit autour de la scène. Optionnellement,
     atténuer le fond / la bordure quand replié pour signaler l'état.

6. **Tests** — étendre `selectorCollapsed.test.ts` (ou nouveau
   `sceneCollapsed.test.ts`) :
   - Pliage s-box avec ≥1 action : descendants `hidden` SAUF la
     scène ; scène visible avec ses handles ; `synth-goto-out`
     présent sur la scène si goto interne pointe vers une scène
     externe.
   - Cas E2E utilisateur :
     `Scene1 → Selector(Choix1, Selector(SousChoix1, SousChoix2 →
     goto Scene2))` puis pli du **s-box de Scene1** → la projection
     contient Scene1, son s-box (compact), Scene2 (et son s-box) ;
     edge synthétique `Scene1 → Scene2` avec
     `sourceHandle = synth-goto-out` sur la scène.
   - Pliage s-box d'une scène sans action : pas d'effet visible
     (s-box déjà compact).
   - Round-trip `collapsed` du s-box (sérialize → reload).

**Critère de fin** :
- Vitest vert.
- Smoke E2E exemple ci-dessus.
- Smoke « legacy » (projet sans aucun s-box replié) : comportement
  identique au précédent (à part la présence des s-box auto-créés).

##### Étape 1.b.5 — Media auto-parentés (descendants visuels du nœud lié)

> Étape créée 2026-05-XX après smoke 1.b.3 OK. **Vient avant le polish
> (1.b.4)** : c'est un changement comportemental substantiel sur les
> nœuds media, pas un finishing touch.

**Symptôme actuel** :

Quand un conteneur (s-box ou selector) est replié, les actions
internes deviennent `hidden:true`. Mais les **nœuds media** liés à
ces actions par une edge `meta` restent visibles : seule l'edge
meta passe en `hidden`, le media flotte alors comme un orphelin
(cf. captures 2026-05-XX).

**Décision utilisateur** :

Aligner les media sur les satellites — devenir enfants du nœud lié
(via `parentId`) et hériter automatiquement de l'état caché par la
chaîne `parentId` transitive existante.

**Trade-off accepté** :

- Media limité à **1 seule edge meta entrante** (1 owner unique).
- Compensation future hors scope C8.1 : option de copie / bibliothèque
  media — pendant de ce qui existe déjà pour les nœuds `object`.

**Modèle final** :

- `media.parentId = sourceId` de son edge meta entrante (scene ou
  action).
- Position du media : relative au parent quand `parentId` est défini,
  absolue sinon.
- Connection policy : refus de toute 2ᵉ meta entrante vers un media
  déjà connecté.
- Repli : la chaîne `parentId` transitive existante
  (`collectHiddenIdsFromCollapsedContainers`) prend automatiquement
  en charge le masquage. Aucun cas spécial à ajouter.

**Comportement final attendu** *(tableau corrigé par **1.b.5-fix** ; tout media sous un conteneur replié est caché, sauf la scène comme poignée s-box)* :

| Cas | Avant (smoke 1.b.3) | Après 1.b.5 + 1.b.5-fix |
|---|---|---|
| Media lié à scène (s-box **non replié**) | media + edge visibles | identique |
| Media lié à scène (s-box **replié**) | media + edge visibles | media + edge **cachés** (scène seule visible) |
| Media lié à un **selector replié** | media visible, edge cachée | media + edge **cachés** (selector seul visible) |
| Media lié à un **choix** d'un selector replié | media visible, edge cachée | media + edge **cachés** ✓ |
| Media lié à une action interne d'un s-box replié | media visible, edge cachée | media + edge **cachés** ✓ |

Justification : `hiddenIds` n’inclut pas les conteneurs racines repliés (s-box, selector) ni la **scène** dans le s-box replié ; tout le reste du sous-arbre (actions, media liés scène ou action, choix, etc.) est masqué transitivement.

**Directive** :

1. **`connectionPolicy.ts`**
   ([view/connectionPolicy.ts](xflow/react/src/view/connectionPolicy.ts)) :
   ajouter le garde-fou « 1 seule meta-in par media » dans la
   branche meta :
   ```ts
   if (connection.sourceHandle === HANDLE_META_OUT && connection.targetHandle === HANDLE_META_IN) {
     if (sourceKind !== "scene" && sourceKind !== "action") return false;
     if (targetKind !== "media") return false;
     // Nouveau : refus si le media a déjà une meta entrante.
     const hasIncomingMeta = state.edges.some(
       (e) => e.family === "meta" && e.targetId === target.id
     );
     return !hasIncomingMeta;
   }
   ```
   *(Pour les satellites, la branche reste inchangée — ils sont
   exclusivement auto-réconciliés et donc rejetés par cette branche.)*

2. **Store mutations** ([store/nodalProjectStore.ts](xflow/react/src/store/nodalProjectStore.ts)) :

   **`connect()`** — quand l'edge ajoutée est `family === "meta"` et
   `targetId in state.media` :
   - Si le media n'a pas déjà `parentId` :
     - Convertir position absolue → relative en utilisant
       `getAbsolutePosition` (chaîne complète, le source peut être
       lui-même imbriqué : action dans selector dans s-box).
     - Poser `media.parentId = source.id`.
   - Si le media a déjà un `parentId` (cas anormal compte tenu de la
     policy) : warning console + skip — laisser le store tel quel
     pour ne pas masquer un bug de policy.

   **`disconnect()`** — quand l'edge retirée est `family === "meta"`
   et `targetId in state.media` :
   - Si le media a `parentId === removed.sourceId` :
     - Convertir position relative → absolue.
     - Poser `media.parentId = null`.
   - Sinon : ne rien toucher au layout (cas pathologique).

3. **Migration des projets existants**
   ([serialize/migrateSceneToSBoxParenting.ts](xflow/react/src/serialize/migrateSceneToSBoxParenting.ts)
   ou nouveau helper `migrateMediaParenting`) :
   - Pour chaque media dans `state.media` ayant `parentId == null`
     mais une edge meta entrante : poser `parentId = sourceId` et
     convertir position en relative (via `getAbsolutePosition`).
   - **Idempotent** — un projet déjà migré reste inchangé.
   - **Cas legacy multi-meta** : si plusieurs edges meta pointent
     vers le même media (autorisé avant 1.b.5), garder uniquement la
     **première** dans l'ordre des edges, supprimer les autres avec
     un warning console (`[migrateMediaParenting] media-X : 3 meta-in
     détectées, 2 supprimées`).
   - Appel de la migration : dans `hydrateFromProject` après
     `migrateSceneToSBoxParenting` et `reconcileSceneBoxes`.

4. **Projection** ([view/nodalReactFlowProjection.ts](xflow/react/src/view/nodalReactFlowProjection.ts)) :

   Aucun changement structurel requis — la projection pose déjà
   `mediaNode.parentId = layout.parentId` quand défini (ligne ~243
   dans la version actuelle). `collectHiddenIdsFromCollapsedContainers`
   parcourt la chaîne `parentId` transitivement, donc media hérite
   automatiquement.

   ✅ Vérifier au passage que `sortNodesParentFirst` traite bien les
   media (probablement OK puisqu'il itère sur `nodes` sans filtre).

5. **Position absolue ↔ relative** :

   Réutiliser `getAbsolutePosition` de
   [view/nesting/geometry.ts](xflow/react/src/view/nesting/geometry.ts).
   Pseudo-code de la conversion abs → rel quand on attache à `source` :
   ```ts
   const sourceAbs = getAbsolutePosition(source, nodesById);
   media.x = mediaAbsX - sourceAbs.x;
   media.y = mediaAbsY - sourceAbs.y;
   ```
   Et l'inverse pour le détachement.

6. **`extent`** :
   Ne **pas** poser `extent: 'parent'` sur les media (contrairement
   à la scène dans son s-box). Le détachement meta ne se fait **pas**
   par drag (voir **1.b.5-fix** : suppression edge explicite ou futur
   menu contextuel C8.2).

7. ~~**`onNodeDragStop` — drag-detach media par overlap**~~ *(**invalidé par 1.b.5-fix***) : les media sont positionnés *à côté* du parent, pas *dans* sa box — l’overlap n’est pas un critère valable. Aucun détachement automatique au drag ; voir directive **1.b.5-fix** §1.

8. **Tests** — créer
   `xflow/react/src/__tests__/mediaAutoParented.test.ts` :
   - **Connect meta scene→media** : `media.parentId = sceneId`,
     position relative, position absolue préservée.
   - **Connect meta action→media** où action est imbriquée (action
     dans selector dans s-box) : conversion abs → rel utilise la
     chaîne complète.
   - **Disconnect** : `parentId = null`, position absolue
     correctement restaurée.
   - **Garde-fou policy** : tentative de connecter une 2ᵉ meta vers
     un media déjà connecté → `isValidConnection` retourne `false`.
   - **Migration legacy** : projet où un media a une edge meta
     préexistante mais `parentId == null` → après hydrate, parentId
     set, position relative.
   - **Migration multi-meta** : projet legacy avec 2 metas vers le
     même media → après migration, 1 seule edge restante (la
     première), media parenté à son source.
   - **Repli s-box** : media lié à une action top-level d'une scène
     dont le s-box est replié → `hidden:true`. Media lié à la
     scène elle-même → `hidden:true` *(1.b.5-fix ; la scène nœud reste visible)*.
   - **Repli selector** : media lié à un choix d'un selector replié
     → `hidden:true`. Media lié au selector lui-même → `hidden:true` *(1.b.5-fix)*.
   - **Round-trip serialize** : positions absolues préservées
     après save/reload.

**Critère de fin** :

- Smoke utilisateur : reproduire la capture (Hall + media liés à
  Hall + Read Note + selector imbriqué + media liés au selector
  et à ses choix). Replier le s-box Hall *(comportement **1.b.5-fix**)* :
  - Media de Hall **disparaissent** (parent = scène, conteneur replié) ;
  - Media de Read Note (action top-level cachée) **disparaissent** ;
  - Media du selector lui-même **disparaissent** ;
  - Media des choix internes du selector **disparaissent**.
- Replier seulement le selector (sans replier le s-box) : media
  liés au selector **disparaissent** ; media liés aux choix disparaissent.
- Tentative de drag d'une 2ᵉ meta sur un media déjà connecté :
  refusée silencieusement (handle reste idle au drop).
- Round-trip serialize/deserialize d'un projet avec media
  auto-parentés : aucun drift de position.
- Vitest vert (suite complète + nouveaux cas).

##### Étape 1.b.5-fix — Drag-detach inadapté + média direct du conteneur replié *(livré)*

> Suite au commit `ce874f8` (1.b.5 livrée), deux bugs identifiés au
> smoke utilisateur. Origine : **deux directives de 1.b.5 étaient
> incorrectes** (ma faute, pas Cursor) :
>
> - 1.b.5 point 7 imposait un drag-detach par seuil d'overlap ; ce
>   critère est valable pour les choix de selector ou les actions
>   sous s-box (l'enfant est *dans* la box du parent), pas pour les
>   media qui sont positionnés *à côté* du parent (overlap nul ↔
>   normal).
> - Le tableau de comportement attendu en 1.b.5 listait « media lié
>   à la scène (s-box replié) → visible » et « media lié au selector
>   replié → visible ». L'utilisateur veut au contraire que **tout
>   media rattaché à un conteneur replié (lui-même ou ses
>   descendants) soit caché**, sauf le nœud scène qui sert de poignée
>   d'accès au repli.

**BUG 1 — Drag d'un media déclenche `disconnect` immédiatement**

*Cause* : dans
[view/NodalCanvas.tsx](xflow/react/src/view/NodalCanvas.tsx)
(`onNodeDragStop`, branche `if (draggedMedia)`), le test
`overlap < DETACH_OVERLAP_THRESHOLD` détache le media. Or un media
parenté a sa position relative posée par
`attachMediaToMetaSource` à `(mAbs - sAbs)` — donc juste là où
l'utilisateur l'avait posé en absolu, *typiquement à côté* du
parent (placement satellite-like : sud, est…). L'overlap entre la
box du media et celle du parent direct est presque toujours nul.
Tout déplacement = détachement.

**BUG 2 — Media lié directement au conteneur replié reste visible**

*Cause* : dans
[view/nodalReactFlowProjection.ts](xflow/react/src/view/nodalReactFlowProjection.ts) :

- Ligne ~87 :
  ```ts
  if (collapsedSelectorIds.has(parent) && child in state.media) continue;
  ```
  Cette exception (issue de la table que j'avais écrite en 1.b.5)
  empêche les media enfants directs d'un selector replié de passer
  en `hidden`.
- Lignes ~109-110, branche s-box :
  ```ts
  for (const child of roots) {
    if (child === sceneId) continue;
    // pile DFS uniquement si on n'a pas continue
  ```
  Le `continue` saute la scène **et son sous-arbre** : les media
  enfants directs de la scène ne sont jamais visités, donc jamais
  ajoutés à `hidden`.

**Comportement final attendu (corrige le tableau de 1.b.5)** :

| Cas | Souhaité |
|---|---|
| S-box replié → scène elle-même | **visible** (poignée d'accès) |
| S-box replié → media direct enfant de la scène | **caché** ✗ aujourd'hui visible |
| S-box replié → action top-level | caché (déjà OK) |
| S-box replié → media enfant d'action | caché (déjà OK) |
| Selector replié → selector lui-même | **visible** (poignée d'accès) |
| Selector replié → media direct enfant du selector | **caché** ✗ aujourd'hui visible |
| Selector replié → choix | caché (déjà OK) |
| Selector replié → media enfant de choix | caché (déjà OK) |

**Directive** :

1. **Fix BUG 1 — supprimer le drag-detach pour les media**
   ([view/NodalCanvas.tsx](xflow/react/src/view/NodalCanvas.tsx),
   `onNodeDragStop`) :
   - **Retirer** le bloc `if (draggedMedia) { ... }` qui appelle
     `disconnect` sur la base de l'overlap.
   - Conserver simplement un `if (draggedMedia) return;` après
     l'extraction de `draggedLayout` — un media draggué ne déclenche
     **aucune** logique d'attachement / détachement automatique.
     RF persiste juste sa nouvelle position relative via
     `onNodesChange` (déjà branché), c'est tout.
   - **Justification UX** : le détachement passe désormais
     uniquement par la suppression explicite de l'edge meta (clic
     sur l'edge + Suppr / Backspace, ou via le futur menu contextuel
     C8.2). Cohérent avec le modèle satellite : on ne « détache »
     pas un satellite par drag, il est lié à son action.

2. **Fix BUG 2a — selector replié : retirer l'exception media**
   ([view/nodalReactFlowProjection.ts](xflow/react/src/view/nodalReactFlowProjection.ts),
   `collectHiddenIdsUnderCollapsedSelectors`) :
   ```ts
   for (const child of children) {
     if (hidden.has(child)) continue;
     // RETIRER : if (collapsedSelectorIds.has(parent) && child in state.media) continue;
     hidden.add(child);
     stack.push(child);
   }
   ```
   Le commentaire au-dessus de la fonction (« 1.b.5 : les media…
   restent visibles ») doit aussi être supprimé / ajusté.

3. **Fix BUG 2b — s-box replié : descendre dans le sous-arbre de la
   scène**
   ([view/nodalReactFlowProjection.ts](xflow/react/src/view/nodalReactFlowProjection.ts),
   `collectHiddenIdsUnderCollapsedSceneBoxes`) :
   - Restructurer la double boucle : on traverse **tout** le
     sous-arbre du s-box, on ajoute à `hidden` chaque nœud visité
     **sauf la scène**, et on continue toujours la descente.
   ```ts
   for (const bid of collapsedSBoxIds) {
     const box = state.sceneBoxes[bid];
     if (!box) continue;
     const sceneId = box.sceneId;
     const stack: AnyNodeId[] = [];
     const roots = childrenByParent.get(bid);
     if (!roots) continue;
     for (const r of roots) stack.push(r);
     while (stack.length > 0) {
       const id = stack.pop()!;
       if (hidden.has(id)) continue;
       // La scène elle-même reste visible mais on traverse quand même
       // ses descendants pour les masquer (media, satellites, etc.).
       if (id !== sceneId) hidden.add(id);
       const ch = childrenByParent.get(id);
       if (!ch) continue;
       for (const c of ch) stack.push(c);
     }
   }
   ```

4. **Tests** — étendre / corriger `mediaAutoParented.test.ts` :
   - **Cas existants à mettre à jour** :
     - Test « media lié au selector replié reste visible » → renverser
       l'attente : doit être `hidden:true`.
     - Test « media lié à scène, s-box replié, reste visible » →
       renverser l'attente : doit être `hidden:true`.
     - Test « scène repliée, scène reste visible » → garder cette
       assertion intacte (la scène n'est pas dans `hiddenIds`).
   - **Nouveaux cas** :
     - Drag d'un media : `disconnect` n'est **pas** appelé,
       `parentId` reste set, l'edge meta reste dans `state.edges`.
     - Drag d'un media très loin de son parent : idem (pas de
       détachement).
   - **Cas conservés** :
     - Repli s-box / selector → media des descendants reste caché
       (régression à éviter).

5. **Mise à jour Annexe D** :
   - Le tableau « Comportement final attendu » de 1.b.5 doit être
     remplacé par celui ci-dessus (4 lignes par conteneur, deux
     conteneurs). *(Fait : section 1.b.5 + point 7 barré.)*
   - Point 7 de 1.b.5 (drag-detach) : barré / annoté
     « invalidé par 1.b.5-fix — voir critère structurel : media
     positionnés *à côté*, pas *dans*, le parent ».

**Critère de fin** *(implémenté dans le code + tests `mediaAutoParented`)* :

- Smoke utilisateur : reproduire le cas signalé.
  - Connect media à scène/action → edge visible.
  - Drag du media (court ou long) → edge **toujours visible**, media
    suit la souris, parentId préservé.
  - Suppression manuelle de l'edge meta → media revient en
    `parentId: null`, position absolue restaurée.
- Repli s-box d'une scène ayant 2 media liés directement à elle +
  des actions → media + actions cachés ; scène visible seule.
- Repli selector ayant 1 media lié directement à lui + des choix →
  media + choix cachés ; selector visible seul.
- Vitest vert (suite complète, tests 1.b.5 ajustés).
- Pas de régression sur les SMK satellite / repli selector / repli
  s-box précédents.

##### Étape 1.b.6 — Anti-collision des s-box (au dépli / repli) *(phase 1 + 2 livrées)*

> Inspiré de
> https://reactflow.dev/examples/layout/node-collisions
> mais limité à la résolution de chevauchement **entre s-box
> uniquement**. Les autres nœuds (actions, media, satellites) gardent
> leur liberté de placement.
>
> Livraison en **deux phases** : phase 1 (anti-overlap au dépli)
> autonome ; phase 2 (rewind au repli) en polish optionnel.

**Problème UX** :

Quand l'utilisateur déplie une scène (`s-box.collapsed` passe de
`true` à `false`), le s-box grossit pour englober scène + actions.
Si une autre scène est positionnée à proximité, son propre s-box
chevauche celui qui vient d'être déplié, ce qui rend la lecture
illisible.

L'utilisateur veut deux comportements :

1. **Au dépli** : aucune autre s-box ne chevauche celle qu'on est
   en train de déplier — pousser les voisines hors de la zone.
2. **Au repli** *(idéal — phase 2)* : ramener les voisines à leur
   position d'avant-dépli, modulo les déplacements manuels que
   l'utilisateur aurait faits entre temps.

**Phase 1 — Résolution d'overlap au dépli**

*Algorithme* (one-shot, max 5 itérations pour gérer les cascades) :

1. Calculer les bornes du s-box origine `O` (celui qu'on vient de
   déplier).
2. Pour chaque autre s-box `B` :
   - Tester l'overlap AABB entre `O.rect` et `B.rect`.
   - S'il y a overlap, calculer le **push de min-déplacement** :
     déterminer l'axe (horizontal ou vertical) où le déplacement
     pour résoudre l'overlap est le plus court ; appliquer ce
     déplacement à `B` dans la direction qui éloigne du centre de
     `O`.
3. Re-checker les chevauchements créés par les déplacements (`B`
   poussé peut maintenant chevaucher `C`). Re-itérer jusqu'à
   stabilité ou limite atteinte.

*Pseudo-code* :

```ts
function resolveSBoxOverlapsAfterUnfold(
  state: NodalProject,
  originId: SceneBoxNodeId
): Displacement[] {
  const trace: Displacement[] = [];
  const maxIter = 5;
  for (let iter = 0; iter < maxIter; iter++) {
    let moved = false;
    const originRect = sboxRect(state, originId);
    for (const otherId of Object.keys(state.sceneBoxes) as SceneBoxNodeId[]) {
      if (otherId === originId) continue;
      const otherRect = sboxRect(state, otherId);
      if (!rectsOverlap(originRect, otherRect)) continue;
      const push = computeMinPush(originRect, otherRect);
      // Mémoriser dans `trace` la position avant/après pour la phase 2.
      trace.push({
        id: otherId,
        from: { x: state.layout[otherId].x, y: state.layout[otherId].y },
        to: {
          x: state.layout[otherId].x + push.dx,
          y: state.layout[otherId].y + push.dy,
        },
      });
      state.layout[otherId] = {
        ...state.layout[otherId],
        x: state.layout[otherId].x + push.dx,
        y: state.layout[otherId].y + push.dy,
      };
      moved = true;
    }
    // Cascade : itérer jusqu'à stabilité (pour les overlap entre
    // s-box poussées, sans rapport direct avec l'origine).
    if (!moved) break;
    // Note : les itérations 2..N traitent aussi les overlap
    // « non-origine ↔ non-origine » nés des push initiaux.
  }
  return trace;
}
```

*Helpers à fournir* (nouveau fichier
`xflow/react/src/view/nesting/sboxCollision.ts`) :

- `sboxRect(state, sboxId): Rect` — combine
  `state.layout[sboxId].{x,y}` + `computeContainerBounds(state, sboxId)`.
- `rectsOverlap(a, b): boolean` — AABB classique avec une marge de
  `SBOX_GAP = 24` (espace blanc minimal entre s-box pour aération).
- `computeMinPush(originRect, otherRect): { dx, dy }` — pour l'axe
  du chevauchement le plus court, retourne le déplacement signé
  qui éloigne `other` de `origin`. L'autre axe = 0.

*Branchement* dans le store :

- Dans `toggleNodeCollapsed`
  ([store/nodalProjectStore.ts](xflow/react/src/store/nodalProjectStore.ts)) :
  - Détecter le cas `nodeId in state.sceneBoxes` ET transition
    `collapsed: true → false`.
  - Après le flip du flag, appeler `resolveSBoxOverlapsAfterUnfold(state, nodeId)`.

- Garde-fou : ne rien faire si le s-box origine n'a aucun
  descendant visible (cas vide — pas de raison de pousser).

*Tests* (nouveau `sboxCollision.test.ts`) :
- Deux s-box adjacentes, repli/dépli de la première : la seconde
  est poussée sur l'axe le plus court (vertical ou horizontal selon
  la géométrie).
- Trois s-box en ligne : dépli de A pousse B, B pousse C en
  cascade.
- S-box origine avec marge suffisante : aucun déplacement.
- Push de min-déplacement : si l'overlap horizontal est de 30 px et
  l'overlap vertical de 80 px, push horizontal.
- Marge `SBOX_GAP` respectée : les s-box ne se touchent pas
  exactement, il reste l'écart.

**Phase 2 — Rewind au repli (polish optionnel)**

*Idée* : la `trace` retournée par `resolveSBoxOverlapsAfterUnfold`
décrit chaque déplacement appliqué (`{ id, from, to }`). Si on la
mémorise quelque part associée au s-box origine, on peut la
rejouer en sens inverse au prochain repli.

*Mémoire (non persistée)* :

- Ajouter `state.sceneBoxOverlapMemory: Map<SceneBoxNodeId, Displacement[]>`
  (au store, hors layout — pas sérialisé en `map-layout.json`).
- Au dépli de `O` : `state.sceneBoxOverlapMemory.set(O, trace)`.
- Au repli de `O` :
  - Pour chaque `{ id, from, to }` dans la trace :
    - Lire la position actuelle de `id` (`current = state.layout[id]`).
    - Si `current` ≈ `to` (à epsilon près = `5 px`) → l'utilisateur
      n'a pas bougé cette s-box → **rewind** : remettre à `from`.
    - Sinon → l'utilisateur l'a déplacée manuellement → **garder
      sa position** (ne pas écraser).
  - Effacer `state.sceneBoxOverlapMemory.delete(O)`.

*Rationale du seuil epsilon* : un drag manuel dépasse largement
5 px. L'utilisateur ne peut pas accidentellement laisser une s-box
exactement à `to.x ± 4 px`.

*Hydrate / save* : la mémoire est purement runtime. Si l'utilisateur
recharge le projet pendant qu'une s-box est dépliée, la mémoire est
perdue → un repli ultérieur ne fait pas de rewind. Acceptable
(comportement dégradé propre).

*Tests phase 2* :
- Dépli A → B poussée à `to` ; repli A → B revient à `from`. ✓
- Dépli A → B poussée à `to` ; user déplace B manuellement ;
  repli A → B reste à sa nouvelle position (pas de rewind écrasant
  l'intention utilisateur).
- Dépli A puis dépli C avant repli A → traces séparées par
  s-box origine, pas de mélange.

**Critère de fin (phase 1 minimum)** *(implémenté : `sboxCollision.ts`, `toggleNodeCollapsed`, tests `sboxCollision.test.ts`)* :
- Smoke : projet à 3 s-box adjacentes ; replier la centrale
  rapproche les voisines (pas de phase 2, mais pas de mauvaise
  surprise) ; déplier une s-box collée à une autre la pousse
  visiblement, ne crée pas de chevauchement.
- Smoke : déplier une s-box isolée ne déplace rien.
- Vitest vert (suite + cas anti-collision).
- Pas de régression sur le repli / dépli simple (sans voisin).

**Critère de fin (phase 2)** *(implémenté : `sceneBoxOverlapMemory`, `rewindSBoxOverlapPushes` au repli)* :
- Smoke : dépli A déplace B ; repli A → B revient à sa position
  d'avant-dépli.
- Smoke : dépli A déplace B ; user drag B ailleurs ; repli A →
  B reste là où l'utilisateur l'a mise.

##### Étape 1.b.6-fix — Origin protection, push +x/+y only, drag-collision

> Suite au commit `8c61a52` (1.b.6 livrée), trois bugs structurels
> identifiés au smoke utilisateur. Quatre issues remontées, trois
> à corriger ici (la 4ᵉ est une limite acceptable de la phase 2
> mémoire, documentée plus bas).

**BUG 1 — La scène dépliée bouge elle-même au lieu de pousser les voisines**

*Cause* : la double boucle dans
[`sboxCollision.ts:91-121`](xflow/react/src/view/nesting/sboxCollision.ts#L91-L121)
ignore le paramètre `_originId` (préfixe `_` = unused) et itère
sur toutes les paires `(i, j)` avec `i < j`, en poussant
**toujours `idB`**. Si l'origine est triée alphabétiquement après
sa voisine, c'est l'origine qui se fait pousser → la scène dépliée
se retrouve déplacée à la place de la voisine.

**BUG 2 — Push parfois vers la gauche / le haut**

*Cause* : `computeMinPushSeparation` choisit l'axe du chevauchement
le plus court ET la direction qui éloigne du centre de l'ancre :
```ts
sepX = (overlapX + gap) * (bcx >= acx ? 1 : -1);
```
Pour une s-box à gauche de l'origine, `bcx < acx` → `sepX < 0` →
push à gauche. Conséquence visuelle : l'edge `goto` qui pointait
de gauche-à-droite (sens du flux) repart en arrière.

**Observation clé** : un s-box ne grandit jamais vers le haut ou
la gauche au dépli — son point d'ancrage `(layout.x, layout.y)`
reste fixe, seules `width` / `height` augmentent. Donc une s-box
*originellement* à gauche ou au-dessus de l'origine **ne peut pas**
soudainement chevaucher l'origine par effet du dépli. Seules les
s-box à droite ou en-dessous sont concernées par le chevauchement
au dépli. **Restreindre le push à +x / +y est donc mathématiquement
correct dans ce cas.**

**BUG 3 — Pas de résolution au drag d'une s-box**

*Cause* : l'appel à `resolveSBoxOverlapsAfterUnfold` n'est branché
que dans `toggleNodeCollapsed` (transition `collapsed: true →
false`). Drag d'une s-box ne déclenche aucune vérification → l'utilisateur
peut superposer manuellement, et le système ne corrige pas.

**LIMITE acceptée — Mémoire de rewind fragile entre opérations**

La trace de `sceneBoxOverlapMemory` est figée au moment du dépli.
Si l'utilisateur déplie A, déplie B (qui à son tour pousse les
mêmes voisines), drag manuellement, etc., les `from` mémorisées de
A ne reflètent plus le contexte au moment du repli ; le rewind ne
restaure parfois pas les positions « initiales » attendues.

**Décision** : limite documentée mais non corrigée à ce stade.
Coût d'une correction propre = importante (graph d'historique avec
invalidation) ; bénéfice = marginal pour le workflow utilisateur.
À reconsidérer plus tard si le cas devient bloquant.

**Directive** :

1. **Fix BUG 1 — utiliser réellement `originId`**
   ([sboxCollision.ts](xflow/react/src/view/nesting/sboxCollision.ts)) :

   Remplacer la double boucle par une boucle origin-centrique.
   L'origine est **toujours** l'ancre fixe ; les autres sont
   poussées :

   ```ts
   export function resolveSBoxOverlapsAfterChange(
     state: NodalProject,
     originId: SceneBoxNodeId,
     maxIter = 5
   ): SBoxDisplacement[] {
     const trace: SBoxDisplacement[] = [];

     for (let iter = 0; iter < maxIter; iter++) {
       let moved = false;
       const originRect = sboxWorldRect(state, originId);
       if (!originRect) break;

       for (const otherId of Object.keys(state.sceneBoxes) as SceneBoxNodeId[]) {
         if (otherId === originId) continue;
         const otherRect = sboxWorldRect(state, otherId);
         if (!otherRect || !rectsNeedSeparation(originRect, otherRect)) continue;

         const push = computeRightDownPush(originRect, otherRect); // cf. point 2
         if (push.dx === 0 && push.dy === 0) continue;

         const lo = state.layout[otherId];
         if (!lo) continue;
         const from = { x: lo.x, y: lo.y };
         const to = { x: lo.x + push.dx, y: lo.y + push.dy };
         trace.push({ id: otherId, from, to });
         state.layout[otherId] = { ...lo, x: to.x, y: to.y };
         moved = true;
       }

       // Cascade : après le push initial, deux s-box non-origine
       // peuvent se chevaucher entre elles. Les itérations suivantes
       // résolvent ces overlaps en traitant la s-box la plus proche
       // de l'origine (en min(x+y) depuis (originRect.x, originRect.y))
       // comme nouvelle ancre temporaire.
       if (!moved) break;
       resolveCascadeOverlaps(state, originRect, trace); // cf. helper en point 4
     }

     return trace;
   }
   ```

   Renommer la fonction de `resolveSBoxOverlapsAfterUnfold` →
   `resolveSBoxOverlapsAfterChange` (générique : sert au dépli ET
   au drag).

2. **Fix BUG 2 — `computeRightDownPush` (push +x / +y uniquement)**
   ([sboxCollision.ts](xflow/react/src/view/nesting/sboxCollision.ts)) :

   Remplacer `computeMinPushSeparation` (ou ajouter une variante)
   par une fonction qui ne renvoie que des déplacements positifs.
   Quand `other` est à droite de `anchor` (overlap horizontal),
   pousser à droite. Quand `other` est en-dessous (overlap
   vertical), pousser en bas. Choisir l'axe avec le plus petit
   déplacement (parmi les deux options non-négatives).

   ```ts
   export function computeRightDownPush(
     anchor: SBoxRect,
     other: SBoxRect,
     gap: number = SBOX_GAP
   ): { dx: number; dy: number } {
     // dx pour pousser `other` à droite de `anchor` : other.x ≥ anchor.right + gap
     const targetX = anchor.x + anchor.width + gap;
     const dxRight = Math.max(0, targetX - other.x);

     // dy pour pousser `other` sous `anchor` : other.y ≥ anchor.bottom + gap
     const targetY = anchor.y + anchor.height + gap;
     const dyDown = Math.max(0, targetY - other.y);

     // Choisir l'axe au plus petit déplacement non-nul (le moins intrusif).
     if (dxRight === 0 && dyDown === 0) return { dx: 0, dy: 0 };
     if (dxRight === 0) return { dx: 0, dy: dyDown };
     if (dyDown === 0) return { dx: dxRight, dy: 0 };
     return dxRight <= dyDown ? { dx: dxRight, dy: 0 } : { dx: 0, dy: dyDown };
   }
   ```

   *Justification du choix d'axe* : si la s-box est essentiellement
   à droite de l'origine mais déborde un peu en bas, on la pousse
   à droite (moins intrusif que la pousser bien plus bas). Et
   inversement.

   ⚠️ **Garde-fou** : si la s-box `other` est *à gauche* de
   l'origine ET *au-dessus*, `dxRight` et `dyDown` peuvent être
   énormes (la pousser de l'autre côté). Dans ce cas — qui ne
   devrait pas arriver vu l'observation ci-dessus — préférer ne
   rien faire (return `{ dx: 0, dy: 0 }`) et laisser un warning
   console. Concrètement :
   ```ts
   const isLeftOfAnchor = other.x + other.width <= anchor.x;
   const isAboveAnchor  = other.y + other.height <= anchor.y;
   if (isLeftOfAnchor && isAboveAnchor) {
     console.warn("[computeRightDownPush] other diagonalement avant anchor — push ignoré (cas inattendu post-dépli)");
     return { dx: 0, dy: 0 };
   }
   ```

3. **Fix BUG 3 — Drag-collision sur s-box**
   ([view/NodalCanvas.tsx](xflow/react/src/view/NodalCanvas.tsx)
   `onNodeDragStop`) :

   - Ajouter une branche en début de la fonction (ou dans la
     branche existante des sceneBoxes si elle existe) :
     ```ts
     if (draggedNode.id in live.sceneBoxes) {
       // Le s-box dragué devient l'ancre temporaire ; les voisines
       // qu'il chevauche désormais sont poussées +x/+y.
       store.getState().resolveSBoxOverlapsAfterChange(draggedNode.id as SceneBoxNodeId);
       return;
     }
     ```
   - Exposer la méthode `resolveSBoxOverlapsAfterChange` sur le
     store (équivalent du `toggleNodeCollapsed` / `reanchorSBox`)
     pour qu'elle soit appelable depuis le composant.

   *Note* : la mémoire `sceneBoxOverlapMemory` reste alimentée par
   la trace retournée — au cas où l'utilisateur veut « rewinder »
   son drag (peu utile en pratique, mais pas faux).

   *Edge case* : drag d'un s-box vide (sans aucun descendant
   visible). Bypass : si `state.sceneBoxes[id]` existe sans aucun
   enfant visible, ne pas résoudre.

4. **Cascade — helper `resolveCascadeOverlaps`** :

   Après la résolution origin-centrique, les s-box poussées
   peuvent désormais se chevaucher entre elles. Boucler une fois
   sur les paires non-origine et résoudre en utilisant la **plus
   proche de l'origine** comme ancre temporaire :

   ```ts
   function resolveCascadeOverlaps(
     state: NodalProject,
     originRect: SBoxRect,
     trace: SBoxDisplacement[]
   ): void {
     const allIds = Object.keys(state.sceneBoxes) as SceneBoxNodeId[];
     // distance Manhattan au coin top-left de l'origine, pour ordonner par proximité
     const distFromOrigin = (id: SceneBoxNodeId): number => {
       const lo = state.layout[id];
       if (!lo) return Infinity;
       return Math.abs(lo.x - originRect.x) + Math.abs(lo.y - originRect.y);
     };
     const sorted = [...allIds].sort((a, b) => distFromOrigin(a) - distFromOrigin(b));

     for (let i = 0; i < sorted.length; i++) {
       for (let j = i + 1; j < sorted.length; j++) {
         const anchorId = sorted[i]!;
         const otherId  = sorted[j]!;
         const ra = sboxWorldRect(state, anchorId);
         const rb = sboxWorldRect(state, otherId);
         if (!ra || !rb || !rectsNeedSeparation(ra, rb)) continue;
         const push = computeRightDownPush(ra, rb);
         if (push.dx === 0 && push.dy === 0) continue;
         const lo = state.layout[otherId];
         if (!lo) continue;
         const from = { x: lo.x, y: lo.y };
         const to = { x: lo.x + push.dx, y: lo.y + push.dy };
         trace.push({ id: otherId, from, to });
         state.layout[otherId] = { ...lo, x: to.x, y: to.y };
       }
     }
   }
   ```

   La cascade est ainsi traitée en respectant le « sens du flux »
   (la s-box la plus proche de l'origine est toujours l'ancre).

5. **Branchements à mettre à jour** dans `nodalProjectStore.ts` :

   - Renommer / remplacer l'appel actuel à
     `resolveSBoxOverlapsAfterUnfold` par
     `resolveSBoxOverlapsAfterChange`.
   - Ajouter la nouvelle méthode publique
     `resolveSBoxOverlapsAfterChange(sboxId)` exposée pour usage
     depuis NodalCanvas (drag).
   - Le rewind au repli reste sur `rewindSBoxOverlapPushes`
     (inchangé).

6. **Tests** — étendre `sboxCollision.test.ts` :

   - **`computeRightDownPush`** :
     - other à droite : push +x.
     - other en-dessous : push +y.
     - other à droite ET en-dessous, dx < dy : push +x.
     - other à gauche-au-dessus (cas pathologique) : push (0, 0)
       avec warning.
   - **`resolveSBoxOverlapsAfterChange`** :
     - L'origine ne bouge **jamais** (assertion explicite sur
       `state.layout[originId].{x,y}` invariant).
     - Une s-box à droite de l'origine se fait pousser +x.
     - Une s-box en-dessous de l'origine se fait pousser +y.
     - Cascade : 3 s-box en ligne, dépli de la première pousse les
       deux autres (la 3ᵉ est poussée par la 2ᵉ devenue ancre
       temporaire).
   - **Drag-collision** (test d'intégration) :
     - Drag d'un s-box sur un autre → l'autre est poussé +x/+y.
     - Drag d'un s-box dans une zone libre → rien ne bouge.

**Critère de fin** :

- Smoke : déplier une scène A située à gauche d'une scène B → B
  poussée à droite, A inchangée, edge goto A→B reste de gauche à
  droite.
- Smoke : déplier une scène A située en haut d'une scène B → B
  poussée en bas, A inchangée.
- Smoke : déplier une scène A entourée par 2 voisines → les deux
  voisines poussées +x/+y, A inchangée, ordonnancement vertical /
  horizontal préservé.
- Smoke : drag manuel d'une s-box pour la rapprocher d'une autre
  → l'autre se décale automatiquement, sans superposition.
- Smoke (limite documentée — ne pas régresser malgré tout) :
  cycle dépli/drag/dépli/repli → la mémoire trace peut ne pas
  rewinder parfaitement, mais aucune position n'est cassée.
- Vitest vert (suite + nouveaux cas).

##### Étape 1.b.4 — Polish + meta/satellites (étape finale)

> Adapté pour le modèle s-box (étape 1.b.2.x). **Vient après 1.b.5
> (media auto-parentés)** — c'est la dernière étape du sous-chantier
> C8.1.b.

**Directive** :

1. **S-box d'une scène sans action** :
   - Le s-box reste créé (auto-managé) mais sa taille est minimale —
     juste de quoi contenir la scène + padding interne.
   - Pas de chevron rendu sur la scène (rien à plier).
   - Visuellement : le s-box peut être atténué ou rendu invisible
     (bordure transparente) pour ne pas polluer l'affichage —
     **décision UX à confirmer avec l'utilisateur** lors du polish.

2. **Satellites** *(media déjà traités en 1.b.5)* :
   - Comportement par défaut **conservé** : un satellite dont la
     source meta est cachée (descendant de conteneur replié = s-box
     ou selector) est marqué `hidden:true` (géré par
     `collectHiddenIdsFromCollapsedContainers`).
   - **Cas multi-source satellite** (1 satellite avec plusieurs
     `meta-in` depuis des conteneurs différents) : modèle V2 = 1:1
     pour les satellites auto-réconciliés, donc ne se présente pas.
     Maintenu hors scope C8.1.b — report.

3. **Style final** :
   - Variables CSS pour le s-box (clair/sombre).
   - Cohérence visuelle : le s-box doit être nettement identifiable
     comme regroupement, sans écraser la scène ni les actions
     internes.
   - État `collapsed` du s-box : style légèrement différencié
     (bordure plus discrète, fond moins marqué) pour signaler que
     le contenu est masqué.

4. **Filtrage du s-box dans la palette de détection d'attachement**
   ([view/NodalCanvas.tsx](xflow/react/src/view/NodalCanvas.tsx)
   `onNodeDragStop`) :
   - S'assurer que le s-box n'est jamais candidat parent dans la
     boucle de détection d'overlap (ni pour les rewards REQ/PWD ni
     pour les choix de selector ni pour les media). Filtrer par
     `nodeType !== 'sceneBox'` à l'entrée de la boucle.
   - *(Si déjà fait en 1.b.5 point 7 pour le détachement media,
     c'est OK — vérifier que c'est bien posé en début de boucle de
     détection plutôt que dans des branches spécifiques.)*

5. Mise à jour journal Annexe D + ouverture des tickets de report
   (multi-meta satellite, copie media, etc.).

**Critère de fin** :
- Visual QA validé par l'utilisateur.
- Tous les SMK-C8.1-* passent (à définir lors de cette étape — la
  liste inclut désormais les cas media de 1.b.5).
- Pas de régression sur les tests existants
  (selector/REQ/PWD attachement non perturbé par le s-box ; media
  auto-parentés non perturbés par les filtres anti-s-box).

#### Sous-chantier C8.3 — Indicateur scène initiale + propagation au runtime

> C8.3 a été livré en deux temps (commits `bfea640` indicateur + `74ea78c`
> palette + réconciliation R3/R2). **Bug structurel résiduel** signalé au
> smoke utilisateur : changer `meta.startSceneId` dans la carte nodale
> n'a **aucun effet** sur la scène effectivement utilisée par le jeu
> généré. Étape correctrice **C8.3.x** ci-dessous.

##### Étape C8.3.x — Faire respecter `meta.startSceneId` dans `generateGame`

**Diagnostic — chaîne cassée à deux endroits**

```
Nodal store [meta.startSceneId]
  └─ flush DOM (intervalle 8 s)
       via applyNodalStateToLegacyDom
       └─ sortedScenes() trie par layout.x   ← ❌ ignore startSceneId
            └─ DOM #scenes-container : .scene-block (1er = leftmost x)
                 └─ getCurrentProjectData() lit l'ordre DOM
                      └─ project.scenes[0].id
                           └─ generateGame: firstSceneId = scenes[0].id ← ❌
                                └─ player: initialSceneId = leftmost x
```

Conséquence : peu importe ce que l'utilisateur sélectionne dans la
palette « scène de départ », le jeu généré démarre toujours sur la
scène la plus à gauche dans la carte nodale. Le badge affiché sur la
nodal n'est qu'un indicateur visuel, sans effet sur le runtime.

**Discussion des deux corrections proposées**

L'utilisateur a évoqué deux pistes :

- **(A)** Faire en sorte que la scène marquée comme départ soit
  remontée en tête du formulaire (DOM `.scene-block` à l'index 0).
- **(B)** Faire en sorte que `generateGame` lise directement
  `project.startSceneId` (avec fallback sur `scenes[0]`).

**Décision : appliquer les deux**, en defense-in-depth. (A) résout le
problème dans la majorité des cas (le flush DOM est régulier et les
deux chemins de génération — HTML + ZIP — passent par la même
`getCurrentProjectData`). (B) couvre le cas où le flush DOM n'a pas
encore eu lieu (utilisateur clique « Generate » dans les 8 secondes
qui suivent un changement de départ) **et** est cohérent avec le
principe « la nodal est source de vérité » (quel que soit l'état
intermédiaire du DOM).

**Directive** :

1. **Fix (A) — Tri du flush nodal → DOM**
   ([js/editor-shared-nodal-to-dom.js](js/editor-shared-nodal-to-dom.js)) :

   Modifier `sortedScenes(state)` (autour de la ligne 370) pour
   placer en premier la scène dont l'`id` correspond à
   `state.meta.startSceneId`, puis trier le reste par `layout.x` :

   ```js
   function sortedScenes(state) {
     var scenes = state.scenes || {};
     var startId = state.meta && state.meta.startSceneId
       ? String(state.meta.startSceneId)
       : null;
     var list = [];
     for (var k in scenes) {
       if (Object.prototype.hasOwnProperty.call(scenes, k)) list.push(scenes[k]);
     }
     list.sort(function (a, b) {
       // Scène de départ toujours en tête (cf. C8.3.x).
       if (startId) {
         if (a.id === startId) return -1;
         if (b.id === startId) return 1;
       }
       var la = (state.layout && state.layout[a.id]) || {};
       var lb = (state.layout && state.layout[b.id]) || {};
       return (la.x || 0) - (lb.x || 0);
     });
     return list;
   }
   ```

   Effet : à chaque flush (intervalle ou immédiat), la scène
   `startSceneId` est en tête du DOM `#scenes-container`.

2. **Flush immédiat sur changement de `startSceneId`**
   ([js/editor-nodal-map-bootstrap.js](js/editor-nodal-map-bootstrap.js)
   ou un endroit équivalent où le store est référencé) :

   Le flush actuel est périodique (8 s). Pour que l'effet visuel et
   le générateur soient instantanés, ajouter un abonnement Zustand
   sur `state.meta.startSceneId` qui déclenche immédiatement
   `flushNodalProjectionToDom()`.

   ```js
   // Pseudo-code dans le bootstrap, après l'init du store.
   var st = window.__ESCAPE360_NODAL_STORE__;
   if (st && typeof st.subscribe === "function") {
     var prevStart = (st.getState().meta || {}).startSceneId || null;
     st.subscribe(function (state) {
       var nextStart = (state.meta || {}).startSceneId || null;
       if (nextStart !== prevStart) {
         prevStart = nextStart;
         flushNodalProjectionToDom();
       }
     });
   }
   ```

   *Idempotence* : si `flushNodalProjectionToDom` est déjà
   re-entrant-safe (cf. `applying` flag dans
   `editor-shared-nodal-to-dom.js`), aucun risque.

3. **Fix (B) — `generateGame` respecte `project.startSceneId`**
   ([js/editeur-generate.js](js/editeur-generate.js) **et**
   [js/editor-en-generate.js](js/editor-en-generate.js) — version
   anglaise à synchroniser) :

   Ligne ~437-438 actuellement :
   ```js
   (project.scenes || []).forEach((scene, index) => {
     const scId = scene.id || ("scene_" + (index + 1));
     ...
     if(index === 0) firstSceneId = scId;
   ```

   Remplacer la logique d'attribution de `firstSceneId` :

   ```js
   // Avant la boucle des scènes :
   const explicitStart = project.startSceneId
     ? String(project.startSceneId).trim()
     : "";

   // Dans la boucle :
   (project.scenes || []).forEach((scene, index) => {
     const scId = scene.id || ("scene_" + (index + 1));
     ...
     // Priorité : startSceneId explicite si la scène existe ; sinon, fallback DOM index 0.
     if (explicitStart && scId === explicitStart) {
       firstSceneId = scId;
     } else if (!firstSceneId && !explicitStart && index === 0) {
       firstSceneId = scId;
     } else if (!firstSceneId && explicitStart && index === project.scenes.length - 1) {
       // explicitStart pointait vers un id absent : fallback sur la 1ère scène en ordre DOM.
       firstSceneId = (project.scenes[0] && project.scenes[0].id) || scId;
     }
   });
   ```

   ⚠️ **Simplification** — pour éviter la triple-condition fragile,
   on peut sortir le calcul de `firstSceneId` de la boucle :

   ```js
   const sceneIds = (project.scenes || [])
     .map((s, i) => s.id || ("scene_" + (i + 1)));
   const explicitStart = project.startSceneId
     ? String(project.startSceneId).trim()
     : "";
   firstSceneId = explicitStart && sceneIds.includes(explicitStart)
     ? explicitStart
     : (sceneIds[0] || "");
   ```

   Cette forme est plus lisible et résiste au cas
   `startSceneId` absent ou invalide.

4. **`getCurrentProjectData` doit inclure `startSceneId`**
   ([js/editor-shared-project-serialization.js](js/editor-shared-project-serialization.js)) :

   Aujourd'hui, l'objet `project` retourné n'a pas de champ
   `startSceneId`. Pour que (B) fonctionne, il faut l'alimenter.

   **Option simple** : lire directement le store nodal depuis le
   serializer DOM :

   ```js
   // Dans getCurrentProjectData, avant le return :
   var nodalStore = global.__ESCAPE360_NODAL_STORE__;
   if (nodalStore && typeof nodalStore.getState === "function") {
     var meta = (nodalStore.getState().meta) || {};
     var ssid = meta.startSceneId
       ? String(meta.startSceneId).trim()
       : "";
     if (ssid) {
       // meta.startSceneId est l'`id` interne nodal (ex. scene_1).
       // On résout vers l'id externe (= scene.id du JSON).
       var scenes = (nodalStore.getState().scenes) || {};
       var sceneEntry = scenes[ssid];
       if (sceneEntry && sceneEntry.sceneId) {
         project.startSceneId = String(sceneEntry.sceneId).trim();
       }
     }
   }
   ```

   *Note* : on lit `sceneEntry.sceneId` (l'id externe stable) et non
   `meta.startSceneId` (id interne nodal), pour que ça matche les
   `scene.id` que le DOM expose et que `generateGame` compare.

   *Alternative* si l'accès direct au store global est jugé trop
   intrusif : passer par un input caché côté DOM, écrit par le
   nodal-to-dom au moment du flush, lu par `getCurrentProjectData`.
   Plus de couplage à maintenir, sans avantage net — préférer
   l'accès direct au store.

5. **Tests** — étendre / créer :

   - `editor-shared-nodal-to-dom.test.js` (s'il existe sinon
     vitest unit dans xflow) :
     - `sortedScenes` avec `meta.startSceneId` défini : la scène
       cible est **première** quel que soit son `layout.x`.
     - `sortedScenes` sans `meta.startSceneId` : tri par x
       (régression).
     - `sortedScenes` avec `startSceneId` pointant vers une scène
       absente : ignoré, tri par x.

   - Test d'intégration legacy (puppet / vanilla) si possible :
     - Ouvrir un projet → choisir scène B comme départ →
       cliquer Generate → vérifier que `initialSceneId` du
       template HTML pointe sur B.

   - Vitest store : `setStartScene` puis lire `meta.startSceneId`
     (déjà couvert par `startSceneReconcile.test.ts`, vérifier
     qu'aucune régression).

6. **Documentation** — Annexe D + commentaire en tête de
   `editor-shared-nodal-to-dom.js` rappelant que la scène de
   départ est toujours placée en index 0 lors du flush.

**Critère de fin** :

- Smoke : ouvrir un projet à 3 scènes A / B / C ; A est en tête du
  formulaire. Sélectionner C dans la nodal, cliquer « Définir
  comme scène de départ » dans la palette. Vérifier que :
  1. Le badge « Départ » passe sur C dans la nodal ✓ (déjà OK).
  2. **Sans attendre 8 s**, ouvrir le formulaire — C est en tête.
  3. Cliquer « Generate » — le HTML généré contient
     `var initialSceneId = "C"`.
- Smoke : supprimer la scène de départ → `startSceneId` réconcilié
  selon R3/R2 (déjà OK depuis `74ea78c`) → tête du formulaire et
  `firstSceneId` du HTML restent cohérents.
- Smoke : projet legacy (sans `startSceneId` dans le JSON) →
  comportement DOM-index-0 préservé (régression).
- Vitest vert.
- Pas d'effet visible si on retire la nodal et qu'on travaille
  uniquement au formulaire (le code legacy continue à fonctionner
  avec `startSceneId` absent → fallback sur index 0).

**Hors scope (à reporter)** :

- Indicateur visuel « scène de départ » dans le formulaire vanilla
  (badge ou icône sur le `.scene-block`). La position en tête
  servira de signal implicite ; un signal explicite peut être
  ajouté plus tard si besoin.
- Action « définir comme scène de départ » depuis le formulaire
  vanilla. Pour l'instant, l'opération passe uniquement par la
  nodal map.

#### Sous-chantier C8.4 — Recherche de nœud

##### Étape C8.4.1 — Champ de recherche + navigation + centrage

**Contexte technique** :
- Le centrage automatique sur un nœud existe déjà via
  `reactFlow.fitView({ nodes: [{ id }], duration: 400 })`
  (cf. [WarningsPanel.tsx:44](xflow/react/src/view/warnings/WarningsPanel.tsx#L44))
  — réutiliser cette mécanique.
- La palette latérale ([NodePalette](xflow/react/src/view/palette/NodePalette.tsx))
  est l'emplacement le plus naturel pour le champ de recherche.
- Pas besoin de modal séparé — `Ctrl+F` peut simplement focuser le
  champ de la palette.

**Périmètre de la recherche** *(case-insensitive substring)* :

| Type de nœud | Champs indexés |
|---|---|
| `scene` | `label` (titre éditable) + `sceneId` (identifiant externe) |
| `action` (msg / pick / goto / req / pwd) | `label` |
| `action` (selector) | `label` + `payload.nested.title` |
| `media` | `label` |
| `state.meta.objects[*]` | `displayName` + `objectId` (clé) |

Pour les objets : un match dans `meta.objects` retourne **tous les
satellites de type `object`** qui référencent cet `objectId`
(plusieurs satellites possibles, cf. C8.5).

**Composant** — nouveau `NodalSearchField` :

- Placé en tête de la palette latérale, au-dessus des boutons d'ajout.
- Input texte + compteur « k / N résultats ».
- Boutons « ◀ » / « ▶ » à droite de l'input pour naviguer.
- Affichage : pas de liste déroulante par défaut (fluidité). Les
  résultats sont juste un index ordonné, on cycle dedans avec
  Entrée / Maj+Entrée.

**Algo recherche** (helper pur dans
`xflow/react/src/view/palette/searchNodes.ts`) :

```ts
export type SearchHit = {
  nodeId: AnyNodeId;
  label: string;     // pour debug / affichage compteur facultatif
  matchSpan?: { start: number; end: number }; // pour highlight si on l'ajoute plus tard
};

export function searchNodalNodes(state: NodalProject, query: string): SearchHit[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];

  const hits: SearchHit[] = [];

  // 1. Scènes (label + sceneId externe)
  for (const scene of Object.values(state.scenes)) {
    if (
      scene.label?.toLowerCase().includes(q) ||
      scene.sceneId?.toLowerCase().includes(q)
    ) hits.push({ nodeId: scene.id, label: scene.label || scene.sceneId });
  }

  // 2. Actions (label + selector.title)
  for (const action of Object.values(state.actions)) {
    let match = action.label?.toLowerCase().includes(q);
    if (!match && action.actionType === "selector") {
      const t = (action.payload as { nested?: { title?: string } }).nested?.title;
      match = t?.toLowerCase().includes(q) ?? false;
    }
    if (match) hits.push({ nodeId: action.id, label: action.label || action.actionType });
  }

  // 3. Media (label)
  for (const m of Object.values(state.media)) {
    if (m.label?.toLowerCase().includes(q)) hits.push({ nodeId: m.id, label: m.label });
  }

  // 4. Objets → satellites object qui les référencent
  for (const [objectId, entry] of Object.entries(state.meta.objects)) {
    const inObj = objectId.toLowerCase().includes(q) || (entry.displayName || "").toLowerCase().includes(q);
    if (!inObj) continue;
    for (const sat of Object.values(state.satellites)) {
      if (sat.satelliteType === "object" && sat.data.objectId === objectId) {
        hits.push({ nodeId: sat.id, label: entry.displayName || objectId });
      }
    }
  }

  // Dédoublonner par nodeId au cas où, ordre stable.
  const seen = new Set<string>();
  return hits.filter((h) => (seen.has(h.nodeId) ? false : (seen.add(h.nodeId), true)));
}
```

*Note* : un nœud peut matcher pour plusieurs raisons (label + objet
référencé) — le `Set` dédoublonne pour ne pas cycler deux fois sur
le même.

**Navigation et centrage** :

- État local du composant : `query`, `hits: SearchHit[]`,
  `currentIndex: number` (0 = premier résultat).
- Quand `query` change : recalcul `hits` ; reset `currentIndex = 0` ;
  centrer immédiatement sur `hits[0]` si non-vide.
- `Enter` (focus dans le champ) : `currentIndex = (currentIndex + 1) % hits.length` + recentrage.
- `Shift+Enter` : `currentIndex = (currentIndex - 1 + hits.length) % hits.length` + recentrage.
- Le centrage se fait via
  `reactFlow.fitView({ nodes: [{ id: hits[currentIndex].nodeId }], duration: 400, maxZoom: 1.5 })`.
- En plus du centrage : poser `selected: true` sur le nœud trouvé
  (cohérent avec le clic dans la palette warnings, et permet d'enchaîner
  avec « Définir comme scène de départ » si le résultat est une scène).

**Raccourci `Ctrl+F`** :

- Listener global sur `keydown` au niveau de `NodalCanvas` :
  - Si `Ctrl+F` (ou `Cmd+F` sur macOS) **et** focus n'est pas déjà
    dans le champ de recherche **et** focus n'est pas dans une
    popup / Quill / input éditable :
    - `event.preventDefault()` (évite la recherche navigateur)
    - Focus le champ `NodalSearchField`.
- Désactivation contextuelle : si une popup est ouverte
  (`mediaEditorMediaId`, `selectorEditorActionId`, etc., cf.
  l'état actuel de `NodalCanvas`), ne pas intercepter `Ctrl+F`
  → laisser passer le comportement navigateur (probablement utile).

**Tests** :

- Unitaires `searchNodes.test.ts` :
  - Match label scène / sceneId / titre selector / displayName objet.
  - Case-insensitive.
  - Dédoublonnage si match multi-source.
  - Retour vide pour query trim → `""`.
- Comportemental (hook RF) : test indirect via une fixture composant
  + simulation `Enter` / `Shift+Enter` qui doit incrémenter /
  décrémenter `currentIndex`.

**Critère de fin** :

- Smoke : projet à 5 scènes + 10 actions + 2 objets. Taper « lab »
  → résultats incluent scène « Lab » et toute action contenant
  « lab » dans son label. `Enter` cycle entre eux ; le viewport se
  centre à chaque fois.
- Smoke : `Ctrl+F` focus le champ ; `Échap` (futur C8.2) ou clic
  ailleurs le défocus.
- Pas de blocage du `Ctrl+F` natif quand une popup d'édition est
  ouverte.

#### Sous-chantier C8.2 — Raccourcis clavier + confirmations

> Trois étapes : (1) infrastructure de raccourcis + raccourcis simples,
> (2) confirmations de suppression contextuelles, (3) centre d'aide.
> Les raccourcis liés à la copie (`Ctrl+C` / `Ctrl+V`) sont traités en
> C8.5 avec la logique correspondante.

##### Étape C8.2.1 — Infrastructure raccourcis + Échap *(livrée 2026-05-02)*

**Note (2026-05-02, amendement)** : la touche **`D`** / `duplicateSelection` a été
**retirée** — la duplication passe par **copier/coller** (C8.5.2). La touche **`?`**
et la popup d’aide sont livrées en **C8.2.3**.

**Contexte technique** :
- React Flow gère nativement `Backspace` / `Delete` (suppression des
  nœuds/edges sélectionnés) via la prop `deleteKeyCode` —
  comportement à conserver, on ajoutera la confirmation au-dessus
  (C8.2.2).
- React Flow gère nativement `Shift+drag` (sélection rectangle) et
  `Shift+click` (multi-sélection) — déjà disponible.
- L'ouverture de popup intercepte l'`Échap` au niveau du composant
  popup (à confirmer cas par cas dans le code existant).

**Décisions design (validées avec utilisateur)** :
- ~~**`D` seul** pour duplication~~ — **abrogé** : duplication = **Ctrl+C / Ctrl+V**
  (cf. C8.5.2).
- **`Échap`** :
  - Si une popup d'édition est ouverte → la fermer (déjà géré par
    les composants popup, à vérifier).
  - Sinon → désélectionner tous les nœuds.
- **Désactivation contextuelle** des raccourcis quand le focus est
  dans un champ texte (input, textarea, contenteditable Quill,
  popup d'édition).

**Directive** :

1. **Helper de détection de focus** dans
   `xflow/react/src/view/keyboard/isEditingContext.ts` :
   ```ts
   export function isEditingContext(target: EventTarget | null): boolean {
     if (!(target instanceof HTMLElement)) return false;
     const tag = target.tagName.toLowerCase();
     if (tag === "input" || tag === "textarea" || tag === "select") return true;
     if (target.isContentEditable) return true;
     // Quill : .ql-editor a `contenteditable=true` donc déjà couvert
     // Popup : on considère qu'une popup ouverte capte le focus elle-même
     return false;
   }
   ```

2. **Hook global `useNodalKeyboard`** dans
   `xflow/react/src/view/keyboard/useNodalKeyboard.ts` :
   ```ts
   export function useNodalKeyboard(opts: {
     store: StoreApi<NodalProjectStore>;
     reactFlow: ReactFlowInstance;
     anyPopupOpen: boolean;
     deselectAll: () => void;
     duplicateSelection: () => void; // C8.5.3
     // copy/paste callbacks viennent de C8.5
   }): void {
     useEffect(() => {
       const onKey = (e: KeyboardEvent) => {
         if (isEditingContext(e.target)) return;
         // Échap
         if (e.key === "Escape") {
           if (opts.anyPopupOpen) return; // popup gère Échap elle-même
           opts.deselectAll();
           e.preventDefault();
           return;
         }
         // D = dupliquer
         if (e.key === "d" || e.key === "D") {
           if (e.ctrlKey || e.metaKey) return; // laisser Ctrl+D au navigateur
           opts.duplicateSelection();
           e.preventDefault();
           return;
         }
         // Ctrl+F : géré dans C8.4.1 (focus search field)
         // Ctrl+C/Ctrl+V : géré dans C8.5
       };
       window.addEventListener("keydown", onKey);
       return () => window.removeEventListener("keydown", onKey);
     }, [opts]);
   }
   ```

3. **Branchement dans `NodalCanvas`** :
   - Calculer `anyPopupOpen` depuis l'état local (objectEditor /
     coordsEditor / msgEditor / pickEditor / gotoEditor / reqEditor /
     pwdEditor / selectorEditor / mediaEditor / hubEditor /
     popupThemeEditor).
   - `deselectAll` = `reactFlow.setNodes(nodes => nodes.map(n =>
     ({ ...n, selected: false })))`.
   - `duplicateSelection` = stub vers la logique C8.5.3 (à appeler
     dès qu'elle existe).

4. **Tests** :
   - `isEditingContext` : input → true, contenteditable → true,
     div standard → false.
   - Hook : raccourcis documentés en **C8.2.3** (`nodalKeyboard.test.ts`).

**Critère de fin** :
- Smoke : `Échap` ferme une popup quand ouverte ; désélectionne les
  nœuds quand fermée.
- Pas de régression sur `Backspace` / `Delete` (suppression toujours
  active).

##### Étape C8.2.2 — Confirmations de suppression contextuelles *(livrée 2026-05-02)*

**Décisions design (validées)** :

| Type de nœud | Contenu | Comportement |
|---|---|---|
| `scene` | sans action attachée | suppression silencieuse |
| `scene` | avec ≥1 action attachée | **confirmation** (« supprimer scène X et N actions internes ? ») |
| `selector` | aucun choix | suppression silencieuse |
| `selector` | avec ≥1 choix | **confirmation** (« supprimer selector et N choix ? ») |
| `req` / `pwd` | sans action ni média imbriqué(e) en `layout` | suppression silencieuse |
| `req` / `pwd` | avec ≥1 action ou média imbriqué(e) en `layout` (chaîne résultat / suite, etc.) | **confirmation** (satellites auto exclus du **compte** du message, inclus dans la chaîne de suppression après validation) |
| `msg` / `pick` / `goto` | — | suppression silencieuse |
| `media` | — | suppression silencieuse (l'edge meta est retirée, pas de cascade) |
| `satellite` (auto) | — | non supprimable directement (auto-managé) |

**Note — écarts par rapport au plan initial (C8.2.2)** :

- **Point d’accroche RF** : le plan évoquait surtout `onNodesDelete` / interception clavier ; la livraison s’appuie sur **`onBeforeDelete`** (API React Flow v12), promesse async + dialogue, puis `resolve` — pas de réinjection manuelle des nœuds RF après annulation.
- **REQ / PWD** : le tableau d’origine prévoyait une **suppression toujours silencieuse** (récompense orpheline). En pratique, dès qu’il existe une **chaîne** sous le REQ ou le PWD (descendants `layout` actions / médias), le comportement est aligné sur **scène / selector** : confirmation + **`orderedDeleteChainForStoreNode`** pour retirer toute la sous-arborescence si l’utilisateur confirme ; sans enfant « métier », la suppression reste silencieuse et `removeNode` conserve le comportement d’orphelinage déjà décrit dans le store.
- **Lot multi-sélection** : pas de réduction du lot type « racines RF uniquement » (piste abandonnée : conflit boîte de sélection vs cascade). Le dialogue n’affiche **qu’un seul** texte d’avertissement (**le premier** parmi les nœuds qui exigent une confirmation) pour éviter la redondance ; la confirmation applique toutefois **`flattenDeleteChains`** sur **toutes** les cibles du lot.
- **Arêtes seules** : `onBeforeDelete` reçoit aussi les arêtes à supprimer ; il ne faut **pas** renvoyer `false` lorsque la sélection ne contient **aucun** nœud non-satellite mais contient des arêtes — sinon la suppression d’arêtes au clavier est bloquée.

**Directive** :

1. **Composant `DeleteConfirmDialog`** dans
   `xflow/react/src/view/popups/DeleteConfirmDialog.tsx` :
   - Props : `open: boolean`, `title: string`, `body: string`,
     `confirmLabel: string`, `onCancel: () => void`,
     `onConfirm: () => void`.
   - Style aligné sur les autres popups (overlay + boîte
     centrale + boutons).
   - Focus initial sur le bouton « Annuler » (sécurité).
   - `Échap` = annuler ; `Entrée` = confirmer.

2. **Helper `describeNodeForDeletion(state, nodeId): { needsConfirm, message } | null`** :
   - Retourne `null` si le nœud n'existe pas (no-op).
   - Pour scène : compte les actions descendantes (transitif via
     parentId). Si > 0 → confirm.
   - Pour selector : compte les choix directs. Si > 0 → confirm.
   - Pour `req` / `pwd` : compte les descendants `layout` (actions +
     médias uniquement pour le **message**). Si > 0 → confirm.
   - Sinon → `needsConfirm: false` (suppression directe).

3. **Wrapper UI dans `NodalCanvas`** :
   - Livré : **`onBeforeDelete`** (plutôt que seulement `onNodesDelete`) :
     avant suppression clavier, évaluer `describeNodeForDeletion` pour
     le lot ; si confirm requis pour au moins un nœud, ouvrir le dialogue.
   - (Variante texte d’origine : intercepter `onNodesDelete` pour chaque
     nœud — voir note « écarts » ci-dessus.)
   - Les nœuds ne sont effectivement retirés du store qu'**après**
     confirmation (ou immédiatement si silencieux).
   - Annulation : le dialogue résout la promesse `onBeforeDelete` sans
     mutation store (pas de parcours « réinjecter dans `rfNodes` »).
   - *(Brouillon initial : annulation après coup sur `onNodesDelete` ou
     wrap clavier `Delete` — non retenu, cf. note « écarts ».)*

4. **REQ / PWD** : suppression silencieuse si pas de chaîne ; sinon
   confirmation + ordre topologique des suppressions (cf.
   `orderedDeleteChainForStoreNode`). Hors confirmation, `removeNode`
   du store réinitialise déjà `parentId` des enfants à `null` (cf.
   `nodalProjectStore`).

5. **Tests** :
   - `describeNodeForDeletion` :
     - scène vide → no-confirm
     - scène avec actions → confirm + message correct
     - selector vide → no-confirm
     - selector avec choix → confirm
     - REQ seul sans enfant layout → no-confirm ; REQ avec chaîne → confirm
     - msg/goto/pick → no-confirm
   - Smoke : suppression d'une scène avec actions → dialog ; clic
     « Annuler » → rien ne change ; clic « Confirmer » → suppression.

**Critère de fin** :
- Smoke : Delete sur scène pleine → dialog avec compte d'actions ;
  Annuler restaure ; Confirmer supprime tout.
- Smoke : Delete sur selector vide → suppression directe.
- Smoke : Delete sur REQ **sans** dialogue (pas de chaîne) → enfants
  orphelins si présents ; avec dialogue (chaîne) → confirmer supprime
  tout le sous-arbre décrit.

##### Étape C8.2.3 — Centre d'aide raccourcis *(livrée 2026-05-02)*

**Décisions design (validées)** :
- Bouton dédié dans la palette latérale, en bas, intitulé
  « Raccourcis » (icône clavier ou « ⌨ »).
- Optionnellement, un raccourci `?` (touche `?` directement) qui
  ouvre la même popup.
- Optionnellement, un bouton « ? » à côté des boutons warning /
  thème dans la barre haute.

**Directive** :

1. **Composant `KeyboardShortcutsPopup`** :
   - Liste structurée des raccourcis :
     - Édition : `Ctrl+C` / `Ctrl+V` (Copier/Coller — réf C8.5),
       `Delete` / `Backspace` (Supprimer)
     - Navigation : `Ctrl+F` (Recherche), `?` (cette aide), `Échap`
       (Désélectionner / Fermer popup)
     - Sélection : `Shift+clic` (Multi-sélection),
       `Shift+drag` (Sélection rectangle)
     - Repli : clic chevron (Replier / Déplier)
   - Sections claires (Édition / Sélection / Navigation / etc.).
   - Bouton « Fermer » + raccourci `Échap`.

2. **Bouton dans la palette latérale**, ancré en bas via flex
   `margin-top: auto`. Ouvre la popup. Tooltip « Raccourcis (`?`) ».

3. **Raccourci `?`** : branché dans `useNodalKeyboard` via
   `openShortcutsHelp` — `e.key === "?"` (le navigateur résout les
   layouts clavier).

4. **Tests** :
   - Smoke : clic sur le bouton « Raccourcis » → popup ouverte ;
     touche `?` (hors champ texte) → popup ouverte ;
     `Échap` → fermée.

**Critère de fin** :
- Visual QA : tous les raccourcis listés correspondent à ce qui est
  réellement implémenté.
- Smoke : popup s'ouvre via 2 chemins (bouton + `?`).

**Fichiers livrés** : [KeyboardShortcutsPopup.tsx](xflow/react/src/view/popups/KeyboardShortcutsPopup.tsx),
[KeyboardShortcutsPopup.css](xflow/react/src/view/popups/KeyboardShortcutsPopup.css),
[NodalCanvas.tsx](xflow/react/src/view/NodalCanvas.tsx), [NodePalette.tsx](xflow/react/src/view/palette/NodePalette.tsx),
[palette.css](xflow/react/src/view/palette/palette.css), [nodalUiContext.tsx](xflow/react/src/view/nodalUiContext.tsx),
[useNodalKeyboard.ts](xflow/react/src/view/keyboard/useNodalKeyboard.ts), tests
[nodalKeyboard.test.ts](xflow/react/src/__tests__/keyboard/nodalKeyboard.test.ts).

#### Sous-chantier C8.5 — Copier / Coller + comportements clic + clic-droit

> Décomposition en **3 étapes** : (1) comportements clic
> (single/double/right) + composant menu contextuel, (2) logique
> copy/paste (store + raccourcis Ctrl+C/V), (3) duplication scène
> complète depuis le clic-droit s-box.

##### Étape C8.5.1 — Comportements clic + menu contextuel *(livrée 2026-05-02 ; affinage menu 2026-05-04)*

**Livré** : double-clic pour ouvrir les popups d’édition (actions, média, satellite) et l’édition du titre de scène ; `NodalContextMenu` + `onNodeContextMenu` / `onPaneContextMenu` ; **Copier** / **Coller** : voir **C8.5.2** ; menu **s-box** : **Replier / Déplier** uniquement (pas d’entrée « Dupliquer la scène », **C8.5.3** hors menu — couvert par copier-coller) ; tests `nodalContextMenuModel.test.ts`.

**Décisions design (validées)** :
- **Clic simple** sur un nœud → sélection seulement (plus
  d'ouverture de popup).
- **Double-clic** sur un nœud → ouvre la popup d'édition (si
  applicable).
- **Clic droit** sur un nœud → menu contextuel.
- **Clic droit** sur le canvas vide → menu avec « Coller » (si
  buffer non-vide).

**Directive** :

1. **Refactor des nœuds existants** pour séparer clic / double-clic :
   - `ActionNodeView`, `SceneNodeView`, `SatelliteNodeView`,
     `MediaNodeView` : remplacer `onClick` (qui ouvre la popup) par
     `onDoubleClick` (qui ouvre la popup). Le clic simple laisse RF
     gérer la sélection naturellement.
   - Attention aux comportements existants déjà liés au clic
     (ex. édition de titre scène inline) : à réviser pour passer
     en double-clic ou bouton dédié.

2. **Composant `NodalContextMenu`** dans
   `xflow/react/src/view/contextMenu/NodalContextMenu.tsx` :
   ```tsx
   type NodalContextMenuProps = {
     position: { x: number; y: number } | null;
     targetNodeId: AnyNodeId | null; // null = clic sur canvas vide
     selectedIds: Set<AnyNodeId>;
     onClose: () => void;
   };
   ```
   - Rendu : popover absolu à `position`, ferme au clic-extérieur
     ou `Échap`.
   - Options selon le type du `targetNodeId` (cf. tableau ci-dessous).

3. **Tableau des options par type** *(version finale)* :

   | Type | Options |
   |---|---|
   | `scene` | « Définir comme scène de départ » *(si pas déjà)* / « Copier » / « Copier la sélection » *(si selectedIds > 1)* / « Supprimer » |
   | `sceneBox` (s-box) | « Replier » ou « Déplier » *(« Dupliquer la scène » : hors menu — C8.5.3 / copier-coller)* |
   | `action` (msg/pick/goto/req/pwd) | « Ouvrir » *(double-clic alt)* / « Copier » / « Copier la sélection » / « Supprimer » |
   | `action` (selector) | « Ouvrir » / « Copier » / « Copier la sélection » / « Replier » ou « Déplier » / « Supprimer » |
   | `media` | « Ouvrir » / « Copier » / « Copier la sélection » / « Supprimer » |
   | `satellite` | « Aller au parent » *(centre la vue + sélection)* |
   | *vide* (canvas) | « Coller » *(si buffer non-vide)* |

4. **Branchement dans `NodalCanvas`** :
   - Hook `onNodeContextMenu` (RF prop) : capter `event.preventDefault()`
     + ouvrir le menu à la position du clic, avec `targetNodeId`.
   - Hook `onPaneContextMenu` (RF prop) : pareil mais avec
     `targetNodeId: null`.
   - Stocker la position dans le state local.

5. **Sélection multiple** :
   - « Copier » sans sélection multiple → copie le clic-droit-target.
   - « Copier la sélection » → copie tous les `selectedIds`.
   - Si l'utilisateur fait clic-droit sur un nœud **non-sélectionné**
     pendant une multi-sélection : on **ne perd pas** la
     multi-sélection, on affiche les deux options « Copier (ce
     nœud) » et « Copier la sélection » distinctement.

6. **Tests** :
   - Composant `NodalContextMenu` : rendu correct des options selon
     le type du nœud cible.
   - Comportement `useEffect` : ferme au clic-extérieur, ferme à
     `Échap`.
   - Smoke : double-clic ouvre la popup, clic simple sélectionne
     uniquement.

**Critère de fin** :
- Smoke : tous les types de nœuds répondent correctement aux 3
  gestes (clic / double-clic / clic-droit).
- Smoke : clic-droit sur canvas vide → « Coller » dispo si buffer
  non-vide ; sinon menu vide ou aucun menu (à voir UX).

##### Étape C8.5.2 — Logique copy / paste (store + raccourcis)

**Modèle conceptuel** :

Un **buffer de copie** (runtime, non persisté) contient un
sous-graphe sérialisé. Au collage :
- Tous les nœuds copiés reçoivent de **nouveaux IDs internes**.
- Les **`objectId`** dans les satellites `object` restent inchangés
  (références, pas duplications).
- Les `state.meta.objects` ne sont **jamais** dupliqués.
- Les satellites auto sont recréés par
  `reconcileAutoSatellites`.
- La position de collage = position de la souris au moment du
  `Ctrl+V` ou de la sélection « Coller » dans le menu contextuel.
- Les positions relatives internes du sous-graphe sont préservées
  (offsets entre nœuds copiés conservés).

**Directive** :

1. **Module `xflow/react/src/store/clipboard.ts`** :
   ```ts
   export type ClipboardSubgraph = {
     scenes: Record<string, SceneNode>;
     actions: Record<string, ActionNode>;
     satellites: Record<string, SatelliteNode>;
     media: Record<string, MediaNode>;
     edges: Edge[];
     layout: Record<string, NodeLayout>;
     // Coordonnée d'origine (top-left du bounding box) pour calcul d'offset au paste
     originAbs: { x: number; y: number };
   };

   /** Construit un snapshot copyable depuis une sélection. */
   export function buildClipboard(
     state: NodalProject,
     nodeIds: AnyNodeId[]
   ): ClipboardSubgraph;

   /** Insère un sous-graphe dans le state à `pasteAbs` (avec nouveaux IDs). */
   export function pasteClipboard(
     state: NodalProject,
     clipboard: ClipboardSubgraph,
     pasteAbs: { x: number; y: number },
     nextAutoId: (prefix: string) => string
   ): { newIds: AnyNodeId[] };
   ```

2. **Algorithme `buildClipboard`** :
   - À partir de `nodeIds`, calculer la **clôture transitive** :
     pour chaque nœud sélectionné, inclure tous ses descendants
     `parentId` (choix de selector, récompense REQ/PWD, media
     parenté, satellites auto).
   - Inclure aussi les edges internes (entre nœuds inclus). **Ne
     pas** inclure les edges sortantes (vers des nœuds hors clôture).
   - Calculer `originAbs` = `min(layout[id].abs)` pour chaque nœud
     direct (pas leurs enfants — l'offset reste cohérent).

3. **Algorithme `pasteClipboard`** :
   - Pour chaque nœud du clipboard :
     - Générer un nouvel ID via `nextAutoId(prefix)` selon le type.
     - Cloner le nœud avec le nouvel ID.
     - Cloner le layout : décaler par `pasteAbs - originAbs` pour les
       nœuds top-level ; les enfants gardent leurs coords relatives.
     - Mettre à jour les `parentId` pour pointer vers les nouveaux
       IDs.
   - Pour chaque edge interne : créer une nouvelle edge avec un
     nouvel ID, source/target remappés.
   - Appeler `reconcileAutoSatellites` pour recréer les satellites
     manquants (si l'utilisateur a copié uniquement l'action sans
     ses satellites — comportement conservatif).
   - Retourner les nouveaux IDs (pour pouvoir sélectionner les
     nœuds collés).

4. **Préservation des `objectId`** :
   - Pour les satellites de type `object`, le champ `data.objectId`
     est **copié tel quel** (pas remappé).
   - `meta.objects` n'est jamais touché par le paste.
   - Les `pick`/`req` clones gardent leur `payload.itemId`
     identique à l'original.

5. **Préservation des cibles `goto`** :
   - Le `payload.target` (sceneId externe) d'un `goto` clone reste
     identique → l'edge `transition` clone pointe vers la même
     scène externe (pas vers un clone de la scène, qui n'existe
     pas).

6. **Position de collage (paste position)** :
   - Track de la dernière position de souris sur le canvas via un
     listener `mousemove` au niveau de `NodalCanvas` (stocké en
     ref pour éviter les re-renders).
   - Convertir screen → flow via
     `reactFlow.screenToFlowPosition(...)`.
   - Si la souris n'est pas sur le canvas (`mouseInside === false`)
     → fallback sur le centre du viewport visible.

7. **Raccourcis clavier** (étend `useNodalKeyboard` C8.2.1) :
   - `Ctrl+C` (ou `Cmd+C`) : `buildClipboard(state, selectedIds)`.
   - `Ctrl+V` (ou `Cmd+V`) : `pasteClipboard(state, clipboard, mousePos)`,
     puis sélectionner les nouveaux nœuds.
   - Désactivés en `isEditingContext`.

8. **Branchement menu contextuel** :
   - « Copier » → `buildClipboard(state, [targetNodeId])`.
   - « Copier la sélection » → `buildClipboard(state, [...selectedIds])`.
   - « Coller » → `pasteClipboard(state, clipboard, menuOpenPos)`.

9. **Tests** :
   - `buildClipboard` :
     - Action seule : clipboard contient action + ses satellites
       auto + ses media parentés.
     - Selector avec choix : clipboard inclut tous les choix.
     - REQ avec récompense : récompense incluse.
     - Sélection de 2 actions sans lien parent : clipboard contient
       les 2 sous-arbres séparés.
   - `pasteClipboard` :
     - Round-trip : `buildClipboard` puis `pasteClipboard` produit
       un sous-graphe identique sauf IDs.
     - `objectId` préservé (test sur satellite object).
     - `goto.payload.target` préservé.
     - Offset correct.
   - Smoke : `Ctrl+C` puis `Ctrl+V` → nœud cloné à la position
     souris, sélectionné.

**Critère de fin** :
- Smoke : copier un selector avec 3 choix dont un sous-selector
  avec ses propres choix → coller → tout le sous-graphe se
  retrouve avec nouveaux IDs, structure identique.
- Smoke : copier une action `pick` avec un objet « clé » → coller →
  la clone référence le même `objectId`, pas de doublon dans
  `meta.objects`.

##### Étape C8.5.3 — Dupliquer scène complète (s-box)

> **Statut (2026-05-02) — non réalisée, volontairement ignorée** ; **2026-05-04** : l’entrée menu s-box a été **retirée** (plus d’action grisée). Le besoin reste **couvert par C8.5.2** (copier une scène ou le pod s-box + contenu). Le texte ci-dessous reste une **référence** pour un éventuel raccourci one-click (store `duplicateSceneFull`, etc.).

**Décision** *(historique)* : option spécifique au clic-droit sur s-box,
dédiée à la **duplication d'une scène et de tout son contenu**
en un seul geste — équivalent à une « Save as » de scène.

**Directive** :

1. **Action store `duplicateSceneFull(sceneId): SceneNodeId`** :
   - Construit un `ClipboardSubgraph` à partir de la scène + son
     s-box + tous les descendants transitifs (actions, satellites,
     media).
   - Calcule une position de collage par offset : `(scene.x + 100,
     scene.y + 100)` ou décalage similaire prévisible.
   - Appelle `pasteClipboard` à cette position.
   - Renomme le label de la scène clone : « scène X — copie »
     (ou le label original + suffix « (copie) »).
   - **Génère un nouveau `sceneId` externe** (clé pour le
     `project.json`) : par exemple `originalSceneId + "_copy_N"`
     avec N incrémenté pour éviter les collisions.
   - Retourne le nouveau `SceneNodeId` interne.

2. **Branchement** *(si un jour réactivé)* :
   - Ex. menu contextuel s-box ou bouton palette → appel de
     `duplicateSceneFull(sboxIdToSceneId(sboxId))`.
   - Sélectionner la scène clone après duplication (visualisation
     immédiate).

3. **Tests** :
   - Round-trip duplication : projet original + duplication →
     `serializeToProjectJson` valide, `sceneId` clone unique.
   - Les références internes (goto interne pointant vers une scène
     du sous-graphe original) : doivent-elles pointer vers la
     scène original ou la scène clone ? **Décision** : vers la
     **scène clone** (cohérent avec le concept de « scène
     dupliquée », comme une instance indépendante). Implémenter
     dans `pasteClipboard` un re-mapping `goto.payload.target`
     pour les scènes clonées.
   - Test : si la scène contient un goto vers elle-même → le clone
     a un goto vers son propre clone, pas vers l'original.

**Critère de fin** *(si implémentation C8.5.3 un jour)* :
- Smoke : déclenchement one-click → une scène jumelle avec son propre
  s-box, enfants clonés, edges internes intactes (goto interne vers la
  scène clone).
- Smoke : si la scène d'origine était la scène de départ, la
  scène clone n'est **pas** marquée comme départ (logique
  R3+R2 reste figée — il n'y a qu'une seule scène de départ).

#### Sous-chantier C8.6 — Rework UX selector

> Spec initiale : S1 (sous-selector premier plan), S2 (fond
> semi-transparent), S3 (accroche REQ/PWD). **S4** (drag bloqué
> selector-récompense) **écarté** à la clôture — voir étape C8.6.4.
> **Ajouts utilisateur 2026-05-XX** : auto-resize du selector +
> repositionnement du satellite auto.
>
> Découpage en étapes **C8.6.1 → C8.6.3** (S4 retirée du périmètre livré).

##### Étape C8.6.1 — Sous-selector au premier plan (S1)

> **Statut (2026-05-02) — livré** : `parentIdDepth` + tri des candidats selector dans `NodalCanvas` `onNodeDragStop` ; `zIndex` par profondeur sur les nœuds selector dans `toReactFlowNodes` ; tests `containerBounds.test.ts`.

**Symptôme (résolu)** : drop d'un nœud sur un sous-selector imbriqué
dans un selector parent → le nœud est attaché au parent au lieu
du sous-selector. Cause : la détection d'overlap dans
`onNodeDragStop` itère sans ordonner par profondeur d'imbrication.

**Directive** :

1. Dans `view/NodalCanvas.tsx` `onNodeDragStop`, dans la boucle de
   détection des candidats selector
   ([NodalCanvas.tsx:434](xflow/react/src/view/NodalCanvas.tsx#L434)),
   **trier les candidats par profondeur décroissante** (chaîne
   parentId la plus longue en premier) avant la sélection finale.

2. Helper `parentIdDepth(state, nodeId): number` —
   nombre d'ancêtres dans la chaîne parentId.

3. Modification :
   ```ts
   const selectorCandidates: Array<{ id, action, depth, overlap }> = [];
   for (const candidate of allNodes) {
     if (candidateAction.actionType !== "selector") continue;
     // ... cycle checks existants ...
     const overlap = overlapRatioByChild(childRect, parentRect);
     selectorCandidates.push({
       id: candidate.id,
       action: candidateAction,
       depth: parentIdDepth(state, candidate.id),
       overlap,
     });
   }
   // Tri : profondeur décroissante, puis overlap décroissant
   selectorCandidates.sort((a, b) =>
     b.depth - a.depth || b.overlap - a.overlap
   );
   const bestChoice = selectorCandidates.find(
     (c) => c.overlap >= ATTACH_OVERLAP_THRESHOLD
   );
   ```

4. **Z-index visuel cohérent** : ajouter une règle CSS
   `.nodal-node.action-selector { z-index: depth }` *(dynamique
   via `style={{ zIndex: depth }}` dans la projection)* pour que le
   sous-selector soit visuellement au-dessus du parent.

5. **Tests** :
   - Selector A contient sous-selector B. Drag d'une action
     `msg` sur la zone d'overlap A∩B → attaché à B.
   - Selector A seul (pas de sous-selector) → comportement
     inchangé.

**Critère de fin** :
- Smoke : structure « Selector parent contenant Selector enfant » ;
  drag d'une action `msg` sur la moitié inférieure du selector
  enfant → choix du selector enfant, pas du parent.

##### Étape C8.6.2 — Auto-resize hybride + repositionnement satellite

> **Statut (2026-05-02) — livré** : `growSelectorIfContentOverflows` / `shrinkSelectorIfLooseAfterDetach` dans `nodalProjectStore` ; projection selector sans `width`/`height` explicites via `computeContainerBounds` (exclusion **uniquement** du satellite dont `layout.parentId ===` le conteneur courant — le parent **englobe** le satellite d’un selector enfant ; l’enfant ne gonfle pas sur **son** propre satellite) ; `reconcileAutoSatellites` — pile sud + règle de repositionnement ; `attachChild` atomique (coords rel.) ; seuil d’accroche réduit pour selectors `< 200` px dans `NodalCanvas` ; tests `c862SelectorAutoResize.test.ts` + `containerBounds.test.ts`.

**Décisions design (validées)** :
- **Mode hybride** : auto-grow quand un enfant ne rentre pas,
  shrink uniquement quand un enfant est dragué hors du selector.
  Manuel via NodeResizer reste possible.
- **Satellite auto du selector** (`choice-options`) : pile sud ;
  en taille **auto**, bord bas = `computeContainerBounds` (exclut
  seulement **son** satellite direct) puis gap sud (~12px) ;
  taille **manuelle** : `layout.height` + gap. Repositions si
  `shouldRepositionSatelliteSouth` (tolérance / alignement colonne).

**Directive — auto-resize** :

1. Réutiliser `computeContainerBounds` (déjà utilisé pour s-box) sur
   les selectors : si la boîte calculée est plus grande que la
   taille manuellement définie (`layout.width / height`), promouvoir
   la boîte calculée. Exclure du périmètre uniquement les satellites
   dont `layout[satId].parentId === containerId` (**propre** chrome
   sous ce nœud) : selector **parent** inclut le satellite d’un selector
   **enfant** ; selector **enfant** n’inclut pas le sien (évite la
   boucle grow/shrink). Même règle pour **s-box** / scène.

2. Détection **shrink** : déclenché par `detachChild` (un enfant
   sort du selector). Recalculer `computeContainerBounds`.
   Si le résultat est plus petit que les `layout.width / height`
   actuels, **réinitialiser** les valeurs `width / height` du selector
   (à `null`) → la prochaine projection utilisera la taille auto.
   ```ts
   detachChild: (childId, absolutePosition) => {
     // ... logique existante ...
     if (parent && parent.actionType === "selector") {
       const newBounds = computeContainerBounds(next, parent.id);
       const layout = next.layout[parent.id];
       if (
         layout?.width != null &&
         layout?.height != null &&
         (layout.width > newBounds.width || layout.height > newBounds.height)
       ) {
         next.layout[parent.id] = {
           ...layout,
           width: undefined,
           height: undefined,
         };
       }
     }
     // ...
   }
   ```

3. Détection **grow** : déclenché par `attachChild`. Si l'enfant
   après attachement déborde de la box du selector (relative
   coords > current width/height), élargir le selector :
   ```ts
   attachChild: (parentId, childId, childRelativeLayout?) => {
     // ... `parentId` et optionnellement `x`/`y` relatifs en un seul commit ...
     if (parent.actionType === "selector") {
       const bounds = computeContainerBounds(next, parent.id);
       next.layout[parent.id] = {
         ...next.layout[parent.id],
         width: undefined,  // laisser l'auto prendre la main
         height: undefined,
       };
     }
   }
   ```

4. **Drag-to-add facilité** : abaisser le seuil
   `ATTACH_OVERLAP_THRESHOLD` pour les selectors *quand le selector
   est petit* (ex. < 200 px de largeur), à `0.05` au lieu de `0.3`.
   Permet de glisser une action sur un selector compact.
   Combiner avec C8.6.1 (sous-selector premier plan) : dans la
   boucle de détection, si la box du selector est petite ET overlap
   ≥ 0.05 → candidat. Si grande, garder 0.3.

**Directive — satellite auto repositionnement** :

1. Modifier `reconcileAutoSatellites` (ou la fonction de
   layout des satellites coords-options) :
   - À la création du satellite, calculer la position relative
     comme `{ x: SCENE_PADDING_X, y: parentHeight + SAT_GAP }`
     (sous le bord sud, hors du conteneur).
   - Stocker cette position dans `state.layout[satId]`.

2. Pour les satellites **existants** dont la position relative
   semble « obsolète » (i.e. `y < parent.height` → encore dans
   le selector), forcer un repositionnement au prochain
   `reconcileAutoSatellites` **uniquement si l'utilisateur n'a
   jamais bougé le satellite manuellement**. Détection :
   marqueur `state.layout[satId].userMoved: boolean`, set à
   `true` quand l'utilisateur drag le satellite, conservé en
   sérialisation. Si `false` → repositionner ; si `true` → laisser.

3. Alternativement (plus simple, sans nouveau champ) : recalculer
   la position du satellite à chaque résize du selector parent,
   **sauf** si la position actuelle diffère du « calcul attendu »
   par plus de `SAT_TOLERANCE_PX` (ex. 30 px) — auquel cas on
   considère que l'utilisateur l'a placé manuellement.

   Mon vote : option 3 (sans flag) pour ne pas polluer le state ;
   le flag peut être ajouté plus tard si besoin.

   Complément livré : `attachChild(parent, enfant, { x, y })` côté
   canvas évite l’état intermédiaire ; `shouldRepositionSatelliteSouth`
   resynchronise aussi quand `exp.y` est nettement **au-dessus** de
   `cur.y` (colonne sud), pour rattraper d’anciennes coords abs encore
   stockées comme relatif.

4. **Tests** :
   - Auto-grow : attacher une action à un selector petit → le
     selector grandit pour englober.
   - Auto-shrink : détacher tous les enfants d'un selector élargi
     → reset à la taille auto minimale.
   - Repositionnement satellite : agrandir le selector via
     NodeResizer → satellite se replace au bord sud.
   - Satellite déplacé manuellement → reste où il est.

**Critère de fin** :
- Smoke : ajouter 5 actions à un selector, le selector grandit à
  chaque ajout, le satellite suit le bord sud.
- Smoke : sortir 4 actions, le selector rétrécit ; satellite suit.
- Smoke : déplacer manuellement le satellite, agrandir le
  selector → satellite reste à sa position manuelle.

##### Étape C8.6.3 — Accroche REQ/PWD (S3 — piste B)

**Décisions design (validées)** : piste B — **zone d'accroche
dédiée** sur la pince REQ/PWD. Plus déterministe que la piste A
(seuil sur la surface du plus petit nœud).

**Directive** :

1. **Repérage actuel** : la pince REQ/PWD est dessinée via
   `::after` sur `.nodal-node.action.action-req` et `action-pwd`
   ([nodes.css:83-95](xflow/react/src/view/nodes/nodes.css#L83-L95))
   — pseudo-élément, donc pas une vraie zone DOM/RF.

2. **Nouveau** : créer une vraie zone d'accroche en `<div>` réelle
   dans `ActionNodeView` pour les types `req`/`pwd`, avec un
   `data-attach-zone="reward"` et une classe dédiée. Cette zone est
   un rectangle invisible (ou semi-visible) à droite du nœud, large
   de ~80 px et hauteur égale à la pince actuelle.

3. **Détection au drag** : modifier `onNodeDragStop` pour, en plus
   de la détection actuelle par `overlap` sur la box du REQ/PWD,
   **vérifier en priorité** si le drop tombe dans la zone
   `data-attach-zone="reward"` du candidat REQ/PWD. Si oui →
   attacher comme récompense, indépendamment du seuil d'overlap
   sur la box principale.

   Implementation :
   ```ts
   const dropPoint = { x: childRect.x + childRect.width / 2, y: childRect.y + childRect.height / 2 };
   const attachZones = document.querySelectorAll('[data-attach-zone="reward"]');
   for (const zone of attachZones) {
     const rect = zone.getBoundingClientRect();
     // Convertir rect screen → flow via reactFlow.screenToFlowPosition
     const flowRect = ...;
     if (pointInRect(dropPoint, flowRect)) {
       const reqPwdId = zone.closest('[data-id]').getAttribute('data-id');
       // Attacher comme récompense
       state.attachChild(reqPwdId, draggedNode.id);
       return;
     }
   }
   // Sinon, fallback sur la détection par overlap existante
   ```

4. **Style visuel de la zone** :
   ```css
   .nodal-attach-zone-reward {
     position: absolute;
     right: -88px;
     top: 14px;
     width: 80px;
     height: calc(100% - 28px);
     pointer-events: none;
     /* Visible uniquement quand un drag est en cours sur un nœud compatible */
     transition: background 120ms ease-in-out;
   }
   .nodal-attach-zone-reward.attach-zone--active {
     background: color-mix(in srgb, var(--node-action-border) 30%, transparent);
     border: 1px dashed var(--node-action-border);
   }
   ```
   Activation : sur `onNodeDragStart`, ajouter la classe
   `.attach-zone--active` aux zones REQ/PWD pertinentes (action
   draguée non-déjà-récompense, etc.).

5. **Tests** :
   - Drag d'une action sur la zone d'accroche d'un REQ → attaché
     comme récompense.
   - Drag d'une action sur le corps du REQ (pas la zone) → pas
     d'attachement (sauf overlap suffisant comme avant).
   - REQ avec récompense déjà attachée → zone d'accroche
     désactivée (pas de drop possible).

**Statut (2026-05-02)** : **livré** — `<div class="nodal-attach-zone-reward">` avec
`data-attach-zone="reward"` / `data-reward-parent-id` dans `ActionNodeView` ;
`onNodeDragStop` : priorité zone en **repère flow** — centre dans la zone **ou**
recouvrement surfacique (`overlapRatioOfZone` ≥ `REWARD_ZONE_OVERLAP_MIN`) ;
overlap de secours REQ/PWD : `max(overlap enfant, overlap « part du REQ
recouverte »)` pour les gros selectors ; `onNodeDragStart` →
`.attach-zone--active` ; tests `geometryRewardZone.test.ts`.

**Critère de fin** :
- Smoke : créer un REQ + une action `msg` à côté ; drag de la
  `msg` sur la zone visible à droite du REQ → attachement
  immédiat sans avoir à pousser la `msg` sur le corps du REQ.

##### Étape C8.6.4 — Drag bloqué selector enfant de REQ/PWD (S4) — **non réalisé / écarté**

**Motif (2026-05-02)** : après **C8.6.3** (zone d’accroche réelle + priorité au
drop + recouvrement surfacique + overlap **symétrique** REQ vs enfant), les
utilisateurs peuvent **attacher et repositionner** un selector volumineux
comme récompense sans friction. Imposer `draggable: false` sur ce selector
(S4) **n’améliore plus** l’objectif initial (éviter les ratés d’accroche) et
**dégrade** la liberté de mise en page. Le bouton **« Détacher »** reste la
voie explicite de rupture ; le sous-selector (selector dans selector) reste
hors périmètre de cette étape.

**Contenu archivé** *(ancienne directive, non implémentée)* : projection /
`ActionNodeView` avec `draggable: false` lorsque
`parentAction.rewardActionId === action.id` sur un parent `req`/`pwd` ;
tests Vitest associés ; smoke drag bloqué.

**Critère de fin** : *N/A* — étape retirée du périmètre livré.

**Smoke / recette** : la base **SMK-01 → SMK-10** (§7 / Annexe B — C7) reste
valable ; une suite **`SMK-C8-*`** dédiée n’a pas été constituée (option
future, voir **Annexe B — C8** « Reste éventuel »).


### Journal de chantier

Journal tenu au fil des sessions (décisions, pivots, correctifs). Dernière
entrée de clôture en fin de liste.

- 2026-05-02 — Cadrage initial (présent document).
- 2026-05-02 — **C8.1.a partiel** (commit `511871a` — chevron + repli +
  masquage descendants, **sans** synth-goto-out — voir étape 1.a.1 du
  Plan détaillé).
  - Décision Q1 ajustée : repliement réservé aux **selectors uniquement**.
    Pour REQ/PWD, la récompense reste visible donc replier l'en-tête
    n'apporte rien (chevron retiré pour ces types).
  - Q2 : enfants d'un selector replié (sous-selectors, choix, satellites
    auto, REQ/PWD imbriqués…) marqués `hidden: true` côté React Flow ;
    edges associées également `hidden`. Calcul transitif via
    `collectHiddenIdsFromCollapsedSelectors()`.
  - Q3 : chevron `▾` / `▸` en haut-droite de l'en-tête, branché sur
    `toggleNodeCollapsed(nodeId)`. Pas de double-clic (conflit avec
    l'ouverture des popups).
  - Q4 : tous les handles restent visibles en mode replié (Annexe D).
  - Persistance : `collapsed` déjà présent dans `serializeLayout` /
    `applyLayout` ; aucun changement nécessaire côté `map-layout.json`.
  - Compteur : `selectorChildCount` exposé via la projection (label
    « N choix masqué(s) » sous le titre quand replié).
  - `NodeResizer` désactivé en mode replié + reset des `width/height`
    appliqués via `style` pour laisser le contenu se dimensionner.
  - Tests : `selectorCollapsed.test.ts` (2 cas — projection & round-trip
    serialize/applyLayout). Suite complète : 48 passed, 1 skipped.
  - Build editor-map OK (691.77 kB / gzip 201.23 kB — pas de variation
    notable).
- 2026-05-02 — **Cadrage C8.1 réajusté** (cadrage utilisateur — voir
  « Plan détaillé C8.1 » plus haut).
  - Décisions provisoires Cursor (Q1 = selectors only, Q2 = hide tout
    descendant) **conservées** pour C8.1.a, mais **insuffisantes** :
    il manquait la représentation visuelle des goto internes vers
    l'extérieur, et le scope « scènes repliables » a été ajouté.
  - **C8.1 scindé** en deux sous-chantiers :
    - **C8.1.a** : selector replié + `synth-goto-out` (extension de
      l'existant — étape 1.a.1).
    - **C8.1.b** : scène = vrai conteneur RF + repli scène + même
      logique synth-goto-out (étapes 1.b.1 → 1.b.4).
  - Décisions clés validées avec utilisateur :
    - **A1** : nouveau handle `synth-goto-out` (id distinct,
      non-interactif, projection seulement).
    - **A2** : 1 edge synthétique par scène-cible distincte
      (dédoublonnage).
    - **A3** : style identique à une transition normale.
    - **A4** : C8.1.a partiel (commit `511871a`) conservé et complété.
    - **B1** : la scène devient **vrai conteneur RF** (parentId
      scène ajouté à la création d'un flow scene→action ; chaîne
      `choice → selector → scene` exploitée).
    - **B2** : tous les descendants transitifs cachés en repli scène.
    - **B3** : scène repliée garde `goto-in` + `meta-out` ; cache
      `flow-out` ; ajoute `synth-goto-out` conditionnel.
    - **B4** : `collapsed` scène persisté dans
      `nodalSceneLayoutByExternalId` ; géométrie cadre recalculée au
      runtime.
    - **C1** : scinder C8.1 en C8.1.a / C8.1.b.
  - Reports identifiés :
    - Cas multi-source meta (1 satellite, plusieurs `meta-in` depuis
      conteneurs différents). Modèle V2 = 1:1, donc non bloquant.
      À ajouter dans la section §7 « Reports en attente » si la
      situation se présente.
- 2026-05-02 — **C8.1.a étape 1.a.1 livrée** (`HANDLE_SYNTH_GOTO_OUT`,
  `collectSynthGotoTargets`, edges `synth-trans-*`, handle sur selector
  replié, garde-fou `connectionPolicy`, tests + build). Projection
  factorisée : `buildChildrenByParent` +
  `computeSelectorFoldProjection`. Suite Vitest : 50 passed, 1 skipped.
- 2026-05-02 — **Correctif smoke** : `NodalCanvas` ne resynchronisait les
  edges RF que sur `state.edges` — au repli (`layout.collapsed`) les
  arêtes synthétiques / `hidden` n’étaient pas recalculées. Dépendances
  étendues (`layout`, `actions`, `scenes`) + `updateNodeInternals` quand
  `collapsed` / `synthGotoTargetCount` change sur un nœud action.
- 2026-05-02 — **C8.1.b étapes 1.b.1 + 1.b.2 livrées (en local, non
  commitées)** : `migrateSceneParentIds`, mutations `connect`/`disconnect`,
  `computeContainerBounds`, classe `nodal-node--scene-frame`, projection
  qui injecte `style.width/height` sur les scènes ayant ≥ 1 descendant.
  Smoke utilisateur : **rendu cassé** — la scène grandit mais ses actions
  sont rendues **à l’extérieur** du cadre (cf. capture). Deux bugs
  identifiés (cf. **Étape 1.b.2-fix** dans le plan détaillé) :
  1. `computeContainerBounds` calcule
     `innerW = maxRight - minX` au lieu de partir de l’origine RF du
     conteneur (`(0, 0)`). Box trop étroite quand les enfants ont une
     coord relative `> 0`.
  2. Aucun re-ancrage : `migrateSceneParentIds` et `connect()` posent
     `child.x - scene.x` même si le résultat est négatif → enfants à
     coords relatives négatives, donc rendus hors du cadre.
  Plan correctif : nouvel helper `reanchorSceneContainer` idempotent +
  formule de bornes simplifiée (origine `(0, 0)`) + appels du re-ancrage
  dans migration / connect / disconnect / drag. Tests étendus.
  Référence design : exemple sub-flow React Flow
  `reactflow.dev/examples/grouping/sub-flows`.
- 2026-05-02 — **Étape 1.b.2-fix livrée** (en local). Symptômes
  initiaux résolus pour la box (formule + re-ancrage), MAIS bug
  ergonomique résiduel : la scène servant de cadre, ses handles
  (`flow-out`, `goto-in`, `meta-out`) sont rendus aux **bords du
  cadre** = bords des actions → les edges scène→action partent du
  bord droit du cadre et reviennent en arrière vers les actions.
  Lecture cassée.
- 2026-05-02 — **Pivot architectural validé** (étape **1.b.2.x**).
  Bascule vers le pattern `type: 'group'` du sub-flow React Flow
  (https://reactflow.dev/learn/layouting/sub-flows) :
  - Nouveau type de nœud **`sceneBoxNode`** (= s-box), conteneur
    visuel sans handles, sans contenu sémantique.
  - **Auto-managé** comme les satellites : créé / supprimé /
    dimensionné par le store, jamais saisi par l'utilisateur,
    jamais sérialisé dans `project.json` (uniquement layout).
  - Chaîne parentId : `s-box (top-level) → scene + actions
    top-level → sous-arbres selector/REQ`. La scène **redevient
    un nœud normal** avec ses handles à elle ; le frame est porté
    par le s-box.
  - `extent: 'parent'` posé sur la scène pour qu'elle ne sorte
    pas de son s-box.
  - Le `collapsed` bascule sur le s-box (au lieu de la scène) ;
    quand replié, les actions sont cachées mais la scène reste
    visible (avec ses handles + `synth-goto-out` agrégeant les
    goto internes).
  - Migration : ré-écriture de `migrateSceneParentIds` en
    `migrateSceneToSBoxParenting` ; les actions actuellement
    parentées `sceneId` sont reparentées vers `sboxIdFromScene
    (sceneId)`.
  - Nouveau helper `reconcileSceneBoxes(state)` (pendant de
    `reconcileAutoSatellites`).
  - Sérialisation : nouveau slot
    `nodalSceneBoxLayoutByExternalId` dans `map-layout.json`.
  - Plan détaillé complet sous **Étape 1.b.2.x** ; étapes 1.b.3
    (repli) et 1.b.4 (polish) adaptées en conséquence.
- 2026-05-XX — **Étape 1.b.2.x livrée + smoke 1.b.3 OK**. Le pivot
  s-box rend la lecture des edges scène→action correcte (handles
  sur la scène, edges courtes). Le repli du s-box masque
  correctement les actions et leurs satellites.
- 2026-05-XX — **Bug ergonomique signalé sur les nœuds media**.
  Avec le repli, les media liés à des actions cachées restent
  visibles (orphelins) — seules leurs edges meta sont cachées.
  **Décision utilisateur** : aligner les media sur les satellites
  (devenir enfants du nœud lié via `parentId`, hériter du
  `hidden:true` par la chaîne parentId transitive). Trade-off
  accepté : limite à **1 seule meta-in par media**, compensée
  ultérieurement par une option de copie / bibliothèque media
  (hors scope C8.1, équivalent de ce qui existe pour les nœuds
  `object`).
  Plan détaillé sous **Étape 1.b.5** (insérée entre 1.b.3 et
  1.b.4, exécution avant le polish final). Étape 1.b.4 ajustée
  pour ne plus traiter les media (déjà couverts par 1.b.5) et
  pour intégrer les cas media dans les SMK-C8.1-*.
  Reports identifiés :
  - Bibliothèque / copie media (équivalent du système d'objets
    pour permettre de référencer le même media depuis plusieurs
    actions) — à inscrire dans §7 « Reports en attente ».
- 2026-05-XX — **1.b.5 livrée (commit `ce874f8`), deux bugs au
  smoke** — origine = directives 1.b.5 incorrectes (ma faute) :
  - **BUG 1** : drag d'un media déclenche `disconnect` immédiat.
    Cause : critère `overlap < threshold` invalide pour les media
    qui sont positionnés *à côté* du parent (overlap nul ↔ normal),
    contrairement aux choix de selector ou aux actions sous s-box.
  - **BUG 2** : un media lié **directement** au conteneur replié
    (selector ou scène) reste visible — alors que l'utilisateur veut
    qu'il soit caché comme tout autre descendant. Cause : le tableau
    de comportement attendu que j'avais écrit en 1.b.5 conservait à
    tort « visible » dans ce cas, et Cursor a posé deux exceptions
    cohérentes (ligne `child in state.media` côté selector ; absence
    de descente dans le sous-arbre scène côté s-box).
  Plan correctif sous **Étape 1.b.5-fix** :
  - Suppression du drag-detach pour les media (détachement
    désormais réservé à la suppression explicite de l'edge meta).
  - Réécriture des deux fonctions de masquage :
    `collectHiddenIdsUnderCollapsedSelectors` (retrait de
    l'exception media) et `collectHiddenIdsUnderCollapsedSceneBoxes`
    (descente dans le sous-arbre de la scène, scène elle-même
    exclue de `hidden`).
  - Tests existants 1.b.5 inversant l'attente sur les cas « media
    direct du conteneur replié reste visible » → doit être
    `hidden:true`.
- 2026-05-XX — **1.b.5-fix livré, smoke OK**. Plus de
  drag-detach intempestif sur les media ; le repli masque
  correctement les media liés directement au s-box replié ou
  au selector replié. 1.b.4 confirmé applicable tel quel
  (le filtrage `s-box ≠ candidate parent` dans `onNodeDragStop`
  est implicitement assuré par `state.actions[candidate.id]
  === undefined` pour les s-box).
- 2026-05-XX — **Demande utilisateur : anti-collision des s-box**.
  Au dépli d'une scène, l'agrandissement du s-box peut chevaucher
  les s-box voisines. Souhaité :
  1. Au dépli, pousser les voisines pour qu'aucune ne chevauche
     (cf. https://reactflow.dev/examples/layout/node-collisions
     en mode one-shot, sans simulation continue).
  2. *(Idéal — polish)* Au repli, ramener les voisines à leur
     position d'avant-dépli, sauf si l'utilisateur les a
     déplacées manuellement entre temps.
  Plan détaillé sous **Étape 1.b.6** (insérée avant le polish
  final 1.b.4) :
  - Phase 1 : helper `resolveSBoxOverlapsAfterUnfold` + appel
    dans `toggleNodeCollapsed`. Algorithme push de min-déplacement
    avec marge `SBOX_GAP = 24 px`, max 5 itérations pour
    cascades.
  - Phase 2 (optionnelle) : mémoire runtime
    `state.sceneBoxOverlapMemory: Map<SceneBoxNodeId, Displacement[]>`
    pour rejouer en sens inverse au repli, avec garde
    « l'utilisateur n'a pas bougé la s-box manuellement »
    (epsilon = 5 px).
- 2026-05-XX — **1.b.6 livrée (commit `8c61a52`), 4 issues au smoke
  utilisateur**. Anti-collision globalement fonctionnelle mais avec
  défauts structurels :
  - **BUG 1** : la scène dépliée bouge elle-même au lieu de pousser
    ses voisines. Cause : la double boucle `for (i, j) i<j` ignore
    `_originId` (préfixe `_`) ; selon le tri alphabétique des IDs,
    l'origine peut se retrouver en position « victime ».
  - **BUG 2** : push parfois vers la gauche / le haut (s-box voisine
    poussée *avant* l'origine dans le flux), créant des edges qui
    repartent en arrière. Cause : `computeMinPushSeparation` permet
    `dx`/`dy` négatifs (direction « hors centre de l'ancre »).
  - **BUG 3** : aucun anti-collision quand l'utilisateur drag une
    s-box (vérification appelée uniquement au dépli).
  - **LIMITE 4** (acceptée, non corrigée) : la mémoire de rewind
    se base uniquement sur la trace du **dernier** dépli ; les
    drags manuels et dépliages successifs entre temps peuvent la
    rendre obsolète. Documenté comme limite connue.
  Plan correctif sous **Étape 1.b.6-fix** :
  - Réécriture de `resolveSBoxOverlaps*` en boucle origin-centrique
    (l'origine est toujours l'ancre fixe, jamais déplacée).
  - Remplacement de `computeMinPushSeparation` par
    `computeRightDownPush` (push +x / +y uniquement, axe au plus
    petit déplacement non-nul).
  - Cascade gérée par un helper `resolveCascadeOverlaps` qui prend
    la s-box la plus proche de l'origine (Manhattan) comme nouvelle
    ancre temporaire.
  - Branchement drag-collision dans `onNodeDragStop` pour les
    s-box draguées (l'utilisateur l'a déplacée → c'est elle
    l'ancre).
  - Tests unitaires renforcés (assertion explicite « origine ne
    bouge jamais »).
  Justification du **+x / +y only** : un s-box ne grandit jamais
  vers le haut ou la gauche au dépli (son point d'ancrage `(x, y)`
  est fixe, seules `width` / `height` augmentent). Donc une s-box
  *originellement* à gauche ou au-dessus de l'origine ne peut pas
  soudainement chevaucher l'origine du fait du dépli — restreindre
  le push à +x / +y est mathématiquement correct.
- 2026-05-02 — **C8.1.b étape 1.b.4 livrée** (polish s-box / meta inchangé) :
  - Tokens CSS `--sbox-*` (clair / sombre) dans `NodalCanvas.css`, consommés
    par `nodes.css` pour le cadre s-box ; état `--collapsed` plus discret
    (fond / bordure / opacité via variables).
  - s-box sans action sous-arbre : `sceneBoxActionCount` aussi sur le nœud
    `sceneBoxNode` ; classe `nodal-node-sbox--empty` + bordure pointillée
    atténuée (hors repli, pour ne pas doubler avec `--collapsed`).
  - Nœud scène : sous-titre « N action(s) masquée(s) » uniquement si
    `actionCount > 0` (évite « 0 action masquée » si état replié résiduel).
  - `onNodeDragStop` : garde explicite `candidate.type === 'sceneBoxNode'`
    en tête de boucle d’overlap (complément au filtre `live.sceneBoxes`).
  - Reports inchangés : multi-meta satellite, copie / bibliothèque media
    (cf. journal 1.b.5 et §7).
- 2026-05-02 — **C8.3 livré** — indicateur scène de départ sur la carte nodale :
  - Projection : `isStartScene` (`meta.startSceneId === scene.id`, aligné sur
    `startSceneId` JSON projet / `firstScene` côté doc).
  - UI : badge « Départ » + anneau ambre (`--node-start-*` clair/sombre) ;
    `startSceneId` invalide / absent : aucun badge (warnings existants inchangés).
  - Sync RF : dépendance `state.meta.startSceneId` sur l’effet Zustand → nodes.
- 2026-05-02 — **C8.3 complément (choix départ + réconciliation suppression)** :
  - Palette : bouton « Définir comme scène de départ » quand **une seule** scène
    est sélectionnée sur la carte ; statut si déjà départ ; hint si ≥2 scènes
    et départ non défini (`useOnSelectionChange` + `NodalMapSelectionSync`).
  - Store : `setStartScene` ignoré si l’id n’existe pas ; après `removeNode`,
    réalignement **R3** (1 scène restante → elle devient départ) + **R2**
    (≥2 scènes et départ supprimé / invalide → `startSceneId` null).
  - Warning `START_SCENE_UNSET` si ≥2 scènes et pas de départ valide.
- 2026-05-XX — **Bug structurel signalé sur C8.3** : changer
  `meta.startSceneId` dans la nodal n'a aucun effet sur la scène
  effectivement utilisée par le jeu généré. Diagnostic : double
  rupture dans la chaîne nodal → DOM → JSON → generateGame.
  - **Côté flush nodal-to-DOM** : `sortedScenes` dans
    [editor-shared-nodal-to-dom.js](js/editor-shared-nodal-to-dom.js)
    trie par `layout.x` sans tenir compte de `meta.startSceneId`.
  - **Côté `generateGame`** : la fonction utilise
    `project.scenes[index === 0]` comme `firstSceneId` ; elle ne
    lit jamais `project.startSceneId` (champ d'ailleurs absent
    de l'objet retourné par `getCurrentProjectData`, qui est lui
    DOM-only).
  Plan correctif sous **Étape C8.3.x** :
  - **(A)** Tri du flush nodal-to-DOM placé `meta.startSceneId`
    en tête, fallback sur `layout.x`.
  - Flush immédiat sur changement de `startSceneId` (subscribe au
    store) pour ne pas attendre l'intervalle 8 s.
  - **(B)** `generateGame` lit `project.startSceneId` (avec
    fallback sur `scenes[0]`) — defense-in-depth.
  - `getCurrentProjectData` alimente `project.startSceneId`
    depuis le store nodal global (résolution `meta.startSceneId`
    interne → `sceneEntry.sceneId` externe).
  - Hors scope : indicateur visuel et action « définir départ »
    dans le formulaire vanilla — reportés.
- 2026-05-02 — **C8.3.x livré** (correctif chaîne nodal → DOM →
  `getCurrentProjectData` → `generateGame`) :
  - [editor-shared-nodal-to-dom.js](js/editor-shared-nodal-to-dom.js) :
    `sortedScenes` place `meta.startSceneId` en tête puis tri par `layout.x` ;
    id interne absent du store → ignoré (tri par x) ; export test
    `_sortedScenesForTests`.
  - [editor-nodal-map-bootstrap.js](js/editor-nodal-map-bootstrap.js) :
    abonnement Zustand sur `meta.startSceneId` → flush DOM immédiat
    (`flushNodalProjectionToDomInner`, sans repasser par l’intervalle 8 s) ;
    réabonnement si le store est recréé.
  - [editor-shared-project-serialization.js](js/editor-shared-project-serialization.js) :
    `project.startSceneId` = id **externe** (`scene.sceneId`) résolu depuis
    le store nodal.
  - [js/editeur-generate.js](js/editeur-generate.js) +
    [js/editor-en-generate.js](js/editor-en-generate.js) : `firstSceneId` /
    `initialSceneId` = `project.startSceneId` si présent dans la liste des
    scènes, sinon première scène (ordre DOM / tableau).
- 2026-05-02 — **C8.4.1 livré** — recherche nœud (palette + Ctrl+F) :
  - Helper [searchNodes.ts](xflow/react/src/view/palette/searchNodes.ts) +
    [NodalSearchField.tsx](xflow/react/src/view/palette/NodalSearchField.tsx)
    en tête de palette ; compteur k/N, ◀ ▶, Entrée / Maj+Entrée ;
    `fitView` + sélection nœud cible.
  - [isEditingContext.ts](xflow/react/src/view/keyboard/isEditingContext.ts) ;
    **Ctrl+F** / **Cmd+F** branché via [useNodalKeyboard.ts](xflow/react/src/view/keyboard/useNodalKeyboard.ts)
    (C8.2.1, désactivé si popup ou contexte édition).
  - Tests : `searchNodes.test.ts`.
- 2026-05-02 — **C8.2.2 livré** — confirmations suppression (scène avec actions, selector avec choix,
  chaîne REQ / PWD avec nœuds imbriqués `layout`) :
  - [describeNodeForDeletion.ts](xflow/react/src/view/deletion/describeNodeForDeletion.ts) :
    `describeNodeForDeletion`, `normalizeDeletionTarget`, `orderedDeleteChainForStoreNode`,
    `flattenDeleteChains`, `topoDeleteOrder` ; choix selector = **actions** enfants directes ;
    chaîne REQ·PWD = descendants `layout` (actions / médias / satellites).
  - [DeleteConfirmDialog.tsx](xflow/react/src/view/popups/DeleteConfirmDialog.tsx) : focus **Annuler**,
    **Échap** / **Entrée** ; styles `NodalCanvas.css`.
  - [NodalCanvas.tsx](xflow/react/src/view/NodalCanvas.tsx) : **`onBeforeDelete`** (API RF v12 — le hook
    `onNodesChange` seul ne suffit pas) ; dialogue async + `resolve(false)` après suppression store ;
    lot RF inchangé si pas de confirmation ; `onNodesDelete` : un `removeNode` par nœud RF supprimé,
    satellites ignorés.
  - Tests : `describeNodeForDeletion.test.ts` (REQ + récompense orpheline, chaîne REQ + `orderedDeleteChain`).
- 2026-05-02 — **C8.2.3 livré** + **retrait touche `D`** — popup **Raccourcis**
  (`KeyboardShortcutsPopup` + CSS), bouton palette + `?` (`openShortcutsHelp`),
  `keyboardShortcutsOpen` dans `NodalUiContext` ; fermeture auto si autre modale ;
  suppression `duplicateSelection` ; tests `nodalKeyboard.test.ts`.
- 2026-05-04 — **C8.5.1 affinage menu** — retrait entrée s-box « Dupliquer la scène complète »
  (`nodalContextMenuModel.ts`) ; test s-box `toggle-fold` seul.
- 2026-05-02 — **C8.5.1** — double-clic édition + menu contextuel :
  - Vues : [ActionNodeView.tsx](xflow/react/src/view/nodes/ActionNodeView.tsx),
    [SceneNodeView.tsx](xflow/react/src/view/nodes/SceneNodeView.tsx),
    [MediaNodeView.tsx](xflow/react/src/view/nodes/MediaNodeView.tsx),
    [SatelliteNodeView.tsx](xflow/react/src/view/nodes/SatelliteNodeView.tsx) ;
  - [NodalContextMenu.tsx](xflow/react/src/view/contextMenu/NodalContextMenu.tsx) +
    [nodalContextMenuModel.ts](xflow/react/src/view/contextMenu/nodalContextMenuModel.ts) +
    [NodalContextMenu.css](xflow/react/src/view/contextMenu/NodalContextMenu.css) ;
  - [clipboard.ts](xflow/react/src/store/clipboard.ts) (presse-papiers runtime C8.5.2) ;
  - [NodalCanvas.tsx](xflow/react/src/view/NodalCanvas.tsx) : `onNodeContextMenu` / `onPaneContextMenu`,
    actions **Ouvrir** / **Supprimer** / **Définir départ** / **Replier** / **Aller au parent** ;
    **Copier** / **Coller** : **C8.5.2** ; **C8.5.3** (dupliquer scène one-click) **non poursuivie** (copier-coller du pod scène).
  - Tests : `nodalContextMenuModel.test.ts`.
- 2026-05-02 — **C8.6.3 livré** — zone d’accroche REQ/PWD (piste B), ajustement gros selectors :
  - [ActionNodeView.tsx](xflow/react/src/view/nodes/ActionNodeView.tsx) + [nodes.css](xflow/react/src/view/nodes/nodes.css) ;
  - [geometry.ts](xflow/react/src/view/nesting/geometry.ts) (`domRectToFlowBounds`, `flowPointInRect`, `overlapRatioOfZone`) ;
  - [constants.ts](xflow/react/src/view/nesting/constants.ts) : `REWARD_ZONE_OVERLAP_MIN` ;
  - [NodalCanvas.tsx](xflow/react/src/view/NodalCanvas.tsx) : zone par recouvrement + overlap REQ symétrique ;
  - Tests : [geometryRewardZone.test.ts](xflow/react/src/__tests__/geometryRewardZone.test.ts).
- 2026-05-02 — **C8.6.2 livré** — auto-resize selector + satellite sous bord sud + accroche petit selector :
  - [nodalProjectStore.ts](xflow/react/src/store/nodalProjectStore.ts) : grow/shrink après `attachChild` / `detachChild` ;
  - [nodalReactFlowProjection.ts](xflow/react/src/view/nodalReactFlowProjection.ts) : taille auto selector si pas de dimensions ;
  - [reconcileAutoSatellites.ts](xflow/react/src/store/reconcileAutoSatellites.ts) : layout satellites sous selector ;
  - [NodalCanvas.tsx](xflow/react/src/view/NodalCanvas.tsx) + [constants.ts](xflow/react/src/view/nesting/constants.ts) : seuil overlap 0,05 si largeur `< 200` px ;
  - Tests : [c862SelectorAutoResize.test.ts](xflow/react/src/__tests__/c862SelectorAutoResize.test.ts).
- 2026-05-02 — **C8.6.1 livré** — sous-selector au premier plan (S1) :
  - [containerBounds.ts](xflow/react/src/view/nesting/containerBounds.ts) : `parentIdDepth` ;
  - [NodalCanvas.tsx](xflow/react/src/view/NodalCanvas.tsx) : tri profondeur ↓ puis overlap ↓ avant choix REQ/PWD vs selector ;
  - [nodalReactFlowProjection.ts](xflow/react/src/view/nodalReactFlowProjection.ts) : `style.zIndex` sur les selectors ;
  - Tests : `containerBounds.test.ts` (profondeur + z-index RF).
- 2026-05-02 — **C8.5.2 livré** — presse-papiers nodal + **C8.5.3 écartée** (doublon : copier une scène embarque le pod complet) :
  - [clipboard.ts](xflow/react/src/store/clipboard.ts), [nodalProjectStore.ts](xflow/react/src/store/nodalProjectStore.ts) (`copyNodesToClipboard`, `pasteClipboardAt`) ; suppression du stub `nodalClipboard.ts` ;
  - [NodalCanvas.tsx](xflow/react/src/view/NodalCanvas.tsx) : `Ctrl/Cmd+C`·`V`, `onSelectionContextMenu` (rectangle Maj+drag), menu fond de carte avec sélection (copier / supprimer sélection, coller) ;
  - [useNodalKeyboard.ts](xflow/react/src/view/keyboard/useNodalKeyboard.ts), [nodalContextMenuModel.ts](xflow/react/src/view/contextMenu/nodalContextMenuModel.ts), [NodalContextMenu.tsx](xflow/react/src/view/contextMenu/NodalContextMenu.tsx) ;
  - Tests : `clipboard.test.ts`, mises à jour `nodalContextMenuModel.test.ts`, `nodalKeyboard.test.ts`.
- 2026-05-02 — **C8.2.1 livré** — infrastructure raccourcis + **Échap** (+ **`D`**
  stub ensuite **retiré** le même jour — voir entrée **C8.2.3 livré**) :
  - [useNodalKeyboard.ts](xflow/react/src/view/keyboard/useNodalKeyboard.ts) :
    `nodalKeyboardHandleKeyDown` + hook ; **Échap** = désélection nœuds/arêtes RF
    (hors popup) ; **Ctrl/Cmd+F** = focus champ recherche (cf. C8.4.1).
  - [NodalCanvas.tsx](xflow/react/src/view/NodalCanvas.tsx) : `deselectAllRf` ;
    un seul listener `window` « keydown ».
  - DevDependency **jsdom** + tests **`@vitest-environment jsdom`** :
    `src/__tests__/keyboard/isEditingContext.test.ts`,
    `src/__tests__/keyboard/nodalKeyboard.test.ts`.
- 2026-05-XX — **Cadrage C8.4 / C8.2 / C8.5 / C8.6 — réponses utilisateur**.
  Décisions clés pour la suite des chantiers C8 :
  - **C8.4** (recherche de nœud) : palette latérale + champ Ctrl+F + champs
    recherchés (label scène/sceneId, label action, titre selector, displayName
    objet → satellites object correspondants). Plan **C8.4.1** rédigé.
  - **C8.2** (raccourcis) :
    - ~~`D` seul pour Dupliquer~~ — **abrogé** le 2026-05-02 (copier-coller suffit).
    - `Ctrl+C` / `Ctrl+V` restent (lié à C8.5).
    - `Échap` ferme la popup ou désélectionne si pas de popup.
    - Confirmations de suppression : scène/selector non-vides
      (avec contenu) → confirm ; vides → silencieux. REQ/PWD →
      silencieux, enfants orphelins. Autres → silencieux.
    - Centre d'aide : bouton « Raccourcis » dans la palette (en bas) +
      raccourci `?` + popup listant tout.
    - Undo/Redo (`Ctrl+Z/Y`) : **hors scope C8**, pendant à reporter
      dans §7. Note d'implémentation : `zundo` (middleware Zustand) est
      la piste propre, à explorer après C8 avec un spike sur le coût
      mémoire des snapshots (interaction avec `reconcileAutoSatellites`
      à valider).
    - Plan **C8.2.1 → C8.2.3** rédigé.
  - **C8.5** (copier/coller) :
    - Comportements clic réorganisés : clic = sélection seulement,
      double-clic = ouvre la popup, clic-droit = menu contextuel.
    - Menu contextuel par type de nœud (cf. tableau dans 1.b.5.1).
    - Pour s-box, option dédiée « Dupliquer la scène complète » qui
      clone la scène + son contenu + remappe les `goto` internes vers
      la scène clone.
    - Convention paste-position : à la souris (Ctrl+V) ou à l'endroit
      du clic-droit (« Coller »). Aligné sur n8n / Fusion / ComfyUI /
      Blender Geometry Nodes.
    - **Pas de « Dupliquer » avec offset** sur nœuds simples — supprimé
      au profit de Copy/Paste prévisible. (`D` clavier = duplication
      implicite via `buildClipboard` + `pasteClipboard` à la position
      souris.)
    - Multi-sélection : « Copier (ce nœud) » et « Copier la sélection »
      offerts simultanément dans le menu contextuel.
    - `objectId` préservé tels quels lors du paste (références, pas
      duplications). `meta.objects` jamais touché par paste.
    - `goto.payload.target` : préservé (pointe vers la scène externe
      d'origine — sauf cas duplication scène complète où on remappe
      vers la scène clone).
    - Plan **C8.5.1 → C8.5.3** rédigé ; **C8.5.3** ensuite **écartée** (doublon avec C8.5.2).
  - **C8.6** (rework selector) :
    - **Auto-resize hybride** : auto-grow à l'attachement, shrink
      uniquement au détachement (sortie d'un enfant via drag).
    - **Repositionnement satellite auto** : suit le bord sud du
      selector, sauf si l'utilisateur l'a déplacé manuellement
      (détection via tolérance position vs valeur attendue).
    - **S3 piste B** confirmée : zone d'accroche dédiée et visible
      sur la pince REQ/PWD (overlay DOM réel, pas seulement
      pseudo-élément).
    - **S1** : tri par profondeur dans la détection d'overlap pour
      que les sous-selectors aient priorité.
    - **S4** : *(voir clôture ci-dessous — étape écartée.)*
    - Plan **C8.6.1 → C8.6.3** rédigé et livré ; **C8.6.4** retiré du
      périmètre livré.
  - Reports identifiés dans §7 :
    - Undo/Redo (zundo).
    - Indicateur visuel scène de départ dans le formulaire vanilla
      (cf. C8.3.x hors scope).
    - Bibliothèque / copie media partagée entre actions (cf. 1.b.5).
- 2026-05-02 — **C8.6.4 / S4 écarté** — pas de `draggable: false` sur le
  selector-récompense REQ/PWD : l’accroche **C8.6.3** (zone + recouvrement +
  overlap symétrique) satisfait l’objectif UX ; S4 documenté comme **non
  réalisé** (étape C8.6.4 + §7 C8 + Annexe B — C8).
- 2026-05-02 — **Annexe D clôturée** — chantier C8 UX nodal considéré clos
  pour le périmètre livré ; **synthèse** ajoutée en **Annexe B — C8** ;
  Annexe D conservée comme **archive** (journal + plans détaillés).
  **Reste éventuel** hors clôture : suite smoke **`SMK-C8-*`** optionnelle.
