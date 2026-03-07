# Documentation d'Apprentissage: Triple Triad

Ce fichier regroupe les points critiques identifiés lors de la résolution des erreurs 403 et des conflits d'environnement.

## 1. Strapi 5 & TypeScript (Le piège du `.js`)
**Problème :** Les modifications apportées à `back/strapi/src/index.js` étaient systématiquement ignorées par le serveur.
**Cause :** Le projet Strapi 5 est configuré en TypeScript. La présence d'un fichier `src/index.ts` rend le fichier `src/index.js` obsolète car Strapi re-compile le TS au démarrage.
**Leçon :** Toujours vérifier si un équivalent `.ts` existe avant de modifier un `.js` dans le dossier `src` de Strapi. La logique de bootstrap (permissions, seeding) doit impérativement résider dans `src/index.ts`.

## 2. Conflits de Permissions Docker (EACCES)
**Problème :** Erreur `EACCES: permission denied` lors du lancement de `npm run dev:front` sur l'hôte.
**Cause :** Le service `frontend` dans `docker-compose.yml` montait le dossier `./front` et exécutait `npm install / dev` en tant que `root`. Cela créait des fichiers (comme `.vite/deps`) appartenant à `root` sur la machine hôte.
**Leçon :** 
- Éviter de faire tourner le serveur de développement frontend dans Docker si l'utilisateur souhaite aussi le lancer localement (conflit de propriété de fichiers).
- Solution : Désactiver le service `frontend` dans `docker-compose.yml` et gérer le frontend uniquement via l'hôte.

## 3. Diagnostic de Session Frontend
**Problème :** Difficulté à savoir pourquoi un utilisateur reçoit un 403 (Forbidden) malgré un JWT valide.
**Solution :** Implémenter un bouton "Debug Auth" qui interroge spécifiquement `GET /api/users/me?populate=role`.
**Leçon :** Le simple fait d'être connecté ne garantit pas le rôle. Il est crucial de vérifier quel rôle Strapi a réellement attribué à l'utilisateur `auth.user` pour diagnostiquer les permissions API.

## 4. Bootstrap de Permissions Exhaustif
**Stratégie :** Pour le développement, utiliser le bootstrap Strapi pour parcourir programmatiquement toutes les permissions des rôles `authenticated` et `public`.
**Code clé :**
```typescript
await strapi.db.query('plugin::users-permissions.permission').create({
  data: { action: 'api::card.card.find', role: authRole.id }
});
```
Cela garantit qu'aucun changement de modèle ne bloque le frontend par manque de permissions manuelles dans l'admin panel.

## 5. Dev Options
**Règle :** Les éléments dans les options de dev (ex: auto login, premium mode) doivent être sauvegardés dans le `localStorage` du navigateur pour être persistants entre les rechargements de page, et synchronisés avec l'état global si nécessaire.
