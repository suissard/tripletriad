import { SkillHandler, SkillContext } from './types';

/**
 * Skill: Turn (Rotation)
 * Fait tourner les valeurs de la carte au moment du placement.
 */
const handler: SkillHandler = {
  id: 'turn',
  name: 'Rotation',
  description: 'Fait tourner les valeurs de la carte au placement.',
  effectType: 'neutral',

  onEnterPlay(ctx: any) {
    const { skill } = ctx;
    const cell = ctx.board[ctx.y][ctx.x];
    if (!cell || !cell.data) return;

    const direction = skill.value || 1; // 1 = clockwise, -1 = counter-clockwise
    const steps = Math.abs(direction);

    for (let i = 0; i < steps; i++) {
      const old = {
        top: cell.data.topValue || (cell.values ? cell.values.top : '0'),
        right: cell.data.rightValue || (cell.values ? cell.values.right : '0'),
        bottom: cell.data.bottomValue || (cell.values ? cell.values.bottom : '0'),
        left: cell.data.leftValue || (cell.values ? cell.values.left : '0')
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

      if (cell.values) {
        cell.values.top = cell.data.topValue;
        cell.values.right = cell.data.rightValue;
        cell.values.bottom = cell.data.bottomValue;
        cell.values.left = cell.data.leftValue;
      }
    }
  }
};

export default handler;
