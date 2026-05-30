import type { SkillHandler, SkillContext } from './types';
import { 
  SKILL_PATTERNS, 
  SKILL_FILTERS, 
  ORIGIN_TYPES,
  CARD_DIRECTIONS
} from './constants';

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
  [CARD_DIRECTIONS.TOP]:          { dx: 0, dy: -1 },
  [CARD_DIRECTIONS.BOTTOM]:       { dx: 0, dy:  1 },
  [CARD_DIRECTIONS.LEFT]:         { dx: -1, dy: 0 },
  [CARD_DIRECTIONS.RIGHT]:        { dx:  1, dy: 0 },
  [CARD_DIRECTIONS.TOP_LEFT]:     { dx: -1, dy: -1 },
  [CARD_DIRECTIONS.TOP_RIGHT]:    { dx:  1, dy: -1 },
  [CARD_DIRECTIONS.BOTTOM_LEFT]:  { dx: -1, dy:  1 },
  [CARD_DIRECTIONS.BOTTOM_RIGHT]: { dx:  1, dy:  1 },
};

const DIAGONALS = [
  DIRECTION_VECTORS[CARD_DIRECTIONS.TOP_LEFT],
  DIRECTION_VECTORS[CARD_DIRECTIONS.TOP_RIGHT],
  DIRECTION_VECTORS[CARD_DIRECTIONS.BOTTOM_LEFT],
  DIRECTION_VECTORS[CARD_DIRECTIONS.BOTTOM_RIGHT],
];

/**
 * Résout l'origine (ox, oy) en fonction de skill.origin_type.
 * Retourne null si l'origine est 'manual' et qu'aucune cible n'a été fournie.
 */
export function resolveOrigin(ctx): { ox: number, oy: number } | null {
  const { skill } = ctx;
  const originType = skill.origin_type || ORIGIN_TYPES.SELF;

  if (originType === ORIGIN_TYPES.SELF) {
    return { ox: ctx.x, oy: ctx.y };
  }

  if (originType === ORIGIN_TYPES.FIXED) {
    const dir = DIRECTION_VECTORS[skill.origin_direction || CARD_DIRECTIONS.TOP];
    const reach = skill.origin_reach || 1;
    return { ox: ctx.x + dir.dx * reach, oy: ctx.y + dir.dy * reach };
  }

  // manual : l'origine est la première cible fournie par le joueur
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
  const { board, skill, card, owner } = ctx;

  // 1. Résoudre l'origine
  const origin = resolveOrigin(ctx);
  if (!origin) return []; // Pas d'origine disponible
  const { ox, oy } = origin;

  // 2. Lire les patterns (composant répétable → [{value: 'adjacent'}, ...] ou ['adjacent', ...])
  const rawPatterns = skill.patterns || [{ value: SKILL_PATTERNS.ADJACENT }];
  const patternValues: string[] = rawPatterns.map(p =>
    typeof p === 'string' ? p : (p.value || SKILL_PATTERNS.ADJACENT)
  );

  const range = skill.range || 1;
  const filter = skill.filter || SKILL_FILTERS.NONE;

  const cellsMap = new Map<string, { x: number, y: number, cell: any }>();

  // 3. Appliquer chaque pattern autour de l'origine
  for (const p of patternValues) {
    if (p === SKILL_PATTERNS.SELF) {
      if (isInBounds(board, ox, oy)) {
        cellsMap.set(`${ox},${oy}`, { x: ox, y: oy, cell: board[oy][ox] });
      }
      continue;
    }

    let directions: { dx: number, dy: number }[] = [];

    if (p === SKILL_PATTERNS.TOP)       directions = [DIRECTION_VECTORS[CARD_DIRECTIONS.TOP]];
    else if (p === SKILL_PATTERNS.BOTTOM)    directions = [DIRECTION_VECTORS[CARD_DIRECTIONS.BOTTOM]];
    else if (p === SKILL_PATTERNS.LEFT)      directions = [DIRECTION_VECTORS[CARD_DIRECTIONS.LEFT]];
    else if (p === SKILL_PATTERNS.RIGHT)     directions = [DIRECTION_VECTORS[CARD_DIRECTIONS.RIGHT]];
    else if (p === SKILL_PATTERNS.ADJACENT)  directions = DIRECTIONS_4;
    else if (p === SKILL_PATTERNS.DIAGONALS) directions = DIAGONALS;
    else if (p === SKILL_PATTERNS.CROSS)     directions = [...DIRECTIONS_4, ...DIAGONALS];
    else if (p === SKILL_PATTERNS.DIAMOND || p === SKILL_PATTERNS.CROSS_DIAMOND) {
      for (let dy = -range; dy <= range; dy++) {
        for (let dx = -range; dx <= range; dx++) {
          if (dx === 0 && dy === 0) continue;
          if (Math.abs(dx) + Math.abs(dy) > range) continue;
          const nx = ox + dx, ny = oy + dy;
          if (isInBounds(board, nx, ny)) {
            cellsMap.set(`${nx},${ny}`, { x: nx, y: ny, cell: board[ny][nx] });
          }
        }
      }
      continue;
    } else if (p === SKILL_PATTERNS.SQUARE || p === SKILL_PATTERNS.AREA || p === SKILL_PATTERNS.CROSS_FULL) {
      for (let dy = -range; dy <= range; dy++) {
        for (let dx = -range; dx <= range; dx++) {
          if (dx === 0 && dy === 0) continue;
          const nx = ox + dx, ny = oy + dy;
          if (isInBounds(board, nx, ny)) {
            cellsMap.set(`${nx},${ny}`, { x: nx, y: ny, cell: board[ny][nx] });
          }
        }
      }
      continue;
    } else if (p === SKILL_PATTERNS.ROW) {
      for (let nx = 0; nx < board[0].length; nx++) {
        if (nx === ox && oy === oy) { /* skip self */ }
        if (isInBounds(board, nx, oy)) cellsMap.set(`${nx},${oy}`, { x: nx, y: oy, cell: board[oy][nx] });
      }
      continue;
    } else if (p === SKILL_PATTERNS.COLUMN) {
      for (let ny = 0; ny < board.length; ny++) {
        if (isInBounds(board, ox, ny)) cellsMap.set(`${ox},${ny}`, { x: ox, y: ny, cell: board[ny][ox] });
      }
      continue;
    } else if (p === SKILL_PATTERNS.ALL) {
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
    if (!targetCell || !targetCell.owner) return false;
    if (filter === 'allies')   return targetCell.owner === owner;
    if (filter === 'enemies')  return targetCell.owner !== owner;
    if (filter === 'self')     return targetCell === card || targetCell?.data === card;
    return true;
  });
}
