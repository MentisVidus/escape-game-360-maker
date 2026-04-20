# Plan — sauvegarde locale (brouillon éditeur)

Document de planification pour le chantier **« brouillon / récupération après F5 accidentel »** (voir `docs/todo.md`).  
**Périmètre :** uniquement l’**éditeur** (FR/EN) et la **persistance locale du travail en cours** — pas la sauvegarde de **progression joueur** dans le HTML exporté (chantier distinct dans le même `todo.md`).

---

## 1. Problème à résoudre

- Un médiateur travaille longtemps dans l’éditeur sans enregistrer vers un fichier.
- Actualisation du navigateur, crash, coupure réseau sur une app hébergée, fermeture d’onglet : **perte du travail non exporté**.
- Objectif : **réduire la gravité** de ces incidents sans créer de nouveaux pièges (écrasement de fichier, confusion « quel est le vrai projet ? »).

---

## 2. Objectifs et non-objectifs

### Objectifs

- Conserver un **snapshot récent** du projet tel que l’éditeur le connaît (idéalement équivalent à ce qu’une sauvegarde `.json` / bundle produirait au même instant).
- Proposer une **récupération explicite** (« restaurer le brouillon ? ») plutôt qu’un remplacement silencieux.
- Limiter l’**usure disque / quota** et le **coût CPU** (pas d’écriture à chaque frappe).

### Non-objectifs (pour ce document)

- **Synchronisation multi-appareils** ou collaboration temps réel.
- **Historique versionné** type Git dans le navigateur (éventuellement une V2 très limitée : 2 slots max).
- **Chiffrement** des brouillons : **hors périmètre** (document de jeu, pas de données personnelles typiques ; le risque EPN reste couvert par opt-out + « effacer le brouillon »).

---

## 3. Scénarios à couvrir (UX)

| Scénario | Comportement souhaité (brouillon) |
|----------|-------------------------------------|
| F5 / crash avec brouillon plus récent que le dernier fichier ouvert | Au prochain chargement de l’éditeur : **bannière ou modale** — restaurer / ignorer / comparer (si V2). |
| Utilisateur ouvre un **nouveau** fichier alors qu’un brouillon existe | Ne pas écraser le fichier ; proposer **restaurer brouillon**, **charger le fichier**, ou **archiver brouillon** selon clarté des libellés. |
| Utilisateur **sauvegarde explicitement** (fichier / bundle) | Marquer le brouillon comme **aligné** avec cette source (optionnel V1 : simple suppression du brouillon après save réussi). |
| Projet **très gros** (médias en `blob:`) | Ne pas dupliquer les blobs dans le stockage local si évitable ; ou **refuser** le snapshot au-delà d’un seuil avec message clair. |
| Deux onglets sur le même éditeur | Éviter la course d’écriture destructrice (voir §6). |

---

## 4. Cartographie des risques

### 4.1 Perte ou corruption de données

- **Quota dépassé** (`localStorage` ~5 Mo selon navigateur ; IndexedDB plus large mais pas illimité) → écriture qui échoue ; l’utilisateur croit être sauvé alors que non.
- **JSON invalide** ou **schéma V2 incompatible** après mise à jour du code éditeur → restauration qui casse l’éditeur.
- **Snapshot pris pendant une opération intermédiaire** (ex. milieu d’un refactor DOM) → état incohérent.

*Mitigations :* écriture **atomique** (écrire dans une clé temporaire puis swap), **validation** à la restauration (`EditorCore.normalizeProjectV2` ou équivalent), **version de schéma** dans le payload brouillon, refus explicite si taille > seuil.

### 4.2 Mauvaise surprise pour l’utilisateur

- **Restauration silencieuse** qui écrase une session où l’utilisateur avait déjà rechargé un fichier propre.
- **Brouillon plus ancien** que le fichier sur disque proposé comme « à restaurer » sans indication de date.

*Mitigations :* toujours montrer **horodatage** + **titre projet** + **origine** (« brouillon navigateur ») ; action **explicite** ; option « ne plus proposer pendant cette session ».

### 4.3 Vie privée et postes partagés

