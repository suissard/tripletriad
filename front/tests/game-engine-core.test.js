import { describe, it, expect } from 'vitest';
import { GameEngine } from '../src/game/GameEngine.js';
import { getRarity, displayVal } from '../src/game/constants.js';
import { getBestAIMovePure, evaluatePlacementScorePure } from '../src/game/pureAi.js';
import '../../shared/skills/index.js';

function makeCard(overrides = {}) {
  return {
    id: overrides.id || 'card-1',
    name: overrides.name || 'Card',
    topValue: overrides.topValue ?? '5',
    rightValue: overrides.rightValue ?? '5',
    bottomValue: overrides.bottomValue ?? '5',
    leftValue: overrides.leftValue ?? '5',
    defaultHp: overrides.defaultHp ?? 3,
    skills: overrides.skills || [],
    element: overrides.element ?? null,
    factionCode: overrides.factionCode || 'NEUTRAL',
    ...overrides
  };
}

describe('Unified GameEngine (3x3, Elements, Immutability, Skills Edge Cases)', () => {
  it('initializes a 3x3 board by default and handles PASS_TURN', () => {
    const state = GameEngine.createInitialState('PLAYER_1');
    expect(state.board.length).toBe(3);
    expect(state.board[0].length).toBe(3);
    expect(state.currentPlayer).toBe('PLAYER_1');

    const passed = GameEngine.computeNextState(state, { type: 'PASS_TURN', player: 'PLAYER_1' });
    expect(passed.currentPlayer).toBe('PLAYER_2');
    expect(passed.turnCount).toBe(1);
    expect(state.currentPlayer).toBe('PLAYER_1');
  });

  it('uses A=100 for combat and A=10 for level and rarity', () => {
    expect(GameEngine.parseCombatSide('A')).toBe(100);
    expect(GameEngine.parseLevelSide('A')).toBe(10);
    expect(GameEngine.calculateCardLevel({ top: 'A', right: 1, bottom: 1, left: 1 })).toBe(3);
    expect(GameEngine.calculateCardLevel({ top: 'A', right: 'A', bottom: 'A', left: 'A' })).toBe(10);

    expect(getRarity({ top: 'A', right: 'A', bottom: 'A', left: 'A' }).name).toBe('Légendaire');
    expect(getRarity({ top: 100, right: 100, bottom: 100, left: 100 }).name).toBe('Légendaire');
    expect(displayVal(100)).toBe('A');
    expect(displayVal(10)).toBe('A');
  });

  it('applies Elements rule (+1 matching element, -1 mismatched element)', () => {
    const boardElements = [
      ['feu', 'eau', null],
      [null, null, null],
      [null, null, null]
    ];
    const state = GameEngine.createInitialState('PLAYER_1', {
      rules: { same: false, plus: false, combo: true, elements: true },
      boardElements
    });

    // Place P2 card (left=6) on water slot (1,0) -> non-water card gets -1 => effective left = 5
    state.board[0][1] = {
      data: GameEngine.normalizeCard(makeCard({ id: 'def', leftValue: '6', element: 'terre' })),
      owner: 'PLAYER_2'
    };

    // Place P1 fire card (right=5) on fire slot (0,0) -> +1 => effective right = 6 > 5 -> captures!
    const next = GameEngine.computeNextState(state, {
      type: 'PLACE_CARD',
      player: 'PLAYER_1',
      x: 0,
      y: 0,
      card: makeCard({ id: 'atk', rightValue: '5', element: 'feu' })
    });

    expect(next.board[0][1].owner).toBe('PLAYER_1');
    // Original state must remain unmutated
    expect(state.board[0][1].owner).toBe('PLAYER_2');
    expect(state.board[0][0]).toBeNull();
  });

  it('prevents capture with Ward and does not propagate combo from warded card', () => {
    const state = GameEngine.createInitialState('PLAYER_1', {
      rules: { same: true, plus: false, combo: true, elements: false }
    });

    // Setup Same matches for P1 at (0,0): right=4 matches (1,0) left=4 [WARD]; bottom=4 matches (0,1) top=4
    state.board[0][1] = {
      data: GameEngine.normalizeCard(makeCard({
        id: 'warded-mid',
        leftValue: '4',
        rightValue: '9',
        skills: [{ type: 'ward', value: 1 }]
      })),
      owner: 'PLAYER_2'
    };
    state.board[0][2] = {
      data: GameEngine.normalizeCard(makeCard({ id: 'far-right', leftValue: '2' })),
      owner: 'PLAYER_2'
    };
    state.board[1][0] = {
      data: GameEngine.normalizeCard(makeCard({ id: 'bot', topValue: '4' })),
      owner: 'PLAYER_2'
    };

    const next = GameEngine.computeNextState(state, {
      type: 'PLACE_CARD',
      player: 'PLAYER_1',
      x: 0,
      y: 0,
      card: makeCard({ id: 'placed', rightValue: '4', bottomValue: '4' })
    });

    // (0,1) blocked capture via Ward and lost Ward; (0,2) must NOT be captured via combo; (1,0) captured via Same
    expect(next.board[0][1].owner).toBe('PLAYER_2');
    expect(next.board[0][1].data.skills.length).toBe(0);
    expect(next.board[0][2].owner).toBe('PLAYER_2');
    expect(next.board[1][0].owner).toBe('PLAYER_1');
  });

  it('handles Teleportation before captures so card attacks from destination slot', () => {
    const state = GameEngine.createInitialState('PLAYER_1');
    state.board[2][1] = {
      data: GameEngine.normalizeCard(makeCard({ id: 'weak-enemy', leftValue: '1' })),
      owner: 'PLAYER_2'
    };

    const next = GameEngine.computeNextState(state, {
      type: 'PLACE_CARD',
      player: 'PLAYER_1',
      x: 0,
      y: 0,
      card: makeCard({
        id: 'teleporter',
        rightValue: '9',
        skills: [{ type: 'teleportation' }]
      }),
      targets: [{ x: 0, y: 2 }]
    });

    expect(next.board[0][0]).toBeNull();
    expect(next.board[2][0]?.owner).toBe('PLAYER_1');
    expect(next.board[2][1]?.owner).toBe('PLAYER_1');
  });

  it('blocks combo only from adjacent ENEMY Freeze, not friendly Freeze', () => {
    const state = GameEngine.createInitialState('PLAYER_1', {
      rules: { same: true, plus: false, combo: true, elements: false }
    });

    // Friendly Freeze at (1,0) right next to (1,1) should NOT block P1 combo
    state.board[0][1] = {
      data: GameEngine.normalizeCard(makeCard({
        id: 'friendly-freeze',
        bottomValue: '5',
        skills: [{ type: 'freeze' }]
      })),
      owner: 'PLAYER_1'
    };
    state.board[1][1] = {
      data: GameEngine.normalizeCard(makeCard({ id: 'mid-enemy', leftValue: '5', rightValue: '9', topValue: '5' })),
      owner: 'PLAYER_2'
    };
    state.board[1][2] = {
      data: GameEngine.normalizeCard(makeCard({ id: 'right-enemy', leftValue: '2' })),
      owner: 'PLAYER_2'
    };

    const next = GameEngine.computeNextState(state, {
      type: 'PLACE_CARD',
      player: 'PLAYER_1',
      x: 0,
      y: 1,
      card: makeCard({ id: 'starter', topValue: '1', rightValue: '5' })
    });

    // Even if only classic capture applies (right=5 vs left=5 -> wait use right=8 for mid-enemy combo test)
    expect(next.board[1][1]?.owner).toBe('PLAYER_2');

    // Now test Same trigger at (1,1) + (2,1) -> friendly freeze at (0,1) doesn't stop combo from (1,1) to (1,2)
    const state2 = GameEngine.createInitialState('PLAYER_1', {
      rules: { same: true, plus: false, combo: true, elements: false }
    });
    state2.board[0][1] = {
      data: GameEngine.normalizeCard(makeCard({ id: 'friendly-freeze', skills: [{ type: 'freeze' }] })),
      owner: 'PLAYER_1'
    };
    state2.board[1][1] = {
      data: GameEngine.normalizeCard(makeCard({ id: 'mid-enemy', leftValue: '5', rightValue: '9' })),
      owner: 'PLAYER_2'
    };
    state2.board[2][0] = {
      data: GameEngine.normalizeCard(makeCard({ id: 'bot-enemy', topValue: '5' })),
      owner: 'PLAYER_2'
    };
    state2.board[1][2] = {
      data: GameEngine.normalizeCard(makeCard({ id: 'combo-target', leftValue: '2' })),
      owner: 'PLAYER_2'
    };

    const next2 = GameEngine.computeNextState(state2, {
      type: 'PLACE_CARD',
      player: 'PLAYER_1',
      x: 0,
      y: 1,
      card: makeCard({ id: 'starter', rightValue: '5', bottomValue: '5' })
    });

    expect(next2.board[1][1].owner).toBe('PLAYER_1');
    expect(next2.board[2][0].owner).toBe('PLAYER_1');
    expect(next2.board[1][2].owner).toBe('PLAYER_1');
  });

  it('pureAi evaluates moves with A values without mutating board state', () => {
    const board2D = GameEngine.createInitialState('PLAYER_2').board;
    board2D[0][0] = {
      data: GameEngine.normalizeCard(makeCard({ id: 'p1', rightValue: '4', skills: [{ type: 'growing', value: 1 }] })),
      owner: 'PLAYER_1'
    };

    const hand = [makeCard({ id: 'ai-ace', leftValue: 'A', topValue: 'A', rightValue: 'A', bottomValue: 'A' })];
    const score = evaluatePlacementScorePure(1, 0, hand[0], 'PLAYER_2', board2D, {}, null);
    expect(Number.isFinite(score)).toBe(true);
    expect(board2D[0][0].owner).toBe('PLAYER_1');
    expect(board2D[0][0].data.rightValue).toBe('4');

    const move = getBestAIMovePure(board2D, hand, 'PLAYER_2', {}, 100);
    expect(move).not.toBeNull();
    expect(move.cardIdx).toBe(0);
  });
});
