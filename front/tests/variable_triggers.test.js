import { describe, it, expect } from 'vitest';
import { GameEngine } from '../src/game/GameEngine.js';

function makeCard(overrides = {}) {
  return {
    id: overrides.id || 'test-card',
    name: overrides.name || 'Test',
    topValue: overrides.topValue || '5',
    rightValue: overrides.rightValue || '5',
    bottomValue: overrides.bottomValue || '5',
    leftValue: overrides.leftValue || '5',
    top: parseInt(overrides.topValue || '5'),
    right: parseInt(overrides.rightValue || '5'),
    bottom: parseInt(overrides.bottomValue || '5'),
    left: parseInt(overrides.leftValue || '5'),
    defaultHp: overrides.defaultHp || 3,
    skills: overrides.skills || [],
    factionCode: overrides.factionCode || 'NEUTRAL',
    ...overrides
  };
}

describe('Variable Triggers System', () => {
  it('should execute growing on placement if trigger is set to onEnterPlay', () => {
    const state = GameEngine.createInitialState();
    
    // We create a card with growing that triggers on Enter Play instead of End of Turn
    const card = makeCard({
      id: 'fast-grower',
      topValue: '3',
      skills: [{ type: 'growing', value: 2, trigger: 'onEnterPlay' }]
    });

    const nextState = GameEngine.computeNextState(state, {
      type: 'PLACE_CARD',
      player: 'PLAYER_1',
      x: 0, y: 0,
      card
    });

    const placedCard = nextState.board[0][0].data;
    
    // The value should have increased to 5 immediately upon placement
    expect(placedCard.topValue).toBe('5');
    expect(placedCard.top).toBe(5);
  });

  it('should NOT execute growing on end of turn if trigger is set to onEnterPlay', () => {
    const state = GameEngine.createInitialState();
    
    // Setup a board where the card is already in play
    const card = makeCard({
      id: 'fast-grower',
      topValue: '5', // After initial growth
      skills: [{ type: 'growing', value: 2, trigger: 'onEnterPlay' }]
    });

    state.board[0][0] = { data: card, owner: 'PLAYER_1' };

    // Player 1 plays a different card, which triggers EndOfTurn for everyone
    const nextState = GameEngine.computeNextState(state, {
      type: 'PLACE_CARD',
      player: 'PLAYER_1',
      x: 1, y: 0,
      card: makeCard({ id: 'dummy' })
    });

    const originalCard = nextState.board[0][0].data;
    
    // The value should remain 5 because the trigger is onEnterPlay, not onEndOfTurn
    expect(originalCard.topValue).toBe('5');
    expect(originalCard.top).toBe(5);
  });

  it('should execute heal on end of turn if trigger is set to onEndOfTurn', () => {
    const state = GameEngine.createInitialState();
    
    // Put a damaged card on the board
    const targetCard = makeCard({ id: 'target', hp: 1, defaultHp: 3 });
    state.board[0][1] = { data: targetCard, owner: 'PLAYER_1' };

    // We play a card with heal that triggers on End Of Turn
    const card = makeCard({
      id: 'slow-healer',
      skills: [{ type: 'heal', value: 2, trigger: 'onEndOfTurn', patterns: [{ value: 'adjacent' }] }]
    });

    const nextState = GameEngine.computeNextState(state, {
      type: 'PLACE_CARD',
      player: 'PLAYER_1',
      x: 0, y: 0,
      card
    });

    const healedCard = nextState.board[0][1].data;
    
    // The value should have increased to 3 at the end of the turn
    expect(healedCard.hp).toBe(3);
  });
});
