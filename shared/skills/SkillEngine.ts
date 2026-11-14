import { SkillContext } from './types';
import { getTargetCells } from './helpers.js';
import { effectsMap } from './effects/index.js';

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
   * Translates a legacy skill configuration to the modular architecture format.
   */
  public static translateLegacySkill(skill: any): any {
    if (!skill) return null;

    // If it already has effect_type, it's already in the modular format!
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
        translated.trigger = skill.trigger || 'onDeath';
        translated.patterns = resolvePatterns(skill, 'adjacent');
        translated.filter = resolveFilter(skill, 'enemies');
        translated.range = skill.range ?? 1;
        break;

      case 'growing':
        translated.effect_type = 'STAT_MODIFIER';
        translated.value = skill.value !== undefined ? skill.value : 1;
        translated.trigger = skill.trigger || 'onEndOfTurn';
        translated.patterns = resolvePatterns(skill, 'self');
        translated.filter = resolveFilter(skill, 'none');
        break;

      case 'decrease':
        translated.effect_type = 'STAT_MODIFIER';
        translated.value = -(skill.value !== undefined ? Math.abs(skill.value) : 1);
        translated.trigger = skill.trigger || 'onEndOfTurn';
        translated.patterns = resolvePatterns(skill, 'self');
        translated.filter = resolveFilter(skill, 'none');
        break;

      case 'heal':
        translated.effect_type = 'HEAL';
        translated.trigger = skill.trigger || 'onEnterPlay';
        translated.patterns = resolvePatterns(skill, 'adjacent');
        translated.filter = resolveFilter(skill, 'allies');
        break;

      case 'death':
        translated.effect_type = 'DAMAGE';
        translated.trigger = skill.trigger || 'onEnterPlay';
        translated.patterns = resolvePatterns(skill, 'adjacent');
        translated.filter = resolveFilter(skill, 'enemies');
        break;

      case 'turn':
        translated.effect_type = 'ROTATE';
        translated.value = skill.value !== undefined ? skill.value : 1;
        translated.trigger = skill.trigger || 'onEnterPlay';
        translated.patterns = resolvePatterns(skill, 'self');
        translated.filter = resolveFilter(skill, 'none');
        break;

      default:
        // Other legacy passives (ward, freeze, aura, sniper, combo, poison) keep their type
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
    const skills = [...(ctx.card?.skills || [])];

    if (ctx.card?.skillId && !skills.some(s => s.type === ctx.card.skillId)) {
      skills.push({ type: ctx.card.skillId });
    }

    for (const skillConfig of skills) {
      const res = this.dispatchSingle(triggerName, ctx, skillConfig);
      if (res) results.push(res);
    }

    return results;
  }
}
