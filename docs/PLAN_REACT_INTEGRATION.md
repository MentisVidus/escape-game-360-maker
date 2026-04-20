# Plan — Branche dédiée & intégration React (Chemin B)

Objectif : **expérimenter React / React Flow** sans mettre en danger l’éditeur **vanilla** actuel (`editeur.html`, `editor_en.html`, `*-app.js`). Ce document complète les jalons [PLAN_EDITEUR_NODAL.md](./PLAN_EDITEUR_NODAL.md) (§9) par des choix **concrets** de dépôt et de branche.

---

## 1. Stratégie de branches Git

| Branche | Rôle |
|---------|------|
| **`main`** | Version **stable** : ce que tu utilises en atelier / ce qui peut être publié (GitHub Pages, etc.). Pas de React obligatoire tant que le spike n’est pas validé. |
| **`feat/react-map`** (nom indicatif) | Tout le travail **React** : outillage (`package.json` **dans `xflow/react/`**), premier bundle, branchements optionnels dans le HTML. Tu peux en créer d’autres (`feat/react-map-spike`, …) si tu préfères des PR plus petites. |

**Règle simple** : tant que la carte Drawflow reste le chemin par défaut sur `main`, les utilisateurs **ne dépendent pas** de Node pour ouvrir l’éditeur. Sur la branche `feat/*`, tu acceptes d’avoir **`npm install` + `npm run build`** **depuis `xflow/react/`** pour générer le JS à servir.

Les merges vers `main` se font **quand** une étape est jugée sûre (ex. après B1 « parité navigation » testée FR/EN).

---

## 2. Où vivent les fichiers (Drawflow vs React)

**Décision** : séparer le **vanilla** et le **toolchain** pour éviter de mélanger `package.json` avec `project-graph.js`, tout en gardant un seul parent **`xflow/`** :

```
xflow/
  README.md
  draw/
    project-graph.js       # carte Drawflow (éditeur) — chemins HTML : xflow/draw/…
    project-graph.css
  react/
    README.md              # point d’entrée doc ; sur feat : package.json, vite.config.*, src/, …
    (package.json)         # uniquement sur branche feat / quand le spike est ajouté
    src/
      main.tsx             # mount sur #react-map-root
      ...
```

- **`xflow/draw/`** : carte actuelle ; **aucun** npm requis.
- **`xflow/react/`** : micro-app Vite + React Flow ; **`npm install` / `npm run build`** uniquement **dans ce dossier**.
- **Sortie du build** : par ex. `xflow/react/dist/editor-map.js` (+ CSS) — ajuster `base` Vite pour les chemins depuis `editeur.html` à la racine. Deux options :
  - **A — Artifacts versionnés** : le bundle est **commité** après build pour que `main` puisse servir la démo sans CI (simple pour EPN qui clonent le zip).
  - **B — Artifacts ignorés** : seuls les sources sont commités ; chaque dev / CI lance le build. Plus propre en git, mais **oblige** un pas `npm run build` avant d’ouvrir l’éditeur avec React.

Pour un **spike B0**, l’option **A** ou un **mode feature flag** (voir §4) évite les « oups j’ai oublié de builder ».

---

## 3. Intégration dans les HTML existants (sans tout casser)

1. Ajouter un **conteneur vide** réservé au futur graphe React, par ex. `<div id="react-map-root"></div>`, **dans la modale carte** uniquement sur la branche d’essai au début (ou toujours présent mais vide sur `main` si le script n’est pas chargé).
2. Charger le bundle **après** les scripts actuels (Drawflow, `xflow/draw/project-graph.js`, etc.) **uniquement** si :
   - un **feature flag** est actif (`localStorage`, query `?reactMap=1`, ou case à cocher « beta graphe » réservée aux devs), **ou**
   - tu es **uniquement** sur la branche `feat/react-map` et le HTML de test charge le script.

3. **Phase B0** : React affiche un graphe **lecture seule** ; Drawflow reste la carte « réelle » en dessous ou l’onglet par défaut reste Drawflow jusqu’à bascule.

4. **Phase B1** : quand React reproduit le besoin, **retirer** Drawflow pour la modale carte et ne charger que le bundle React (sur la branche, puis merge sur `main` après validation).

L’application **liste + formulaire + génération** hors modale carte **ne change pas** au début.

---

## 4. Dépendance à Node / npm

- **Aujourd’hui** : pas de `npm install` à la racine pour l’éditeur.
- **Avec React** : `npm install` et `npm run build` **uniquement** en étant **dans `xflow/react/`** (répertoire du `package.json` du Chemin B). Tenir [xflow/README.md](../xflow/README.md) et [xflow/react/README.md](../xflow/react/README.md) à jour (commandes).

Les médiateurs qui ouvrent seulement `editeur.html` depuis une release **sans** bundle embarqué ne sont pas concernés tant que le build n’est pas requis sur `main`.

---

## 5. Ordre de travail recommandé (résumé)

1. Créer la branche **`feat/react-map`** depuis `main`.
2. Initialiser l’app Vite **dans `xflow/react/`** (`npm create vite@latest .` depuis ce dossier, ou équivalent) avec React + TypeScript (ou JS), ajouter React Flow — **ne pas** écraser **`xflow/draw/`** (Drawflow reste inchangé à côté).
3. Configurer Vite pour produire **un seul fichier IIFE ou ES module** facile à inclure depuis `editeur.html` (voir doc Vite `build.lib` ou build app + copie vers `js/`).
4. Spike **B0** : graphe lecture seule + lien depuis le doc / flag dev.
5. Itérer jusqu’à **B1**, puis décision de merge sur `main`.

Détail des jalons : [PLAN_EDITEUR_NODAL.md](./PLAN_EDITEUR_NODAL.md) §9.

---

## 6. Lien avec la doc pédagogie / nodal

- Vision produit & publics : [PLAN_NODAL_PEDAGOGIE.md](./PLAN_NODAL_PEDAGOGIE.md).
- Architecture données & V2 : [ARCHITECTURE.md](./ARCHITECTURE.md).

---

*Document vivant — avril 2026.*
