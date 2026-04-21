/**
 * SkillRegistry — Registre central des compétences de cartes.
 * 
 * Chaque skill handler est un objet avec un `id` et des lifecycle hooks optionnels.
 * Le registry dispatche les hooks pour les skills présentes sur une carte donnée.
 */
export class SkillRegistry {
  constructor() {
    /** @type {Map<string, object>} */
    this.handlers = new Map();
  }

  /**
   * Enregistre un skill handler dans le registre.
   * @param {object} handler - Objet avec au minimum { id: string }
   */
  register(handler) {
    if (!handler.id) throw new Error('Skill handler must have an id');
    if (this.handlers.has(handler.id)) {
      console.warn(`[SkillRegistry] Overwriting handler for "${handler.id}"`);
    }
    this.handlers.set(handler.id, handler);
  }

  /**
   * Retourne le handler pour un type de skill donné.
   * @param {string} skillType
   * @returns {object|undefined}
   */
  getHandler(skillType) {
    return this.handlers.get(skillType);
  }

  /**
   * Retourne tous les handlers enregistrés.
   * @returns {object[]}
   */
  getAllHandlers() {
    return Array.from(this.handlers.values());
  }

  /**
   * Dispatche un hook pour tous les skills d'une carte.
   * Retourne un tableau de résultats (undefined exclus).
   * 
   * @param {string} hookName - Nom du lifecycle hook
   * @param {object} ctx - Contexte contenant au minimum { card }
   * @returns {Array} Résultats de chaque handler
   */
  dispatch(hookName, ctx) {
    const skills = ctx.card?.skills || [];
    const results = [];

    for (const skill of skills) {
      const handler = this.handlers.get(skill.type);
      if (handler && typeof handler[hookName] === 'function') {
        const result = handler[hookName]({ ...ctx, skill });
        if (result !== undefined) {
          results.push(result);
        }
      }
    }

    return results;
  }

  /**
   * Dispatche un hook et retourne true si au moins un handler retourne true.
   * Utile pour les hooks booléens (ex: blocksCombo, extendsAttackRange).
   * 
   * @param {string} hookName
   * @param {object} ctx
   * @returns {boolean}
   */
  dispatchAny(hookName, ctx) {
    const skills = ctx.card?.skills || [];

    for (const skill of skills) {
      const handler = this.handlers.get(skill.type);
      if (handler && typeof handler[hookName] === 'function') {
        if (handler[hookName]({ ...ctx, skill })) {
          return true;
        }
      }
    }

    return false;
  }

  /**
   * Dispatche un hook et somme les résultats numériques.
   * Utile pour les modificateurs de valeur (ex: getValueModifier).
   * 
   * @param {string} hookName
   * @param {object} ctx
   * @returns {number}
   */
  dispatchSum(hookName, ctx) {
    const skills = ctx.card?.skills || [];
    let sum = 0;

    for (const skill of skills) {
      const handler = this.handlers.get(skill.type);
      if (handler && typeof handler[hookName] === 'function') {
        sum += handler[hookName]({ ...ctx, skill }) || 0;
      }
    }

    return sum;
  }
}
