# Revue critique & plan d'amélioration — Terra Nullius

> Branche : `improve/engine-integrity-and-tooling` (depuis `prod` @ `b3b384d`) — 2026-11-11
> Revue réalisée en autonomie : chaque décision ci-dessous est justifiée, et ce qui reste à arbitrer est signalé ⚖️.

## 1. Synthèse

Le projet est riche fonctionnellement (moteur de skills modulaire, mode histoire, quêtes, guildes, multijoueur WebRTC + arbitrage serveur) et plutôt bien documenté (`docs/`, `AGENTS.md`). Ses faiblesses principales ne sont pas dans la quantité de fonctionnalités mais dans **leur fiabilité** :

| # | Problème | Gravité | Statut |
|---|----------|---------|--------|
| 1 | `.env` contenant les **secrets réels** (JWT, clés Strapi, mot de passe admin) est versionné (10 commits d'historique) | 🔴 Critique | ✅ Retiré du suivi — ⚠️ **rotation des secrets à faire par toi** |
| 2 | `GameEngine.computeNextState` se dit « pur » mais ne clone que les lignes du plateau : les skills mutent les cartes de l'état précédent. L'IA (`pureAi.js`) simule ses coups sur le **plateau réel** → corruption possible de la partie (PV, valeurs, charges) | 🔴 Critique (gameplay) | ✅ Corrigé + tests |
| 3 | `SkillEngine.translateLegacySkill` écrit ses valeurs par défaut dans `target_pattern`/`target_filter`, champs que `getTargetCells` **ne lit jamais** → Soin soigne les ennemis, Croissance s'applique aux voisins au lieu de soi, Décroissance touche les alliés | 🔴 Élevée (gameplay) | ✅ Corrigé + tests |
| 4 | 10 tests unitaires sur 38 en échec, aucun script `npm test`, tests `node:assert` jamais exécutés | 🟠 Élevée | ✅ 45/45 + scripts logiques verts, `npm test` ajouté |
| 5 | Scripts npm cassés : `docker.compose` (commande inexistante), service `frontend` inexistant, `docker-compose` legacy dans `clean.sh` | 🟠 Élevée | ✅ Corrigé |
| 6 | Logs `[Targeting-Flow]` avec `JSON.stringify` à chaque dispatch de skill, y compris dans les centaines de simulations de l'IA par coup | 🟠 Performance | ✅ Désactivés par défaut (flag de debug) |
| 7 | Valeurs de repli (`:-strapi`, mot de passe compris) dans `docker-compose.yml`, contraire à AGENTS.md | 🟡 Moyenne | ✅ Remplacées par `:?` (échec explicite) |
| 8 | `clean.sh` supprime la base PostgreSQL sans confirmation | 🟡 Moyenne | ✅ Confirmation (bypass `--yes`) |
| 9 | `start-docker.sh` : `export $(… | xargs)` casse sur les valeurs avec espaces ; variables `PORT`/`FRONTEND_PORT` qui n'existent pas dans `.env` | 🟡 Moyenne | ✅ Corrigé |
| 10 | `/dev/add-currencies` sans validation (montants négatifs / non entiers acceptés) — admin seulement | 🟢 Faible | ✅ Validation bornée |

## 2. Détail des correctifs appliqués

### 2.1 Sécurité — `.env` versionné
- `git rm --cached .env`, `.env` / `.env.*` ajoutés au `.gitignore` (sauf `.env.example`).
- `.env.example` complété avec **toutes** les variables réellement utilisées (il manquait PostgreSQL, les sels de tokens, `ENCRYPTION_KEY`, `APP_DOMAIN`, `STRAPI_AUTO_INIT`, identifiants admin…).
- ⚠️ **À faire par toi** : les secrets restent dans l'historique Git. Si le dépôt est (ou a été) public, considère-les comme compromis : régénère `JWT_SECRET`, `ADMIN_JWT_SECRET`, `APP_KEYS`, `API_TOKEN_SALT`, `TRANSFER_TOKEN_SALT`, `ENCRYPTION_KEY`, `DATABASE_PASSWORD`, `ADMIN_PASSWORD`. Une réécriture d'historique (`git filter-repo`) est possible mais destructive pour les clones existants : je ne l'ai pas faite.
- ⚠️ **Avant de merger** : merger cette branche supprimera `.env` de ton dossier de travail (Git applique la suppression du fichier suivi). Fais `cp .env .env.backup` avant, puis restaure-le.

### 2.2 Moteur — pureté de `computeNextState`
- Ajout de `deepClonePlain` (compatible avec les Proxy réactifs Vue/Pinia, contrairement à `structuredClone`) et de `GameEngine.cloneBoard`.
- Le plateau **et** la carte jouée sont clonés en profondeur ; le coût est négligeable (16 cases).
- `getCardSkills(card)` (helpers) remplace les 4 endroits qui faisaient `card.skills.push({ type: skillId })` pendant un dispatch (mutation de la carte à chaque appel).

### 2.3 Moteur — ciblage des skills
- Les valeurs par défaut sont écrites dans les champs canoniques du schéma Strapi (`patterns`, `filter`) et **n'écrasent jamais** une configuration explicite.
- Les valeurs par défaut reprennent le comportement documenté des handlers historiques et des tests : Croissance/Décroissance → soi-même en fin de tour ; Soin → alliés adjacents ; Mort/Bombe → adjacents (sans filtre, comme avant).
- `getTargetCells` accepte `target_pattern`/`target_filter` en repli (format de l'éditeur admin « modulaire »).
- Le champ `target` des cartes offline (`shared/data/cards/*.json`), jusqu'ici **totalement ignoré**, est traduit quand il est sans ambiguïté (`self`, `all_own`, `all_enemy`, `adjacent_friendly`, `adjacent_enemy`).
- `statModifier` normalise une valeur déjà à l'As (`'A'` ↔ `100`) au lieu de sortir sans synchroniser `top`/`topValue`.
- Changement de comportement assumé : `patterns: []` (répétable Strapi vide) signifie désormais « motif par défaut » et non plus « aucune cible » (avant, Mort/Bombe configurées sans motif ne faisaient rien).

### 2.4 Tests
- `npm test` (racine ou `front/`) = tests unitaires Vitest + scripts `node:assert`. `npm run test:api` regroupe les tests qui exigent un Strapi lancé.
- Correction des tests obsolètes : `displayVal(10)` (l'As vaut 100 depuis la refonte), couleurs de rareté codées en dur, handlers factices nommés `heal`/`death` (désormais interceptés par le SkillEngine).
- Nouveau `tests/engine-purity.test.js` (7 tests) ; vérifié : **5 échouent sur `prod`**, tous passent sur la branche.

### 2.5 Logs
- `shared/skills/debug.ts` → `DEBUG_SKILLS`. Activation : `localStorage.setItem('debug:skills', '1')` (navigateur) ou `DEBUG_SKILLS=1` (Node/Strapi).
- Forme `DEBUG_SKILLS && console.log(...)` : les arguments (`JSON.stringify`) ne sont pas évalués quand le debug est désactivé.

## 3. Plan d'amélioration (non implémenté — par priorité)

### P1 — Fiabilité
1. **Deux moteurs de jeu en parallèle** : `engine.js` (slots, solo) et `GameEngine.js` (2D, multi/IA) dupliquent captures, dispatch et fin de tour. Toute correction doit être faite deux fois (le bug 2.2 n'existe peut-être pas à l'identique dans `engine.js`). ➜ Faire de `GameEngine` l'unique source de vérité et adapter le mode solo.
2. **Grille codée en dur** : `computeNextState` refuse `x > 3 || y > 3` alors que `expandBoard2D` peut agrandir le plateau. ➜ Valider avec `board.length` / `board[0].length`.
3. **Contrat de données des skills** : trois formats coexistent (Strapi `patterns`/`filter`, éditeur admin `target_pattern` + `type: 'modular'` — absent de l'enum Strapi, donc impossible à sauvegarder — et cartes offline `target`). Les cibles `enemy_with_highest`, `opposite_side`, `damaged_friendly`, `self_on_flip`, `enemy_on_capture` n'ont **aucune implémentation**. ⚖️ Décision de game design à prendre, puis migration des données vers un format unique validé (Zod côté Strapi).
4. ⚖️ **Filtre `none` par défaut dans Strapi** : comme le schéma met `filter: "none"` par défaut, une carte Soin créée dans Strapi soigne aussi les ennemis. À trancher : changer la valeur par défaut du schéma ou rendre le filtre obligatoire.
5. **Types TypeScript** : 13 erreurs `tsc` dans `shared/skills` (`SkillContext` ne déclare ni `alerts`, ni `captures`, ni `dyingCards`). ➜ Compléter `types.ts` et ajouter `tsc --noEmit` à la CI.

### P2 — Industrialisation
6. **CI absente** (pas de `.github/workflows`) : lancer `npm test` + `vite build` + `tsc` sur chaque PR.
7. `front/Dockerfile` fait `npm install` alors qu'un lockfile existe ➜ `npm ci` pour des builds reproductibles.
8. `playwright` est une dépendance de **production** du front ➜ la passer en `devDependencies`.
9. `docker-compose.yml` force `NODE_ENV: development` et lance `strapi develop` alors que le même fichier sert nginx sur le port 80 ; le port PostgreSQL est exposé sur l'hôte. ➜ Séparer `compose.dev.yml` / `compose.prod.yml`.
10. `ensureRolePermissions` ne fait qu'**ajouter** des permissions : rétrograder une route dans `permissions.json` ne retire jamais le droit déjà accordé. ➜ Synchroniser (ajout + suppression).

### P3 — Maintenabilité & performance
11. Fichiers géants : `RightDrawer.vue` (2 000 lignes), `GuildsPage.vue`, `TripleTriadCard.vue`, `DeckEditorPage.vue`, `userStore.js` (1 300 lignes) ➜ extraire des composables et sous-composants.
12. Build mono-fichier (`vite-plugin-singlefile`) de **3,2 Mo** (1,2 Mo gzip) incluant Three.js, Chart.js et l'admin ➜ découpage de code (routes admin en lazy-load) si le mono-fichier n'est pas une contrainte.
13. ~90 `console.log` restants dans `front/src` ➜ un logger unique avec niveaux.
14. Scripts orphelins à la racine et dans `front/` (`convert_skills.{js,cjs}`, `get_stories.mjs`, `test_guilds.{js,cjs}`, `test_users_me.cjs`, `test_stories.js`, `playwright-test.cjs`) et 475 fichiers `old-cards` ➜ déplacer dans `scripts/` ou supprimer après vérification.

## 4. Vérifications effectuées
- `npm test` (front) : 8 fichiers / 45 tests Vitest ✅ + `rarity_logic_test` ✅ + `rules_logic_test` ✅
- Les nouveaux tests échouent sur `prod` (5/7) et passent sur la branche.
- `vite build` ✅
- `tsc --noEmit` (Strapi) : aucune nouvelle erreur (13 erreurs préexistantes identiques avant/après).
- `docker compose config -q` ✅ avec le `.env` actuel ; `bash -n` sur les scripts modifiés ✅.
- **Non vérifié** : partie réelle dans le navigateur, démarrage effectif des conteneurs, tests `test:api` (exigent Strapi lancé).
