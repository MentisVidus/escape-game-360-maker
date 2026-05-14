# ROADMAP — Escape Game 360 Maker

> **Index condensé des chantiers** (livrés + backlog) pour aider à choisir le prochain chantier.
> **Détails complets** : `.cursor/rules/NODAL_MAP_SPEC.mdc` (§7 — scope, Annexe B — fichiers livrés, Annexe D — chantier en cours) + archives `docs/archives/chantier_<N>.md` (journal détaillé, plans Cursor, décisions de design).
>
> **Mise à jour** : à chaque clôture de chantier — déplacer du backlog vers livrés (avec version + lien archive) et réajuster l'ordre du backlog si la priorité produit a évolué.

---

## Livrés

| # | Nom | Version | Détail |
|---|-----|---------|--------|
| C1 | Fondation modèle en mémoire | v1.5 | NODAL_MAP_SPEC §7 → C1 |
| C2 | Rendu React Flow basique | v1.5 | NODAL_MAP_SPEC §7 → C2 |
| C2.1 | Dark mode toggle | v1.5 | NODAL_MAP_SPEC §7 → C2.1 |
| C3 | États contextuels et emboîtement | v1.5 | NODAL_MAP_SPEC §7 → C3 |
| C4 | Warnings et Panel | v1.5 | NODAL_MAP_SPEC §7 → C4 |
| C5 | Persistance ZIP `.escapegame` | v1.5 | Annexe B — C5 |
| C6 | Miroir DOM legacy | v1.5 | Annexe B — C6 |
| C7 | Popups d'édition de contenu | v1.6 | Annexe B — C7 |
| C8 | Round-trip layout + zoom auto | v1.7 | Annexe B — C8, `docs/archives/chantier_8.md` |
| C9 | Clipboard / paste / refactor | v1.8 | Annexe B — C9, `docs/archives/chantier_9.md` |
| C10 | Autonomie carte nodale (authoring standalone) | v1.9 | Annexe B — C10, `docs/archives/chantier_10.md` |
| C18 | Aperçu de scène 360° + placement coords hotspots | v1.10 | Annexe B — C18, `docs/archives/chantier_18.md` |
| C19 | Audio preview / écouter | v1.11 | Annexe B — C19, `docs/archives/chantier_19.md` |

---

## Backlog — ordre d'implémentation suggéré

L'ordre ci-dessous est une **suggestion** de Claude pour le choix du prochain chantier, pas une décision figée. À réviser librement avec le game designer en début de chantier (la numérotation reste celle de la création, l'ordre d'exécution est libre).

### 1. C23 — Persistance bundle audio *(global + ambient + reconnexion blob au reload)*
- **Raison** : bug pré-existant identifié pendant smoke C19.1 (2026-05-14). Sur un projet avec 3 mp3 bundle local (global / ambient / sfx), le `.escapegame` exporté contient 0/3 avant C19.1 et 1/3 après C19.1 (seul le SFX, grâce à la projection câblée). Au reload, même les médias embarqués ne se reconnectent pas aux nœuds source. Bloquant pour les utilisateurs qui sauvent des projets avec audio bundle local.
- **Apporte** : projection ambient + global symétrique à C19.1 (helper miroir de `actionSfxProjection.ts`) OU collecte directe depuis les nœuds `media-audio` du store ; reconnexion blob `./assets/...` → nœud media-audio au load ; tests round-trip avec fixtures 3 mp3 mock.
- **Détail** : NODAL_MAP_SPEC §7 → C23.

### 2. C22 — Hotspots responsives *(scaling proportionnel à l'image)*
- **Raison** : dette d'archi transverse repérée pendant le cadrage C18.4 — `appearance.ui_w` / `ui_h` sont en pixels CSS bruts, donc un hotspot ne couvre pas la même proportion d'image selon l'écran. Bug d'archi présent dans tout le projet (legacy + React + runtime joueur). À solder avant les chantiers qui multiplient les manipulations hotspot (notamment C16 vidéo 360°).
- **Apporte** : nouveau format `ui_w_pct` / `ui_h_pct` (ou bump `schemaVersion: 3`) + recalcul DOM au resize fenêtre + adaptation runtime joueur + migration projets pré-C22.
- **Détail** : NODAL_MAP_SPEC §7 → C22.

