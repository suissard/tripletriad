import { skillRegistry } from './skills/index';
import { COMBAT_DIRECTIONS } from './skills/helpers.js';

export type Player = 'PLAYER_1' | 'PLAYER_2';
export type FactionCode = 'TERRAN' | 'REBEL' | 'CORPO' | 'NEUTRAL' | 'FERRAILLEUR' | 'EXIL' | string;
export type ElementType = 'feu' | 'eau' | 'terre' | 'air' | 'foudre' | 'glace' | 'radiation' | 'hacking' | 'obsidian' | 'void' | 'none' | string | null;

export interface CardValues {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

export interface GameRules {
  same?: boolean;
  plus?: boolean;
  combo?: boolean;
  elements?: boolean;
}

export interface Card {
  id: string | number;
  name?: string;
  values?: CardValues;
  top?: number | string;
  right?: number | string;
  bottom?: number | string;
  left?: number | string;
  topValue?: number | string;
  rightValue?: number | string;
  bottomValue?: number | string;
  leftValue?: number | string;
  faction?: FactionCode | { code?: string };
  factionCode?: FactionCode;
  element?: ElementType;
  skills?: any[];
  skillId?: string;
  hp?: number;
  defaultHp?: number;
  [key: string]: any;
}

export interface BoardCell {
  data: Card;
  owner: Player;
}

export interface GameState {
  board: (BoardCell | null)[][];
  boardElements?: (string | null)[][] | null;
  rules: GameRules;
  currentPlayer: Player;
  turnCount: number;
  isFinished: boolean;
  winner: Player | 'DRAW' | null;
  lastCaptures?: any[];
  lastAlerts?: string[];
}

export interface PlaceCardAction {
  type?: 'PLACE_CARD';
  player: Player;
  x: number;
  y: number;
  card: Partial<Card> & Record<string, any>;
  targets?: any[];
}

export interface PassTurnAction {
  type: 'PASS_TURN';
  player: Player;
}

export type GameAction = PlaceCardAction | PassTurnAction;

const DEFAULT_RULES: Required<GameRules> = {
  same: false,
  plus: false,
  combo: true,
  elements: false
};

export class GameEngine {
  public static readonly GRID_SIZE = 3;

  /**
   * Parses a side value for combat ('A' / 100 = 100).
   */
  public static parseCombatSide(val: unknown): number {
    if (val === 'A' || val === 'a' || val === 100 || val === '100') return 100;
    const parsed = parseInt(String(val ?? 0), 10);
    return Number.isNaN(parsed) ? 0 : parsed;
  }

  /**
   * Parses a side value for rarity/level calculation ('A' / 100 / 10 = 10).
   */
  public static parseLevelSide(val: unknown): number {
    if (val === 'A' || val === 'a' || val === 100 || val === '100' || val === 10 || val === '10') return 10;
    const parsed = parseInt(String(val ?? 0), 10);
    if (Number.isNaN(parsed)) return 0;
    return Math.max(0, Math.min(10, parsed));
  }

  public static formatSideValue(val: unknown): string {
    const num = GameEngine.parseCombatSide(val);
    return num >= 100 ? 'A' : String(num);
  }