- Le brouillon peut contenir **texte sensible** (énigmes, lieux) et des **URLs** ; sur un poste EPN partagé, le stockage persiste après fermeture du navigateur selon profil.

*Mitigations :* bouton **« Effacer le brouillon »** visible ; option **désactiver** la sauvegarde locale (paramètre éditeur ou `localStorage` opt-out) ; documenter le risque dans le README / guide médiateur.

### 4.4 Performance

- Sérialisation complète du projet à haute fréquence → **UI qui lague** sur les petits PC.

*Mitigations :* **debounce** (ex. 30–60 s après dernier changement détecté) + **plafond** (ex. pas plus d’1 snapshot / 2 min) + **idle** (`requestIdleCallback` si dispo) ; mesurer sur un projet « médiateur réaliste ».

### 4.5 Cohérence FR / EN

- Deux éditeurs = **deux origines** de code ; risque de divergence si la logique brouillon n’est **pas partagée** (`js/editor-shared-*.js`).

*Mitigation :* module **unique** (ex. `editor-shared-local-draft.js`) consommé par `editeur-app.js` et `editor-en-app.js`, chaînes passées en options.

### 4.6 Médias `blob:` et bundle `.escapegame`

- Un projet chargé depuis un **bundle** utilise des URLs `blob:` ; sérialiser le JSON **tel quel** peut être **énorme** ou **non re-sérialisable** de façon portable pour un simple `localStorage`.

*Mitigations V1 possibles :*  
  - **A)** brouillon = **métadonnées + structure** sans re-embed des blobs (perte des médias au restore — inacceptable seul).  
  - **B)** brouillon **refusé** si `collectPortableBundleEmbeds` non vide ou taille estimée > seuil, avec message « enregistrez le bundle sur disque ».  
  - **C)** IndexedDB + stockage **séparé** des blobs (complexité ++).  

**Décision V1 (actée)** : approche **C** avec **IndexedDB + blobs** (JSON + médias), en mode cross-browser.

Conséquence : les URLs `blob:` ne sont **jamais** considérées comme persistantes ; on persiste les **Blob** eux-mêmes, puis on recrée les object URLs au restore.

### 4.7 « Dossier temporaire » sur le disque pour les images

Une app web **ne peut pas** créer librement un dossier temporaire sur le disque de l’utilisateur (comme le ferait un installateur natif) et y écrire des fichiers sans passer par une **API explicite** et un **geste utilisateur** (sélection de dossier, enregistrement « Enregistrer sous… », etc.).  

- **Risque évoqué (fichiers non effacés)** : il apparaît surtout si on développe un **companion natif** ou des scripts hors navigateur ; dans le navigateur pur, on ne « laisse » en général pas traîner des fichiers orphelins sur le disque — on stocke plutôt en **IndexedDB** (voir §14) dans le profil du navigateur.  
- **Conclusion planification** : ne pas compter sur un dossier temp disque **transparent** pour la restauration ; privilégier **stockage dans le navigateur** (JSON + blobs) ou **re-sélection** des fichiers après rechargement (voir §13).

---

## 5. Données à persister

- **Idéal :** même objet que `getCurrentProjectData()` (ou équivalent post-normalisation), sérialisé en JSON **UTF-8**.
- **Métadonnées enveloppe** (recommandé) :
  - `draftSchemaVersion` (ex. `1`)
  - `savedAt` (ISO 8601)
  - `editorLocale` (`fr` | `en`) — informatif
  - `sourceHint` : `none` | `file` | `bundle` + éventuellement **nom de fichier** si disponible (sans chemin complet pour éviter fuite de structure disque)
  - `projectTitleSnapshot` pour affichage UI
  - `contentHash` optionnel (hash léger du JSON pour détecter « rien n’a changé » → skip écriture)

---

## 6. Stockage : `localStorage` vs IndexedDB

| Critère | `localStorage` | IndexedDB |
|--------|----------------|-----------|
| Taille | Faible, variable | Beaucoup plus large |
| API | Simple | Plus verbeuse ; idéalement wrapper ou lib légère |
| Blocage | Écriture **synchrone** → peut bloquer le thread principal | Asynchrone — mieux pour gros payloads |
| Cas d’usage V1 | Projets **sans** énormes chaînes base64 / peu de médias inline | Gros projets, blobs, plusieurs slots |

