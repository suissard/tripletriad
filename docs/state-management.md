# Gestion de l'État et Moteur de Jeu

Ce document explique comment l'application gère les données en temps réel et assure l'intégrité des règles.

## État Centralisé (`src/game/state.js`)

L'application utilise un objet réactif global (`state`) qui agit comme la "Source Unique de Vérité". Étant donné que cet objet est créé avec `reactive` de Vue 3, tout changement dans ses propriétés déclenche automatiquement une mise à jour de l'interface utilisateur.

### Principales Propriétés du State
- `board` : Un tableau fixe de **9 cases** (3x3) contenant `null` ou les objets `{ card, owner }`.
- `boardElements` : Tableau de 9 cases indiquant les éléments du plateau lorsque la règle `elements` est activée.
- `pHand` / `aiHand` : Les mains actuelles des joueurs.
- `turn` : L'identifiant du joueur dont c'est le tour (`player` ou `ai`).
- `rules` : Dictionnaire des règles actives (`same`, `plus`, `combo`, `elements`).
- `turnTimeSeconds` / `turnTimeRemaining` : Durée configurée d'un tour et temps restant.

## Le Moteur de Jeu (`shared/GameEngine.ts` via `src/game/GameEngine.js`)

Le `GameEngine` est défini de manière unique dans `shared/GameEngine.ts` (ré-exporté par `front/src/game/GameEngine.js` et importé par le backend Strapi) selon les principes de la **programmation fonctionnelle**.

### Fonctions Pures
Les méthodes du moteur sont `static` et ne modifient pas l'état existant (clone profond des cartes et plateaux). Elles prennent un état en entrée et renvoient un **nouvel état** (Immuabilité).

- `computeNextState(currentState, action)` : Prend l'état actuel et l'action (`PLACE_CARD` ou `PASS_TURN`), résout les compétences (`SkillRegistry` / `SkillEngine`), les captures (incluant `Teleportation`, `Elements`, `Same`, `Plus`, `Combo`, `Ward` et `Freeze`), puis les cartes mourantes (`processDyingCards`).
- `processCaptures(...)` : Calcule les captures adjacentes et chaînes Combo en tenant compte des modificateurs élémentaires et des protections.
- `computeWinner(board)` : Analyse le plateau final pour désigner le vainqueur.

## Gestionnaire de Tours (`src/game/TurnManager.js`)

Le `TurnManager` fait le pont entre le moteur de jeu et l'environnement (Local ou Réseau).

- **Mode Local** : Appelle le moteur unifié et met à jour `state.js`.
- **Mode En Ligne (P2P)** : 
    - Sérialise l'action du joueur.
    - L'envoie via WebRTC.
    - Reçoit l'action de l'adversaire.
    - Calcule un **Hash** de l'état pour vérifier que les deux joueurs voient la même chose. Si les hashs diffèrent, une **désynchronisation** est détectée et le serveur Strapi est appelé pour l'arbitrage.

## Arbitrage Serveur

En cas de conflit en multijoueur, le backend Strapi (`/api/match/arbitrate`) importe exactement la même implémentation `shared/GameEngine.ts` afin de rejouer l'historique d'actions (`logs`) de façon déterministe et trancher sur l'état légitime.
