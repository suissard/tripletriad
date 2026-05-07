import { SkillHandler, SkillContext } from './types';

/**
 * Skill: Aura
 * Effet : Booste les valeurs de combat des cartes alliées adjacentes.
 * 
 * Exemple Strapi :
 * {
 *   "type": "aura",
 *   "value": 2,
 *   "trigger": "passive",
 *   "origin_type": "self",
 *   "patterns": [{ "value": "adjacent" }],
 *   "filter": "allies"
 * }
 */
const handler: SkillHandler = {
  id: 'aura',
  name: 'Aura',
  description: 'Booste les valeurs des alliés adjacents.',
  effectType: 'positive',

  /**
   * Retourne le bonus de valeur que cette carte confère à un allié adjacent.
   * Appelé par getEffectiveValue sur chaque voisin allié.
   */
  getValueModifier(ctx: any) {
    return ctx.skill.value || 0;
  }
};

export default handler;
