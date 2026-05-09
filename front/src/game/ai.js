import { state } from './state.js';
import { getBestAIMovePure } from './pureAi.js';

/**
 * Helper to convert 1D state.board to 2D board required by pureAi
 */
function get2DBoard() {
    const w = state.boardWidth;
    const h = state.boardHeight;
    const board2D = [];
    for (let y = 0; y < h; y++) {
        const row = [];
        for (let x = 0; x < w; x++) {
            const entry = state.board[y * w + x];
            if (entry) {
                // normalize owner to GameEngine format if needed ('player' -> 'PLAYER_1', 'ai' -> 'PLAYER_2')
                const owner = entry.owner === 'player' ? 'PLAYER_1' : (entry.owner === 'ai' ? 'PLAYER_2' : entry.owner);
                row.push({ data: entry.data, owner });
            } else {
                row.push(null);
            }
        }
        board2D.push(row);
    }
    return board2D;
}

/**
 * AI picks the best move from its hand using pureAi logic.
 * state.aiHand contains plain card data objects.
 * Returns { slot, cardIdx } or null.
 */
export function getBestAIMove() {
    // If AI has no mana, return null immediately
    if (state.aiMana < 1) return null;

    const board2D = get2DBoard();
    // Default difficulty to 100 if not set
    const difficulty = state.aiDifficulty !== undefined ? state.aiDifficulty : 100;

    // owner 'PLAYER_2' represents AI
    const move2D = getBestAIMovePure(board2D, state.aiHand, 'PLAYER_2', state.rules, difficulty);

    if (move2D) {
        // Convert back to 1D slot index
        return {
            slot: move2D.y * state.boardWidth + move2D.x,
            cardIdx: move2D.cardIdx
        };
    }

    return null;
}
