import { rulesRegistry } from './rules.js';
import { GameEngine } from './GameEngine.js';

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
 * @param {number} x - The X coordinate of the placement
 * @param {number} y - The Y coordinate of the placement
 * @param {object} cardData - The plain card object
 * @param {string} owner - The owner of the card ('PLAYER_1' or 'PLAYER_2')
 * @param {array} board2D - The 2D array representing the board
 * @returns {number} The score for this move
 */
export function evaluatePlacementScorePure(x, y, cardData, owner, board2D, rules = {}, boardElements = null) {
    let score = 0;

    // Create a deep-cloned state to avoid mutating the caller's board
    const currentState = GameEngine.createInitialState(owner, { rules, boardElements });
    currentState.board = board2D.map(row =>
        row.map(cell => cell ? {
            ...cell,
            data: {
                ...cell.data,
                values: cell.data?.values ? { ...cell.data.values } : undefined,
                skills: Array.isArray(cell.data?.skills) ? cell.data.skills.map(s => ({ ...s })) : []
            }
        } : null)
    );

    const action = {
        type: 'PLACE_CARD',
        player: owner,
        x: x,
        y: y,
        card: cardData
    };

    try {
        const nextState = GameEngine.computeNextState(currentState, action);

        // Calculate score based on board control difference
        let myCardsBefore = 0;
        let myCardsAfter = 0;

        for (let row = 0; row < board2D.length; row++) {
            for (let col = 0; col < board2D[row].length; col++) {
                if (board2D[row][col] && board2D[row][col].owner === owner) {
                    myCardsBefore++;
                }
                if (nextState.board[row][col] && nextState.board[row][col].owner === owner) {
                    myCardsAfter++;
                }
            }
        }

        // Base score is the number of cards gained (captures + the played card)
        const netGain = myCardsAfter - myCardsBefore;
        score += netGain * 15;

        // --- Defensive Evaluation ---
        // We favor protecting weak sides (low values) against edges or existing cards
        // and exposing strong sides (high values) to empty slots.
        const getVal = (v) => {
            if (v === 'A' || v === 'a' || v === 100 || v === '100' || v === 10 || v === '10') return 10;
            const parsed = parseInt(v, 10);
            return Number.isNaN(parsed) ? 0 : Math.max(0, Math.min(10, parsed));
        };
        const sides = [
            { dy: -1, dx: 0, val: getVal(cardData.topValue ?? cardData.top ?? cardData.values?.top) },    // top
            { dy: 0, dx: 1, val: getVal(cardData.rightValue ?? cardData.right ?? cardData.values?.right) },   // right
            { dy: 1, dx: 0, val: getVal(cardData.bottomValue ?? cardData.bottom ?? cardData.values?.bottom) },  // bottom
            { dy: 0, dx: -1, val: getVal(cardData.leftValue ?? cardData.left ?? cardData.values?.left) }    // left
        ];

        sides.forEach(side => {
            const ny = y + side.dy;
            const nx = x + side.dx;
            const isEdge = ny < 0 || ny >= board2D.length || nx < 0 || nx >= board2D[0].length;
            const isOccupied = !isEdge && board2D[ny][nx] !== null;

            if (isEdge || isOccupied) {
                // Protected side: hiding a weakness is good
                // If value is 1, bonus is 7. If 10, bonus is 0.7.
                score += (11 - side.val) * 0.7; 
            } else {
                // Exposed side: showing strength is good
                // If value is 10, bonus is 4. If 1, bonus is 0.4.
                score += side.val * 0.4;
            }
        });

    } catch (e) {
        // Invalid move or error in computation, score remains 0
        console.warn("Invalid move evaluation:", e.message);
        score = -Infinity;
    }

    return score;
}

/**
 * Pure AI picking the best move from its hand.
 * Returns { x, y, cardIdx } or null.
 * Difficulty is 0-100: 100 is 100% smart, 0 is 100% random
 */
export function getBestAIMovePure(board2D, hand, owner, rules = {}, difficulty = 100, boardElements = null) {
    if (hand.length === 0) return null;

    const boardWidth = board2D[0].length;
    const boardHeight = board2D.length;
    const flatBoard = board2D.flat();
    const emptySlots = flatBoard.map((v, i) => v === null ? i : null).filter(v => v !== null);

    if (emptySlots.length === 0) return null;

    // Difficulty logic: Random move chance (difficulty 100 -> 0% random)
    const randomChance = 100 - difficulty;
    let isRandomMove = (Math.random() * 100) < randomChance;

    if (isRandomMove) {
        const randomSlotIdx = emptySlots[Math.floor(Math.random() * emptySlots.length)];
        const randomCardIdx = Math.floor(Math.random() * hand.length);
        return {
            x: randomSlotIdx % boardWidth,
            y: Math.floor(randomSlotIdx / boardWidth),
            cardIdx: randomCardIdx
        };
    }

    let bestScore = -Infinity;
    let bestMove = null;

    for (let slotIdx of emptySlots) {
        const x = slotIdx % boardWidth;
        const y = Math.floor(slotIdx / boardWidth);

        for (let c = 0; c < hand.length; c++) {
            const card = hand[c];

            let score = evaluatePlacementScorePure(x, y, card, owner, board2D, rules, boardElements);

            // Dynamic corners logic
            const corners = [0, boardWidth - 1, (boardHeight - 1) * boardWidth, boardHeight * boardWidth - 1];
            if (corners.includes(slotIdx)) score += 2;

            const centerX = Math.floor(boardWidth / 2);
            const centerY = Math.floor(boardHeight / 2);
            const centerIdx = centerY * boardWidth + centerX;
            if (slotIdx === centerIdx) score -= 1.5;

            // Small randomness to avoid deterministic loops
            score += Math.random() * 0.5;

            if (score > bestScore) {
                bestScore = score;
                bestMove = { x, y, cardIdx: c };
            }
        }
    }

    return bestMove;
}
