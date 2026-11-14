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
                const owner = entry.owner === 'player' ? 'PLAYER_1' : (entry.owner === 'ai' ? 'PLAYER_2' : entry.owner);
                row.push({
                    data: {
                        ...entry.data,
                        values: entry.data?.values ? { ...entry.data.values } : undefined,
                        skills: Array.isArray(entry.data?.skills) ? entry.data.skills.map(s => ({ ...s })) : []
                    },
                    owner
                });
            } else {
                row.push(null);
            }
        }
        board2D.push(row);
    }
    return board2D;
}

function get2DBoardElements() {
    const w = state.boardWidth || 3;
    const h = state.boardHeight || 3;
    if (!Array.isArray(state.boardElements) || state.boardElements.length === 0) return null;
    const grid = [];
    for (let y = 0; y < h; y++) {
        grid.push(state.boardElements.slice(y * w, (y + 1) * w));
    }
    return grid;
}

/**
 * AI picks the best move from its hand using pureAi logic.
 * state.aiHand contains plain card data objects.
 * Returns { slot, cardIdx } or null.
 */
export function getBestAIMove() {
    const board2D = get2DBoard();
    const boardElements2D = get2DBoardElements();
    // Default difficulty to 100 if not set
    const difficulty = state.aiDifficulty !== undefined ? state.aiDifficulty : 100;

    // owner 'PLAYER_2' represents AI
    const move2D = getBestAIMovePure(board2D, state.aiHand, 'PLAYER_2', state.rules, difficulty, boardElements2D);

    if (move2D) {
        // Convert back to 1D slot index
        return {
            slot: move2D.y * state.boardWidth + move2D.x,
            cardIdx: move2D.cardIdx
        };
    }

    return null;
}
