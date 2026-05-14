# Chantier C18 — Aperçu de scène 360° + placement coords hotspots

**Branche** : `feat/c18-360-preview-and-picker`  
**Date d'ouverture** : 2026-05-08.  
**Date de clôture** : 2026-05-14.  
**Version de clôture (spec nodale)** : 1.10.

---

## Annexe D — Chantier C18 (en cours)

> **Vivante** (§8.4) — journal de décisions, plans détaillés, traces
> de bugs et fixes. Sera synthétisée dans **Annexe B — C18** à la
> clôture du chantier puis archivée sous `docs/archives/chantier_18.md`.

**Date d'ouverture** : 2026-05-08.
**Branche** : `feat/c18-360-preview-and-picker` (depuis `feat/nodal-map`).
**Statut** : cadrage validé en phase questions (Q-C18-1 à Q-C18-12,
2026-05-08). Plans détaillés **C18.1** et **C18.2** rédigés en one-shot
dans cette Annexe D — prêts à être livrés à Cursor sous-chantier par
sous-chantier.

### Scope figé

Synthèse des décisions issues de la phase questions (Claude ↔ user,
2026-05-08) :

- **Périmètre C18 = 2 sous-chantiers** : aperçu scène 360° read-only
  (C18.1) + modale picker éditable (C18.2). L'item C18.3 initialement
  noté optionnel en §7 (drag direct du hotspot dans le viewer) est
  **retiré du périmètre C18** et reporté en chantier séparé après C18,
  avec extension de scope : drag + **resize via encarts** (largeur /
  hauteur du hotspot manipulables visuellement dans le viewer). Numéro
  non figé pour l'instant (ne créer C22+ que quand le user décidera de
  l'attaquer).
- **Réécriture TS pure** côté React (`xflow/react/src/view/preview/`).
  Pas d'appel au module legacy `js/editor-shared-preview-picker.js` qui
  est couplé au DOM legacy (`#scene_X .sc-img`, `.hs-pitch`, etc.). Le
  legacy reste en place tant que la vue de vérification (C10.4) existe.
- **Pannellum 2.5.7** déjà chargé via CDN dans `editeur.html` /
  `editor_en.html` (lignes 8-9, balises `<link>` + `<script>`).
  `window.pannellum` disponible globalement — pas de dépendance npm
  à ajouter.
- **Composant React mutualisé** `<NodalPanoramaViewer>` réutilisé en
  mode `preview` (C18.1) et `picker` (C18.2). Encapsule le cycle
  `pannellum.viewer(...)` ↔ `destroy()`, expose les hotspots et un
  callback `onPick(pitch, yaw)` en mode picker.
- **Source URL panorama** : `scene.panoramaUrl` (string sur `SceneNode`
  dans `xflow/react/src/model/nodes.ts:52-58`). Normalisation legacy à
  conserver (`./` préfixé si l'URL ne commence ni par `http` ni par
  `data:` ni par `blob:` — voir `js/editor-shared-preview-picker.js:25-31`).
- **Modale plein écran** dans les deux sous-chantiers (Q-C18-2 a) — choix
  pragmatique pour itérer vite, cohérent avec le legacy
  (`#scene-preview-modal`, `#picker-modal`). Pannellum a besoin de
  surface utile.
- **Idée future à ne pas oublier** : à terme, un **nœud aperçu
  intégrable au canvas** (taille du nœud, agrandissable / réductible,
  préchargement en mini format) serait l'UX cible — réservé à un
  chantier ultérieur compte tenu du risque perf navigateur (charger N
  panoramas + positions à la fois). À évoquer en clôture C18 si jugé
  pertinent.
- **Clic-pour-positionner via `mouseEventToCoords`** (Q-C18-4 b) —
  Pannellum expose nativement la conversion event → pitch/yaw. Plus
  intuitif que le viseur croix legacy. **Variante viseur croix
  conservée commentée / non active** dans le composant comme fallback,
  pour pouvoir réactiver rapidement si l'usage révèle un besoin.
- **Hotspots en background dans le picker** (Q-C18-5 a) : tous les
  hotspots de la scène sont affichés en gris dashed pour donner du
  contexte spatial pendant le placement, sauf le hotspot en cours
  d'édition qui apparaît en rouge (cohérent legacy `previewScene`).
  Règle un manque connu du picker legacy (aucune visibilité des
  voisins).
- **Open initial du picker** centré sur le pitch / yaw actuel du
  satellite (Q-C18-6 a) — UX : moins de rotation à faire pour ajuster
  à partir d'une position déjà saisie.
- **Sortie du picker** (Q-C18-7 a) : Valider commit pitch + yaw
  uniquement (le reste du satellite — `visibility`, `appearance`,
  `customCss` — reste intact). Échap = Annuler ; Enter = Valider.
- **Scène sans `panoramaUrl`** (Q-C18-8 a) : la modale s'ouvre quand
  même avec un message d'erreur explicite « Image 360 manquante —
  renseigner panoramaUrl » et un bouton Fermer. Donne le feedback
  dans le bon contexte.
- **Tests Vitest** (Q-C18-12) : périmètre figé — (i) entrée menu
  contextuel s-box présente quand C18.1 monté ; (ii) état UI
  `scenePreviewSceneId` / `coordsPickerSatelliteId` mis à jour ;
  (iii) callback simulé `onPick(p, y)` → écriture store via
  `updateNodeData` (vérifié `store.getState()`) ; (iv) résolution
  satellite → action parente → scène pour récupérer `panoramaUrl`.
  **Pannellum mocké** (`vi.mock('pannellum')`) — pas de test du rendu
  3D réel, validation manuelle via smoke FR/EN.

### Stratégie de découpage

| # | Périmètre | Dépend de | Type | Statut |
|---|-----------|-----------|------|--------|
| **C18.1** | Aperçu scène 360° read-only (modale plein écran) ouvert depuis menu contextuel s-box ; composant partagé `<NodalPanoramaViewer>` en mode `preview` ; hotspots existants visibles en outline rouge dashed avec label tronqué | — | code | livré (2026-05-08) |
| **C18.2** | Modale picker (modale plein écran) ouverte depuis bouton ajouté à `CoordsOptionsPopup` ; viseur central `pointer-events:none` + poll `getPitch`/`getYaw` 120 ms ; hotspots autres en gris dashed pour contexte ; Valider/Annuler/Échap/Enter ; commit pitch + yaw via `updateNodeData` sur le satellite | C18.1 (réutilise `<NodalPanoramaViewer>`) | code | livré (2026-05-08) — 2 fixes (viseur central + initialPitch via ref) |
| **C18.3** | Drag direct des hotspots dans l'aperçu scène : toggle « Éditer les hotspots » dans le header ; en mode édition, `pointerdown` sur hotspot → drag local avec overlay fantôme CSS ; `NodalPanoramaViewer` étendu en `forwardRef` exposant `mouseEventToCoords` ; auto-save pitch/yaw au release ; Échap annule | C18.1, C18.2 | code | livré (2026-05-08) |
| **C18.4** | Resize des hotspots dans l'aperçu via **handles aux 4 coins** (façon logiciel de dessin) ; sélection au clic simple en mode édition ; resize ancré au centre (pitch/yaw fixes) ; Shift = ratio fixe ; bornes 16-800 px ; bordure dashed rouge décalée (`outline-offset` ~6 px) pour rester visible sur hotspot transparent | C18.3 | code | livré (2026-05-08) |
| **C18.5** | Aperçu interactif « comme en jeu » en mode read-only : clic sur hotspot → popup joueur preview (msg / pick / goto / req / pwd / selector multi-niveau) via overlay React `<PlayerPreviewOverlay>` (option (a-i) revisitée — réutilisation `PlayerPopupPreview` étendu avec prop `interactive`, voir amendement plan en tête section C18.5) ; affichage seul + bouton fermer ; pas de simulation d'inventaire ni de visibility-rules | C18.3 | code | **C18.5.1 + C18.5.2 + C18.5.3 livrés** (2026-05-11) ; chantier C18.5 clôturé |

Convention : un commit par sous-chantier ; fixes numérotés
`C18.x.y-fix` si correctifs en cours de chantier (cf. §8.2 + §2.2 du
briefing CLAUDE.md). Les sous-chantiers C18.4 et C18.5 sont
indépendants (tous deux dérivent de C18.3) — ordre d'exécution libre,
mais en pratique C18.4 d'abord (plus simple, plus prioritaire UX).

> **Note transverse repérée pendant le cadrage C18.4** (2026-05-08) :
> les dimensions `appearance.ui_w` / `ui_h` sont en **pixels CSS bruts**
> dans le legacy (`js/editor-shared-ui-utils.js:74-83`) comme dans la
> couche React (`xflow/react/src/model/hotspotAppearance.ts:47-66`).
> Sur écran différent, un même hotspot **ne couvre pas la même
> proportion** de l'image panoramique → bug d'architecture présent
> dans tout le projet. C18.4 livre sur la sémantique pixels actuelle
> (cohérent legacy) ; un nouveau chantier **C22 — Hotspots
> responsives** est ajouté au backlog §7 pour traiter le scaling
> proportionnel (`ui_w_pct` / `ui_h_pct` ou bump schemaVersion 3 + format de
> stockage proportionnel). C18.4 et C18.5 ne sont pas bloqués par C22.

### Décisions de design

- **Composant `<NodalPanoramaViewer>`** (nouveau,
  `xflow/react/src/view/preview/NodalPanoramaViewer.tsx`) — props :
  `{ panoramaUrl: string; mode: "preview" | "picker"; hotSpots?:
  PannellumHotSpotProjection[]; initialPitch?: number; initialYaw?:
  number; onPick?: (pitch: number, yaw: number) => void; onReady?:
  () => void }`. Init Pannellum au mount (`useEffect`), destroy au
  unmount. En mode `picker`, attache un `click` listener sur le
  container Pannellum qui appelle `viewer.mouseEventToCoords(event)`
  → `onPick(pitch, yaw)`. Variante viseur croix : composant interne
  `<PickerCrosshairOverlay>` exporté mais **non monté par défaut**
  (commentaire `// Q-C18-4 fallback — réactiver si UX clic-position
  jugée insuffisante`).
- **Normalisation URL panorama** : helper
  `normalizePanoramaUrl(url)` extrait dans
  `xflow/react/src/view/preview/panoramaUrl.ts`. Logique : si la
  chaîne ne commence ni par `http` / `data:` / `blob:` → préfixer
  `./`. Aligné `js/editor-shared-preview-picker.js:25-31`.
- **Projection des hotspots de scène vers Pannellum** : helper
  `collectSceneHotspotProjections(state, sceneId, options)` dans
  `xflow/react/src/view/preview/sceneHotspotProjections.ts` — parcourt
  les actions État 2 dont `flow-in` cible la scène, lit le satellite
  `coords-options` associé pour pitch / yaw / `customCss` (ou dérive
  de `appearance` si `customCss` vide), et produit le tableau
  d'hotspots Pannellum avec `{ pitch, yaw, cssClass }`. Les classes
  CSS sont injectées dynamiquement dans un `<style id="nodal-...">`
  monté par la modale ; cleanup au démontage.
- **Style hotspots overlay** : pour C18.1 (mode `preview`) — outline
  rouge dashed + label noir post-`::after` (cohérent legacy
  `previewScene`). Pour C18.2 (mode `picker`) — hotspots autres en
  outline **gris** dashed (faible opacité, label optionnel) ; le
  hotspot en cours d'édition n'est **pas** affiché dans la liste
  Pannellum (sa position est en cours de modification).
- **Contexte UI** (`xflow/react/src/view/nodalUiContext.tsx`) — deux
  nouveaux champs :
  ```ts
  scenePreviewSceneId: SceneNodeId | null;
  setScenePreviewSceneId: (id: SceneNodeId | null) => void;
  coordsPickerSatelliteId: SatelliteNodeId | null;
  setCoordsPickerSatelliteId: (id: SatelliteNodeId | null) => void;
  ```
  Ajouter aussi des helpers `openScenePreview(sceneId)` et
  `openCoordsPicker(satId)` qui réinitialisent les autres popups
  (cohérent `openMsgContentEditor` etc.).
- **Menu contextuel s-box** (`xflow/react/src/view/contextMenu/
  nodalContextMenuModel.ts`) — nouvelle action `preview-scene-360`
  ajoutée dans le type `NodalContextMenuAction`. Branche
  `targetId in snap.sceneBoxes` (lignes 89-96) : pousser entrée
  `{ action: "preview-scene-360", label: t.previewScene360 }`
  avant `toggle-fold`. Labels : `"Tester la scène 360°"` (FR) /
  `"Preview scene 360°"` (EN).
- **Bouton picker dans `CoordsOptionsPopup`**
  (`xflow/react/src/view/popups/CoordsOptionsPopup.tsx`) — ajout d'un
  bouton « 📍 Placer sur l'image » sous les inputs pitch / yaw, dans
  une nouvelle row `nodal-coords-pick-row` (à créer dans
  `NodalCanvas.css`). Au clic : appel `openCoordsPicker(satellite.id)`
  via `useNodalUi()`. La modale picker est montée au niveau de
  `NodalCanvas` (pas dans `CoordsOptionsPopup`), cohérent avec
  `HotspotAppearancePopup` qui sort par-dessus.
- **Résolution satellite → scène** dans `<CoordsPickerModal>` :
  satellite `coords-options` → action parente (cherchée dans
  `snap.actions` par parcours des satellites attachés) → scène
  parente (lue via `flow-in` edge ou `parentId` s-box). Helper
  centralisé dans `xflow/react/src/store/findSceneOfHotspotSatellite.ts`
  pour réutilisation.
