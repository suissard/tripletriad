// --- Logique Métier (Game Engine) ---

export class GameEngine {
  /**
   * Retourne un état initial vierge (plateau vide).
   */
  static createInitialState(startingPlayer = 'PLAYER_1') {
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
  static computeNextState(currentState, action) {
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
    const nextState = {
      ...currentState,
      board: currentState.board.map(row => [...row])
    };

    // 2. Placer la carte
    const cellOwner = action.player;
    const placedCell = { data: card, owner: cellOwner };
    nextState.board[y][x] = placedCell;

    // 3. Calculer les captures (Règles "Classiques" d'adjacence)
    nextState.lastCaptures = GameEngine.processCaptures(nextState.board, x, y, placedCell);

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
  static processCaptures(board, x, y, placedCell) {
    const player = placedCell.owner;
    const captures = [];

    // Définitions des 4 directions cardinales et des bords d'attaque/défense
    // dx/dy: déplacements, mySide: mon bord de carte attaquant, oppSide: bord adverse visé
    const directions = [
      { dx: 0, dy: -1, mySide: 'top', oppSide: 'bottom' },     // Adjacent Haut
      { dx: 0, dy: 1, mySide: 'bottom', oppSide: 'top' },      // Adjacent Bas
      { dx: -1, dy: 0, mySide: 'left', oppSide: 'right' },     // Adjacent Gauche
      { dx: 1, dy: 0, mySide: 'right', oppSide: 'left' }       // Adjacent Droite
    ];

    for (const dir of directions) {
      const nx = x + dir.dx;
      const ny = y + dir.dy;

      // On vérifie que la case ciblée soit bien comprise dans la grille 3x3
      if (nx >= 0 && nx < 3 && ny >= 0 && ny < 3) {
        const adjacentCell = board[ny][nx];

        // On vérifie s'il y a une carte et qu'elle n'est pas déjà à nous
        if (adjacentCell && adjacentCell.owner !== player) {
          const myValue = placedCell.data.values[dir.mySide];
          const oppValue = adjacentCell.data.values[dir.oppSide];

          // Capture Classique : Ma valeur sur ce côté est-elle strictement supérieure à la valeur opposée adversaire ?
          if (myValue > oppValue) {
            // Capture réussie ! On remplace la carte adjacente par un clone au propriétaire mis à jour.
            board[ny][nx] = {
              data: adjacentCell.data,
              owner: player
            };
            captures.push(adjacentCell.data);
          }
        }
      }
    }
    
    return captures;
  }

  /**
   * Vérifie si toutes les cases de la grille 3x3 sont occupées
   */
  static isBoardFull(board) {
    return board.every(row => row.every(cell => cell !== null));
  }

  /**
   * Calcule le vainqueur en comptant qui contrôle le plus de cartes du plateau occupé à la fin
   */
  static computeWinner(board) {
    let p1Count = 0;
    let p2Count = 0;

    for (const row of board) {
      for (const cell of row) {
        if (cell?.owner === 'PLAYER_1') p1Count++;
        else if (cell?.owner === 'PLAYER_2') p2Count++;
      }
    }

    // Remarque: Dans un vrai module Triple Triad, on ajoute souvent la carte qui reste en main.
    // L'implémentation ici ne compte strictement que la domination des 9 cases finales posées.
    if (p1Count > p2Count) return 'PLAYER_1';
    if (p2Count > p1Count) return 'PLAYER_2';
    return 'DRAW';
  }

  /**
   * Calcule dynamiquement le niveau d'une carte à partir de la somme de ses valeurs.
   * On part du principe que 'A' vaut 10.
   */
  static calculateCardLevel(values) {
    const parse = (v) => {
      if (typeof v === 'number') return v;
      if (v?.toUpperCase() === 'A') return 10;
      return parseInt(v) || 0;
    };

    const sum = parse(values.top || values.topValue) + 
                parse(values.right || values.rightValue) + 
                parse(values.bottom || values.bottomValue) + 
                parse(values.left || values.leftValue);

    if (sum >= 39) return 10;
    if (sum >= 36) return 9;
    if (sum >= 32) return 8;
    if (sum >= 28) return 7;
    if (sum >= 24) return 6;
    if (sum >= 20) return 5;
    if (sum >= 16) return 4;
    if (sum >= 12) return 3;
    if (sum >= 8) return 2;
    return 1;
  }
}
