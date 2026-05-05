import { describe, it, expect, beforeEach } from 'vitest';
import { GameEngine } from '../src/game/GameEngine.js';
import { skillRegistry } from '../../shared/skills/index';

/**
 * Tests unitaires pour la compétence Growing (Croissance).
 * On utilise le GameEngine pour simuler les tours et vérifier les mutations d'état.
 * 
 * --- DÉCLENCHEMENT DE LA COMPÉTENCE (DÉTAILS) ---
 * 
 * 1. Action Joueur : Le joueur envoie une action { type: 'PLACE_CARD', x, y, card }.
 * 2. Moteur (GameEngine.js) :
 *    - La fonction `computeNextState` reçoit l'action.
 *    - Elle place la carte sur le plateau (`nextState.board[y][x]`).
 *    - Elle appelle `GameEngine.dispatchEndOfTurn(nextState.board)`.
 * 3. Dispatch (GameEngine.js > dispatchEndOfTurn) :
 *    - Le moteur parcourt TOUTE la grille.
 *    - Pour chaque case, il vérifie si `cell.data.skills` contient des éléments.
 *    - Si oui, il appelle `skillRegistry.dispatch('onEndOfTurn', ctx)`.
 * 4. Registre (SkillRegistry.ts) :
 *    - Il identifie le handler associé au type (ex: 'growing').
 *    - Il exécute le hook `onEndOfTurn` du handler.
 * 5. Handler (growing.ts) :
 *    - Il récupère la valeur d'incrément (`skill.value`).
 *    - Il identifie les cibles via `getTargetCells`. Par défaut : `self` (soi-même).
 *    - Il modifie les valeurs de la carte (top, right, bottom, left) ET les versions string (topValue, etc.).
 * 
 * --- EXEMPLE DE PARAMÈTRES (Strapi) ---
 * {
 *   "type": "growing",
 *   "value": 2,
 *   "patterns": [
 *     { "value": "self" }
 *   ]
 * }
 */

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

describe('Skill: Growing (Simulation)', () => {
  
  it('should increase card values of itself by default (no patterns)', () => {
    const state = GameEngine.createInitialState();
    
    const card = makeCard({
      id: 'grower',
      topValue: '3',
      skills: [{ type: 'growing', value: 2 }]
    });

    // On place la carte
    const nextState = GameEngine.computeNextState(state, {
      type: 'PLACE_CARD',
      player: 'PLAYER_1',
      x: 0, y: 0,
      card
    });

    const placedCard = nextState.board[0][0].data;
    
    // Vérification de l'augmentation (3 + 2 = 5)
    expect(placedCard.topValue).toBe('5');
    expect(placedCard.top).toBe(5);
  });

  it('should cap values at 100 and display as "A"', () => {
    const state = GameEngine.createInitialState();
    
    const card = makeCard({
      id: 'grower',
      topValue: '99',
      skills: [{ type: 'growing', value: 5 }]
    });

    const nextState = GameEngine.computeNextState(state, {
      type: 'PLACE_CARD',
      player: 'PLAYER_1',
      x: 0, y: 0,
      card
    });

    const placedCard = nextState.board[0][0].data;
    
    expect(placedCard.topValue).toBe('A');
    expect(placedCard.top).toBe(100);
  });

  it('should work with "A" as initial value', () => {
    const state = GameEngine.createInitialState();
    
    const card = makeCard({
      id: 'grower',
      topValue: 'A',
      skills: [{ type: 'growing', value: 1 }]
    });

    const nextState = GameEngine.computeNextState(state, {
      type: 'PLACE_CARD',
      player: 'PLAYER_1',
      x: 0, y: 0,
      card
    });

    const placedCard = nextState.board[0][0].data;
    
    expect(placedCard.topValue).toBe('A');
    expect(placedCard.top).toBe(100);
  });

  it('should sync all 4 sides', () => {
    const state = GameEngine.createInitialState();
    
    const card = makeCard({
      id: 'grower',
      topValue: '1',
      rightValue: '2',
      bottomValue: '3',
      leftValue: '4',
      skills: [{ type: 'growing', value: 1 }]
    });

    const nextState = GameEngine.computeNextState(state, {
      type: 'PLACE_CARD',
      player: 'PLAYER_1',
      x: 0, y: 0,
      card
    });

    const placedCard = nextState.board[0][0].data;
    
    expect(placedCard.topValue).toBe('2');
    expect(placedCard.rightValue).toBe('3');
    expect(placedCard.bottomValue).toBe('4');
    expect(placedCard.leftValue).toBe('5');
  });

  it('should target other cards if pattern is specified', () => {
    const state = GameEngine.createInitialState();
    
    // On place une cible alliée à (0,1)
    state.board[1][0] = {
      data: makeCard({ id: 'target', topValue: '5' }),
      owner: 'PLAYER_1'
    };

    // On place la carte Growing à (0,0) avec pattern adjacent
    const nextState = GameEngine.computeNextState(state, {
      type: 'PLACE_CARD',
      player: 'PLAYER_1',
      x: 0, y: 0,
      card: makeCard({
        id: 'grower',
        skills: [{ type: 'growing', value: 1, patterns: [{ value: 'adjacent' }] }]
      })
    });

    const targetCard = nextState.board[1][0].data;
    expect(targetCard.topValue).toBe('6');
    
    // La carte grower elle-même ne devrait pas avoir grandi car le pattern est adjacent
    const growerCard = nextState.board[0][0].data;
    expect(growerCard.topValue).toBe('5'); 
  });

});