### 3. C20 — Aperçus latéraux globaux
- **Raison** : extension naturelle du pattern `PlayerPopupPreview` (C7) — cohérent à enchaîner maintenant que les fondations preview audio (C19 livré) sont en place. Absorbe l'item ex-`C10.2.b-fix` noté pendant C10.
- **Apporte** : aperçu inventaire HUD + aperçu écrans Game Over / Victory **themed** (avec application du thème popup courant) dans les popups Paramètres globaux. Refit visible+disabled sur la popup inventaire (alignement pattern timer C10.2.e).
- **Détail** : NODAL_MAP_SPEC §7 → C20.

### 4. C21 — End-screens scene-level via clic droit
- **Raison** : suite logique de C20 (qui livre l'aperçu globalisé). Rendrait obsolète la section globale C10.2.f (à arbitrer en cadrage).
- **Apporte** : end-screens définissables au niveau scène via clic droit s-box (en plus / à la place des écrans globaux).
- **Détail** : NODAL_MAP_SPEC §7 → C21.

### 5. C11 — Déploiement Netlify intégré
- **Raison** : valeur produit forte (« Deploy Game » en complément du Generate Game existant). Pas bloquant pour l'authoring — à reprogrammer dès que la vague preview/audio C19-C21 est livrée.
- **Apporte** : bouton **Deploy** + persistance idempotente du `siteId` dans `project.json` + UX feedback (URL, copier, ouvrir, gestion site disparu, erreurs).
- **Détail** : NODAL_MAP_SPEC §7 → C11.

### 6. C12 — Logique de jeu : conditions et combinaisons
- **Raison** : enrichissement gameplay structurant — REQ multi-objets, crafting léger, récompense d'échec. Étend des mécaniques déjà en place. Gros chantier modèle de données.
- **Apporte** : `req.objectIds: string[]` (REQ multi-objets), action `craft` (A+B→C), récompense d'échec sur REQ/PWD (deux pinces succès/échec).
- **Détail** : NODAL_MAP_SPEC §7 → C12.

### 7. C13 — Logique de jeu temporelle
- **Raison** : suite logique de C12. Introduit le temps comme dimension du gameplay (complément du timer global C10).
- **Apporte** : timer scène, timer action (auto-trigger après X s sans interaction), hotspot conditionnel temporel (apparition/disparition timée).
- **Détail** : NODAL_MAP_SPEC §7 → C13.

### 8. C14 — Bibliothèques productivité éditeur
- **Raison** : UX éditeur, sans changer le runtime joueur. Confort game designer mais pas urgent.
- **Apporte** : bibliothèque de styles hotspot nommés (`meta.hotspotStyles`, propagation par référence d'id) + bibliothèque d'icônes hotspots (Lucide / Phosphor / Tabler).
- **Détail** : NODAL_MAP_SPEC §7 → C14.

### 9. C15 — Mode visite virtuelle
- **Raison** : variant d'usage produit (escape vs tour). Ouvre un nouveau cas d'usage, à programmer quand le moteur escape est solidifié.
- **Apporte** : flag projet `mode: 'escape' | 'tour'`, suppression landing page démarrage runtime, désactivation warnings gameplay (timer, inventaire, REQ/PWD).
- **Détail** : NODAL_MAP_SPEC §7 → C15.

### 10. C16 — Médias avancés
- **Raison** : élargissement catalogue (vidéo 360°). Gros chantier média — attendre que C22 ait stabilisé la sémantique hotspot pour éviter de retravailler plus tard.
- **Apporte** : scènes vidéo 360° (Pannellum vidéo en plus de l'image fixe), transitions image ↔ vidéo, `mediaType: 'image' | 'video'` sur `scene`.
- **Détail** : NODAL_MAP_SPEC §7 → C16.

### 11. C17 — Médias partagés et portables
- **Raison** : finit la stack média (réutilisation, portabilité du snapshot). Attendre C16.
- **Apporte** : médias portables dans le snapshot IndexedDB (promotion des callbacks no-op `nodalDraftAdapter.ts`) + bibliothèque médias partagée entre actions (référence par id dans `meta.media[mediaId]`).
- **Détail** : NODAL_MAP_SPEC §7 → C17.

---

*Maintenu par Claude. Format minimal — toute la doc technique vit dans `NODAL_MAP_SPEC.mdc` et les archives.*
