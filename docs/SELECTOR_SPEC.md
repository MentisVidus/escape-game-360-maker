# Selector v1 — Spécification et état d’implémentation

Document pour le hotspot **`selector`** (menu de choix, sous-menus, options conditionnelles, SFX par choix).  
**La plupart du comportement décrit ci-dessous est implémenté** (éditeur FR/EN + jeu généré) ; les paragraphes marqués *roadmap* ou *à trancher* restent des pistes.

Pour le contexte général du projet et le **flux sauvegarde / chargement** (avec diagramme), voir [ARCHITECTURE.md](./ARCHITECTURE.md) (section *Hotspot `selector` in the project file* et *Selector : flux sauvegarde / chargement*).

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

- **Convention actuelle** : pour un sous-menu, `actionType: "selector"` + objet **`nested`** (`title`, `introHtml`, `choices`, `displayMode` optionnel). Pas de second format parallèle dans l’éditeur / le joueur.
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

- **Implémenté (v1)** : pour un choix `actionType: "msg"`, le texte s’affiche **dans la même modale** (vue « Message » avec zone défilante pour les longs textes), bouton **← Retour au menu** pour revenir au niveau de choix sans fermer le selector — pas de seconde popup par-dessus.
- Les hotspots **classiques** (`msg` hors selector) restent sur `afficherPopup` (comportement inchangé).
- **Scène / ramassage** depuis le selector : fermeture du selector puis logique habituelle (`executeAction`). Pour un **pick**, le hotspot **selector** n’est **pas** masqué (contrairement au pick « classique ») : la même zone doit pouvoir rouvrir le menu pour d’autres choix ou indices.

### 4.3 bis — Inventaire « pick » et visibilité future

- Après un ramassage depuis le selector, le panneau inventaire s’**ouvre** si l’inventaire global est activé (sinon l’objet est quand même dans l’état `inventaire` mais l’UI reste masquée).
- **Roadmap** : option éditeur / champ JSON du type `isHidden` (ou équivalent) pour qu’un objet ramassé soit **compté dans la logique** mais **non listé** dans l’inventaire visible (cas narratifs / quêtes cachées).

### 4.4 Options conditionnelles (inventaire / état)

- **Option A** : tous les choix listés ; certains **masqués** ou **désactivés** si prérequis non remplis.
- **Option C** : liste **calculée à l’ouverture** du niveau (certaines branches absentes du JSON affiché).

Les deux sont compatibles avec le même schéma si `evaluateChoiceVisibility` est bien défini.

---

## 5. Côté éditeur (implémenté — détail)

- Valeur **`.hs-type` : `selector`** ; champs titre, intro, mode d’affichage (boutons / liste déroulante).
- **Formulaire structuré** : cartes de choix (ajout / suppression / réordonnancement), sous-formulaire par `actionType` (`msg`, `scene`, `pick`, `selector` avec bloc **nested**), champs conditionnels (ex. `requiresItem`, `hiddenIfHasItem`, SFX).
- **JSON avancé** : textarea synchronisé avec le formulaire ; mode expert pour édition directe du tableau (voir `selJsonExpertMode` dans le JSON projet).
- **`f_sel_choices`** : dans le fichier projet, le tableau est stocké en **chaîne** (`JSON.stringify`) ; au chargement, ordre critique : remplir le textarea puis **`initSelectorChoicesForm`** (voir [ARCHITECTURE.md](./ARCHITECTURE.md)).
- `extractHotspotData`, `saveProject`, `loadProject`, `generateGame` : chemins alignés sur ce modèle (imbrication `nested` pour les sous-menus).

---

## 6. Migration et compatibilité

- **Pas d’engagement** de charge automatique des anciens `.json` si le schéma change (voir §1). Si besoin : export manuel, ou script de migration, ou ressaisie dans l’éditeur.
- Les **jeux déjà générés** (`index.html` téléchargés) restent des fichiers figés ; seuls les **nouveaux** jeux générés après le refactor suivront le nouveau moteur.

---

## 7. Ordre d’implémentation recommandé

1. ~~Refactor **jeu généré uniquement** : extraire `executeAction` depuis la logique actuelle de `hotspotDispatcher` + `executeReward` ; valider avec des scénarios de test (anciens POC optionnels).~~ **Fait** (template dans `js/editeur-generate.js` / `js/editor-en-generate.js`).
2. ~~Ajouter `openSelector` minimal (liste de boutons, un niveau, pas d’imbrication).~~ **Fait** : overlay plein écran (`#selector-overlay`), une modale, boutons ; `choiceToPayload` → `executeAction` pour `msg` / `scene` / `pick`.
3. ~~Étendre JSON + éditeur pour éditer `choices`.~~ **Fait** : formulaire guidé + textarea JSON (sync bidirectionnelle, mode expert).
4. ~~Ajouter **Retour**, **imbrication**~~ **Fait** ; ~~**visibilité conditionnelle** (`requiresItem`, `hiddenIfHasItem`), **liste déroulante** (`displayMode`), **SFX** (`sfxUrl`, `sfxVolume` + `audioSys.playSFX`)~~ **Fait** (joueur + option éditeur « Liste déroulante » ; champs JSON documentés dans l’UI).
5. Découpage fichiers (`player.js` / modules) une fois le comportement stable.

---

## 8. Références croisées

- Vision produit et flux save/load : section **Hotspot `selector` (implémenté)** dans [ARCHITECTURE.md](./ARCHITECTURE.md).
- Checklist contributeur : [CONTRIBUTING.md](./CONTRIBUTING.md).
