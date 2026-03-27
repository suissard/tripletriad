# Documentation d'Apprentissage & Onboarding Développeur : Terra Nullius

Ce fichier sert de guide exhaustif pour comprendre l'architecture, le fonctionnement interne et les bonnes pratiques du projet Terra Nullius (Triple Triad). Il est destiné aux développeurs pour faciliter leur intégration et éviter les pièges techniques connus.

---

## 🏗️ 1. Architecture Technique

Le projet est divisé en deux parties principales (monorepo) :
- **Frontend** : Application Vue.js 3 + Vite, utilisant la Composition API et Pinia pour la gestion d'état.
- **Backend** : CMS Strapi 5 (TypeScript) pour la persistance des données et la logique métier sécurisée.

### Modèle de Communication
- **API REST** : Communication standard entre le Frontend et le Backend Strapi.
- **WebRTC (Peer-to-Peer)** : Utilisé pour les parties multijoueurs afin d'assurer une faible latence. Les actions sont échangées directement entre clients, avec un arbitrage serveur en cas de désynchronisation.
- **SQLite** : Base de données par défaut pour le backend.

### Organisation du Frontend (`front/src/`)
- `api/` : Client API REST (`strapi.js`) et Mocks.
- `components/` : Composants UI réutilisables (Cartes, Plateau, Animations).
- `game/` : Moteur de jeu pur (Logique métier déconnectée de Vue).
- `stores/` : Gestion de l'état global avec Pinia (`userStore`, `layoutStore`).
- `views/` : Pages de l'application (Router).

### Organisation du Backend (`back/strapi/src/`)
- `api/` : Contrôleurs et services pour les entités du jeu (Cartes, Decks, Matchs, Boutique).
- `index.ts` : Point d'entrée gérant le bootstrap automatique (Permissions, Seeding initial).

---

## 🎲 2. Mécaniques de Jeu

Le jeu se déroule sur une grille de **3x3** (9 cases). Chaque joueur dispose d'une main de 5 cartes.
Chaque carte possède 4 valeurs (Stats) placées sur les bords (Haut, Bas, Gauche, Droite), allant de 1 à 9, ou A (10).

### Règles de Capture
- **Capture Classique** : Une carte posée capture une carte adjacente si la valeur de son bord attaquant est strictement supérieure au bord défenseur.
- **Règles Spéciales** (`src/game/rules.js`) :
  - **Same** : Capture si au moins deux bords sont identiques aux bords adjacents.
  - **Plus** : Capture si la somme de deux bords adjacents est égale.
  - **Combo** : Les cartes capturées via Same/Plus deviennent attaquantes à leur tour (réaction en chaîne).
- **Éléments** : Des bonus/malus s'appliquent si l'élément de la carte correspond ou non à l'élément de la case du plateau.

**Victoire** : La partie se termine quand le plateau est plein. Le joueur contrôlant le plus de cartes (plateau + main) l'emporte.

---

## 🧠 3. Gestion de l'État et Moteur de Jeu

### L'État Centralisé (`src/game/state.js`)
L'état global du jeu en cours est géré par un objet réactif Vue (`state`). Il contient :
- `board` : L'état des 9 cases.
- `pHand` / `aiHand` : Les mains des joueurs.
- `turn` : À qui le tour.
- `rules` : Les règles actives.

### Le Moteur de Jeu (`src/game/GameEngine.js`)
Conçu selon des principes de **programmation fonctionnelle** :
- Les fonctions (ex: `computeNextState`, `processCaptures`) sont **pures** et ne mutent pas l'état.
- Elles prennent un état en entrée et renvoient un nouvel état (immuabilité).

### Gestion des Tours (`src/game/TurnManager.js`)
Fait le pont entre le moteur et l'environnement :
- **Local** : Met à jour directement l'état.
- **En ligne (P2P)** : Sérialise les actions, les envoie via WebRTC, et compare les **Hashs** d'état avec l'adversaire. En cas de différence (désynchronisation), le backend Strapi (`/api/match/arbitrate`) rejoue le journal des actions pour forcer la synchronisation.

