/**
 * capture-preview.js
 * 
 * Pure simulation module: given a card and the current board state,
 * compute which slots would lead to captures (direct + combo),
 * WITHOUT mutating the reactive game state.
 */
import { state } from './state.js';
import { rulesRegistry } from './rules.js';

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
    const opp = 'ai';
    const w = state.boardWidth;
    const h = state.boardHeight;
    const board = state.board;

    // Quick exit if slot is occupied
    if (board[slotIndex] !== null) {
        return { directCaptures: [], comboCaptures: [] };
    }

    const neighbors = getNeighborsPure(slotIndex, w, h);

    // Mock the placed card as a board entry
    const mockEntry = { data: card, owner };

    const directCaptures = [];
    const comboCaptures = [];

    // Track which indices were already captured (to avoid duplicates)
    const capturedSet = new Set();

    // --- 1. Complex rules (Same, Plus) ---
    let complexCaptureIndices = new Set();

    rulesRegistry.forEach(rule => {
        if (state.rules[rule.id] && rule.id !== 'combo') {
            const result = rule.execute(mockEntry, neighbors, board);
            if (result.triggered) {
                result.captures.forEach(capturedEntry => {
                    const idx = board.indexOf(capturedEntry);
                    if (idx !== -1 && capturedEntry.owner !== owner) {
                        complexCaptureIndices.add(idx);
                    }
                });
            }
        }
    });

    // Add complex captures to directCaptures
    for (const idx of complexCaptureIndices) {
        if (!capturedSet.has(idx)) {
            capturedSet.add(idx);
            // Find the direction from slotIndex to idx
            const dir = getDirectionBetween(slotIndex, idx, w);
            directCaptures.push({ index: idx, direction: dir });
        }
    }

    // --- 2. Classic captures (value comparison) ---
    neighbors.forEach(n => {
        const adj = board[n.i];
        if (adj && adj.owner !== owner && card[n.dir] > adj.data[n.opp]) {
            if (!capturedSet.has(n.i)) {
                capturedSet.add(n.i);
                directCaptures.push({ index: n.i, direction: n.opp });
            }
        }
    });

    // --- 3. Combo simulation (if combo rule is enabled) ---
    if (state.rules.combo && complexCaptureIndices.size > 0) {
        // Build a temporary ownership map for combo simulation
        const ownershipOverrides = new Map();
        // Cards captured by Same/Plus now belong to the player
        for (const idx of complexCaptureIndices) {
            ownershipOverrides.set(idx, owner);
        }

        let comboStack = [...complexCaptureIndices];

        while (comboStack.length > 0) {
            const currentIdx = comboStack.shift();
            const currentEntry = board[currentIdx];
            if (!currentEntry) continue;

            const currentCardData = currentEntry.data;
            const comboNeighbors = getNeighborsPure(currentIdx, w, h);

            comboNeighbors.forEach(n => {
                const adj = board[n.i];
                if (!adj) return;

                // Determine effective owner
                const adjEffectiveOwner = ownershipOverrides.has(n.i) ? ownershipOverrides.get(n.i) : adj.owner;
                
                if (adjEffectiveOwner !== owner && currentCardData[n.dir] > adj.data[n.opp]) {
                    if (!capturedSet.has(n.i)) {
                        capturedSet.add(n.i);
                        ownershipOverrides.set(n.i, owner);
                        comboCaptures.push({ index: n.i, sourceIndex: currentIdx, direction: n.opp });
                        comboStack.push(n.i);
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
