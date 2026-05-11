import { describe, it, expect } from 'vitest';
import { getTargetCells } from '../shared/skills/helpers';

describe('Skill Patterns: Diamond and Square', () => {
  const board = Array(5).fill(null).map(() => Array(5).fill(null));
  const ctx = {
    board,
    x: 2,
    y: 2,
    owner: 'PLAYER_1',
    card: { id: 'origin' },
    skill: {
      origin_type: 'self',
      range: 2,
      filter: 'empty'
    }
  };

  it('diamond pattern should cover all cells within Manhattan distance 2', () => {
    const skill = { ...ctx.skill, patterns: [{ value: 'diamond' }] };
    const targets = getTargetCells({ ...ctx, skill });
    
    // Total cells for Manhattan range 2: 
    // dist 1: (1,2), (3,2), (2,1), (2,3) -> 4
    // dist 2: (0,2), (4,2), (2,0), (2,4), (1,1), (3,1), (1,3), (3,3) -> 8
    // total = 12
    expect(targets.length).toBe(12);
    
    const targetCoords = targets.map(t => `${t.x},${t.y}`);
    expect(targetCoords).toContain('1,1'); // Diagonal dist 2
    expect(targetCoords).toContain('0,2'); // Horizontal dist 2
    expect(targetCoords).not.toContain('0,0'); // Manhattan dist 4
  });

  it('square pattern should cover all cells within Chebyshev distance 2', () => {
    const skill = { ...ctx.skill, patterns: [{ value: 'square' }] };
    const targets = getTargetCells({ ...ctx, skill });
    
    // Total cells for Square range 2: (5x5 square - center) = 24
    expect(targets.length).toBe(24);
    
    const targetCoords = targets.map(t => `${t.x},${t.y}`);
    expect(targetCoords).toContain('0,0'); // Top left corner
    expect(targetCoords).toContain('4,4'); // Bottom right corner
  });
});
