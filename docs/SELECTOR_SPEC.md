# Selector v1 — Spécification (brouillon cible)

Document de travail pour le futur type de hotspot **`selector`** (menu de choix, sous-menus, options conditionnelles, SFX par choix).  
**Rien de ce qui suit n’est encore implémenté** dans le code : c’est le cahier des charges pour le refactor prévu.

Pour le contexte général du projet, voir [ARCHITECTURE.md](./ARCHITECTURE.md).

---

## 1. Objectifs

- Un hotspot peut ouvrir une **popup menu** avec plusieurs **choix** (boutons et/ou liste déroulante — voir §4).
- Chaque choix exécute une **action** du même genre que les hotspots actuels : `msg`, `scene`, `pick`, `req`, `pwd`, ou un **sous-selector** (imbrication).
- **Un seul moteur d’actions** côté jeu généré : `executeAction(payload, …)` appelé depuis un hotspot “classique” ou depuis un choix de selector.
- **Style** : la popup selector réutilise les **paramètres globaux de personnalisation des boîtes de dialogue** (comme les popups actuelles).

**Rétrocompatibilité JSON** : non requise pour ce projet au moment du refactor (usage principal = auteur seul, anciens fichiers surtout POC). Un **schéma JSON v2** peut donc **casser** l’ancien format si cela simplifie le code ; documenter une procédure de migration manuelle ou un script reste utile pour qui aurait gardé d’anciens `.json`.

---

## 2. Principes d’architecture (jeu généré)

| Couche | Rôle |
|--------|------|
| `hotspotDispatcher(hsDiv, args)` | Point d’entrée Pannellum. Si `args.type === 'selector'` → ouvrir l’UI selector ; sinon → `executeAction(...)`. |
| `executeAction(payload, hsDiv, uiContext)` | Exécute une action unique (message, changement de scène, ramassage, requis, passcode, etc.). |
| `openSelector(selectorArgs, uiContext)` | Affiche **une seule** surface modale ; le **contenu** (titre, intro, liste de choix) est **remplacé** quand on descend dans un sous-menu ou qu’on revient en arrière. **Pas** d’empilement de plusieurs popups les unes sur les autres — uniquement une **pile logique** (historique) pour le bouton Retour. |
| `evaluateChoiceVisibility(choice, gameState)` | (Optionnel v1) Décide si un choix est visible / activé selon l’inventaire ou d’autres états. |

**Contexte partagé** : inventaire, scène courante, états de déverrouillage, etc. Les sous-selectors **héritent** du même état global (pas de “sandbox” séparé sauf besoin futur explicite).

**Anti double-clic** : tant qu’un selector (ou une popup modale dérivée) est ouvert, les interactions sur le panorama / autres hotspots sont **bloquées** (overlay plein écran ou équivalent), pour éviter les clics en cascade.

---

## 3. Modèle de données (JSON projet / args générés)

### 3.1 Hotspot `selector` (schéma cible)

Champs communs avec les autres types : `pitch`, `yaw`, `cssClass`, `type: "selector"`.

Payload minimal :

```json
{
  "type": "selector",
  "id": "hs_uid_…",
  "title": "Terminal",
  "introHtml": "<p>Écran d’accueil…</p>",
  "choices": [
    {
      "id": "choice_1",
      "label": "Lire les mails",
      "actionType": "selector",
      "nested": {
        "title": "Boîte mail",
        "introHtml": "",
        "choices": [
          { "id": "m1", "label": "Mail 1", "actionType": "msg", "txt": "…" },
          { "id": "m2", "label": "Mail 2", "actionType": "msg", "txt": "…" }
        ]
      }
    },
    {
      "id": "choice_2",
      "label": "Désactiver l’alarme",
      "actionType": "pwd",
      "enigmeTxt": "…",
      "pwd": "1234",
      "onSuccess": { "actionType": "scene", "target": "couloir" }
    }
  ]
}
```

- **`nested`** ou **`actionType: "selector"` + sous-objet** : à trancher à l’implémentation (une seule convention pour éviter la duplication).
- **`introHtml`** : optionnel ; texte descriptif au-dessus des choix (style “livre dont vous êtes le héros”).

### 3.2 Champs par `choice` (tous optionnels sauf `label` + branche action)

| Champ | Usage |
|-------|--------|
| `label` | Texte du bouton ou entrée de liste. |
| `actionType` | `msg` \| `scene` \| `pick` \| `req` \| `pwd` \| `selector` |
| `requiresItem` | (Optionnel) ID d’objet : le choix n’apparaît que si l’inventaire contient cet ID. |
| `hiddenIfHasItem` | (Optionnel) ID d’objet : le choix est masqué si le joueur possède cet objet. |
| `sfxUrl` | URL du son au clic sur ce choix (optionnel). |
| `sfxVolume` | 0–1, relatif au canal SFX du joueur (`sfxVol` × `masterVol`). |
| `displayMode` | Sur un niveau (`nested` ou racine via l’éditeur) : `buttons` (défaut) ou `dropdown`. |

