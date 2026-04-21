# Plan — connexions carte React (futur & décisions)

Ce document pose les **questions ouvertes** pour trancher la sémantique produit et technique, et note l’état actuel du code (branche `feat/react-map`).

## État actuel (résumé)

- **Flow bleu** (`in` / `out`, voir `xflow/react/src/mapFlowHandles.ts`) : règles dans `App.tsx` (`isValidConnection` / `onConnect`).
- **Rattachement DOM** (déplacement réel de hotspots) : `attachHotspotToMapScene`, `detachHotspotToStaging`, `promoteMapOrphanHotspotIntoSelectorRoot`, etc. (`js/editeur-app.js` / `editor-en-app.js`).
- **Pas d’arêtes « extras » session** : le graphe carte = arêtes dérivées du projet (+ positions nœuds en session). Tout lien jouable / narration doit vivre dans le JSON ou être compilé explicitement.

## Questions à trancher (réponses souhaitées)

### 1. « Stub » / entité intermédiaire sur la carte

Tu évoques une entité **ni hotspot ni choix**, orpheline sur la carte puis **spécialisée** une fois reliée.

- **Q1.1** : Cette entité doit-elle **vivre dans le JSON projet** (nouveau type de nœud / `hotspots` avec `sceneId: null` + champs dédiés), ou rester **uniquement** une couche carte jusqu’à « maturation » en hotspot réel ?
  - R1.1 : Une existance uniquement dans la carte me parait suffisante et parfiatement adapté.
- **Q1.2** : À la connexion à une scène, transformation **obligatoire** en `.hotspot-block` classique, ou possibilité de rester un **proxy** (référence vers un gabarit) ?
  - R1.2 : Je ne suis pas trop sure de ce que tu entends par la. Si relié a une scene il faut qu'a terme quand on lance l'edition du jeu (generategame) il soit bien integrer a l'interieur, donc tant que c'est bien le cas et qu'eventuelement ça complète tout de meme le .hotspot-block si je retourne dans le formulaire, ça peux bien rester un proxy tant qu'il est capable d'ecrire et de lire le hotspot.block si j'interviens par celui-ci.
- **Q1.3** : Quelles données **minimales** doivent survivre en mode orphelin pour chaque `action.type` (msg / pick / req / pwd / scene / selector) ? Tu proposes déjà : type + champs du type ; faut-il aussi **visibilité**, **SFX**, **id stable** pour les cibles de scène ?
  - R1.3 : ça depend de ce qui est faisable avec les nodes. un sfx est déja une node, donc tant que l'arrete reste lié, ça revien a conservé le sfx, idem pour l'id objet dans un pick ou req si on deporte celui-ci dans un node "objet" qui contient l'object id et le nom dans l'inventaire. les seul champs a conservé sont les texte de description lié a la naration ( "la porte s'ouvre" "Vous trouver une envelope sur le gueridon"...). C'est un peux plus complexe pour un selector, il doit savoir son mode d'affichage (bouton ou select) en plus de son titre et description. Tout les hotspot ou scene on aussi un espace facultatif de note qui reste visible quand replié et est affiché sur la node.

### 2. Choix menu → hotspot (même scène)

Aujourd’hui le moteur V2 relie surtout les choix à des **scènes** (action `scene`, etc.), pas à un **hotspot cible** par id.

- **Q2.1** : Un lien « choix → hotspot B » signifie-t-il : **révéler** B, **déplacer** le joueur vers une sous-scène, **déclencher** B comme si clic, ou **purement pédagogique** sur la carte ?
  - R2.1 : un choix ne peux pas renvoyer vers un hotspot. la seul diff entre un choix et un hotspot, c'est qu'un hotspot a des coordonée pitch et yaw, alors qu'un choix depend d'un selecteur. Ainsi un choix qui renvoie vers "hotspot B" n'est pas quelque chose de possible. Le choix peut renvoyer vers une scene s'il s'agit d'un choix de transition ou d'une récompense, ou eventuelement un objet quand la node sera implementé.
- **Q2.2** : Si ce n’est que pédagogique : acceptable que ce soit **hors export joueur** jusqu’à phase « compilation » ?
  - R2.2 : Ce n'est pas pédagogique, par contre si on implemente de liens "pedagogique" comme indice par exemple, ou ce n'est pas a mettre dans l'export joueur, par contre c'est a sauvegarder pour le projet.
- **Q2.3** : Si ce doit impacter le joueur : préfères-tu une **extension du schéma V2** (ex. `targetHotspotId` sur l’action du choix) ou une **compilation** depuis le graphe vers des actions existantes ?
  - R2.3 : La je ne suis pas sur de ce que tu me demande.

### 3. Hotspot selector (nœud menu) → autre hotspot

- **Q3.1** : Le lien **selector (parent) → hotspot B** est-il toujours **redondant** avec « scène contient B » (donc doc seulement), ou doit-il exprimer une **dépendance** (ordre d’apparition, prérequis) ?
  - R3.1 : je crois que tu parle du lien en tiret que tu a fait apparaitre. Il s'agit d'une incomprehension. IL n'a pas lieu d'etre. Un lien entre un selector et un hotspot est forcement un lien de subordination/dependance quelque soit le sens de ce lien. Soit il s'agit du selector de recompense à un req ou pwd soit il s'agit d'un selector parent du "hotspot" qui n'en est donc pas un puisque ça devient dés lors un "choix" (identique au hotspot les coordonée en moins)