- **Cycle Pannellum** : `viewer.destroy()` impératif au close de la
  modale (sinon fuite WebGL + listeners). Encapsulé dans le
  `useEffect` cleanup de `<NodalPanoramaViewer>`.
- **Z-index** : modales C18.x au-dessus des popups d'action (msg /
  selector / etc.) ET au-dessus de `HotspotAppearancePopup`. Variable
  CSS `--nodal-z-fullscreen-modal` à définir dans `NodalCanvas.css`
  (suggestion : `2000`, vs popups standard à `1000`).
- **Fermeture clavier Échap** : intégrer le handler dans les modales
  C18 sans passer par `isEditingContext` (C8.2.1) puisque le viewer
  ne contient pas d'input texte. Listener local `useEffect` sur
  `document.addEventListener("keydown", ...)`, cleanup au unmount.

### Plan détaillé C18.1 — directives pour Cursor

**Pré-requis** : C18 cadrage validé (Annexe D ouverte). Aucune
dépendance code (point d'entrée du chantier).

**Contexte** : porter dans la couche React le comportement legacy
`previewScene` (`js/editor-shared-preview-picker.js:99-145`). Une
nouvelle entrée « 👁 Tester la scène 360° » apparaît dans le menu
contextuel d'un s-box. Au clic, une modale plein écran s'ouvre avec
Pannellum chargé sur le panorama de la scène ; les hotspots existants
de la scène sont affichés en outline rouge dashed avec leur label
tronqué (cohérent legacy). Fermeture via bouton « Fermer », croix, ou
Échap. Read-only — aucune édition.

**Fichiers à lire avant de coder** :

- `js/editor-shared-preview-picker.js:99-145` — référence
  comportementale (`previewScene`, génération CSS hotspots,
  `closeScenePreview`, cycle `pannellum.viewer` / `destroy`).
- `editeur.html` lignes 434-441 — markup historique
  `#scene-preview-modal` (template visuel pour la modale React).
- `xflow/react/src/view/contextMenu/nodalContextMenuModel.ts`
  (lignes 5-15 type `NodalContextMenuAction` ; lignes 89-96 branche
  s-box) — point d'extension menu contextuel.
- `xflow/react/src/view/contextMenu/NodalContextMenu.tsx` — handler
  des actions menu (à étendre pour `preview-scene-360`).
- `xflow/react/src/view/NodalCanvas.tsx` — montage des popups +
  provider `NodalUiContext` + ajout de la modale
  `<ScenePreviewModal>`.
- `xflow/react/src/view/nodalUiContext.tsx` — pattern d'état popup
  global (`coordsEditorSatelliteId` etc.).
- `xflow/react/src/view/popups/PublishGamePopup.tsx` — popup plein
  écran existante (réf style et structure DOM pour `nodal-popup-*`).
- `xflow/react/src/store/reconcileSceneBoxes.ts` (`sboxIdFromScene`
  + réciproque) — résoudre `sceneId` à partir du `sceneBoxId` ciblé
  par le menu contextuel.
- `xflow/react/src/model/nodes.ts:52-58` — type `SceneNode` avec
  `panoramaUrl`.
- Spec §3.4 (satellite `coords-options`) — pour comprendre la lecture
  pitch/yaw/customCss côté projection hotspots.

**Phase questions (workflow §8.1)** — *réalisé en pré-rédaction
Annexe D (Q-C18-1 à Q-C18-12)*. Questions résiduelles éventuelles
à poser par Cursor avant de coder :

- **Q-C18.1-1** — Helper `collectSceneHotspotProjections` : extraire
  dans un fichier dédié (`view/preview/sceneHotspotProjections.ts`)
  ou inliner dans `<ScenePreviewModal>` ? *Vote : fichier dédié,
  réutilisé en C18.2 pour l'affichage gris dashed des hotspots
  voisins.*
- **Q-C18.1-2** — Strategy d'injection CSS hotspots : `<style>` monté
  par la modale et démonté au close, ou className unique injectée
  dans `nodes.css` ? *Vote : `<style>` dynamique pour éviter la
  pollution CSS globale et permettre une projection à la volée.*
- **Q-C18.1-3** — Comportement si la scène n'a pas de hotspots du
  tout : modale ouverte avec viewer seul (pas de hotspots affichés),
  ou message « Aucun hotspot dans cette scène » ? *Vote : viewer
  seul (pas de message — la modale a un titre clair, l'utilisateur
  comprend).*

**Périmètre** :

- **Composant `<NodalPanoramaViewer>`** (nouveau,
  `xflow/react/src/view/preview/NodalPanoramaViewer.tsx`) :
  - Props : `{ panoramaUrl: string; mode: "preview" | "picker";
    hotSpots?: PannellumHotSpotProjection[]; initialPitch?: number;
    initialYaw?: number; onPick?: (pitch: number, yaw: number) =>
    void; onReady?: () => void }`.
  - Mount : ref `<div>` → `pannellum.viewer(divId, { type:
    "equirectangular", panorama: normalizePanoramaUrl(url), autoLoad:
    true, hotSpots, pitch: initialPitch, yaw: initialYaw,
    showControls: false })`.
  - Unmount : `viewer.destroy()`.
  - Mode `picker` (préparé pour C18.2 ; `onPick` non utilisé en
    C18.1) : listener `click` sur le container ; appelle
    `viewer.mouseEventToCoords(event)` → `onPick(pitch, yaw)`.
  - Variante viseur croix : composant **`<PickerCrosshairOverlay>`**
    exporté du même fichier mais **non monté par défaut** (commenté
    avec `// Q-C18-4 fallback — réactiver si UX clic-position jugée
    insuffisante`).
- **Helper `normalizePanoramaUrl`** (nouveau,
  `xflow/react/src/view/preview/panoramaUrl.ts`) : reproduire la
  logique legacy lignes 25-31 de `editor-shared-preview-picker.js`.
- **Helper `collectSceneHotspotProjections`** (nouveau,
  `xflow/react/src/view/preview/sceneHotspotProjections.ts`) :
  signature `collectSceneHotspotProjections(state:
  NodalProjectStore, sceneId: SceneNodeId, options?: { excludeIds?:
  ActionNodeId[]; cssVariant?: "preview" | "picker-bg" }):
  PannellumHotSpotProjection[]`. Pour chaque action État 2 cible de
  la scène, lit le satellite `coords-options` (pitch, yaw,
  customCss / appearance dérivé) et produit `{ pitch, yaw, cssClass
  }`. Le CSS string est retourné séparément (à injecter par le
  consommateur).
- **Composant `<ScenePreviewModal>`** (nouveau,
  `xflow/react/src/view/popups/ScenePreviewModal.tsx`) :
  - Props : `{ sceneId: SceneNodeId | null; onClose: () => void }`.
  - Si `sceneId === null` : retourne `null`.
  - Lit la scène depuis le store (`useNodalUi().store.getState().
    scenes[sceneId]`).
  - Si `panoramaUrl === ""` : affiche message « Image 360 manquante
    — renseigner panoramaUrl » + bouton Fermer (pas de viewer).
  - Sinon : appelle `collectSceneHotspotProjections(state, sceneId,
    { cssVariant: "preview" })`, monte un `<style id="nodal-...">`
    avec les CSS classes générées, monte `<NodalPanoramaViewer
    mode="preview" panoramaUrl={url} hotSpots={projections} />`.
  - Header : titre « 👁 Aperçu : <label scène> », bouton Fermer.
  - Listener clavier : Échap = `onClose()`.
- **Modèle menu contextuel**
  (`xflow/react/src/view/contextMenu/nodalContextMenuModel.ts`) :
  - Ajouter `"preview-scene-360"` dans le type
    `NodalContextMenuAction`.
  - Ajouter dans `labels(locale)` : `previewScene360: L ? "Preview
    scene 360°" : "Tester la scène 360°"`.
  - Branche `targetId in snap.sceneBoxes` (lignes 89-96) : pousser
    `{ action: "preview-scene-360", label: t.previewScene360 }`
    **avant** `toggle-fold`.
- **Handler menu contextuel**
  (`xflow/react/src/view/contextMenu/NodalContextMenu.tsx`) :
  ajouter le case `"preview-scene-360"` qui résout
  `sceneIdFromSboxId(targetId)` (réciproque de `sboxIdFromScene`,
  à ajouter dans `reconcileSceneBoxes.ts` si pas déjà présente) puis
  appelle `ui.openScenePreview(sceneId)`.
- **Contexte UI** (`xflow/react/src/view/nodalUiContext.tsx`) :
  - Ajouter `scenePreviewSceneId: SceneNodeId | null` +
    `setScenePreviewSceneId`.
  - Ajouter helper `openScenePreview(sceneId: SceneNodeId)` qui
    réinitialise les autres popups d'édition de contenu (msg, pick,
    goto, req, pwd, selector, coordsEditor, choiceEditor, mediaEditor,
    objectEditor, popupThemeCustomization, globalSettingsHub,
    publishHub) puis `setScenePreviewSceneId(sceneId)`.
- **Montage** (`xflow/react/src/view/NodalCanvas.tsx`) : monter
  `<ScenePreviewModal sceneId={ui.scenePreviewSceneId} onClose={()
  => ui.setScenePreviewSceneId(null)} />` aux côtés des autres
  popups.
- **Style** (`xflow/react/src/view/NodalCanvas.css`) : ajouter
  `.nodal-scene-preview-modal` (overlay sombre, header bandeau,
  container Pannellum `flex-grow: 1`), variable CSS
  `--nodal-z-fullscreen-modal: 2000`.

**Critères de fin** :

- Clic droit sur s-box → entrée « Tester la scène 360° » /
  « Preview scene 360° » présente avant l'entrée Replier/Déplier.
- Clic sur entrée → modale plein écran s'ouvre, panorama Pannellum
  chargé sur la scène ciblée.
- Hotspots de la scène visibles en outline rouge dashed avec label
  tronqué (alignement legacy `previewScene`).
- Bouton « Fermer », croix, et Échap ferment la modale ;
  `viewer.destroy()` appelé (vérifié manuellement via DevTools — pas
  de fuite WebGL, pas de listener orphelin).
- Scène avec `panoramaUrl === ""` : modale ouverte avec message
  « Image 360 manquante » + bouton Fermer (pas d'erreur Pannellum
  console).
- Scène sans hotspots : viewer seul, pas de message d'erreur.
- **Tests Vitest** : `c18ScenePreviewModal.test.tsx` couvrant —
  (i) entrée menu contextuel s-box présente quand C18.1 monté ;
  (ii) `openScenePreview(sceneId)` met à jour
  `scenePreviewSceneId` ET ferme les autres popups ;
  (iii) projection `collectSceneHotspotProjections` produit le bon
  nombre d'hotspots avec pitch / yaw / cssClass ; (iv) modale rend
  le message d'erreur si `panoramaUrl === ""`. **Pannellum mocké**
  (`vi.mock("pannellum", () => ({ default: { viewer: vi.fn(() =>
  ({ destroy: vi.fn() })) } }))`).
- Smoke FR/EN : `editeur.html` + `editor_en.html`, ouvrir une
  scène avec 0 / 1 / plusieurs hotspots, vérifier light + dark mode.

**Branche / commit** :

- Branche : `feat/c18-360-preview-and-picker`.
- Commit : `feat(nodal): C18.1 aperçu scène 360° depuis menu
  contextuel s-box`.
- **Annexe D — Journal de chantier** : entrée 1-2 lignes au commit.

### Plan détaillé C18.2 — directives pour Cursor

**Pré-requis** : C18.1 livré (réutilisation `<NodalPanoramaViewer>`,
`normalizePanoramaUrl`, `collectSceneHotspotProjections`).

**Contexte** : porter dans la couche React le comportement legacy
`openPicker` / `validerCoordonnees` (`js/editor-shared-preview-picker
.js:33-82`). Un nouveau bouton « 📍 Placer sur l'image » apparaît
dans `CoordsOptionsPopup` sous les inputs pitch / yaw. Au clic, une
modale plein écran s'ouvre avec Pannellum (mode `picker`) centré
sur le pitch / yaw actuel du satellite ; les autres hotspots de la
scène apparaissent en gris dashed pour donner du contexte spatial.
Un clic n'importe où sur l'image → header met à jour pitch / yaw
live. Boutons Valider / Annuler ; Échap = Annuler ; Enter = Valider.
À la validation, écriture pitch + yaw uniquement dans le satellite
via `updateNodeData` (le reste — visibility, appearance, customCss
— reste intact).

**Fichiers à lire avant de coder** :

- `js/editor-shared-preview-picker.js:33-82` — référence
  comportementale (`openPicker`, header live `live-pitch` /
  `live-yaw`, `validerCoordonnees`, `closePicker`).
- `editeur.html` lignes 418-432 — markup historique `#picker-modal`
  (croix viseur centrale via overlay CSS — à conserver dans la
  variante non active `<PickerCrosshairOverlay>` côté React).
- `xflow/react/src/view/popups/CoordsOptionsPopup.tsx` — popup à
  étendre (ajout du bouton + appel `openCoordsPicker`).
- `xflow/react/src/view/preview/NodalPanoramaViewer.tsx` (créé
  C18.1) — réutiliser en mode `picker` avec `onPick` callback.
- `xflow/react/src/view/preview/sceneHotspotProjections.ts` (créé
  C18.1) — réutiliser avec `cssVariant: "picker-bg"` et
  `excludeIds: [parentActionId]`.
