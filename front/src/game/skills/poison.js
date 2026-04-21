/**
 * Skill: Poison
 * Contre-attaque empoisonnée : inflige des dégâts à l'attaquant
 * quand cette carte est capturée.
 */
export default {
  id: 'poison',
  name: 'Poison',
  description: 'Inflige des dégâts à l\'attaquant lors de la capture.',

  /**
   * Appelé après que cette carte est capturée.
   * Inflige skill.value dégâts à l'attaquant.
   * Interagit avec Ward sur l'attaquant.
   */
  onCaptured(ctx) {
    const { board, skill, alerts, captures, dyingCards, attackerX, attackerY } = ctx;

    const attackerCell = board[attackerY]?.[attackerX];
    if (!attackerCell) return;

    alerts.push('POISON!');

    // Vérifier si l'attaquant a un Ward
    const attackerHasWard = attackerCell.data.skills &&
      attackerCell.data.skills.some(s => s.type === 'ward');

    if (attackerHasWard) {
      alerts.push('WARD!');
      attackerCell.data.skills = attackerCell.data.skills.filter(s => s.type !== 'ward');
      captures.push({ ...attackerCell.data, event: 'ward_triggered_poison' });
    } else {
      let attackerHp = (attackerCell.data.hp !== undefined
        ? attackerCell.data.hp
        : (attackerCell.data.defaultHp || 3)) - skill.value;

      attackerCell.data.hp = attackerHp;

      if (attackerHp <= 0) {
        dyingCards.push({ x: attackerX, y: attackerY, cell: attackerCell });
        board[attackerY][attackerX] = null;
        captures.push({ ...attackerCell.data, dead: true, event: 'poison_death' });
      } else {
        captures.push({ ...attackerCell.data, event: 'poison_damage' });
      }
    }
  }
};