Les autres champs reprennent la **même sémantique** que les champs actuels des hotspots (ex. `txt`, `target`, `itemId`, `ko`, `transTxt`, etc.) pour que `executeAction` reste unique.

### 3.3 Équivalence “hotspot classique = selector à un choix”

Conceptuellement :

- `type: "msg"` + texte ≈ `selector` avec **un seul** `choice` `{ actionType: "msg", … }`.

En implémentation v1 on peut **garder les types existants** dans l’éditeur et ne pas forcer la migration visuelle ; la factorisation interne se fait côté **runtime** (`executeAction`).

---

## 4. UI / UX

### 4.1 Présentation des choix

- **v1** : prévoir les **deux** modes d’affichage (configurable par selector ou par préférence globale) :
  - **Boutons** (liste verticale, plus immersif, prend de la place).
  - **Liste déroulante** + texte descriptif (plus compact, style LDVELH).
- Les deux utilisent les **mêmes données** (`choices[]`).

### 4.2 Navigation

- **Retour** : ramène au **contenu** du niveau précédent **dans la même boîte** (une seule modale DOM).
- **Fermer / Sortir** : ferme cette seule modale (équivalent croix).
- Sous-menus imbriqués : **historique logique** (tableau ou pile en mémoire) pour savoir quoi re-rendre au Retour — **pas** de nouvelle popup par niveau.

### 4.3 Fermeture après une action “feuille”

- Objectif : **éviter** une deuxième modale “message” par-dessus le selector. Préférer : message **dans la même surface** (remplacer le corps du menu par le texte + bouton OK puis revenir au menu ou fermer), ou fermer le selector puis afficher un message — à trancher à l’implémentation, mais **pas** de stack visuelle de popups.

### 4.4 Options conditionnelles (inventaire / état)

- **Option A** : tous les choix listés ; certains **masqués** ou **désactivés** si prérequis non remplis.
- **Option C** : liste **calculée à l’ouverture** du niveau (certaines branches absentes du JSON affiché).

Les deux sont compatibles avec le même schéma si `evaluateChoiceVisibility` est bien défini.

---

## 5. Côté éditeur (à implémenter plus tard)

- Nouvelle valeur dans `.hs-type` : `selector`.
- Conteneur dynamique : ajouter / supprimer / réordonner des **choix** ; chaque choix a un sous-formulaire selon `actionType` (comme aujourd’hui `updateHsFields`, mais imbriqué).
- `extractHotspotData`, `saveProject`, `loadProject`, `generateGame` : sérialiser / désérialiser l’arbre `choices` (et IDs stables pour les tests).

---

## 6. Migration et compatibilité

- **Pas d’engagement** de charge automatique des anciens `.json` si le schéma change (voir §1). Si besoin : export manuel, ou script de migration, ou ressaisie dans l’éditeur.
- Les **jeux déjà générés** (`index.html` téléchargés) restent des fichiers figés ; seuls les **nouveaux** jeux générés après le refactor suivront le nouveau moteur.

---

## 7. Ordre d’implémentation recommandé

1. ~~Refactor **jeu généré uniquement** : extraire `executeAction` depuis la logique actuelle de `hotspotDispatcher` + `executeReward` ; valider avec des scénarios de test (anciens POC optionnels).~~ **Fait** (template dans `js/editeur-generate.js` / `js/editor-en-generate.js`).
2. ~~Ajouter `openSelector` minimal (liste de boutons, un niveau, pas d’imbrication).~~ **Fait** : overlay plein écran (`#selector-overlay`), une modale, boutons ; `choiceToPayload` → `executeAction` pour `msg` / `scene` / `pick`.
3. ~~Étendre JSON + éditeur pour éditer `choices` simples.~~ **Partiel** : type `selector` + titre / intro / **textarea JSON** des choix (édition avancée) ; à remplacer plus tard par un formulaire guidé (ajout/suppression de lignes, etc.).
4. ~~Ajouter **Retour**, **imbrication**~~ **Fait** ; ~~**visibilité conditionnelle** (`requiresItem`, `hiddenIfHasItem`), **liste déroulante** (`displayMode`), **SFX** (`sfxUrl`, `sfxVolume` + `audioSys.playSFX`)~~ **Fait** (joueur + option éditeur « Liste déroulante » ; champs JSON documentés dans l’UI).
5. Découpage fichiers (`player.js` / modules) une fois le comportement stable.

---

## 8. Références croisées

- Vision produit et refactor : section “Planned selector refactor” dans [ARCHITECTURE.md](./ARCHITECTURE.md).
- Checklist contributeur : [CONTRIBUTING.md](./CONTRIBUTING.md).
