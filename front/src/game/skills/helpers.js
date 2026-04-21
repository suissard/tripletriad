/**
 * Constantes et helpers partagés par les modules de skills.
 */

/** Les 4 directions cardinales */
export const DIRECTIONS_4 = [
  { dx: 0, dy: -1 },  // Haut
  { dx: 0, dy: 1 },   // Bas
  { dx: -1, dy: 0 },  // Gauche
  { dx: 1, dy: 0 }    // Droite
];

/** Les 4 directions avec mapping côtés attaquant/défenseur */
export const COMBAT_DIRECTIONS = [
  { dx: 0, dy: -1, mySide: 'top', oppSide: 'bottom' },
  { dx: 0, dy: 1, mySide: 'bottom', oppSide: 'top' },
  { dx: -1, dy: 0, mySide: 'left', oppSide: 'right' },
  { dx: 1, dy: 0, mySide: 'right', oppSide: 'left' }
];

/**
 * Vérifie si des coordonnées sont dans les limites du board.
 */
export function isInBounds(board, x, y) {
  return y >= 0 && y < board.length && x >= 0 && x < board[0].length;
}

/**
 * Récupère le HP effectif d'une carte, avec fallback sur defaultHp.
 */
export function getEffectiveHp(cardData) {
  return cardData.hp !== undefined ? cardData.hp : (cardData.defaultHp || 3);
}
