import { describe, it, expect, beforeEach } from 'vitest';
import { SkillRegistry } from '../src/game/skills/SkillRegistry.js';

describe('SkillRegistry', () => {
  let registry;

  beforeEach(() => {
    registry = new SkillRegistry();
  });

  it('should register and retrieve a handler', () => {
    const handler = { id: 'test_skill', onEnterPlay: () => 'entered' };
    registry.register(handler);
    expect(registry.getHandler('test_skill')).toBe(handler);
  });

  it('should throw if handler has no id', () => {
    expect(() => registry.register({})).toThrow('must have an id');
  });

  it('should dispatch hooks for card skills', () => {
    const results = [];
    registry.register({
      id: 'heal',
      onEnterPlay(ctx) { results.push(`heal:${ctx.skill.value}`); return 'healed'; }
    });
    registry.register({
      id: 'death',
      onEnterPlay(ctx) { results.push(`death:${ctx.skill.value}`); return 'killed'; }
    });

    const ctx = {
      card: {
        skills: [
          { type: 'heal', value: 2 },
          { type: 'death', value: 1 }
        ]
      },
      board: [], x: 0, y: 0
    };

    const dispatched = registry.dispatch('onEnterPlay', ctx);
    expect(results).toEqual(['heal:2', 'death:1']);
    expect(dispatched).toEqual(['healed', 'killed']);
  });

  it('should skip skills without matching handler', () => {
    registry.register({
      id: 'heal',
      onEnterPlay() { return 'healed'; }
    });

    const ctx = {
      card: {
        skills: [
          { type: 'heal', value: 1 },
          { type: 'unknown_skill', value: 5 }
        ]
      }
    };

    const dispatched = registry.dispatch('onEnterPlay', ctx);
    expect(dispatched).toEqual(['healed']);
  });

  it('should skip hooks not implemented by handler', () => {
    registry.register({
      id: 'heal',
      onEnterPlay() { return 'entered'; }
      // No onEndOfTurn
    });

    const ctx = { card: { skills: [{ type: 'heal', value: 1 }] } };
    const dispatched = registry.dispatch('onEndOfTurn', ctx);
    expect(dispatched).toEqual([]);
  });

  it('dispatchAny should return true if any skill matches', () => {
    registry.register({
      id: 'sniper',
      extendsAttackRange() { return true; }
    });
    registry.register({
      id: 'heal',
      // No extendsAttackRange
    });

    const ctx = {
      card: {
        skills: [
          { type: 'heal', value: 1 },
          { type: 'sniper', value: 1 }
        ]
      }
    };

    expect(registry.dispatchAny('extendsAttackRange', ctx)).toBe(true);
  });

  it('dispatchAny should return false if no skill matches', () => {
    registry.register({ id: 'heal' });

    const ctx = { card: { skills: [{ type: 'heal', value: 1 }] } };
    expect(registry.dispatchAny('extendsAttackRange', ctx)).toBe(false);
  });

  it('dispatchSum should accumulate numeric results', () => {
    registry.register({
      id: 'aura',
      getValueModifier(ctx) { return ctx.skill.value; }
    });

    const ctx = {
      card: {
        skills: [
          { type: 'aura', value: 2 },
          { type: 'aura', value: 3 }
        ]
      }
    };

    expect(registry.dispatchSum('getValueModifier', ctx)).toBe(5);
  });

  it('should handle cards with no skills gracefully', () => {
    const ctx = { card: { skills: [] } };
    expect(registry.dispatch('onEnterPlay', ctx)).toEqual([]);
    expect(registry.dispatchAny('blocksCombo', ctx)).toBe(false);
    expect(registry.dispatchSum('getValueModifier', ctx)).toBe(0);

    const ctxNoSkills = { card: {} };
    expect(registry.dispatch('onEnterPlay', ctxNoSkills)).toEqual([]);
  });
});
