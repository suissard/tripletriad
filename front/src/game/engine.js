import { state } from './state.js';
import { rulesRegistry } from './rules.js';

export const sleep = ms => new Promise(r => setTimeout(r, ms));

export function getNeighbors(index) {
    return [
        { i: index - 3, dir: 'top', opp: 'bottom', valid: index >= 3 },
        { i: index + 3, dir: 'bottom', opp: 'top', valid: index <= 5 },
        { i: index - 1, dir: 'left', opp: 'right', valid: index % 3 !== 0 },
        { i: index + 1, dir: 'right', opp: 'left', valid: index % 3 !== 2 }
    ].filter(n => n.valid);
}

/**
 * Capture a card on the board: change owner + reveal it.
 * boardEntry = state.board[i] = { data: {...}, owner: 'player'|'ai' }
 */
export function captureCard(boardEntry, newOwner) {
    boardEntry.data.revealed = true;
    boardEntry.owner = newOwner;

    // Deduct HP
    if (newOwner === 'player') {
        state.aiHealth -= 1;
    } else {
        state.pHealth -= 1;
    }

    // Check if game over by HP
    if (state.pHealth <= 0 || state.aiHealth <= 0) {
        checkGameOver();
    }
}

export function showAlert(text) {
    state.alerts = text;
    setTimeout(() => {
        if (state.alerts === text) state.alerts = '';
    }, 1500);
}

export async function resolveRules(startIndex, owner) {
    const useCombo = state.rules.combo;

    let comboStack = [];
    const neighbors = getNeighbors(startIndex);
    const centerEntry = state.board[startIndex]; // { data, owner }

    const actionRecord = {
        playedCard: centerEntry.data,
        owner: owner,
        capturedCards: []
    };

    let complexCaptures = new Set();
    let triggeredAlerts = [];

    // Dynamically execute enabled modular rules
    rulesRegistry.forEach(rule => {
        if (state.rules[rule.id] && rule.id !== 'combo') {
            const result = rule.execute(centerEntry, neighbors, state.board);
            if (result.triggered) {
                result.captures.forEach(c => complexCaptures.add(c));
                if (result.alertMessage) triggeredAlerts.push(result.alertMessage);
            }
        }
    });

    for (let entry of complexCaptures) {
        if (entry.owner !== owner) {
            captureCard(entry, owner);
            actionRecord.capturedCards.push(entry.data);
            const cardIndex = state.board.indexOf(entry);
            comboStack.push(cardIndex);

            if (triggeredAlerts.length > 0) {
                showAlert(triggeredAlerts[0]);
                triggeredAlerts.shift();
            }
        }
    }

    neighbors.forEach(n => {
        const adj = state.board[n.i];
        if (adj && adj.owner !== owner && centerEntry.data[n.dir] > adj.data[n.opp]) {
            if (!complexCaptures.has(adj)) {
                captureCard(adj, owner);
                actionRecord.capturedCards.push(adj.data);
            }
        }
    });

    if (comboStack.length > 0) await sleep(600);

    // Clear combo stack if rule is disabled
    if (!useCombo) comboStack = [];

    while (comboStack.length > 0) {
        let currentIdx = comboStack.shift();
        const comboEntry = state.board[currentIdx];
        if (!comboEntry) continue;

        let newCaptures = false;

        getNeighbors(currentIdx).forEach(n => {
            const adj = state.board[n.i];
            if (adj && adj.owner !== owner && comboEntry.data[n.dir] > adj.data[n.opp]) {
                captureCard(adj, owner);
                actionRecord.capturedCards.push(adj.data);
                comboStack.push(n.i);
                newCaptures = true;
            }
        });

        if (newCaptures) {
            showAlert("COMBO!");
            await sleep(600);
        }
    }

    // Append to action log
    state.actionLog.push(actionRecord);
    if (state.actionLog.length > 5) {
        state.actionLog.shift();
    }

    // Send backend log if there were captures
    if (actionRecord.capturedCards.length > 0) {
        import('./logger.js').then(({ sendGameLog }) => {
            sendGameLog('competence',
                { type: owner === 'player' ? 'player' : 'ai', id: owner },
                { count: actionRecord.capturedCards.length }
            );
        });
    }

    updateScores();
}

export function checkGameOver() {
    if (state.gameOver) return;

    let pBoard = 0, aBoard = 0;
    state.board.forEach(c => {
        if (c) (c.owner === 'player' ? pBoard++ : aBoard++);
    });

    state.pScore = pBoard;
    state.aiScore = aBoard;

    state.gameOver = true;
    state.gameState = 'gameover';

    if (state.pHealth <= 0) {
        state.winner = 'ai';
    } else if (state.aiHealth <= 0) {
        state.winner = 'player';
    } else if (pBoard > aBoard) {
        state.winner = 'player';
    } else if (aBoard > pBoard) {
        state.winner = 'ai';
    } else {
        state.winner = 'draw';
    }

    // Log game over to backend for single-player mode
    import('./logger.js').then(({ sendGameLog }) => {
        sendGameLog('game_over',
            { type: 'system', id: 'system' },
            { winner: state.winner }
        );
    });
}

export function endTurn(player) {
    if (state.gameOver) return;

    if (player === 'player') {
        state.turn = 'ai';
        state.aiMaxMana = 1; // Constant 1 mana for now
        state.aiMana = 1;
    } else {
        state.turn = 'player';
        state.pMaxMana = 1; // Constant 1 mana for now
        state.pMana = 1;
    }

    // Log turn change for single-player mode
    import('./logger.js').then(({ sendGameLog }) => {
        sendGameLog('turn_start',
            { type: 'system', id: 'system' },
            { player: state.turn }
        );
    });
}

export function updateScores() {
    let pBoard = 0, aBoard = 0;
    state.board.forEach(c => {
        if (c) (c.owner === 'player' ? pBoard++ : aBoard++);
    });

    state.pScore = pBoard;
    state.aiScore = aBoard;

    if (state.board.every(b => b !== null)) {
        setTimeout(() => {
            checkGameOver();
        }, 1000);
    }
}