- `xflow/react/src/store/reconcileAutoSatellites.ts` — résolution
  satellite `coords-options` → action parente.
- `xflow/react/src/store/nodalProjectStore.ts` — `updateNodeData`
  pour écrire pitch / yaw au commit.
- Spec §3.4 (satellite `coords-options`) + §0.2-1 (carte source de
  vérité).

**Phase questions (workflow §8.1)** — *réalisé en pré-rédaction
Annexe D*. Questions résiduelles éventuelles :

- **Q-C18.2-1** — Helper `findSceneOfHotspotSatellite` : nouveau
  fichier `xflow/react/src/store/findSceneOfHotspotSatellite.ts` ou
  méthode du store ? *Vote : fichier helper pur (testable
  unitairement, pas d'effet de bord store).*
- **Q-C18.2-2** — Si l'action parente du satellite n'est pas un
  hotspot État 2 (ex. choix d'un selector — État 3 — qui aurait
  exceptionnellement un satellite coords) : modale s'ouvre avec
  message d'erreur, ou bouton « Placer sur l'image » désactivé ?
  *Vote : bouton désactivé avec tooltip « Disponible pour les
  hotspots de scène uniquement » — évite l'erreur runtime.*
  *Note* : selon §3.4, le satellite `coords-options` est attaché
  **automatiquement** uniquement à un hotspot État 2, donc ce cas
  ne devrait pas arriver en pratique — la garde est défensive.
- **Q-C18.2-3** — Style hotspots autres en gris dashed : opacité
  réduite (0.4 ?) ou pleine opacité ? *Vote : opacité ~0.5 +
  outline gris (`#888` ?) dashed pour rester discret sans
  disparaître.*

**Périmètre** :

- **Étendre `CoordsOptionsPopup.tsx`** :
  - Ajouter un bouton `<button type="button" className="nodal-coords
    -pick-btn" onClick={onPickClick}>📍 Placer sur l'image</button>`
    sous le `<div className="nodal-popup-grid">` qui contient les
    inputs pitch / yaw (avant la row `requiresItem`).
  - `onPickClick` appelle `useNodalUi().openCoordsPicker(satellite
    .id)`.
  - Pas de cleanup à faire à la fermeture du picker (le picker écrit
    dans le store, le `useEffect` de `CoordsOptionsPopup` (lignes
    30-42) re-synchronise les states locaux `pitch` / `yaw` au
    prochain render).
- **Helper `findSceneOfHotspotSatellite`** (nouveau,
  `xflow/react/src/store/findSceneOfHotspotSatellite.ts`) :
  signature `findSceneOfHotspotSatellite(state:
  NodalProjectStore, satelliteId: SatelliteNodeId): { sceneId:
  SceneNodeId; actionId: ActionNodeId } | null`. Algorithme :
  1. Lit le satellite ; si pas `coords-options` → null.
  2. Cherche l'action parente (dans `state.actions`, parcours des
     edges meta-out d'action vers ce satellite — ou champ direct
     si la résolution est déjà disponible ailleurs).
  3. Cherche la scène parente via le `flow-in` edge de l'action
     (edges family flow, target = action).
  4. Retourne `{ sceneId, actionId }` ou `null` si chemin cassé.
- **Composant `<CoordsPickerModal>`** (nouveau,
  `xflow/react/src/view/popups/CoordsPickerModal.tsx`) :
  - Props : `{ satelliteId: SatelliteNodeId | null; onClose: () =>
    void }`.
  - Si `satelliteId === null` : retourne `null`.
  - Résolution : `findSceneOfHotspotSatellite(state, satelliteId)`.
    Si `null` → message d'erreur « Cible introuvable » + bouton
    Fermer.
  - Lit le satellite (pitch / yaw initiaux), la scène
    (`panoramaUrl`).
  - Si `panoramaUrl === ""` : message d'erreur « Image 360 manquante
    — renseigner panoramaUrl » + bouton Fermer.
  - Sinon : `useState<{ pitch: number; yaw: number }>` initialisé
    avec les valeurs du satellite. `<NodalPanoramaViewer mode=
    "picker" panoramaUrl={url} initialPitch={pitch} initialYaw={yaw}
    onPick={(p, y) => setLive({ pitch: p, yaw: y })} hotSpots={
    backgroundHotspots} />` où `backgroundHotspots =
    collectSceneHotspotProjections(state, sceneId, { excludeIds:
    [actionId], cssVariant: "picker-bg" })`.
  - Header : « 📍 Cible : Pitch <live.pitch.toFixed(1)> | Yaw
    <live.yaw.toFixed(1)> » + boutons Valider / Annuler.
  - Valider : `useNodalUi().store.getState().updateNodeData(
    satelliteId, { ...current.data, pitch: live.pitch, yaw: live
    .yaw })`. Important : ne touche PAS aux autres champs du
    satellite (visibility, appearance, customCss, sfx,
    hotspotCssExpert).
  - Annuler : ferme sans écrire.
  - Listener clavier : Échap = Annuler ; Enter = Valider.
- **Contexte UI** (`xflow/react/src/view/nodalUiContext.tsx`) :
  - Ajouter `coordsPickerSatelliteId: SatelliteNodeId | null` +
    `setCoordsPickerSatelliteId`.
  - Ajouter helper `openCoordsPicker(satId: SatelliteNodeId)` qui
    réinitialise les autres popups (mais **pas**
    `coordsEditorSatelliteId` — les deux popups peuvent rester
    « ouvertes » conceptuellement, le picker passe par-dessus avec
    z-index supérieur ; au close picker, on retombe sur la popup
    coords ouverte derrière) puis `setCoordsPickerSatelliteId
    (satId)`.
- **Montage** (`xflow/react/src/view/NodalCanvas.tsx`) : monter
  `<CoordsPickerModal satelliteId={ui.coordsPickerSatelliteId}
  onClose={() => ui.setCoordsPickerSatelliteId(null)} />` aux
  côtés de `<ScenePreviewModal>`. Z-index au-dessus de
  `<HotspotAppearancePopup>` et de `<CoordsOptionsPopup>`.
- **Style** (`xflow/react/src/view/NodalCanvas.css`) :
  - `.nodal-coords-picker-modal` (overlay sombre, header avec
    affichage pitch / yaw live, container Pannellum, footer
    boutons Valider / Annuler).
  - `.nodal-coords-pick-btn` dans `CoordsOptionsPopup` (bouton
    secondaire, équivalent style `.nodal-coords-appearance-btn`).
  - Classes hotspots `picker-bg` (gris dashed `#888`, opacité 0.5).
  - `.nodal-picker-crosshair-overlay` (commentée / non active —
    fallback Q-C18-4).

**Critères de fin** :

- Bouton « 📍 Placer sur l'image » présent dans `CoordsOptionsPopup`,
  sous les inputs pitch / yaw.
- Clic ouvre la modale picker plein écran, viewer Pannellum centré
  sur les valeurs pitch / yaw actuelles du satellite.
- Hotspots autres de la scène visibles en gris dashed (opacité
  réduite). Le hotspot en cours d'édition n'est pas dans la liste.
- Clic sur l'image met à jour pitch / yaw live dans le header.
- « Valider » / Enter écrit pitch + yaw dans le satellite via
  `updateNodeData` (vérifié `store.getState().satellites
  [satelliteId].data`) sans toucher aux autres champs.
- « Annuler » / Échap referme sans écrire.
- Réouverture immédiate du picker : viewer s'ouvre aux nouvelles
  valeurs sauvegardées (cohérence read).
- Scène sans `panoramaUrl` ou résolution scène cassée : message
  d'erreur dans modale, pas de viewer.
- **Tests Vitest** : `c18CoordsPickerModal.test.tsx` couvrant —
  (i) bouton présent dans `CoordsOptionsPopup` ;
  (ii) `openCoordsPicker(satId)` met à jour
  `coordsPickerSatelliteId` ; (iii) résolution
  `findSceneOfHotspotSatellite` correcte (cas hotspot, cas
  satellite orphelin → null) ; (iv) callback `onPick(p, y)` →
  `live.pitch / live.yaw` mis à jour ; (v) Valider commit
  `store.getState().satellites[satId].data.pitch / yaw` correct,
  champs visibility / appearance intacts ; (vi) Annuler ne commit
  pas. **Pannellum mocké** comme C18.1.
- Smoke FR/EN : ouvrir un hotspot existant, picker, repositionner,
  Valider, vérifier que la position du hotspot s'est mise à jour
  visiblement (carte nodale + aperçu C18.1) ; round-trip
  `.escapegame` (les valeurs picker doivent persister à
  `getCurrentProjectData()` côté DOM legacy via flush).

**Branche / commit** :

- Branche : `feat/c18-360-preview-and-picker`.
- Commit : `feat(nodal): C18.2 modale placement coords hotspots
  depuis CoordsOptionsPopup`.
- **Annexe D — Journal de chantier** : entrée 1-2 lignes au commit.

### Plan détaillé C18.3 — directives pour Cursor

**Pré-requis** : C18.1 livré (modale aperçu + `<NodalPanoramaViewer>`
+ `collectSceneHotspotProjections`) + C18.2 livré et stabilisé (fixes
viseur central / drag fluide).

**Contexte** : étendre `<ScenePreviewModal>` (C18.1, jusque-là
read-only) avec un mode **édition** qui permet de **déplacer les
hotspots** directement par drag souris dans le panorama. Le legacy
n'avait pas cette fonctionnalité (placement via viseur central
uniquement, un hotspot à la fois — voir `js/editor-shared-preview
-picker.js:33-82`). Comportement attendu : un toggle « Éditer les
hotspots » (off par défaut, conserve le comportement C18.1) ; en
mode édition, `pointerdown` sur un hotspot ouvre un drag local,
overlay fantôme CSS qui suit le curseur (clone visuel du hotspot
atténué — pas un simple cercle), header live qui affiche
pitch/yaw du curseur, commit immédiat au release via
`updateNodeData`. Échap pendant un drag annule sans commit.
Cohabite avec le picker C18.2 (deux UX complémentaires : picker =
placement précis viseur central pour 1 hotspot ciblé ; aperçu
édition = manipulation directe multi-hotspots).

**Fichiers à lire avant de coder** :

- `xflow/react/src/view/popups/ScenePreviewModal.tsx` (C18.1) — modale
  à étendre.
- `xflow/react/src/view/preview/NodalPanoramaViewer.tsx` — composant
  viewer à passer en `forwardRef` + `useImperativeHandle` pour
  exposer `mouseEventToCoords(ev)` au parent.
- `xflow/react/src/view/preview/sceneHotspotProjections.ts` — étendre
  `PannellumHotSpotProjection` avec `actionId`,
  `coordsSatelliteId`, `ghostBaseCss`.
- `xflow/react/src/store/nodalProjectStore.ts` (`updateNodeData`)
  pour écrire pitch/yaw au release.
- `xflow/react/src/model/hotspotAppearance.ts` — pour comprendre
  comment `ghostBaseCss` est dérivé (`buildCustomCssFromAppearance`
  + `customCss` raw du satellite).
- `js/editor-shared-preview-picker.js:33-82` — référence comparative
  (le legacy n'a pas de drag, juste viseur central — donc pas de
  comportement à porter, mais utile pour comprendre les conventions
  de coords).
- Spec §3.4 (satellite `coords-options`) + §0.2-1 (carte source de
  vérité, écriture via `updateNodeData`).

**Phase questions (workflow §8.1)** — *réalisé en pré-rédaction
Annexe D (Q-C18.3-1 à Q-C18.3-11, 2026-05-08)*. Décisions clés :

- **Q-C18.3-1** — Lieu du drag : extension de la modale aperçu C18.1
  (vs nouvelle modale dédiée vs ajout au picker C18.2). *Choix :
  extension C18.1.* Cohérence : un seul écran "aperçu" qui peut être
  consulté ou édité.
- **Q-C18.3-2** — Activation du mode édition : toggle dans le header
  (vs drag toujours actif vs modificateur clavier). *Choix : toggle
  off par défaut.* Préserve le comportement C18.1 read-only.
- **Q-C18.3-3** — Persistance : auto-save au mouseup (vs Valider /
  Annuler dans footer vs auto-save + bouton "Annuler tout").
  *Choix : auto-save direct.* Direct manipulation classique ; undo
  global de la carte couvre le rollback.
- **Q-C18.3-4** — Drag seul ou drag + resize ? *Choix : drag seul,
  resize reporté en C18.4* (réutilisera `HotspotAppearancePopup`
  existante depuis le mode édition aperçu — pas de poignées DOM
  ad-hoc).
- **Q-C18.3-5** — Mécanique technique : `pointerdown` sur hotspot
  + `stopPropagation()` + listeners globaux `pointermove`/
  `pointerup` + `viewer.mouseEventToCoords(ev)` pour pitch/yaw.
  *Choix validé.* Granulaire (pan Pannellum reste actif tant qu'on
  ne touche pas un hotspot).
- **Q-C18.3-6** — Feedback pendant le drag : fantôme CSS overlay
  clonant la forme/couleur du hotspot avec opacité réduite (vs
  re-create du hotSpot Pannellum à chaque pointermove vs pas de
  feedback continu). *Choix : fantôme CSS atténué.* Compromis
  UX/perf ; le hotspot Pannellum réel est repositionné au release.
- **Q-C18.3-7** — Échap pendant un drag : annule le drag courant
  (vs ferme la modale vs pas de gestion). *Choix : annule.*
