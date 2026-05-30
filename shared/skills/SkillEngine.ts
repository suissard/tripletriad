import { SkillContext } from './types';
import { getTargetCells } from './helpers.js';
import { effectsMap } from './effects/index.js';

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
        charges: skill.charges !== undefined ? skill.charges : (skill.counter !== undefined ? skill.counter : undefined)
      };
    }

    const type = skill.type;
    const translated: any = {
      ...skill,
      charges: skill.counter !== undefined ? skill.counter : undefined
    };

    switch (type) {
      case 'bomb':
        translated.effect_type = 'DAMAGE';
        translated.trigger = skill.trigger || 'onDeath';
        translated.target_pattern = 'adjacent';
        translated.target_filter = 'enemies';
        translated.range = 1;
        break;

      case 'growing':
        translated.effect_type = 'STAT_MODIFIER';
        translated.value = skill.value !== undefined ? skill.value : 1;
        translated.trigger = skill.trigger || 'onEndOfTurn';
        translated.target_pattern = 'self';
        break;

      case 'decrease':
        translated.effect_type = 'STAT_MODIFIER';
        // Negate value for decreasing stats
        translated.value = -(skill.value !== undefined ? Math.abs(skill.value) : 1);
        translated.trigger = skill.trigger || 'onEnterPlay';
        translated.target_pattern = 'adjacent';
        translated.target_filter = 'enemies';
        break;

      case 'heal':
        translated.effect_type = 'HEAL';
        translated.trigger = skill.trigger || 'onEnterPlay';
        translated.target_pattern = 'adjacent';
        translated.target_filter = 'allies';
        break;

      case 'death':
        translated.effect_type = 'DAMAGE';
        translated.trigger = skill.trigger || 'onEnterPlay';
        translated.target_pattern = 'adjacent';
        translated.target_filter = 'enemies';
        break;

      case 'turn':
        translated.effect_type = 'ROTATE';
        translated.value = skill.value !== undefined ? skill.value : 1;
        translated.trigger = skill.trigger || 'onEnterPlay';
        translated.target_pattern = 'self';
        break;

      default:
        // Other legacy passives (ward, freeze, aura, sniper, combo, poison) keep their type and default trigger
        break;
    }

    return translated;
  }

  /**
   * Orchestrates the skill activation process for a card at a given trigger hook.
   */
  public static dispatch(triggerName: string, ctx: SkillContext): any[] {
    const results: any[] = [];
    const skills = ctx.card?.skills || [];

    // Ensure backwards compatibility with single skillId field
    if (ctx.card?.skillId && !skills.some(s => s.type === ctx.card.skillId)) {
      skills.push({ type: ctx.card.skillId });
    }

    for (const skillConfig of skills) {
      // 1. Translate legacy structure to modular structure
      const skill = this.translateLegacySkill(skillConfig);
      if (!skill) continue;

      // 2. Validate trigger timing
      const effectiveTrigger = skill.trigger || skill.defaultTrigger;
      if (effectiveTrigger !== triggerName) continue;

      // 3. Handle charges (charges/counter state)
      // A charge of 0 represents infinite charges. Skip ONLY if depleted (meaning it had charges > 0 but has reached 0).
      if (skillConfig.depleted) {
        console.log(`[SkillEngine] Skill "${skill.effect_type || skill.type}" has 0 charges remaining (depleted). Skipping.`);
        continue;
      }

      // 4. Load the Strategy Effect Executor
      const effectExecutor = skill.effect_type ? effectsMap.get(skill.effect_type) : null;

      if (effectExecutor) {
        console.log(`[SkillEngine] Executing modular effect "${effectExecutor.id}" via "${triggerName}" on card "${ctx.card?.name || 'unknown'}"`);
        
        // 5. Compute geo-targeting cells using robust engine
        const targets = getTargetCells({ ...ctx, skill });

        // 6. Execute the modular effect
        effectExecutor.execute(ctx, targets, skill.value || 0);

        // 7. Consume a charge
        if (skillConfig.counter !== undefined && skillConfig.counter > 0) {
          skillConfig.counter--;
          if (skillConfig.counter === 0) {
            skillConfig.depleted = true;
          }
        }
        if (skillConfig.charges !== undefined && skillConfig.charges > 0) {
          skillConfig.charges--;
          if (skillConfig.charges === 0) {
            skillConfig.depleted = true;
          }
        }

        results.push({ skill, success: true });
      } else {
        // Fallback for non-modular/passive behaviors that might have direct registry hooks
        // e.g. aura, freeze, ward, combo, sniper, poison.
        // These will be routed as normal.
      }
    }

    return results;
  }
}
