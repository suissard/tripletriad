# Terra Nullius - Triple Triad

**Terra Nullius** est une application web full-stack offrant un jeu de cartes à collectionner inspiré du célèbre mini-jeu Triple Triad, agrémenté de mécaniques de progression, de quêtes et de modes multijoueurs.

L'application est divisée en deux parties principales :
- **Frontend** : Vue 3 + Vite, utilisant la Composition API et Tailwind CSS (et des styles globaux) pour une interface moderne et réactive.
- **Backend** : Strapi 5 (TypeScript) fournissant une API REST robuste, avec une gestion complète de l'authentification, des collections de cartes, et de l'économie du jeu.

---

## 🌟 Fonctionnalités Principales

*   **Authentification et Profil Joueur** : Inscription, connexion et gestion du profil via Strapi (JWT).
*   **Collection de Cartes** : Chaque joueur possède sa propre collection (`UserCards`), avec un système de rareté (Commune, Peu Commune, Rare, Épique, Légendaire) et des éléments spéciaux (Eau, Radiation, Réseau, Spore, etc.).
*   **Construction de Decks (Deck Building)** : Outil dédié pour créer et éditer jusqu'à 5 decks personnalisés de 15 cartes chacun, incluant l'analyse de la courbe de mana et le choix du dos de carte (classique ou animé).
*   **Boutique & Ouverture de Boosters** : Dépensez vos pièces d'or (Coins) gagnées en jeu pour acheter des "Boosters Classiques" de 5 cartes et agrandir votre collection. Animations d'ouverture de paquets immersives.
*   **Mode Histoire & Quêtes** : Accomplissez des quêtes quotidiennes ou de bienvenue (ex: jouer une partie) pour gagner des récompenses (Pièces, Gemmes).
*   **Jeu contre l'IA (Single Player)** : Affrontez une intelligence artificielle avec un deck aléatoire ou choisi.
*   **Mode Multijoueur (WebRTC)** : Hébergez ou rejoignez des sessions de jeu en ligne directement dans le navigateur (peer-to-peer) en échangeant un code de session.
*   **Gestion de l'État Hors-Ligne** : Le jeu détecte les pertes de connexion avec le serveur et propose un mode hors-ligne limité permettant de jouer avec une collection de secours.

---

## 🗺️ Navigation & Pages (Frontend)

L'interface utilise `vue-router` pour naviguer entre les différents écrans du jeu.