- **Q-C18.3-8** — Affichage live des coords pendant le drag : header
  + (mini-tooltip optionnel). *Choix : header seul* (le fantôme
  visualise déjà la position cible ; texte pitch/yaw redondant mais
  pédagogiquement utile).
- **Q-C18.3-9** — Hotspot en édition vs autres : autres restent
  actifs et cliquables. *Choix validé.*
- **Q-C18.3-10** — Découpage : un seul commit C18.3. *Choix validé*
  (périmètre cohésif, pas de pré-requis qui justifie un split).
- **Q-C18.3-11** (edge) — Drag aussi dans le picker C18.2 ?
  *Choix : non.* Le picker reste mono-cible (viseur central) ;
  l'aperçu édition couvre le drag multi-hotspots.

**Périmètre** :

- **Étendre `sceneHotspotProjections.ts`** : ajouter `actionId`,
  `coordsSatelliteId`, `ghostBaseCss` dans
  `PannellumHotSpotProjection`. `ghostBaseCss` = chaîne CSS du
  hotspot **sans** le wrapper preview (pas de `outline: dashed
  red`, pas de `pointer-events: auto`) — utilisé pour cloner
  visuellement dans l'overlay fantôme.
- **Étendre `NodalPanoramaViewer.tsx`** :
  - Passer en `forwardRef<NodalPanoramaViewerHandle, …Props>`.
  - `useImperativeHandle` exposant `mouseEventToCoords(ev:
    MouseEvent): [number, number] | null` (wrap de
    `viewerRef.current.mouseEventToCoords` avec garde Number.isFinite).
  - Pas d'autre changement de comportement (le mode `preview` reste
    pareil ; le drag est géré par le parent via le handle).
- **Étendre `ScenePreviewModal.tsx`** :
  - State local : `editMode: boolean` (off par défaut), `drag:
    DragState | null`.
  - `DragState = { actionId, satelliteId, cssClass, ghostBaseCss,
    clientX, clientY, livePitch, liveYaw }`.
  - Header : ajouter un bouton « ✏ Éditer les hotspots » à droite
    du titre (toggle, `data-active="1"` quand actif). Style
    secondaire (highlight `--node-selected-outline` quand actif).
  - Bandeau hint (visible seulement en mode édition) : « Glissez un
    hotspot pour le déplacer (Échap pour annuler). » remplacé par
    « 📍 Pitch X | Yaw Y » pendant un drag actif.
  - Listener `onPointerDown` sur le `__body` de la modale (handler
    `onBodyPointerDown`) :
    - Si `!editMode` → return.
    - `target.closest("[class*='prev-hs-']")` → identifier le hotspot.
    - Lookup dans `cssClassIndex` (Map cssClass → projection)
      pour récupérer `actionId`, `coordsSatelliteId`,
      `ghostBaseCss`.
    - `stopPropagation()` + `preventDefault()` + init `setDrag(...)`.
  - `useEffect` actif quand `drag != null` :
    - `pointermove` global : maj `clientX/Y` + recalcul
      `livePitch/Yaw` via `viewerHandleRef.current.mouseEventToCoords(ev)`.
    - `pointerup` global : commit via
      `store.getState().updateNodeData(satelliteId, { data: {
      ...sat.data, pitch, yaw } })` puis `setDrag(null)`.
    - Cleanup : remove listeners.
  - `useEffect` Échap : si `drag` actif → `setDrag(null)` ; sinon
    `onClose()`.
  - Render conditionnel `<div className="nodal-hotspot-ghost"
    style={{ left: drag.clientX, top: drag.clientY }}>` qui contient
    `<div className="nodal-hotspot-ghost__inner" style=
    {cssTextToStyleObject(drag.ghostBaseCss)} />`. Helper
    `cssTextToStyleObject` parse une chaîne CSS `"width: 120px;
    background: …"` en objet React style (camelCase).
  - Attribut `data-edit-mode={editMode ? "1" : "0"}` sur l'overlay
    racine — utilisé par le CSS pour passer les hotspots en
    `cursor: grab`.
- **Style** (`xflow/react/src/view/NodalCanvas.css`) :
  - `.nodal-scene-preview-modal__edit-toggle` (bouton secondaire,
    highlight quand `data-active="1"`).
  - `.nodal-scene-preview-modal__edit-hint` (bandeau bleuté
    `color-mix(--node-selected-outline 8%, --palette-bg)`).
  - `.nodal-scene-preview-modal[data-edit-mode="1"]
    [class*="prev-hs-"] { cursor: grab; }` + `:active { cursor:
    grabbing; }`.
  - `.nodal-hotspot-ghost` : `position: fixed; z-index: 9999;
    pointer-events: none; transform: translate(-50%, -50%);
    opacity: 0.55; filter: grayscale(0.25);`.
  - `.nodal-hotspot-ghost__inner` : `outline: 2px dashed rgba(255,
    255, 255, 0.85); outline-offset: 2px;`.

**Critères de fin** :

- Toggle « Éditer les hotspots » présent dans le header de la modale
  aperçu, off par défaut, bascule visuellement (highlight) au clic.
- En mode édition : `pointerdown` sur un hotspot init un fantôme qui
  suit le curseur ; le pan Pannellum continue de fonctionner si
  `pointerdown` ailleurs (pas sur un hotspot).
- Pendant le drag : le header affiche pitch/yaw live ; le fantôme
  conserve la forme/couleur CSS du hotspot avec opacité 0.55.
- Au `pointerup` : pitch/yaw écrits dans le satellite
  `coords-options` via `updateNodeData` ; les autres champs
  (`visibility`, `appearance`, `customCss`, `sfx`, `hotspotCssExpert`)
  restent intacts.
- Échap pendant un drag : annule le drag (fantôme disparaît, store
  inchangé) ; modale ne ferme pas.
- Échap hors drag : ferme la modale (comportement C18.1 préservé).
- **Tests Vitest** : `c18HotspotDragInPreview.test.tsx` couvrant —
  (i) toggle présent + bascule `data-active` ;
  (ii) hint visible en mode édition ;
  (iii) `pointerdown` (mode édition) sur élément avec classe
  `prev-hs-…` → fantôme rendu, `pointermove` met à jour pitch/yaw
  live, `pointerup` commit dans le store ;
  (iv) Échap pendant drag → fantôme disparaît, store inchangé ;
  (v) `pointerdown` hors mode édition → aucun drag déclenché.
  **Pannellum mocké** ; polyfill `PointerEvent = MouseEvent` pour
  jsdom au top du fichier de test.
- Smoke FR/EN : ouvrir une scène avec ≥2 hotspots, basculer en
  édition, drag un hotspot, vérifier que la nouvelle position
  apparaît bien dans la carte nodale (popup `CoordsOptionsPopup` du
  satellite affiche les nouvelles coords) et persiste après round-trip
  `.escapegame`.

**Branche / commit** :

- Branche : `feat/c18-360-preview-and-picker`.
- Commit : `feat(nodal): C18.3 drag direct hotspots dans aperçu
  scène (mode édition)`.
- **Annexe D — Journal de chantier** : entrée 1-2 lignes au commit.

### Plan détaillé C18.4 — directives pour Cursor

**Pré-requis** : C18.3 livré (mode édition aperçu + drag des hotspots
+ extension `sceneHotspotProjections` avec `actionId` /
`coordsSatelliteId`).

**Contexte** : compléter le drag de C18.3 avec le **redimensionnement
visuel** des hotspots **directement dans l'aperçu**, via des
**poignées de coin** (handles) classiques façon logiciel de dessin
(InDesign / Figma / Inkscape). Pas de réouverture de
`HotspotAppearancePopup` ; la popup existante reste accessible via
`CoordsOptionsPopup` pour ajuster couleur / bordure / transparence —
ce qui sort du périmètre C18.4 (et est noté en *Évolution future*).

Périmètre concret de C18.4 :

- En mode édition (toggle « Éditer les hotspots » actif), un clic
  simple sur un hotspot le **sélectionne** : 4 poignées carrées
  apparaissent aux 4 coins (NW, NE, SW, SE).
- Le drag d'une poignée recalcule `appearance.ui_w` /
  `appearance.ui_h` (largeur / hauteur en pixels du wrapper hotspot)
  en temps réel, **ancré au centre** (le pitch / yaw — donc le centre
  du hotspot — reste fixe pendant le resize).
- Au release : commit de la nouvelle taille via `updateNodeData`
  (auto-save). Échap pendant un resize annule.
- Désélection : clic en dehors d'un hotspot, Échap (sans drag actif),
  ou bascule du toggle vers read-only.
- **Bordure dashed rouge de l'aperçu rendue plus large que le hotspot
  réel** (ex. `outline-offset: 6-8px`) pour rester visible quand le
  hotspot est transparent ou quand on lui donne une taille très
  réduite. C'est aussi cette "marge de visibilité" qui donne au
  dragger une zone de saisie confortable autour des très petits
  hotspots.

Les changements de couleur / transparence / bordure restent dans
`HotspotAppearancePopup` (accessible via `CoordsOptionsPopup`) et
seront refactorés UI dans un chantier ultérieur (cf. *Évolutions
futures C18*).

**Fichiers à lire avant de coder** :

- `xflow/react/src/view/popups/ScenePreviewModal.tsx` (C18.3) —
  modale à étendre : ajout d'un état `selectedHotspot`, gestion du
  resize, rendu des handles overlay.
- `xflow/react/src/view/preview/sceneHotspotProjections.ts` (C18.3) —
  CSS du hotspot à ajuster pour décaler la bordure dashed rouge
  (`outline-offset`) et réutiliser la classe CSS pour repérer le
  hotspot DOM (sélection).
- `xflow/react/src/view/preview/NodalPanoramaViewer.tsx` (C18.3) —
  exposition `mouseEventToCoords` déjà en place ; vérifier qu'on
  peut accéder au `<div>` host du viewer pour y attacher l'overlay
  des handles (`ref` interne ou prop forwardée).
- `xflow/react/src/model/hotspotAppearance.ts` —
  `buildCustomCssFromAppearance`, `mergeHotspotAppearance`,
  `DEFAULT_HOTSPOT_APPEARANCE`. `ui_w` / `ui_h` ∈ [bornes mini /
  maxi à définir], defaults 120 / 120.
- `xflow/react/src/store/nodalProjectStore.ts` — `updateNodeData`
  pour persister `appearance.ui_w` / `ui_h` au release.
- `xflow/react/src/view/NodalCanvas.css` — section
  `.nodal-scene-preview-modal` (C18.1/C18.3) à étendre pour les
  styles handles et la bordure dashed plus large.

**Phase questions (workflow §8.1)** — *cadrage validé avec l'user
(2026-05-08, échange post-rédaction draft Annexe D)* :

- **Q-C18.4-1 (validé)** — Mode d'édition : **handles aux 4 coins**
  apparaissant à la sélection (clic simple sur hotspot en mode
  édition), façon logiciel de dessin classique. Pas de double-clic
  vers `HotspotAppearancePopup` (réservé à un chantier ultérieur
  pour couleur / bordure).
- **Q-C18.4-2 (validé)** — Le resize ne change que `appearance.ui_w`
  et `appearance.ui_h` (déjà dans `coords-options.data.appearance`,
  édité par `HotspotAppearancePopup` via `mergeHotspotAppearance` +
  `buildCustomCssFromAppearance`). Pas de nouveau champ contexte
  UI ; gestion locale dans `<ScenePreviewModal>`.
