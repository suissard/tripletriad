import type { SkillHandler } from './types';
import { getTargetCells, getEffectiveHp } from './helpers.js';
import { 
  EFFECT_TYPES, 
  SKILL_TRIGGERS 
} from './constants';

/**
 * Skill: Bomb (Explosion)
 * Effet : Inflige des dégâts AoE aux cartes ciblées.
 * 
 * Trigger variable : par défaut onDeath, mais configurable dans Strapi
 */
const handler: SkillHandler = {
  id: 'bomb',
  name: 'Explosion',
  description: 'Inflige des dégâts aux cartes ciblées (trigger variable).',
  effectType: EFFECT_TYPES.NEGATIVE,
  defaultTrigger: SKILL_TRIGGERS.ON_DEATH,

  execute(ctx: any) {
    const { skill, alerts, captures, dyingCards } = ctx;

    console.log(`[Skill:Bomb] Executing at (${ctx.x},${ctx.y}). Value: ${skill.value} (trigger: ${skill.trigger || 'default'})`);

    alerts.push('BOMB!');
    const targets = getTargetCells(ctx);

    for (const target of targets) {
      const { x: nx, y: ny, cell: adj } = target;
      if (!adj) continue;

      // Vérifier Ward sur la cible
      const adjHasWard = adj.data.skills &&
        adj.data.skills.some(s => s.type === 'ward');

      if (adjHasWard) {
        alerts.push('WARD!');
        adj.data.skills = adj.data.skills.filter(s => s.type !== 'ward');
        captures.push({ ...adj.data, event: 'ward_triggered_bomb' });
      } else {
        let adjHp = getEffectiveHp(adj.data) - skill.value;

        if (adjHp <= 0) {
          dyingCards.push({ x: nx, y: ny, cell: adj });
          ctx.board[ny][nx] = null;
          captures.push({ ...adj.data, dead: true, event: 'bomb_death' });
        } else {
          adj.data.hp = adjHp;
          ctx.board[ny][nx] = { data: adj.data, owner: adj.owner };
          captures.push({ ...adj.data, event: 'bomb_damage' });
        }
      }
    }
  }
};

export default handler;
