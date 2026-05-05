// --- Logique Métier (Game Engine) ---
// Refactoré : utilise le SkillRegistry pour dispatcher les skills de cartes
// via des lifecycle hooks au lieu de blocs hardcodés.

import { skillRegistry } from '../../../shared/skills/index';
import { DIRECTIONS_4, COMBAT_DIRECTIONS } from '../../../shared/skills/helpers';

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
   * Construit un objet contexte pour les hooks de skills.
   * Tous les hooks reçoivent un ctx uniforme.
   */
  static buildContext(board, x, y, extras = {}) {
    const cell = board[y]?.[x];
    return {
      board,
      x, y,
      card: cell?.data || extras.card,
      owner: cell?.owner || extras.owner,
      cell,
      alerts: extras.alerts || [],
      captures: extras.captures || [],
      dyingCards: extras.dyingCards || [],
      attackQueue: extras.attackQueue || [],
      ...extras,
    };
  }

  /**
   * Fonction PURE.
   * Gère le placement d'une carte pour calculer le prochain état, calcule 
   * les captures "classiques" (valeur strictement supérieure), et retourne 
   * un nouvel objet d'état sans manipuler l'état précédent.
   */
  static computeNextState(currentState, action) {
    console.log(`[GameEngine] Action: ${action.type}`, action);
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

    // Faction counts BEFORE placement to delay bonus for the 4th card
    const factionCountsBefore = GameEngine.getFactionCounts(currentState.board);

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

    // 3. Dispatcher onEnterPlay pour les skills de la carte posée
    GameEngine.dispatchEnterPlay(nextState.board, x, y, placedCell);

    // 4. Calculer les captures (Règles "Classiques" d'adjacence)
    nextState.lastCaptures = GameEngine.processCaptures(nextState.board, x, y, placedCell, factionCountsBefore);

    // 5. Appliquer les effets de fin de tour (Growing, Decrease)
    GameEngine.dispatchEndOfTurn(nextState.board);

    // 6. Passer au joueur suivant
    nextState.currentPlayer = action.player === 'PLAYER_1' ? 'PLAYER_2' : 'PLAYER_1';

    // 7. Vérifier les conditions de fin de partie
    if (GameEngine.isBoardFull(nextState.board)) {
      nextState.isFinished = true;
      nextState.winner = GameEngine.computeWinner(nextState.board);
    }

    return nextState;
  }

  /**
   * Dispatche le hook onEnterPlay pour la carte qui vient d'être posée.
   * Remplace l'ancien applyPlacementSkills.
   */
  static dispatchEnterPlay(board, x, y, placedCell) {
    if (!placedCell.data.skills || placedCell.data.skills.length === 0) return;

    const ctx = GameEngine.buildContext(board, x, y);
    skillRegistry.dispatch('onEnterPlay', ctx);
  }

  /**
   * Dispatche le hook onEndOfTurn pour toutes les cartes sur le board.
   * Remplace l'ancien applyEndOfTurnSkills.
   */
  static dispatchEndOfTurn(board) {
    console.log("[GameEngine] dispatchEndOfTurn starting...");
    for (let y = 0; y < board.length; y++) {
      for (let x = 0; x < board[y].length; x++) {
        const cell = board[y][x];
        if (cell?.data?.skills && cell.data.skills.length > 0) {
          console.log(`[GameEngine] Card at (${x},${y}) has ${cell.data.skills.length} skills. Dispatching...`);
          const ctx = GameEngine.buildContext(board, x, y);
          skillRegistry.dispatch('onEndOfTurn', ctx);
        }
      }
    }
  }

  /**
   * Helper function to get effective card value considering Auras and Faction Bonuses.
   * L'aura est maintenant gérée via getValueModifier du SkillRegistry.
   */
  static getEffectiveValue(board, x, y, side, factionCountsOverride = null) {
    const cell = board[y][x];
    if (!cell || !cell.data) return 0;

    let valStr = cell.data.values && cell.data.values[side] !== undefined ? cell.data.values[side] : cell.data[side + 'Value'];
    let baseVal = valStr === 'A' || valStr === 'a' ? 100 : parseInt(valStr) || 0;

    // 1. Faction Bonus (+1 if at least 4 cards of the same faction are on board)
    let factionBonus = 0;
    if (cell.data.factionCode && cell.data.factionCode !== 'NEUTRAL') {
      const currentCounts = GameEngine.getFactionCounts(board);
      if (currentCounts[cell.data.factionCode] >= 4) {
        const hadBonusBefore = factionCountsOverride ? (factionCountsOverride[cell.data.factionCode] >= 4) : true;
        if (hadBonusBefore && baseVal < 100) {
          factionBonus = 1;
        }
      }
    }

    // 2. Skill-based value modifiers (remplace le hardcode aura)
    let skillBonus = 0;
    for (const dir of DIRECTIONS_4) {
      const nx = x + dir.dx;
      const ny = y + dir.dy;
      if (nx >= 0 && nx < board[0].length && ny >= 0 && ny < board.length) {
        const adj = board[ny][nx];
        // Les modificateurs s'appliquent depuis les alliés adjacents
        if (adj && adj.owner === cell.owner && adj.data?.skills) {
          const adjCtx = GameEngine.buildContext(board, nx, ny, {
            targetX: x, targetY: y, side
          });
          skillBonus += skillRegistry.dispatchSum('getValueModifier', adjCtx);
        }
      }
    }

    return baseVal + factionBonus + skillBonus;
  }

  /**
   * Returns a map of faction counts on the board
   */
  static getFactionCounts(board) {
    const counts = {};
    for (const row of board) {
      for (const cell of row) {
        if (cell && cell.data && cell.data.factionCode) {
          const code = cell.data.factionCode;
          counts[code] = (counts[code] || 0) + 1;
        }
      }
    }
    return counts;
  }

  /**
   * Logique de capture refactorée avec le SkillRegistry.
   * Les skills influencent le combat via des hooks au lieu de blocs hardcodés.
   */
  static processCaptures(board, x, y, placedCell, factionCountsOverride = null) {
    const player = placedCell.owner;
    const captures = [];
    const attackQueue = [{ x, y, cell: placedCell, isCombo: false }];
    const alerts = [];
    const dyingCards = [];

    while (attackQueue.length > 0) {
      const currentAttack = attackQueue.shift();
      const cx = currentAttack.x;
      const cy = currentAttack.y;
      const attackerCell = currentAttack.cell;

      // Ensure attacker is still on board
      if (board[cy][cx] !== attackerCell) continue;

      const sharedCtx = { alerts, captures, dyingCards, attackQueue };

      // ── Freeze check via hook ──
      // On vérifie si un voisin bloque le combo de l'attaquant
      let isFrozen = false;
      if (currentAttack.isCombo) {
        for (const dir of COMBAT_DIRECTIONS) {
          const fx = cx + dir.dx;
          const fy = cy + dir.dy;
          if (fx >= 0 && fx < board[0].length && fy >= 0 && fy < board.length) {
            const fAdj = board[fy][fx];
            if (fAdj?.data?.skills) {
              const adjCtx = GameEngine.buildContext(board, fx, fy, sharedCtx);
              if (skillRegistry.dispatchAny('blocksCombo', adjCtx)) {
                isFrozen = true;
                break;
              }
            }
          }
        }
        if (isFrozen) continue;
      }

      let triggeredCapture = false;

      // ── Skill queries sur l'attaquant ──
      const attackerCtx = GameEngine.buildContext(board, cx, cy, sharedCtx);
      const extendsRange = skillRegistry.dispatchAny('extendsAttackRange', attackerCtx);
      const hasCombo = skillRegistry.dispatchAny('hasCombo', attackerCtx);

      // ── Résolution d'attaque par direction ──
      for (const dir of COMBAT_DIRECTIONS) {
        let nx = cx + dir.dx;
        let ny = cy + dir.dy;
        let targetCell = null;
        let actualNx = nx;
        let actualNy = ny;

        // Résolution de la cible (sniper étend la portée via hook)
        while (nx >= 0 && nx < board[0].length && ny >= 0 && ny < board.length) {
          const cell = board[ny][nx];
          if (cell !== null) {
            targetCell = cell;
            actualNx = nx;
            actualNy = ny;
            break;
          }
          if (extendsRange) {
            if (nx !== cx + dir.dx || ny !== cy + dir.dy) alerts.push('SNIPER!');
            nx += dir.dx;
            ny += dir.dy;
          } else {
            break;
          }
        }

        if (targetCell && targetCell.owner !== attackerCell.owner) {
          const myValue = GameEngine.getEffectiveValue(board, cx, cy, dir.mySide, factionCountsOverride);
          const oppValue = GameEngine.getEffectiveValue(board, actualNx, actualNy, dir.oppSide, factionCountsOverride);

          if (myValue > oppValue) {
            triggeredCapture = true;

            // ── Hook: onBeforeCaptured (ward) ──
            const targetCtx = GameEngine.buildContext(board, actualNx, actualNy, {
              ...sharedCtx,
              attackerX: cx, attackerY: cy
            });
            const preventResults = skillRegistry.dispatch('onBeforeCaptured', targetCtx);
            const prevented = preventResults.some(r => r?.prevented);

            if (!prevented) {
              // Appliquer la capture
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

              // ── Hook: onCaptured (poison counter-attack, etc.) ──
              const capturedCtx = GameEngine.buildContext(board, actualNx, actualNy, {
                ...sharedCtx,
                attackerX: cx,
                attackerY: cy,
                card: targetCell.data,
                owner: targetCell.owner
              });
              skillRegistry.dispatch('onCaptured', capturedCtx);
            }
          }
        }
      }

      // ── Combo: si des captures ont eu lieu et l'attaquant a le combo ──
      if (triggeredCapture && hasCombo && board[cy][cx] !== null) {
        alerts.push('COMBO!');
        attackQueue.push({ x: cx, y: cy, cell: board[cy][cx], isCombo: true });
      }
    }

    // ── Traitement des cartes mortes (bomb, etc.) via hook onDestroyed ──
    while (dyingCards.length > 0) {
      const dying = dyingCards.shift();

      if (dying.cell.data?.skills) {
        const dyingCtx = GameEngine.buildContext(board, dying.x, dying.y, {
          alerts, captures, dyingCards,
          card: dying.cell.data,
          owner: dying.cell.owner
        });
        skillRegistry.dispatch('onDestroyed', dyingCtx);
      }
    }

    if (alerts.length > 0) captures.alerts = alerts;
    return captures;
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
   * Vérifie si toutes les cases de la grille sont occupées
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
      if (v?.toUpperCase() === 'A') return 100;
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

  /**
   * Rotates card values clockwise (direction > 0) or counter-clockwise (direction < 0).
   * Conservé pour rétro-compatibilité avec le code UI.
   */
  static rotateCardValues(cell, direction) {
    if (!cell || !cell.data) return;

    const rotate = (dir) => {
      const oldValues = {
        top: cell.data.topValue || (cell.data.values ? cell.data.values.top : '0'),
        right: cell.data.rightValue || (cell.data.values ? cell.data.values.right : '0'),
        bottom: cell.data.bottomValue || (cell.data.values ? cell.data.values.bottom : '0'),
        left: cell.data.leftValue || (cell.data.values ? cell.data.values.left : '0')
      };

      if (dir > 0) { // Clockwise (Right)
        cell.data.topValue = oldValues.left;
        cell.data.rightValue = oldValues.top;
        cell.data.bottomValue = oldValues.right;
        cell.data.leftValue = oldValues.bottom;
      } else { // Counter-Clockwise (Left)
        cell.data.topValue = oldValues.right;
        cell.data.rightValue = oldValues.bottom;
        cell.data.bottomValue = oldValues.left;
        cell.data.leftValue = oldValues.top;
      }

      // Sync complex values object if exists
      if (cell.data.values) {
        cell.data.values.top = cell.data.topValue;
        cell.data.values.right = cell.data.rightValue;
        cell.data.values.bottom = cell.data.bottomValue;
        cell.data.values.left = cell.data.leftValue;
      }
    };

    const steps = Math.abs(direction);
    for (let i = 0; i < steps; i++) {
       rotate(direction);
    }
  }
}