- **Q3.2** : Faut-il **interdire** les cycles selector → … → selector ?
  - R3.2 : Non au contraire il est souhaité.

### 4. Récompenses req / pwd « nodifiées »

- **Q4.1** : La récompense doit-elle rester **une action inline** dans le JSON actuel, ou devenir un **nœud** relié (et donc sérialisé) ?
  - R4.1 :  je ne sais pas ce que ça changerais du points de vu de l'utilisateur, je ne peux donc pas donner mon avis sur la question.
- **Q4.2** : Compatibilité ascendante : les anciens projets **sans** nœud récompense restent-ils **100 %** éditables sans migration ?
  - R4.2 : Non, ce n'est absolument pas grave si on perd la compatibilité des vieux projet. la maj React est suffisament majeur pour celà.

### 5. Médias & ports N / E / S / O

Tu as décrit Image / Audio avec sorties **Nord** vers scène / hotspots / global.

- **Q5.1** : On renomme-tôt les `Handle` React Flow (`metaOut` → `south`, `north`, …) **tout de suite**, ou on garde les ids actuels et on ne fait que **repositionner** visuellement ?
  - R5.1 :  c'est un nom surtout visuel que j'ai donnée pour que l'on se comprenne clairement. tant que ça reste claire dans le code, on n'est pas obligé de les renomé. D'autant qu'a terme il est possible qu'il y ai plusieur "in" par coté pour gerer l'affichage conditionnel par exemple.
- **Q5.2** : Les arêtes « Nord » vers **GlobalAudio** impliquent-elles un **nœud** musique globale dédié sur la carte (aujourd’hui ressource attachée à la scène d’entrée) ?
  - R5.2 : oui c'est ce que ça implique mais non n'avons pas encore travailler sur le ou les nodes GameRules donc je ne pense pas qu'il faille s'en soucié pour le moment.

### 6. Objet futur (node objet)

- **Q6.1** : L’objet est-il **global au projet** (un inventaire de définitions) ou **par scène** ?
  - R6.1 : je ne suis pas sur de la réponse, mais si j'ai bien compris la question, tu souhaite savoir si le node objet est lié a un scene, pour moi c'est non. Le node objet tel que je le vois est un petit node dupplicable qui ne contient que 2 infos : l'id objet et le nom de l'objet tel que visible (ou non) dans l'inventaire. il doit etre facilement duplicable pour que l'on puisse le lié a la sortie des pick, a l'entrée des req et des condition d'affichage (afficher si objet et caché si objet) je le vois un peu comme un element de base de donnée.
- **Q6.2** : Lien **Pick → objet** : est-ce le **même** objet que celui exigé par **Req** (référence unique) ?
  - R6.2 : oui et non, l'id objet doit etre unique donc en ce sesn c'est le meme, mais la node peut etre dupliquer elle n'en reste pas moins unique.

---

## Schéma connecteurs (intention produit — N / E / S / O)

Référence partagée avec le code : les noms **N/E/S/O** sont surtout **pédagogiques** ; les `id` de handles React Flow peuvent rester stables (`flowIn`/`flowOut`, `metaIn`/`metaOut`, …) tant que la **forme et la couleur** d’une même **sémantique** de lien sont identiques (comme les médias violet / carré).

| Nœud / type | N | E | S | O |
|-------------|---|---|---|---|
| **Scene** | vide | sortie → hotspots | média image / ambiance | entrée depuis hotspot ou choix (transition / conditionnel) |
| **Msg** | vide | futur : indice ↔ pwd ? | SFX | entrée scène ou selector |
| **Pick** | vide | futur : objet ? | SFX | entrée scène ou selector |
| **Req** | vide | scène ou selector (→ futur : branchement sur **choix** de récompense) | SFX | entrée scène ou selector ; futur : entrée **objet** requis |
| **Pwd** | idem Req Est | idem Req | SFX | idem Req Ouest |
| **Scene (transition)** | vide | sortie → **Scene** | SFX | entrée scène ou selector |
| **Selector** | vide | sortie → hotspots (tout type) | SFX | entrée scène ou selector |
| **Image** | sortie → scène (futur : nodes globaux) | vide | vide | vide |
| **Audio** | sortie → scène, hotspot, choix, futur GlobalAudio | vide | vide | vide |
| **Objet** (futur) | vide | sortie → Req | vide | entrée depuis Pick |

---

## Prochaine étape technique (aligné réponses + schéma)

1. **`mapConnectionPolicy`** (nouveau module ou `App.tsx` refactor) : matrice **source (type + côté)** → **cible (type + côté)** + action (`onConnect` / DOM / rien), en s’appuyant sur les **R1–R6** et le tableau ci-dessus.
2. **Handles & chrome** : repositionner / dupliquer les handles pour se rapprocher visuellement du schéma N/E/S/O **sans** casser les projets (garder les ids ou table de correspondance N→`metaOut` etc. selon nœud).
3. **Liens « narration / indice »** : persistance **dans le projet** (pas session seule), hors export joueur si besoin — cf. R2.2.
4. **Req/Pwd récompense** : aujourd’hui graphe + DOM ; évolution **Est → nœud choix de récompense** quand le modèle et l’UI le permettront.
5. **Export joueur / EditorCore** : évolutions V2 seulement quand une règle graphe doit devenir comportement runtime (pas bloquant pour la phase « ports » seule).

---

## Ancienne piste (abandonnée)

- ~~Arêtes `xflow-extra` / pointillés session~~ : retirées du code ; toute carte utile doit être **sérialisable projet** ou policy explicite.