### Pages Joueur
*   **`MainMenu` (`/`)** : Le hub principal. C'est ici que l'on choisit son mode de jeu (Histoire, IA, Multijoueur) et qu'on accède aux autres sections.
*   **`GameView` (`/game`)** : L'écran de jeu principal. Affiche le plateau, les scores, l'historique des actions et les mains des joueurs (Héros vs Adversaire). Gère à la fois les parties contre l'IA et les parties en ligne.
*   **`CollectionView` (`/collection`)** : Votre classeur de cartes. Permet de visualiser toutes les cartes possédées, de filtrer, trier et voir la progression globale de la collection.
*   **`DecksPage` (`/decks`)** : La liste de vos decks (jusqu'à 5). Affiche un aperçu des cartes et le statut d'achèvement (15/15).
*   **`DeckEditorPage` (`/deck-editor`)** : L'interface de création/modification de deck. Permet d'ajouter/retirer des cartes, choisir la couverture du deck, définir le dos de carte et visualiser la courbe de mana.
*   **`PackOpening` (`/boutique`)** : L'échoppe du jeu. Dépensez vos pièces pour ouvrir des boosters avec des animations immersives.
*   **`StoryPage` (`/story`)** : Affiche votre progression dans l'histoire et les chapitres débloqués.
*   **`QuestsPage` (`/quests`)** : Affiche vos quêtes actives et terminées (journalières, de bienvenue, etc.).

### Pages Admin (Route `/admin`)
*   **`AdminLogin` (`/admin/login`)** : Page de connexion administrateur.
*   **`Dashboard` (`/admin`)** : Tableau de bord administrateur.
*   **`FoilEditor` (`/admin/foil-editor`)** : Éditeur visuel des effets foil (brillant) des cartes.
*   **`GameConfig` (`/admin/game-config`)** : Configuration globale du jeu (règles, probabilités, etc.).
*   **`ArchitectureMapPage` (`/admin/cartographie`)** : Vue d'ensemble cartographique/technique.
*   **Pages de Test** : `/admin/test-api`, `/admin/test-card`, `/admin/test-seed`, `/admin/test-coin` - Outils de développement internes.

---

## ⚙️ Architecture Technique

### Frontend (Vue 3 / Vite)
*   **État Global** : Géré par **Pinia** :
    *   `userStore.js` : Données joueur, decks, collection, portefeuille (coins, gems).
    *   `notificationStore.js` : Gestion des alertes et notifications toast.
    *   `layoutStore.js` : Gestion du layout dynamique (PlayerLayout, AdminLayout, BlankLayout).
*   **Moteur de Jeu** (`src/game/`) :
    *   `GameEngine.js` : Logique pure et immuable du jeu (calcul des captures, winner).
    *   `TurnManager.js` : Gestion des tours et transition IA/Online.
    *   `WebRTCManager.js` : Gestion Peer-to-Peer pour le mode multijoueur.
    *   `ai.js` : Intelligence artificielle pour les parties solo.
    *   `state.js` : État réactif global (source unique de vérité).
    *   `rules.js` : Registre des règles optionnelles (Same, Plus, Combo, Elements).
*   **Composants Réutilisables** (`src/components/`) :
    *   `TripleTriadCard.vue` : Le cœur visuel, affichant les statistiques, éléments, et raretés d'une carte.
    *   `TripleTriadCardGrid.vue` : Affichage en grille paginée ou horizontale des cartes.
    *   `GameBoard.vue` : Plateau de jeu 3x3.
    *   `PlayerHand.vue` / `OpponentHand.vue` : Mains des joueurs.
    *   `CoinToss.vue` : Animation de lancer de pièce.
    *   `PackOpening.vue` : Animations d'ouverture de boosters.
    *   `AnimatedCardBack.vue` : Dos de carte animé.

### Backend (Strapi 5 / TypeScript)
*   **API REST** :
    *   `card` : Cartes du jeu (stats, éléments, rareté, image).
    *   `deck` : Decks des joueurs.
    *   `user-card` : Collection personnelle de chaque joueur.
    *   `wallet` : Portefeuille (coins, gems).
    *   `booster` : Ouverture de boosters et génération aléatoire.
    *   `player-quest` / `quest-template` : Quêtes et génération.
    *   `player-story-progress` / `story` / `story-step` : Progression histoire.
    *   `match` : Gestion des parties et arbitrage P2P.
    *   `game-history` : Historique des parties.
    *   `game-config` : Configuration globale du jeu.
    *   `foil-effect` : Effets visuels foil.
    *   `shop` : Boutique et transactions.
*   **Bootstrap Automatique** : Au démarrage (dans `src/index.ts`), Strapi configure automatiquement :
    *   Les permissions par défaut pour le rôle `authenticated`.
    *   Les cartes de base (Goblin, Slime, Bat, etc.).
    *   Les quêtes de bienvenue (ex: "WELCOME_QUEST").
*   **Hooks de Cycle de Vie** : Lorsqu'un nouvel utilisateur s'inscrit (`afterCreate`), Strapi lui attribue automatiquement une quête de bienvenue et un set de 5 cartes de départ.

---

## 🚀 Démarrage et Développement

L'environnement complet est géré via Docker.

1.  **Lancer l'application complète** :
    ```bash
    sudo docker compose up -d
    ```
    *Le backend Strapi sera accessible sur `http://localhost:1337`.*
    *(Note : Selon la configuration, le frontend peut nécessiter d'être lancé localement pour éviter les conflits de permissions).*

2.  **Lancer le Frontend en local** :
    ```bash
    cd front
    npm install
    npm run dev
    ```
    *Le frontend sera accessible sur `http://localhost:5173`.*

3.  **Variables d'environnement** :
    Le dossier `back/strapi` nécessite un fichier `.env` contenant les clés secrètes (`APP_KEYS`, `API_TOKEN_SALT`, `ADMIN_JWT_SECRET`, `TRANSFER_TOKEN_SALT`, `JWT_SECRET`) pour fonctionner correctement.

4.  **Options de Développement In-Game** :
    Un panneau `DevOptions.vue` est disponible dans le jeu pour simuler le statut Premium, s'auto-connecter, ou manipuler les pièces à des fins de test. Ces options sont persistées via `localStorage`.
