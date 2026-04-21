/**
 * Auto-enregistrement de tous les skills dans le registre.
 * 
 * Pour ajouter un nouveau skill :
 * 1. Créer un fichier dans ce dossier (ex: mySkill.js)
 * 2. L'importer ici et l'enregistrer avec registry.register()
 */
import { SkillRegistry } from './SkillRegistry.js';

// Import de tous les skill handlers
import turnSkill from './turn.js';
import healSkill from './heal.js';
import deathSkill from './death.js';
import auraSkill from './aura.js';
import freezeSkill from './freeze.js';
import sniperSkill from './sniper.js';
import wardSkill from './ward.js';
import poisonSkill from './poison.js';
import comboSkill from './combo.js';
import bombSkill from './bomb.js';
import growingSkill from './growing.js';
import decreaseSkill from './decrease.js';

// Création et export du registre singleton
export const skillRegistry = new SkillRegistry();

// Enregistrement de tous les skills
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
];

allSkills.forEach(skill => skillRegistry.register(skill));

// Re-export pour commodité
export { SkillRegistry } from './SkillRegistry.js';