  public static generateDeterministicRandom(player1Id: string, player2Id: string, matchId: string): number {
    const seed = `${String(player1Id)}:${String(player2Id)}:${String(matchId)}`;
    let h = 2166136261;
    for (let i = 0; i < seed.length; i++) {
      h ^= seed.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return (h >>> 0) / 4294967296;
  }

  private static deepCloneSkills(skills: any): any[] {
    if (!Array.isArray(skills)) return [];
    return skills.map((s) => ({
      ...s,
      patterns: Array.isArray(s?.patterns)
        ? s.patterns.map((p: any) => (p && typeof p === 'object' ? { ...p } : p))
        : s?.patterns
    }));
  }

  public static normalizeCard(rawCard: Partial<Card> & Record<string, any>): Card {
    const rawTop = rawCard.values?.top ?? rawCard.topValue ?? rawCard.top ?? 0;
    const rawRight = rawCard.values?.right ?? rawCard.rightValue ?? rawCard.right ?? 0;
    const rawBottom = rawCard.values?.bottom ?? rawCard.bottomValue ?? rawCard.bottom ?? 0;
    const rawLeft = rawCard.values?.left ?? rawCard.leftValue ?? rawCard.left ?? 0;

    const top = GameEngine.parseCombatSide(rawTop);
    const right = GameEngine.parseCombatSide(rawRight);
    const bottom = GameEngine.parseCombatSide(rawBottom);
    const left = GameEngine.parseCombatSide(rawLeft);

    const factionCode =
      rawCard.factionCode ||
      (typeof rawCard.faction === 'string' ? rawCard.faction : rawCard.faction?.code) ||
      'NEUTRAL';

    const skills = GameEngine.deepCloneSkills(rawCard.skills);
    if (rawCard.skillId && !skills.some((s) => s.type === rawCard.skillId)) {
      skills.push({ type: rawCard.skillId });
    }

    const defaultHp = rawCard.defaultHp ?? 3;
    return {
      ...rawCard,
      id: rawCard.id ?? 'card',
      top,
      right,
      bottom,
      left,
      topValue: GameEngine.formatSideValue(rawTop),
      rightValue: GameEngine.formatSideValue(rawRight),
      bottomValue: GameEngine.formatSideValue(rawBottom),
      leftValue: GameEngine.formatSideValue(rawLeft),
      values: { top, right, bottom, left },
      factionCode,
      element: rawCard.element ?? null,
      defaultHp,
      hp: rawCard.hp !== undefined ? rawCard.hp : defaultHp,
      skills
    };
  }

  public static cloneCell(cell: BoardCell | null): BoardCell | null {
    if (!cell) return null;
    if ((cell as any).data) {
      return {
        ...cell,
        data: GameEngine.normalizeCard(cell.data)
      };
    }
    // Backwards-compat if raw card object is in board cell
    return {
      data: GameEngine.normalizeCard(cell as any),
      owner: (cell as any).owner || 'PLAYER_1'
    };
  }

  public static createInitialState(
    startingPlayer: Player = 'PLAYER_1',
    options: { rules?: GameRules; boardElements?: (string | null)[][] | null; width?: number; height?: number } = {}
  ): GameState {
    const width = options.width ?? GameEngine.GRID_SIZE;
    const height = options.height ?? GameEngine.GRID_SIZE;
    const board: (BoardCell | null)[][] = Array.from({ length: height }, () => Array(width).fill(null));
    const boardElements = Array.isArray(options.boardElements)
      ? options.boardElements.map((row) => [...row])
      : null;

    return {
      board,
      boardElements,
      rules: { ...DEFAULT_RULES, ...(options.rules || {}) },
      currentPlayer: startingPlayer,
      turnCount: 0,
      isFinished: false,
      winner: null,
      lastCaptures: [],
      lastAlerts: []
    };
  }

  public static computeNextState(currentState: GameState, action: GameAction): GameState {
    if (!currentState || currentState.isFinished) {
      return currentState;
    }

    const nextBoard: (BoardCell | null)[][] = currentState.board.map((row) =>
      row.map((cell) => GameEngine.cloneCell(cell))
    );
    const boardElements = Array.isArray(currentState.boardElements)
      ? currentState.boardElements.map((row) => [...row])
      : null;
    const rules: Required<GameRules> = { ...DEFAULT_RULES, ...(currentState.rules || {}) };

    const nextState: GameState = {
      ...currentState,
      board: nextBoard,
      boardElements,
      rules,
      lastCaptures: [],
      lastAlerts: []
    };

    if (action.type === 'PASS_TURN') {
      nextState.turnCount = (currentState.turnCount || 0) + 1;
      nextState.currentPlayer = currentState.currentPlayer === 'PLAYER_1' ? 'PLAYER_2' : 'PLAYER_1';
      return nextState;
    }

    const { x, y, player } = action;
    const height = nextBoard.length;
    const width = nextBoard[0]?.length ?? GameEngine.GRID_SIZE;

    if (y < 0 || y >= height || x < 0 || x >= width) {
      throw new Error(`Invalid coordinates (${x}, ${y}) for board ${width}x${height}`);
    }
    if (nextBoard[y][x] !== null) {
      throw new Error(`Cell (${x}, ${y}) is already occupied`);
    }

    const factionCountsBefore = GameEngine.getFactionCounts(currentState.board);
    const placedCell: BoardCell = {
      data: GameEngine.normalizeCard(action.card),
      owner: player
    };
    nextBoard[y][x] = placedCell;

    const sharedCtx = {
      state: nextState,
      alerts: [] as string[],
      captures: [] as any[],
      dyingCards: [] as any[]
    };

    // 1. Dispatch onEnterPlay (e.g. Heal, Death, Teleportation, Rotate)
    GameEngine.dispatchEnterPlay(nextBoard, x, y, placedCell, action.targets, sharedCtx);

    // 2. Locate card after onEnterPlay (handles Teleportation or self-destruction)
    let actualX = x;
    let actualY = y;
    let cardStillOnBoard = nextBoard[y]?.[x] === placedCell;

    if (!cardStillOnBoard) {
      outer: for (let by = 0; by < height; by++) {
        for (let bx = 0; bx < width; bx++) {
          const c = nextBoard[by][bx];
          if (c && (c === placedCell || c.data === placedCell.data)) {
            actualX = bx;
            actualY = by;
            cardStillOnBoard = true;
            break outer;
          }
        }
      }
    }

    // 3. Process captures from actual card position (including Same/Plus/Combo/Elements/Ward/Poison)
    let capturesResult: any = [];
    if (cardStillOnBoard) {
      capturesResult = GameEngine.processCaptures(
        nextBoard,
        actualX,
        actualY,
        placedCell,
        factionCountsBefore,
        boardElements,
        rules,
        sharedCtx
      );
    } else {
      capturesResult.alerts = [...sharedCtx.alerts];
    }

    // 4. Process any pending death triggers (e.g. Bomb) cleanly
    GameEngine.processDyingCards(nextBoard, sharedCtx);

    // 5. Dispatch End of Turn triggers across the board
    GameEngine.dispatchEndOfTurn(nextBoard, sharedCtx);
    GameEngine.processDyingCards(nextBoard, sharedCtx);

    if (capturesResult && sharedCtx.alerts.length > 0) {
      capturesResult.alerts = Array.from(new Set([...(capturesResult.alerts || []), ...sharedCtx.alerts]));
    }

    nextState.lastCaptures = capturesResult;
    nextState.lastAlerts = capturesResult.alerts || [];
    nextState.turnCount = (currentState.turnCount || 0) + 1;
    nextState.currentPlayer = currentState.currentPlayer === 'PLAYER_1' ? 'PLAYER_2' : 'PLAYER_1';

    if (GameEngine.isBoardFull(nextBoard)) {
      nextState.isFinished = true;
      nextState.winner = GameEngine.computeWinner(nextBoard);
    }

    return nextState;
  }

  public static buildContext(
    board: (BoardCell | null)[][],
    x: number,
    y: number,
    extra: Record<string, any> = {}
  ): any {
    const cell = board[y]?.[x] || null;
    return {
      board,
      x,
      y,
      cell,
      card: cell?.data || extra.card || null,
      owner: extra.owner ?? cell?.owner,
      ...extra
    };
  }

  public static dispatchEnterPlay(
    board: (BoardCell | null)[][],
    x: number,
    y: number,
    placedCell: BoardCell,
    targets?: any[],
    sharedCtx?: any
  ): void {
    if (!placedCell?.data?.skills?.length) return;
    const ctx = GameEngine.buildContext(board, x, y, {
      card: placedCell.data,
      owner: placedCell.owner,
      targets,
      alerts: sharedCtx?.alerts,
      captures: sharedCtx?.captures,
      dyingCards: sharedCtx?.dyingCards
    });
    skillRegistry.dispatch('onEnterPlay', ctx);
  }

  public static dispatchEndOfTurn(board: (BoardCell | null)[][], sharedCtx?: any): void {
    const height = board.length;
    const width = board[0]?.length ?? GameEngine.GRID_SIZE;
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const cell = board[y]?.[x];
        if (cell?.data?.skills?.length) {
          const ctx = GameEngine.buildContext(board, x, y, {
            alerts: sharedCtx?.alerts,
            captures: sharedCtx?.captures,
            dyingCards: sharedCtx?.dyingCards
          });
          skillRegistry.dispatch('onEndOfTurn', ctx);
        }
      }
    }
  }

