# Développement & Consignes IA (AGENTS.md)

Ce fichier regroupe les consignes, conventions et astuces techniques spécifiques au projet Terra Nullius, afin de guider le développement automatisé ou assisté par IA.

## 1. Contexte Général et Principes
*   **Mode Planification Requis** : Avant d'entamer des modifications, l'IA DOIT entrer en "planning mode" : poser des questions de clarification pour valider les hypothèses (`message_user` / `request_user_input`), créer un plan formel via `set_plan`, et attendre la validation de l'utilisateur avant d'exécuter.
*   **Design System** : Référez-vous toujours au [Design System](/admin/design-system) pour maintenir la cohérence visuelle et réutiliser les composants existants.
*   **Priorité des Instructions** : Les demandes explicites de l'utilisateur priment toujours sur les règles écrites dans ce fichier ou en mémoire.

## 2. Architecture & Environnement (Monorepo)
*   **Structure** : 
    *   `front/` : Vue.js 3 + Vite (Composition API, Pinia). Dossiers clés : `api/`, `components/`, `game/`, `layouts/` (`NavigationLayout.vue`, `AdminLayout.vue`, `BlankLayout.vue`), `stores/` (`userStore.js`, `chatStore.js`, `notificationStore.js`, `friendStore.js`, `effectStore.js`, `layoutStore.js`, `playerStore.js`), `views/`, `admin/`.
    *   `back/strapi/` : Strapi 5 (TypeScript). Dossiers clés : `src/api/`, `src/bootstrap-utils.ts` (`syncPermissions`), `src/socketio.ts` (Socket.IO authentifié par JWT via `io.use` et ACL par room).
    *   `shared/` : Logique et données partagées — moteur unifié `shared/GameEngine.ts` (grille 3x3), système de compétences `shared/skills/` (`SkillEngine.ts`, `SkillRegistry.ts`, `effects/`, `helpers.ts`, `constants.ts`), constantes `shared/constants.ts` et données narratives `shared/data/stories/`.
*   **Docker Compose** : Le projet utilise `docker compose` (v5.1.0+). N'utilisez **jamais** l'alias legacy `docker-compose`.
*   **Communication** : API REST pour la persistance, Socket.IO authentifié (`auth: { token }` via `tt_jwt`) pour le chat/matchmaking, et WebRTC (Peer-to-Peer) pour le multijoueur (arbitrage serveur via `POST /api/match/arbitrate` en cas de désync).
*   **Base de Données** : PostgreSQL 16 (conteneur `terra-nullius-db`). Les identifiants sont dans `.env`. Ne définissez JAMAIS de valeurs de repli par défaut dans la config.
*   **Variables d'Environnement (Vite)** : Moquez manuellement `import.meta.env` lors de l'exécution de scripts Node.js autonomes sur des modules Vue/Vite.

