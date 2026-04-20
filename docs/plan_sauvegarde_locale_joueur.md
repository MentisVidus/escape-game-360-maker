# Plan — sauvegarde locale de progression joueur

Document de planification pour le chantier **« sauvegarde/reprise de partie côté joueur »**.  
Ce plan complète `docs/PLAN_SAUVEGARDE_LOCALE_EDITEUR.md` (brouillon éditeur) et se concentre sur l'état de jeu runtime (inventaire, scène, flags, timer, etc.).

---

## 1. Objectif produit

- Permettre au joueur de **reprendre une partie** après fermeture de l'onglet, crash, F5, ou retour ultérieur.
- Ajouter une **sauvegarde manuelle téléchargeable** (fichier dédié progression joueur) pour transfert/archivage.
- Ajouter un **chargement de sauvegarde depuis l'écran titre** (local navigateur + fichier manuel).
- Réutiliser au maximum les briques existantes pour limiter la duplication et le volume de code.

---

## 2. Portée fonctionnelle (V1)

### Inclus

- Sauvegarde locale automatique (IndexedDB prioritaire).
- Sauvegarde manuelle en fichier (format dédié progression).
- Chargement d'une sauvegarde depuis l'écran titre.
- Réinitialisation explicite de progression ("Nouvelle partie").

### Hors portée V1