  private static processDyingCards(board: (BoardCell | null)[][], sharedCtx: any): void {
    if (!sharedCtx?.dyingCards?.length) return;
    let safety = 0;
    while (sharedCtx.dyingCards.length > 0 && safety < 25) {
      safety++;
      const batch = sharedCtx.dyingCards.splice(0, sharedCtx.dyingCards.length);
      for (const dying of batch) {
        const dyingData = dying.cell?.data;
        if (!dyingData?.skills?.length) continue;
        const dyingCtx = GameEngine.buildContext(board, dying.x, dying.y, {
          card: dyingData,
          owner: dying.cell.owner,
          cell: dying.cell,
          alerts: sharedCtx.alerts,
          captures: sharedCtx.captures,
          dyingCards: sharedCtx.dyingCards
        });
        skillRegistry.dispatch('onDeath', dyingCtx);
      }
    }
  }

  public static getFactionCounts(board: (BoardCell | null)[][]): Record<Player, Record<string, number>> {
    const counts: Record<Player, Record<string, number>> = {
      PLAYER_1: {},
      PLAYER_2: {}
    };
    for (const row of board) {
      for (const cell of row) {
        if (!cell?.data) continue;
        const owner: Player = cell.owner === 'PLAYER_2' ? 'PLAYER_2' : 'PLAYER_1';
        const code = String(cell.data.factionCode || cell.data.faction || 'NEUTRAL').toUpperCase();
        counts[owner][code] = (counts[owner][code] || 0) + 1;
      }
    }
    return counts;
  }

