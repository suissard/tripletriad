import { SkillHandler, SkillContext } from './types';

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
   */
  dispatch(hookName: keyof SkillHandler, ctx: SkillContext): any[] {
    console.log(`[SkillRegistry] Attempting dispatch: "${hookName}" on card "${ctx.card?.name || 'unknown'}"`);
    // Dans le GameEngine, la carte a `skills` (tableau de définitions)
    // On suppose que card.skills est un tableau du type [{ type: 'growing', value: 2 }, ...] 
    // ou bien on utilise card.skillId si c'est un skill unique. Pour être rétro-compatible :
    const skills = ctx.card?.skills || [];
    
    // Note: Pour supporter la nouvelle implémentation de targetting via `skillId` :
    if (ctx.card?.skillId && !skills.some(s => s.type === ctx.card.skillId)) {
      skills.push({ type: ctx.card.skillId });
    }

    const results: any[] = [];

    for (const skill of skills) {
      const handler = this.handlers.get(skill.type);
      if (handler && typeof handler[hookName] === 'function') {
        const fn = handler[hookName] as Function;
        console.log(`[SkillRegistry] Dispatching "${hookName}" for skill "${skill.type}" on card "${ctx.card.name}"`);
        const result = fn({ ...ctx, skill });
        if (result !== undefined) {
          results.push(result);
        }
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
