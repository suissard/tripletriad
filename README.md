# Terra Nullius - Triple Triad

**Terra Nullius** est une application web full-stack offrant un jeu de cartes à collectionner inspiré du célèbre mini-jeu Triple Triad, agrémenté de mécaniques de progression, de quêtes, et de modes multijoueurs.

L'application est divisée en deux parties principales :
- **Frontend** : Vue 3 + Vite, utilisant la Composition API et Tailwind CSS (et des styles globaux) pour une interface moderne et réactive.
- **Backend** : Strapi 5 (TypeScript) fournissant une API REST robuste, avec une gestion complète de l'authentification, des collections de cartes, et de l'économie du jeu.

---

## 🌟 Fonctionnalités Principales

*   **Authentification et Profil Joueur** : Inscription, connexion et gestion du profil via Strapi (JWT).
*   **Collection de Cartes** : Chaque joueur possède sa propre collection (`UserCards`), avec un système de rareté (Commune, Peu Commune, Rare, Épique, Légendaire) et des éléments spéciaux (Eau, Radiation, Réseau, Spore, etc.).
*   **Construction de Decks (Deck Building)** : Outil dédié pour créer et éditer jusqu'à 5 decks personnalisés de 15 cartes chacun. L'éditeur inclut l'analyse de la courbe de mana, l'import/export de code de deck, et le choix du dos de carte (classique ou animé).
*   **Boutique & Ouverture de Boosters** : Dépensez vos pièces d'or (Coins) gagnées en jeu pour acheter des "Boosters Classiques" de 5 cartes et agrandir votre collection. Animations d'ouverture de paquets immersives.
*   **Mode Histoire & Quêtes** :
    *   **Histoire** : Une progression structurée par chapitres et combats.
    *   **Quêtes** : Accomplissez des quêtes quotidiennes ou de bienvenue pour gagner des récompenses (Pièces, Gemmes). Les quêtes sont notifiées via des toasts persistants.
*   **Jeu contre l'IA (Single Player)** : Affrontez une intelligence artificielle (algorithmes de décision) avec un deck aléatoire ou choisi.
*   **Mode Multijoueur (WebRTC)** : Hébergez ou rejoignez des sessions de jeu en ligne directement dans le navigateur (peer-to-peer) en échangeant un code de session. Synchronisation de l'état du jeu et gestion avancée des tours (`TurnManager`).
*   **Gameplay Avancé** : Lancer de pièce 3D (`CoinToss`) pour déterminer qui commence, plateau 3x3 avec captures dynamiques, et calculs de score en temps réel (`GameEngine`).
*   **Gestion de l'État Hors-Ligne** : Le jeu détecte les pertes de connexion avec le serveur et propose un mode hors-ligne limité permettant de jouer avec une collection de secours.

---

## 🗺️ Navigation & Pages (Frontend)

L'interface utilise `vue-router` pour naviguer entre les différents écrans du jeu.

### Pages Joueur
*   **`MainMenu` (`/`)** : Le hub principal. C'est ici que l'on choisit son mode de jeu (Histoire, IA, Multijoueur) et qu'on accède aux autres sections via un tiroir de navigation dynamique (`RightDrawer`).
*   **`GameView` (`/game`)** : L'écran de jeu principal. Affiche le plateau, les scores, l'historique des actions et les mains des joueurs (Héros vs Adversaire). Gère à la fois les parties contre l'IA et les parties en ligne avec WebRTC.
*   **`CollectionView` (`/collection`)** : Votre classeur de cartes. Permet de visualiser toutes les cartes possédées, de filtrer, trier et voir la progression globale de la collection.
*   **`DecksPage` (`/decks`)** : La liste de vos decks. Affiche un aperçu des cartes et le statut d'achèvement (15/15).
*   **`DeckEditorPage` (`/deck-editor`)** : L'interface de création/modification de deck.
*   **`PackOpening` (`/boutique`)** : L'échoppe du jeu avec interface 3D/CSS et gestion des "Dust" (Poussières) et "Gems".
*   **`StoryPage` (`/story`)** : Affiche votre progression dans l'histoire et les chapitres débloqués.
*   **`QuestsPage` (`/quests`)** : Affiche vos quêtes actives et terminées.

