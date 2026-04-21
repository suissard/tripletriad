/**
 * Skill: Bomb (Explosion)
 * Inflige des dégâts AoE aux cartes adjacentes à la mort.
 */
import { DIRECTIONS_4 } from './helpers.js';

export default {
  id: 'bomb',
  name: 'Explosion',
  description: 'Inflige des dégâts aux cartes adjacentes à la mort.',

  /**
   * Appelé quand la carte porteuse meurt (HP <= 0).
   * Inflige skill.value dégâts à toutes les cartes adjacentes.
   * Interagit avec Ward.
   */
  onDestroyed(ctx) {
    const { board, x, y, skill, alerts, captures, dyingCards } = ctx;

    alerts.push('BOMB!');

    for (const dir of DIRECTIONS_4) {
      const nx = x + dir.dx;
      const ny = y + dir.dy;

      if (nx >= 0 && nx < board[0].length && ny >= 0 && ny < board.length) {
        const adj = board[ny][nx];
        if (!adj) continue;

        // Vérifier Ward sur la cible
        const adjHasWard = adj.data.skills &&
          adj.data.skills.some(s => s.type === 'ward');

        if (adjHasWard) {
          alerts.push('WARD!');
          adj.data.skills = adj.data.skills.filter(s => s.type !== 'ward');
          captures.push({ ...adj.data, event: 'ward_triggered_bomb' });
        } else {
          let adjHp = (adj.data.hp !== undefined
            ? adj.data.hp
            : (adj.data.defaultHp || 3)) - skill.value;

          if (adjHp <= 0) {
            dyingCards.push({ x: nx, y: ny, cell: adj });
            board[ny][nx] = null;
            captures.push({ ...adj.data, dead: true, event: 'bomb_death' });
          } else {
            adj.data.hp = adjHp;
            board[ny][nx] = { data: adj.data, owner: adj.owner };
            captures.push({ ...adj.data, event: 'bomb_damage' });
          }
        }
      }
    }
  }
};
