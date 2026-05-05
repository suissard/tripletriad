import { SkillHandler, SkillContext } from './types';

/**
 * Skill: Bomb (Explosion)
 * Inflige des dégâts AoE aux cartes adjacentes à la mort.
 */
import { getTargetCells, getEffectiveHp } from './helpers.js';

const handler: SkillHandler = {
  id: 'bomb',
  name: 'Explosion',
  description: 'Inflige des dégâts aux cartes ciblées à la mort.',
  effectType: 'negative',

  /**
   * Appelé quand la carte porteuse meurt (HP <= 0).
   */
  onDeath(ctx: any) {
    const { skill, alerts, captures, dyingCards } = ctx;

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
