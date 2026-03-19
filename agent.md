# Documentation d'Apprentissage: Terra Nullius

Ce fichier regroupe les points critiques identifiés lors du développement, les bonnes pratiques, et la résolution de bugs d'environnement.

## 1. Frontend : Intégration de Three.js dans Vue 3 (SFC)
**Problème :** L'intégration de shaders GLSL et de scènes Three.js complexes dans des composants Vue (comme `FoilEditorView.vue` ou `AnimatedCardBack.vue`) peut causer des problèmes de rendu ou des erreurs de compilation Vite.
**Cause :** Les balises `<script>` ou `<style>` avec des effets de bord (comme la définition directe de shaders hors de la portée du setup) posent problème.
**Leçon :**
- Toujours définir les shaders GLSL (Vertex et Fragment) sous forme de chaînes de caractères littérales (`const vertexShader = \`...\``) directement dans le bloc `<script setup>`.
- Isoler la logique Three.js (`three-scene.js`) de la réactivité Vue pour éviter de surcharger Pinia avec des objets non-sérialisables (Mesh, Texture, Scene).
- Nettoyer méticuleusement la scène (dispose geometries, materials, renderer) dans le hook `onUnmounted` pour éviter les fuites de mémoire.

## 2. Frontend : Événements Tactiles et Drag & Drop (Cross-Device)
**Problème :** Le Drag & Drop natif HTML5 (`draggable="true"`, `@dragstart`, `@drop`) est erratique ou non fonctionnel sur les appareils mobiles iOS/Android.
**Leçon :**
- Ne **jamais** utiliser le D&D natif pour des interfaces de jeu (comme `GameBoard.vue` ou `PlayerHand.vue`).
- Utiliser exclusivement les **Pointer Events** (`@pointerdown`, `@pointermove`, `@pointerup`).
- Pour détecter la zone de dépôt (drop target) au relâchement du doigt/souris, utiliser `document.elementsFromPoint(event.clientX, event.clientY)` et chercher l'attribut de la cible (ex: `data-index`).
- Gérer le retour visuel du drag avec un élément `<Teleport to="body">` (un "ghost" attaché au curseur en `position: fixed`).

## 3. Frontend : Conception des Composants UI
**Règle :** Éviter de créer des composants ultra-spécifiques pour chaque bouton ou panel du jeu.
**Leçon :** Utiliser des composants conteneurs génériques (`AppButton`, `AppCard`, `AppPanel`, `AppModal`) avec des **Slots** Vue (`<slot>`). Cela permet d'y injecter des contenus complexes (comme un `<canvas>` Three.js à l'intérieur d'un bouton) en gardant les états CSS de base (hover, focus, disabled) centralisés.

## 4. Strapi 5 & TypeScript (Le piège du `.js`)
**Problème :** Les modifications apportées à `back/strapi/src/index.js` étaient systématiquement ignorées par le serveur.
**Cause :** Le projet Strapi 5 est configuré en TypeScript. La présence d'un fichier `src/index.ts` rend le fichier `src/index.js` obsolète car Strapi re-compile le TS au démarrage.
**Leçon :** Toujours vérifier si un équivalent `.ts` existe avant de modifier un `.js` dans le dossier `src` de Strapi. La logique de bootstrap (permissions, seeding) doit impérativement résider dans `src/index.ts`.

## 5. Conflits de Permissions Docker (EACCES)
**Problème :** Erreur `EACCES: permission denied` lors du lancement de `npm run dev:front` sur l'hôte.
**Cause :** Le service `frontend` dans `docker-compose.yml` montait le dossier `./front` et exécutait `npm install / dev` en tant que `root`. Cela créait des fichiers (comme `.vite/deps`) appartenant à `root` sur la machine hôte.
**Leçon :** 
- Désactiver le service `frontend` dans `docker-compose.yml` et gérer le frontend uniquement via l'hôte. Ne containeriser que le backend/BDD en phase de dev.

## 6. Diagnostic de Session Frontend (Rôles Strapi)
**Problème :** Difficulté à savoir pourquoi un utilisateur reçoit un 403 (Forbidden) malgré un JWT valide.
**Solution :** Implémenter un bouton "Debug Auth" qui interroge spécifiquement `GET /api/users/me?populate=role`.
**Leçon :** Le simple fait d'être connecté ne garantit pas le rôle. Il est crucial de vérifier quel rôle Strapi a réellement attribué à l'utilisateur `auth.user` pour diagnostiquer les permissions API.

## 7. Bootstrap de Permissions Exhaustif
**Stratégie :** Pour le développement, utiliser le bootstrap Strapi (`index.ts`) pour parcourir programmatiquement toutes les permissions des rôles `authenticated` et `public`.
**Code clé :**
```typescript
await strapi.db.query('plugin::users-permissions.permission').create({
  data: { action: 'api::card.card.find', role: authRole.id }
});
```

## 8. Dev Options & Layouts
**Règle :** Les éléments dans les options de dev (ex: auto login, premium mode) doivent être sauvegardés dans le `localStorage` du navigateur.
**Mobiles :** Lors du design des vues mobiles, toujours ajouter un padding équivalent à la hauteur de la navigation (`BottomMobileNav`) via `padding-bottom: calc([height] + env(safe-area-inset-bottom))` pour ne pas masquer de contenu.

## 9. Multijoueur & WebRTC
**Leçon :** Pour un mode P2P sans serveur relais lourd, le `WebRTCManager` gère l'échange de signalisation manuel (copier-coller du code de l'offre/réponse).
**Synchronisation :** Le `TurnManager` utilise un pattern "Optimistic Update". Le joueur local applique son coup instantanément, l'envoie à l'adversaire, et l'état est re-calculé globalement via `GameEngine.computeNextState()` de manière pure et déterministe de part et d'autre pour éviter la désynchronisation.
