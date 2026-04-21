/**
 * Skill: Heal (Soin)
 * Soigne les cartes adjacentes au placement.
 */
import { DIRECTIONS_4 } from './helpers.js';

export default {
  id: 'heal',
  name: 'Soin',
  description: 'Soigne les cartes adjacentes au placement.',

  onEnterPlay(ctx) {
    const { board, x, y, skill } = ctx;

    for (const dir of DIRECTIONS_4) {
      const nx = x + dir.dx;
      const ny = y + dir.dy;

      if (nx >= 0 && nx < board[0].length && ny >= 0 && ny < board.length) {
        const adj = board[ny][nx];
        if (adj) {
          let hp = adj.data.hp !== undefined ? adj.data.hp : (adj.data.defaultHp || 3);
          hp += skill.value;
          adj.data = { ...adj.data, hp };
        }
      }
    }
  }
};
