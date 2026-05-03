import { SkillHandler, SkillContext } from './types';

/**
 * Skill: Aura
 * Booste les valeurs de combat des cartes alliées adjacentes.
 * 
 * Ce hook est appelé sur les VOISINS de la carte évaluée,
 * pour vérifier si elle bénéficie d'un bonus d'aura.
 */
const handler: SkillHandler = {
  id: 'aura',
  name: 'Aura',
  description: 'Booste les valeurs des alliés adjacents.',

  /**
   * Retourne le bonus de valeur que cette carte confère à un allié adjacent.
   * Appelé par getEffectiveValue sur chaque voisin allié.
   */
  getValueModifier(ctx: any) {
    return ctx.skill.value || 0;
  }
};

export default handler;
