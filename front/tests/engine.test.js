import { describe, it, expect } from 'vitest';
import { getNeighbors } from '../src/game/getNeighbors.js';

describe('getNeighbors', () => {
    it('should return correct neighbors for corner (0)', () => {
        const neighbors = getNeighbors(0);
        expect(neighbors).toHaveLength(2);
        expect(neighbors).toContainEqual({ i: 3, dir: 'bottom', opp: 'top', valid: true });
        expect(neighbors).toContainEqual({ i: 1, dir: 'right', opp: 'left', valid: true });
    });

    it('should return correct neighbors for edge (1)', () => {
        const neighbors = getNeighbors(1);
        expect(neighbors).toHaveLength(3);
        expect(neighbors).toContainEqual({ i: 4, dir: 'bottom', opp: 'top', valid: true });
        expect(neighbors).toContainEqual({ i: 0, dir: 'left', opp: 'right', valid: true });
        expect(neighbors).toContainEqual({ i: 2, dir: 'right', opp: 'left', valid: true });
    });

    it('should return correct neighbors for corner (2)', () => {
        const neighbors = getNeighbors(2);
        expect(neighbors).toHaveLength(2);
        expect(neighbors).toContainEqual({ i: 5, dir: 'bottom', opp: 'top', valid: true });
        expect(neighbors).toContainEqual({ i: 1, dir: 'left', opp: 'right', valid: true });
    });

    it('should return correct neighbors for edge (3)', () => {
        const neighbors = getNeighbors(3);
        expect(neighbors).toHaveLength(3);
        expect(neighbors).toContainEqual({ i: 0, dir: 'top', opp: 'bottom', valid: true });
        expect(neighbors).toContainEqual({ i: 6, dir: 'bottom', opp: 'top', valid: true });
        expect(neighbors).toContainEqual({ i: 4, dir: 'right', opp: 'left', valid: true });
    });

    it('should return correct neighbors for center (4)', () => {
        const neighbors = getNeighbors(4);
        expect(neighbors).toHaveLength(4);
        expect(neighbors).toContainEqual({ i: 1, dir: 'top', opp: 'bottom', valid: true });
        expect(neighbors).toContainEqual({ i: 7, dir: 'bottom', opp: 'top', valid: true });
        expect(neighbors).toContainEqual({ i: 3, dir: 'left', opp: 'right', valid: true });
        expect(neighbors).toContainEqual({ i: 5, dir: 'right', opp: 'left', valid: true });
    });

    it('should return correct neighbors for edge (5)', () => {
        const neighbors = getNeighbors(5);
        expect(neighbors).toHaveLength(3);
        expect(neighbors).toContainEqual({ i: 2, dir: 'top', opp: 'bottom', valid: true });
        expect(neighbors).toContainEqual({ i: 8, dir: 'bottom', opp: 'top', valid: true });
        expect(neighbors).toContainEqual({ i: 4, dir: 'left', opp: 'right', valid: true });
    });

    it('should return correct neighbors for corner (6)', () => {
        const neighbors = getNeighbors(6);
        expect(neighbors).toHaveLength(2);
        expect(neighbors).toContainEqual({ i: 3, dir: 'top', opp: 'bottom', valid: true });
        expect(neighbors).toContainEqual({ i: 7, dir: 'right', opp: 'left', valid: true });
    });

    it('should return correct neighbors for edge (7)', () => {
        const neighbors = getNeighbors(7);
        expect(neighbors).toHaveLength(3);
        expect(neighbors).toContainEqual({ i: 4, dir: 'top', opp: 'bottom', valid: true });
        expect(neighbors).toContainEqual({ i: 6, dir: 'left', opp: 'right', valid: true });
        expect(neighbors).toContainEqual({ i: 8, dir: 'right', opp: 'left', valid: true });
    });

    it('should return correct neighbors for corner (8)', () => {
        const neighbors = getNeighbors(8);
        expect(neighbors).toHaveLength(2);
        expect(neighbors).toContainEqual({ i: 5, dir: 'top', opp: 'bottom', valid: true });
        expect(neighbors).toContainEqual({ i: 7, dir: 'left', opp: 'right', valid: true });
    });
});
