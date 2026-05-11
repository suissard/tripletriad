import type { SkillHandler } from './types';
import { EFFECT_TYPES } from './constants';

/**
 * Skill: Aura
 * Effet : Booste les valeurs de combat des cartes alliées adjacentes.
 */
const handler: SkillHandler = {
  id: 'aura',
  name: 'Aura',
  description: 'Booste les valeurs des alliés adjacents.',
  effectType: EFFECT_TYPES.POSITIVE,

  /**
   * Retourne le bonus de valeur que cette carte confère à un allié adjacent.
   */
  getValueModifier(ctx: any) {
    return ctx.skill.value || 0;
  }
};

export default handler;
