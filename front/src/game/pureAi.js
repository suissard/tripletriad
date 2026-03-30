import { rulesRegistry } from './rules.js';

/**
 * Get neighbors on a board as a flat array (like the old game logic, but pure)
 */
export function getNeighborsPure(index, boardWidth, boardHeight) {
    const x = index % boardWidth;
    const y = Math.floor(index / boardWidth);

    return [
        { i: index - boardWidth, dir: 'top', opp: 'bottom', valid: y > 0 },
        { i: index + boardWidth, dir: 'bottom', opp: 'top', valid: y < boardHeight - 1 },
        { i: index - 1, dir: 'left', opp: 'right', valid: x > 0 },
        { i: index + 1, dir: 'right', opp: 'left', valid: x < boardWidth - 1 }
    ].filter(n => n.valid);
}

/**
 * Pure evaluation function for placement
 *
 * @param {number} slotIdx
 * @param {object} cardData
 * @param {string} owner
 * @param {array} flatBoard - The 1D array representing the board
 * @param {number} boardWidth
 * @param {number} boardHeight
 * @param {object} rules - Dictionary of enabled rules
 * @returns {number} The score for this move
 */
export function evaluatePlacementScorePure(slotIdx, cardData, owner, flatBoard, boardWidth, boardHeight, rules) {
    let score = 0;
    const opp = owner === 'PLAYER_1' ? 'PLAYER_2' : 'PLAYER_1';

    // Mock board entry for rule evaluation
    const mockEntry = { data: cardData, owner: owner };
    const neighbors = getNeighborsPure(slotIdx, boardWidth, boardHeight);

    // Score from direct overrides
    neighbors.forEach(n => {
        const adj = flatBoard[n.i];
        if (adj) {
            if (adj.owner === opp) {
                // Determine values
                let myValue = cardData[n.dir];
                if (myValue === undefined && cardData.values) myValue = cardData.values[n.dir];
                if (myValue === undefined) myValue = cardData[`${n.dir}Value`];
                let oppValue = adj.data[n.opp];
                if (oppValue === undefined && adj.data.values) oppValue = adj.data.values[n.opp];
                if (oppValue === undefined) oppValue = adj.data[`${n.opp}Value`];

                myValue = myValue === 'A' ? 10 : parseInt(myValue) || 0;
                oppValue = oppValue === 'A' ? 10 : parseInt(oppValue) || 0;

                if (myValue > oppValue) score += 10;
            } else {
                score += 1;
            }
        }
    });

    // Score from modular rules
    rulesRegistry.forEach(rule => {
        if (rules && rules[rule.id] && rule.id !== 'combo') {
            const result = rule.execute(mockEntry, neighbors, flatBoard);
            if (result.triggered) {
                score += (result.captures.length * 15);
            }
        }
    });

    return score;
}

/**
 * Pure AI picking the best move from its hand.
 * Returns { slot, cardIdx } or null.
 */
export function getBestAIMovePure(board2D, hand, owner, rules = {}) {
    let bestScore = -Infinity;
    let bestMove = null;

    const boardWidth = board2D[0].length;
    const boardHeight = board2D.length;

    // Flatten the board for easy index tracking used by old rule registry if needed,
    // though the registry might expect a 1D array. We need to be careful here if
    // GameEngine.js uses 2D arrays, whereas engine.js uses 1D arrays.
    const flatBoard = board2D.flat();

    const emptySlots = flatBoard.map((v, i) => v === null ? i : null).filter(v => v !== null);

    for (let slotIdx of emptySlots) {
        for (let c = 0; c < hand.length; c++) {
            const card = hand[c];

            // Assume mana is always enough for AI vs AI simulation
            let score = evaluatePlacementScorePure(slotIdx, card, owner, flatBoard, boardWidth, boardHeight, rules);

            // Dynamic corners logic
            const corners = [0, boardWidth - 1, (boardHeight - 1) * boardWidth, boardHeight * boardWidth - 1];
            if (corners.includes(slotIdx)) score += 2;

            const centerX = Math.floor(boardWidth / 2);
            const centerY = Math.floor(boardHeight / 2);
            const centerIdx = centerY * boardWidth + centerX;
            if (slotIdx === centerIdx) score -= 1.5;

            score += Math.random() * 0.5;

            if (score > bestScore) {
                bestScore = score;
                bestMove = { slot: slotIdx, cardIdx: c };
            }
        }
    }

    if (bestMove) {
        return {
            x: bestMove.slot % boardWidth,
            y: Math.floor(bestMove.slot / boardWidth),
            cardIdx: bestMove.cardIdx
        };
    }
    return null;
}
