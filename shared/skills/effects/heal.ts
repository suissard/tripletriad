import type { Effect } from './Effect';
import type { SkillContext } from '../types';
import { getEffectiveHp } from '../helpers.js';

export const healEffect: Effect = {
  id: 'HEAL',
  
  execute(ctx, targets, value) {
    for (const target of targets) {
      const { x, y, cell } = target;
      if (cell && cell.data) {
        const oldHp = getEffectiveHp(cell.data);
        const hp = oldHp + value;
        cell.data.hp = hp;
        console.log(`[SkillEngine:Heal] Card "${cell.data.name}" at (${x},${y}) healed: ${oldHp} -> ${hp}`);
      }
    }
  }
};