  public static getRawSideValue(cardData: Card | null | undefined, side: 'top' | 'right' | 'bottom' | 'left'): number {
    if (!cardData) return 0;
    const raw =
      cardData.values?.[side] !== undefined
        ? cardData.values[side]
        : cardData[side + 'Value'] !== undefined
          ? cardData[side + 'Value']
          : cardData[side];
    return GameEngine.parseCombatSide(raw);
  }

  public static getElementModifier(
    cardData: Card | null | undefined,
    boardElements: (string | null)[][] | null | undefined,
    x: number,
    y: number,
    rules?: GameRules
  ): number {
    if (!cardData || !boardElements) return 0;
    if (rules && rules.elements === false) return 0;
    const slotEl = boardElements[y]?.[x];
    if (!slotEl || slotEl === 'none') return 0;
    const cardEl = cardData.element ? String(cardData.element).toLowerCase() : '';
    return cardEl && cardEl === String(slotEl).toLowerCase() ? 1 : -1;
  }

  public static getEffectiveValue(
    board: (BoardCell | null)[][],
    x: number,
    y: number,
    side: 'top' | 'right' | 'bottom' | 'left',
    factionCountsOverride?: Record<Player, Record<string, number>>,
    boardElements?: (string | null)[][] | null,
    rules?: GameRules
  ): number {
    const cell = board[y]?.[x];
    if (!cell?.data) return 0;

    let val = GameEngine.getRawSideValue(cell.data, side);

    // Elements modifier (+1 matching element, -1 non-matching elemental slot)
    val += GameEngine.getElementModifier(cell.data, boardElements, x, y, rules);

    // Aura modifiers from adjacent allied cards
    const height = board.length;
    const width = board[0]?.length ?? GameEngine.GRID_SIZE;
    for (const dir of COMBAT_DIRECTIONS) {
      const nx = x + dir.dx;
      const ny = y + dir.dy;
      if (nx < 0 || nx >= width || ny < 0 || ny >= height) continue;
      const adj = board[ny]?.[nx];
      if (adj && adj.owner === cell.owner && adj.data?.skills?.length) {
        const adjCtx = GameEngine.buildContext(board, nx, ny, {
          targetCell: cell,
          side,
          factionCounts: factionCountsOverride
        });
        val += skillRegistry.dispatchSum('getValueModifier', adjCtx);
      }
    }

    return Math.max(0, val);
  }

