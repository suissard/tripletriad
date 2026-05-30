import type { SkillHandler, SkillContext } from './types';
import { SKILL_TRIGGERS } from './constants';
import { SkillEngine } from './SkillEngine.js';

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
    console.log(`[SkillRegistry] Attempting dispatch: "${hookName}" on card "${ctx.card?.name || 'unknown'}"`);
    if (!ctx.alerts) ctx.alerts = [];
    if (!ctx.captures) ctx.captures = [];
    if (!ctx.dyingCards) ctx.dyingCards = [];
    if (!(ctx as any).attackQueue) (ctx as any).attackQueue = [];

    const results: any[] = [];

    // Run modular skills first via modular SkillEngine
    try {
      const modularResults = SkillEngine.dispatch(hookName as string, ctx);
      results.push(...modularResults);
    } catch (e) {
      console.error('[SkillRegistry] Error running SkillEngine.dispatch:', e);
    }

    const skills = ctx.card?.skills || [];
    
    if (ctx.card?.skillId && !skills.some(s => s.type === ctx.card.skillId)) {
      skills.push({ type: ctx.card.skillId });
    }

    for (const skill of skills) {
      // Skip if already processed by modular SkillEngine (i.e. has effect_type after translation)
      const translated = SkillEngine.translateLegacySkill(skill);
      if (translated && translated.effect_type) {
        continue;
      }

      const handler = this.handlers.get(skill.type);
      if (!handler) continue;

      // Déterminer le trigger effectif du skill
      const effectiveTrigger = skill.trigger || handler.defaultTrigger;

      // Route 1 : Le handler a execute() et le trigger correspond au hook dispatché
      if (handler.execute && effectiveTrigger && effectiveTrigger === hookName) {
        console.log(`[SkillRegistry] Dispatching "${hookName}" via execute() for skill "${skill.type}" (trigger: ${effectiveTrigger}) on card "${ctx.card.name}"`);
        const result = handler.execute({ ...ctx, skill });
        if (result !== undefined) results.push(result);
        continue;
      }

      // Route 2 : Rétro-compatibilité — hook nommé direct (passifs, ward, etc.)
      if (typeof handler[hookName] === 'function') {
        // Pour les handlers avec execute(), ne PAS appel le hook nommé 
        // si le trigger ne correspond pas (évite les doubles exécutions)
        if (handler.execute && effectiveTrigger && effectiveTrigger !== hookName) {
          continue;
        }
        const fn = handler[hookName] as Function;
        console.log(`[SkillRegistry] Dispatching "${hookName}" for skill "${skill.type}" on card "${ctx.card.name}"`);
        const result = fn({ ...ctx, skill });
        if (result !== undefined) results.push(result);
      }
    }


    return results;
  }

  dispatchAny(hookName: keyof SkillHandler, ctx: SkillContext): boolean {
    const skills = ctx.card?.skills || [];
    if (ctx.card?.skillId && !skills.some(s => s.type === ctx.card.skillId)) skills.push({ type: ctx.card.skillId });

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
    const skills = ctx.card?.skills || [];
    if (ctx.card?.skillId && !skills.some(s => s.type === ctx.card.skillId)) skills.push({ type: ctx.card.skillId });
    
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
