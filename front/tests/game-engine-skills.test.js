import { describe, it, expect } from 'vitest';
import { GameEngine } from '../src/game/GameEngine.js';
// Importing index.js ensures all skills are registered
import '../src/game/skills/index.js';

/**
 * Tests d'intégration : GameEngine + SkillRegistry
 * Vérifie que les skills sont correctement dispatchées par le moteur.
 */

function makeCard(overrides = {}) {
  return {
    id: overrides.id || 'test-card',
    name: overrides.name || 'Test',
    topValue: overrides.topValue || '5',
    rightValue: overrides.rightValue || '5',
    bottomValue: overrides.bottomValue || '5',
    leftValue: overrides.leftValue || '5',
    values: {
      top: overrides.topValue || '5',
      right: overrides.rightValue || '5',
      bottom: overrides.bottomValue || '5',
      left: overrides.leftValue || '5',
    },
    defaultHp: overrides.defaultHp || 3,
    skills: overrides.skills || [],
    factionCode: overrides.factionCode || 'NEUTRAL',
    ...overrides
  };
}

describe('GameEngine + Skills Integration', () => {

  describe('Basic placement (no skills)', () => {
    it('should place a card and switch turns', () => {
      const state = GameEngine.createInitialState();
      const next = GameEngine.computeNextState(state, {
        type: 'PLACE_CARD',
        player: 'PLAYER_1',
        x: 0, y: 0,
        card: makeCard()
      });

      expect(next.board[0][0]).not.toBeNull();
      expect(next.board[0][0].owner).toBe('PLAYER_1');
      expect(next.currentPlayer).toBe('PLAYER_2');
    });
  });

  describe('Heal skill', () => {
    it('should heal adjacent cards on enter play', () => {
      const state = GameEngine.createInitialState();

      // Place a card with 1 HP remaining
      state.board[0][1] = {
        data: { ...makeCard({ id: 'target' }), hp: 1 },
        owner: 'PLAYER_1'
      };

      // Place a card with heal adjacent to it
      const next = GameEngine.computeNextState(state, {
        type: 'PLACE_CARD',
        player: 'PLAYER_1',
        x: 0, y: 0,
        card: makeCard({ id: 'healer', skills: [{ type: 'heal', value: 2 }] })
      });

      expect(next.board[0][1].data.hp).toBe(3); // 1 + 2
    });
  });

  describe('Death skill', () => {
    it('should damage adjacent cards and remove if HP <= 0', () => {
      const state = GameEngine.createInitialState();

      // Place a card with 1 HP
      state.board[0][1] = {
        data: { ...makeCard({ id: 'victim' }), hp: 1 },
        owner: 'PLAYER_2'
      };

      // Place death card adjacent
      const next = GameEngine.computeNextState(state, {
        type: 'PLACE_CARD',
        player: 'PLAYER_1',
        x: 0, y: 0,
        card: makeCard({ id: 'killer', skills: [{ type: 'death', value: 1 }] })
      });

      // Card should be removed (HP 1 - 1 = 0)
      expect(next.board[0][1]).toBeNull();
    });
  });

  describe('Growing skill', () => {
    it('should increase card values at end of turn', () => {
      const state = GameEngine.createInitialState();

      // Place a card with growing
      const next = GameEngine.computeNextState(state, {
        type: 'PLACE_CARD',
        player: 'PLAYER_1',
        x: 0, y: 0,
        card: makeCard({
          id: 'grower',
          topValue: '3', rightValue: '3', bottomValue: '3', leftValue: '3',
          skills: [{ type: 'growing', value: 1 }]
        })
      });

      // After end of turn, values should have increased by 1
      expect(next.board[0][0].data.topValue).toBe('4');
      expect(next.board[0][0].data.rightValue).toBe('4');
    });
  });

  describe('Decrease skill', () => {
    it('should decrease card values at end of turn', () => {
      const state = GameEngine.createInitialState();

      const next = GameEngine.computeNextState(state, {
        type: 'PLACE_CARD',
        player: 'PLAYER_1',
        x: 0, y: 0,
        card: makeCard({
          id: 'decayer',
          topValue: '5', rightValue: '5', bottomValue: '5', leftValue: '5',
          skills: [{ type: 'decrease', value: 2 }]
        })
      });

      expect(next.board[0][0].data.topValue).toBe('3');
    });
  });

  describe('Aura skill', () => {
    it('should boost allied adjacent card effective values', () => {
      const board = [
        [null, null, null, null],
        [null, null, null, null],
        [null, null, null, null],
        [null, null, null, null]
      ];

      // Place an aura card at (0,0)
      board[0][0] = {
        data: { ...makeCard({ id: 'aura' }), skills: [{ type: 'aura', value: 2 }] },
        owner: 'PLAYER_1'
      };

      // Place an ally at (1,0)
      board[0][1] = {
        data: { ...makeCard({ id: 'ally', topValue: '5' }) },
        owner: 'PLAYER_1'
      };

      // The ally's effective top value should be 5 + 2 (aura)
      const effectiveValue = GameEngine.getEffectiveValue(board, 1, 0, 'top');
      expect(effectiveValue).toBe(7);
    });
  });

  describe('Ward skill', () => {
    it('should block first capture', () => {
      const state = GameEngine.createInitialState();

      // Place a weak card with ward
      state.board[0][1] = {
        data: {
          ...makeCard({ id: 'warded', topValue: '1', rightValue: '1', bottomValue: '1', leftValue: '1' }),
          hp: 3,
          skills: [{ type: 'ward', value: 1 }]
        },
        owner: 'PLAYER_2'
      };

      // Place a strong card adjacent
      const next = GameEngine.computeNextState(state, {
        type: 'PLACE_CARD',
        player: 'PLAYER_1',
        x: 0, y: 0,
        card: makeCard({ id: 'attacker', topValue: '9', rightValue: '9', bottomValue: '9', leftValue: '9' })
      });

      // Card should NOT be captured (ward blocked it)
      expect(next.board[0][1].owner).toBe('PLAYER_2');
      // Ward should be consumed
      expect(next.board[0][1].data.skills.find(s => s.type === 'ward')).toBeUndefined();
    });
  });

  describe('Classic capture (no skills)', () => {
    it('should capture weaker adjacent enemy card', () => {
      const state = GameEngine.createInitialState();

      // Place a weak enemy card
      state.board[0][1] = {
        data: {
          ...makeCard({ id: 'weak', topValue: '1', rightValue: '1', bottomValue: '1', leftValue: '1' }),
          hp: 3
        },
        owner: 'PLAYER_2'
      };

      // Place a strong card adjacent
      const next = GameEngine.computeNextState(state, {
        type: 'PLACE_CARD',
        player: 'PLAYER_1',
        x: 0, y: 0,
        card: makeCard({ id: 'strong', topValue: '9', rightValue: '9', bottomValue: '9', leftValue: '9' })
      });

      // Enemy's HP should decrease; if survived, owner changes
      const captured = next.board[0][1];
      expect(captured.owner).toBe('PLAYER_1');
    });
  });
});
