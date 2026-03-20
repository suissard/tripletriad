# Documentation d'Apprentissage: Terra Nullius

Ce fichier regroupe les points critiques, pièges techniques et conventions identifiés lors du développement du jeu.

## 🏗️ Backend & Strapi

### Strapi 5 & TypeScript (Le piège du `.js`)
**Problème :** Les modifications apportées à `back/strapi/src/index.js` étaient systématiquement ignorées par le serveur.
**Cause :** Le projet Strapi 5 est configuré en TypeScript. La présence d'un fichier `src/index.ts` rend le fichier `src/index.js` obsolète car Strapi re-compile le TS au démarrage.
**Leçon :** Toujours vérifier si un équivalent `.ts` existe avant de modifier un `.js` dans le dossier `src` de Strapi. La logique de bootstrap (permissions, seeding) doit impérativement résider dans `src/index.ts`.

### Bootstrap de Permissions Exhaustif
**Stratégie :** Pour le développement, utiliser le bootstrap Strapi pour parcourir programmatiquement toutes les permissions des rôles `authenticated` et `public`.
**Code clé :**
\`\`\`typescript
await strapi.db.query('plugin::users-permissions.permission').create({
  data: { action: 'api::card.card.find', role: authRole.id }
});
\`\`\`
Cela garantit qu'aucun changement de modèle ne bloque le frontend par manque de permissions manuelles dans l'admin panel.

---

## 🎨 Frontend & Vue 3

### Diagnostic de Session et Rôles
**Problème :** Difficulté à savoir pourquoi un utilisateur reçoit un 403 (Forbidden) malgré un JWT valide.
**Solution :** Implémenter un bouton "Debug Auth" qui interroge spécifiquement `GET /api/users/me?populate=role`.
**Leçon :** Le simple fait d'être connecté ne garantit pas le rôle. Il est crucial de vérifier quel rôle Strapi a réellement attribué à l'utilisateur `auth.user` pour diagnostiquer les permissions API.

### Three.js & Shaders (SFC Vue 3)
**Conventions :** Dans les Single File Components (SFCs) de Vue 3, les balises `<script>` ou `<style>` contenant des effets de bord (comme des shaders GLSL) ne peuvent pas être placées à l'intérieur du bloc `<template>` sous peine d'être ignorées par Vite.
**Leçon :** Pour intégrer des shaders personnalisés (ex: effet holographique `FoilEditor`), définissez-les comme des chaînes de caractères littérales (String literals) dans le bloc principal `<script setup>`.

### Design Mobile & Safe Areas
**Problème :** Les barres de navigation natives des mobiles (ex: iOS) chevauchent parfois l'interface en bas d'écran.
**Leçon :** L'intégration de Layouts fluides nécessitant une barre de navigation fixe (`BottomMobileNav`) doit systématiquement utiliser le padding CSS dynamique `padding-bottom: calc([hauteur] + env(safe-area-inset-bottom))` pour garantir la visibilité du contenu.

### Drag & Drop Customisé (Cross-device)
**Conventions :** Les événements de drag-and-drop natifs HTML5 ne réagissent pas bien avec le tactile ou les interactions complexes.
**Leçon :** L'application utilise des custom Pointer Events (`pointerdown`, `pointermove`, `pointerup`) combinés avec le composant Vue `<Teleport>` pour rendre une image fantôme du drag. La logique détecte la cible de drop dynamiquement avec `document.elementsFromPoint()`.

### Esthétisme et Glassmorphism
**Leçon :** Pour maintenir la cohérence de l'interface vitreuse de Terra Nullius, n'utilisez pas de couleurs statiques opaques. Utilisez le pattern CSS `color-mix(in srgb, var(--color-variable) <pourcentage>%, transparent)` combiné avec `backdrop-filter: blur(...)` pour les panneaux, modales, ou boutons superposés.

### Navigation Vue Router Personnalisée
**Leçon :** Pour utiliser des composants globaux existants (comme `<AppButton>`) pour la navigation à la place de la balise HTML `<router-link>`, il faut simuler le clic via `@click="router.push('...')"` et gérer l'état visuel actif manuellement avec une classe CSS conditionnelle (ex: `:class="{ active: route.path === '...' }"`).

### Option Développeur In-Game
**Règle :** Les éléments dans les options de dev (ex: auto login, premium mode) doivent être sauvegardés dans le `localStorage` du navigateur pour être persistants entre les rechargements de page, et synchronisés avec l'état global (`Pinia`) si nécessaire.

---

## 🧪 Tests & Assurance Qualité (QA)

### Playwright : Intégration UI et API
**Leçon 1 :** Lors des tests visuels frontend avec Playwright, la base de données pouvant être vide, utilisez `page.route()` pour intercepter et "moquer" systématiquement les réponses de l'API Strapi (ex: `**/api/cards*`). Cela évite les erreurs de rendu `Failed to fetch`.
**Leçon 2 :** L'utilisation de composants dropdown Vue personnalisés empêche d'utiliser la fonction standard `page.select_option()`. Interagissez manuellement avec le DOM du composant pour valider ces formulaires.

### Vitest & Logique Pure
**Problème :** Le réseau ou le cache npm peuvent corrompre l'installation et le lancement de Vitest.
**Leçon :** Dans un environnement bloqué, les tests de pure logique métier (`getNeighbors`, règles optionnelles) peuvent être exécutés de façon autonome via de simples scripts en Node natif (`node front/tests/mon-test.js`) en utilisant le module `node:assert`.

---

## 🛠️ Architecture & Déploiement

### Conflits de Permissions Docker (EACCES)
**Problème :** Erreur `EACCES: permission denied` lors du lancement de `npm run dev:front` sur l'hôte.
**Cause :** Le service `frontend` dans `docker-compose.yml` montait le dossier `./front` et exécutait `npm install / dev` en tant que `root`. Cela créait des fichiers (comme `.vite/deps`) appartenant à `root` sur la machine hôte.
**Leçon :** Éviter de faire tourner le serveur de développement frontend dans Docker si l'utilisateur souhaite aussi le lancer localement (conflit de propriété de fichiers).

### Frontend Build Process
**Leçon :** Lors de l'exécution de `npm run build` pour le frontend, s'assurer qu'il utilise le fichier `index.html` situé à la racine du dossier `front`.
