# Plan — Éditeur nodal : pédagogie & intention produit

> **Note printemps 2026** : la branche `feat/nodal-map` a livré une **première carte nodale React éditable** (chantier C7 — popups d’édition par nœud, palette latérale, chaînes `REQ → PWD → MSG`). Ce plan reste la **référence d’intention pédagogique** (publics, lisibilité, anti-spaghetti) ; les retours terrain manquent encore — les sections ci-dessous restent à réviser au fil des ateliers.

Document **complémentaire** à [PLAN_EDITEUR_NODAL.md](./PLAN_EDITEUR_NODAL.md) (architecture, V2, jalons techniques). Ici : **pour qui**, **pourquoi** le nodal, **comment** limiter la complexité visuelle — sans prétendre à une expertise académique en sciences de l’éducation : objectif = **cadrage partagé** entre conception et développement, **révisable** au fil des retours terrain (EPN, ateliers).

---

## 1. Publics et références culturelles

- **Médiateurs / EPN** : parcours d’initiation, temps limité, besoin de **repères visuels** clairs.
- **Jeunes (et « moins jeunes »)** : habitudes fortes aux outils **no-code** et visuels.

**Repères** (analogies, pas des équivalences techniques) :

- **Scratch** : blocs empilés, très visuel, **pas** un graphe de nœuds libre — mais une **manipulation concrète** de la logique, appréciée en atelier.
- **Environnements type LEGO Mindstorms / programmation visuelle « par flux »** (souvent en EPN) : l’utilisateur **relie** des blocs ou des fils ; intuition proche d’un **graphe** (causalité, ordre, conditions).

Ces références soutiennent l’hypothèse : une UI où l’on **voit** scènes, liens et objets peut être **plus immédiate** qu’un long formulaire vertical — **à condition** de maîtriser le bruit visuel (§3).

---

## 2. Hypothèse produit : le graphe comme entrée principale

À **terme** (vision, pas engagement de livraison) :

- L’éditeur serait surtout utilisé pour sa **partie nodale** : comprendre et construire le jeu **dans l’espace** du graphe.
- Le **formulaire classique** resterait utile en **complément** (texte long, réglages fins, copier-coller) — éventuellement sous forme d’**inspecteur** latéral lié au nœud sélectionné, comme aujourd’hui le panneau latéral compense Drawflow.

**Flux imaginé** (exemple) :

- **Palette** ou menu latéral : ajouter un nœud **hotspot** de type message, scène, pick, etc.
- **Glisser-déposer** dans la **scène** concernée (ou dans un groupe-scène).
- Relier visuellement aux **médias** (image 360), aux **transitions**, aux **objets** / conditions.

Intuition : **moins de lecture linéaire** de champs, plus d’**apprentissage par l’expérience** (essai / erreur visuel, « si je branche ici, ça veut dire… »). C’est une **direction** ; la validation se fera par prototypes et observation en atelier.

---

## 3. Risque « spaghetti » et leviers de lisibilité

Un graphe dense peut décourager. Le produit doit **assumer** la responsabilité de le rendre **compréhensible** :

| Levier | Rôle |
|--------|------|
| **Vues filtrées** | Ex. narration (transitions seulement), une scène à la fois, mode expert masqué au début. |
| **Gabarits** | Démarrer depuis un petit graphe déjà cohérent (« escape 3 salles », « visite linéaire »). |
| **Chemins explicites pour les conditions** | Ex. *objet requis* → lien visible vers le nœud **objet** → vers le **hotspot de ramassage** dans telle scène. |
| **Inspecteur / panneau** | Graphe = **structure et liens** ; texte riche, URLs, détails rares = **panneau** pour éviter des nœuds illisibles. |
| **Groupes (scène = îlot)** | Réduit le « plat » infini d’un seul grand graphe. |

Ces pistes recoupent la planification technique dans [PLAN_EDITEUR_NODAL.md](./PLAN_EDITEUR_NODAL.md) (§6 sous-graphes, §9 jalons).

---

## 4. Formule vs nœuds : pas une opposition binaire

- Les **formulaires** restent pertinents pour certains contenus et pour des utilisateurs qui préfèrent la **liste**.
- La cible est plutôt un **équilibre évolutif** : le nodal devient le **chemin prioritaire** pour structurer le jeu ; le formulaire ou l’inspecteur **complètent** sans disparaître tout de suite.

Document technique des données et du Chemin B : [PLAN_EDITEUR_NODAL.md](./PLAN_EDITEUR_NODAL.md) (§5–10), [ARCHITECTURE.md](./ARCHITECTURE.md).

---

## 5. Prochaines enrichissables de ce document

- Retours d’ateliers (âges, durée, blocages récurrents).
- Captures d’état de prototypes (même abandonnés) avec une phrase « ce qui a marché / pas marché ».
- Liste courte de **vocabulaire** (types de nœuds côté médiateur) quand le spike B0 fixera les premiers mots métier.

---

*Document vivant — avril 2026.*
