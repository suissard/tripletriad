import { SkillContext } from './types';
import { getTargetCells, getCardSkills } from './helpers.js';
import { effectsMap } from './effects/index.js';
import { SKILL_TRIGGERS } from './constants';
import { DEBUG_SKILLS } from './debug';

function resolvePatterns(skill: any, defaultPattern: string) {
  if (Array.isArray(skill.patterns) && skill.patterns.length > 0) return skill.patterns;
  if (skill.target_pattern) return [{ value: skill.target_pattern }];
  switch (skill.target) {
    case 'self':
    case 'self_on_flip':
      return [{ value: 'self' }];
    case 'all_own':
    case 'all_enemy':
      return [{ value: 'all' }];
    case 'adjacent_friendly':
    case 'adjacent_enemy':
      return [{ value: 'adjacent' }];
    default:
      return [{ value: defaultPattern }];
  }
}

function resolveFilter(skill: any, defaultFilter: string) {
  if (skill.filter) return skill.filter;
  if (skill.target_filter) return skill.target_filter;
  switch (skill.target) {
    case 'allies':
    case 'damaged_friendly':
    case 'adjacent_friendly':
    case 'all_own':
      return 'allies';
    case 'enemies':
    case 'adjacent_enemy':
    case 'all_enemy':
    case 'enemy_on_capture':
    case 'enemy_with_highest':
      return 'enemies';
    case 'self':
    case 'self_on_flip':
      return 'none';
    default:
      return defaultFilter;
  }
}

export function consumeSkillCharge(skillConfig: any): void {
  if (!skillConfig) return;
  if (skillConfig.counter !== undefined && skillConfig.counter > 0) {
    skillConfig.counter--;
    if (skillConfig.counter === 0) skillConfig.depleted = true;
  }
  if (skillConfig.charges !== undefined && skillConfig.charges > 0) {
    skillConfig.charges--;
    if (skillConfig.charges === 0) skillConfig.depleted = true;
  }
}

export class SkillEngine {
  /**
   * Traduit une configuration de skill legacy (type: 'growing', 'heal'...) vers le format
   * modulaire (effect_type + ciblage). Les valeurs par défaut reproduisent le comportement
   * documenté des handlers historiques (growing.ts, decrease.ts, heal.ts...).
   */
  public static translateLegacySkill(skill: any): any {
    if (!skill) return null;

    // Déjà au format modulaire
    if (skill.effect_type) {
      return {
        ...skill,
        patterns: resolvePatterns(skill, 'adjacent'),
        filter: resolveFilter(skill, 'none'),
        charges: skill.charges !== undefined ? skill.charges : skill.counter
      };
    }

    const type = skill.type;
    const translated: any = {
      ...skill,
      charges: skill.charges !== undefined ? skill.charges : skill.counter
    };

    switch (type) {
      case 'bomb':
        translated.effect_type = 'DAMAGE';
        translated.trigger = skill.trigger || SKILL_TRIGGERS.ON_DEATH;
        translated.patterns = resolvePatterns(skill, 'adjacent');
        translated.filter = resolveFilter(skill, 'enemies');
        translated.range = skill.range ?? 1;
        break;

      case 'growing':
        translated.effect_type = 'STAT_MODIFIER';
        translated.value = skill.value !== undefined ? skill.value : 1;
        translated.trigger = skill.trigger || SKILL_TRIGGERS.ON_END_OF_TURN;
        translated.patterns = resolvePatterns(skill, 'self');
        translated.filter = resolveFilter(skill, 'none');
        break;

      case 'decrease':
        translated.effect_type = 'STAT_MODIFIER';
        // Toujours négatif, quel que soit le signe saisi dans la donnée
        translated.value = -(skill.value !== undefined ? Math.abs(skill.value) : 1);
        translated.trigger = skill.trigger || SKILL_TRIGGERS.ON_END_OF_TURN;
        translated.patterns = resolvePatterns(skill, 'self');
        translated.filter = resolveFilter(skill, 'none');
        break;

      case 'heal':
        translated.effect_type = 'HEAL';
        translated.trigger = skill.trigger || SKILL_TRIGGERS.ON_ENTER_PLAY;
        translated.patterns = resolvePatterns(skill, 'adjacent');
        translated.filter = resolveFilter(skill, 'allies');
        break;

      case 'death':
        translated.effect_type = 'DAMAGE';
        translated.trigger = skill.trigger || SKILL_TRIGGERS.ON_ENTER_PLAY;
        translated.patterns = resolvePatterns(skill, 'adjacent');
        translated.filter = resolveFilter(skill, 'enemies');
        break;

      case 'turn':
        translated.effect_type = 'ROTATE';
        translated.value = skill.value !== undefined ? skill.value : 1;
        translated.trigger = skill.trigger || SKILL_TRIGGERS.ON_ENTER_PLAY;
        translated.patterns = resolvePatterns(skill, 'self');
        translated.filter = resolveFilter(skill, 'none');
        break;

      default:
        // Passifs legacy (ward, freeze, aura, sniper, combo, poison, teleportation) :
        // pas d'effect_type → routés par le SkillRegistry vers leur handler natif.
        break;
    }

    return translated;
  }

  /**
   * Executes a single modular skill if trigger matches and charges remain.
   */
  public static dispatchSingle(triggerName: string, ctx: SkillContext, rawSkillConfig: any): any | null {
    const skill = this.translateLegacySkill(rawSkillConfig);
    if (!skill || !skill.effect_type) return null;

    const effectiveTrigger = skill.trigger || skill.defaultTrigger;
    if (effectiveTrigger !== triggerName) return null;

    if (rawSkillConfig.depleted) return null;

    const effectExecutor = effectsMap.get(skill.effect_type);
    if (!effectExecutor) return null;

    const targets = getTargetCells({ ...ctx, skill });
    effectExecutor.execute(ctx, targets, skill.value || 0);
    consumeSkillCharge(rawSkillConfig);
    return { skill, success: true };
  }

  /**
   * Orchestrates the skill activation process for a card at a given trigger hook.
   */
  public static dispatch(triggerName: string, ctx: SkillContext): any[] {
    const results: any[] = [];
    DEBUG_SKILLS && console.log(`[Targeting-Flow] [SkillEngine.ts] dispatch "${triggerName}" on card "${ctx.card?.name || 'unknown'}"`);
    for (const skillConfig of getCardSkills(ctx.card)) {
      const res = this.dispatchSingle(triggerName, ctx, skillConfig);
      if (res) results.push(res);
    }

    return results;
  }
}
