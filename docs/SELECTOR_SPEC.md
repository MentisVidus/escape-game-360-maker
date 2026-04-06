# Selector v1 — Spécification (brouillon cible)

Document de travail pour le futur type de hotspot **`selector`** (menu de choix, sous-menus, options conditionnelles, SFX par choix).  
**Rien de ce qui suit n’est encore implémenté** dans le code : c’est le cahier des charges pour le refactor prévu.

Pour le contexte général du projet, voir [ARCHITECTURE.md](./ARCHITECTURE.md).

---

## 1. Objectifs

- Un hotspot peut ouvrir une **popup menu** avec plusieurs **choix** (boutons et/ou liste déroulante — voir §4).
- Chaque choix exécute une **action** du même genre que les hotspots actuels : `msg`, `scene`, `pick`, `req`, `pwd`, ou un **sous-selector** (imbrication).
- **Un seul moteur d’actions** côté jeu généré : `executeAction(payload, …)` appelé depuis un hotspot “classique” ou depuis un choix de selector.
- **Rétrocompatibilité** : projets et jeux existants sans `selector` inchangés.
- **Style** : la popup selector réutilise les **paramètres globaux de personnalisation des boîtes de dialogue** (comme les popups actuelles).

---

## 2. Principes d’architecture (jeu généré)

| Couche | Rôle |
|--------|------|
| `hotspotDispatcher(hsDiv, args)` | Point d’entrée Pannellum. Si `args.type === 'selector'` → ouvrir l’UI selector ; sinon → `executeAction(...)`. |
| `executeAction(payload, hsDiv, uiContext)` | Exécute une action unique (message, changement de scène, ramassage, requis, passcode, etc.). |
| `openSelector(selectorArgs, uiContext)` | Affiche la popup menu, gère la pile de navigation (Retour), Fermer, et les clics sur les choix. |
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
| `sfxUrl` | URL du son à jouer au clic sur ce choix (optionnel). |
| `sfxVolume` | 0–1, relatif ; combinaison future avec volume joueur (cf. roadmap audio). |

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

- **Retour** : ramène au niveau de menu précédent ; **la popup reste ouverte** (pas de fermeture complète).
- **Fermer / Sortir** : ferme tout le selector (équivalent croix).
- Sous-menus imbriqués : pile de “pages” gérée par `openSelector` (stack).

### 4.3 Fermeture après une action “feuille”

- Règle par défaut : après exécution d’une action qui n’est **pas** une navigation interne au menu (ex. message simple), comportement à définir finement :
  - soit fermer le selector après le message (si le message est modal séparé),
  - soit garder le selector ouvert selon le type (à préciser lors de l’implémentation pour rester cohérent avec `afficherPopup` actuel).

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

- Projets JSON **sans** champ `selector` : chargement inchangé.
- Jeux générés **anciens** : mêmes types `msg`, `scene`, etc. ; pas de régression si le template détecte l’absence de `selector`.

---

## 7. Ordre d’implémentation recommandé

1. Refactor **jeu généré uniquement** : extraire `executeAction` depuis la logique actuelle de `hotspotDispatcher` + `executeReward` ; tests sur jeux existants.
2. Ajouter `openSelector` minimal (liste de boutons, un niveau, pas d’imbrication).
3. Étendre JSON + éditeur pour éditer `choices` simples.
4. Ajouter **Retour**, **imbrication**, **visibilité conditionnelle**, **liste déroulante**, **SFX par choice**.
5. Découpage fichiers (`player.js` / modules) une fois le comportement stable.

---

## 8. Références croisées

- Vision produit et refactor : section “Planned selector refactor” dans [ARCHITECTURE.md](./ARCHITECTURE.md).
- Checklist contributeur : [CONTRIBUTING.md](./CONTRIBUTING.md).