  public static processCaptures(
    board: (BoardCell | null)[][],
    startX: number,
    startY: number,
    placedCell: BoardCell,
    factionCountsBefore?: Record<Player, Record<string, number>>,
    boardElements?: (string | null)[][] | null,
    rules: GameRules = DEFAULT_RULES,
    sharedCtx?: any
  ): any[] {
    const height = board.length;
    const width = board[0]?.length ?? GameEngine.GRID_SIZE;
    const alerts: string[] = sharedCtx?.alerts || [];
    const captures: any[] = [];
    const dyingCards: any[] = sharedCtx?.dyingCards || [];
    const queue: Array<{ x: number; y: number; isInitial: boolean }> = [
      { x: startX, y: startY, isInitial: true }
    ];
    const queuedCoords = new Set<string>([`${startX},${startY}`]);

    const attemptCapture = (
      attackerCell: BoardCell,
      ax: number,
      ay: number,
      targetCell: BoardCell,
      tx: number,
      ty: number,
      reason: 'classic' | 'same' | 'plus' | 'combo'
    ): boolean => {
      const targetCtx = GameEngine.buildContext(board, tx, ty, {
        attackerX: ax,
        attackerY: ay,
        attacker: attackerCell.data,
        defender: targetCell.data,
        alerts,
        captures,
        dyingCards
      });
      const beforeRes = skillRegistry.dispatch('onBeforeCaptured', targetCtx);
      const prevented = Array.isArray(beforeRes) && beforeRes.some((r) => r && r.prevented);
      if (prevented) return false;

      targetCell.owner = attackerCell.owner;
      captures.push({ x: tx, y: ty, card: targetCell.data, owner: attackerCell.owner, reason });

      const attackerCtx = GameEngine.buildContext(board, ax, ay, {
        targetX: tx,
        targetY: ty,
        attacker: attackerCell.data,
        defender: targetCell.data,
        alerts,
        captures,
        dyingCards
      });
      skillRegistry.dispatch('onCapture', attackerCtx);

      const capturedCtx = GameEngine.buildContext(board, tx, ty, {
        attackerX: ax,
        attackerY: ay,
        attacker: attackerCell.data,
        defender: targetCell.data,
        alerts,
        captures,
        dyingCards
      });
      skillRegistry.dispatch('onCaptured', capturedCtx);

      return true;
    };

    while (queue.length > 0) {
      const { x: cx, y: cy, isInitial } = queue.shift()!;
      const attackerCell = board[cy]?.[cx];
      if (!attackerCell?.data) continue;

      // Enemy Freeze blocks combo propagation (not initial placement)
      if (!isInitial) {
        let isFrozenByEnemy = false;
        for (const dir of COMBAT_DIRECTIONS) {
          const fx = cx + dir.dx;
          const fy = cy + dir.dy;
          if (fx < 0 || fx >= width || fy < 0 || fy >= height) continue;
          const fAdj = board[fy]?.[fx];
          if (fAdj && fAdj.owner !== attackerCell.owner && fAdj.data?.skills?.length) {
            const adjCtx = GameEngine.buildContext(board, fx, fy, {
              attacker: attackerCell.data,
              alerts,
              captures,
              dyingCards
            });
            if (skillRegistry.dispatchAny('blocksCombo', adjCtx)) {
              isFrozenByEnemy = true;
              break;
            }
          }
        }
        if (isFrozenByEnemy) continue;
      }

      const attackerCtx = GameEngine.buildContext(board, cx, cy, { alerts, captures, dyingCards });
      const canSnipe = skillRegistry.dispatchAny('extendsAttackRange', attackerCtx);
      const attackerHasCombo = skillRegistry.dispatchAny('hasCombo', attackerCtx);
      const specialTargets: Array<{ x: number; y: number; cell: BoardCell; reason: 'same' | 'plus' }> = [];

      // Same & Plus only check immediately on initial placement
      if (isInitial && (rules.same || rules.plus)) {
        const adjEntries: Array<{
          x: number;
          y: number;
          cell: BoardCell;
          myRaw: number;
          oppRaw: number;
        }> = [];

        for (const dir of COMBAT_DIRECTIONS) {
          const nx = cx + dir.dx;
          const ny = cy + dir.dy;
          if (nx < 0 || nx >= width || ny < 0 || ny >= height) continue;
          const adj = board[ny]?.[nx];
          if (!adj?.data) continue;
          adjEntries.push({
            x: nx,
            y: ny,
            cell: adj,
            myRaw: GameEngine.getRawSideValue(attackerCell.data, dir.mySide as any),
            oppRaw: GameEngine.getRawSideValue(adj.data, dir.oppSide as any)
          });
        }

        if (rules.same) {
          const matches = adjEntries.filter((e) => e.myRaw === e.oppRaw);
          if (matches.length >= 2) {
            if (!alerts.includes('SAME!')) alerts.push('SAME!');
            for (const m of matches) {
              if (m.cell.owner !== attackerCell.owner) {
                specialTargets.push({ x: m.x, y: m.y, cell: m.cell, reason: 'same' });
              }
            }
          }
        }

        if (rules.plus) {
          const bySum = new Map<number, typeof adjEntries>();
          for (const e of adjEntries) {
            const sum = e.myRaw + e.oppRaw;
            const list = bySum.get(sum) || [];
            list.push(e);
            bySum.set(sum, list);
          }
          let plusTriggered = false;
          for (const group of bySum.values()) {
            if (group.length >= 2) {
              plusTriggered = true;
              for (const m of group) {
                if (
                  m.cell.owner !== attackerCell.owner &&
                  !specialTargets.some((t) => t.x === m.x && t.y === m.y)
                ) {
                  specialTargets.push({ x: m.x, y: m.y, cell: m.cell, reason: 'plus' });
                }
              }
            }
          }
          if (plusTriggered && !alerts.includes('PLUS!')) alerts.push('PLUS!');
        }

        for (const st of specialTargets) {
          const captured = attemptCapture(attackerCell, cx, cy, st.cell, st.x, st.y, st.reason);
          if (captured && (rules.combo || attackerHasCombo)) {
            const key = `${st.x},${st.y}`;
            if (!queuedCoords.has(key)) {
              queuedCoords.add(key);
              queue.push({ x: st.x, y: st.y, isInitial: false });
            }
          }
        }
      }

      // Classic comparisons (with optional Sniper range through empty cells)
      const maxRange = canSnipe ? Math.max(width, height) : 1;
      for (const dir of COMBAT_DIRECTIONS) {
        for (let r = 1; r <= maxRange; r++) {
          const nx = cx + dir.dx * r;
          const ny = cy + dir.dy * r;
          if (nx < 0 || nx >= width || ny < 0 || ny >= height) break;
          const targetCell = board[ny]?.[nx];
          if (!targetCell) {
            if (canSnipe) continue;
            break;
          }

          if (targetCell.owner !== attackerCell.owner) {
            const myVal = GameEngine.getEffectiveValue(
              board,
              cx,
              cy,
              dir.mySide as any,
              factionCountsBefore,
              boardElements,
              rules
            );
            const oppVal = GameEngine.getEffectiveValue(
              board,
              nx,
              ny,
              dir.oppSide as any,
              factionCountsBefore,
              boardElements,
              rules
            );

            if (myVal > oppVal) {
              const reason = isInitial ? 'classic' : 'combo';
              const captured = attemptCapture(attackerCell, cx, cy, targetCell, nx, ny, reason);
              if (captured) {
                if (!isInitial && !alerts.includes('COMBO!')) alerts.push('COMBO!');
                const shouldCombo = attackerHasCombo || (!isInitial && rules.combo);
                if (shouldCombo) {
                  const key = `${nx},${ny}`;
                  if (!queuedCoords.has(key)) {
                    queuedCoords.add(key);
                    queue.push({ x: nx, y: ny, isInitial: false });
                  }
                }
              }
            }
          }
          break;
        }
      }
    }

    (captures as any).alerts = alerts;
    return captures;
  }

