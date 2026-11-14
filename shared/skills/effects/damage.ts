import type { Effect } from './Effect';
import type { SkillContext } from '../types';
import { getEffectiveHp, consumeWard } from '../helpers.js';

export const damageEffect: Effect = {
  id: 'DAMAGE',
  
  execute(ctx, targets, value) {
    const { board, alerts, captures, dyingCards } = ctx;
    if (!alerts || !captures || !dyingCards) return;

    for (const target of targets) {
      const { x: nx, y: ny, cell: adj } = target;
      if (!adj || !adj.data) continue;

      if (consumeWard(adj.data)) {
        alerts.push('WARD!');
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