**Décision V1 (actée) :** utiliser **IndexedDB** comme stockage principal du brouillon (JSON + blobs si nécessaire), avec fallback seulement en cas d’échec runtime.

---

## 7. Déclencheurs de snapshot (à combiner)

1. **Timer doux** : toutes les *N* minutes **et** seulement si le contenu a changé depuis le dernier snapshot.
2. **Debounced « dirty »** : *M* secondes après la dernière mutation connue (changement DOM projet, scène, etc. — à instrumenter au bon niveau pour ne pas sur-détecter).
3. **`visibilitychange` (document hidden)** : snapshot léger au passage en arrière-plan (souvent meilleur que `beforeunload` seul).
4. **`beforeunload`** : **déconseillé** comme seule béquille (non fiable, UX navigateur variable) ; éventuellement en **complément** si l’API synchrone reste minime.

Éviter : écriture à **chaque** `input` sur les champs texte.

---

## 8. Multi-onglets

- Risque : deux onglets écrivent le même **store** → dernier gagnant, brouillon **mélangé** ou perdu.
- Pistes : **BroadcastChannel** ou `storage` event pour signaler « autre onglet actif » ; ou **verrou** avec `sessionStorage` + ID d’onglet ; ou message « un autre onglet a modifié le brouillon — recharger ? ».

**Titre du jeu comme discriminant** : faible fiabilité seul (deux projets peuvent avoir le même titre ; un même projet peut être renommé). À utiliser **en complément** d’un identifiant technique (ex. **ID de session d’onglet** aléatoire au chargement, stocké dans `sessionStorage`), pas comme clé unique globale.

**Cas « niveau 1 / niveau 2 dans deux onglets »** : deux options cohérentes — (1) **deux brouillons** séparés (clé = session d’onglet + éventuellement titre + horodatage), sans écrasement croisé ; (2) **un seul slot** avec avertissement si un autre onglet écrit (BroadcastChannel). Le choix dépend du coût UX vs implémentation.

**Décision V1 (actée)** : brouillon **par session d’onglet** via `tabId`.

- Chaque onglet écrit dans sa propre clé (ex. `draft:<tabId>`).
- Au chargement, si plusieurs brouillons sont trouvés, l’éditeur affiche une liste de restauration avec au minimum : `projectTitleSnapshot`, date `savedAt`, `sourceHint`, nombre de scènes.
- Le titre de jeu reste un indice d’affichage, **pas** une clé technique unique.

---

## 9. Phases d’implémentation suggérées

### Phase 0 — Spécification courte (ce document + décisions)

- Fixer les seuils pratiques (alerte stockage, taille max par brouillon, politique de purge automatique).

### Phase 1 — MVP

- Module partagé FR/EN.
- Écriture conditionnée (dirty + debounce + taille max).
- Au chargement page : si brouillon valide **et** plus récent / différent du dernier état « sauvé » connu → **modale** avec horodatage + restaurer / ignorer.
- Bouton **Effacer le brouillon** (menu ou réglages).

### Phase 2 — Confort

- Indicateur discret « Brouillon sauvegardé à … ».
- Comparaison minimale (titres / nombre de scènes) avant restore.
- Gestion multi-onglets si la Phase 0 impose « un seul onglet » insuffisant.

### Phase 3 — Optionnel

- Deuxième slot « brouillon précédent » (rotation).
- Export du brouillon en fichier `.json` en un clic (« sauvetage d’urgence »).

---

## 10. Critères de validation (manuel)

- [ ] Petit projet : F5 → brouillon proposé → restauration fidèle (scènes, hotspots, selector).
- [ ] Projet avec médias locaux / bundle : comportement **conforme** au choix §4.6 (refus documenté ou restauration complète).
- [ ] Sauvegarde fichier puis F5 : pas de modale intrusive si brouillon **aligné** avec le fichier sauvé (selon règle retenue).
- [ ] « Effacer le brouillon » : plus de proposition au rechargement.
- [ ] FR et EN : mêmes règles, libellés corrects.
- [ ] Pas de régression mesurable sur l’édition (pas de lag typing) avec snapshot activé.

