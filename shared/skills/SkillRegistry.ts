import type { SkillHandler, SkillContext } from './types';
import { SkillEngine, consumeSkillCharge } from './SkillEngine.js';
import { getCardSkills } from './helpers.js';
import { DEBUG_SKILLS } from './debug';

/**
 * SkillRegistry — Registre central des compétences de cartes.
 * 
 * Chaque skill handler est un objet avec un `id` et des lifecycle hooks optionnels.
 * Le registry dispatche les hooks pour les skills présentes sur une carte donnée.
 */
export class Registry {
  private handlers: Map<string, SkillHandler>;

  constructor() {
    this.handlers = new Map();
  }

  /**
   * Enregistre un skill handler dans le registre.
   */
  register(handler: SkillHandler) {
    if (!handler.id) throw new Error('Skill handler must have an id');
    if (this.handlers.has(handler.id)) {
      console.warn(`[SkillRegistry] Overwriting handler for "${handler.id}"`);
    }
    this.handlers.set(handler.id, handler);
  }

  getHandler(skillType: string): SkillHandler | undefined {
    return this.handlers.get(skillType);
  }

  getAllHandlers(): SkillHandler[] {
    return Array.from(this.handlers.values());
  }

  /**
   * Dispatche un hook pour tous les skills d'une carte.
   * 
   * Logique de résolution (par skill sur la carte) :
   * 1. Si le handler a `execute()` ET que le trigger du skill correspond au hookName → appel execute()
   * 2. Sinon, si le handler a un hook nommé handler[hookName] → appel direct (rétro-compatibilité / passifs)
   * 
   * Cela permet aux skills actifs (growing, decrease, heal, etc.) de respecter le trigger
   * configuré dans Strapi, tout en conservant le fonctionnement natif des passifs (aura, freeze...).
   */
  dispatch(hookName: keyof SkillHandler, ctx: SkillContext): any[] {
    DEBUG_SKILLS && console.log(`[Targeting-Flow] [SkillRegistry.ts] Attempting dispatch: "${hookName}" on card "${ctx.card?.name || 'unknown'}" (at x: ${ctx.x}, y: ${ctx.y}). Context targets:`, JSON.stringify(ctx.targets));
    if (!ctx.alerts) ctx.alerts = [];
    if (!ctx.captures) ctx.captures = [];
    if (!ctx.dyingCards) ctx.dyingCards = [];
    if (!(ctx as any).attackQueue) (ctx as any).attackQueue = [];

    const results: any[] = [];
    // Copie du tableau : ne jamais muter card.skills pendant un dispatch
    const skills = getCardSkills(ctx.card);

    for (const skill of skills) {
      if (skill.depleted) continue;

      // 1. Explicit modular config (from Strapi) -> execute via SkillEngine
      if (skill.effect_type) {
        try {
          const modularResult = SkillEngine.dispatchSingle(hookName as string, ctx, skill);
          if (modularResult) results.push(modularResult);
        } catch (e) {
          console.error('[SkillRegistry] Error running modular skill:', e);
        }
        continue;
      }

      // 2. Registered native/legacy handler on this Registry instance takes precedence
      const handler = this.handlers.get(skill.type);
      if (handler) {
        const effectiveTrigger = skill.trigger || handler.defaultTrigger;

        // Route A: Handler has execute() and trigger matches
        if (handler.execute && effectiveTrigger && effectiveTrigger === hookName) {
          const translatedSkill = SkillEngine.translateLegacySkill(skill);
          const mergedSkill = translatedSkill
            ? { ...skill, patterns: skill.patterns || translatedSkill.patterns, filter: skill.filter || translatedSkill.filter }
            : skill;
          const result = handler.execute({ ...ctx, skill: mergedSkill });
          consumeSkillCharge(skill);
          if (result !== undefined) results.push(result);
          continue;
        }

        // Route B: Named hook (passives, ward, or custom test handlers)
        if (typeof handler[hookName] === 'function') {
          if (handler.execute && effectiveTrigger && effectiveTrigger !== hookName) {
            continue;
          }
          const fn = handler[hookName] as Function;
          const result = fn({ ...ctx, skill });
          consumeSkillCharge(skill);
          if (result !== undefined) results.push(result);
          continue;
        }
        continue;
      }

      // 3. Fallback: translate unknown legacy skill if it maps to a modular effect
      try {
        const modularResult = SkillEngine.dispatchSingle(hookName as string, ctx, skill);
        if (modularResult) results.push(modularResult);
      } catch (e) {
        console.error('[SkillRegistry] Error running translated skill:', e);
      }
    }

    return results;
  }

  dispatchAny(hookName: keyof SkillHandler, ctx: SkillContext): boolean {
    const skills = getCardSkills(ctx.card);

    for (const skill of skills) {
      const handler = this.handlers.get(skill.type);
      if (handler && typeof handler[hookName] === 'function') {
        const fn = handler[hookName] as Function;
        if (fn({ ...ctx, skill })) {
          return true;
        }
      }
    }
    return false;
  }

  dispatchSum(hookName: keyof SkillHandler, ctx: SkillContext): number {
    const skills = getCardSkills(ctx.card);
    
    let sum = 0;
    for (const skill of skills) {
      const handler = this.handlers.get(skill.type);
      if (handler && typeof handler[hookName] === 'function') {
        const fn = handler[hookName] as Function;
        sum += fn({ ...ctx, skill }) || 0;
      }
    }
    return sum;
  }
}

export const skillRegistry = new Registry();
