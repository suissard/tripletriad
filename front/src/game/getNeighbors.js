import { state } from './state.js';

export function getNeighbors(index) {
    const w = state.boardWidth;
    const h = state.boardHeight;
    const x = index % w;
    const y = Math.floor(index / w);

    return [
        { i: index - w, dir: 'top', opp: 'bottom', valid: y > 0 },
        { i: index + w, dir: 'bottom', opp: 'top', valid: y < h - 1 },
        { i: index - 1, dir: 'left', opp: 'right', valid: x > 0 },
        { i: index + 1, dir: 'right', opp: 'left', valid: x < w - 1 }
    ].filter(n => n.valid);
}