---

## 11. Décisions ouvertes (checklist produit / tech)

**Préférences déjà actées (discussion produit, avril 2026)**  

- **Chiffrement** : non (hors scope ; pas d’infos personnelles ciblées dans le format jeu).  
- **Opt-out** : oui — souhaité dès que la fonctionnalité existe (transparent et explicite pour l’utilisateur / EPN).
- **Stockage V1** : **IndexedDB** (choix validé), y compris compatibilité Firefox moderne.
- **Politique médias V1** : **blobs en IndexedDB** (pas de dépendance persistante aux chaînes `blob:`).
- **Multi-onglets** : brouillon par **`tabId`** + écran de choix si plusieurs brouillons.
- **File System Access API** : hors MVP (éventuelle V2), pour rester simple et compatible partout.
- **Post-save réussi** : conserver le brouillon marqué `synchronized` jusqu’à la **prochaine ouverture réussie**, puis purge automatique.
- **Jauge stockage** : oui (si `navigator.storage.estimate()` disponible), affichage `used/quota` en bas d’écran.
- **Mode léger** : oui, option utilisateur “brouillon sans médias” (non par défaut, fallback pour projets trop lourds).
- **Seuils jauge** : alerte douce à **80%**, alerte forte à **90%**.
- **Rétention** : **1 brouillon actif + 1 brouillon synchronized** max par `tabId`, purge du reste.
- **Activation mode léger** : **manuelle uniquement** ; l’éditeur peut suggérer le mode à la reconnexion, sans activation automatique.
- **Compat snapshots anciens** : si `draftSchemaVersion` incompatible, ne pas restaurer automatiquement (message clair + suppression/ignorance guidée).
- **Critère “ouverture réussie”** : projet chargé, première scène rendue, pas d’erreur média bloquante pendant ~60 s.
- **Journalisation console** : logs techniques structurés pour `draft.save`, `draft.restore`, `draft.purge`, `draft.quota_warn`, `draft.error`.

**Encore à trancher (mineur)**

- [ ] Wording final FR/EN des messages utilisateur (quota, mode léger suggéré, snapshot incompatible).

---

## 12. Références internes

- Backlog d’origine : `docs/todo.md` (section *Éditeur — brouillon / récupération*).
- Sérialisation projet : `js/editor-shared-project-serialization.js`, `EditorCore` (`docs/ARCHITECTURE.md`).
- Export / embarqués : `js/editor-shared-export-text.js`, bundle `.escapegame` (règle projet `.cursor/rules/projet-escape-game.mdc`).

---

## 13. Fichiers locaux, chemins, CORS — ce qu’un navigateur peut (vraiment) faire

### 13.1 Il n’existe pas d’« autorisation manuelle » pour contourner CORS sur des chemins `file://`

- **CORS** concerne surtout les requêtes **entre origines** (ex. page `https://…` qui appelle une autre origine). Ce n’est **pas** un bouton que l’utilisateur ou le médiateur peut cocher pour « ouvrir le disque en illimité ».  
- Charger une image par **chemin absolu** type `C:\Users\…\image.jpg` depuis une page **hébergée en HTTPS** n’est **pas** supporté comme accès direct : le navigateur n’expose pas le système de fichiers comme une URL web.  
- En pratique, les médias locaux dans l’éditeur passent déjà par **`File`** / **`blob:`** après choix utilisateur (`<input type="file">` ou équivalent) — c’est le modèle **sécurisé** : pas de lecture arbitraire du disque.

### 13.2 Après un rechargement (F5), retrouver les fichiers sans tout ré-embed

Deux familles de solutions **standards** (pas du contournement, des APIs prévues à cet effet) :

1. **Tout garder dans le navigateur**  
   - Stocker le **JSON projet** + les **blobs** (ou `ArrayBuffer`) des médias dans **IndexedDB** (voir §14).  
   - Avantage : après F5, restauration **sans** redemander les fichiers (tant que quota OK).  
   - Limite : taille disque navigateur, pas de « fichier .json unique » côté explorateur Windows pour ce brouillon (sauf export manuel).

