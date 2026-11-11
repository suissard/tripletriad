import { SkillContext } from './types';
import { getTargetCells, getCardSkills } from './helpers.js';
import { effectsMap } from './effects/index.js';
import { SKILL_PATTERNS, SKILL_FILTERS, SKILL_TRIGGERS } from './constants';
import { DEBUG_SKILLS } from './debug';

/**
 * Traduction du champ `target` présent dans les données de cartes offline
 * (shared/data/cards/*.json) vers les champs canoniques `patterns` / `filter`.
 * Seules les cibles non ambiguës sont traduites ; les autres (sélection par stat,
 * conditions de déclenchement...) retombent sur les valeurs par défaut du skill.
 */
const LEGACY_TARGET_MAP: Record<string, { pattern: string, filter?: string }> = {
  self:              { pattern: SKILL_PATTERNS.SELF },
  all_own:           { pattern: SKILL_PATTERNS.ALL, filter: SKILL_FILTERS.ALLIES },
  all_enemy:         { pattern: SKILL_PATTERNS.ALL, filter: SKILL_FILTERS.ENEMIES },
  adjacent_friendly: { pattern: SKILL_PATTERNS.ADJACENT, filter: SKILL_FILTERS.ALLIES },
  adjacent_enemy:    { pattern: SKILL_PATTERNS.ADJACENT, filter: SKILL_FILTERS.ENEMIES },
};

/**
 * Applique les valeurs de ciblage par défaut SANS écraser la configuration explicite
 * (Strapi / éditeur admin). Les champs lus par getTargetCells sont `patterns` et `filter`.
 */
function withTargetingDefaults(skill: any, defaultPattern: string, defaultFilter?: string) {
  const hasPatterns = Array.isArray(skill.patterns) && skill.patterns.length > 0;
  const mapped = skill.target ? LEGACY_TARGET_MAP[skill.target] : undefined;

  const result: any = {};
  if (!hasPatterns) {
    result.patterns = [{ value: skill.target_pattern || mapped?.pattern || defaultPattern }];
  }
  const filter = skill.filter || skill.target_filter || mapped?.filter || defaultFilter;
  if (filter) result.filter = filter;
  return result;
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
        translated.trigger = skill.trigger || SKILL_TRIGGERS.ON_DEATH;
        Object.assign(translated, withTargetingDefaults(skill, SKILL_PATTERNS.ADJACENT));
        break;

      case 'growing':
        translated.effect_type = 'STAT_MODIFIER';
        translated.value = skill.value !== undefined ? skill.value : 1;
        translated.trigger = skill.trigger || SKILL_TRIGGERS.ON_END_OF_TURN;
        Object.assign(translated, withTargetingDefaults(skill, SKILL_PATTERNS.SELF));
        break;

      case 'decrease':
        translated.effect_type = 'STAT_MODIFIER';
        // Toujours négatif, quel que soit le signe saisi dans la donnée
        translated.value = -(skill.value !== undefined ? Math.abs(skill.value) : 1);
        translated.trigger = skill.trigger || SKILL_TRIGGERS.ON_END_OF_TURN;
        Object.assign(translated, withTargetingDefaults(skill, SKILL_PATTERNS.SELF));
        break;

      case 'heal':
        translated.effect_type = 'HEAL';
        translated.trigger = skill.trigger || SKILL_TRIGGERS.ON_ENTER_PLAY;
        Object.assign(translated, withTargetingDefaults(skill, SKILL_PATTERNS.ADJACENT, SKILL_FILTERS.ALLIES));
        break;

      case 'death':
        translated.effect_type = 'DAMAGE';
        translated.trigger = skill.trigger || SKILL_TRIGGERS.ON_ENTER_PLAY;
        Object.assign(translated, withTargetingDefaults(skill, SKILL_PATTERNS.ADJACENT));
        break;

      case 'turn':
        translated.effect_type = 'ROTATE';
        translated.value = skill.value !== undefined ? skill.value : 1;
        translated.trigger = skill.trigger || SKILL_TRIGGERS.ON_ENTER_PLAY;
        Object.assign(translated, withTargetingDefaults(skill, SKILL_PATTERNS.SELF));
        break;

      default:
        // Passifs legacy (ward, freeze, aura, sniper, combo, poison, teleportation) :
        // pas d'effect_type → routés par le SkillRegistry vers leur handler natif.
        break;
    }

    return translated;
  }

  /**
   * Orchestre l'activation des skills modulaires d'une carte pour un trigger donné.
   */
  public static dispatch(triggerName: string, ctx: SkillContext): any[] {
    DEBUG_SKILLS && console.log(`[Targeting-Flow] [SkillEngine.ts] dispatch "${triggerName}" on card "${ctx.card?.name || 'unknown'}"`);
    const results: any[] = [];

    for (const skillConfig of getCardSkills(ctx.card)) {
      // 1. Traduction legacy → modulaire
      const skill = this.translateLegacySkill(skillConfig);
      if (!skill) continue;

      // 2. Validation du timing
      const effectiveTrigger = skill.trigger || skill.defaultTrigger;
      if (effectiveTrigger !== triggerName) continue;

      // 3. Charges : 0 = infini. On saute uniquement si épuisé.
      if (skillConfig.depleted) {
        DEBUG_SKILLS && console.log(`[Targeting-Flow] [SkillEngine.ts] Skill "${skill.effect_type || skill.type}" depleted. Skipping.`);
        continue;
      }

      // 4. Exécuteur d'effet (stratégie)
      const effectExecutor = skill.effect_type ? effectsMap.get(skill.effect_type) : null;
      if (!effectExecutor) continue; // Passif natif → routé par le SkillRegistry

      // 5. Ciblage
      const targets = getTargetCells({ ...ctx, skill });
      DEBUG_SKILLS && console.log(`[Targeting-Flow] [SkillEngine.ts] "${effectExecutor.id}" via "${triggerName}" → targets:`, JSON.stringify(targets.map(t => [t.x, t.y])));

      // 6. Exécution
      effectExecutor.execute(ctx, targets, skill.value || 0);

      // 7. Consommation d'une charge
      if (skillConfig.counter !== undefined && skillConfig.counter > 0) {
        skillConfig.counter--;
        if (skillConfig.counter === 0) skillConfig.depleted = true;
      }
      if (skillConfig.charges !== undefined && skillConfig.charges > 0) {
        skillConfig.charges--;
        if (skillConfig.charges === 0) skillConfig.depleted = true;
      }

      results.push({ skill, success: true });
    }

    return results;
  }
}
