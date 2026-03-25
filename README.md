# escape-game-360-maker
## 🧩 Éditeur - Escape Game 360°

Un générateur visuel gratuit et open-source pour créer des "Escape Games" ou des visites virtuelles interactives en images 360°. Conçu spécifiquement pour être utilisé dans le cadre d'ateliers d'initiation au numérique. 

L'outil génère un jeu complet sous la forme d'un simple fichier `index.html`, jouable directement dans n'importe quel navigateur, sans aucune connaissance en programmation requise !

---

## 🛠️ Comment ça marche ?

1. Ouvrez le fichier `editeur.html` (ou [la version en ligne de l'éditeur](https://mentisvidus.github.io/escape-game-360-maker/editeur.html)).
2. Ajoutez des scènes (Pièces) et renseignez le nom de vos images 360° (format équirectangulaire).
3. Ajoutez des "Points d'interaction" (Hotspots) pour créer des portes, des objets à ramasser ou des messages.
4. Cliquez sur **"Générer mon jeu"**. Le navigateur téléchargera votre jeu prêt à jouer !

### 💡 Conseils importants d'utilisation
* **Images et liens (CORS)** : Lors de la conception et des tests, il est **fortement recommandé** d'utiliser des URL d'images hébergées en ligne (ex: via PostImages, Imgur, etc.) commençant par `http://` ou `https://`. Si vous utilisez des images locales (ex: `salle.jpg`), les navigateurs bloquent souvent l'affichage 3D par mesure de sécurité si le jeu n'est pas hébergé sur un serveur web.
* **Sauvegarde** : Le bouton "Sauvegarder le projet" génère un fichier `.json`. Pensez à l'utiliser régulièrement ! Vous pourrez recharger ce fichier plus tard pour reprendre votre travail là où vous l'avez laissé.

---

## ✨ Fonctionnalités actuelles (Version 4.0)

L'éditeur a évolué pour devenir un véritable moteur de création narratif :

* **Pointeur 360° intégré** : Plus besoin de deviner les coordonnées ! Un outil visuel permet de placer la caméra sur l'image pour récupérer le Pitch et le Yaw automatiquement.
* **Système d'Inventaire** : Un panneau rétractable (et personnalisable) permet au joueur de stocker les objets ramassés.
* **Logique conditionnelle** : Les objets peuvent être requis pour débloquer d'autres interactions (ex: posséder une clé pour ouvrir un coffre).
* **Énigmes narratives** : Possibilité de poser des questions/mots de passe au joueur. Le jeu mémorise les énigmes résolues !
* **Récompenses multiples** : La résolution d'une énigme ou l'utilisation d'un objet peut déclencher un changement de scène, un texte, ou le don d'un nouvel objet.
* **Textes de transition** : Possibilité d'afficher un écran narratif de transition entre deux scènes.
* **Personnalisation CSS en direct** : Interface permettant de prévisualiser et modifier l'apparence des zones cliquables (portes invisibles, icônes, objets ronds...).

---

## 🚀 Feuille de route (Roadmap / À venir)

Le projet est en constante évolution. Voici les axes de développement prévus pour les prochaines versions :

- [ ] **Alternative au CDN Pannellum** : Ajouter une option pour télécharger les dépendances Pannellum localement, afin de ne pas surcharger les serveurs gratuits de l'auteur d'origine.
- [ ] **Gestion de l'Audio** : Ajouter un système pour intégrer des musiques d'ambiance ou des effets sonores lors des clics.
- [ ] **Système de "Niveaux" (Multi-pages)** : Permettre de lier plusieurs fichiers HTML générés pour éviter de créer un fichier final trop lourd si le jeu contient des dizaines de pièces (avec transfert de l'inventaire via la mémoire du navigateur).
- [ ] **Persistance des objets ramassés** : Faire en sorte qu'un objet disparaissant après avoir été ramassé ne réapparaisse pas si le joueur quitte la pièce et y revient (actuellement contournable en créant une "scène alternative" post-ramassage).

---

## 📜 Crédits & Licence

Créé par **Renald Gauthier** (Conseiller Numérique) avec l'assistance de **Perplexity AI**.
Le moteur de rendu 360° utilise l'excellente bibliothèque [Pannellum](https://pannellum.org/) développée par Matthew Petroff.

Ce projet est mis à disposition sous licence **Creative Commons BY-SA 4.0** (Attribution - Partage dans les Mêmes Conditions). Vous êtes libres de l'utiliser, de le modifier et de le partager, même dans un cadre d'ateliers professionnels, à condition de citer la source d'origine.
