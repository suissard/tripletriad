# Mécaniques du Jeu

Ce document détaille les règles et le fonctionnement interne des parties de Triple Triad.

## Plateau et Cartes

Le jeu se joue sur une grille de **3x3** (9 cases). Chaque joueur dispose d'une main de 5 cartes (ou moins selon le mode).

### Anatomie d'une Carte
Chaque carte possède 4 valeurs (Stats) placées sur les bords :
- **Haut (Top)**
- **Bas (Bottom)**
- **Gauche (Left)**
- **Droite (Right)**

Une valeur peut aller de **1 à 9**, ou **A** (représentant **100** en combat via `parseCombatSide`, et **10** pour le calcul de niveau/rareté via `parseLevelSide` et `getRarity`).

## La Capture Classique

Lorsqu'une carte est posée (ou téléportée avant capture via `Teleportation`, qui résout la capture depuis sa case d'arrivée), elle "attaque" les cartes adjacentes appartenant à l'adversaire. Une capture a lieu si la valeur du côté attaquant est **strictement supérieure** à la valeur du côté défenseur.

**Exemple :**
- Joueur A pose une carte avec `Right: 8`.
- L'adversaire a une carte adjacente à droite avec `Left: 5`.
- **8 > 5** → La carte adverse est capturée et change de couleur (devient la propriété du Joueur A).

## Règles Spéciales

Le jeu implémente plusieurs règles optionnelles activables via `src/game/rules.js`.

### 1. Same (Identique)
Une capture se déclenche si la carte posée possède **au moins deux côtes** dont les valeurs sont **identiques** aux valeurs adjacentes des cartes voisines (même si ces valeurs sont supérieures à celles de la carte posée).

### 2. Plus
Une capture se déclenche si la **somme** des valeurs sur au moins deux côtes adjacents est égale.
- Somme (Ma Carte Haut + Voisine Bas) == Somme (Ma Carte Droite + Voisine Gauche).

### 3. Combo
Toute carte capturée par une règle "Same" ou "Plus" devient elle-même une attaquante et peut capturer d'autres cartes adjacentes selon la règle de capture classique (sous réserve qu'une protection `Ward` n'absorbe pas la capture ou qu'un effet `Freeze` **ennemi** ne bloque pas la propagation). Cela peut créer des réactions en chaîne.

## Éléments (Système Avancé)
Lorsque la règle `elements` est active, certaines cases du plateau reçoivent un badge élémentaire (`boardElements`) :
- Si l'élément de la carte posée correspond à celui de la case, ses 4 valeurs de combat reçoivent un bonus de **+1**.
- Si la case porte un élément différent, elle subit un malus de **-1**.

## Timer de Tour & Passage de Tour
- Si `turnTimeSeconds` est configuré dans `GameConfig` (`> 0`), un compte à rebours s'affiche en partie ; à expiration, un coup automatique est joué pour le joueur actif.
- Le moteur prend également en charge l'action `PASS_TURN` pour céder le tour.

## Conditions de Victoire
La partie se termine quand les 9 cases sont remplies. Le vainqueur est celui qui contrôle le plus de cartes sur le plateau (souvent calculé comme : `Cartes sur le plateau + Carte restant en main`).
