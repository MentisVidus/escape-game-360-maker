# Chantier C19 — Audio preview / écouter

**Branche** : `feat/c19-audio-preview` (depuis `feat/nodal-map`).
**Date d'ouverture** : 2026-05-14.
**Date de clôture** : 2026-05-15.
**Version de clôture** : 1.11.

---

## Annexe D — Chantier C19 (en cours)

> **Vivante** (§8.4) — journal de décisions, plans détaillés, traces
> de bugs et fixes. Sera synthétisée dans **Annexe B — C19** à la
> clôture du chantier puis archivée sous `docs/archives/chantier_19.md`.

**Date d'ouverture** : 2026-05-14.
**Branche** : `feat/c19-audio-preview` (depuis `feat/nodal-map`).
**Statut** : cadrage validé en phase questions (Q-C19-1 à Q-C19-18,
2026-05-14). Plans détaillés **C19.1** et **C19.2** rédigés en one-shot
dans cette Annexe D — prêts à être livrés à Cursor sous-chantier par
sous-chantier.

### Scope figé

Synthèse des décisions issues de la phase questions (Claude ↔ user,
2026-05-14) :

- **Périmètre élargi vs spec §7 → C19 initiale** : la spec listait
  uniquement « popup audio global + popups media nodes audio ». Le
  cadrage a confirmé que **toute entrée audio dans l'éditeur** doit
  bénéficier du preview unitaire :
  - **Global** — `meta.settings.audio.url` (popup `AudioGlobalSettingsPopup`
    C10.2.d) → channel `global`.
  - **Ambiance** — nœud `media-audio` rattaché à une **scène** via
    edge `meta` → channel `ambient`.
  - **SFX** — nœud `media-audio` rattaché à un **hotspot/choice**
    (action) via edge `meta` → channel `sfx`.
- **Édition unique via `MediaEditorPopup`** pour ambient ET sfx (pas
  de UI séparée). La popup est partagée avec les media-image ; le
  bouton preview est conditionnel `node.type === "media-audio"`.
  Les popups `CoordsOptionsPopup` et `ChoiceOptionsPopup` contiennent
  uniquement un **message d'aide** ("SFX : relier un nœud média audio
  à l'action via handle meta et régler l'URL / le volume dans la
  popup média audio") — pas de champ URL SFX éditable.
