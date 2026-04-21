/**
 * Skill: Turn (Rotation)
 * Fait tourner les valeurs de la carte au moment du placement.
 */
export default {
  id: 'turn',
  name: 'Rotation',
  description: 'Fait tourner les valeurs de la carte au placement.',

  onEnterPlay(ctx) {
    const { skill } = ctx;
    const cell = ctx.board[ctx.y][ctx.x];
    if (!cell || !cell.data) return;

    const direction = skill.value || 1; // 1 = clockwise, -1 = counter-clockwise
    const steps = Math.abs(direction);

    for (let i = 0; i < steps; i++) {
      const old = {
        top: cell.data.topValue || (cell.data.values ? cell.data.values.top : '0'),
        right: cell.data.rightValue || (cell.data.values ? cell.data.values.right : '0'),
        bottom: cell.data.bottomValue || (cell.data.values ? cell.data.values.bottom : '0'),
        left: cell.data.leftValue || (cell.data.values ? cell.data.values.left : '0')
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

      if (cell.data.values) {
        cell.data.values.top = cell.data.topValue;
        cell.data.values.right = cell.data.rightValue;
        cell.data.values.bottom = cell.data.bottomValue;
        cell.data.values.left = cell.data.leftValue;
      }
    }
  }
};
