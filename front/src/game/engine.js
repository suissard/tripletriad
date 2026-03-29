import { state } from './state.js';
import { rulesRegistry } from './rules.js';
import { getNeighbors } from './getNeighbors.js';

export { getNeighbors };

export const sleep = ms => new Promise(r => setTimeout(r, ms));

/**
 * Capture a card on the board: change owner + reveal it.
 * boardEntry = state.board[i] = { data: {...}, owner: 'player'|'ai' }
 */
export function captureCard(boardEntry, newOwner, direction = null) {
    boardEntry.data.revealed = true;
    boardEntry.owner = newOwner;
    if (direction) {
        boardEntry.data.impactDirection = direction;
        // Ensure reactive update trigger if needed, but modifying data object should suffice
    }

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

    state.comboActiveIndex = startIndex;
    state.comboCount = 0;

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
                captureCard(adj, owner, n.opp); // The side of adj that was attacked is its opp side
                actionRecord.capturedCards.push(adj.data);
            }
        }
    });

    state.comboCount = actionRecord.capturedCards.length;

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
                captureCard(adj, owner, n.opp);
                actionRecord.capturedCards.push(adj.data);
                comboStack.push(n.i);
                newCaptures = true;
            }
        });

        if (newCaptures) {
            showAlert("COMBO!");
            state.comboCount = actionRecord.capturedCards.length;
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

    // Reset combo active index after a brief delay
    setTimeout(() => {
        state.comboActiveIndex = null;
        state.comboCount = 0;
    }, 1500);
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

    const pNoCards = state.pHand.length === 0 && state.pDeck.length === 0;
    const aiNoCards = state.aiHand.length === 0 && state.aiDeck.length === 0;
    const boardFull = state.board.every(slot => slot !== null);

    if (pNoCards || aiNoCards || boardFull) {
        setTimeout(() => {
            checkGameOver();
        }, 1000);
    }
}

export function expandBoard() {
    let w = state.boardWidth;
    let h = state.boardHeight;
    let currentBoard = state.board;

    let anyRowFull = false;
    for (let y = 0; y < h; y++) {
        let rowFull = true;
        for (let x = 0; x < w; x++) {
            if (currentBoard[y * w + x] === null) { rowFull = false; break; }
        }
        if (rowFull) { anyRowFull = true; break; }
    }

    let anyColFull = false;
    for (let x = 0; x < w; x++) {
        let colFull = true;
        for (let y = 0; y < h; y++) {
            if (currentBoard[y * w + x] === null) { colFull = false; break; }
        }
        if (colFull) { anyColFull = true; break; }
    }

    if (!anyRowFull && !anyColFull) return;

    let colAddedLeft = (anyRowFull && w < 4) ? 1 : 0;
    let colAddedRight = (anyRowFull && (w + colAddedLeft) < 4) ? 1 : 0;
    let rowAddedTop = (anyColFull && h < 4) ? 1 : 0;
    let rowAddedBot = (anyColFull && (h + rowAddedTop) < 4) ? 1 : 0;

    if (colAddedLeft === 0 && colAddedRight === 0 && rowAddedTop === 0 && rowAddedBot === 0) return;

    let nextW = w + colAddedLeft + colAddedRight;
    let nextH = h + rowAddedTop + rowAddedBot;
    let nextBoard = Array(nextW * nextH).fill(null);

    for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
            let oldVal = currentBoard[y * w + x];
            let newX = x + colAddedLeft;
            let newY = y + rowAddedTop;
            nextBoard[newY * nextW + newX] = oldVal;
        }
    }

    state.board = nextBoard;
    state.boardWidth = nextW;
    state.boardHeight = nextH;
}
