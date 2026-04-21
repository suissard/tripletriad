/**
 * Skill: Combo
 * Après une capture, la carte attaque à nouveau ses voisins.
 */
export default {
  id: 'combo',
  name: 'Combo',
  description: 'Après une capture, la carte re-attaque ses voisins.',

  /**
   * Retourne true pour indiquer que cette carte peut déclencher
   * un combo après une capture réussie.
   */
  hasCombo(ctx) {
    return true;
  }
};
