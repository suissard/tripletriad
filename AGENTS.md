# Développement & Consignes IA (AGENTS.md)

Ce fichier regroupe les consignes, conventions et astuces techniques spécifiques au projet Terra Nullius, afin de guider le développement automatisé ou assisté par IA.

## 1. Contexte Général et Principes
*   **Mode Planification Requis** : Avant d'entamer des modifications, l'IA DOIT entrer en "planning mode" : poser des questions de clarification pour valider les hypothèses (`message_user` / `request_user_input`), créer un plan formel via `set_plan`, et attendre la validation de l'utilisateur avant d'exécuter.
*   **Priorité des Instructions** : Les demandes explicites de l'utilisateur priment toujours sur les règles écrites dans ce fichier ou en mémoire.

## 2. Architecture & Environnement (Monorepo)
*   **Structure** : 
    *   `front/` : Vue.js 3 + Vite (Composition API, Pinia). Dossiers clés : `api/`, `components/`, `game/` (moteur), `stores/`, `views/`.
    *   `back/` : Strapi 5 (TypeScript). Dossiers clés : `api/`, `src/bootstrap-utils.ts`.
    *   `shared/` : Logique et données partagées (ex: stories).
*   **Docker Compose** : Le projet utilise `docker compose` (v5.1.0+). N'utilisez **jamais** l'alias legacy `docker-compose`.
*   **Communication** : API REST pour la persistance et WebRTC (Peer-to-Peer) pour le multijoueur (arbitrage serveur via Strapi en cas de désync).
*   **Base de Données** : PostgreSQL 16 (conteneur `terra-nullius-db`). Les identifiants sont dans `.env`. Ne définissez JAMAIS de valeurs de repli par défaut dans la config.
*   **Variables d'Environnement (Vite)** : Moquez manuellement `import.meta.env` lors de l'exécution de scripts Node.js autonomes sur des modules Vue/Vite.

## 3. Mécaniques de Jeu & Story Mode
*   **Règles de Base** : Grille 3x3, 5 cartes en main. Capture classique (valeur supérieure) + règles spéciales : **Same**, **Plus**, **Combo** (réaction en chaîne) et **Éléments** (bonus/malus sur cases élémentaires).
*   **Logique de Jeu** : Les états sont partagés via Pinia (`front/src/game/state.js`). Le moteur (`GameEngine.js`) utilise des fonctions d'état pures (immuabilité).
*   **TurnManager** : Gère les tours en local ou via WebRTC (comparaison de Hashs d'état).
*   **Mode Histoire (Terra Nullius)** : Architecture "Choose Your Own Adventure" via Strapi Dynamic Zones. Les JSON sont dans `shared/data/stories/` et compilés via `assemble_story.cjs`.
*   **Notifications** : Utilisez `gameEvents.emit('SHOW_ALERT', { text: '...' })` pour les alertes visuelles.

## 4. Base de Données Strapi et Sécurité
*   **Mapping PostgreSQL** : camelCase dans `schema.json` -> snake_case dans la BDD.
*   **Validation (Zod)** : Forcez des limites (longueur, whitelist) dans les contrôleurs.
*   **Optimisation (N+1)** : Utilisez `findMany` avec `$in` pour les packs, pré-fetch des permissions en bulk, et déléguez les tris complexes (DISTINCT) à Knex.
*   **Permissions (Bootstrap)** : Mettez à jour `back/strapi/src/bootstrap-utils.ts` pour chaque nouvelle collection/endpoint.

## 5. Conventions Frontend & Vue 3
*   **Gestion des Valeurs** : Autorité dans `front/src/data/factions.js`. Valeur `"A"` = 100 (As), maximum absolu. Rareté calculée sur la somme des 4 côtés.
*   **UI et Glassmorphism** : Utilisez `--color-primary` injectée. Pour le verre : `color-mix(in srgb, var(--color-variable) <percentage>%, transparent)` + `backdrop-filter: blur(...)`.
*   **Icônes** : Émojis ou SVGs inlines uniquement.
*   **Scrollbars & Layouts** : Classe `.custom-scrollbar`. Sur mobile, `padding-bottom` avec `safe-area-inset-bottom`.
*   **Navigation** : Utilisez `<AppButton>` avec `router.push()` au lieu de `<router-link>`.
*   **Three.js & Shaders** : Définissez le GLSL en chaînes littérales dans `<script setup>`, jamais dans le `<template>`.
*   **Drag & Drop** : Pas d'API native. Utilise `<Teleport>`, événements `pointer*` et `document.elementsFromPoint()`.
*   **Debug** : Les options (auto-login, etc.) sont dans le `localStorage`.

## 6. Stratégies de Tests
*   **Logique Pure** : Modules natifs Node `assert`. Pas d'import Vue/Pinia/Three.js dans les tests de moteur.
*   **Playwright (E2E)** :
    *   **Bypass Auth** : Mock tokens dans localStorage + mock `/api/users/me?populate=role`.
    *   **Data Mocking** : Interceptez `**/api/cards*` pour éviter les bases vides.
    *   **UI** : Manipulez le DOM pour les dropdowns custom (pas de `select_option`).
    *   **Isolation** : Modification temporaire de l'entrée Vite pour tester un composant seul.

## 7. Conventions de Pull Requests
*   **Sécurité** : `🔒 [description]`. Inclure sections `What`, `Risk`, `Solution`.
*   **Performance** : `⚡ [description]`.
