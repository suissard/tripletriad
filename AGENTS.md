# Développement & Consignes IA (AGENTS.md)

Ce fichier regroupe les consignes, conventions et astuces techniques spécifiques au projet Terra Nullius, afin de guider le développement automatisé ou assisté par IA.

## 1. Contexte Général et Principes
*   **Mode Planification Requis** : Avant d'entamer des modifications, l'IA DOIT entrer en "planning mode" : poser des questions de clarification pour valider les hypothèses (`message_user` / `request_user_input`), créer un plan formel via `set_plan`, et attendre la validation de l'utilisateur avant d'exécuter.
*   **Priorité des Instructions** : Les demandes explicites de l'utilisateur priment toujours sur les règles écrites dans ce fichier ou en mémoire.

## 2. Architecture & Environnement (Docker / Strapi / Vite)
*   **Docker Compose** : Le projet utilise `docker compose` (v5.1.0+). N'utilisez **jamais** l'alias legacy `docker-compose`. Les commandes de type `npm install` massives ou `docker compose up` pour le backend Strapi peuvent "time out" en sandbox : privilégiez la revue de code manuelle ou de petits scripts Node.js pour vérifier la logique si le serveur ne peut pas démarrer.
*   **Fichiers Communs (Standalone)** : Le projet utilise `"type": "module"`. Les scripts Node.js isolés utilisant `require()` (ex: scripts d'assemblage JSON dans `shared/`) DOIVENT avoir l'extension `.cjs`.
*   **Configuration Base de Données (Strapi)** : L'application utilise PostgreSQL 16 (conteneur `terra-nullius-db` dans `docker-compose.yml`). Les identifiants sont définis via les variables `DATABASE_*` dans `.env`. Ne définissez JAMAIS de valeurs de repli par défaut (ex: `DATABASE_PASSWORD`) dans `back/strapi/config/database.ts` : si l'env ne fournit pas les identifiants, l'application doit échouer silencieusement/sécuritairement.
*   **Variables d'Environnement (Vite)** : Lors de l'exécution de scripts Node.js autonomes sur des modules Vue/Vite, moquez manuellement les références à `import.meta.env` (ex: `import.meta.env.VITE_STRAPI_URL`) pour éviter les erreurs "Cannot read properties of undefined".

## 3. Base de Données Strapi et Sécurité
*   **Mapping PostgreSQL** : Dans Strapi 5, les noms d'attributs définis en camelCase dans `schema.json` (ex: `collectionName`) sont **automatiquement mapés** en snake_case dans les colonnes de la base de données (ex: `collection_name`).
*   **Validation Backend (Zod)** : Dans les extensions de contrôleurs Strapi, utilisez `zod` pour forcer des limites de longueur (ex: 3-32 caractères pour un pseudo) et une liste blanche de caractères (ex: `/^[a-zA-Z0-9_]+$/`) afin de prévenir les DoS et injections.
*   **Optimisation (N+1)** :
    *   Les contrôleurs d'ouverture de pack (`shop.ts`) utilisent une seule requête `findMany` avec `$in` et une agrégation par `Map` pour la distribution. Conservez cette logique.
    *   Le hook de démarrage (`index.ts`) pré-fetch les permissions en vrac (bulk) et utilise des `Set` en mémoire.
    *   Les requêtes de tri complexes (ex: contrôleur `getFilters` de `card.ts`) délèguent le `DISTINCT` à la BDD via `strapi.db.connection` (Knex) plutôt qu'en JavaScript.
*   **Initialisation & Permissions (Bootstrap)** : Lors de la création de nouvelles collections ou de nouveaux endpoints API, vous DEVEZ mettre à jour `back/strapi/src/bootstrap-utils.ts` pour inclure les permissions correspondantes dans les rôles `authenticated` ou `public`. Cela assure que l'environnement est reproductible sans intervention manuelle dans l'admin Strapi.

## 4. Conventions Frontend & Vue 3
*   **Gestion des Valeurs & Factions** : La liste faisant autorité des éléments/factions se trouve dans `front/src/data/factions.js` (`ELEMENTS`, `ELEMENT_LABELS`). Dans les interfaces, la valeur de carte `10` s'affiche toujours comme `"A"` (As), géré par `displayVal` dans `constants.js`. La rareté d'une carte est la somme de ses 4 côtés (Commun < 20, Peu Commun 20-25, Rare 26-31, Épique 32-35, Légendaire 36+).
*   **UI et Glassmorphism** :
    *   Utilisez des variables CSS injectées dynamiquement (`--color-primary`) depuis la config Strapi (dans `App.vue`). Ne "hardcodez" pas les couleurs.
    *   Pour les éléments transparents (glassmorphism), utilisez la combinaison : `background: color-mix(in srgb, var(--color-variable) <percentage>%, transparent)` + `backdrop-filter: blur(...)`.
*   **Icônes** : Privilégiez les émojis (ex: 📜) ou les SVGs inlines personnalisés aux librairies externes.
*   **Scrollbars & Layouts** :
    *   Appliquez la classe `.custom-scrollbar` aux conteneurs nécessitant un défilement.
    *   Pour les layouts flexbox (ex: page Admin), assurez-vous que les enfants scrollables (ex: `<main>`) ont `min-height: 0` (`min-h-0`) et que les vues internes utilisent `h-full` plutôt que `min-h-screen`.
    *   Sur mobile, prévoyez le padding bas pour la barre de navigation fixe : `padding-bottom: calc([height] + env(safe-area-inset-bottom))`.
*   **Navigation & Boutons** : Au lieu de `<router-link>`, utilisez les composants personnalisés comme `<AppButton>` avec `@click="router.push('...')"` et un binding `:class` pour gérer les états actifs selon `route.path`. Pour les composants complexes ajoutant du canvas (FoilEditor), insérez le canvas en enfant avec `pointer-events: none` plutôt que de remplacer l'élément natif pour préserver l'accessibilité.
*   **Drag & Drop Mobile-Friendly** : Le drag and drop n'utilise PAS l'API native HTML5. Il repose sur un `<Teleport>` affichant un "ghost", des événements `pointerdown`/`pointermove`/`pointerup`, et `document.elementsFromPoint()` pour cibler les zones de drop de façon cross-device. En cas de latence de Vue (`v-if`), utilisez la manipulation DOM directe (ex: `element.style.display = 'none'`) dans les handlers pour supprimer l'artefact "fantôme" au moment du drop.

## 5. Mécaniques de Jeu & Story Mode
*   **Logique de Jeu** : Les états de jeu sont partagés via Pinia (`front/src/game/state.js`). Évitez les "Event Bus". Le moteur de jeu multijoueur (`GameEngine.js`) utilise des fonctions d'état pures pour faciliter la synchro WebRTC (via `TurnManager.js`).
*   **Notifications en jeu** : Pour déclencher une alerte visuelle (ex: "COMBO!"), utilisez `gameEvents.emit('SHOW_ALERT', { text: '...' })` depuis `events.js`.
*   **Mode Histoire (Terra Nullius)** :
    *   Architecture "Choose Your Own Adventure" via Strapi Dynamic Zones.
    *   Génération : Les JSON de situation se créent dans `shared/data/stories/<folder>` et se compilent avec `node shared/data/assemble_story.cjs <folder-path>`. Les IDs dynamiques (`enemyDeck`, `playerDeck`) peuvent être omis pour forcer une génération aléatoire.
    *   Interface : `StoryStepView.vue` agit comme une machine à état. Les validations de récompenses/sauvegardes sont strictement reléguées à l'API Strapi (via `userStore.js`) pour empêcher la triche client.

## 6. Stratégies de Tests
*   **Test de Logique Pure (Node.js)** : Les tests de règles pures (ex: `front/tests/minimal_engine_test.js`) utilisent le module natif `assert` de Node. Ils DOIVENT rester isolés sans importer Vue, Pinia, ou Three.js.
*   **Tests End-to-End (Playwright)** :
    *   **Bypass Auth** : Injectez des mock tokens dans le localStorage (`bo_jwt`, `tt_jwt`) et moquez `**/api/users/me` avec un payload valide (ex: `{"role": {"type": "admin"}}`).
    *   **Moquerie des Données** : Utilisez `page.route('**/api/cards*')` pour intercepter et simuler les réponses Strapi afin d'éviter les erreurs de rendu ("Failed to fetch") si la BDD est vide.
    *   **Dropdowns Custom** : Le projet utilise des dropdowns custom (ex: `<PremiumSelect>`) et non des balises `<select>` natives. Ne pas utiliser `page.select_option()` sur ces éléments.
    *   **Vérification Visuelle Sans Vitest** : Pour tester un composant Vue de manière isolée via Playwright, modifiez temporairement l'entrée Vite (`index.html` vers `src/main_test.js` ou `AppTest.vue`), effectuez le test visuel, **puis annulez la modification**.

## 7. Conventions de Pull Requests
*   Sécurité : Utilisez le format `🔒 [security fix description]`. La PR doit inclure des sections `What`, `Risk`, et `Solution`.
*   Performance : Utilisez le format `⚡ [performance improvement description]`.
