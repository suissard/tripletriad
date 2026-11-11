import type { SkillHandler, SkillContext } from './types';
import { SKILL_TRIGGERS } from './constants';
import { SkillEngine } from './SkillEngine.js';
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

    // Run modular skills first via modular SkillEngine
    try {
      DEBUG_SKILLS && console.log(`[Targeting-Flow] [SkillRegistry.ts] Handing off to SkillEngine.dispatch for hook "${hookName}"`);
      const modularResults = SkillEngine.dispatch(hookName as string, ctx);
      DEBUG_SKILLS && console.log(`[Targeting-Flow] [SkillRegistry.ts] SkillEngine.dispatch completed. Modular results:`, JSON.stringify(modularResults));
      results.push(...modularResults);
    } catch (e) {
      console.error('[Targeting-Flow] [SkillRegistry.ts] Error running SkillEngine.dispatch:', e);
    }

    // Copie du tableau : ne jamais muter card.skills pendant un dispatch
    const skills = getCardSkills(ctx.card);
    DEBUG_SKILLS && console.log(`[Targeting-Flow] [SkillRegistry.ts] Evaluating legacy/native skills on card:`, JSON.stringify(skills));

    for (const skill of skills) {
      // Skip if already processed by modular SkillEngine (i.e. has effect_type after translation)
      const translated = SkillEngine.translateLegacySkill(skill);
      DEBUG_SKILLS && console.log(`[Targeting-Flow] [SkillRegistry.ts] Skill "${skill.type}" translated:`, JSON.stringify(translated));
      if (translated && translated.effect_type) {
        DEBUG_SKILLS && console.log(`[Targeting-Flow] [SkillRegistry.ts] Skill "${skill.type}" already processed as modular. Skipping.`);
        continue;
      }

      const handler = this.handlers.get(skill.type);
      if (!handler) {
        DEBUG_SKILLS && console.log(`[Targeting-Flow] [SkillRegistry.ts] No handler registered for skill type "${skill.type}". skipping.`);
        continue;
      }

      // Déterminer le trigger effectif du skill
      const effectiveTrigger = skill.trigger || handler.defaultTrigger;
      DEBUG_SKILLS && console.log(`[Targeting-Flow] [SkillRegistry.ts] Skill "${skill.type}" handler defaultTrigger: "${handler.defaultTrigger}", configured trigger: "${skill.trigger}". Effective trigger is "${effectiveTrigger}".`);

      // Route 1 : Le handler a execute() et le trigger correspond au hook dispatché
      if (handler.execute && effectiveTrigger && effectiveTrigger === hookName) {
        DEBUG_SKILLS && console.log(`[Targeting-Flow] [SkillRegistry.ts] Dispatching "${hookName}" via execute() for skill "${skill.type}" (trigger: ${effectiveTrigger}) on card "${ctx.card.name}"`);
        const result = handler.execute({ ...ctx, skill });
        if (result !== undefined) results.push(result);
        continue;
      }

      // Route 2 : Rétro-compatibilité — hook nommé direct (passifs, ward, etc.)
      if (typeof handler[hookName] === 'function') {
        // Pour les handlers avec execute(), ne PAS appel le hook nommé 
        // si le trigger ne correspond pas (évite les doubles exécutions)
        if (handler.execute && effectiveTrigger && effectiveTrigger !== hookName) {
          DEBUG_SKILLS && console.log(`[Targeting-Flow] [SkillRegistry.ts] Handler has execute() and trigger does not match hookName. Skipping hook execution for "${hookName}".`);
          continue;
        }
        const fn = handler[hookName] as Function;
        DEBUG_SKILLS && console.log(`[Targeting-Flow] [SkillRegistry.ts] Dispatching "${hookName}" for skill "${skill.type}" on card "${ctx.card.name}"`);
        const result = fn({ ...ctx, skill });
        if (result !== undefined) results.push(result);
      } else {
        DEBUG_SKILLS && console.log(`[Targeting-Flow] [SkillRegistry.ts] No named hook function for "${hookName}" on skill "${skill.type}" handler.`);
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
