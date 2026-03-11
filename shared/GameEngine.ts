// --- Interfaces des Données ---

export type Player = 'PLAYER_1' | 'PLAYER_2';

/**
 * Valeurs d'une carte pour chaque côté. 
 * Traditionnellement dans le Terra Nullius : 1 à 10 (A représentant 10).
 */
export interface CardValues {
  top: number;
  bottom: number;
  left: number;
  right: number;
}

export interface Card {
  id: string; // Identifiant unique
  values: CardValues;
  owner?: Player; // Détermine à qui appartient la carte sur le plateau
}

// Une case de la grille contient une carte ou est vide
export type BoardCell = Card | null;

/**
 * L'état global de la partie à un instant T.
 */
export interface GameState {
  // Grille 3x3 représentée sous forme de tableau 2D : board[y][x]
  board: BoardCell[][];
  currentPlayer: Player;
  isFinished: boolean;
  winner: Player | 'DRAW' | null;
}

/**
 * Action représentant le placement d'une carte par un joueur
 */
export interface PlaceCardAction {
  type: 'PLACE_CARD';
  card: Card;    // La carte jouée (provenant de la main du joueur)
  x: number;     // Colonne de destination (0 à 2)
  y: number;     // Ligne de destination (0 à 2)
  player: Player; // Joueur effectuant l'action
}

// --- Logique Métier (Game Engine) ---

export class GameEngine {
  /**
   * Retourne un état initial vierge (plateau vide).
   */
  public static createInitialState(startingPlayer: Player = 'PLAYER_1'): GameState {
    return {
      board: [
        [null, null, null],
        [null, null, null],
        [null, null, null]
      ],
      currentPlayer: startingPlayer,
      isFinished: false,
      winner: null
    };
  }

  /**
   * Fonction PURE.
   * Gère le placement d'une carte pour calculer le prochain état, calcule 
   * les captures "classiques" (valeur strictement supérieure), et retourne 
   * un nouvel objet d'état sans manipuler l'état précédent.
   */
  public static computeNextState(currentState: GameState, action: PlaceCardAction): GameState {
    if (currentState.isFinished) {
      return currentState; // La partie est terminée, l'état n'évolue plus
    }

    if (action.player !== currentState.currentPlayer) {
      throw new Error(`Tour invalide : C'est au tour de ${currentState.currentPlayer}.`);
    }

    const { x, y, card } = action;

    // Vérification des bords de la grille
    if (x < 0 || x > 2 || y < 0 || y > 2) {
      throw new Error("Placement en dehors de la grille (doit être entre 0 et 2).");
    }

    // Vérification de placement sur une case libre
    if (currentState.board[y][x] !== null) {
      throw new Error("Mouvement invalide : Cette case est déjà occupée.");
    }

    // 1. Clonage profond du plateau pour assurer l'immuabilité (pureté)
    const nextState: GameState = {
      ...currentState,
      board: currentState.board.map(row => [...row])
    };

    // 2. Placer la carte
    const placedCard: Card = { ...card, owner: action.player };
    nextState.board[y][x] = placedCard;

    // 3. Calculer les captures (Règles "Classiques" d'adjacence)
    GameEngine.processCaptures(nextState.board, x, y, placedCard);

    // 4. Passer au joueur suivant
    nextState.currentPlayer = action.player === 'PLAYER_1' ? 'PLAYER_2' : 'PLAYER_1';

    // 5. Vérifier les conditions de fin de partie
    if (GameEngine.isBoardFull(nextState.board)) {
      nextState.isFinished = true;
      nextState.winner = GameEngine.computeWinner(nextState.board);
    }

    return nextState;
  }

  /**
   * Logique privée de capture. Altière seulement le "board" cloné du nouvel état.
   */
  private static processCaptures(board: BoardCell[][], x: number, y: number, placedCard: Card): void {
    const player = placedCard.owner!;

    // Définitions des 4 directions cardinales et des bords d'attaque/défense
    // dx/dy: déplacements, mySide: mon bord de carte attaquant, oppSide: bord adverse visé
    const directions = [
      { dx: 0, dy: -1, mySide: 'top', oppSide: 'bottom' },     // Adjacent Haut
      { dx: 0, dy: 1, mySide: 'bottom', oppSide: 'top' },      // Adjacent Bas
      { dx: -1, dy: 0, mySide: 'left', oppSide: 'right' },     // Adjacent Gauche
      { dx: 1, dy: 0, mySide: 'right', oppSide: 'left' }       // Adjacent Droite
    ] as const;

    for (const dir of directions) {
      const nx = x + dir.dx;
      const ny = y + dir.dy;

      // On vérifie que la case ciblée soit bien comprise dans la grille 3x3
      if (nx >= 0 && nx < 3 && ny >= 0 && ny < 3) {
        const adjacentCard = board[ny][nx];

        // On vérifie s'il y a une carte et qu'elle n'est pas déjà à nous
        if (adjacentCard && adjacentCard.owner !== player) {
          const myValue = placedCard.values[dir.mySide];
          const oppValue = adjacentCard.values[dir.oppSide];

          // Capture Classique : Ma valeur sur ce côté est-elle strictement supérieure à la valeur opposée adversaire ?
          if (myValue > oppValue) {
            // Capture réussie ! On remplace la carte adjacente par un clone au propriétaire mis à jour.
            board[ny][nx] = {
              ...adjacentCard,
              owner: player
            };
          }
        }
      }
    }
  }

  /**
   * Vérifie si toutes les cases de la grille 3x3 sont occupées
   */
  private static isBoardFull(board: BoardCell[][]): boolean {
    return board.every(row => row.every(cell => cell !== null));
  }

  /**
   * Calcule le vainqueur en comptant qui contrôle le plus de cartes du plateau occupé à la fin
   */
  private static computeWinner(board: BoardCell[][]): Player | 'DRAW' {
    let p1Count = 0;
    let p2Count = 0;

    for (const row of board) {
      for (const cell of row) {
        if (cell?.owner === 'PLAYER_1') p1Count++;
        else if (cell?.owner === 'PLAYER_2') p2Count++;
      }
    }

    // Remarque: Dans un vrai module Terra Nullius, on ajoute souvent la carte qui reste en main.
    // L'implémentation ici ne compte strictement que la domination des 9 cases finales posées.
    if (p1Count > p2Count) return 'PLAYER_1';
    if (p2Count > p1Count) return 'PLAYER_2';
    return 'DRAW';
  }
}
