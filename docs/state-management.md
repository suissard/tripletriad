# Gestion de l'État et Moteur de Jeu

Ce document explique comment l'application gère les données en temps réel et assure l'intégrité des règles.

## État Centralisé (`src/game/state.js`)

L'application utilise un objet réactif global (`state`) qui agit comme la "Source Unique de Vérité". Étant donné que cet objet est créé avec `reactive` de Vue 3, tout changement dans ses propriétés déclenche automatiquement une mise à jour de l'interface utilisateur.

### Principales Propriétés du State
- `board` : Un tableau de 9 cases contenant les objets `{ data, owner }`.
- `pHand` / `aiHand` : Les mains actuelles des joueurs.
- `turn` : L'identifiant du joueur dont c'est le tour (`player` ou `ai`).
- `rules` : Un dictionnaire des règles actives pour la partie en cours.

## Le Moteur de Jeu (`src/game/GameEngine.js`)

Le `GameEngine` est conçu selon les principes de la **programmation fonctionnelle**.

### Fonctions Pures
La plupart des fonctions du moteur sont `static` et ne modifient pas l'état existant. Elles prennent un état en entrée et renvoient un **nouvel état** (Immuabilité).

- `computeNextState(currentState, action)` : Prend l'état actuel et le mouvement d'un joueur, puis renvoie l'état résultant après placement et captures.
- `processCaptures(board, x, y, placedCell)` : Calcule les captures adjacentes.
- `computeWinner(board)` : Analyse le plateau final pour désigner le vainqueur.

## Gestionnaire de Tours (`src/game/TurnManager.js`)

Le `TurnManager` fait le pont entre le moteur de jeu et l'environnement (Local ou Réseau).

- **Mode Local** : Appelle simplement le moteur et met à jour le `state.js`.
- **Mode En Ligne (P2P)** : 
    - Sérialise l'action du joueur.
    - L'envoie via WebRTC.
    - Reçoit l'action de l'adversaire.
    - Calcule un **Hash** de l'état pour vérifier que les deux joueurs voient la même chose. Si les hashs diffèrent, une **désynchronisation** est détectée et le serveur Strapi est appelé pour l'arbitrage.

## Arbitrage Serveur

En cas de conflit en multijoueur, le backend Strapi (`arbitrate`) possède une version identique du `GameEngine` (en JavaScript/TypeScript). Il peut rejouer toute la liste des actions (`actionLog`) pour déterminer l'état légitime et forcer la synchronisation des clients.
