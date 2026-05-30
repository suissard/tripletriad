import type { Effect } from './Effect';
import type { SkillContext } from '../types';

export const rotateEffect: Effect = {
  id: 'ROTATE',
  
  execute(ctx, targets, value) {
    // If targets are provided, rotate each target. If no targets (or only self), rotate the host card.
    const cellsToRotate = targets.length > 0 
      ? targets.map(t => t.cell).filter(Boolean)
      : [ctx.board[ctx.y]?.[ctx.x]].filter(Boolean);

    const direction = value || 1; // 1 = clockwise, -1 = counter-clockwise
    const steps = Math.abs(direction);

    cellsToRotate.forEach(cell => {
      if (!cell || !cell.data) return;

      console.log(`[SkillEngine:Rotate] Rotating card "${cell.data.name}". Direction: ${direction > 0 ? 'CW' : 'CCW'} x${steps}`);

      for (let i = 0; i < steps; i++) {
        const old = {
          top: cell.data.topValue || '0',
          right: cell.data.rightValue || '0',
          bottom: cell.data.bottomValue || '0',
          left: cell.data.leftValue || '0'
        };

        if (direction > 0) { // Clockwise
          cell.data.topValue = old.left;
          cell.data.rightValue = old.top;
          cell.data.bottomValue = old.right;
          cell.data.leftValue = old.bottom;
        } else { // Counter-clockwise
          cell.data.topValue = old.right;
          cell.data.rightValue = old.bottom;
          cell.data.bottomValue = old.left;
          cell.data.leftValue = old.top;
        }

        // Sync values object if present
        if (cell.data.values) {
          const parseSide = (v: string) => (v === 'A' || v === 'a') ? 100 : parseInt(v) || 0;
          cell.data.values.top = parseSide(cell.data.topValue);
          cell.data.values.right = parseSide(cell.data.rightValue);
          cell.data.values.bottom = parseSide(cell.data.bottomValue);
          cell.data.values.left = parseSide(cell.data.leftValue);
        }
      }
    });
  }
};
