# 🧩 Éditeur - Escape Game 360° (No-Code Builder)

🌍 **[🇬🇧 Click here for the English Version](#-english-version)**

Un générateur visuel gratuit et open-source pour créer des "Escape Games" ou des visites virtuelles interactives en images 360°. Conçu spécifiquement pour être utilisé dans le cadre d'ateliers d'initiation au numérique (EPN). 

L'outil génère un jeu complet sous la forme d'un simple fichier `index.html`, jouable directement dans n'importe quel navigateur, sans aucune connaissance en programmation requise !

---

## 🛠️ Comment ça marche ?

1. Ouvrez l'éditeur : **[LANCER L'ÉDITEUR FR](https://MentisVidus.github.io/escape-game-360-maker/editeur.html)**
2. Ajoutez des scènes (Pièces) et renseignez le nom de vos images 360° (format équirectangulaire).
3. Ajoutez des "Points d'interaction" (Hotspots) pour créer des portes, des objets à ramasser ou des messages.
4. Cliquez sur **"Générer mon jeu"**. Le navigateur téléchargera votre jeu prêt à jouer !

### 💡 Conseils importants d'utilisation
* **Images et liens (CORS)** : Lors de la conception et des tests, il est **fortement recommandé** d'utiliser des URL d'images hébergées en ligne (ex: via PostImages, Imgur, etc.) commençant par `http://` ou `https://`. Si vous utilisez des images locales (ex: `salle.jpg`), les navigateurs bloquent souvent l'affichage 3D par mesure de sécurité si le jeu n'est pas hébergé sur un serveur web.
* **Sauvegarde** : Le bouton "Sauvegarder le projet" génère un fichier `.json`. Pensez à l'utiliser régulièrement ! Vous pourrez recharger ce fichier plus tard pour reprendre votre travail là où vous l'avez laissé.

---

## ✨ Fonctionnalités actuelles (Version 4.2)

L'éditeur a évolué pour devenir un véritable moteur de création narratif :

* **Aperçu en Direct (Nouveau v4.2)** : Testez le rendu d'une scène entière (et l'emplacement de vos zones invisibles encadrées en rouge) sans avoir à générer le jeu complet.
* **Générateur CSS Visuel No-Code (Nouveau v4.2)** : Une interface intuitive permet de créer des zones cliquables (couleur, taille, bordure, opacité) et génère le code CSS automatiquement.
* **Ergonomie de gestion (Nouveau v4.2)** : Déplacez vos scènes, dupliquez des hotspots d'une pièce à l'autre, et pliez/dépliez vos panneaux pour garder un espace de travail propre. Les scènes et hotspots peuvent désormais être nommés.
* **Pointeur 360° intégré** : Plus besoin de deviner les coordonnées ! Un outil visuel permet de placer la caméra sur l'image pour récupérer le Pitch et le Yaw automatiquement.
* **Système d'Inventaire** : Un panneau rétractable (et personnalisable) permet au joueur de stocker les objets ramassés.
* **Logique conditionnelle & Énigmes** : Posez des questions aux joueurs, exigez des clés pour ouvrir des portes. Le jeu mémorise la progression !

---

## 🚀 Feuille de route (Roadmap / À venir)

- [ ] **Alternative au CDN Pannellum** : Ajouter une option pour télécharger les dépendances localement.
- [ ] **Gestion de l'Audio** : Intégrer des musiques d'ambiance ou des effets sonores.
- [ ] **Système de "Niveaux"** : Lier plusieurs fichiers HTML générés entre eux (avec transfert de l'inventaire via le `localStorage`).
- [ ] **Persistance des objets ramassés** : Empêcher la réapparition d'un objet ramassé quand on revient dans la pièce.

<br>
<br>

---

# 🌍 English Version

🇫🇷 **[Cliquez ici pour la version Française](#-éditeur-pro---escape-game-360-no-code-builder)**

A free, open-source visual builder to create 360° Escape Rooms and interactive virtual tours. Designed specifically for educational workshops, this "No-Code" tool generates a standalone `index.html` game file, playable in any web browser.

## 🛠️ How it works

1. Open the English Editor: **[LAUNCH EN EDITOR](https://MentisVidus.github.io/escape-game-360-maker/editor_en.html)**
2. Add scenes (Rooms) and input your 360° equirectangular image URLs.
3. Add interaction points (Hotspots) to create doors, pickable items, or riddles.
4. Click **"GENERATE MY GAME"**. That's it!

*(Tip: For testing purposes, it is highly recommended to use online image URLs starting with `http` rather than local files, to avoid browser CORS security blocks).*

## ✨ Features (v4.2)

* **Live Scene Preview (New v4.2)**: Test an entire scene layout without generating the full game. Hotspots are outlined in red for easy validation.
* **Visual CSS Editor (New v4.2)**: Use sliders and color pickers to style your interaction zones. Code is generated for you. Includes an Expert Mode.
* **Smart Duplication (New v4.2)**: Rearrange scenes, copy hotspots from one room to another instantly, and collapse panels for a clean workspace. Custom titles added.
* **Built-in 360° Target Picker**: Visually place your hotspots on the image to auto-fill Pitch/Yaw coordinates.
* **Inventory System**: A customizable, retractable panel to store found items.
* **Smart Puzzles & Logic**: Create riddles and lock doors with required items. The game remembers what the player has already unlocked!

---

## 📜 Credits & License

Created by **Renald Gauthier** with the assistance of **Perplexity AI**.
The 360° rendering engine uses the amazing [Pannellum](https://pannellum.org/) library by Matthew Petroff.

This project is licensed under **Creative Commons BY-SA 4.0** (Attribution - ShareAlike). You are free to use, modify, and share it as long as you credit the original source.
