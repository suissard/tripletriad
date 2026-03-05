import { state } from './state.js';
import { getNeighbors } from './engine.js';
import { rulesRegistry } from './rules.js';

export function getBestAIMove() {
    let bestScore = -Infinity;
    let bestMove = { slot: null, cardIdx: null };

    const emptySlots = state.board.map((v, i) => v === null ? i : null).filter(v => v !== null);

    for (let slotIdx of emptySlots) {
        for (let c = 0; c < state.aiHand.length; c++) {
            const card = state.aiHand[c];
            let score = evaluatePlacementScore(slotIdx, card.userData.data, 'ai');

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
    return bestMove;
}

export function evaluatePlacementScore(slotIdx, cardData, owner) {
    let score = 0;
    const opp = owner === 'player' ? 'ai' : 'player';

    // Simulated mesh for evaluation purposes
    const mockMesh = { userData: { data: cardData, owner: owner } };
    const neighbors = getNeighbors(slotIdx);

    // Score from direct overrides
    neighbors.forEach(n => {
        const adj = state.board[n.i];
        if (adj) {
            if (adj.userData.owner === opp) {
                if (cardData[n.dir] > adj.userData.data[n.opp]) score += 10;
            } else {
                score += 1;
            }
        }
    });

    // Score from modular rules
    rulesRegistry.forEach(rule => {
        if (state.rules[rule.id] && rule.id !== 'combo') {
            const result = rule.execute(mockMesh, neighbors, state.board);
            if (result.triggered) {
                // Heuristic: +15 points per card that would be captured by a special rule
                score += (result.captures.length * 15);
            }
        }
    });

    return score;
}
