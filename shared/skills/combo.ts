import type { SkillHandler } from './types';
import { EFFECT_TYPES } from './constants';

/**
 * Skill: Combo
 * Effet : Après une capture, la carte attaque à nouveau ses voisins.
 */
const handler: SkillHandler = {
  id: 'combo',
  name: 'Combo',
  description: 'Après une capture, la carte re-attaque ses voisins.',
  effectType: EFFECT_TYPES.POSITIVE,

  /**
   * Retourne true pour indiquer que cette carte peut déclencher
   * un combo après une capture réussie.
   */
  hasCombo(ctx: any) {
    return true;
  }
};

export default handler;
