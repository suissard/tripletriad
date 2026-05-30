import type { Effect } from './Effect';
import type { SkillContext } from '../types';
import { getEffectiveHp } from '../helpers.js';

export const damageEffect: Effect = {
  id: 'DAMAGE',
  
  execute(ctx, targets, value) {
    const { board, alerts, captures, dyingCards } = ctx;
    if (!alerts || !captures || !dyingCards) return;

    for (const target of targets) {
      const { x: nx, y: ny, cell: adj } = target;
      if (!adj || !adj.data) continue;

      // Check Ward (both legacy and new format)
      const adjHasWard = adj.data.skills &&
        adj.data.skills.some((s: any) => s.type === 'ward' || s.effect_type === 'WARD');

      if (adjHasWard) {
        alerts.push('WARD!');
        adj.data.skills = adj.data.skills.filter((s: any) => s.type !== 'ward' && s.effect_type !== 'WARD');
        captures.push({ ...adj.data, event: 'ward_triggered_damage' });
      } else {
        const currentHp = getEffectiveHp(adj.data);
        const adjHp = currentHp - value;

        if (adjHp <= 0) {
          dyingCards.push({ x: nx, y: ny, cell: adj });
          board[ny][nx] = null;
          captures.push({ ...adj.data, dead: true, event: 'damage_death' });
        } else {
          adj.data.hp = adjHp;
          board[ny][nx] = { data: adj.data, owner: adj.owner };
          captures.push({ ...adj.data, event: 'damage_taken' });
        }
      }
    }
  }
};