---

## 🔄 4. Flux Utilisateur et Processus Arrière-Plan

### Ouverture d'un Booster
1. Vérification locale du solde (Frontend).
2. Requête POST `api/booster/open`.
3. Le serveur déduit les fonds, génère les cartes selon les probabilités et les ajoute à la base.
4. Le frontend reçoit les cartes et déclenche l'animation.

### Lancement de Partie (Coin Toss)
1. Le premier joueur est défini (aléatoire en IA, ou décidé par l'hôte en Multi).
2. L'animation 3D (`CoinToss.vue`) est jouée.
3. À la fin de l'animation, l'état `state.turn` est mis à jour pour débuter le match.

### Poser une Carte
1. Le moteur valide le mouvement.
2. Calcul des captures (classiques + règles spéciales + combos).
3. Le nouvel état est généré et l'interface réagit. (Action transmise en WebRTC si multijoueur).

---

## ⚠️ 5. Conventions, Pièges et Leçons Apprises

Ce chapitre regroupe les points critiques identifiés lors du développement.

### Backend & Strapi
- **Strapi 5 & TypeScript (Le piège du `.js`)** : Le projet Strapi est en TS. Ne modifiez jamais `src/index.js` car il est écrasé à la compilation. Toute logique de bootstrap doit aller dans `src/index.ts`.
- **Bootstrap de Permissions Exhaustif** : Utilisez le bootstrap pour créer programmatiquement les permissions API au démarrage, évitant ainsi de bloquer le frontend en cas d'oubli dans l'admin panel.

### Frontend & Vue 3
- **Diagnostic de Session et Rôles** : Un JWT valide ne garantit pas les permissions. Inspectez l'endpoint `/api/users/me?populate=role` pour diagnostiquer les erreurs 403.
- **Three.js & Shaders (SFC Vue 3)** : Dans un composant `.vue`, ne placez pas de variables contenant du code GLSL dans les balises `<template>`. Définissez-les comme chaînes littérales dans `<script setup>`.
- **Design Mobile & Safe Areas** : Utilisez `padding-bottom: calc([hauteur] + env(safe-area-inset-bottom))` pour éviter que les barres de navigation mobiles (ex: iOS) ne masquent le contenu du jeu.
- **Drag & Drop Customisé** : N'utilisez pas l'API HTML5 native pour le D&D. L'application utilise des événements pointeurs personnalisés (`pointerdown/move/up`) et `<Teleport>` pour un support tactile parfait.
- **Esthétisme et Glassmorphism** : Pour l'interface transparente "vitreuse", utilisez `color-mix(in srgb, var(--color-variable) <pourcentage>%, transparent)` combiné avec `backdrop-filter: blur(...)` (pas de couleurs opaques fixes).
- **Navigation Vue Router** : Pour rendre un composant (ex: `<AppButton>`) navigable, simulez le clic avec `@click="router.push('...')"` au lieu d'utiliser une balise `<router-link>`.
- **Option Développeur In-Game** : Les options de debug (auto-login, premium) sont stockées dans le `localStorage` pour persister entre les rechargements.

### Tests & Assurance Qualité
- **Playwright (UI & API)** : En test e2e, moquez systématiquement l'API Strapi (via `page.route()`) pour éviter les erreurs si la base de données de test est vide. Attention aux dropdowns Vue custom (n'utilisez pas `page.select_option()`, mais manipulez le DOM).
- **Vitest & Logique Pure** : Si l'environnement Node/npm est instable, les tests métiers (ex: `GameEngine`) peuvent être lancés en natif via `node --test` ou `node_assert`.

### Architecture & Déploiement
- **Conflits Docker (EACCES)** : Si vous lancez le serveur de dev frontend via Docker, il créera des fichiers avec les droits `root` (ex: `node_modules`). Il est recommandé de lancer le frontend localement (`npm run dev`) pour éviter ces conflits de permissions, tout en gardant Strapi sous Docker.
