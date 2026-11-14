import { describe, it, expect } from 'vitest';
import { GameEngine } from '../src/game/GameEngine.js';
import { SkillEngine } from '../../shared/skills/SkillEngine.js';
import '../../shared/skills/index.js';

/**
 * Non-régression : computeNextState doit être PUR.
 * Les simulations de l'IA (pureAi.js) appellent computeNextState sur le plateau réel ;
 * toute mutation de l'état d'entrée corromprait la partie en cours.
 */

function makeCard(overrides = {}) {
  return {
    id: 'c', name: 'Card',
    topValue: '5', rightValue: '5', bottomValue: '5', leftValue: '5',
    top: 5, right: 5, bottom: 5, left: 5,
    defaultHp: 3, factionCode: 'NEUTRAL', skills: [],
    ...overrides,
  };
}

describe('GameEngine purity', () => {
  it('does not mutate cards already on the board (skills effects)', () => {
    const state = GameEngine.createInitialState();
    const neighbour = makeCard({ id: 'ally', topValue: '5', hp: 1 });
    state.board[1][0] = { data: neighbour, owner: 'PLAYER_1' };
    const snapshot = JSON.stringify(state);

    GameEngine.computeNextState(state, {
      type: 'PLACE_CARD', player: 'PLAYER_1', x: 0, y: 0,
      card: makeCard({ id: 'healer', skills: [{ type: 'heal', value: 2 }] }),
    });

    expect(JSON.stringify(state)).toBe(snapshot);
    expect(neighbour.hp).toBe(1);
  });

  it('does not mutate the played card (skills array, charges)', () => {
    const state = GameEngine.createInitialState();
    const card = makeCard({ skills: [{ type: 'growing', value: 1, counter: 2 }], skillId: 'ward' });
    const snapshot = JSON.stringify(card);

    const next = GameEngine.computeNextState(state, {
      type: 'PLACE_CARD', player: 'PLAYER_1', x: 0, y: 0, card,
    });

    expect(JSON.stringify(card)).toBe(snapshot);
    expect(card.skills).toHaveLength(1);
    // La charge est bien consommée sur la copie posée sur le plateau
    expect(next.board[0][0].data.skills[0].counter).toBe(1);
  });

  it('keeps the input state reusable for multiple simulations (AI lookahead)', () => {
    const state = GameEngine.createInitialState();
    state.board[0][1] = { data: makeCard({ id: 'enemy', leftValue: '1' }), owner: 'PLAYER_2' };
    const card = makeCard({ rightValue: '9', skills: [{ type: 'growing', value: 1 }] });

    const a = GameEngine.computeNextState(state, { type: 'PLACE_CARD', player: 'PLAYER_1', x: 0, y: 0, card });
    const b = GameEngine.computeNextState(state, { type: 'PLACE_CARD', player: 'PLAYER_1', x: 0, y: 0, card });

    expect(JSON.stringify(a.board)).toBe(JSON.stringify(b.board));
    expect(state.board[0][1].owner).toBe('PLAYER_2');
  });
});

describe('SkillEngine targeting defaults', () => {
  it('writes defaults to the canonical fields read by getTargetCells', () => {
    const heal = SkillEngine.translateLegacySkill({ type: 'heal', value: 1 });
    expect(heal.patterns).toEqual([{ value: 'adjacent' }]);
    expect(heal.filter).toBe('allies');

    const growing = SkillEngine.translateLegacySkill({ type: 'growing', value: 1 });
    expect(growing.patterns).toEqual([{ value: 'self' }]);
    expect(growing.trigger).toBe('onEndOfTurn');
  });

  it('never overrides an explicit configuration', () => {
    const t = SkillEngine.translateLegacySkill({
      type: 'heal', value: 1, filter: 'none', patterns: [{ value: 'row' }], trigger: 'onDeath',
    });
    expect(t.patterns).toEqual([{ value: 'row' }]);
    expect(t.filter).toBe('none');
    expect(t.trigger).toBe('onDeath');
  });

  it('maps the offline card data `target` field when unambiguous', () => {
    const t = SkillEngine.translateLegacySkill({ type: 'growing', value: 1, target: 'all_own' });
    expect(t.patterns).toEqual([{ value: 'all' }]);
    expect(t.filter).toBe('allies');

    const unknown = SkillEngine.translateLegacySkill({ type: 'decrease', value: -1, target: 'enemy_with_highest' });
    expect(unknown.patterns).toEqual([{ value: 'self' }]);
    expect(unknown.value).toBe(-1);
  });

  it('decrease does not weaken allies when filtered on enemies', () => {
    const state = GameEngine.createInitialState();
    state.board[1][0] = { data: makeCard({ id: 'ally', topValue: '5' }), owner: 'PLAYER_1' };
    state.board[0][1] = { data: makeCard({ id: 'enemy', leftValue: '9', topValue: '5' }), owner: 'PLAYER_2' };

    const next = GameEngine.computeNextState(state, {
      type: 'PLACE_CARD', player: 'PLAYER_1', x: 0, y: 0,
      card: makeCard({ rightValue: '1', skills: [{ type: 'decrease', value: 2, trigger: 'onEnterPlay', target: 'adjacent_enemy' }] }),
    });

    expect(next.board[1][0].data.topValue).toBe('5');
    expect(next.board[0][1].data.topValue).toBe('3');
  });
});
