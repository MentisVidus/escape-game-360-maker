# Plan — connexions carte React (futur & décisions)

Ce document pose les **questions ouvertes** pour trancher la sémantique produit et technique, et note l’état actuel du code (branche `feat/react-map`).

## État actuel (résumé)

- **Flow bleu** (`in` / `out`, voir `xflow/react/src/mapFlowHandles.ts`) : règles dans `App.tsx` (`isValidConnection` / `onConnect`).
- **Rattachement DOM** (déplacement réel de hotspots) : `attachHotspotToMapScene`, `detachHotspotToStaging`, `promoteMapOrphanHotspotIntoSelectorRoot`, etc. (`js/editeur-app.js` / `editor-en-app.js`).
- **Liens hors modèle V2 immédiat** (ex. choix menu → hotspot **sur la même scène** que le menu, ou hotspot selector → autre hotspot sur la même scène) : arêtes **en pointillés** persistées en **sessionStorage** (`xflow/react/src/mapFlowExtraEdges.ts`, clé dérivée du `layoutKey` de la carte). Elles **ne sont pas** dans `project.json` tant qu’on n’a pas défini la compilation vers le schéma joueur.

## Questions à trancher (réponses souhaitées)

### 1. « Stub » / entité intermédiaire sur la carte

Tu évoques une entité **ni hotspot ni choix**, orpheline sur la carte puis **spécialisée** une fois reliée.

- **Q1.1** : Cette entité doit-elle **vivre dans le JSON projet** (nouveau type de nœud / `hotspots` avec `sceneId: null` + champs dédiés), ou rester **uniquement** une couche carte jusqu’à « maturation » en hotspot réel ?
- **Q1.2** : À la connexion à une scène, transformation **obligatoire** en `.hotspot-block` classique, ou possibilité de rester un **proxy** (référence vers un gabarit) ?
- **Q1.3** : Quelles données **minimales** doivent survivre en mode orphelin pour chaque `action.type` (msg / pick / req / pwd / scene / selector) ? Tu proposes déjà : type + champs du type ; faut-il aussi **visibilité**, **SFX**, **id stable** pour les cibles de scène ?

### 2. Choix menu → hotspot (même scène)

Aujourd’hui le moteur V2 relie surtout les choix à des **scènes** (action `scene`, etc.), pas à un **hotspot cible** par id.

- **Q2.1** : Un lien « choix → hotspot B » signifie-t-il : **révéler** B, **déplacer** le joueur vers une sous-scène, **déclencher** B comme si clic, ou **purement pédagogique** sur la carte ?
- **Q2.2** : Si ce n’est que pédagogique : acceptable que ce soit **hors export joueur** jusqu’à phase « compilation » ?
- **Q2.3** : Si ce doit impacter le joueur : préfères-tu une **extension du schéma V2** (ex. `targetHotspotId` sur l’action du choix) ou une **compilation** depuis le graphe vers des actions existantes ?

### 3. Hotspot selector (nœud menu) → autre hotspot

- **Q3.1** : Le lien **selector (parent) → hotspot B** est-il toujours **redondant** avec « scène contient B » (donc doc seulement), ou doit-il exprimer une **dépendance** (ordre d’apparition, prérequis) ?
- **Q3.2** : Faut-il **interdire** les cycles selector → … → selector ?

### 4. Récompenses req / pwd « nodifiées »

- **Q4.1** : La récompense doit-elle rester **une action inline** dans le JSON actuel, ou devenir un **nœud** relié (et donc sérialisé) ?
- **Q4.2** : Compatibilité ascendante : les anciens projets **sans** nœud récompense restent-ils **100 %** éditables sans migration ?

### 5. Médias & ports N / E / S / O

Tu as décrit Image / Audio avec sorties **Nord** vers scène / hotspots / global.

- **Q5.1** : On renomme-tôt les `Handle` React Flow (`metaOut` → `south`, `north`, …) **tout de suite**, ou on garde les ids actuels et on ne fait que **repositionner** visuellement ?
- **Q5.2** : Les arêtes « Nord » vers **GlobalAudio** impliquent-elles un **nœud** musique globale dédié sur la carte (aujourd’hui ressource attachée à la scène d’entrée) ?

### 6. Objet futur (node objet)

- **Q6.1** : L’objet est-il **global au projet** (un inventaire de définitions) ou **par scène** ?
- **Q6.2** : Lien **Pick → objet** : est-ce le **même** objet que celui exigé par **Req** (référence unique) ?

---

## Prochaine étape technique (après tes réponses)

1. Traduire les réponses en **règles** dans `mapConnectionPolicy` (ou équivalent) + matrice source/target/handle.
2. Décider du **sort** des arêtes `xflow-extra:*` : rester session-only, migrer vers `project.mapLayout.edges`, ou compiler vers V2.
3. Ajuster **export joueur** / **EditorCore** si le schéma V2 évolue.
