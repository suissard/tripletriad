import { SkillHandler, SkillContext } from './types';

/**
 * Skill: Combo
 * Effet : Après une capture, la carte attaque à nouveau ses voisins, déclenchant potentiellement des captures en chaîne.
 * 
 * Exemple Strapi :
 * {
 *   "type": "combo",
 *   "trigger": "passive"
 * }
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
