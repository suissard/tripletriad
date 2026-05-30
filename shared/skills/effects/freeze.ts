import type { Effect } from './Effect';
import type { SkillContext } from '../types';

export const freezeEffect: Effect = {
  id: 'FREEZE',
  
  execute(ctx, targets, value) {
    targets.forEach(({ cell }) => {
      if (!cell || !cell.data) return;
      if (!cell.data.skills) cell.data.skills = [];
      
      // Prevent duplicate freeze
      if (!cell.data.skills.some((s: any) => s.type === 'freeze')) {
        cell.data.skills.push({ type: 'freeze' });
        ctx.alerts?.push('FREEZE APPLIED!');
      }
    });
  }
};
