export function getNeighbors(index) {
    return [
        { i: index - 3, dir: 'top', opp: 'bottom', valid: index >= 3 },
        { i: index + 3, dir: 'bottom', opp: 'top', valid: index <= 5 },
        { i: index - 1, dir: 'left', opp: 'right', valid: index % 3 !== 0 },
        { i: index + 1, dir: 'right', opp: 'left', valid: index % 3 !== 2 }
    ].filter(n => n.valid);
}