  public static isBoardFull(board: (BoardCell | null)[][]): boolean {
    if (!Array.isArray(board) || board.length === 0) return false;
    return board.every((row) => Array.isArray(row) && row.every((cell) => cell !== null));
  }

  public static computeWinner(board: (BoardCell | null)[][]): Player | 'DRAW' {
    let p1 = 0;
    let p2 = 0;
    for (const row of board) {
      for (const cell of row) {
        if (!cell) continue;
        if (cell.owner === 'PLAYER_1') p1++;
        else if (cell.owner === 'PLAYER_2') p2++;
      }
    }
    if (p1 > p2) return 'PLAYER_1';
    if (p2 > p1) return 'PLAYER_2';
    return 'DRAW';
  }

  public static calculateCardLevel(card: Record<string, any>): number {
    if (!card) return 1;
    const top = GameEngine.parseLevelSide(card.values?.top ?? card.topValue ?? card.top);
    const right = GameEngine.parseLevelSide(card.values?.right ?? card.rightValue ?? card.right);
    const bottom = GameEngine.parseLevelSide(card.values?.bottom ?? card.bottomValue ?? card.bottom);
    const left = GameEngine.parseLevelSide(card.values?.left ?? card.leftValue ?? card.left);
    const sum = top + right + bottom + left;
    return Math.max(1, Math.min(10, Math.round(sum / 4)));
  }

  public static rotateValues(
    values: { top: any; right: any; bottom: any; left: any },
    clockwise: boolean = true
  ): { top: any; right: any; bottom: any; left: any } {
    if (clockwise) {
      return {
        top: values.left,
        right: values.top,
        bottom: values.right,
        left: values.bottom
      };
    }
    return {
      top: values.right,
      right: values.bottom,
      bottom: values.left,
      left: values.top
    };
  }
}