### Pages Admin (Route `/admin`)
*   **`Dashboard` (`/admin`)** : Tableau de bord administrateur général et gestion de la base de données de jeu.
*   **`FoilEditor` (`/admin/foil-editor`)** : **HoloEditor Pro**. Un éditeur visuel avancé intégrant **Three.js** pour créer, manipuler et tester les effets shaders (brillance, masques holographiques) des cartes premium en temps réel.
*   **`GameConfig` (`/admin/game-config`)** : Configuration globale du jeu (règles, probabilités, limites).
*   **`ArchitectureMapPage` (`/admin/cartographie`)** : Vue d'ensemble cartographique et technique de l'infrastructure de l'application.
*   **Pages de Test Avancées** :
    *   `/admin/test-card` : Interface pour tester le rendu visuel complet des cartes et leurs shaders associés.
    *   `/admin/test-seed` : Outil de test pour la génération aléatoire et la distribution de rareté.
    *   `/admin/test-coin` : Bac à sable pour tester les animations et la physique du lancer de pièce 3D.
    *   `/admin/test-api` & `/admin/test-dev` : Sandboxes internes.

---

## ⚙️ Architecture Technique

### Frontend (Vue 3 / Vite)
*   **État Global** : Géré par **Pinia** :
    *   `userStore.js` : Données joueur, decks, collection, portefeuille. Gère les WebSockets Strapi.
    *   `notificationStore.js` : Gestion des alertes et toasts.
    *   `layoutStore.js` : Gestion du layout dynamique (PlayerLayout, AdminLayout, BlankLayout).
*   **Moteur de Jeu** (`src/game/`) :
    *   `GameEngine.js` : Logique pure et immuable du jeu (calcul des captures, gagnant).
    *   `TurnManager.js` : Gestion des tours, vérification des actions locales/distantes, et prévention de la triche ("optimistic update").
    *   `WebRTCManager.js` : Connexion Peer-to-Peer avec gestion de la signalisation manuelle (copier-coller de code).
    *   `ai.js` : Intelligence artificielle pour les parties solo.
    *   `state.js` : État réactif global (source unique de vérité pendant une partie).
*   **Composants Réutilisables** (`src/components/`) :
    *   Design System basé sur des slots (`AppButton`, `AppPanel`, `AppModal`) pour maintenir la consistance UI.
    *   `TripleTriadCard.vue` : Le cœur visuel, rendu HTML/CSS pour les statistiques et fallback Three.js (via `GameCanvas`) pour les cartes Foil Premium.
    *   `GameBoard.vue` : Plateau de jeu 3x3 avec détection personnalisée de "drag & drop" (via `pointer events` + `elementsFromPoint` pour le support mobile complet).
    *   `CoinToss.vue` : Lancer de pièce animé en CSS 3D.

### Backend (Strapi 5 / TypeScript)
*   **API REST** : Entités `card`, `deck`, `user-card`, `wallet`, `booster`, `player-quest`, `game-history`, `foil-effect`, etc.
*   **Bootstrap Automatique** : Configuration par défaut (`src/index.ts`) des permissions `authenticated` et injection des données de base.

---

## 🚀 Démarrage et Développement

L'environnement complet est géré via Docker.

1.  **Lancer l'application complète** :
    ```
    sudo docker compose up -d
    ```
    *Le backend Strapi sera accessible sur `http://localhost:1337`.*

2.  **Lancer le Frontend en local** :
    ```
    cd front
    npm install
    npm run dev &
    ```
    *Le frontend sera accessible sur `http://localhost:5173`.*

3.  **Variables d'environnement** :
    Le dossier `back/strapi` nécessite un fichier `.env` contenant les clés secrètes. Voir `.env.example` ou le script `install-all.js`.

4.  **Options de Développement In-Game** :
    Un panneau `DevOptions.vue` (accessible via bouton invisible ou console) est disponible dans le jeu pour simuler le statut Premium, forcer le mode Hors-ligne, ou manipuler les pièces à des fins de test. Persistance via `localStorage`.
