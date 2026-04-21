/**
 * Skill: Freeze (Gel)
 * Bloque la propagation de combo des attaquants adjacents.
 */
export default {
  id: 'freeze',
  name: 'Gel',
  description: 'Bloque la propagation combo des attaquants adjacents.',

  /**
   * Retourne true si cette carte empêche un attaquant adjacent
   * de propager son combo.
   */
  blocksCombo(ctx) {
    ctx.alerts.push('FREEZE!');
    return true;
  }
};
