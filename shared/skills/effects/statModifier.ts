import type { Effect } from './Effect';
import type { SkillContext } from '../types';

export const statModifierEffect: Effect = {
  id: 'STAT_MODIFIER',
  
  execute(ctx, targets, value) {
    const sides = ['top', 'right', 'bottom', 'left'] as const;

    targets.forEach(({ x, y, cell }) => {
      if (!cell || !cell.data) return;

      const oldValues = { 
        top: cell.data.topValue, 
        right: cell.data.rightValue, 
        bottom: cell.data.bottomValue, 
        left: cell.data.leftValue 
      };

      sides.forEach(side => {
        const valStr = (cell.data.values && cell.data.values[side] !== undefined) 
          ? cell.data.values[side] 
          : cell.data[side + 'Value'];
          
        if (valStr === undefined) return;

        let val = (valStr === 'A' || valStr === 'a') ? 100 : parseInt(valStr as string) || 0;
        if (val >= 100 && value > 0) return; // Non-AS cannot grow past A

        // Apply positive or negative modifier
        val = Math.max(0, Math.min(100, val + value));
        const newValStr = val >= 100 ? 'A' : val.toString();

        cell.data[side] = val;
        cell.data[side + 'Value'] = newValStr;
        if (cell.data.values) {
          cell.data.values[side] = val;
        }
      });

      console.log(`[SkillEngine:StatModifier] Card "${cell.data.name}" at (${x},${y}) updated:`, 
        `${oldValues.top}/${oldValues.right}/${oldValues.bottom}/${oldValues.left} -> ` +
        `${cell.data.topValue}/${cell.data.rightValue}/${cell.data.bottomValue}/${cell.data.leftValue} (mod: ${value})`
      );
    });
  }
};
