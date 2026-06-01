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
    console.log(`[Targeting-Flow] [SkillEngine.ts] dispatch called for trigger: "${triggerName}" on card: "${ctx.card?.name || 'unknown'}"`);
    const results: any[] = [];
    const skills = ctx.card?.skills || [];

    // Ensure backwards compatibility with single skillId field
    if (ctx.card?.skillId && !skills.some(s => s.type === ctx.card.skillId)) {
      console.log(`[Targeting-Flow] [SkillEngine.ts] Card has legacy skillId "${ctx.card.skillId}". Adding to list.`);
      skills.push({ type: ctx.card.skillId });
    }

    for (const skillConfig of skills) {
      // 1. Translate legacy structure to modular structure
      const skill = this.translateLegacySkill(skillConfig);
      console.log(`[Targeting-Flow] [SkillEngine.ts] Translated skill config for "${skillConfig.type}":`, JSON.stringify(skill));
      if (!skill) continue;

      // 2. Validate trigger timing
      const effectiveTrigger = skill.trigger || skill.defaultTrigger;
      console.log(`[Targeting-Flow] [SkillEngine.ts] Skill "${skillConfig.type}" effectiveTrigger is "${effectiveTrigger}" (compared to triggerName: "${triggerName}")`);
      if (effectiveTrigger !== triggerName) continue;

      // 3. Handle charges (charges/counter state)
      // A charge of 0 represents infinite charges. Skip ONLY if depleted (meaning it had charges > 0 but has reached 0).
      if (skillConfig.depleted) {
        console.log(`[Targeting-Flow] [SkillEngine.ts] Skill "${skill.effect_type || skill.type}" has 0 charges remaining (depleted). Skipping.`);
        continue;
      }

      // 4. Load the Strategy Effect Executor
      const effectExecutor = skill.effect_type ? effectsMap.get(skill.effect_type) : null;
      console.log(`[Targeting-Flow] [SkillEngine.ts] effectExecutor found for effect_type "${skill.effect_type}":`, effectExecutor ? `Yes (ID: ${effectExecutor.id})` : 'No');

      if (effectExecutor) {
        console.log(`[Targeting-Flow] [SkillEngine.ts] Executing modular effect "${effectExecutor.id}" via "${triggerName}" on card "${ctx.card?.name || 'unknown'}"`);
        
        // 5. Compute geo-targeting cells using robust engine
        const targets = getTargetCells({ ...ctx, skill });
        console.log(`[Targeting-Flow] [SkillEngine.ts] getTargetCells returned targets:`, JSON.stringify(targets));

        // 6. Execute the modular effect
        console.log(`[Targeting-Flow] [SkillEngine.ts] Calling effectExecutor.execute for "${effectExecutor.id}" with value ${skill.value || 0}`);
        effectExecutor.execute(ctx, targets, skill.value || 0);

        // 7. Consume a charge
        if (skillConfig.counter !== undefined && skillConfig.counter > 0) {
          skillConfig.counter--;
          console.log(`[Targeting-Flow] [SkillEngine.ts] Decremented skillConfig.counter to ${skillConfig.counter}`);
          if (skillConfig.counter === 0) {
            skillConfig.depleted = true;
          }
        }
        if (skillConfig.charges !== undefined && skillConfig.charges > 0) {
          skillConfig.charges--;
          console.log(`[Targeting-Flow] [SkillEngine.ts] Decremented skillConfig.charges to ${skillConfig.charges}`);
          if (skillConfig.charges === 0) {
            skillConfig.depleted = true;
          }
        }

        results.push({ skill, success: true });
      } else {
        console.log(`[Targeting-Flow] [SkillEngine.ts] No modular effectExecutor found for skill type "${skill.type}". Letting registry route it natively.`);
      }
    }

    return results;
  }
}