2. **File System Access API** (Chrome / Edge principalement ; support variable ailleurs)  
   - L’utilisateur accorde une fois l’accès à un **fichier** ou un **dossier** ; l’app reçoit des **`FileSystemHandle`**.  
   - Certains navigateurs permettent de **persister** ces handles (ex. association avec IndexedDB) pour **redemander une permission** au prochain chargement, parfois avec un léger geste utilisateur si le navigateur l’exige.  
   - Ce n’est **pas** du CORS : c’est un **modèle de capacités** (« tu as choisi ce dossier, je peux relire ces fichiers »).  
   - **Complexité** : détection de support, repli (re-sélection manuelle des fichiers) sur navigateurs sans API, UX claire (« réassocier le dossier médias »).

### 13.3 Synthèse pour le plan produit

| Besoin | Piste réaliste |
|--------|----------------|
| Récupération F5 **sans** redemander les fichiers | IndexedDB (JSON + blobs) ou handles + relecture disque |
| Éviter gros duplicata en RAM | IndexedDB asynchrone + stockage binaire |
| Ne pas laisser d’**orphelins sur le disque** | Éviter d’écrire hors API navigateur ; préférer IDB / handles plutôt qu’un « dossier temp » maison |

**Décision V1 (actée)** : première ligne uniquement via **IndexedDB (JSON + blobs)**. Les handles File System Access restent une piste V2.

---

## 14. IndexedDB — qu’est-ce que c’est ? (vue projet)

**IndexedDB** est une **base de données locale dans le navigateur**, attachée au **site** (même origine que l’éditeur), qui survit aux **F5** et fermetures d’onglet (tant que l’utilisateur ne vide pas les données du site).

- **Différence avec `localStorage`** : beaucoup plus **grande capacité** en pratique ; accès **asynchrone** (ne bloque pas l’interface pendant d’énormes écritures) ; peut stocker des **objets structurés** et des **blobs** (fichiers / images) sans tout mettre dans une seule chaîne JSON gigantesque.  
- **Intérêt pour ce chantier** : c’est la voie naturelle pour un **brouillon complet** incluant **médias** (images / audio référencés en blob dans le projet), sans inventer un dossier temp sur le disque.  
- **Compatibilité navigateurs** : supportée par Firefox, Chrome, Edge et Safari modernes (avec variations de quota / mode privé).  
- **Limites** : quota non infini ; comportement si **disque plein** ; API un peu verbeuse → un petit **wrapper** dans `editor-shared-*.js` suffit souvent.

### 14.1 Budget stockage visible (recommandation UX)

Pour éviter l’effet « surprise quota atteint », ajouter un indicateur discret en bas d’écran :

- Affichage : `Stockage brouillon : X Mo / Y Mo` (+ pourcentage).
- Source technique : `navigator.storage.estimate()` (valeurs **approximatives** selon navigateur).
- Fréquence : au chargement, puis après chaque snapshot réussi (pas en boucle agressive).
- Si `used / quota` >= **80%** : avertissement non bloquant.
- Si `used / quota` >= **90%** : avertissement renforcé + suggestion explicite d’activer “mode brouillon léger (sans médias)”.

---

## 15. Annuler / répéter — lien avec la sauvegarde locale

**Statut actuel : reporté (« plus tard »), hors MVP sauvegarde locale.**

**Ce ne sont pas la même chose**, mais on peut les **articuler** sans dupliquer toute la logique métier.

| Mécanisme | Rôle |
|-----------|------|
| **Brouillon auto** | Protection contre crash / F5 ; **états complets** espacés dans le temps. |
| **Annuler / répéter (undo/redo)** | Historique **court** des actions fines (idéalement sans resérialiser tout le projet à chaque frappe). |

**Piste « peu de code nouveau »** :  
- **V1 undo léger** : bouton **« Revenir au dernier brouillon enregistré »** (ou 2–3 snapshots en rotation) = réutiliser le **même pipeline** que « charger un projet » (`applyLoadedProject` / chargement JSON existant), pas une pile d’undo générique sur le DOM.  
- **V2 undo riche** : pile de commandes ou snapshots différentiels — **chantier plus lourd** ; à ne pas fusionner mécaniquement avec le MVP brouillon sans cadrage.

