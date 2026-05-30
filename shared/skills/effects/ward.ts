import type { Effect } from './Effect';
import type { SkillContext } from '../types';

export const wardEffect: Effect = {
  id: 'WARD',
  
  execute(ctx, targets, value) {
    targets.forEach(({ cell }) => {
      if (!cell || !cell.data) return;
      if (!cell.data.skills) cell.data.skills = [];
      
      // Prevent duplicate ward
      if (!cell.data.skills.some((s: any) => s.type === 'ward')) {
        cell.data.skills.push({ type: 'ward' });
        ctx.alerts?.push('SHIELDED!');
      }
    });
  }
};
