# Terra Nullius - Triple Triad

**Terra Nullius** est une application web full-stack offrant un jeu de cartes à collectionner inspiré du célèbre mini-jeu Triple Triad, agrémenté de mécaniques de progression, de quêtes, d'un mode histoire narratif et de modes multijoueurs. Le jeu se déroule dans l'univers post-apocalyptique de "Terra Nullius" (An 3000), mettant en scène 9 factions distinctes.

L'application est divisée en deux parties principales :
- **Frontend** : Vue 3 + Vite, utilisant la Composition API et Tailwind CSS (ainsi que des styles globaux et des variables CSS pour le thème dynamique) pour une interface moderne, réactive et "glassmorphism".
- **Backend** : Strapi 5 (TypeScript) fournissant une API REST robuste, avec une gestion complète de l'authentification, des collections de cartes, des quêtes et de l'économie du jeu, fonctionnant avec une base de données SQLite.

---

## 🌟 Fonctionnalités Principales

*   **Univers et Factions** : 9 factions distinctes (ex: Omni-Réseau, Fléau Spore) avec un système de dominance type pierre-papier-ciseaux (Proie/Némésis).
*   **Authentification et Profil Joueur** : Inscription, connexion et gestion du profil via Strapi (JWT).
*   **Collection de Cartes** : Chaque joueur possède sa propre collection (`UserCards`). Les cartes ont des éléments (factions), des raretés calculées dynamiquement (Commune à Légendaire) et peuvent posséder des compétences spéciales (ex: poison, combo).
*   **Construction de Decks (Deck Building)** : Outil dédié pour créer et éditer des decks de 30 cartes (configurable via `DECK_SIZE`). Permet l'analyse de la courbe de mana, le choix du dos de carte (classique ou animé via shaders) et de la couverture.
*   **Boutique & Ouverture de Boosters** : Dépensez vos pièces d'or gagnées pour acheter des "Boosters" (ex: Classique, Premium). L'expérience intègre de superbes animations immersives d'ouverture.
*   **Mode Histoire & Quêtes** : Mode histoire non-linéaire "Choose Your Own Adventure" généré à partir de fichiers JSON. Le joueur progresse à travers des situations (Dialogue, Bataille, Choix) avec sauvegarde granulaire. Des quêtes quotidiennes récompensent l'engagement.
*   **Jeu contre l'IA (Single Player)** : Affrontez une IA. L'arbitrage du premier joueur est animé par un "Coin Toss" avec un moteur physique.
*   **Mode Multijoueur (WebRTC)** : Hébergez ou rejoignez des sessions de jeu en ligne (peer-to-peer) sans serveur intermédiaire pour le gameplay en temps réel.
*   **Drag-and-Drop Custom** : Interface de jeu fluide utilisant un système de drag-and-drop personnalisé (supportant souris et tactile via un `<Teleport>` ghost et `document.elementsFromPoint()`).
*   **Personnalisation Visuelle (Foil & Shaders)** : Un éditeur "Foil Editor" back-office permet de créer des effets holographiques et masques complexes sur les cartes via des shaders GLSL personnalisés.

---

## 🗺️ Navigation & Pages (Frontend)

L'interface utilise `vue-router` et gère différents layouts (`PlayerLayout`, `AdminLayout`, `BlankLayout`).

### Pages Joueur
*   **`MainMenu` (`/`)** : Le hub principal. Choix des modes (Histoire, IA, Multijoueur).
*   **`GameView` (`/game`)** : L'écran de jeu principal avec plateau (GameBoard) et mains (PlayerHand/OpponentHand). Gère l'IA et le multijoueur.
*   **`CollectionView` (`/collection`)** : Votre classeur de cartes.
*   **`DecksPage` (`/decks`)** : La liste de vos decks.
*   **`DeckEditorPage` (`/deck-editor`)** : L'interface aboutie de création/modification de deck.
*   **`PackOpening` / `BoutiquePage` (`/boutique`)** : L'échoppe du jeu pour ouvrir des boosters.
*   **`StoryPage` (`/story`)** & **`StoryStepsPage` (`/story-steps`)** : Progression et chapitres de l'histoire.
*   **`StoryStepView` (`/story-step/:id`)** : Moteur d'exécution des situations narratives interactives.
*   **`QuestsPage` (`/quests`)** : Quêtes actives et terminées.

