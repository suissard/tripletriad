import { state } from './state.js';
import { getNeighbors } from './engine.js';
import { rulesRegistry } from './rules.js';

/**
 * AI picks the best move from its hand.
 * state.aiHand contains plain card data objects.
 * Returns { slot, cardIdx } or null.
 */
export function getBestAIMove() {
    let bestScore = -Infinity;
    let bestMove = null;

    const emptySlots = state.board.map((v, i) => v === null ? i : null).filter(v => v !== null);

    for (let slotIdx of emptySlots) {
        for (let c = 0; c < state.aiHand.length; c++) {
            const card = state.aiHand[c];
            const cost = 1;

            // AI must be able to afford the card
            if (state.aiMana >= cost) {
                let score = evaluatePlacementScore(slotIdx, card, 'ai');

                const corners = [0, 2, 6, 8];
                if (corners.includes(slotIdx)) score += 2;
                if (slotIdx === 4) score -= 1.5;

                score += Math.random() * 0.5;

                if (score > bestScore) {
                    bestScore = score;
                    bestMove = { slot: slotIdx, cardIdx: c };
                }
            }
        }
    }
    return bestMove;
}

/**
 * Evaluate how good a placement is.
 * cardData is a plain card object, board entries are { data, owner } | null.
 */
export function evaluatePlacementScore(slotIdx, cardData, owner) {
    let score = 0;
    const opp = owner === 'player' ? 'ai' : 'player';

    // Mock board entry for rule evaluation
    const mockEntry = { data: cardData, owner: owner };
    const neighbors = getNeighbors(slotIdx);

    // Score from direct overrides
    neighbors.forEach(n => {
        const adj = state.board[n.i];
        if (adj) {
            if (adj.owner === opp) {
                if (cardData[n.dir] > adj.data[n.opp]) score += 10;
            } else {
                score += 1;
            }
        }
    });

    // Score from modular rules
    rulesRegistry.forEach(rule => {
        if (state.rules[rule.id] && rule.id !== 'combo') {
            const result = rule.execute(mockEntry, neighbors, state.board);
            if (result.triggered) {
                score += (result.captures.length * 15);
            }
        }
    });

    return score;
}