- **Q-C18.4-3 (validé)** — Stratégie de resize : **ancré au centre**
  (pitch / yaw fixes). Drag d'un coin → `new_w = 2 * |clientX -
  centerX|`, `new_h = 2 * |clientY - centerY|`. Symétrique sur tous
  les coins. Plus simple que l'ancrage au coin opposé (qui aurait
  obligé à recalculer pitch / yaw pour conserver le coin opposé
  fixe en pixels — fragile car la projection 3D n'est pas linéaire).
- **Q-C18.4-4 (validé)** — Resize libre par défaut (largeur et
  hauteur indépendantes). **Touche Shift maintenue → ratio fixé**
  (préservation de l'aspect ratio courant). Conforme aux conventions
  des outils de dessin.
- **Q-C18.4-5 (validé)** — Sélection unique (1 hotspot à la fois).
  Sélectionner un autre hotspot désélectionne le précédent.
- **Q-C18.4-6 (validé)** — Couleur / transparence / bordure du
  hotspot **hors périmètre C18.4** ; resté accessible via
  `CoordsOptionsPopup` → bouton « Personnaliser l'apparence » →
  `HotspotAppearancePopup` (déjà en place). Évolution future : modale
  flottante à côté du hotspot sélectionné dans l'aperçu (cf.
  *Évolutions futures C18*).
- **Q-C18.4-7 (validé)** — Bordure dashed rouge de l'aperçu :
  `outline-offset` augmenté (~6-8px) pour qu'elle soit plus large
  que le hotspot réel. Permet (i) de rester visible sur hotspot
  transparent, (ii) d'agrandir la zone de pointage pour les
  petits hotspots, (iii) de loger les handles sans qu'ils chevauchent
  le hotspot lui-même.
- **Q-C18.4-8 (validé)** — Bornes : `ui_w` / `ui_h` ∈ [16 ; 800]
  pixels. Mini 16 px évite les hotspots invisibles ; maxi 800 px
  laisse la marge nécessaire pour les hotspots-images larges sur
  grand écran (≥ 2K). Les bornes resteront en pixels jusqu'au
  chantier C22 (responsive) qui changera potentiellement l'unité.

- **Q-C18.4-9 (validé — note architecture)** — Sémantique
  pixels : `ui_w` / `ui_h` restent en **pixels CSS bruts** pour C18.4
  (cohérent avec legacy `editor-shared-ui-utils.js:74-83`). Le
  scaling proportionnel à la dimension de l'image panoramique
  (sujet remonté par l'user pendant le cadrage : un hotspot doit
  couvrir la même portion d'image quel que soit l'écran) est
  reporté à un chantier dédié **C22 — Hotspots responsives**
  (cf. §7). C18.4 livre l'UI de resize ; C22 changera l'unité
  derrière sans retravail majeur de l'UI.

**Périmètre** :

- **Étendre `sceneHotspotProjections.ts`** :
  - Augmenter `outline-offset` à `6px` (au lieu de `0` ou `2px`
    selon état actuel) pour la variante `cssVariant: "preview"`.
    Conserver l'outline rouge dashed actuel ; juste décaler.
  - La variante `picker-bg` (background gris dashed dans le picker
    C18.2) garde son `outline-offset` actuel — on n'éditera pas de
    là-bas.
  - Pas de changement structurel sur les champs déjà ajoutés en
    C18.3 (`actionId`, `coordsSatelliteId`, `ghostBaseCss`).

- **Étendre `<NodalPanoramaViewer>`** :
  - Forwarder un `ref` ou exposer via `useImperativeHandle` un
    accès au container DOM (`getViewerContainer(): HTMLElement |
    null`). Le parent en aura besoin pour attacher l'overlay des
    handles dans le bon repère DOM (le BoundingClientRect des
    hotspots Pannellum est calculé dans ce container).
  - Optionnel : exposer un mécanisme de notification quand Pannellum
    redessine (rotation, zoom) pour que les handles puissent
    suivre le hotspot. *Stratégie alternative* (plus simple) :
    `requestAnimationFrame` permanent côté
    `<ScenePreviewModal>` quand sélection active, qui re-aligne
    les handles sur le `getBoundingClientRect()` du DOM hotspot.
    Coût négligeable. **Choix : la stratégie rAF.**

- **Étendre `<ScenePreviewModal>`** :
  - State local : `selection: { actionId, satelliteId, cssClass } |
    null` (le DOMRect est lu en live via rAF, pas stocké).
  - State local : `resize: { handle: "nw" | "ne" | "sw" | "se";
    initialW, initialH, initialAspectRatio, centerX, centerY } |
    null`.
  - **Single-clic en mode édition** sur un hotspot : si pas de drag
    en cours (C18.3) et si un single-clic court (`ev.detail === 1`,
    pointerup peu après pointerdown sans déplacement significatif
    → seuil 4 px), alors `setSelection({ ... })`. Pour distinguer
    drag vs clic-pour-sélectionner, on temporise : un pointerdown
    sur hotspot ouvre **soit** un drag (déplacement) **soit** une
    sélection (si pointerup sans déplacement). Logique simple :
    sur pointerdown init `dragCandidate` ; sur pointermove > seuil
    → bascule en drag (C18.3) ; sur pointerup avant seuil → clic
    de sélection.
  - **Single-clic en mode édition hors hotspot** (autre que sur un
    handle) : désélectionne (`setSelection(null)`).
  - **Pointerdown sur un handle** : init `setResize({ handle, ... })`
    et `stopPropagation()` pour ne pas re-trigger le drag du
    hotspot.
  - **Pointermove pendant resize** :
    `delta = { x: ev.clientX - center.x, y: ev.clientY - center.y }`.
    Calcul de la nouvelle taille selon le coin (peu importe lequel,
    formule symétrique grâce à l'ancrage centre) :
    `new_w = clamp(2 * |delta.x|, 16, 800)` ;
    `new_h = clamp(2 * |delta.y|, 16, 800)`.
    Si `ev.shiftKey` : `ratio = initialAspectRatio` ; choisir la
    dimension dominante et appliquer le ratio à l'autre.
  - **Pointerup pendant resize** : commit via
    `store.updateNodeData(satelliteId, { data: {
    ...sat.data, appearance: mergeHotspotAppearance(sat.data
    .appearance, { ui_w, ui_h }), customCss:
    buildCustomCssFromAppearance(merged) } })` ; `setResize(null)`.
    *Réutiliser les helpers existants* — pas de manipulation
    directe de `customCss`.
  - **Échap pendant resize** : `setResize(null)` (annule sans
    commit).
  - **Échap sans resize, avec sélection** : `setSelection(null)`.
  - **Échap sans sélection ni resize** : `onClose()` (comportement
    C18.1 préservé).
  - **Bascule du toggle édition vers off** : `setSelection(null)` +
    `setResize(null)` automatiquement.

- **Composant `<HotspotResizeHandles>`** (nouveau, sous-composant
  interne de `<ScenePreviewModal>` ou exporté de
  `xflow/react/src/view/preview/HotspotResizeHandles.tsx`) :
  - Props : `{ selection: NonNullable<...>; viewerContainer:
    HTMLElement; onResizeStart: (handle, init) => void }`.
  - rAF loop : à chaque frame, lit le DOM via
    `viewerContainer.querySelector('.' + selection.cssClass)` →
    `getBoundingClientRect()` → re-positionne les 4 divs handles
    (`position: fixed`, `left/top` calculé depuis le rect).
  - Si l'élément n'est plus dans le DOM (cas hotspot caché par
    rotation hors champ Pannellum) → handles invisibles
    (`display: none`).
  - 4 divs `.nodal-hotspot-handle` (un par coin), classes utilitaires
    `--nw`, `--ne`, `--sw`, `--se` pour le `cursor` (`nwse-resize`
    / `nesw-resize`).
  - `onPointerDown` sur chaque handle : appelle `onResizeStart` avec
    le coin + valeurs initiales.

- **Style** (`xflow/react/src/view/NodalCanvas.css`) :
  - `.nodal-hotspot-handle` : `position: fixed; width: 12px;
    height: 12px; transform: translate(-50%, -50%); background:
    var(--node-selected-outline); border: 1.5px solid white;
    border-radius: 2px; z-index: 9998; pointer-events: auto;`.
  - `.nodal-hotspot-handle--nw, --se { cursor: nwse-resize; }
    .--ne, --sw { cursor: nesw-resize; }`.
  - Bordure dashed rouge décalée : ajuster
    `outline-offset` dans la CSS générée par
    `sceneHotspotProjections.ts` (variante `preview`).
  - Hint header en mode édition : compléter le texte existant
    (« Glissez un hotspot pour le déplacer ») en
    « Glissez un hotspot pour le déplacer • Cliquez pour
    sélectionner / redimensionner • Shift = ratio fixe ». Texte
    EN aligné.

**Critères de fin** :

- En mode édition, **clic simple** sur un hotspot → 4 handles
  apparaissent aux coins (sélection visible).
- **Drag d'un handle** → hotspot se redimensionne en direct (CSS
  régénéré à chaque pointermove) ; le centre reste fixe (pitch / yaw
  inchangés).
- **Shift maintenu** pendant le resize : ratio préservé.
- **Pointerup** : `appearance.ui_w` / `ui_h` persistés via
  `updateNodeData` ; `customCss` recalculé.
- **Échap pendant resize** : annule (taille restaurée à la valeur
  d'avant resize).
- **Échap sans resize avec sélection** : désélectionne.
- **Clic en dehors d'un hotspot** (et pas sur un handle) :
  désélectionne.
- **Bascule du toggle édition vers off** : sélection et resize
  réinitialisés ; handles disparaissent.
- **Bordure dashed rouge** plus large que le hotspot réel (visible
  même sur hotspot transparent ou très petit).
- **Drag du hotspot** (déplacement, C18.3) toujours fonctionnel sur
  pointerdown + déplacement > 4 px.
- **Tests Vitest** : `c18HotspotResize.test.tsx` couvrant —
  (i) clic simple sur hotspot en mode édition → state `selection`
  défini, handles rendus dans le DOM ;
  (ii) `pointerdown` sur handle « se » + `pointermove` →
  `cssText` régénéré contient nouveau `width` / `height` (ancré au
  centre) ;
  (iii) Shift + resize → `new_h = new_w * initialRatio` ;
  (iv) `pointerup` → `updateNodeData` appelé avec
  `appearance.ui_w` / `ui_h` mis à jour ;
  (v) Échap pendant resize → state `resize` null, taille restaurée ;
  (vi) clic hors hotspot et hors handle → `selection: null` ;
  (vii) bascule toggle vers off → sélection et resize réinitialisés.
- Smoke FR/EN : redimensionner un hotspot via les handles, vérifier
  apparence direct + persistance round-trip `.escapegame`. Tester
  aussi avec hotspot transparent (`appearance.ui_bg = "transparent"`)
  pour valider la bordure dashed plus large.

**Évolutions futures C18 (hors périmètre C18.4)** :

- **Édition couleur / transparence / bordure depuis l'aperçu** :
  modale flottante à côté du hotspot sélectionné (sans masquer
  l'aperçu) éditant les champs `appearance.ui_bg`, `ui_opacity`,
  `ui_border_*`. Pourrait réutiliser les sous-blocs internes de
  `HotspotAppearancePopup`. À cadrer comme C18.6 ou C18.7 si jugé
  utile.
- **Resize 8 points** : ajout de 4 handles aux milieux d'arête
  (N, S, E, W) pour resize unidimensionnel. À ajouter si retour
  utilisateur le justifie.
- **Snap aux multiples de 10** : option (Alt maintenu ?) pour
  arrondir `ui_w` / `ui_h` à des paliers réguliers.

**Branche / commit** :

- Branche : `feat/c18-360-preview-and-picker` (continuation après
  C18.3).
- Commit : `feat(nodal): C18.4 redimensionnement hotspots via
  handles aux coins dans aperçu scène`.
- **Annexe D — Journal de chantier** : entrée 1-2 lignes au commit.

### Plan détaillé C18.5 — directives pour Cursor

> **Amendements plan C18.5 (2026-05-08, post-exploration code par
> Cursor)** — décisions intermédiaires révisées avant ouverture de
> C18.5.1, après lecture de l'existant `xflow/react/src/view/popups/`
> et `js/editeur-generate.js`. **Texte original conservé** ci-dessous
> pour traçabilité ; les Q amendées sont annotées en marge.
>
> 1. **Q-C18.5-1 amendée** → bascule sur **(a-i)** *(« option (a)
>    revisitée »)* au lieu de **(b) iframe sandbox**. Justification :
>    découverte qu'il existe déjà côté React un composant
>    `xflow/react/src/view/popups/PlayerPopupPreview.tsx` (utilisé
>    par `MsgContentPopup`, `PickContentPopup`, `GotoContentPopup`,
>    `ReqContentPopup`, `PwdContentPopup`, `SelectorContentPopup`)
>    avec déjà 4 variantes (`button` / `input` / `selector-buttons`
>    / `selector-dropdown`), abonné au thème via `usePlayerPopupTheme`
>    et stylé via `playerPopupThemeToMsgPreviewChrome`. La crainte
>    initiale (« code dupliqué entre runtime joueur et React preview
>    ; risque divergence visuelle ») **est déjà mitigée** par
>    l'existence de ce composant et son usage généralisé. (a-i)
>    **étend** `PlayerPopupPreview` avec une prop optionnelle
>    `interactive?: { onChoice, onClose, onConfirm }` (rétrocompatible
>    — les éditeurs continuent de passer un mode disabled). Pas
>    d'iframe `srcDoc`, pas de helper string-templating
>    `buildPreviewActionHtml`, pas de `postMessage`. Si à l'usage
>    une fidélité supérieure est nécessaire (cas non identifié pour
>    le moment), bascule (b) reste possible en chantier futur.
> 2. **Q-C18.5-2 amendée — selector multi-niveau full_nav** au lieu
>    de « 1 niveau au plus ». Justification : c'est précisément le
>    selector qui demande le plus un aperçu pour valider l'arborescence
>    de choix (raison originelle qui avait fait pencher pour iframe
>    sandbox). Stack interne `SelectorLevel[]` côté overlay : clic
>    sur un choix → push si sous-selector, swap vers popup terminale
>    (msg/pick/goto/req/pwd) sinon. Le reste du périmètre Q-C18.5-2
>    reste inchangé : pas de simulation inventaire / possession /
>    mot-de-passe / changement de scène — uniquement la nav selector
>    est cliquable.
> 3. **Q-C18.5-7 amendée** — **image promue de C18.5.3 → C18.5.2**.
>    Audio reste en C18.5.3. Justification : image apparaît plus
>    couramment dans les body Quill (cf. usages projet) et le rendu
>    `<img>` est trivial à valider en même temps que goto/req/pwd
>    /selector. Audio (`<audio>` HTML5) sera traité après en polish.
> 4. **Périmètre / Communication iframe ↔ parent** *(de la spec
>    initiale)* — **désactivés** par le passage à (a-i) : pas de
>    `srcDoc`, pas de `sandbox`, pas de `postMessage`. Remplacés
>    par : composant React `<PlayerPreviewOverlay>` plein écran
>    (overlay au-dessus de `<ScenePreviewModal>`), fermeture via
>    bouton X / Échap (listener `keydown`) / clic backdrop. Pas de
>    sécurité communication inter-frame nécessaire.
> 5. **Découpage révisé** :
>    - **C18.5.1** : extension `PlayerPopupPreview` + overlay infra
>      + helper `buildPlayerPreviewVariant(action)` + branchement
>      `<ScenePreviewModal>` (state `playerPreviewActionId`, click
>      read-only ouvre overlay, toggle on ferme overlay) + curseur
>      `pointer` read-only / `grab` édition + actions **msg + pick**.
>    - **C18.5.2** : actions **goto + req + pwd** (popups statiques,
>      bouton "fermer" actif, no-op autres) + **selector full_nav
>      multi-niveau** + **image** dans `play-html-rich`.
>    - **C18.5.3** : **audio** (`<audio>` HTML5) + ajustements de
>      fidélité visuelle si écarts repérés au smoke test.

**Pré-requis** : C18.3 livré (mode édition aperçu, le toggle est
maintenant le pivot UX qui distingue read-only de édition).

**Contexte** : transformer l'aperçu scène en **aperçu interactif
"comme en jeu"** quand on est **en mode read-only** (toggle édition
off). Concrètement, un clic sur un hotspot affiche la popup associée
à son action (msg, pick, goto, req, pwd, selector) avec son contenu
réel (`bodyHtml` Quill rendu, libellé bouton, etc.) — comme le
joueur le verrait. Limitation : la **logique de jeu** (ajout
d'objet à l'inventaire, transition de scène, vérification
mot-de-passe…) n'est **pas exécutée** ; on reste dans un mode
"prévisualisation visuelle". L'inventaire / état partie / variables
de session ne sont pas simulés. C'est un gain pédagogique majeur
pour les EPN qui veulent visualiser le rendu joueur sans avoir à
lancer la génération HTML complète. Chantier **complexe** : nécessite
soit (a) la **réécriture en React** des popups joueur (msg /
pick / goto / req / pwd / selector), soit (b) la **réutilisation du
runtime joueur** existant (template literal `buildPlayerHtmlTemplate`
généré côté `editeur-generate.js` / `editor-en-generate.js`) via une
sandbox iframe.

**Fichiers à lire avant de coder** :

- `js/editeur-generate.js:200-…` (`buildPlayerHtmlTemplate`) —
  template joueur, popups msg / pick / goto / req / pwd / selector
  rendus en HTML/CSS/JS classique.
- `js/editor-en-generate.js` — version EN miroir.
- `xflow/react/src/view/popups/MsgContentPopup.tsx` (et siblings
  Pick / Goto / Req / Pwd / Selector) — éditeurs nodaux qui rendent
  déjà du Quill côté React (peut-être base réutilisable pour le
  rendu joueur ?).
- `xflow/react/src/view/popups/ScenePreviewModal.tsx` (C18.3) —
  modale à étendre avec gestion du clic en read-only.
- `xflow/react/src/store/nodalProjectStore.ts` — lecture des actions
  + payload (`copy`, `nested`, `answer`, etc.).
- Spec §3.3 (actions État 2 unifiées, `payload.copy`).

**Phase questions (workflow §8.1)** — *cadrage validé avec l'user
(2026-05-08, échange post-rédaction draft Annexe D)* :

- **Q-C18.5-1 (validé — amendé 2026-05-08, voir bloc en tête)** — Stratégie de rendu de la popup joueur :
  choix technique laissé à Cursor entre :
  - (a) Réécriture React des popups joueur dans
    `xflow/react/src/view/playerPreview/`. Code dupliqué entre
    runtime joueur et React preview ; risque divergence visuelle.
  - (b) **Iframe sandbox** : `<iframe srcDoc={…}>` au-dessus de la
    modale aperçu, fragment HTML généré par une variante allégée
    de `buildPlayerHtmlTemplate`. Réutilise la source de vérité
    visuelle du runtime joueur.
  - (c) Composants React partagés (refactor architectural majeur,
    hors scope C18.5).

  *Vote retenu : (b) iframe sandbox.* Faible coût, rendu fidèle au
  joueur réel, dette technique nulle. Si Cursor identifie une raison
  technique impérative de basculer vers (a), le signaler en phase
  questions C18.5.X (mais (b) reste la cible).

- **Q-C18.5-2 (validé — amendé 2026-05-08, voir bloc en tête : selector full_nav)** — Périmètre de la simulation : **affichage
  seul + bouton de fermeture fonctionnel**. Aucune simulation
  d'état joueur (inventaire, hotspot consommé, transition) ; aucune
  modification du store pendant la preview. Précisions issues de
  l'échange utilisateur :
  - **Goto** : afficher la popup texte de transition (sans
    navigation effective). Aucun changement de scène réel.
  - **Pick** : afficher la popup standard ; pas d'ajout réel à
    l'inventaire.
  - **Req / Pwd** : afficher la popup standard ; **pas** de
    vérification possession / mot-de-passe en C18.5. Le rendu
    "branche succès" vs "branche échec" est explicitement reporté
    à un chantier futur (cf. *Évolutions futures C18*).
  - **Selector** : afficher l'arborescence de choix sans logique de
    navigation imbriquée. Le clic sur une branche affiche la popup
    enfant (au plus 1 niveau de profondeur en MVP) ou no-op au-delà.

- **Q-C18.5-3 (validé)** — Curseur sur hotspot : `pointer` en
  read-only (curseur jeu) ; `grab` en édition. Pédagogiquement
  explicite "jeu vs édition".

- **Q-C18.5-4 (validé)** — Bascule du toggle « Éditer les hotspots »
  vers on pendant qu'une popup preview joueur est ouverte ferme
  automatiquement la preview (état cohérent ; pas de drag pendant
  qu'une popup couvre l'écran).

- **Q-C18.5-5 (validé)** — Médias (audio, image) référencés : rendus
  si l'URL est résolvable (URL absolue ou bundle local C10.5 résolu
  en `blob:`). Audio HTML5 + `<img>` standard, comme dans le runtime
  joueur. Si Cursor rencontre un cas non résolvable simplement,
  fallback texte « Média : <URL> ».

- **Q-C18.5-6 (validé)** — Toutes les actions affichables (msg,
  pick, goto, req, pwd, selector) sont rendues, avec boutons no-op
  pour la logique. Pas de filtre par type d'action.

- **Q-C18.5-7 (validé — amendé 2026-05-08, voir bloc en tête : image promue de 5.3 → 5.2)** — Découpage géré par Cursor selon
  feedback. **Cible suggérée** :
  - **C18.5.1** : infrastructure preview (iframe sandbox + helper
    `buildPreviewActionHtml`) + actions simples (msg, pick).
  - **C18.5.2** : actions complexes (goto, req, pwd, selector) +
    selector mono-niveau.
  - **C18.5.3** *(optionnel si pas couvert dans 5.1/5.2)* : médias
    audio + image dans popups, ajustements de fidélité visuelle.
  Commits réguliers, messages clairs (`feat(nodal): C18.5.X
  <description>`) ; **chaque sous-commit met à jour le journal
  Annexe D**.

**Périmètre** :

- **Composant `<PlayerPreviewLayer>`** (nouveau, hypothèse iframe
  sandbox retenue) : monte une `<iframe>` plein écran au-dessus de
  la modale aperçu quand un hotspot est cliqué en read-only.
  `srcDoc` = HTML auto-contenu (style joueur + popup ciblée +
  bouton fermer + `postMessage` listener pour communiquer la
  fermeture au parent).
- **Helper `buildPreviewActionHtml(action, sceneState, locale,
  store)`** : variante allégée de `buildPlayerHtmlTemplate` qui
  prend une action + son contexte minimum et produit un HTML
  autonome (style inline, Quill rendu côté React puis sérialisé
  ou rendu côté iframe via Quill global). Branche dans le helper
  pour chaque type d'action (msg / pick / goto / req / pwd /
  selector). Mutualiser le maximum avec `buildPlayerHtmlTemplate`
  (extraire les sous-fonctions de rendu de popup en helpers
  réutilisables si possible).
- **`<ScenePreviewModal>`** :
  - En mode read-only, `onPointerDown` simple-clic sur un hotspot
    → `setPlayerPreviewActionId(actionId)`.
  - Render conditionnel `<PlayerPreviewLayer actionId={…}
    onClose={() => setPlayerPreviewActionId(null)} />`.
  - Curseur : `pointer` en read-only sur les hotspots, `grab` en
    édition (CSS conditionnel sur `data-edit-mode`).
  - Bascule du toggle vers on : `setPlayerPreviewActionId(null)` en
    plus des reset C18.4 (selection, resize).
- **Contexte UI** : pas de nouveau champ obligatoire (state local
  `<ScenePreviewModal>`).
- **Communication iframe ↔ parent — standards industrie sécurité** :
  - Iframe lancée avec `sandbox="allow-scripts allow-same-origin"`
    (permissions minimales — `allow-scripts` requis pour le
    listener clavier interne et le bouton fermer ; `allow-same-origin`
    pour permettre `window.opener` / `postMessage` synchrone si
    Quill est chargé depuis le même origin).
  - **Pas de `dangerouslySetInnerHTML` côté React** : on passe par
    `srcDoc` (le contenu HTML est attribué via la prop, le browser
    crée un document isolé propre).
  - `window.postMessage` pour la fermeture : le HTML iframe émet
    `{ type: "nodal-preview-close" }` au clic du bouton fermer ou
    sur Échap interne ; le parent écoute et **vérifie** :
    `event.source === iframeRef.current?.contentWindow` avant de
    réagir (protection contre les messages tiers).
  - Échap parent : listener `keydown` sur `document` au niveau
    `<ScenePreviewModal>` qui ferme aussi la preview (redondance
    contre le cas où l'iframe perd le focus — comportement attendu
    par les utilisateurs).
  - Pas de payload sensible dans les messages (juste un `type`
    string).

**Critères de fin** :

- En read-only : clic sur un hotspot affiche la popup joueur avec
  contenu rendu (Quill, boutons, libellés) — visuellement similaire
  au joueur réel.
- En mode édition (toggle on) : clic sur hotspot init la
  sélection/resize ou le drag (comportements C18.3 + C18.4
  préservés ; aucune popup preview joueur).
- Bouton de fermeture de la popup preview revient à l'aperçu
  simple ; aucun effet de bord sur le store.
- Actions msg, pick, goto, req, pwd, selector au moins affichées
  (boutons no-op sauf bouton fermer).
- Médias (audio, image) joués si présents (sinon fallback texte).
- Pas de modification de l'état du store pendant la preview joueur.
- **Tests Vitest** par sous-chantier (`c18PlayerPreview.test.tsx`,
  scope au sous-chantier livré) couvrant —
  (i) clic en read-only sur hotspot msg → layer preview monté avec
  bodyHtml du msg ;
  (ii) clic en édition → drag/resize init (preview inactive) ;
  (iii) `postMessage` `{ type: "nodal-preview-close" }` →
  `setPlayerPreviewActionId(null)` ;
  (iv) bascule toggle vers on pendant preview → preview fermée.
- Smoke FR/EN : 4-5 actions différentes prévisualisées, vérifier
  alignement visuel avec le joueur réel généré (`generateGame`).

**Évolutions futures C18 (hors périmètre C18.5)** :

- **Inventaire virtuel éditable** : bandeau supérieur (ou modale
  dédiée) listant tous les objets du projet (remontés depuis la
  base d'objets via les satellites `object`), avec une case à cocher
  par objet. Cocher = "objet possédé" dans la simulation. Les
  actions REQ et PWD utilisent cet inventaire mock pour afficher
  la branche succès vs échec ; les visibility-rules des hotspots
  les masquent / révèlent en conséquence. Permettrait de tester
  des chemins de jeu complets sans génération HTML. Chantier
  conséquent (UI + simulateur de visibility-rules + simulateur
  REQ/PWD), à cadrer comme C19+.
- **Sélection de variantes** (PWD : "saisie correcte" / "incorrecte")
  via un mini-toggle dans la popup preview avant simulation.
- **Persistance des choix selector** : visualiser plus d'un niveau
  de profondeur en preview.

**Branche / commits** :

- Branche : `feat/c18-360-preview-and-picker` (continuation après
  C18.4) ou nouvelle branche `feat/c18-player-preview` si volume
  code important (à décider par Cursor à l'ouverture du sous-chantier).
- Commits réguliers et clairs :
  `feat(nodal): C18.5.1 infrastructure preview joueur (msg + pick)`,
  `feat(nodal): C18.5.2 actions complexes (goto + req + pwd +
  selector mono-niveau)`,
  `feat(nodal): C18.5.3 médias audio/image dans popup preview`
  *(si nécessaire)*.
- **Annexe D — Journal de chantier** : entrée 1-2 lignes au commit
  par sous-chantier.

### Journal de chantier

- 2026-05-08 — Ouverture Annexe D. Cadrage validé en phase questions
  (Q-C18-1 à Q-C18-12). Découpage initial 2 sous-chantiers
  (C18.1 + C18.2) ; item drag direct + resize hotspots reporté en
  chantier séparé post-C18 (numéro non figé). Branche
  `feat/c18-360-preview-and-picker` créée depuis `feat/nodal-map`.
  Plans détaillés C18.1 et C18.2 rédigés en one-shot dans cette
  Annexe D, prêts à être livrés à Cursor sous-chantier par
  sous-chantier.
- 2026-05-08 — **Ré-extension du périmètre C18** : ajout d'un C18.3
  drag direct des hotspots (cadrage Q-C18.3-1 à -11). Le resize
  reste en C18.4 (follow-up) — réutilisation de la popup
  `HotspotAppearancePopup` existante (déclenchement depuis le mode
  édition aperçu), pas de poignées DOM ad-hoc. Aperçu interactif
  « comme en jeu » (clic en read-only) noté C18.5 follow-up.
- 2026-05-08 — **C18.1 livré (code)** : menu s-box « Tester la scène 360° »,
  `ScenePreviewModal` + `NodalPanoramaViewer` (Pannellum global),
  `collectSceneHotspotProjections`, `sceneIdFromSboxId`, tests Vitest
  `c18ScenePreviewModal.test.tsx`, MAJ `nodalContextMenuModel.test`.
- 2026-05-08 — **C18.2 livré (code)** : bouton « Placer sur l'image » dans
  `CoordsOptionsPopup`, `CoordsPickerModal` + état `coordsPickerSatelliteId` /
  `openCoordsPicker` (contexte UI, sans fermer l'éditeur coords), helper
  `findSceneOfHotspotSatellite`, CSS picker (z-index au-dessus des popups),
  tests `c18CoordsPickerModal.test.tsx`, mocks `NodalUiContext` étendus
  (`c18ScenePreviewModal.test.tsx`).
- 2026-05-08 — **C18.2-fix** : passage du picker en mode « viseur central »
  (legacy formulaire) — le clic sur le panorama ne capture plus les coords
  (il ré-orientait la caméra et empêchait le drag 360°). Le viseur (croix
  superposée, `pointer-events: none`) est rendu par `NodalPanoramaViewer`
  en mode `picker` ; pitch/yaw lus en continu via Pannellum
  `getPitch()`/`getYaw()` (poll 120 ms) et reflétés dans le header live.
  `CoordsPickerModal` utilise un `useState` lazy-init + `key={satelliteId}`
  côté `NodalCanvas` pour éviter qu'un useEffect parent n'écrase la
  première lecture du viewer. Test `c18CoordsPickerModal.test.tsx`
  adapté (mock `getPitch`/`getYaw`, vérif crosshair présent).
- 2026-05-08 — **C18.2-fix.2** : `initialPitch`/`initialYaw` figés dans
  un ref dans `NodalPanoramaViewer` — auparavant ils étaient dans les
  deps de l'effet de création du viewer Pannellum, donc à chaque tick
  du poll `getPitch()`/`getYaw()` (120 ms) le viewer était détruit et
  recréé, ce qui interrompait le drag souris. Comportement aligné sur
  legacy `js/editor-shared-preview-picker.js:50-62` (le viewer existe
  une seule fois ; le poll lit les coords du centre caméra). Pour
  ré-initialiser à de nouvelles coords : remount via `key` côté parent
  (déjà en place pour `CoordsPickerModal`).
- 2026-05-08 — **C18.3 livré (code)** : drag direct des hotspots dans
  l'aperçu scène. `ScenePreviewModal` étendu avec un toggle « Éditer
  les hotspots » dans le header (off par défaut) ; en mode édition,
  un `pointerdown` sur un hotspot (matching `[class*="prev-hs-"]`)
  ouvre un drag local — un overlay fantôme (clone CSS du hotspot via
  `appearance.customCss`, opacité 0.55 + grayscale léger) suit le
  curseur via listeners `pointermove`/`pointerup` sur `document`.
  `NodalPanoramaViewer` passé en `forwardRef` + `useImperativeHandle`
  expose `mouseEventToCoords(ev)` pour traduire la position écran en
  pitch/yaw via Pannellum. Au release, `updateNodeData` écrit
  pitch+yaw dans le satellite `coords-options` (auto-save direct).
  Échap pendant un drag annule sans commit. `sceneHotspotProjections`
  étendu : chaque projection porte `actionId`, `coordsSatelliteId` et
  `ghostBaseCss` (CSS d'apparence sans le wrapper preview, pour le
  fantôme). Tests `c18HotspotDragInPreview.test.tsx` (5 cas — toggle,
  hint, drag → commit, Échap → annule, pointerdown hors mode édition
  ignoré). Polyfill `PointerEvent = MouseEvent` pour jsdom.
- 2026-05-08 — **Plan détaillé C18.3 rétrospectif** ajouté à l'Annexe D
  (format aligné C18.1 / C18.2 — pré-requis, fichiers à lire, phase
  questions Q-C18.3-1 à -11, périmètre, critères de fin). Permet de
  garder trace du cadrage en cas de retour debug ou d'archivage.
- 2026-05-08 — **Tableau Stratégie de découpage Annexe D mis à jour**
  (statuts C18.1–C18.5, ajout colonne « Statut »). Note transverse
  ajoutée sur la sémantique pixels brute de `appearance.ui_w` /
  `ui_h`, avec renvoi vers le nouveau chantier C22 ouvert au backlog
  §7 (cf. ci-dessous).
- 2026-05-08 — **Nouveau chantier C22 — Hotspots responsives** ajouté
  au backlog §7 (point soulevé par l'utilisateur en cadrage C18.4) :
  les dimensions hotspot doivent couvrir la même portion d'image
  panoramique quel que soit l'écran, ce qui n'est pas le cas
  aujourd'hui (legacy `editor-shared-ui-utils.js:74-83` + React
  `hotspotAppearance.ts:47-66` stockent en pixels CSS bruts). C22
  cadre la migration : choix d'unité (pourcentage container vs
  degrés FOV), ajout `ui_w_pct` / `ui_h_pct` ou bump schemaVersion 3,
  adaptations runtime joueur + éditeur React + éditeur legacy +
  migration projets pré-C22. **C18.4 et C18.5 ne sont pas bloqués
  par C22** — ils livrent sur la sémantique pixels actuelle (cohérent
  legacy) ; C22 changera l'unité derrière sans retravail majeur de
  l'UI de C18.4.
- 2026-05-08 — **Plans détaillés C18.4 et C18.5 cadrés (validation
  utilisateur)**.
  - **C18.4 — pivot d'approche** : abandon de la réutilisation de
    `HotspotAppearancePopup` (draft initial). Périmètre redéfini
    autour de **handles aux 4 coins** apparaissant à la sélection
    en mode édition (façon logiciel de dessin), resize ancré au
    centre, Shift = ratio fixe, bornes 16-480px sur `ui_w` /
    `ui_h`. Bordure dashed rouge de l'aperçu ajustée
    (`outline-offset` ~6-8px) pour rester visible sur hotspot
    transparent/petit. Couleur / transparence / bordure restent
    accessibles via `CoordsOptionsPopup` → `HotspotAppearancePopup`
    pour C18.4 ; modale flottante d'apparence dans l'aperçu notée
    en *Évolutions futures C18*.
  - **C18.5 — précisions périmètre** : iframe sandbox confirmée
    (Q-C18.5-1 retenue (b)). Affichage seul + bouton fermer
    fonctionnel ; aucune simulation d'état joueur. REQ / PWD
    affichés sans logique succès/échec (renvoyé en *Évolutions
    futures* — chantier "inventaire virtuel éditable" : bandeau
    avec checkboxes par objet + simulateur de visibility-rules).
    Selector affiché mono-niveau de profondeur en MVP. Découpage
    en 2-3 sous-commits laissé à Cursor.
- 2026-05-08 — **C18.4 livré (code)** : resize des hotspots via 4 handles
  aux coins dans l'aperçu scène en mode édition. `<ScenePreviewModal>`
  étendu avec états `dragCandidate` / `selection` / `resize` ; le
  pointerdown sur un hotspot ouvre désormais un *candidat* — promotion
  en drag dès que le pointer franchit 4 px, sinon pointerup avant seuil
  → sélection (handles visibles). Resize ancré au centre (`pitch`/`yaw`
  fixes) : `new_w = clamp(2*|dx|, 16, 800)`, idem `h` ; Shift maintenu
  → échelle dominante appliquée aux 2 dimensions (ratio préservé).
  Pendant le drag d'un handle, un `<style>` override transitoire
  (`.{cssClass} { width / height }`) donne le feedback visuel sans
  écrire dans le store ; `pointerup` commit `appearance.ui_w / ui_h`
  via `mergeHotspotAppearance` + `buildCustomCssFromAppearance` ;
  Échap annule sans commit (override retiré, taille initiale
  restaurée). Nouveau composant `HotspotResizeHandles.tsx` (rAF qui
  re-aligne les 4 divs sur le `getBoundingClientRect()` du hotspot,
  fallback sur `document` quand le viewer container n'a pas le
  hotspot — utile en tests). `NodalPanoramaViewer` étend son handle
  imperative avec `getViewerContainer()`. Variante CSS `preview` de
  `sceneHotspotProjections` passe à `outline-offset: 6px` (la
  variante `picker-bg` garde `2px`). Hint enrichi FR/EN — drag /
  sélection / resize / Shift = ratio fixe ; live `↔ W×H` pendant un
  resize.   Tests `c18HotspotResize.test.tsx` (7 cas — sélection au
  clic court, désélection au clic ailleurs, reset au toggle off,
  resize centré, ratio Shift, commit pointerup, Échap annule).
  Tests C18.3 mis à jour : `pointerdown` n'ouvre plus le ghost
  immédiatement → ajout d'un `pointermove` > 4 px avant la vérif.
- 2026-05-08 — **C18.4-fix.1** : centrage Pannellum après changement
  de `width/height`. Diagnostic via la source `pannellum.js@2.5.7`
  (CDN jsDelivr) — `Ca(a)` (ligne ~75) centre via
  `f[0]+=(canvasW-a.div.offsetWidth)/2` à chaque appel ; `Ca` est
  invoqué dans la boucle `Fa()` (ligne ~66, `b.hotSpots.forEach(Ca)`)
  qui ne tourne qu'en présence d'animation ou de drag caméra. Sans
  rotation, modifier `width/height` via CSS laisse la transform
  Pannellum stale → le hotspot paraît grandir vers le bas-droite
  (top-left visuellement fixe). Solution : exposer
  `forceHotSpotsRecompute()` sur `NodalPanoramaViewerHandle` qui
  invoque `viewer.setUpdate(false)` (déclenche `G() → ca() → Fa()`
  une fois, sans changement de pitch/yaw/hfov visible). Appel
  systématique pendant chaque `pointermove` du resize, et après chaque
  transition `resize !== null → null` (commit / Échap / toggle off)
  via un `useEffect` gardé par `prevResizeRef` (sinon le rAF parasite
  consommait le slot des tests). Q-C18.4-3 (ancrage centre) reste
  valable et fonctionne désormais visuellement.
- 2026-05-08 — **C18.4-fix.2** : `disableKeyboardCtrl: true` +
  `keyboardZoom: false` ajoutés à la config `pannellum.viewer(...)`.
  Sans ce fix, Shift maintenu pendant le resize ratio-fixe
  déclenchait un zoom Pannellum (raccourci clavier). Le zoom à la
  molette reste actif (`mouseZoom` non touché). Aligné avec l'usage
  éditeur : pas de navigation clavier dans l'aperçu, seul l'effet
  visuel compte.
- 2026-05-08 — **C18.4-fix.3** : crash WebGL au pointerup du resize
  (« your browser does not have the necessary WebGL support… » +
  `WebGL: INVALID_VALUE: texImage2D: no image`). **Cause racine**
  identifiée via la trace + lecture de `pannellum.js@2.5.7` :
  `setUpdate(a)` (ligne 105) fait `C===p?pa():G()` — si le renderer
  interne `C` est `undefined` (viewer en cours de destruction ou pas
  fini de s'initialiser), `setUpdate` retombe dans `pa()` qui
  ré-initialise WebGL et tente un `texImage2D` sur une texture pas
  encore chargée → crash. Le viewer était en re-création parce que
  l'`useEffect [panoramaUrl, hotSpots]` détruit + recrée à chaque
  changement de référence du tableau `hotSpots` ; le commit
  `updateNodeData` régénère `projections` (nouvelle référence) à
  chaque pointerup, même si pitch/yaw/cssClass restent identiques.
  **Double fix** :
  1. Stabilisation du dep dans `NodalPanoramaViewer` :
     `hotSpotsKey` (signature `pitch|yaw|cssClass` joinée) remplace
     la référence brute. Pannellum n'utilise que ce triplet — les
     autres champs (`ghostBaseCss`, etc.) sont consommés via
     `hotSpotsRef.current` à la prochaine création légitime du
     viewer (changement réel de pitch/yaw ou ajout/retrait de
     hotspot). Bénéfice secondaire : plus de flash de chargement
     panorama à chaque pointerup C18.4 (et C18.3).
  2. Safety check dans `forceHotSpotsRecompute` :
     `getRenderer()` consulté avant `setUpdate(false)` ; si renderer
     null/undefined → skip silencieux. Couvre les cas résiduels où
     un appel concurrent frapperait pendant un destroy/init.
  Tests `c18HotspotResize.test.tsx` étendus (9 cas) — vérification
  que le viewer n'est pas re-créé après commit pointerup, et que
  `setUpdate` n'est jamais appelé quand le renderer est null.
- 2026-05-08 — **C18.5.1 livré** : infrastructure overlay preview joueur
  + actions msg + pick. Selon plan amendé (option a-i) :
  - **`PlayerPopupPreview`** étendu avec prop optionnelle `interactive?:
    { onClose, onConfirm?, onChoice? }` (rétrocompatible — les éditeurs
    `MsgContentPopup` / `PickContentPopup` / `GotoContentPopup` /
    `ReqContentPopup` / `PwdContentPopup` / `SelectorContentPopup` ne
    passent pas la prop, leur preview reste disabled comme avant). Quand
    `interactive` est fourni : `disabled=false`, `cursor: "pointer"`,
    handlers branchés. Ajout d'une prop `onBackdropClick?` (ferme au
    clic hors panel — vérification `event.target === event.currentTarget`
    pour ne pas fermer au clic dans le panel).
  - **`playerPopupThemeToPlayerOverlayChrome`** : variante de
    `MsgPreviewChrome` avec viewport `position: fixed; inset: 0;
    z-index: 10050; cursor: pointer` (reste du panel inchangé pour
    fidélité visuelle 100%).
  - **`buildPlayerPreviewVariant(action, locale)`** helper pur (pas de
    React, pas de store) : retourne `{ kind, html, buttonLabel,
    titleText? }` pour msg + pick. Les autres types renvoient `null`
    (à compléter en C18.5.2).
  - **`<PlayerPreviewOverlay>`** : abonné au store via
    `useSyncExternalStore`, lit l'action courante, monte
    `<PlayerPopupPreview>` avec mode interactive + viewport plein
    écran. Aucune mutation du store. Échap géré par le parent
    (`<ScenePreviewModal>`) avec priorité (1) overlay → (2) resize →
    (3) drag → (4) selection → (5) ferme modale.
  - **`<ScenePreviewModal>`** branché : `onBodyPointerDown` distingue
    désormais 4 cas (édition + hotspot → drag candidate ; édition +
    hors hotspot → désélection ; **read-only + hotspot → ouvre overlay
    preview joueur** ; read-only + hors hotspot → no-op). Bascule
    toggle off (`exitEditMode`) et bascule toggle on (nouveau
    `enterEditMode`) ferment l'overlay si actif. `data-edit-mode` /
    `data-player-preview` exposés sur l'élément racine pour CSS et
    tests. Curseur `pointer` read-only / `grab` édition via style
    inline conditionnel.
  - **`c18PlayerPreview.test.tsx`** : 12 tests (clic read-only ouvre
    overlay msg avec bodyHtml + label ; clic pick affiche titleText
    itemName ; clic édition n'ouvre pas overlay ; clic bouton
    principal ferme ; Échap ferme overlay sans fermer modale ; toggle
    on pendant overlay ferme overlay ; rétrocompat sans `interactive`
    = boutons disabled ; clic backdrop ferme ; clic dans panel ne ferme
    pas ; aucune mutation du store ; clic hors hotspot ne fait rien ;
    diagnostic auto-création coords-options).
  Suite C18 globale : 43 tests verts (5 fichiers).
  Commit : `feat(nodal): C18.5.1 overlay preview joueur (msg + pick)
  via PlayerPopupPreview interactif`.
- 2026-05-11 — **C18.5.2 livré** : actions **goto**, **req**, **pwd**
  + **selector multi-niveau** (stack `navStack` dans
  `<PlayerPreviewOverlay>` ; branche `SelectorPreviewBranch` ; enfants
  via `getOrderedSelectorChildActionIds` — même ordre que
  `SelectorContentPopup` : parentId nodal ou edges flow + tri `y`).
  Clic sur un choix → `onDrill` push `childId` ; enfant **selector**
  → nouveau niveau ; enfant terminal (msg / pick / goto / req / pwd) →
  `buildPlayerPreviewVariant` + bouton **← Retour** (`fixed`, z-index
  10051, classe `.nodal-player-preview-back` dans `NodalCanvas.css`)
  quand `navStack.length > 1` ; pop au clic. Selector sans enfant :
  `data-selector-empty="1"`, unique bouton fermer (corps + titre
  menu inchangés). **Images dans body Quill** : helper
  `rewriteQuillHtmlForPlayerPreview(html, project, locale)` — `<img
  src>` non `http(s):` / `blob:` / `data:` → remplacé par `<p
  class="nodal-preview-media-fallback">` texte « Média : *URL* » /
  « Media: » (EN). `project` réservé pour résolution bundle future.
  **`buildPlayerPreviewVariant`** étendu : goto + req (variant
  `button`) + pwd (variant `input`, fallback label Valider/Submit).
  Fichiers : `selectorPreviewChildren.ts`,
  `rewriteQuillHtmlForPlayerPreview.ts`, `PlayerPreviewOverlay.tsx`
  refactor, `buildPlayerPreviewVariant.ts`, `NodalCanvas.css`,
  `c18PlayerPreview.test.tsx` (+5 tests C18.5.2 : goto, req, pwd,
  selector drill+retour, img fallback). Suite C18 : **48** tests
  verts (5 fichiers). Commit : `feat(nodal): C18.5.2 preview joueur
  (goto + req + pwd + selector + img fallback)`.
  **Validation manuelle** utilisateur post-C18.5.1 (S-BOX z-order,
  démo image) déjà notée entrée 2026-05-11 ci-dessus.
- 2026-05-11 — **C18.5.3 livré — audio + polish (ARIA + badge)**.
  Réponses utilisateur (cadrage) : Q1 (c) audio complet — SFX hotspot +
  SFX selector + ambiance scène en loop ; Q2 = ARIA + audit responsive
  + badge mode preview (pas de focus management ni de fade) ; Q3 (c) =
  pas de test automatisé pour l'audio (validation manuelle navigateur,
  JSDOM ne joue pas l'audio).
  Nouveau module `playerPreviewAudio.ts` : classe
  `PreviewAudioController` (deux canaux — SFX monoflux et ambiance loop
  idempotente) + helpers `resolveSceneAmbiance(state, sceneId)` (premier
  `MediaAudioNode` lié par edge meta scène → media-audio, miroir
  `resolveScenePanoramaDisplayUrl`) et `resolveActionSfx(action)`
  (source canonique = `action.sfx`, cohérent avec sérialisation
  `toProjectJson`). Volume borné [0..1], `Audio.play()` enveloppé en
  `try/catch` (politique autoplay : tous les SFX sont déclenchés par
  un clic utilisateur, donc ça passe en pratique).
  `<ScenePreviewModal>` instancie le contrôleur lazy via `useRef` +
  `getAudioCtrl()` ; 3 `useEffect` : reset à la fermeture
  (`sceneId == null`) → `destroy()` ; lecture/maj ambiance scène à
  chaque changement de scène ou de snap (volume édité) ; lecture SFX
  hotspot à l'ouverture de `playerPreviewActionId`, stop à la
  fermeture (équivalent runtime joueur `audioSys.stopSFX()` avant
  chaque popup).
  `<PlayerPreviewOverlay>` accepte une prop optionnelle `onPlaySfx` ;
  `SelectorPreviewBranch.onDrill` la déclenche avec le SFX de l'enfant
  avant le push `navStack` (alignement runtime `runSelectorChoice`
  ligne ~2105 `editeur-generate.js`). Côté `<ScenePreviewModal>`,
  `onPlaySfx` est relayé vers `getAudioCtrl().playSfx`.
  ARIA : `<PlayerPopupPreview>` enrichi avec `role="dialog"`,
  `aria-modal="true"`, `aria-labelledby={titleId}` (si `titleText`) ou
  `aria-label={closeAriaLabel}` (fallback), `aria-describedby={bodyId}`
  pointant vers le `<div.play-html-rich>`. IDs via `useId()`.
  Badge **« Aperçu interactif (lecture seule) »** : composant
  `<PreviewBadge>` rendu dans le wrapper `<PlayerPreviewOverlay>`,
  `position: fixed; top: 16; centered; z-index: 10051; pointer-events:
  none` — `role="status"`, `aria-live="polite"`. Affiché aussi dans
  `SelectorPreviewBranch` (passé en prop pour ne pas dupliquer).
  **Audit responsive** : `panel` déjà `maxWidth: 420; width: 100%;
  maxHeight: 85%` + viewport `padding: 24; flex centered` ⇒ mobile et
  tablette OK sans changement CSS supplémentaire. Documenté.
  Test backdrop adapté (recherche viewport via parent du chrome au lieu
  du 1er `<div>` — qui est désormais le badge). Suite C18 : **48**
  tests verts. Aucune nouvelle erreur typecheck (3 erreurs préexistantes
  vérifiées baseline). Commit : `feat(nodal): C18.5.3 preview joueur
  audio + ARIA + badge (chantier C18.5 clos)`.
- 2026-05-11 — **C18.5.2-fix.1 — bouton retour dans le panel**
  (retour utilisateur : « il manque les boutons de retour, dans les
  selector vu qu'il est un peu différent que celui du generate
  game »). Le runtime joueur (`js/editeur-generate.js` ligne ~2284,
  `renderSelectorPanel`) place le bouton **← Retour** dans la top
  bar du panel selector (à gauche, `visibility:hidden` au niveau
  racine pour préserver le layout). La preview C18.5.2 mettait à la
  place un bouton positionné `fixed` en haut-gauche de l'écran
  (classe `.nodal-player-preview-back`) — visible mais visuellement
  hors panel, donc différent du runtime. **Fix** :
  `<PlayerPopupPreview>` étendu avec deux props rétrocompatibles
  `onBack?: (() => void) | undefined` et `backLabel?: string |
  undefined` (classe `.nodal-player-popup-back`, style inline
  aligné runtime : padding 6/10, fond `rgba(255,255,255,0.15)`,
  radius 4, font hérité). `<PlayerPreviewOverlay>` passe `onBack`
  uniquement quand `navStack.length > 1` ; `SelectorPreviewBranch`
  pareil. Bouton externe `.nodal-player-preview-back` (CSS + JSX)
  retiré. Test `selector drill+retour` adapté pour cibler
  `.nodal-player-popup-back`. Suite C18 : **48** tests verts
  (toujours 5 fichiers). Aucune nouvelle erreur typecheck (les 3
  erreurs `playerPreview/*` restantes — `buildPlayerPreviewVariant`
  L74, `selectorPreviewChildren` L14, `PlayerPreviewOverlay` L117
  — sont **pré-existantes** depuis C18.5.2, vérifié par
  `git stash` baseline). **Évolution future** notée par
  l'utilisateur en marge : *inventaire virtuel* pour pouvoir tester
  les REQ rewards et tous les réglages visibility-rules (objets
  collectés) — chantier dédié, hors C18.
- 2026-05-11 — **Retours UX carte nodale (post-C18.5.1) — validation
  manuelle OK** (utilisateur, après tests navigateur) :
  - **S-BOX au premier plan** : correctif `style.zIndex: -1` sur les
    nœuds `sceneBoxNode` dans `toReactFlowNodes`
    (`xflow/react/src/view/nodalReactFlowProjection.ts`) pour forcer
    le cadre S-BOX en arrière-plan ; les médias / actions ajoutés hors
    parentId ne sont plus interceptés par la hitbox du cadre. Commit
    `fix(nodal): UX carte — S-BOX en arrière-plan + nœud image dans
    démo` (`4d0526e`, puis push). Backlog complété `docs/todo.md`.
  - **Démo d'accueil enrichie** : un nœud **image média par scène**
    (Hall + Lab), lié par **edge meta** `scène → media-image` (pas
    flow), URL par défaut = placeholder grille équirectangulaire
    (`DEFAULT_MEDIA_IMAGE_PLACEHOLDER_URL`, aligné
    `EditorCore.DEFAULT_SCENE_PANORAMA_PLACEHOLDER_URL`). Commit
    `fix(nodal): démo d'accueil — un nœud image par scène avec edge
    meta + URL placeholder` (`e1cb736`). `resolveScenePanoramaDisplayUrl`
    sert l'aperçu 360° sans `panoramaUrl` renseigné sur chaque scène.
  - **Menu flottant S-BOX (tablette)** : inchangé — reste noté dans
    `docs/todo.md` (alternative au clic droit, chantier UI futur).
- 2026-05-08 — **Amendement plan C18.5** : avant ouverture de
  C18.5.1, exploration de l'existant côté React révèle un composant
  `PlayerPopupPreview` (popups+thème) déjà utilisé par tous les
  éditeurs nodaux. Bascule cible Q-C18.5-1 de **(b) iframe sandbox**
  → **(a-i) extension `PlayerPopupPreview`** (prop `interactive`
  rétrocompatible). Q-C18.5-2 amendée pour selector multi-niveau
  full_nav (au lieu de 1 niveau) — c'est le selector qui motivait
  initialement l'iframe. Q-C18.5-7 amendée pour image en C18.5.2
  (au lieu de 5.3). Audio reste en 5.3. Texte de la spec annoté
  "voir bloc d'amendements en tête" ; rien n'est supprimé pour
  traçabilité. Si à l'usage la fidélité (a-i) s'avère insuffisante,
  bascule (b) reste possible en chantier futur.
- 2026-05-08 — **C18.4-fix.4** : la caméra Pannellum sautait à la
  position initiale (0/0) au pointerup d'un drag de hotspot (C18.3),
  parce que la recréation du viewer (légitime cette fois — le drag
  change pitch/yaw du hotspot, donc `hotSpotsKey` change, donc
  l'effect re-run) repartait sur `initialPitchRef.current` /
  `initialYawRef.current` figés au mount. Avant fix.3 le bug était
  masqué par le flash de chargement panorama (`hotSpots` ref
  changeait à chaque pointerup, recréation systématique → on ne
  voyait pas le saut comme une régression). **Fix** : à la cleanup
  du `useEffect`, capturer `viewer.getPitch()` / `getYaw()` /
  `getHfov()` (ajouté au type `PannellumViewer`) dans les refs
  `initialPitchRef` / `initialYawRef` / `initialHfovRef` (nouveau)
  avant `destroy()`. Le viewer recréé reprend la vue à l'identique.
  L'`hfov` n'est passé au config que s'il a été capturé (sinon on
  laisse le défaut Pannellum 100°, évitant un `hfov: 0` au tout
  premier mount). Test `c18HotspotDragInPreview.test.tsx` étendu
  (6 cas) — vérification que le pitch/yaw/hfov de la dernière
  création viewer correspondent à ceux capturés pré-cleanup.