### Pages Admin (Route `/admin`)
*   **`AdminLogin` (`/admin/login`)** : Page de connexion administrateur.
*   **`Dashboard` (`/admin`)** : Tableau de bord administrateur principal.
*   **`FoilEditor` (`/admin/foil-editor`)** : Éditeur visuel avancé des effets holographiques (Three.js / GLSL).
*   **`GameConfig` (`/admin/game-config`)** : Configuration globale du jeu injectée dynamiquement dans le frontend.
*   **`ArchitectureMapPage` (`/admin/cartographie`)** : Vue d'ensemble architecturale.

---

## ⚙️ Architecture Technique

### Frontend (Vue 3 / Vite)
*   **État Global (Pinia)** : `userStore.js` (profil, progression), `layoutStore.js` (thème), `notificationStore.js`.
*   **Moteur de Jeu Immuable** (`src/game/`) :
    *   `GameEngine.js` : Logique pure sans dépendances Vue/Three.js.
    *   `TurnManager.js` : Transition de tours et gestion du temps.
    *   `WebRTCManager.js` : Synchronisation multijoueur.
    *   `state.js` : État global réactif de la partie.
    *   `logger-logic.js` : Système de logs avec injection de dépendances (testable unitairement).
*   **Rendu Avancé** : Modélisation 3D et shaders via Three.js (ex: `AnimatedCardBack.vue`, Foil Editor) intégrés directement dans Vue.
*   **Design System** : Utilisation intensive de variables CSS (`--color-primary`, etc.) injectées depuis Strapi, et d'effets "glassmorphism" (`color-mix`, `backdrop-filter`).

### Backend (Strapi 5 / TypeScript / SQLite)
*   **API REST & Base de données** : Utilisation de SQLite (`back/strapi_data/.tmp/data.db`). Mapping automatique du camelCase (`schema.json`) vers le snake_case SQL.
*   **Modélisation Avancée** :
    *   Mode histoire basé sur des "Zones Dynamiques" (Dynamic Zones) pour un flow non-linéaire.
    *   Validation stricte backend via `zod` pour éviter les failles DoS (ex: validation de longueur d'identifiant).
    *   Optimisation des requêtes (ex: ouverture de boosters utilisant des requêtes `$in` et l'agrégation en mémoire pour éviter le N+1).
*   **Génération de Contenu** : Les histoires de Terra Nullius sont compilées depuis des fichiers JSON via `shared/data/assemble_story.cjs`.

---

## 🚀 Démarrage et Développement

### Prérequis
*   Docker & Docker Compose (v5.1.0+). La commande `docker-compose` legacy n'est plus supportée.
*   Node.js (18+) pour le développement local.

### 1. Lancer l'environnement avec Docker
```bash
# À la racine du projet
docker compose up -d
```
*Le backend Strapi sera accessible sur `http://localhost:1337`.*

### 2. Démarrage Frontend (Local)
Si vous développez l'interface, lancez le frontend localement :
```bash
cd front
npm install
npm run dev &
```
*Le frontend sera accessible sur `http://localhost:5173`.*

### 3. Tests
*   **API & Strapi** : Intégration via Playwright dans `front/test:api`. Utilisation de tokens mock (`bo_jwt`) pour les tests frontend nécessitant une authentification.
*   **Logique Pure (Node.js)** : Les scripts de test isolés se trouvent dans `front/tests/` (ex: `node front/tests/minimal_engine_test.js`) pour vérifier la logique métier sans surcoût Vite/Vue.

### Variables d'environnement
Le backend nécessite un fichier `back/strapi/.env` contenant les clés secrètes (`APP_KEYS`, `API_TOKEN_SALT`, `ADMIN_JWT_SECRET`, `TRANSFER_TOKEN_SALT`, `JWT_SECRET`). Ne définissez pas de valeurs par défaut "en dur" dans le code pour des raisons de sécurité.
