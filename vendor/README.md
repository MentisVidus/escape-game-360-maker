# Dépendances « vendored » (optionnel)

Les pages `editeur.html` / `editor_en.html` chargent encore les libs depuis les **CDN** (SRI + CORS). Ce dossier sert à **conserver des copies locales** des mêmes fichiers (bonne pratique sur GitHub : pas de surprise si un CDN est indisponible, reproductibilité).

Pour activer le mode local, il faudrait ensuite remplacer les URLs dans les HTML par des chemins relatifs vers `vendor/...` (non fait par défaut pour limiter les diffs).

## Fichiers à copier (versions alignées sur l’éditeur)

| Dossier cible | Source (télécharger l’URL telle quelle) |
|---------------|----------------------------------------|
| `vendor/pannellum/2.5.7/` | `pannellum.css`, `pannellum.js` — https://cdn.jsdelivr.net/npm/pannellum@2.5.7/build/ |
| `vendor/quill/1.3.7/` | `quill.min.js`, `quill.snow.css` — https://cdnjs.cloudflare.com/ajax/libs/quill/1.3.7/ |
| `vendor/drawflow/0.0.59/` | `drawflow.min.js`, `drawflow.min.css` — https://unpkg.com/drawflow@0.0.59/dist/ |
| `vendor/jszip/3.10.1/` | `jszip.min.js` — https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/ |
| `vendor/file-saver/2.0.5/` | `FileSaver.min.js` — https://cdnjs.cloudflare.com/ajax/libs/FileSaver.js/2.0.5/ |

Après copie, recalculer les hashes **SRI** (`sha512`) sur les **octets exacts** des fichiers (API cdnjs ou `openssl dgst -sha512 -binary file | openssl base64 -A`) si vous basculez les balises `<script>` / `<link>` du projet.
