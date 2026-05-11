/**
 * Auto-enregistrement de tous les skills dans le registre partagé.
 */
import { skillRegistry, Registry } from './SkillRegistry';
import { TargetType } from './types';
import type { SkillHandler, SkillContext, TargetingStep, SkillTrigger } from './types';

// Import de tous les skill handlers
import turnSkill from './turn';
import healSkill from './heal';
import deathSkill from './death';
import auraSkill from './aura';
import freezeSkill from './freeze';
import sniperSkill from './sniper';
import wardSkill from './ward';
import poisonSkill from './poison';
import comboSkill from './combo';
import bombSkill from './bomb';
import growingSkill from './growing';
import decreaseSkill from './decrease';
import teleportationSkill from './teleportation';

// Enregistrement
const allSkills = [
  turnSkill,
  healSkill,
  deathSkill,
  auraSkill,
  freezeSkill,
  sniperSkill,
  wardSkill,
  poisonSkill,
  comboSkill,
  bombSkill,
  growingSkill,
  decreaseSkill,
  teleportationSkill,
];

allSkills.forEach(skill => skillRegistry.register(skill));
console.log(`[SkillRegistry] Initialized with ${allSkills.length} skills.`);

// Metadata pour le front (noms, descriptions, etc.)
export const SKILL_METADATA = allSkills.reduce((acc, skill) => {
  acc[skill.id] = {
    name: skill.name,
    description: skill.description,
    effectType: skill.effectType
  };
  return acc;
}, {} as Record<string, { name: string, description: string, effectType?: string }>);

import { SECONDARY_SKILLS } from './secondary';

export function getSkillMetadata(skillConfig: any): { name: string, description: string, effectType?: string } {
  const type = typeof skillConfig === 'string' ? skillConfig : skillConfig.type;
  
  if (typeof skillConfig !== 'string') {
    const secondary = SECONDARY_SKILLS.find(s => s.primitiveType === type && s.condition(skillConfig));
    if (secondary) {
      return { name: secondary.name, description: secondary.description, effectType: secondary.effectType };
    }
  }

  return SKILL_METADATA[type] || { name: type, description: '' };
}

// Re-export
export { skillRegistry, Registry, TargetType };
export type { SkillHandler, SkillContext, TargetingStep, SkillTrigger };
export * from './constants';
