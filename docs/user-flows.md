# Flux Utilisateur et Processus Arrière-Plan

Ce document détaille les étapes invisibles qui se produisent lors des actions de l'utilisateur.

## 1. Ouverture d'un Booster

Lorsqu'un utilisateur clique sur "Acheter un Pack" dans la Boutique (`PackOpening.vue`) :

### Action Utilisateur
Cliquer sur le bouton d'achat d'un pack (Classique ou Premium).

### Étapes en Arrière-Plan
1. **Vérification du Solde** : Le frontend vérifie localement si l'utilisateur a assez de monnaie (Coins/Gems).
2. **Requête API** : Une requête POST est envoyée à `/api/booster/open`.
3. **Logique Serveur (Strapi)** :
    - Déduction des fonds dans la base de données.
    - Génération aléatoire de 5 cartes basée sur des tables de probabilités (Rareté : Commun, Rare, Épique, Légendaire).
    - Ajout automatique des cartes à la collection de l'utilisateur (`user-cards`).
4. **Réponse et Animation** : Le serveur renvoie la liste des cartes générées. Le frontend déclenche l'animation d'ouverture et met à jour le Store utilisateur (`userStore.js`).

---

## 2. Le Lancement de la Pièce (Coin Toss)

Au début d'un match (`CoinToss.vue`) :

### Action Utilisateur
Lancer une partie.

### Étapes en Arrière-Plan
1. **Détermination du Premier Joueur** :
    - En mode IA : Un `Math.random()` simple détermine si c'est 'player' ou 'ai'.
    - En mode Multi : L'hôte génère le résultat et le transmet via WebRTC.
2. **Animation de la pièce** : Le composant reçoit le résultat (`props.result`) et joue l'animation CSS 3D correspondante (`toss-player` ou `toss-ai`).
3. **Initialisation du tour** : Une fois l'animation terminée, l'événement `finished` est émis, mettant à jour `state.turn`.

---

## 3. Placer une Carte sur le Plateau

### Action Utilisateur
L'utilisateur sélectionne une carte de sa main et clique sur une case vide du plateau.

### Étapes en Arrière-Plan
1. **Validation du Mouvement** : Le `GameEngine.js` vérifie si la case est libre et si c'est bien le tour du joueur.
2. **Calcul des Captures** :
    - Le moteur parcourt les 4 directions adjacentes.
    - Il compare les valeurs (Capture Classique).
    - Il vérifie les règles spéciales (Same, Plus).
3. **Mise à jour de l'État** :
    - Un nouvel état du plateau est généré.
    - Si c'est une partie en ligne, l'action est envoyée via WebRTC au `TurnManager`.
4. **Réaction en Chaîne (Combo)** : Si des cartes ont été capturées via "Same" ou "Plus", elles re-calculent leurs propres captures sur leurs voisins.
5. **Changement de Tour** : `state.turn` bascule vers l'adversaire.

---

## 4. Fin de Match et Récompenses

### Action Utilisateur
Poser la dernière carte (9ème case).

### Étapes en Arrière-Plan
1. **Détection du Plateau Plein** : `GameEngine.isBoardFull()` renvoie `true`.
2. **Calcul du Vainqueur** : Le moteur compte les cartes possédées par chaque ID joueur sur le plateau.
3. **Enregistrement des Résultats** :
    - Le frontend envoie le résultat du match à Strapi (`/api/game-history`).
    - Si l'utilisateur gagne, des récompenses (Coins/XP) peuvent être créditées via une logique serveur sécurisée.
