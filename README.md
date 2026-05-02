# 🧩 Éditeur — Escape Game 360° (No-Code Builder)

🌍 **[🇬🇧 Click here for the English Version](#-english-version)**

Un générateur visuel gratuit et open-source pour créer des *escape games* ou des visites virtuelles interactives en images 360°. Conçu pour des **ateliers d’initiation au numérique** et les **Espaces Publics Numériques (EPN)** : aucune connaissance en programmation n’est requise.

L’outil produit un jeu jouable sous la forme d’un fichier **`index.html`** autonome (navigateur moderne), ou d’une **archive ZIP** prête pour l’hébergement Web (Pannellum embarqué + dossier `media/`). Le projet de travail se sauvegarde en **JSON** (**schéma V2**) ou, pour embarquer les **médias locaux**, en archive **`.escapegame`** (ZIP contenant `project.json` + `assets/`), distinct du HTML généré.

---

## 🏗️ Architecture (aperçu)

L’éditeur repose sur une **couche headless** ([`js/editor-core.js`](js/editor-core.js)) : un **modèle JSON universel** (`schemaVersion: 2`) **découplé du HTML**. Les formulaires, la carte interactive et la génération du joueur sont des **adaptateurs** qui lisent et écrivent ce modèle.

Selon la branche utilisée, l’éditeur propose **une ou deux surfaces d’édition** :

- **Formulaire classique + carte Drawflow** (sur `main`) : liste linéaire des scènes et de leurs hotspots ; la carte Drawflow visualise le parcours pour aider à se repérer.
- **Carte nodale React** (sur `feat/nodal-map`) : graphe **éditable** où chaque scène, hotspot et action est un **nœud**. Double-clic sur un nœud → **popup d’édition** dédiée à sa nature (message, transition, ramassage, énigme `REQ`, mot de passe `PWD`, menu `selector`). Les chaînes `REQ → PWD → MSG` se lisent et se modifient directement dans le graphe.

Les deux surfaces écrivent et relisent **le même JSON V2** ; sur `feat/nodal-map`, c’est la **carte nodale qui devient la source de vérité d’édition**. La génération du joueur reste identique (`index.html` autonome ou archive `.escapegame`).

- **Textes enrichis** : contenus HTML dans **`payload.copy`** (champs `bodyHtml`, `buttonLabel` selon le type d’action).
- **Audio** : forme normalisée **`{ url, volume }`** pour la musique globale, l’ambiance par scène et les effets sonores des actions.

Pour le détail technique (carte Drawflow, panneau latéral, Quill, flux selector) : **[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)** et **[docs/PLAN_EDITEUR_NODAL.md](docs/PLAN_EDITEUR_NODAL.md)**. Spec autoritative de la carte nodale React : **[.cursor/rules/NODAL_MAP_SPEC.mdc](.cursor/rules/NODAL_MAP_SPEC.mdc)**. Intention **pédagogique** du nodal (publics EPN, repères Scratch / LEGO) : **[docs/PLAN_NODAL_PEDAGOGIE.md](docs/PLAN_NODAL_PEDAGOGIE.md)**.

---

## 🌐 Versions disponibles

Plusieurs miroirs de l’éditeur cohabitent : tous servent le **même dépôt**, mais depuis des **branches** différentes.

- **Pour un atelier ou un projet « sérieux »** : versions **GitHub Pages** ou **Production Netlify** (toutes deux basées sur `main`) — formulaire classique + carte Drawflow.
- **Pour découvrir l’édition par carte nodale** : miroir **`feat/nodal-map`** (carte nodale React livrée). Reste qualifiée de bêta jusqu’à un futur merge sur `main`.

| Version | Lien | Branche / source | Statut |
|---------|------|------------------|--------|
| **GitHub Pages** (FR) | [MentisVidus.github.io/…/editeur.html](https://MentisVidus.github.io/escape-game-360-maker/editeur.html) | `main` (GitHub Pages) | ✅ Stable — référence |
| **GitHub Pages** (EN) | [MentisVidus.github.io/…/editor_en.html](https://MentisVidus.github.io/escape-game-360-maker/editor_en.html) | `main` (GitHub Pages) | ✅ Stable — référence |
| **Production Netlify** | [eg360.netlify.app](https://eg360.netlify.app/) | `main` (Netlify) | ✅ Stable — miroir de la version GitHub Pages (formulaire + carte Drawflow) |
| **Carte nodale** (React) | [feat-nodal-map--eg360.netlify.app](https://feat-nodal-map--eg360.netlify.app/) | `feat/nodal-map` | 🟢 Bêta utilisable — Chantier C7 livré (popups d’édition par nœud, chaînes `REQ → PWD → MSG`, persistance brouillon). Pas de chantier en cours sur la branche. |

---

## 🛠️ Comment ça marche ?

1. **Ouvrez l’éditeur** : **[Version stable (formulaire + Drawflow)](https://MentisVidus.github.io/escape-game-360-maker/editeur.html)** ou **[Bêta carte nodale](https://feat-nodal-map--eg360.netlify.app/)**.
2. **Ajoutez vos scènes** et renseignez les **images 360°** (format équirectangulaire).
3. **Posez vos hotspots** (points d’interaction). Chaque hotspot porte une **action** : afficher un message (`MSG`), changer de scène (`GOTO`), ramasser un objet (`PICK`), exiger un objet (`REQ`), demander un mot de passe (`PWD`), ouvrir un **menu à choix** (`SELECTOR`). Les actions `REQ` et `PWD` peuvent **enchaîner** une récompense (ex. `REQ → PWD → MSG`).
4. **Selon la version** :
   - **Formulaire classique** : tout se renseigne dans la liste des scènes (sections repliables) ; ouvrez la **carte du projet** (Drawflow) pour visualiser le parcours.
   - **Carte nodale** (`feat/nodal-map`) : tout se construit dans le **graphe**. Utilisez la **palette latérale** pour ajouter scènes / hotspots / actions, **double-cliquez** un nœud pour ouvrir sa **popup d’édition** (texte riche Quill, médias, conditions, SFX), et **reliez** les nœuds pour exprimer les transitions et les récompenses.
5. **Sauvegardez** régulièrement : **`.json`** pour un projet 100 % en URLs distantes, **`.escapegame`** (ZIP) si vous embarquez des **médias locaux** (panoramas, audio, icônes).
6. **Cliquez sur « Générer mon jeu »** pour télécharger un **`index.html`** autonome, ou **« Exporter le jeu (.ZIP) »** pour une archive complète **Pannellum + médias** (voir ci-dessous).

### 💡 Conseils importants

* **Images et CORS** : pour les tests, privilégiez des URL **`http://` / `https://`**. Les nouvelles scènes pointent par défaut vers une **grille équirectangulaire** du dépôt (jsDelivr) ; les chemins locaux (`./mon-panorama.jpg`) fonctionnent surtout lorsque le jeu est servi par un **petit serveur web** ou hébergé en ligne.
* **Sauvegarde** : **`.json`** (V2, léger) pour tout en URL distante ; **`.escapegame`** si vous utilisez des **fichiers locaux** (panoramas, audio…) — l’archive contient le JSON et le dossier **`assets/`**. Même bouton **Charger** accepte les deux formats.
* **Exports joueur** : **`index.html` seul** convient quand tous les médias sont déjà en **`https://…`** (sinon un avertissement s’affiche). Le **ZIP Web** inclut **Pannellum en local**, **`media/`**, et des fichiers d’aide pour tester hors ligne (`Lisez-moi.txt`, script batch).
* **Tests sur `localhost`** : après avoir remplacé `index.html` ou extrait un nouveau ZIP, utilisez un **rechargement forcé** (**Ctrl+F5** sur Windows/Linux, **Cmd+Shift+R** sur macOS) ou videz le cache du navigateur. Sinon un **ancien panorama** peut sembler « rester affiché » alors que le nouveau fichier est correct.

### Documentation (développeurs & assistants IA)

* [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) — dépôt, **JSON V2**, **`.escapegame`**, export ZIP Web, carte, Quill, Pannellum, audio, HUD joueur, selector.
* [docs/PLAN_EDITEUR_NODAL.md](docs/PLAN_EDITEUR_NODAL.md) — vision **nodale / hybride**, état d’avancement, Chemin B (React Flow).
* [docs/PLAN_NODAL_PEDAGOGIE.md](docs/PLAN_NODAL_PEDAGOGIE.md) — **pédagogie & intention** (EPN, graphe vs formulaire, anti-spaghetti).
* [docs/ACTION_FIELDS_MAPPING.md](docs/ACTION_FIELDS_MAPPING.md) — **référence** V2 ↔ legacy par actiontype (`msg`, `pick`, `goto`, `req`, `pwd`, `selector`).
* [docs/CONTRIBUTING.md](docs/CONTRIBUTING.md) — synchronisation FR/EN, bonnes pratiques.
* [docs/SELECTOR_SPEC.md](docs/SELECTOR_SPEC.md) — menus à choix, imbrication, SFX.
* [docs/todo.md](docs/todo.md) — mini backlog technique (tests, suivi), distinct des specs.

---

## ✨ Fonctionnalités actuelles (bêta — printemps 2026)

* **Carte nodale React** *(branche `feat/nodal-map`, livrée chantier C7)* — graphe **éditable** comme interface principale : palette latérale (ajout / duplication / suppression), **popups d’édition par nœud** selon le type d’action, chaînes `REQ → PWD → MSG` récursives, snapshot manuel, dark/light mode.
* **Schéma projet JSON V2** — sauvegarde structurée, actions unifiées (hotspot ou choix de menu), normalisation **legacy V1** à l’import.
* **Carte interactive (Drawflow)** *(branche `main`)* — vues **Focus**, **Complète** et **Acyclique** ; option **mode narration** (transitions) ; double-clic pour recentrer une scène.
* **Panneau latéral** *(carte Drawflow)* — édition des scènes et hotspots **depuis la carte** en **réutilisant les mêmes blocs formulaire** (déplacement dynamique dans le DOM, pas de duplication des champs).
* **Éditeur de texte enrichi (Quill.js)** — titres, styles, listes, alignement, couleur, **polices et tailles** système (sans images/vidéos embarquées, JSON léger).
* **WYSIWYG & thème des popups** — les zones d’édition reflètent en direct les **couleurs** et la **police** définies dans les paramètres globaux des boîtes de dialogue.
* **Musique globale & ambiance par scène** — `{ url, volume }` ; silence si l’URL est vide.
* **Aperçu scène** — test du panorama et des zones cliquables (contours rouges) sans générer le jeu.
* **Éditeur CSS visuel** — zones cliquables (taille, couleur, bordure, opacité) + mode expert.
* **Ergonomie** — réordonnancement des scènes, duplication de hotspots, sections repliables, titres libres.
* **Pointeur 360°** — placement visuel des hotspots (pitch / yaw).
* **Inventaire** — panneau rétractable et personnalisable.
* **Logique & énigmes** — codes, objets requis, progression mémorisée.
* **Selector** — menus à choix, sous-menus, SFX par choix, conditions d’affichage.
* **Bundle projet `.escapegame`** — sauvegarde / chargement **ZIP** (`project.json` + `assets/`) pour travailler avec des médias locaux sans tout remettre en ligne à la main.
* **Export ZIP hébergement Web** — `index.html` + **Pannellum** copié dans `lib/`, médias dans `media/`, fichiers d’aide pour test local (EPN / clé USB).
* **Joueur — réglages audio** — HUD (inventaire + engrenage), mix **Master / Musique / Ambiance / SFX**, mémorisé dans **`localStorage`** (détails : [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)).
* **Panorama par défaut** — nouvelles scènes pointent vers une **grille équirectangulaire** hébergée (jsDelivr), définie dans `EditorCore.DEFAULT_SCENE_PANORAMA_PLACEHOLDER_URL`.

### Récent (post bundle & audio joueur — 2026)

| Thème | Contenu |
|--------|---------|
| **Projet portable** | Sauvegarde / chargement **`.escapegame`**, cartographie **`bundleAssets`**, chemins **`./assets/…`** dans le JSON, import ZIP côté éditeur. |
| **Export Web** | **`exportGameWebZip()`** : fetch Pannellum, réécriture des URLs médias, alertes **`blob:`** résiduelles. |
| **Joueur** | **`#player-hud`**, modale volumes, persistance **`escape360_player_audio_v1`**. |
| **Éditeur** | Placeholder scène jsDelivr ; confirm si sauvegarde `.json` avec embeds bundle. |

### Récent (carte nodale React — printemps 2026, branche `feat/nodal-map`)

Chantier **C7 livré** : la **carte nodale** devient l’interface d’édition principale sur cette branche.

| Thème | Contenu |
|--------|---------|
| **Édition par popups** | Double-clic sur un nœud → popup dédiée à son type (`MSG`, `GOTO`, `PICK`, `REQ`, `PWD`, `SELECTOR`), texte riche Quill, médias, conditions de visibilité, SFX. |
| **Chaînes REQ/PWD** | Récompenses imbriquées **récursives** (ex. `REQ → REQ → PWD → MSG`), runtime joueur aligné FR + EN. |
| **Persistance** | Brouillon **IndexedDB** (snapshots manuels et auto, dock latéral + bouton dans la palette nodale), bundle `.escapegame` (graphe `map-layout.json` + projet V2). |
| **Smoke** | Suite SMK-01 → SMK-10 validée (long contenu, selector, exports, dark/light, persistance). |

Spec autoritative : **[`.cursor/rules/NODAL_MAP_SPEC.mdc`](.cursor/rules/NODAL_MAP_SPEC.mdc)** (Annexe B — Chantier C7).

---

## 📋 Version 2.0 — Notes de version (*Nodal / Hybride*)

Refonte majeure livrée autour du **schéma V2** et de l’**interface hybride** (liste + graphe).

| Domaine | Nouveautés |
|--------|------------|
| **Données** | Introduction de **`EditorCore`** et **`schemaVersion: 2`** ; **`payload.copy`** pour les textes ; audio **`{ url, volume }`** ; chargement tolérant des anciens JSON. |
| **Carte projet** | Modale **Drawflow** : vues **Focus / Complète / Acyclique**, filtre **narration**, régénération après édition. |
| **Panneau latéral** | Montage des **`.scene-block` / hotspots** dans le panneau pour éditer **le même DOM** que la vue liste. |
| **No-code texte** | **Quill.js** sur les champs riches ; barre d’outils **police** & **taille** (listes blanches hors-ligne) ; **synchronisation visuelle** avec le thème des popups. |
| **Joueur généré** | Styles injectés pour **alignement Quill**, **`.ql-font-*`**, **`.ql-size-*`**, conteneurs **`.play-html-rich`** pour un rendu fidèle aux popups. |
| **Qualité de vie** | Renommage d’ID de scène fiable depuis la carte ; listes de cibles de scène alignées sur le DOM réel. |

La numérotation « 2.0 » décrit une **étape produit** (documentation) ; le dépôt reste présenté en **bêta** jusqu’à stabilisation et éventuelle politique de versionnement semver.

---

## 🚀 Feuille de route

### Chemin A — export & diffusion (*état au printemps 2026*)

* **Livré** — **ZIP pour hébergement Web** (`exportGameWebZip`) : jeu avec **Pannellum en local**, dossier **`media/`**, utilitaires de test hors ligne.
* **Livré** — **Bundle éditeur** **`.escapegame`** : projet + médias pour reprendre le travail avec des fichiers locaux.
* **À affiner** — ergonomie bundle, documentation joueur, jeux multi-fichiers ; pas de **semver** figé tant que la bêta reste ouverte.

### Chemin B — plus long terme

* **Remplacement de Drawflow par React Flow** (ou équivalent) **uniquement pour la vue graphe**, si le projet adopte une stack front plus riche ; le **contrat JSON V2** et **`EditorCore`** restent la base.

### Autres pistes

* SFX sur tous les types de hotspots « classiques » (au-delà du selector).
* **Menu in-game unifié** (hub inventaire + réglages + extensions) — voir [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) (*Audio (player)*).
* Système de **niveaux** liant plusieurs HTML + transfert d’inventaire (`localStorage`).
* **Persistance** des objets ramassés lors des retours en scène.

---

<br>

---

# 🌍 English Version

🇫🇷 **[Cliquez ici pour la version française](#-éditeur--escape-game-360-no-code-builder)**

A free, open-source visual builder for 360° escape rooms and interactive virtual tours. Built for **digital literacy workshops** and **public digital spaces** (*médiathèques*, fab labs, community centers). No programming knowledge is required.

The tool outputs a standalone **`index.html`** playable in a modern browser, or a **ZIP archive** ready for static hosting (bundled Pannellum + `media/`). Your work-in-progress is saved as **JSON** (**V2 schema**), or as an **`.escapegame`** bundle (ZIP with `project.json` + `assets/` for local media), separate from the generated player file.

---

## 🏗️ Architecture (summary)

A **headless** layer ([`js/editor-core.js`](js/editor-core.js)) defines a **universal project model** (`schemaVersion: 2`) **decoupled from HTML**. Forms, the interactive map, and the player generator are **adapters** on top of that model.

Depending on the branch, the editor offers **one or two editing surfaces**:

- **Classic form + Drawflow map** (on `main`): linear list of scenes and hotspots; the Drawflow map gives a bird’s-eye view of the flow.
- **React nodal map** (on `feat/nodal-map`): an **editable graph** where each scene, hotspot and action is a **node**. Double-clicking a node opens a **dedicated edit popup** matching its nature (message, transition, pick, `REQ` riddle, password `PWD`, choice `selector`). `REQ → PWD → MSG` chains are read and edited directly in the graph.

Both surfaces serialize **the same V2 JSON**; on `feat/nodal-map`, the **nodal map becomes the editing source of truth**. Player generation is unchanged (standalone `index.html` or `.escapegame` bundle).

- **Rich text** lives under **`payload.copy`** (e.g. `bodyHtml`, `buttonLabel` depending on action type).
- **Audio** uses **`{ url, volume }`** for global music, per-scene ambiance, and action SFX.

See **[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)** and **[docs/PLAN_EDITEUR_NODAL.md](docs/PLAN_EDITEUR_NODAL.md)** for technical depth. Authoritative spec of the React nodal map: **[.cursor/rules/NODAL_MAP_SPEC.mdc](.cursor/rules/NODAL_MAP_SPEC.mdc)**. Nodal **pedagogy & product intent**: **[docs/PLAN_NODAL_PEDAGOGIE.md](docs/PLAN_NODAL_PEDAGOGIE.md)**.

---

## 🌐 Available versions

Several editor mirrors run in parallel — they all serve the **same repository** but from different **branches**.

- **For workshops or serious projects** — use **GitHub Pages** or the **Netlify production** mirror (both based on `main`): classic form + Drawflow map.
- **To try the nodal-map editor** — use the **`feat/nodal-map`** mirror (React nodal map shipped). Still considered beta until a future merge into `main`.

| Version | Link | Branch / source | Status |
|---------|------|-----------------|--------|
| **GitHub Pages** (FR) | [MentisVidus.github.io/…/editeur.html](https://MentisVidus.github.io/escape-game-360-maker/editeur.html) | `main` (GitHub Pages) | ✅ Stable — reference |
| **GitHub Pages** (EN) | [MentisVidus.github.io/…/editor_en.html](https://MentisVidus.github.io/escape-game-360-maker/editor_en.html) | `main` (GitHub Pages) | ✅ Stable — reference |
| **Netlify production** | [eg360.netlify.app](https://eg360.netlify.app/) | `main` (Netlify) | ✅ Stable — mirror of the GitHub Pages build (form + Drawflow map) |
| **Nodal map** (React) | [feat-nodal-map--eg360.netlify.app](https://feat-nodal-map--eg360.netlify.app/) | `feat/nodal-map` | 🟢 Usable beta — Chantier C7 shipped (per-node edit popups, `REQ → PWD → MSG` chains, local draft persistence). No active work on the branch. |

---

## 🛠️ How it works

1. **Open the editor**: **[Stable build (form + Drawflow)](https://MentisVidus.github.io/escape-game-360-maker/editor_en.html)** or **[Nodal-map beta](https://feat-nodal-map--eg360.netlify.app/)**.
2. **Add your scenes** with their **360° equirectangular** image URLs.
3. **Place your hotspots** (interaction points). Each hotspot triggers an **action**: show a message (`MSG`), jump to a scene (`GOTO`), pick up an item (`PICK`), require an item (`REQ`), ask for a password (`PWD`), or open a **choice menu** (`SELECTOR`). `REQ` and `PWD` actions can **chain** a reward (e.g. `REQ → PWD → MSG`).
4. **Depending on the build**:
   - **Classic form**: fill everything in the scene list (collapsible sections); open the **project map** (Drawflow) to visualize the flow.
   - **Nodal map** (`feat/nodal-map`): build everything in the **graph**. Use the **side palette** to add scenes / hotspots / actions, **double-click** a node to open its dedicated **edit popup** (Quill rich text, media, conditions, SFX), and **connect** nodes to express transitions and rewards.
5. **Save regularly**: **`.json`** when everything is remote; **`.escapegame`** (ZIP) when you bundle **local media** (panoramas, audio, icons).
6. **Click GENERATE MY GAME** to download a standalone **`index.html`**, or **Export game (.ZIP for Web hosting)** for a full archive with **Pannellum + media** (see below).

### Tips

* For testing, prefer **`http`/`https`** media URLs. New scenes default to a **grid equirectangular** image from the repo (jsDelivr). Local paths work best when the game is served from a **local web server** or hosted online.
* **Save** — use **`.json`** (V2, lightweight) when everything is remote; use **`.escapegame`** when you rely on **local files** (panoramas, audio…) — the archive holds the JSON plus an **`assets/`** folder. The same **Load** button accepts both.
* **Player output** — **`index.html` alone** is ideal when all media are already **`https://…`** (otherwise a warning is shown). The **Web ZIP** ships **local Pannellum**, **`media/`**, and helper files for offline testing (`README-play-locally.txt`, batch script).
* Use **Save project** regularly; keep **`.json`** or **`.escapegame`** under version control or backup as appropriate.
* When testing on **`localhost`**, after swapping **`index.html`** or extracting a new ZIP, do a **hard reload** (**Ctrl+F5** / **Cmd+Shift+R**) or clear cache — otherwise an **old panorama** may appear even though the new build is fine.

### Technical documentation

* [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) — repo layout, **V2 JSON**, **`.escapegame`**, Web ZIP export, map, Quill, Pannellum, audio, player HUD, selector.
* [docs/PLAN_EDITEUR_NODAL.md](docs/PLAN_EDITEUR_NODAL.md) — hybrid / nodal vision, status, Chemin B (React Flow).
* [docs/PLAN_NODAL_PEDAGOGIE.md](docs/PLAN_NODAL_PEDAGOGIE.md) — pedagogy & intent (workshop audiences, graph vs form).
* [docs/ACTION_FIELDS_MAPPING.md](docs/ACTION_FIELDS_MAPPING.md) — V2 ↔ legacy reference per actiontype (`msg`, `pick`, `goto`, `req`, `pwd`, `selector`).
* [docs/CONTRIBUTING.md](docs/CONTRIBUTING.md) — FR/EN sync, safe changes.
* [docs/SELECTOR_SPEC.md](docs/SELECTOR_SPEC.md) — choice menus, nesting, SFX.
* [docs/todo.md](docs/todo.md) — short technical backlog (tests, tracking), not a functional spec.

---

## ✨ Features (beta — Spring 2026)

* **React nodal map** *(`feat/nodal-map` branch, shipped in Chantier C7)* — **editable graph** as primary editing surface: side palette (add / duplicate / delete), **per-node edit popups** matching the action type, recursive `REQ → PWD → MSG` chains, manual snapshot, dark/light mode.
* **V2 project JSON** — unified actions, **`payload.copy`**, normalized **`{ url, volume }` audio**, legacy V1 load path.
* **Interactive map (Drawflow)** *(`main` branch)* — **Focus**, **Full**, and **Tree** (acyclic) views; optional **narration** filter; double-click to refocus a scene.
* **Side panel** *(Drawflow map)* — edit scenes and hotspots from the map by **reusing the same DOM blocks** as the list view (dynamic move, no duplicate forms).
* **Quill.js rich text** — headings, styles, lists, alignment, color, **system fonts & sizes** (no embedded images/videos — keeps JSON small).
* **WYSIWYG vs dialog theme** — editor surface tracks **popup colors** and **font** from global settings in real time.
* **Global music & per-scene ambiance**, **live scene preview**, **visual CSS editor** for hit areas, **360° picker**, **inventory**, **logic & riddles**, **selector** menus with nesting and per-choice SFX.
* **`.escapegame` project bundle** — save/load **ZIP** (`project.json` + `assets/`) for local media workflows.
* **Web hosting ZIP export** — `index.html` + **Pannellum** under `lib/`, assets under `media/`, offline play helpers.
* **Player — audio settings** — HUD (inventory + gear), **Master / Music / Ambience / SFX** mix, persisted in **`localStorage`** (see [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)).
* **Default panorama** — new scenes use **`EditorCore.DEFAULT_SCENE_PANORAMA_PLACEHOLDER_URL`** (jsDelivr grid PNG).

### Recent (2026 — bundle + player audio)

| Area | Notes |
|------|--------|
| **Portable project** | **`.escapegame`** save/load, **`bundleAssets`** map, **`./assets/…`** paths in JSON. |
| **Web export** | **`exportGameWebZip()`** — fetch Pannellum, rewrite media URLs, warn on stray **`blob:`**. |
| **Player** | **`#player-hud`**, volume modal, **`escape360_player_audio_v1`** key. |
| **Editor** | jsDelivr placeholder; **`.json`** save confirm when bundle embeds remain. |

### Recent (React nodal map — Spring 2026, `feat/nodal-map` branch)

**C7 shipped**: the **nodal map** becomes the primary editing surface on this branch.

| Area | Notes |
|------|--------|
| **Per-node edit popups** | Double-click a node → dedicated popup matching its type (`MSG`, `GOTO`, `PICK`, `REQ`, `PWD`, `SELECTOR`), Quill rich text, media, visibility conditions, SFX. |
| **REQ/PWD chains** | **Recursive** nested rewards (e.g. `REQ → REQ → PWD → MSG`), aligned FR + EN player runtime. |
| **Persistence** | **IndexedDB** local draft (manual + auto snapshots, dock + button in the nodal palette), `.escapegame` bundle (graph `map-layout.json` + V2 project). |
| **Smoke** | SMK-01 → SMK-10 suite validated (long content, selector, exports, dark/light, persistence). |

Authoritative spec: **[`.cursor/rules/NODAL_MAP_SPEC.mdc`](.cursor/rules/NODAL_MAP_SPEC.mdc)** (Annexe B — Chantier C7).

---

## 📋 Release notes — *Version 2.0 (Nodal / Hybrid)*

| Area | Highlights |
|------|------------|
| **Data** | **`EditorCore`**, **`schemaVersion: 2`**, **`payload.copy`**, **`{ url, volume }` audio**, legacy normalization. |
| **Map** | **Drawflow** modal with **Focus / Full / Tree**, **narration** filter, refresh after edits. |
| **Side panel** | **DOM-level** mount of scene/hotspot blocks for **single-source** editing. |
| **No-code copy** | **Quill** toolbars with **font** & **size** whitelists; **theme sync** with popup styling. |
| **Generated player** | Injected CSS for **Quill alignment**, **fonts**, **sizes**, **`.play-html-rich`** wrappers. |
| **QoL** | Reliable **scene ID** renames from the map; scene target selects stay in sync with the DOM. |

The label **2.0** marks a **documentation milestone**; the repo is still described as **beta** until a stricter semver policy is adopted.

---

## 🚀 Roadmap

### Path A — distribution & export (*spring 2026 status*)

* **Delivered** — **Web hosting ZIP** (`exportGameWebZip`): local **Pannellum**, **`media/`**, offline test helpers.
* **Delivered** — **Editor bundle** **`.escapegame`**: project + assets for local media workflows.
* **To refine** — bundle UX, multi-file games, **semver** once the beta stabilizes.

### Path B — longer term

* **React Flow** (or similar) **only for the graph layer** if the stack moves to a richer frontend; **V2 JSON** and **`EditorCore`** remain the contract.

### Also on the radar

* Broader SFX coverage on classic hotspots; **unified in-game menu hub** (see [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)).
* Multi-level games with `localStorage` handoff, persistent “picked” state across revisits.

---

## 📜 Credits & License

Created by **Renald Gauthier** with the assistance of **Cursor & Perplexity AI**.  
The 360° renderer is [Pannellum](https://pannellum.org/) by Matthew Petroff.

Licensed under **Creative Commons BY-SA 4.0** (Attribution — ShareAlike). You may use, modify, and share the project provided you credit the original authors and share derivatives under the same license.
