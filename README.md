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

L'interface utilise `vue-router` et gère différents layouts (`NavigationLayout`, `AdminLayout`, `BlankLayout`).

### Pages Joueur
*   **`MainMenu` (`/`)** : Le hub principal. Choix des modes (Histoire, IA, Multijoueur).
*   **`GameView` (`/game`)** : L'écran de jeu principal avec plateau 3x3 (`GameBoard`), timer de tour, badges élémentaires et mains (`PlayerHand`/`OpponentHand`). Gère l'IA et le multijoueur.
*   **`CollectionView` (`/collection`)** : Votre classeur de cartes, cadres, plateaux, dos de cartes et désenchantement de masse.
*   **`DecksPage` (`/decks`)** : La liste de vos decks.
*   **`DeckEditorPage` (`/deck-editor`)** : L'interface aboutie de création/modification de deck.
*   **`BoutiquePage` (`/boutique`)** & **`PackOpening` (`/open-pack/:collection/:type`)** : L'échoppe du jeu et l'ouverture de boosters (`/api/booster/open`).
*   **`StoryPage` (`/story`)**, **`StoryStepsPage` (`/story/:storyId/steps`)** & **`StoryStepView` (`/story/:storyId/step/:stepIndex`)** : Progression et situations narratives interactives.
*   **`QuestsPage` (`/quests`)**, **`GuildsPage` (`/guilds`)**, **`FriendsView` (`/friends`)**, **`PlayerProfileView` (`/profile/:identifier`)** : Quêtes, guildes, amis et profils (protégés par `requiresAuth` si nécessaire).

### Pages Admin (Route `/admin`)
*   **`DashboardView` (`/admin`)** : Tableau de bord administrateur principal.
*   **`DynamicEditor` (`/admin/:collection`)** : Éditeur générique avec schémas explicites et recherche.
*   **`FoilEditorProView` (`/admin/foil-editor-pro`)** & **`FoilGalleryView` (`/admin/foil-gallery`)** : Éditeur et galerie d'effets holographiques (Three.js / GLSL).
*   **`FrameEditorView` (`/admin/frame-editor`)** : Éditeur de positionnement des cadres de cartes.
*   **`GameConfigView` (`/admin/game-config`)** : Configuration globale du jeu (thème, timer de tour, limites, économie).
*   **`AISimulatorPage` (`/admin/simulateur`)**, **`CardTesterPage` (`/admin/card-tester`)**, **`SkillTesterPage` (`/admin/skill-tester`)** : Outils de simulation 3x3 et de test de compétences.
*   **`DynamicArchitectureMapPage` (`/admin/cartographie-dyn`)** & **`StoryArchivesPage` (`/admin/stories`)** : Cartographie dynamique et diagrammes narratifs.

---

## ⚙️ Architecture Technique

### Frontend (Vue 3 / Vite)
*   **État Global (Pinia)** : `userStore.js` (profil, progression, config), `notificationStore.js`, `chatStore.js`, `friendStore.js`, `effectStore.js`, `playerStore.js`, `layoutStore.js`.
*   **Moteur de Jeu Immuable** (`shared/GameEngine.ts` + `src/game/`) :
    *   `shared/GameEngine.ts` (ré-exporté par `GameEngine.js`) : Logique pure 3x3 unifiée (Same, Plus, Combo, Éléments, `PASS_TURN`, compétences) sans dépendances Vue/Three.js.
    *   `TurnManager.js` : Transition de tours et vérification d'intégrité par hash.
    *   `WebRTCManager.js` & `SocketManager.js` : Synchronisation P2P et Socket.IO authentifié par JWT.
    *   `state.js` : État réactif global de la partie et modale de confirmation (`confirmAction`).
    *   `logger.js` / `logger-logic.js` : Journalisation testable unitairement.
*   **Rendu Avancé** : Modélisation 3D et shaders via Three.js (ex: `AnimatedCardBack.vue`, `FoilEditorProView.vue`) intégrés directement dans Vue.
*   **Design System** : Utilisation intensive de variables CSS (`--color-primary`, etc.) injectées depuis Strapi, et d'effets "glassmorphism" (`color-mix`, `backdrop-filter`).

### Backend (Strapi 5 / TypeScript)
*   **API REST, Socket.IO & Base de données** : Mapping automatique du camelCase (`schema.json`) vers le snake_case SQL, permissions synchronisées via `src/bootstrap-utils.ts` et temps réel via `src/socketio.ts`.
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

### 3. Tests & Vérification
*   **Tests Unitaires (Vitest & Node.js)** : `cd front && npx vitest run` pour le moteur de jeu (`shared/GameEngine.ts`), l'IA et les compétences ; `node front/tests/rules_logic_test.js` pour les tests sans dépendance Vite.
*   **Build & Typage** : `cd back/strapi && npx tsc --noEmit` pour vérifier le backend TypeScript, et `cd front && npm run build` pour le bundle frontend.
*   **API & E2E (Playwright)** : Scripts dans `front/tests/` utilisant des mocks de tokens (`tt_jwt`) si besoin.

### Variables d'environnement
Le backend nécessite un fichier `back/strapi/.env` contenant les clés secrètes (`APP_KEYS`, `API_TOKEN_SALT`, `ADMIN_JWT_SECRET`, `TRANSFER_TOKEN_SALT`, `JWT_SECRET`). Ne définissez pas de valeurs par défaut "en dur" dans le code pour des raisons de sécurité.
