import { SkillHandler, SkillContext } from './types';

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

// Map direction -> vecteur
const DIRECTION_VECTORS: Record<string, {dx: number, dy: number}> = {
  top:          { dx: 0, dy: -1 },
  bottom:       { dx: 0, dy:  1 },
  left:         { dx: -1, dy: 0 },
  right:        { dx:  1, dy: 0 },
  top_left:     { dx: -1, dy: -1 },
  top_right:    { dx:  1, dy: -1 },
  bottom_left:  { dx: -1, dy:  1 },
  bottom_right: { dx:  1, dy:  1 },
};

const DIAGONALS = [
  DIRECTION_VECTORS.top_left,
  DIRECTION_VECTORS.top_right,
  DIRECTION_VECTORS.bottom_left,
  DIRECTION_VECTORS.bottom_right,
];

/**
 * Résout l'origine (ox, oy) en fonction de skill.origin_type.
 * Retourne null si l'origine est 'manual' et qu'aucune cible n'a été fournie.
 */
export function resolveOrigin(ctx): { ox: number, oy: number } | null {
  const { skill } = ctx;
  const originType = skill.origin_type || 'self';

  if (originType === 'self') {
    return { ox: ctx.x, oy: ctx.y };
  }

  if (originType === 'fixed') {
    const dir = DIRECTION_VECTORS[skill.origin_direction || 'top'];
    const reach = skill.origin_reach || 1;
    return { ox: ctx.x + dir.dx * reach, oy: ctx.y + dir.dy * reach };
  }

  // manual / manual_constrained : l'origine est la première cible fournie par le joueur
  if (ctx.targets && ctx.targets.length > 0) {
    return { ox: ctx.targets[0].x, oy: ctx.targets[0].y };
  }

  return null; // Pas de cible fournie
}

/**
 * Récupère les cellules cibles en fonction des propriétés du skill.
 * Supports: origin_type, origin_direction, origin_reach, patterns (répétable), range, filter.
 */
export function getTargetCells(ctx) {
  const { board, skill, card } = ctx;

  // 1. Résoudre l'origine
  const origin = resolveOrigin(ctx);
  if (!origin) return []; // Pas d'origine disponible
  const { ox, oy } = origin;

  // 2. Lire les patterns (composant répétable → [{value: 'adjacent'}, ...] ou ['adjacent', ...])
  const rawPatterns = skill.patterns || [{ value: 'adjacent' }];
  const patternValues: string[] = rawPatterns.map(p =>
    typeof p === 'string' ? p : (p.value || 'adjacent')
  );

  const range = skill.range || 1;
  const filter = skill.filter || 'none';

  const cellsMap = new Map<string, { x: number, y: number, cell: any }>();

  // 3. Appliquer chaque pattern autour de l'origine
  for (const p of patternValues) {
    if (p === 'self') {
      if (isInBounds(board, ox, oy)) {
        cellsMap.set(`${ox},${oy}`, { x: ox, y: oy, cell: board[oy][ox] });
      }
      continue;
    }

    let directions: { dx: number, dy: number }[] = [];

    if (p === 'top')       directions = [DIRECTION_VECTORS.top];
    else if (p === 'bottom')    directions = [DIRECTION_VECTORS.bottom];
    else if (p === 'left')      directions = [DIRECTION_VECTORS.left];
    else if (p === 'right')     directions = [DIRECTION_VECTORS.right];
    else if (p === 'adjacent')  directions = DIRECTIONS_4;
    else if (p === 'diagonals') directions = DIAGONALS;
    else if (p === 'cross')     directions = [...DIRECTIONS_4, ...DIAGONALS];
    else if (p === 'row') {
      for (let nx = 0; nx < board[0].length; nx++) {
        if (nx === ox && oy === oy) { /* skip self */ }
        if (isInBounds(board, nx, oy)) cellsMap.set(`${nx},${oy}`, { x: nx, y: oy, cell: board[oy][nx] });
      }
      continue;
    } else if (p === 'column') {
      for (let ny = 0; ny < board.length; ny++) {
        if (isInBounds(board, ox, ny)) cellsMap.set(`${ox},${ny}`, { x: ox, y: ny, cell: board[ny][ox] });
      }
      continue;
    } else if (p === 'all') {
      for (let ny = 0; ny < board.length; ny++) {
        for (let nx = 0; nx < board[ny].length; nx++) {
          cellsMap.set(`${nx},${ny}`, { x: nx, y: ny, cell: board[ny][nx] });
        }
      }
      continue;
    }

    // Appliquer les directions avec portée
    for (const dir of directions) {
      for (let r = 1; r <= range; r++) {
        const nx = ox + dir.dx * r, ny = oy + dir.dy * r;
        if (isInBounds(board, nx, ny)) {
          cellsMap.set(`${nx},${ny}`, { x: nx, y: ny, cell: board[ny][nx] });
        } else break;
      }
    }
  }

  // 4. Appliquer le filtre final
  const allCells = Array.from(cellsMap.values());
  return allCells.filter(target => {
    const targetCell = target.cell;
    if (filter === 'empty') return targetCell === null;
    if (!targetCell) return false;
    if (filter === 'allies')   return targetCell.owner === card.owner;
    if (filter === 'enemies')  return targetCell.owner !== card.owner;
    if (filter === 'self')     return targetCell === card;
    return true;
  });
}
