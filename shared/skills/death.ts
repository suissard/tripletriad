import type { SkillHandler, SkillContext } from './types';
import { DIRECTIONS_4 } from './helpers.js';
import { 
  EFFECT_TYPES, 
  SKILL_TRIGGERS 
} from './constants';

/**
 * Skill: Death (Mort)
 * Effet : Inflige des dégâts aux cartes adjacentes (Cri de guerre).
 * 
 * Trigger variable : par défaut onEnterPlay, mais configurable dans Strapi
 */
const handler: SkillHandler = {
  id: 'death',
  name: 'Mort',
  description: 'Inflige des dégâts aux cartes adjacentes (trigger variable).',
  effectType: EFFECT_TYPES.NEGATIVE,
  defaultTrigger: SKILL_TRIGGERS.ON_ENTER_PLAY,

  execute(ctx: any) {
    const { board, x, y, skill } = ctx;

    console.log(`[Skill:Death] Executing at (${x},${y}). Value: ${skill.value} (trigger: ${skill.trigger || 'default'})`);

    for (const dir of DIRECTIONS_4) {
      const nx = x + dir.dx;
      const ny = y + dir.dy;

      if (nx >= 0 && nx < board[0].length && ny >= 0 && ny < board.length) {
        const adj = board[ny][nx];
        if (adj) {
          let hp = adj.data.hp !== undefined ? adj.data.hp : (adj.data.defaultHp || 3);
          hp -= skill.value;

          if (hp <= 0) {
            board[ny][nx] = null;
          } else {
            adj.data = { ...adj.data, hp };
          }
        }
      }
    }
  }
};

export default handler;
