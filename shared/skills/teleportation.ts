import { TargetType } from './types';
import type { SkillHandler, SkillContext } from './types';
import { 
  EFFECT_TYPES, 
  SKILL_TRIGGERS 
} from './constants';

/**
 * Skill: Teleportation
 * Trigger variable : par défaut onEnterPlay, configurable dans Strapi.
 */
const handler: SkillHandler = {
  id: 'teleportation',
  name: 'Téléportation',
  description: 'Se téléporte sur une case vide ciblée (trigger variable).',
  effectType: EFFECT_TYPES.NEUTRAL,
  defaultTrigger: SKILL_TRIGGERS.ON_ENTER_PLAY,

  targetingSteps: [
    { type: TargetType.CELL, emptyOnly: true }
  ],

  execute(ctx: SkillContext) {
    const { board, x, y, targets } = ctx;
    
    if (!targets || targets.length === 0) return;

    const target = targets[0];
    const tx = target.x;
    const ty = target.y;

    if (
      ty >= 0 && ty < board.length && 
      tx >= 0 && tx < board[0].length && 
      board[ty][tx] === null
    ) {
      const card = board[y][x];
      if (!card) return;

      board[ty][tx] = card;
      board[y][x] = null;

      if ((ctx as any).alerts) {
        (ctx as any).alerts.push('TELEPORT!');
      }
    }
  }
};

export default handler;