## 3. Mécaniques de Jeu & Story Mode
*   **Règles de Base** : Grille **3x3** fixe, 5 cartes en main. Capture classique (valeur supérieure) + règles spéciales : **Same**, **Plus**, **Combo** (réaction en chaîne, respectant `Ward` et le blocage `Freeze` ennemi uniquement), **Éléments** (`boardElements` : `+1` si l'élément de la carte correspond à celui de la case, `-1` sinon) et **Timer de tour** (`turnTimeSeconds` synchronisé depuis `GameConfig`, jeu automatique à expiration). L'action `PASS_TURN` est supportée.
*   **Logique de Jeu** : L'état réactif est centralisé dans `front/src/game/state.js` (complété par les stores Pinia). Le moteur unique et immuable réside dans `shared/GameEngine.ts` (ré-exporté par `front/src/game/GameEngine.js`) et est partagé entre le frontend, l'IA (`pureAi.js`), l'admin (`AISimulatorPage`, `CardTesterPage`) et l'arbitre serveur Strapi.
*   **Compétences (`shared/skills/`)** : Les compétences modulaires (`skill.effect_type`) s'exécutent via `SkillEngine` (`effects/`), tandis que les types historiques passent par `translateLegacySkill` ou leurs handlers dédiés dans `SkillRegistry`. `Teleportation` résout le déplacement avant les captures depuis la case d'arrivée.
*   **TurnManager** : Gère les tours en local ou via WebRTC (comparaison de Hashs d'état).
*   **Mode Histoire (Terra Nullius)** : Architecture "Choose Your Own Adventure" via Strapi Dynamic Zones. Les JSON sont dans `shared/data/stories/` et compilés via `assemble_story.cjs`.
*   **Notifications & Confirmations** : Utilisez `gameEvents.emit('SHOW_ALERT', { text: '...' })` **en match** (`GameView`), et `useNotificationStore().addNotification(event, message, type)` + `confirmAction(title, message)` (`<ConfirmationModal />` global dans `App.vue`) hors-match et dans l'admin à la place de `alert()` / `confirm()`.

## 4. Base de Données Strapi et Sécurité
*   **Mapping PostgreSQL** : camelCase dans `schema.json` -> snake_case dans la BDD.
*   **Validation (Zod) & Sécurité** : Forcez des limites (longueur, whitelist) dans les contrôleurs. Aucun endpoint dev non sécurisé (`/api/dev/add-currencies` supprimé) ni identifiant hardcodé dans le frontend admin ; `/api/shop/open-pack` est déprécié (`410 Gone`) au profit de `/api/booster/open`.
*   **Optimisation (N+1)** : Utilisez `findMany` avec `$in` pour les packs, pré-fetch des permissions en bulk, et déléguez les tris complexes (DISTINCT) à Knex.
*   **Permissions (Bootstrap)** : Mettez à jour `back/strapi/src/bootstrap-utils.ts` (`syncPermissions`) pour chaque nouvelle collection/endpoint.

## 5. Conventions Frontend & Vue 3
*   **Gestion des Valeurs** : Autorité dans `front/src/data/factions.js` et `shared/constants.ts`. Valeur `"A"` = **100** en combat (`parseCombatSide`) et **10** pour le calcul de niveau/rareté (`parseLevelSide`, `getRarity`).
*   **UI et Glassmorphism** : Utilisez `--color-primary` injectée depuis `GameConfig`. Pour le verre : `color-mix(in srgb, var(--color-variable) <percentage>%, transparent)` + `backdrop-filter: blur(...)`.
*   **Icônes** : Émojis ou SVGs inlines uniquement.
*   **Scrollbars & Layouts** : Classe `.custom-scrollbar`. Le layout joueur par défaut est `NavigationLayout.vue` (incluant `<BottomMobileNav>` avec `padding-bottom` et `safe-area-inset-bottom` sur mobile ; `PlayerLayout` a été supprimé).
*   **Navigation** : Utilisez `<AppButton>` avec `router.push()` au lieu de `<router-link>`.
*   **Three.js & Shaders** : Définissez le GLSL en chaînes littérales dans `<script setup>`, jamais dans le `<template>`.
*   **Drag & Drop** : Pas d'API native. Utilise `<Teleport>`, événements `pointer*` et `document.elementsFromPoint()`.
*   **Auth & Debug** : JWT stocké dans `localStorage` sous `tt_jwt` (utilisateur sous `tt_user`).

## 6. Stratégies de Tests
*   **Logique Pure & TypeScript** : Suite unitaire Vitest (`cd front && npx vitest run`) + scripts Node purs (`node front/tests/rules_logic_test.js`). Pas d'import Vue/Pinia/Three.js dans les tests moteur. Côté backend, validez le typage avec `cd back/strapi && npx tsc --noEmit` et le bundle frontend avec `cd front && npm run build`.
*   **Playwright (E2E)** :
    *   **Bypass Auth** : Mock tokens dans localStorage + mock `/api/users/me?populate=role`.
    *   **Data Mocking** : Interceptez `**/api/cards*` pour éviter les bases vides.
    *   **UI** : Manipulez le DOM pour les dropdowns custom (pas de `select_option`).
    *   **Isolation** : Modification temporaire de l'entrée Vite pour tester un composant seul.

## 7. Conventions de Pull Requests
*   **Sécurité** : `🔒 [description]`. Inclure sections `What`, `Risk`, `Solution`.
*   **Performance** : `⚡ [description]`.
