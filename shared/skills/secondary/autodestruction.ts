import { SKILL_PATTERNS, SKILL_TRIGGERS, ORIGIN_TYPES } from '../constants';
import type { SecondarySkillDef } from './types';

export const autodestruction: SecondarySkillDef = {
  id: 'autodestruction',
  primitiveType: 'death',
  name: 'Autodestruction',
  description: 'Détruit les cartes adjacentes lors de sa mort.',
  effectType: 'negative',
  condition: (skill) => {
    const hasSquare = skill.patterns?.some((p: any) => (p.value || p) === SKILL_PATTERNS.SQUARE || (p.value || p) === SKILL_PATTERNS.ADJACENT);
    return skill.trigger === SKILL_TRIGGERS.ON_DEATH &&
           skill.range === 1 &&
           hasSquare &&
           (!skill.origin_type || skill.origin_type === ORIGIN_TYPES.SELF);
  }
};
