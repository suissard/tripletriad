import { describe, it, expect } from 'vitest';
import { GameEngine } from '../src/game/GameEngine.js';
import { skillRegistry } from '../../shared/skills/index';

/**
 * Tests unitaires pour la compétence Heal (Soin).
 */

function makeCard(overrides = {}) {
  return {
    id: overrides.id || 'test-card',
    name: overrides.name || 'Test',
    topValue: overrides.topValue || '5',
    rightValue: overrides.rightValue || '5',
    bottomValue: overrides.bottomValue || '5',
    leftValue: overrides.leftValue || '5',
    defaultHp: overrides.defaultHp || 3,
    hp: overrides.hp !== undefined ? overrides.hp : (overrides.defaultHp || 3),
    skills: overrides.skills || [],
    ...overrides
  };
}

describe('Skill: Heal (Simulation)', () => {

  it('should heal adjacent allies on enter play', () => {
    const state = GameEngine.createInitialState();
    
    // On place un allié blessé à (0,1)
    state.board[1][0] = {
      data: makeCard({ id: 'victim', hp: 1, defaultHp: 3 }),
      owner: 'PLAYER_1'
    };

    // On place le soigneur à (0,0)
    const nextState = GameEngine.computeNextState(state, {
      type: 'PLACE_CARD',
      player: 'PLAYER_1',
      x: 0, y: 0,
      card: makeCard({
        id: 'healer',
        skills: [{ type: 'heal', value: 2 }]
      })
    });

    const healedCard = nextState.board[1][0].data;
    expect(healedCard.hp).toBe(3); // 1 + 2 = 3
  });

  it('should not heal enemies', () => {
    const state = GameEngine.createInitialState();
    
    // On place un ennemi blessé à (0,1)
    state.board[1][0] = {
      data: makeCard({ id: 'enemy', hp: 1, defaultHp: 3 }),
      owner: 'PLAYER_2'
    };

    // On place le soigneur à (0,0)
    const nextState = GameEngine.computeNextState(state, {
      type: 'PLACE_CARD',
      player: 'PLAYER_1',
      x: 0, y: 0,
      card: makeCard({
        id: 'healer',
        skills: [{ type: 'heal', value: 2 }]
      })
    });

    const enemyCard = nextState.board[1][0].data;
    expect(enemyCard.hp).toBe(1); // Pas de soin
  });

});
