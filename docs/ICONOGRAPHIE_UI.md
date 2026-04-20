# Plan iconographie UI (éditeur / générateur)

Objectif: remplacer progressivement les emoji par des SVG dédiés, cohérents et lisibles (notamment en faible contraste).

## Convention proposée

- Dossier cible: `media/icons/`
- Format: `*.svg` monochrome (couleur pilotée par CSS via `currentColor`)
- Taille source conseillée: `24x24` (ou `20x20` pour les boutons très compacts)
- Nommage: `ui-<zone>-<action>.svg`

## Set minimal prioritaire (phase 1)

- `ui-global-save.svg` (sauvegarde)
- `ui-global-load.svg` (chargement)
- `ui-global-map.svg` (carte)
- `ui-media-pick-local.svg` (charger média local)  ← priorité haute, icône actuelle jugée peu lisible
- `ui-scene-add.svg` (ajouter scène)
- `ui-hotspot-add.svg` (ajouter hotspot)
- `ui-duplicate.svg` (dupliquer)
- `ui-delete.svg` (supprimer)
- `ui-expand.svg` / `ui-collapse.svg` (plier/déplier)

## Zones à migrer

- Barre supérieure éditeur (save/load/map)
- Dock latéral (save/load/map + snapshots)
- Formulaires scènes/hotspots (actions rapides)
- Sélecteurs de médias (image/audio local)
- Générateur (boutons export/download)

## Stratégie de migration

1. Introduire les SVG prioritaires dans `media/icons/`.
2. Remplacer les emoji par `<img>` ou SVG inline selon le contexte.
3. Vérifier contraste + taille sur:
   - vue normale éditeur
   - vue carte (Drawflow)
   - fenêtres modales
4. Conserver les anciens emoji seulement en fallback temporaire.

## Notes UX

- Viser des icônes simples (traits nets) avant le “beau”.
- Préférer la cohérence inter-écrans à la variété.
- Garder un `title` explicite sur tous les boutons icône-only.
