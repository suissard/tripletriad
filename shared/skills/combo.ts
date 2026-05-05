import { SkillHandler, SkillContext } from './types';

/**
 * Skill: Combo
 * Après une capture, la carte attaque à nouveau ses voisins.
 */
const handler: SkillHandler = {
  id: 'combo',
  name: 'Combo',
  description: 'Après une capture, la carte re-attaque ses voisins.',
  effectType: 'positive',

  /**
   * Retourne true pour indiquer que cette carte peut déclencher
   * un combo après une capture réussie.
   */
  hasCombo(ctx: any) {
    return true;
  }
};

export default handler;
