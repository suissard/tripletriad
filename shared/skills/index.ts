/**
 * Auto-enregistrement de tous les skills dans le registre partagé.
 */
import { skillRegistry, Registry } from './SkillRegistry';
import { TargetType, SkillHandler, SkillContext, TargetingStep } from './types';

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

// Re-export
export { skillRegistry, Registry, TargetType };
export type { SkillHandler, SkillContext, TargetingStep };
