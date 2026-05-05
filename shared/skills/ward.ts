import { SkillHandler, SkillContext } from './types';

/**
 * Skill: Ward (Bouclier)
 * Bloque la première capture ou le premier dégât reçu. Consommable.
 */
const handler: SkillHandler = {
  id: 'ward',
  name: 'Bouclier',
  description: 'Bloque la première capture. Consommé après utilisation.',
  effectType: 'positive',

  /**
   * Appelé avant que cette carte ne soit capturée.
   * Retourne { prevented: true } pour bloquer la capture.
   * Le ward est consommé (retiré des skills de la carte).
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
