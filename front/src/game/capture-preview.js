/**
 * capture-preview.js
 * 
 * Pure simulation module: given a card and the current board state,
 * compute which slots would lead to captures (direct + combo),
 * WITHOUT mutating the reactive game state.
 */
import { state } from './state.js';
import { rulesRegistry } from './rules.js';
import { GameEngine } from './GameEngine.js';

/**
 * Get neighbors for a given flat index on the board.
 * Pure version — uses provided dimensions instead of reactive state.
 */
function getNeighborsPure(index, w, h) {
    const x = index % w;
    const y = Math.floor(index / w);

    return [
        { i: index - w, dir: 'top', opp: 'bottom', valid: y > 0 },
        { i: index + w, dir: 'bottom', opp: 'top', valid: y < h - 1 },
        { i: index - 1, dir: 'left', opp: 'right', valid: x > 0 },
        { i: index + 1, dir: 'right', opp: 'left', valid: x < w - 1 }
    ].filter(n => n.valid);
}

/**
 * Simulate captures for a card placed at a given slot index.
 * Returns { directCaptures: [{index, direction}], comboCaptures: [{index, sourceIndex, direction}] }
 */
export function simulateCaptures(card, slotIndex) {
    const owner = 'player';
    const w = state.boardWidth;
    const h = state.boardHeight;
    const boardFlat = state.board;

    // Quick exit if slot is occupied
    if (boardFlat[slotIndex] !== null) {
        return { directCaptures: [], comboCaptures: [] };
    }

    // Convert flat board to 2D for GameEngine
    const board2D = [];
    for (let r = 0; r < h; r++) {
        board2D.push(boardFlat.slice(r * w, (r + 1) * w));
    }

    // Faction counts BEFORE placement to delay bonus for the 4th card
    const factionCountsBefore = GameEngine.getFactionCounts(board2D);

    const x = slotIndex % w;
    const y = Math.floor(slotIndex / w);

    // Mock the placed card
    const mockEntry = { 
        data: { 
            ...card,
            hp: card.hp !== undefined ? card.hp : (card.defaultHp || 3)
        }, 
        owner 
    };
    
    // Temporarily place on 2D board
    board2D[y][x] = mockEntry;

    const directCaptures = [];
    const comboCaptures = [];
    const capturedSet = new Set();

    // --- 1. Complex rules (Same, Plus) ---
    // Note: rules still use flat board internally in some cases, but they expect board objects
    let complexCaptureIndices = new Set();
    const neighbors = getNeighborsPure(slotIndex, w, h);

    rulesRegistry.forEach(rule => {
        if (state.rules[rule.id] && rule.id !== 'combo') {
            const result = rule.execute(mockEntry, neighbors, boardFlat);
            if (result.triggered) {
                result.captures.forEach(capturedEntry => {
                    const idx = boardFlat.indexOf(capturedEntry);
                    if (idx !== -1 && capturedEntry.owner !== owner) {
                        complexCaptureIndices.add(idx);
                    }
                });
            }
        }
    });

    for (const idx of complexCaptureIndices) {
        if (!capturedSet.has(idx)) {
            capturedSet.add(idx);
            const dir = getDirectionBetween(slotIndex, idx, w);
            directCaptures.push({ index: idx, direction: dir });
        }
    }

    // --- 2. Classic captures ---
    neighbors.forEach(n => {
        const nx = n.i % w;
        const ny = Math.floor(n.i / w);
        const adj = board2D[ny][nx];

        if (adj && adj.owner !== owner) {
            const myVal = GameEngine.getEffectiveValue(board2D, x, y, n.dir, factionCountsBefore);
            const oppVal = GameEngine.getEffectiveValue(board2D, nx, ny, n.opp, factionCountsBefore);

            if (myVal > oppVal) {
                if (!capturedSet.has(n.i)) {
                    capturedSet.add(n.i);
                    directCaptures.push({ index: n.i, direction: n.opp });
                }
            }
        }
    });

    // --- 3. Combo simulation ---
    if (state.rules.combo && (complexCaptureIndices.size > 0 || directCaptures.length > 0)) {
        // We also allow combos from classic captures if the rule permits, 
        // but here we follow the existing logic which was slightly restricted.
        // Let's broaden it to match GameEngine's combo logic.
        
        // Deep clone board for combo simulation
        const comboBoard = board2D.map(row => row.map(cell => cell ? { ...cell, data: { ...cell.data } } : null));
        
        // Initial captures are flipped
        [...directCaptures].forEach(cap => {
            const cx = cap.index % w;
            const cy = Math.floor(cap.index / w);
            comboBoard[cy][cx].owner = owner;
        });

        let comboStack = [...capturedSet].map(idx => ({
            idx,
            x: idx % w,
            y: Math.floor(idx / w)
        }));

        while (comboStack.length > 0) {
            const current = comboStack.shift();
            const currentEntry = comboBoard[current.y][current.x];
            const currentNeighbors = getNeighborsPure(current.idx, w, h);

            currentNeighbors.forEach(n => {
                const nx = n.i % w;
                const ny = Math.floor(n.i / w);
                const adj = comboBoard[ny][nx];
                if (!adj || adj.owner === owner) return;

                const myVal = GameEngine.getEffectiveValue(comboBoard, current.x, current.y, n.dir, factionCountsBefore);
                const oppVal = GameEngine.getEffectiveValue(comboBoard, nx, ny, n.opp, factionCountsBefore);

                if (myVal > oppVal) {
                    if (!capturedSet.has(n.i)) {
                        capturedSet.add(n.i);
                        adj.owner = owner;
                        comboCaptures.push({ index: n.i, sourceIndex: current.idx, direction: n.opp });
                        comboStack.push({ idx: n.i, x: nx, y: ny });
                    }
                }
            });
        }
    }

    return { directCaptures, comboCaptures };
}

/**
 * Compute previews for ALL empty slots on the board.
 * Returns a Map<slotIndex, { directCaptures, comboCaptures, totalCaptures }>
 * Only includes slots that have at least one capture.
 */
export function computeAllPreviews(card) {
    if (!card) return null;

    const previews = new Map();
    const board = state.board;

    for (let i = 0; i < board.length; i++) {
        if (board[i] !== null) continue;

        const result = simulateCaptures(card, i);
        const totalCaptures = result.directCaptures.length + result.comboCaptures.length;

        if (totalCaptures > 0) {
            previews.set(i, {
                ...result,
                totalCaptures
            });
        }
    }

    return previews.size > 0 ? previews : null;
}

/**
 * Helper: determine direction label between two flat indices.
 */
function getDirectionBetween(fromIdx, toIdx, w) {
    const diff = toIdx - fromIdx;
    if (diff === -w) return 'top';
    if (diff === w) return 'bottom';
    if (diff === -1) return 'left';
    if (diff === 1) return 'right';
    return null;
}