**Réutilisation** : toute restauration (brouillon ou « annuler vers snapshot ») devrait passer par les **mêmes fonctions** que le chargement fichier / bundle aujourd’hui (normalisation `EditorCore`, réinjection DOM, Quill, etc.) pour limiter la **redondance** et les divergences de bugs.

---

## 16. Réutiliser le code existant (principe d’implémentation)

- **Sérialisation** : `getCurrentProjectData()` (ou équivalent central) — **une seule vérité** pour « à quoi ressemble le projet sur disque ».  
- **Désérialisation** : chemins déjà utilisés au **load** `.json` / `.escapegame` — factoriser un **`loadProjectFromObject(json)`** (ou nom existant) si ce n’est pas déjà le cas, appelé à la fois par le fichier et par « restaurer brouillon ».  
- **Taille / médias** : réutiliser les helpers déjà utilisés pour l’export (ex. détection d’embeds, `collectPortableBundleEmbeds`) pour **décider** refus snapshot vs IDB, plutôt que dupliquer la logique.  
- **FR / EN** : logique dans **`js/editor-shared-*.js`**, chaînes en paramètres — aligné avec les phases de refactor déjà livrées.

---

## 17. Comportement recommandé après “Save” réussi

Décision produit recommandée pour limiter les pertes :

- Quand l’utilisateur sauvegarde avec succès (`.json` / `.escapegame`), le brouillon est marqué `synchronized` (pas purgé immédiatement).
- Le brouillon est conservé jusqu’à la **prochaine ouverture réussie** de l’éditeur avec état cohérent, puis purgé automatiquement.
- Un bouton manuel “Effacer le brouillon maintenant” reste disponible.

Cette règle offre un filet de sécurité contre les bugs rares post-save, sans accumuler des snapshots inutilement.

Définition opérationnelle de **“ouverture réussie”** (V1) :

- Chargement du projet sans erreur bloquante de parsing/normalisation.
- Première scène rendue côté preview/éditeur.
- Aucune erreur média bloquante détectée pendant ~60 secondes après restauration.

---

## 18. Option “brouillon sans médias” (fallback volontaire)

Pour les projets très lourds, proposer une option utilisateur (proche de l’opt-out) :

- `Mode brouillon léger (sans médias)` : on sauvegarde la structure du projet + métadonnées médias (nom/URL d’origine) sans stocker les blobs.
- Au restore, l’éditeur signale les médias manquants et propose leur réassociation manuelle.
- Ce mode est **dégradé mais utile** quand la capacité IndexedDB est insuffisante.

Ce n’est pas le mode par défaut : le défaut reste **brouillon complet avec blobs**.

Comportement UX retenu :

- L’éditeur peut **suggérer** ce mode quand le stockage est critique (>= 90%).
- L’activation reste **strictement manuelle** (aucun basculement automatique).

---

## 19. Rétention et optimisation d’espace (V1)

- Rétention par `tabId` : maximum **2 entrées** (`1 actif + 1 synchronized`), purge LRU du surplus.
- Objectif : éviter l’empilement de snapshots anciens tout en gardant un filet de sécurité post-save.
- Optimisation médias : déduplication des blobs identiques entre snapshots d’un même `tabId` (stockage par hash/contenu), afin de ne dupliquer que les métadonnées et références quand les médias n’ont pas changé.

---

## 20. Compatibilité snapshots et diagnostics

- Si un brouillon local porte une version incompatible (`draftSchemaVersion` non supportée), l’éditeur n’essaie pas de l’appliquer automatiquement.
- UX attendue : message clair indiquant incompatibilité + proposition d’ignorer/purger ce brouillon.
- Journalisation console structurée recommandée pour faciliter le debug terrain :
  - `draft.save`, `draft.restore`, `draft.purge`, `draft.quota_warn`, `draft.error`.

---

*Document vivant : à mettre à jour quand les décisions §11 sont prises et quand les phases sont livrées.*