- Cloud sync / compte utilisateur.
- Multi-profils complexes.
- Compatibilité inter-jeux automatique (une sauvegarde d'un jeu A ne doit pas se charger sur un jeu B).

---

## 3. Données à persister (état joueur)

À minima :

- `sceneId` courante.
- Inventaire (IDs + éventuelles métadonnées utiles au runtime).
- États de hotspots/actions déjà consommés (si applicable).
- Variables de progression (flags, énigmes validées, choix selector effectués, etc.).
- État timer (global + éventuel override local actif).
- Paramètres runtime utiles (ex. mode narration si cela impacte l'expérience).

Envelope recommandée :

- `saveSchemaVersion` (version du format de sauvegarde joueur).
- `gameFingerprint` (identifiant unique du jeu exporté).
- `savedAt` (ISO).
- `slotId` (si on autorise plusieurs slots).
- `playtimeSeconds` (optionnel mais utile UX).

---

## 4. Identité d'un jeu (anti-mauvais chargement)

Il faut empêcher le chargement d'une sauvegarde d'un autre jeu.

- Ajouter dans l'export joueur un `gameFingerprint` stable (hash court du contenu projet normalisé ou UUID généré à l'export).
- Stocker ce fingerprint dans chaque sauvegarde locale/manuelle.
- Au chargement: si mismatch, refuser avec message clair.

---

## 5. Stockage local recommandé

**Décision proposée V1:** IndexedDB en priorité, cohérent avec le chantier éditeur.

Pourquoi :

- capacité supérieure à `localStorage`;
- API asynchrone;
- logique déjà introduite côté éditeur (patterns de gestion quota/erreur/rétention réutilisables).

Fallback :

- `localStorage` uniquement pour préférences légères UI si besoin;
- pas de dépendance runtime à `localStorage` pour les gros états.

---

## 6. Réutilisation "shared-first" (objectif lignes minimales)

### 6.1 Ce qui peut être mutualisé avec l'éditeur

- Wrapper IndexedDB (open DB, transactions, erreurs, purge).
- Helpers de métadonnées (`savedAt`, gestion version, logs).
- Stratégie quota (`navigator.storage.estimate()` + alertes).

### 6.2 Proposition de modules

- `js/editor-shared-storage-core.js` (nouveau): primitives techniques IDB + quotas, neutres éditeur/joueur.
- `js/player-shared-save.js` (nouveau): logique métier progression joueur (capture/apply/validate).
- Éviter de brancher directement le module "draft éditeur" sur le joueur si cela transporte des concepts non pertinents (tabId, synchronisé post-save éditeur, etc.).

Principe : mutualiser le **socle technique**, séparer la **logique métier**.

---

## 7. Sauvegarde manuelle fichier (nouveau)

### 7.1 Extension / format

Décision V1 :

- extension: `.escapegame` (même extension que le bundle éditeur, différenciation faite par la structure interne et la nomenclature de nommage).
- contenu JSON UTF-8 (éventuellement compressé plus tard, hors V1).
- signature explicite de type dans le fichier (ex. `kind: "escape360-player-save"`) pour distinguer sans ambiguïté une sauvegarde joueur d'un projet éditeur.

Structure type:

- `meta`: `kind`, `saveSchemaVersion`, `gameFingerprint`, `savedAt`, `label`.
- `state`: état runtime joueur.

### 7.2 UX

- Bouton "Télécharger sauvegarde" en HUD (ou menu pause) selon option activée.
- Nom de fichier recommandé: `nom-du-jeu_player-save_YYYY-MM-DD_HH-mm.escapegame`.
- Message de confirmation après export.

---

## 8. Chargement depuis écran titre

Au démarrage, proposer:

- **Continuer** (dernière sauvegarde locale compatible);
- **Charger un fichier de sauvegarde** (input file `.escapeprogress`);
- **Nouvelle partie** (purge locale + reset runtime).

Règles :

- Si aucune sauvegarde locale valide: bouton "Continuer" désactivé.
- Si fichier invalide/incompatible: message explicite, retour écran titre.
- Ne jamais écraser une partie en cours sans confirmation.
- Le panneau de réglages de l'écran titre (volume) accueille aussi les commandes de sauvegarde/chargement pour rester dans une UI déjà connue.

---

## 9. Option côté éditeur (génération joueur)

Ajouter dans les réglages export joueur :

- mode de sauvegarde: `none | manual | auto`.
- visibilité du bouton manuel si mode `manual` ou `auto`.
- intervalle auto (si `auto`) ou déclencheurs (`scenechange`, actions majeures).

Valeur par défaut V1 recommandée: `manual` (comportement explicite, non intrusif).

Décision UI de démarrage :

- ajouter une case à cocher claire sur l'écran de lancement (`Démarrer l'aventure`) pour activer la sauvegarde locale joueur;
- état par défaut: non activé;
- message explicite visible si désactivé.

---

## 10. Déclencheurs auto-save (si mode auto)

Proposition V1 simple:

- `scenechange`;
- acquisition d'objet inventaire;
- validation d'un état majeur (énigme, fin, transition clé);
- `visibilitychange` quand document passe hidden (snapshot léger).

Avec debounce court pour éviter les écritures en rafale.

---

## 11. Compatibilité et migrations

- Vérifier `saveSchemaVersion` au chargement.
- Si version non supportée: refuser avec message guidé.
- Prévoir une fonction `migratePlayerSave(raw)` (même si V1 = pass-through) pour préparer V2.

---

## 12. Sécurité / vie privée / poste partagé

- Prévoir "Effacer ma progression locale" dans l'écran titre.
- Expliquer dans la doc joueur que la progression locale est stockée dans le navigateur de la machine.
- Aucun secret sensible attendu, mais comportement explicite requis sur postes partagés (EPN).

---

## 13. Plan d'implémentation proposé

### Phase A — socle technique

- Créer le module shared storage core (IDB + erreurs + quotas).
- Ajouter helpers sérialisation/désérialisation de l'état joueur.

### Phase B — sauvegarde locale runtime

- Capture/restore de progression.
- Écran titre: Continuer / Nouvelle partie.

### Phase C — fichier manuel

- Export `.escapeprogress`.
- Import depuis écran titre.
- Validation `gameFingerprint`.

### Phase D — option éditeur + modes

- Paramètres de génération `none/manual/auto`.
- Branchement HUD/runtime selon config.

---

## 14. Critères de validation (manuel)

- [ ] Une partie est reprise correctement après refresh.
- [ ] Continuer charge uniquement une sauvegarde du bon jeu.
- [ ] Nouvelle partie purge l'état local.
- [ ] Export manuel génère un fichier lisible et re-chargeable.
- [ ] Import d'une sauvegarde d'un autre jeu est refusé proprement.
- [ ] FR/EN: mêmes comportements, textes adaptés.
- [ ] Pas de régression visible sur timer, inventaire, selector, transitions, écrans de fin.

---

## 15. Décisions actées (session en cours)

- [x] Extension manuelle: `.escapegame` avec signature interne `kind` dédiée sauvegarde joueur.
- [x] Nombre de slots locaux: **1 seul slot** (écrasement du précédent pour éviter l'accumulation pendant les phases de test).
- [x] Emplacement UI principal: menu réglages (zone volume / écran de lancement).
- [x] Mode par défaut à l'export: `manual`.
- [x] Activation: case à cocher explicite sur l'écran de lancement, non activée par défaut.

---

*Document vivant: à maintenir en parallèle de `docs/todo.md` et des livraisons joueur.*
