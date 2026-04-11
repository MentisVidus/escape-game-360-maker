# 🧩 Éditeur — Escape Game 360° (No-Code Builder)

🌍 **[🇬🇧 Click here for the English Version](#-english-version)**

Un générateur visuel gratuit et open-source pour créer des *escape games* ou des visites virtuelles interactives en images 360°. Conçu pour des **ateliers d’initiation au numérique** et les **Espaces Publics Numériques (EPN)** : aucune connaissance en programmation n’est requise.

L’outil produit un jeu jouable sous la forme d’un fichier **`index.html`** autonome (navigateur moderne). Le projet de travail se sauvegarde en **JSON** (**schéma V2**), distinct du HTML généré.

---

## 🏗️ Architecture (aperçu)

L’éditeur repose sur une **couche headless** ([`js/editor-core.js`](js/editor-core.js)) : un **modèle JSON universel** (`schemaVersion: 2`) **découplé du HTML**. Les formulaires, la carte interactive et la génération du joueur sont des **adaptateurs** qui lisent et écrivent ce modèle.

- **Textes enrichis** : contenus HTML dans **`payload.copy`** (champs `bodyHtml`, `buttonLabel` selon le type d’action).
- **Audio** : forme normalisée **`{ url, volume }`** pour la musique globale, l’ambiance par scène et les effets sonores des actions.

Pour le détail technique (carte Drawflow, panneau latéral, Quill, flux selector) : **[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)** et **[docs/PLAN_EDITEUR_NODAL.md](docs/PLAN_EDITEUR_NODAL.md)**.

---

## 🛠️ Comment ça marche ?

1. Ouvrez l’éditeur : **[LANCER L'ÉDITEUR FR](https://MentisVidus.github.io/escape-game-360-maker/editeur.html)**
2. Ajoutez des scènes et renseignez vos images 360° (format équirectangulaire).
3. Ajoutez des **points d’interaction** (hotspots) : messages, objets, énigmes, changements de scène, **menus à choix (selector)**.
4. (Optionnel) Ouvrez la **carte du projet** pour visualiser le parcours et éditer depuis le **panneau latéral**.
5. Cliquez sur **« Générer mon jeu »** : le navigateur télécharge votre **`index.html`**.

### 💡 Conseils importants

* **Images et CORS** : pour les tests, privilégiez des URL **`http://` / `https://`**. Les fichiers locaux (`salle.jpg`) fonctionnent surtout lorsque le jeu est servi par un **petit serveur web** ou hébergé en ligne.
* **Sauvegarde** : le bouton « Sauvegarder le projet » produit un **`.json`** (V2). Réutilisez-le pour reprendre votre travail.

### Documentation (développeurs & assistants IA)

* [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) — dépôt, **JSON V2**, carte, Quill, Pannellum, audio, selector.
* [docs/PLAN_EDITEUR_NODAL.md](docs/PLAN_EDITEUR_NODAL.md) — vision **nodale / hybride**, état d’avancement, suite produit.
* [docs/CONTRIBUTING.md](docs/CONTRIBUTING.md) — synchronisation FR/EN, bonnes pratiques.
* [docs/SELECTOR_SPEC.md](docs/SELECTOR_SPEC.md) — menus à choix, imbrication, SFX.

---

## ✨ Fonctionnalités actuelles (bêta — avril 2026)

* **Schéma projet JSON V2** — sauvegarde structurée, actions unifiées (hotspot ou choix de menu), normalisation **legacy V1** à l’import.
* **Carte interactive (Drawflow)** — vues **Focus**, **Complète** et **Acyclique** ; option **mode narration** (transitions) ; double-clic pour recentrer une scène.
* **Panneau latéral** — édition des scènes et hotspots **depuis la carte** en **réutilisant les mêmes blocs formulaire** (déplacement dynamique dans le DOM, pas de duplication des champs).
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

### Chemin A — priorité suivante

* **Export hors-ligne en archive `.zip`** — empaqueter le jeu généré avec **Pannellum en local** (sans dépendre du CDN) et les ressources du dossier, pour diffusion sur clé USB, intranet ou postes sans accès Internet (*objectif EPN*).

### Chemin B — plus long terme

* **Remplacement de Drawflow par React Flow** (ou équivalent) **uniquement pour la vue graphe**, si le projet adopte une stack front plus riche ; le **contrat JSON V2** et **`EditorCore`** restent la base.

### Autres pistes

* SFX sur tous les types de hotspots « classiques », réglages de volume côté joueur.
* Système de **niveaux** liant plusieurs HTML + transfert d’inventaire (`localStorage`).
* **Persistance** des objets ramassés lors des retours en scène.

---

<br>

---

# 🌍 English Version

🇫🇷 **[Cliquez ici pour la version française](#-éditeur--escape-game-360-no-code-builder)**

A free, open-source visual builder for 360° escape rooms and interactive virtual tours. Built for **digital literacy workshops** and **public digital spaces** (*médiathèques*, fab labs, community centers). No programming knowledge is required.

The tool outputs a standalone **`index.html`** playable in a modern browser. Your work-in-progress is saved as **JSON** (**V2 schema**), separate from the generated player file.

---

## 🏗️ Architecture (summary)

A **headless** layer ([`js/editor-core.js`](js/editor-core.js)) defines a **universal project model** (`schemaVersion: 2`) **decoupled from HTML**. Forms, the interactive map, and the player generator are **adapters** on top of that model.

- **Rich text** lives under **`payload.copy`** (e.g. `bodyHtml`, `buttonLabel` depending on action type).
- **Audio** uses **`{ url, volume }`** for global music, per-scene ambiance, and action SFX.

See **[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)** and **[docs/PLAN_EDITEUR_NODAL.md](docs/PLAN_EDITEUR_NODAL.md)** for technical depth.

---

## 🛠️ How it works

1. Open the editor: **[LAUNCH EN EDITOR](https://MentisVidus.github.io/escape-game-360-maker/editor_en.html)**
2. Add scenes and your 360° equirectangular image URLs.
3. Add **hotspots** — messages, items, puzzles, scene jumps, **choice menus (selector)**.
4. (Optional) Open the **project map** to explore flow and edit from the **side panel**.
5. Click **GENERATE MY GAME** to download **`index.html`**.

### Tips

* For testing, prefer **`http`/`https`** media URLs. Local filenames work best when the game is served from a **local web server** or hosted online.
* Use **Save project** regularly; the **`.json`** file (V2) is your source project.

### Technical documentation

* [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) — repo layout, **V2 JSON**, map, Quill, Pannellum, audio, selector.
* [docs/PLAN_EDITEUR_NODAL.md](docs/PLAN_EDITEUR_NODAL.md) — hybrid / nodal vision, status, next steps.
* [docs/CONTRIBUTING.md](docs/CONTRIBUTING.md) — FR/EN sync, safe changes.
* [docs/SELECTOR_SPEC.md](docs/SELECTOR_SPEC.md) — choice menus, nesting, SFX.

---

## ✨ Features (beta — April 2026)

* **V2 project JSON** — unified actions, **`payload.copy`**, normalized **`{ url, volume }` audio**, legacy V1 load path.
* **Interactive map (Drawflow)** — **Focus**, **Full**, and **Tree** (acyclic) views; optional **narration** filter; double-click to refocus a scene.
* **Side panel** — edit scenes and hotspots from the map by **reusing the same DOM blocks** as the list view (dynamic move, no duplicate forms).
* **Quill.js rich text** — headings, styles, lists, alignment, color, **system fonts & sizes** (no embedded images/videos — keeps JSON small).
* **WYSIWYG vs dialog theme** — editor surface tracks **popup colors** and **font** from global settings in real time.
* **Global music & per-scene ambiance**, **live scene preview**, **visual CSS editor** for hit areas, **360° picker**, **inventory**, **logic & riddles**, **selector** menus with nesting and per-choice SFX.

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

### Path A — next priority

* **Offline `.zip` export** — ship **Pannellum locally** (no CDN) plus bundled assets for USB / air-gapped / low-connectivity **public digital spaces**.

### Path B — longer term

* **React Flow** (or similar) **only for the graph layer** if the stack moves to a richer frontend; **V2 JSON** and **`EditorCore`** remain the contract.

### Also on the radar

* Broader SFX coverage, player-side volume controls, multi-level games with `localStorage` handoff, persistent “picked” state across revisits.

---

## 📜 Credits & License

Created by **Renald Gauthier** with the assistance of **Cursor & Perplexity AI**.  
The 360° renderer is [Pannellum](https://pannellum.org/) by Matthew Petroff.

Licensed under **Creative Commons BY-SA 4.0** (Attribution — ShareAlike). You may use, modify, and share the project provided you credit the original authors and share derivatives under the same license.
