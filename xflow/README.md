# xflow — Vue graphe (Drawflow) — expérimentation

Ce dossier contient des **preuves de concept** et, plus tard, l’intégration d’une vue **nœuds / connexions** pour l’éditeur Escape Game 360°, **sans bundler** : **Vanilla JS** + [Drawflow](https://github.com/jerosoler/Drawflow) (CDN).

## Drawflow vs React Flow (pour ce projet)

| Critère | Drawflow | React Flow |
|--------|----------|------------|
| Stack | Vanilla JS, aucune dépendance | React + toolchain (Vite, etc.) |
| Maintenance pour un non-dev | Plus simple si vous restez en HTML/JS | Courbe d’apprentissage + double paradigme (React + reste en vanilla) |
| Rendu | Suffisant pour scènes, hotspots, plusieurs entrées/sorties | Très riche, mais **surdimensionné** si vous refusez de réécrire l’éditeur en React |
| Votre contrainte | **Garder l’environnement simple** | Contredit l’objectif sauf refonte majeure |

**Conclusion :** pour une architecture « graphe + formulaire existant » en **vanilla**, Drawflow est un **choix cohérent**. React Flow n’apporte un avantage décisif que si vous **investissez** dans React partout (ou une micro-app isolée, ce qui ajoute quand même Vite/npm).

## Synchronisation future avec le JSON / le formulaire

- **Source de vérité** : le modèle projet (comme aujourd’hui : `saveProject` / `loadProject`). Le graphe est une **vue** + éventuellement des **positions** stockées à part (`drawflow` export dans un champ du JSON ou fichier annexe).
- **Données sur chaque nœud** : utiliser le 7ᵉ argument `data` de `addNode` (`{ kind: 'scene', scId: '...' }`, `{ kind: 'hotspot', hId: 12 }`, etc.) pour retrouver l’élément dans le DOM ou dans l’objet projet.
- **Clic sur un nœud** : écouter `editor.on('nodeSelected', (id) => { ... })`, lire `editor.getNodeFromId(id).data`, puis soit **faire défiler** la page vers `#hs_12` / le bloc scène, soit **remplir un panneau latéral** qui duplique ou relie les champs (même logique que « cliquer dans l’arbre »).

Voir `poc.js` pour un mini **panneau détail** factice qui illustre le lien `nodeSelected` → affichage.

## Fichiers

| Fichier | Rôle |
|---------|------|
| `poc.html` | Page autonome : canvas Drawflow + panneau latéral |
| `poc.css` | Mise en forme des blocs factices |
| `poc.js` | Initialisation, nœuds Scène / Hotspot, connexion, sélection |

**Test :** ouvrir `xflow/poc.html` dans le navigateur (fichier local ou serveur statique).

## Étape 2 — Carte depuis le projet (`project-graph.js`)

- **`getCurrentProjectData()`** (dans `js/editeur-app.js` / `js/editor-en-app.js`) produit le même objet que la sauvegarde `.json`.
- **`generateGraphFromJson(editor, project)`** construit les nœuds Scène / Hotspot et les liens :
  - scène → chaque hotspot de cette scène ;
  - hotspot → scène dont l’ID (`f_target`) correspond à une scène du projet, si le type est `scene`, ou si `req` / `pwd` a une récompense « aller à une scène » (`f_req_action` / `f_pwd_action` = `scene`).
- Bouton **« Afficher la carte »** / **« Show map »** dans la barre d’outils : modale plein écran avec Drawflow.

Les **selectors** et les autres actions (msg, pick seuls, etc.) ne créent pas encore d’arête vers une scène (hors périmètre actuel).

### Mode focus (défaut)

- À l’ouverture, seule la **première scène** est « active » (détail + liste de ses hotspots) ; chaque **transition vers une autre scène** affiche cette cible comme bloc **compact** (sans ses hotspots).
- **Double-clic** sur un bloc compact : le graphe se régénère avec cette scène comme centre (ex. retour S2 → S1 en compact).
- API : `generateGraphFromJson(editor, project, { viewMode: 'focus', activeSceneKey: 'mon_scId' })` ; `viewMode: 'full'` ; `viewMode: 'tree'` (flux gauche → droite depuis la 1re scène, renvois = nœuds « Renvoi »).
- Barre dans la modale : **Vue Focus** / **Vue complète** / **Vue arbre** (`setProjectMapView('focus'|'full'|'tree')`).