- **Distinction ambient/SFX dérivée du parent du nœud `media-audio`**
  (Q-C19-14 a) — la sémantique n'est pas un flag explicite mais
  inférée du graphe : helper `getMediaAudioChannel(state, mediaNodeId)`
  qui parcourt les edges `meta` ciblant ce nœud, identifie le parent,
  et retourne `"ambient"` si le parent est une scène (`SceneNode`),
  `"sfx"` si le parent est une action en État 2 (hotspot) ou État 3
  (choice). Cas orphelin : retourne `"ambient"` par défaut (loop
  innocuf en preview, ne sera pas auto-déclenché en aperçu 360° car
  `resolveSceneAmbiance` n'y trouvera pas de scène source).
- **⚠ Distinction modèle nodal vs sérialisation runtime** — point de
  confusion à ne pas répéter (cf. itération de cadrage 2026-05-14) :
  - **Modèle nodal (source de vérité, store)** : nœuds `media-audio`
    avec edge `meta` vers leur parent (scène ou action). C'est ce
    que l'utilisateur édite et ce que le projet sérialise.
  - **Sérialisation runtime aplatie** (`toProjectJson`) : projette le
    media-audio enfant action vers `action.sfx = { url, volume }`,
    et le media-audio enfant scène vers `scene.media.ambiance` (via
    `editor-shared-nodal-to-dom.js` côté DOM legacy + `toProjectJson`
    côté React). Ces représentations aplaties sont consommées par le
    runtime joueur et par `resolveActionSfx` / `resolveSceneAmbiance`
    dans `playerPreviewAudio.ts`. **Elles ne sont pas la source
    canonique d'édition** — Cursor doit auditer en C19.1 comment la
    synchronisation media-audio → `action.sfx` se fait aujourd'hui
    (peut-être déjà câblée via reconcile/serialize, peut-être pas
    encore — si manquante, cabler en C19.1 ou signaler comme follow-up
    selon ampleur).
- **3 channels parallèles, pas de single player partagé** (Q-C19-3
  amendé) — pour permettre la balance audio en condition de jeu, le
  service expose 3 channels indépendants (global / ambient / sfx),
  chacun avec **un seul son actif max**. Total = jusqu'à 3 sons
  simultanés.
- **Loop / auto-stop par channel** (Q-C19-4 amendé) :
  - `global` : **loop** (musique de fond, comme runtime).
  - `ambient` : **loop** (bruits d'ambiance scène, comme runtime).
  - `sfx` : **auto-stop** (son d'interaction one-shot, comme runtime).
- **2 endroits d'usage** :
  - **Cas 1 — Popup unitaire** : bouton play dans chaque popup audio
    joue **uniquement** le son de cette popup (sur SON channel).
    N'affecte pas les autres channels (Q-C19-13 b) — comportement
    simple, pas de stop forcé sur les autres. Auto-stop SON channel à
    `unmount` du composant (Q-C19-5 a). Sert à un premier réglage
    volume « au feeling » sur le son isolé.
  - **Cas 2 — Aperçu scène 360°** (modale C18.1/C18.5) : bandeau audio
    dans la barre haut. **Auto-play** global+ambient à l'ouverture
    (Q-C19-15 c, toggle 🔊 par défaut ON). **3 sliders** (Global /
    Ambiance / Dernier SFX) + **bouton replay dernier SFX**. SFX au
    clic hotspot en **mode interactif C18.5 uniquement** (Q-C19-16 mixte
    : (a) intent principale, complétée par le bouton replay du bandeau
    pour itérer la balance). C'est là que la balance audio « vraie »
    s'entend — les 3 channels jouent en condition de jeu réelles.
    `stopAll()` au unmount de la modale.
- **Volume preview = valeur stockée 1:1** (Q-C19-8 a, Q-C19-18 a) — le
  service lit `meta.settings.audio.volume` (global) et `mediaNode.volume`
  (media-audio). Modifier le slider en popup OU en bandeau aperçu 360°
  écrit via `updateNodeData` (ou équivalent meta) — effet immédiat
  partout (popup, bandeau, runtime). Pas de slider preview indépendant.
- **Slider volume live `input` event** (Q-C19-7 a) — `audio.volume = v`
  est un setter HTML quasi-gratuit, aucun throttle nécessaire (~0 µs/
  event, max ~200 events/seconde sur un drag complet).
- **Réécriture TS pure côté React** (Q-C19-10 a) — pas d'appel au
  module legacy `js/editor-audio-preview.js` (couplé DOM legacy
  `#globalAudioUrl`). Réécriture propre dans
  `xflow/react/src/services/audioChannelsService.ts`. Le legacy reste
  en place tant que la vue de vérification (C10.4) existe.
- **Architecture service singleton hors React** (Q-C19-9 a) — le state
  audio est intrinsèquement impératif (objet `<audio>` mutable,
  événements DOM `timeupdate`/`ended`/`error`). Service mince hors-
  React (`audioChannelsService.ts`) avec API typée + observable simple ;
  composants React fins qui s'y abonnent (pas de Zustand pour ça —
  abuserait du store nodal pour de l'état non-projet).
- **Audit goto C18.5 obligatoire en C19.2** (Q-C19-17 a sous réserve)
  — l'utilisateur signale que les goto en mode interactif C18.5 ne
  fonctionneraient pas correctement aujourd'hui (à confirmer). Le
  journal `docs/archives/chantier_18.md` (C18.5.2) mentionne pourtant
  que goto/req/pwd/selector/img sont implémentés. **Cursor doit
  auditer en début C19.2** : si bug, diagnostic + fix `C19.2-fix` AVANT
  d'implémenter la transition audio ; si OK, hooker `stop('ambient')`
  + `play('ambient', newSceneAmbientUrl)` sur la navigation.
- **`playerPreviewAudio.ts` existant** — fichier déjà présent
  (`xflow/react/src/view/playerPreview/playerPreviewAudio.ts`, posé en
  C18.5.3 « preview joueur audio + ARIA + badge »). **Audit obligatoire
  C19.1** : comprendre son rôle, voir s'il est à intégrer dans le
  service multi-channel (refactor) ou à laisser de côté (usage
  spécifique C18.5). Ne PAS dupliquer la logique audio.
- **Tests Vitest** (Q-C19-12) : périmètre figé — (i) `<audio>` mocké
  au niveau du service ; (ii) `play(g, urlA)` + `play(a, urlB)` → les
  deux actifs simultanément ; (iii) `play(g, urlC)` écrase A sur le
  channel `global` uniquement ; (iv) `setVolume(channel, v)` →
  `audio.volume` mis à jour ; (v) unmount du `<AudioPreviewButton>`
  stoppe SON channel ; (vi) C19.2 — mount modale aperçu 360° → service
  reçoit `play('global', ...)` + `play('ambient', ...)` ; (vii) click
  mock hotspot SFX en mode interactif → `play('sfx', ...)` + update
  `lastSfx` ; (viii) bouton replay → `play('sfx', lastSfx.url)` ;
  (ix) navigation goto → `stop('ambient')` puis `play('ambient', ...)` ;
  (x) unmount modale → `stopAll()`. Pas de test du rendu audio réel
  (jsdom limité), validation manuelle smoke FR/EN.
- **Erreurs de chargement** : icône ⚠ + tooltip « Audio non chargé »
  sur le bouton, pas de blocage popup. Détail à laisser à Cursor.
- **Pas d'autoplay forcé sans user gesture** : l'auto-play à
  l'ouverture de la modale aperçu 360° (Cas 2) est précédé du clic
  utilisateur qui ouvre la modale = user gesture valide. OK navigateur.

### Stratégie de découpage

| # | Périmètre | Dépend de | Type | Statut |
|---|-----------|-----------|------|--------|
| **C19.1** | Service `audioChannelsService.ts` (3 channels indépendants, loop dérivé du channel : global+ambient = loop, sfx = no-loop, volume indépendant, error handling, observable) + composant partagé `<AudioPreviewButton>` (▶/⏸ + jauge progress + tooltip erreur, auto-stop SON channel à unmount) + intégration dans **2 popups** : `AudioGlobalSettingsPopup` (channel `global`) et `MediaEditorPopup` quand `node.type === "media-audio"` (channel résolu via `getMediaAudioChannel(state, mediaNodeId)` : parent scène → `ambient`, parent action → `sfx`) + audit synchronisation media-audio → `action.sfx` (cf. note distinction modèle/sérialisation) + refactor de `PreviewAudioController` (suppression, branchement direct des 2 sites consommateurs `ScenePreviewModal` + `PlayerPreviewOverlay` sur le service ; conservation des helpers purs `resolveSceneAmbiance` / `resolveActionSfx`) | — | code | à livrer |
| **C19.2** | Bandeau audio dans header modale aperçu scène 360° (`ScenePreviewModal` + extension `PlayerPreviewOverlay` mode interactif) : toggle 🔊 (par défaut ON), 3 sliders (Global/Ambiance/Dernier SFX, masqués si non applicables), bouton replay dernier SFX. Auto-play global+ambient au mount (si définis). SFX au clic hotspot en mode interactif C18.5 (avec update `lastSfx` exposé par le service). **Audit goto C18.5 préalable** : si bug, fix `C19.2-fix` AVANT transition audio ; si OK, hook `stop('ambient')` + `play('ambient', newAmbientUrl)` sur navigation. `stopAll()` au unmount modale. Toggle OFF → stopAll ; ON → reprise auto-play | C19.1 | code | à livrer |

Convention : un commit par sous-chantier ; fixes numérotés
`C19.x.y-fix` si correctifs en cours de chantier (cf. §8.2 + §2.2 du
briefing CLAUDE.md). C19.2 dépend de C19.1 (utilise le service +
composant). Ordre d'exécution : C19.1 d'abord, C19.2 ensuite.

### Décisions de design

- **Service `audioChannelsService.ts`** (nouveau,
  `xflow/react/src/services/audioChannelsService.ts`) — singleton hors
  React. API typée :
  ```ts
  type AudioChannel = "global" | "ambient" | "sfx";

  interface AudioChannelState {
    isPlaying: boolean;
    currentSrc: string | null;
    progress: number; // 0..1
    error: string | null;
    lastSfx?: { url: string; nodeId: string; volume: number } | null; // sur channel "sfx" uniquement
  }

  interface AudioChannelsService {
    play(channel: AudioChannel, url: string, opts: { volume: number; loop: boolean; nodeId?: string }): void;
    stop(channel: AudioChannel): void;
    stopAll(): void;
    setVolume(channel: AudioChannel, volume: number): void;
    subscribe(channel: AudioChannel, listener: (state: AudioChannelState) => void): () => void; // returns unsubscribe
    getState(channel: AudioChannel): AudioChannelState;
  }
  ```
  - 3 instances `<audio>` internes (une par channel), créées au premier
    `play()` du channel et conservées (réutilisation).
  - `loop` propagé sur `audio.loop`.
  - `nodeId` stocké dans le state pour permettre le replay du dernier
    SFX (channel `sfx` uniquement).
  - Cleanup natif au `stop()` : `audio.pause()` + `audio.removeAttribute("src")` + `audio.load()`
    (libère le buffer). Listeners reset.
  - Event `ended` sur channel `sfx` → reset `isPlaying=false` mais
    conserve `lastSfx` (pour replay).
  - Event `timeupdate` → update `progress = currentTime / duration`.
  - Event `error` → state `error = "Audio non chargé"`.
- **Composant partagé `<AudioPreviewButton>`** (nouveau,
  `xflow/react/src/view/components/AudioPreviewButton.tsx`) — props :
  `{ url: string; channel: AudioChannel; volume: number; loop: boolean; nodeId?: string; className?: string }`. Subscribe au service au mount,
  unsubscribe + auto-stop SON channel au unmount. UI : icône ▶/⏸,
  jauge progression CSS sous le bouton (réutilisable en CSS module ou
  inline style), tooltip erreur si `state.error`.
- **Helper `getMediaAudioChannel(state, mediaNodeId)`** dans
  `xflow/react/src/services/audioChannelsService.ts` (ou colocated) :
  parcourt `state.edges` pour trouver l'edge `meta` ciblant
  `mediaNodeId`, identifie le parent (`sourceId`), et retourne :
  - `"ambient"` si parent est dans `state.scenes`
  - `"sfx"` si parent est dans `state.actions` (toute action — État 2
    hotspot OU État 3 choice)
  - `"ambient"` par défaut si orphelin (loop innocuf, pas
    auto-déclenché ailleurs)
- **Loop dérivé du channel dans le service** (Q-C19.1-6) — pas exposé
  dans l'API `play`. Règle : `global`/`ambient` → `loop=true` ;
  `sfx` → `loop=false`. API simplifiée :
  `play(channel, url, { volume, nodeId? }): void`.
- **Intégration dans `AudioGlobalSettingsPopup`** : ajouter
  `<AudioPreviewButton url={meta.settings.audio.url} channel="global"
  volume={meta.settings.audio.volume} />` à côté de l'input URL. Pas
  de modification de la structure existante de la popup (Q-C10.2.d
  cohérence).
- **Intégration dans `MediaEditorPopup`** (popup partagée
  media-image + media-audio) : ajouter `<AudioPreviewButton>`
  conditionnellement quand `node.type === "media-audio"`, dans la
  même ligne que l'input URL + `MediaUploadButton` (placement Q-C19.1-3
  option A). Channel résolu via `getMediaAudioChannel(state, node.id)`.
  Volume = `node.data.volume`. NodeId = `node.id` (utile pour C19.2
  qui retient `lastSfx.nodeId` pour slider + replay).
- **Audit synchronisation media-audio → `action.sfx`** (Q-C19.1-2bis) :
  `action.sfx` est défini par défaut à `{ url: "", volume: 1 }` dans
  `reconcileAutoSatellites.ts` et `insertNodeAtAbsolute.ts`, mais
  Cursor doit confirmer **où et quand** cette projection est
  alimentée depuis le media-audio rattaché (probablement via un
  reconcile ou au moment de la sérialisation `toProjectJson`). Si
  manquante, deux options : (a) cabler en C19.1 (probable petit
  ajout dans `reconcileAutoSatellites` ou `toProjectJson`) ; (b)
  signaler comme follow-up séparé si l'ampleur dépasse C19. Sans
  cette projection, `resolveActionSfx` retourne toujours `null` →
  C18.5 SFX au clic hotspot ne fonctionnerait pas (à confirmer en
  smoke C18.5).
- **Refactor `playerPreviewAudio.ts`** : supprimer la classe
  `PreviewAudioController` (logique dupliquée du service). Conserver
  les fonctions pures `resolveSceneAmbiance(state, sceneId)` et
  `resolveActionSfx(action)` — ce sont des résolveurs de graphe
  alignés avec la sérialisation, réutilisés par C19.2 (auto-play
  ambient au mount + déclenchement SFX au clic hotspot). Brancher
  directement les 2 sites consommateurs (`ScenePreviewModal`,
  `PlayerPreviewOverlay`) sur le service en C19.1 — **zéro double
  implémentation au merge** (Q-C19.1-1).
- **Bandeau audio modale aperçu 360°** (C19.2) : nouveau composant
  `<ScenePreviewAudioBar>` dans
  `xflow/react/src/view/preview/ScenePreviewAudioBar.tsx`. Reçoit
  `{ globalAudio?: { url, volume }; ambientAudio?: { url, volume };
  interactive: boolean }`. Subscribe au state des 3 channels.
  Affichage : toggle 🔊, slider Global (si `globalAudio`), slider
  Ambiance (si `ambientAudio`), slider Dernier SFX + bouton replay
  (si `state.sfx.lastSfx` non null). Sliders modifient les valeurs
  stockées via `updateNodeData` / mutation `meta.settings`.
- **Auto-play modale aperçu 360°** : `useEffect` au mount de la
  modale → si `globalAudio` défini, `play('global', url, { volume,
  loop: true })` ; idem pour `ambientAudio` (channel `ambient`,
  loop=true). Si toggle 🔊 OFF avant mount (cas reload), pas
  d'auto-play. Au unmount → `stopAll()`.
- **SFX au clic hotspot en mode interactif C18.5** : dans
  `<PlayerPreviewOverlay>` ou son orchestrateur, au handler de clic
  hotspot, après affichage de la popup interactive, lookup SFX
  rattaché au hotspot (nœud `media-audio` enfant du hotspot/choice) ;
  si trouvé, `play('sfx', sfxUrl, { volume, loop: false, nodeId: sfxNodeId })`.
  Le service met à jour `state.sfx.lastSfx` automatiquement.
- **Bouton replay dernier SFX** : dans `<ScenePreviewAudioBar>`,
  visible si `state.sfx.lastSfx` non null. Au clic →
  `play('sfx', state.sfx.lastSfx.url, { volume, loop: false, nodeId: state.sfx.lastSfx.nodeId })`.
- **Toggle 🔊** : state local du composant `<ScenePreviewAudioBar>`,
  initialisé à `true`. OFF → `stopAll()`. ON → reprise auto-play
  global+ambient (re-trigger l'`useEffect` ou play impératif).
- **Audit goto C18.5** : avant d'implémenter la transition audio en
  C19.2, Cursor doit reproduire un goto en mode interactif C18.5 dans
  l'aperçu et vérifier qu'il bascule réellement vers la nouvelle scène
  (re-init Pannellum avec nouveau panorama, re-collecte hotspots, etc.).
  Si bug → `C19.2-fix` (diagnostic + fix avant transition audio). Si
  OK → hook `stop('ambient')` + `play('ambient', newAmbientUrl)` sur
  la navigation.
- **Z-index** : bandeau audio dans header modale = même niveau que
  les autres contrôles (close, toggle Édition C18.3). Pas de nouvelle
  variable CSS nécessaire.
- **Pas d'autoplay au mount des popups Cas 1** : seul le clic
  utilisateur sur ▶ déclenche la lecture. Pas de risque autoplay
  policy.

### Plan détaillé C19.1 — directives pour Cursor

**Pré-requis** : C18 livré (modale aperçu 360°, overlay interactif
exist). C19 cadrage validé (Annexe D ouverte).

**Contexte** : porter dans la couche React une API de preview audio
multi-channel. La référence comportementale est
`js/editor-audio-preview.js` (legacy, fonction
`editorAudioPreviewToggle`) qui gère un single player attaché au
`#globalAudioUrl` legacy. C19.1 réécrit en TS pure avec **3 channels
indépendants** (global / ambient / sfx) pour permettre la balance
audio en C19.2 (3 sons en parallèle dans l'aperçu scène 360°). Cette
itération livre le service + composant partagé + intégration dans 2
popups (audio global + media-audio édité).

**Fichiers à lire avant de coder** :

- `js/editor-audio-preview.js` — référence comportement legacy (toggle,
  cleanup, auto-stop).
- `xflow/react/src/view/playerPreview/playerPreviewAudio.ts` —
  **AUDIT OBLIGATOIRE** : ce fichier existe (posé en C18.5.3). Lire
  intégralement, comprendre son rôle, décider :
  - Si refactor : intégrer sa logique dans `audioChannelsService.ts`
    (channel approprié) et le supprimer.
  - Si conservation : documenter pourquoi (usage spécifique C18.5
    overlay) et tracer l'interaction avec le nouveau service.
- `xflow/react/src/view/popups/AudioGlobalSettingsPopup.tsx` —
  intégration channel `global`.
- `xflow/react/src/view/popups/MediaEditorPopup.tsx` — intégration
  conditionnelle quand `node.type === "media-audio"` ; channel
  résolu via `getMediaAudioChannel(state, node.id)`.
- `xflow/react/src/view/popups/CoordsOptionsPopup.tsx` +
  `xflow/react/src/view/popups/ChoiceOptionsPopup.tsx` — **lecture
  seule** pour comprendre le pattern UX (message d'aide « SFX : relier
  un nœud média audio à l'action »). PAS de modification de ces
  popups en C19.1 (pas de champ URL SFX éditable, l'édition est
  centralisée dans `MediaEditorPopup`).
- `xflow/react/src/model/nodes.ts` — type `MediaNode` + `ActionNode`
  (le champ `action.sfx` est une **projection sérialisation**, pas la
  source — voir audit Q-C19.1-2bis).
- `xflow/react/src/store/reconcileAutoSatellites.ts` +
  `xflow/react/src/serialize/toProjectJson.ts` — audit où `action.sfx`
  est alimenté depuis le media-audio rattaché.
- `xflow/react/src/view/playerPreview/playerPreviewAudio.ts` — fichier
  à refactorer (suppression `PreviewAudioController`, conservation
  `resolveSceneAmbiance` et `resolveActionSfx`).
- `xflow/react/src/view/popups/ScenePreviewModal.tsx` +
  `xflow/react/src/view/playerPreview/PlayerPreviewOverlay.tsx` —
  sites consommateurs à brancher sur le service.
- `xflow/react/src/store/store.ts` (ou équivalent) — pattern d'accès
  au state (`useNodalStore.getState()` ou hook).
- `editeur.html` lignes ~globalAudioUrl + `editor_en.html` —
  observation pattern legacy.
- `js/editeur-generate.js` (et `editor-en-generate.js`) section audio
  runtime — **confirmation Q-C19-14** : le runtime joueur applique-t-il
  bien loop sur ambient (media-audio scene) et auto-stop sur sfx
  (media-audio hotspot/choice) ? Si non → bascule vers flag explicite
  `mediaAudioType` à introduire dans le modèle.

**Phase questions (workflow §8.1)** — Cursor doit poser ses propres
questions avant d'implémenter, par exemple :

- **Q-C19.1-1** — Sort de `playerPreviewAudio.ts` (à refactorer dans
  le service ou à conserver) ?
- **Q-C19.1-2** — Distinction `ambient` vs `sfx` confirmée par
  l'audit runtime joueur ? Si non, comment introduire le flag
  `mediaAudioType` ?
- **Q-C19.1-3** — Placement du `<AudioPreviewButton>` dans
  `MediaEditorPopup` (à côté de l'input URL ? sous le slider volume ?
  en header de popup ?).
- **Q-C19.1-4** — Cleanup `<audio>` strict : `pause()` + `src=""` +
  `load()` ou plus minimaliste ?

Attendre validation user avant de coder.

**Périmètre** :

- Créer `xflow/react/src/services/audioChannelsService.ts` (service
  singleton hors React, API définie ci-dessus dans Décisions de design).
- Créer `xflow/react/src/view/components/AudioPreviewButton.tsx` —
  composant partagé (props définies ci-dessus).
- Intégrer dans `AudioGlobalSettingsPopup.tsx` (channel `global`,
  loop=true).
- Intégrer dans `MediaEditorPopup.tsx` (channel dérivé du parent du
  nœud, loop selon channel).
- Helper `getMediaAudioChannel(state, mediaNodeId)` dans le service ou
  colocated.
- Audit + décision sur `playerPreviewAudio.ts` (refactor ou conservation).
- Audit runtime joueur ambient/sfx → bascule flag explicite si nécessaire.

**Critères de fin** :

- Service typé, observable fonctionnel sur les 3 channels.
- `<AudioPreviewButton>` UI complète (▶/⏸ + jauge + tooltip erreur).
- Cleanup au unmount stoppe SON channel sans toucher aux autres.
- Tests Vitest verts :
  - `c19_1_service_play_independent_channels.test.ts` — `play(g, urlA)` +
    `play(a, urlB)` → les deux actifs.
  - `c19_1_service_replace_in_channel.test.ts` — `play(g, urlC)` écrase
    A sur global, B continue sur ambient.
  - `c19_1_service_set_volume.test.ts` — `setVolume(channel, v)` →
    `audio.volume` mis à jour.
  - `c19_1_service_unmount_stops_channel.test.ts` — unmount
    `<AudioPreviewButton>` stoppe SON channel uniquement.
  - `c19_1_audio_preview_button_global_popup.test.tsx` — render +
    click ▶ déclenche `play('global', ...)`.
- Audit `playerPreviewAudio.ts` documenté (commentaire en tête du
  fichier ou dans Annexe D § Journal de chantier).
- Smoke FR/EN manuel : ouvrir popup global, lancer audio, ajuster
  volume live, fermer popup → audio stop. Idem media-audio scene
  (ambient, loop confirmé) et media-audio hotspot (sfx, auto-stop
  confirmé).

**Branche / commit** :
- Branche : `feat/c19-audio-preview` (existante).
- Commit : `feat(nodal): C19.1 service audio multi-channel + bouton partagé + intégration popups`.
- Annexe D — Journal de chantier mis à jour (entrée 1-2 lignes : audit
  `playerPreviewAudio.ts` résultat, audit runtime ambient/sfx résultat).

### Plan détaillé C19.2 — directives pour Cursor

> **Amendements 2026-05-14 (post-smoke C19.1)** — issus de la phase
> questions Q-C19.2-2/3/5/6/8. **À LIRE AVANT** le reste du plan
> détaillé : ces décisions amendent / précisent les sections
> Périmètre, Décisions de design et Critères de fin ci-dessous.
>
> **A. Modes UX dans la modale aperçu 360° (Q-C19.2-5/6)** — 2 modes
> mutuellement exclusifs : `Édition` ↔ `Interactif`.
> - **Défaut au mount** = `Interactif`.
> - **Reset à chaque ouverture** de la modale (pas de persistance
>   localStorage).
> - **Clic SFX hotspot actif uniquement en `Interactif`** (en
>   `Édition`, le clic = sélection / drag / resize C18.3-4).
> - **Auto-play global+ambient actif dans les 2 modes** — le bandeau
>   audio reste utile en `Édition` (entendre l'ambiance pendant qu'on
>   ajuste les positions).
> - **Audit obligatoire** : comment le mode interactif C18.5
>   (`PlayerPreviewOverlay`) est-il **actuellement activé** dans la
>   modale ? Si c'est via un toggle séparé du toggle Édition,
>   **consolider** en un sélecteur 2 modes (segmented control 2
>   boutons OU toggle "Mode édition" dont OFF = Interactif). Si
>   c'est déjà bien câblé, juste ajuster le défaut.
>
> **B. Bandeau audio en panneau collapsable (Q-C19.2-2)** — pas de
> seconde ligne permanente dans le header.
> - Icône 🔊 dans la barre principale du header. Au clic → déplie un
>   sous-panneau contenant les contrôles audio.
> - **État par défaut au mount = `fermé`** (mode neutre).
> - **Ouverture/fermeture manuelles uniquement** : pas d'auto-fermeture
>   sur `onBlur`, pas de `click outside listener`. Le panneau reste
>   ouvert tant que l'utilisateur ne le ferme pas explicitement (clic
>   sur l'icône 🔊 ou un bouton ✕ du panneau).
> - Sous-panneau contient : 3 sliders (Global / Ambiance / Dernier
>   SFX, masqués si non applicables) + bouton replay dernier SFX.
>
> **C. `lastSfx` persistant entre switches de scène (Q-C19.2-3
> révisé)** — pas de reset au goto en mode interactif.
> - `lastSfx` reste valable tant que la modale est ouverte.
> - Reset uniquement au **unmount de la modale** (cohérent avec
>   `stopAll()`).
> - Permet à l'utilisateur de naviguer vers la scène cible d'un goto
>   puis de replay le SFX du goto pour ajuster son volume — sans
>   perdre la référence.
>
> **D. Mini-fix cosmétique tests jsdom (Q-C19.2-8)** — inclus en
> C19.2.
> - Wrapper `audio.pause()` et `audio.load()` dans des `try/catch`
>   silencieux dans `strictCleanup` (ou mock global
>   `vi.spyOn(HTMLAudioElement.prototype, 'pause'/'load')` dans
>   `vitest.setup.ts`).
> - Objectif : étouffer les warnings `Error: Not implemented:
>   HTMLMediaElement.prototype.pause/load` qui polluent la sortie de
>   `npm test`. 5-10 lignes max.
>
> **E. Idée future hors scope C19.2** — mode `Audio` (3e mode où
> clic = joue le SFX + slider volume sans ouvrir popup runtime ni
> manipuler le hotspot). À évaluer après usage de C19.2 si le besoin
> se confirme. **Ne pas implémenter en C19.2.**

**Pré-requis** : C19.1 livré (service `audioChannelsService.ts` +
`<AudioPreviewButton>` disponibles).

**Contexte** : intégrer le bandeau audio dans la barre haut de
l'aperçu scène 360° (modale ouverte depuis le menu contextuel s-box,
livrée en C18.1). En mode read-only : auto-play global+ambient. En
mode interactif C18.5 : SFX au clic hotspot. 3 sliders dans le
bandeau (Global / Ambiance / Dernier SFX) + bouton replay dernier
SFX permettent à l'utilisateur de faire la **balance audio** en
condition de jeu.

**Fichiers à lire avant de coder** :

- `xflow/react/src/view/popups/ScenePreviewModal.tsx` — modale
  aperçu C18.1 (point d'insertion du bandeau audio dans le header).
- `xflow/react/src/view/playerPreview/PlayerPreviewOverlay.tsx` —
  overlay interactif C18.5 (point d'insertion du déclenchement SFX
  au clic hotspot).
- `xflow/react/src/view/playerPreview/playerPreviewAudio.ts` —
  selon décision C19.1 (refactor ou conservation), interaction à
  documenter.
- `xflow/react/src/view/playerPreview/buildPlayerPreviewVariant.ts` —
  helper variantes preview (interaction possible).
- `xflow/react/src/services/audioChannelsService.ts` (livré C19.1).
- `xflow/react/src/view/components/AudioPreviewButton.tsx` (livré C19.1).
- `xflow/react/src/view/preview/sceneHotspotProjections.ts` —
  collect des hotspots de la scène (extension probable pour exposer
  le SFX rattaché à chaque hotspot).
- `xflow/react/src/view/preview/NodalPanoramaViewer.tsx` — viewer
  Pannellum (interaction au clic hotspot).
- `docs/archives/chantier_18.md` — section C18.5.2 (« preview joueur
  goto + req + pwd + selector + img fallback ») pour comprendre l'état
  actuel des goto en mode interactif.

**Phase questions (workflow §8.1)** — Cursor doit poser :

- **Q-C19.2-1** — **AUDIT GOTO C18.5 D'ABORD** : reproduire un goto
  en mode interactif C18.5 dans l'aperçu, observer si la scène change
  réellement (re-init Pannellum sur nouveau panorama, re-collecte
  hotspots). Si bug → décrire le diagnostic + proposer fix `C19.2-fix`
  AVANT transition audio. Si OK → continuer.
- **Q-C19.2-2** — Positionnement bandeau audio dans header modale :
  à gauche du toggle Édition (C18.3) ? À droite ? Dans une seconde
  ligne sous la barre principale ?
- **Q-C19.2-3** — `lastSfx` au switch de scène : reset (nouvelle
  scène = pas de SFX joué encore) ou conservation (l'utilisateur peut
  vouloir replay un SFX d'une autre scène) ? *Vote claude : reset, plus
  intuitif.*
- **Q-C19.2-4** — État du toggle 🔊 : local au mount de la modale
  (par défaut ON à chaque ouverture) ou persistant en `localStorage`
  (préférence utilisateur) ? *Vote claude : local, par défaut ON.*

Attendre validation user.

**Périmètre** :

- **Audit goto C18.5** + fix `C19.2-fix` éventuel AVANT transition
  audio.
- Créer `xflow/react/src/view/preview/ScenePreviewAudioBar.tsx` —
  composant bandeau audio.
- Intégrer dans le header de `ScenePreviewModal.tsx` (placement à
  valider en Q-C19.2-2).
- `useEffect` au mount de la modale : auto-play global+ambient si
  définis (lookup `meta.settings.audio` + collect ambient de la scène
  visualisée).
- `useEffect` au unmount : `stopAll()`.
- En mode interactif C18.5 : extension du handler de clic hotspot pour
  déclencher SFX (`play('sfx', ...)`).
- Au goto en mode interactif (si goto fonctionnel) : hook
  `stop('ambient')` + `play('ambient', newSceneAmbientUrl)`.
- Toggle 🔊 OFF → `stopAll()` ; ON → reprise auto-play global+ambient.
- Bouton replay dernier SFX : visible si `state.sfx.lastSfx` non null.

**Critères de fin** :

- Bandeau audio fonctionnel dans la modale aperçu 360°.
- Auto-play à l'ouverture de la modale (si global ou ambient défini).
- Sliders 3-channels live (modifient les valeurs stockées).
- Bouton replay dernier SFX fonctionnel.
- SFX au clic hotspot en mode interactif fonctionnel.
- Audit goto fait + fix livré si bug détecté (commit séparé `C19.2-fix`).
- Transition ambient au switch de scène (si goto fonctionnel).
- `stopAll()` au unmount confirmé.
- Tests Vitest verts :
  - `c19_2_audio_bar_auto_play_on_mount.test.tsx` — mount modale →
    service reçoit `play('global', ...)` + `play('ambient', ...)`.
  - `c19_2_audio_bar_sfx_on_hotspot_click.test.tsx` — click mock
    hotspot SFX en mode interactif → `play('sfx', ...)` + `lastSfx`
    mis à jour.
  - `c19_2_audio_bar_replay_sfx.test.tsx` — bouton replay → `play('sfx',
    lastSfx.url)`.
  - `c19_2_audio_bar_navigation_ambient_transition.test.tsx` — goto →
    `stop('ambient')` puis `play('ambient', newUrl)`.
  - `c19_2_audio_bar_unmount_stops_all.test.tsx` — unmount modale →
    `stopAll()`.
  - `c19_2_audio_bar_toggle_off_stops.test.tsx` — toggle OFF →
    `stopAll()` ; ON → reprise.
- Smoke FR/EN manuel : ouvrir aperçu scène avec global+ambient
  définis, vérifier que les 2 sons jouent en loop dès l'ouverture ;
  basculer en mode interactif, cliquer un hotspot avec SFX, vérifier
  SFX joue ; ajuster les 3 sliders pour faire la balance ; replay
  SFX ; goto vers scène avec ambient différent → vérifier transition.

**Branche / commit** :
- Branche : `feat/c19-audio-preview` (existante).
- Commit : `feat(nodal): C19.2 bandeau audio dans aperçu scène 360° (sliders 3 channels + replay sfx)`.
  Si `C19.2-fix` (audit goto a révélé bug) : commit séparé en amont
  `fix(nodal): C19.2-fix audit goto C18.5 — <diagnostic court>`.
- Annexe D — Journal de chantier mis à jour (entrée 1-2 lignes).

### Journal de chantier

- **2026-05-14** — Ouverture Annexe D. Cadrage validé en phase
  questions (Q-C19-1 à Q-C19-18). Scope élargi vs spec §7 → C19
  initiale (3 channels parallèles, 2 endroits — popups individuelles
  + bandeau aperçu 360°). Découpage 2 sous-chantiers (C19.1 service +
  popups ; C19.2 bandeau aperçu). Branche `feat/c19-audio-preview`
  créée depuis `feat/nodal-map`. Plans détaillés C19.1 et C19.2
  rédigés en one-shot, prêts pour Cursor.
- **2026-05-14** — **C19.2 livré** : bandeau audio repliable + mute
  `stopAll({ clearLastSfx: false })`, modes Interactif/Édition, auto-play
  global+ambient, `lastSfx` + sliders persistants, **C19.2-fix** navigation
  goto au confirm (`resolveGotoTargetSceneId`), tests `c19_2_*` +
  `vitest.setup.ts` (pause/load jsdom).