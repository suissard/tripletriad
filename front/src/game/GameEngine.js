// --- Logique Métier (Game Engine) ---

export class GameEngine {
  /**
   * Retourne un état initial vierge (plateau vide).
   */
  static createInitialState(startingPlayer = 'PLAYER_1') {
    return {
      board: [
        [null, null, null, null],
        [null, null, null, null],
        [null, null, null, null],
        [null, null, null, null]
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
    if (x < 0 || x > 3 || y < 0 || y > 3) {
      throw new Error("Placement en dehors de la grille (doit être entre 0 et 3).");
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
    const placedCell = {
      data: {
        ...card,
        hp: card.hp !== undefined ? card.hp : (card.defaultHp || 3),
        skills: card.skills || []
      },
      owner: cellOwner
    };
    nextState.board[y][x] = placedCell;

    // Appliquer Heal et Death au placement
    GameEngine.applyPlacementSkills(nextState.board, x, y, placedCell);

    // 3. Calculer les captures (Règles "Classiques" d'adjacence)
    nextState.lastCaptures = GameEngine.processCaptures(nextState.board, x, y, placedCell);

    // 4. Appliquer les effets de fin de tour (Growing, Decrease)
    GameEngine.applyEndOfTurnSkills(nextState.board);

    // 4. Passer au joueur suivant
    nextState.currentPlayer = action.player === 'PLAYER_1' ? 'PLAYER_2' : 'PLAYER_1';

    // Expand board if a row or column is full
    // GameEngine.expandBoard2D(nextState.board);

    // 5. Vérifier les conditions de fin de partie (remplacé par désactivé ici car géré par le deck localement)
    if (GameEngine.isBoardFull(nextState.board)) {
      // In dynamic size, the board is technically never full
      // Keeping backward compatibility logic just in case
      nextState.isFinished = true;
      nextState.winner = GameEngine.computeWinner(nextState.board);
    }

    return nextState;
  }

  /**
   * Logique privée de capture. Altière seulement le "board" cloné du nouvel état.
   */



  /**
   * Helper function to get effective card value considering Auras
   */
  static getEffectiveValue(board, x, y, side) {
    const cell = board[y][x];
    if (!cell || !cell.data) return 0;

    let valStr = cell.data.values && cell.data.values[side] !== undefined ? cell.data.values[side] : cell.data[side + 'Value'];
    let baseVal = valStr === 'A' || valStr === 'a' ? 10 : parseInt(valStr) || 0;

    let auraBonus = 0;
    const directions = [
      { dx: 0, dy: -1 },
      { dx: 0, dy: 1 },
      { dx: -1, dy: 0 },
      { dx: 1, dy: 0 }
    ];

    for (const dir of directions) {
      const nx = x + dir.dx;
      const ny = y + dir.dy;
      if (nx >= 0 && nx < board[0].length && ny >= 0 && ny < board.length) {
        const adj = board[ny][nx];
        // Aura applies to allies
        if (adj && adj.owner === cell.owner && adj.data && adj.data.skills) {
          const auraSkill = adj.data.skills.find(s => s.type === 'aura');
          if (auraSkill) {
            auraBonus += auraSkill.value;
          }
        }
      }
    }

    return Math.min(10, baseVal + auraBonus); // Cap at 10
  }

  static processCaptures(board, x, y, placedCell) {
    const player = placedCell.owner;
    const captures = [];
    const attackQueue = [{ x, y, cell: placedCell, isCombo: false }];
    const alerts = [];
    const dyingCards = [];

    const directions = [
      { dx: 0, dy: -1, mySide: 'top', oppSide: 'bottom' },
      { dx: 0, dy: 1, mySide: 'bottom', oppSide: 'top' },
      { dx: -1, dy: 0, mySide: 'left', oppSide: 'right' },
      { dx: 1, dy: 0, mySide: 'right', oppSide: 'left' }
    ];

    while (attackQueue.length > 0) {
      const currentAttack = attackQueue.shift();
      const cx = currentAttack.x;
      const cy = currentAttack.y;
      const attackerCell = currentAttack.cell;

      // Ensure attacker is still on board
      if (board[cy][cx] !== attackerCell) continue;

      let isFrozen = false;
      for (const dir of directions) {
        const fx = cx + dir.dx;
        const fy = cy + dir.dy;
        if (fx >= 0 && fx < board[0].length && fy >= 0 && fy < board.length) {
          const fAdj = board[fy][fx];
          if (fAdj && fAdj.data.skills && fAdj.data.skills.some(s => s.type === 'freeze')) {
            alerts.push("FREEZE!"); isFrozen = true;
            break;
          }
        }
      }

      if (currentAttack.isCombo && isFrozen) continue;

      let triggeredCapture = false;
      const hasCombo = attackerCell.data.skills && attackerCell.data.skills.some(s => s.type === 'combo');
      const hasSniper = attackerCell.data.skills && attackerCell.data.skills.some(s => s.type === 'sniper');

      for (const dir of directions) {
        let nx = cx + dir.dx;
        let ny = cy + dir.dy;
        let targetCell = null;
        let actualNx = nx;
        let actualNy = ny;

        while (nx >= 0 && nx < board[0].length && ny >= 0 && ny < board.length) {
          const cell = board[ny][nx];
          if (cell !== null) {
            targetCell = cell;
            actualNx = nx;
            actualNy = ny;
            break;
          }
          if (hasSniper) {
             if (nx !== cx + dir.dx || ny !== cy + dir.dy) alerts.push("SNIPER!");
             nx += dir.dx;
             ny += dir.dy;
          } else {
             break;
          }
        }

        if (targetCell && targetCell.owner !== attackerCell.owner) {
          const myValue = GameEngine.getEffectiveValue(board, cx, cy, dir.mySide);
          const oppValue = GameEngine.getEffectiveValue(board, actualNx, actualNy, dir.oppSide);

          if (myValue > oppValue) {
            triggeredCapture = true;
            let hasWard = targetCell.data.skills && targetCell.data.skills.some(s => s.type === 'ward');

            if (hasWard) {
              alerts.push("WARD!"); targetCell.data.skills = targetCell.data.skills.filter(s => s.type !== 'ward');
              captures.push({ ...targetCell.data, event: 'ward_triggered', wardedTarget: targetCell.data.id });
            } else {
              let hpLoss = 1;
              let targetHp = (targetCell.data.hp !== undefined ? targetCell.data.hp : (targetCell.data.defaultHp || 3)) - hpLoss;

              if (targetHp <= 0) {
                dyingCards.push({ x: actualNx, y: actualNy, cell: targetCell });
                board[actualNy][actualNx] = null;
                captures.push({ ...targetCell.data, dead: true, event: 'captured_dead' });
              } else {
                board[actualNy][actualNx] = {
                  data: { ...targetCell.data, hp: targetHp },
                  owner: attackerCell.owner
                };
                captures.push({ ...board[actualNy][actualNx].data, event: 'captured_survived' });
              }
            }

            // Target Poison check
            const poisonSkill = targetCell.data.skills ? targetCell.data.skills.find(s => s.type === 'poison') : null;
            if (poisonSkill) {
               alerts.push("POISON!");
               let attackerHasWard = attackerCell.data.skills && attackerCell.data.skills.some(s => s.type === 'ward');
               if (attackerHasWard) {
                 alerts.push("WARD!"); attackerCell.data.skills = attackerCell.data.skills.filter(s => s.type !== 'ward');
                 captures.push({ ...attackerCell.data, event: 'ward_triggered_poison' });
               } else {
                 let attackerHp = (attackerCell.data.hp !== undefined ? attackerCell.data.hp : (attackerCell.data.defaultHp || 3)) - poisonSkill.value;
                 attackerCell.data.hp = attackerHp;
                 if (attackerHp <= 0) {
                    dyingCards.push({ x: cx, y: cy, cell: attackerCell });
                    board[cy][cx] = null;
                    captures.push({ ...attackerCell.data, dead: true, event: 'poison_death' });
                 } else {
                    captures.push({ ...attackerCell.data, event: 'poison_damage' });
                 }
               }
            }
          }
        }
      }

      if (triggeredCapture && hasCombo && board[cy][cx] !== null) {
         alerts.push("COMBO!"); attackQueue.push({ x: cx, y: cy, cell: board[cy][cx], isCombo: true });
      }
    }

    while (dyingCards.length > 0) {
        const dying = dyingCards.shift();
        const bombSkill = dying.cell.data.skills ? dying.cell.data.skills.find(s => s.type === 'bomb') : null;

        if (bombSkill) {
           alerts.push("BOMB!");
           for (const dir of directions) {
              const nx = dying.x + dir.dx;
              const ny = dying.y + dir.dy;
              if (nx >= 0 && nx < board[0].length && ny >= 0 && ny < board.length) {
                 const adj = board[ny][nx];
                 if (adj) {
                    let adjHasWard = adj.data.skills && adj.data.skills.some(s => s.type === 'ward');
                    if (adjHasWard) {
                        alerts.push("WARD!"); adj.data.skills = adj.data.skills.filter(s => s.type !== 'ward');
                        captures.push({ ...adj.data, event: 'ward_triggered_bomb' });
                    } else {
                        let adjHp = (adj.data.hp !== undefined ? adj.data.hp : (adj.data.defaultHp || 3)) - bombSkill.value;
                        if (adjHp <= 0) {
                           dyingCards.push({ x: nx, y: ny, cell: adj });
                           board[ny][nx] = null;
                           captures.push({ ...adj.data, dead: true, event: 'bomb_death' });
                        } else {
                           adj.data.hp = adjHp;
                           board[ny][nx] = { data: adj.data, owner: adj.owner };
                           captures.push({ ...adj.data, event: 'bomb_damage' });
                        }
                    }
                 }
              }
           }
        }
    }

    if (alerts.length > 0) captures.alerts = alerts;
    return captures;
  }


  static applyPlacementSkills(board, x, y, placedCell) {
    if (!placedCell.data.skills) return;

    const directions = [
      { dx: 0, dy: -1 }, // Haut
      { dx: 0, dy: 1 },  // Bas
      { dx: -1, dy: 0 }, // Gauche
      { dx: 1, dy: 0 }   // Droite
    ];

    placedCell.data.skills.forEach(skill => {
      if (skill.type === 'heal' || skill.type === 'death') {
        for (const dir of directions) {
          const nx = x + dir.dx;
          const ny = y + dir.dy;

          if (nx >= 0 && nx < board[0].length && ny >= 0 && ny < board.length) {
            const adjacentCell = board[ny][nx];
            if (adjacentCell) {
              let hp = adjacentCell.data.hp !== undefined ? adjacentCell.data.hp : (adjacentCell.data.defaultHp || 3);

              if (skill.type === 'heal') {
                hp += skill.value;
              } else if (skill.type === 'death') {
                hp -= skill.value;
              }

              if (hp <= 0) {
                board[ny][nx] = null;
              } else {
                adjacentCell.data = { ...adjacentCell.data, hp: hp };
              }
            }
          }
        }
      }
    });
  }

  /**
   * Applique les compétences de fin de tour (Growing, Decrease)
   */
  static applyEndOfTurnSkills(board) {
    for (let y = 0; y < board.length; y++) {
      for (let x = 0; x < board[y].length; x++) {
        const cell = board[y][x];
        if (cell && cell.data && cell.data.skills) {
          cell.data.skills.forEach(skill => {
            if (skill.type === 'growing' || skill.type === 'decrease') {
              let targets = ['all'];
              if (skill.target) {
                targets = [skill.target.toLowerCase()];
              }
              const sides = ['top', 'right', 'bottom', 'left'];

              sides.forEach(side => {
                if (targets.includes('all') || targets.includes(side)) {
                  let valStr = cell.data.values && cell.data.values[side] !== undefined ? cell.data.values[side] : cell.data[side + 'Value'];
                  let val = valStr === 'A' || valStr === 'a' ? 10 : parseInt(valStr) || 0;

                  if (skill.type === 'growing') {
                    val += skill.value;
                  } else if (skill.type === 'decrease') {
                    val -= skill.value;
                  }

                  // Limites : 0 min, 10 max
                  val = Math.max(0, Math.min(10, val));

                  // Conversion inverse
                  valStr = val === 10 ? 'A' : val.toString();

                  if (cell.data.values) {
                    cell.data.values[side] = valStr;
                  }
                  cell.data[side + 'Value'] = valStr;
                }
              });
            }
          });
        }
      }
    }
  }

  /**
   * Expansion PURE d'un board 2D
   */
  static expandBoard2D(board) {
    const anyRowFull = board.some(row => row.every(cell => cell !== null));
    const anyColFull = board[0].map((_, colIdx) => board.every(row => row[colIdx] !== null)).some(full => full);

    if (anyRowFull) {
      board.forEach(row => {
        row.unshift(null);
        row.push(null);
      });
    }

    if (anyColFull) {
      const width = board[0].length;
      board.unshift(Array(width).fill(null));
      board.push(Array(width).fill(null));
    }
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
