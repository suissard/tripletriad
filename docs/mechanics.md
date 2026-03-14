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

Une valeur peut aller de **1 à 9**, ou **A** (représentant 10).

## La Capture Classique

Lorsqu'une carte est posée, elle "attaque" les cartes adjacentes appartenant à l'adversaire. Une capture a lieu si la valeur du côté attaquant est **strictement supérieure** à la valeur du côté défenseur.

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
Toute carte capturée par une règle "Same" ou "Plus" devient elle-même une attaquante et peut capturer d'autres cartes adjacentes selon la règle de capture classique. Cela peut créer des réactions en chaîne.

## Éléments (Système Avancé)
Certaines cartes possèdent des attributs élémentaires (Feu, Eau, Radiation, Hacking, etc.). 
- Si une carte est posée sur une case du plateau possédant le même symbole élémentaire, ses stats reçoivent un bonus.
- Si l'élément est différent, elle subit un malus.

## Conditions de Victoire
La partie se termine quand les 9 cases sont remplies. Le vainqueur est celui qui contrôle le plus de cartes sur le plateau (souvent calculé comme : `Cartes sur le plateau + Carte restant en main`).
