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
    console.log(`[Targeting-Flow] [teleportation.ts] execute called at source x: ${x}, y: ${y}. Targets received:`, JSON.stringify(targets));
    
    if (!targets || targets.length === 0) {
      console.warn(`[Targeting-Flow] [teleportation.ts] execute aborted: No targets provided!`);
      return;
    }

    const target = targets[0];
    const tx = target.x;
    const ty = target.y;

    console.log(`[Targeting-Flow] [teleportation.ts] Target 0 resolves to coordinates: (${tx}, ${ty})`);

    if (
      ty >= 0 && ty < board.length && 
      tx >= 0 && tx < board[0].length && 
      board[ty][tx] === null
    ) {
      const card = board[y][x];
      if (!card) {
        console.error(`[Targeting-Flow] [teleportation.ts] No card found at source coordinates (${x}, ${y})!`);
        return;
      }

      console.log(`[Targeting-Flow] [teleportation.ts] Moving card "${card.data?.name || 'unknown'}" from (${x}, ${y}) to empty slot (${tx}, ${ty})`);
      board[ty][tx] = card;
      board[y][x] = null;

      if ((ctx as any).alerts) {
        (ctx as any).alerts.push('TELEPORT!');
      }
      console.log(`[Targeting-Flow] [teleportation.ts] Teleport successful!`);
    } else {
      console.error(`[Targeting-Flow] [teleportation.ts] Destination (${tx}, ${ty}) is INVALID: out of bounds or not empty on board! Board state at destination:`, board[ty] ? board[ty][tx] : 'out of bounds');
    }
  }
};

export default handler;
