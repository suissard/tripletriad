import type { SkillHandler } from './types';
import { EFFECT_TYPES } from './constants';

/**
 * Skill: Ward (Bouclier)
 * Effet : Bloque la première capture ou le premier dégât reçu. Consommable.
 */
const handler: SkillHandler = {
  id: 'ward',
  name: 'Bouclier',
  description: 'Bloque la première capture. Consommé après utilisation.',
  effectType: EFFECT_TYPES.POSITIVE,

  /**
   * Appelé avant que cette carte ne soit capturée.
   */
  onBeforeCaptured(ctx: any) {
    const { card, alerts, captures } = ctx;

    alerts.push('WARD!');

    // Consommer le ward
    card.skills = card.skills.filter(s => s.type !== 'ward');

    captures.push({
      ...card,
      event: 'ward_triggered',
      wardedTarget: card.id
    });

    return { prevented: true };
  }
};

export default handler;
