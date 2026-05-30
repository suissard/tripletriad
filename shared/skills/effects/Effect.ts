import type { SkillContext } from '../types';

export interface Effect {
  id: string; // E.g. 'DAMAGE', 'HEAL', 'STAT_MODIFIER', 'ROTATE', 'FREEZE', 'WARD', 'TELEPORT'
  execute(ctx: SkillContext, targets: Array<{ x: number, y: number, cell: any }>, value: number): void;
}
