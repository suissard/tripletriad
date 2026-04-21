/**
 * Skill: Growing (Croissance)
 * Augmente les valeurs de la carte à chaque fin de tour.
 */
export default {
  id: 'growing',
  name: 'Croissance',
  description: 'Les valeurs de la carte augmentent chaque tour.',

  onEndOfTurn(ctx) {
    const { skill } = ctx;
    const cell = ctx.board[ctx.y][ctx.x];
    if (!cell?.data) return;

    const targets = skill.target ? [skill.target.toLowerCase()] : ['all'];
    const sides = ['top', 'right', 'bottom', 'left'];

    sides.forEach(side => {
      if (targets.includes('all') || targets.includes(side)) {
        let valStr = cell.data.values?.[side] ?? cell.data[side + 'Value'];
        let val = valStr === 'A' || valStr === 'a' ? 100 : parseInt(valStr) || 0;

        val = Math.max(0, Math.min(100, val + skill.value));
        valStr = val === 100 ? 'A' : val.toString();

        if (cell.data.values) {
          cell.data.values[side] = valStr;
        }
        cell.data[side + 'Value'] = valStr;
      }
    });
  }
};
