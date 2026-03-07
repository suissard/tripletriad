const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'front', 'src', 'game', 'engine.js');
let code = fs.readFileSync(filePath, 'utf8');

const captureReplacement = `
<<<<<<< SEARCH
    if (mesh.userData.redraw) {
        mesh.userData.redraw(mesh.userData.img, newOwner);
    }
=======
    if (mesh.userData.redraw) {
        mesh.userData.redraw(mesh.userData.img, newOwner);
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
>>>>>>> REPLACE
`;

const resolveRulesReplacement = `
<<<<<<< SEARCH
export async function resolveRules(startIndex, owner) {
    const useCombo = state.rules.combo;

    let comboStack = [];
    const neighbors = getNeighbors(startIndex);
    const centerCard = state.board[startIndex];

    let complexCaptures = new Set();
=======
export async function resolveRules(startIndex, owner) {
    const useCombo = state.rules.combo;

    let comboStack = [];
    const neighbors = getNeighbors(startIndex);
    const centerCard = state.board[startIndex];

    const actionRecord = {
        playedCard: centerCard.userData.data,
        owner: owner,
        capturedCards: []
    };

    let complexCaptures = new Set();
>>>>>>> REPLACE
`;

const complexCapturePushReplacement = `
<<<<<<< SEARCH
    for (let card of complexCaptures) {
        if (card.userData.owner !== owner) {
            captureCard(card, owner);
            const cardIndex = state.board.indexOf(card);
            comboStack.push(cardIndex);
=======
    for (let card of complexCaptures) {
        if (card.userData.owner !== owner) {
            captureCard(card, owner);
            actionRecord.capturedCards.push(card.userData.data);
            const cardIndex = state.board.indexOf(card);
            comboStack.push(cardIndex);
>>>>>>> REPLACE
`;

const basicCapturePushReplacement = `
<<<<<<< SEARCH
    neighbors.forEach(n => {
        const adj = state.board[n.i];
        if (adj && adj.userData.owner !== owner && centerCard.userData.data[n.dir] > adj.userData.data[n.opp]) {
            if (!complexCaptures.has(adj)) captureCard(adj, owner);
        }
    });
=======
    neighbors.forEach(n => {
        const adj = state.board[n.i];
        if (adj && adj.userData.owner !== owner && centerCard.userData.data[n.dir] > adj.userData.data[n.opp]) {
            if (!complexCaptures.has(adj)) {
                captureCard(adj, owner);
                actionRecord.capturedCards.push(adj.userData.data);
            }
        }
    });
>>>>>>> REPLACE
`;


const comboCapturePushReplacement = `
<<<<<<< SEARCH
        getNeighbors(currentIdx).forEach(n => {
            const adj = state.board[n.i];
            if (adj && adj.userData.owner !== owner && comboCard.userData.data[n.dir] > adj.userData.data[n.opp]) {
                captureCard(adj, owner);
                comboStack.push(n.i);
                newCaptures = true;
            }
        });
=======
        getNeighbors(currentIdx).forEach(n => {
            const adj = state.board[n.i];
            if (adj && adj.userData.owner !== owner && comboCard.userData.data[n.dir] > adj.userData.data[n.opp]) {
                captureCard(adj, owner);
                actionRecord.capturedCards.push(adj.userData.data);
                comboStack.push(n.i);
                newCaptures = true;
            }
        });
>>>>>>> REPLACE
`;

const endRulesReplacement = `
<<<<<<< SEARCH
    updateScores();
}
=======
    // Append to action log
    state.actionLog.push(actionRecord);
    // Keep only last 5
    if (state.actionLog.length > 5) {
        state.actionLog.shift();
    }

    updateScores();
}

export function checkGameOver() {
    if (state.gameOver) return;

    let pBoard = 0, aBoard = 0;
    state.board.forEach(c => {
        if (c) (c.userData.owner === 'player' ? pBoard++ : aBoard++);
    });

    state.pScore = pBoard;
    state.aiScore = aBoard;

    state.gameOver = true;

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
}

export function endTurn(player) {
    if (state.gameOver) return;

    if (player === 'player') {
        state.turn = 'ai';
        if (state.aiMaxMana < 10) state.aiMaxMana++;
        state.aiMana = state.aiMaxMana;
    } else {
        state.turn = 'player';
        if (state.pMaxMana < 10) state.pMaxMana++;
        state.pMana = state.pMaxMana;
    }
}
>>>>>>> REPLACE
`;

const scoresReplacement = `
<<<<<<< SEARCH
    if (state.board.every(b => b !== null)) {
        setTimeout(() => {
            state.gameOver = true;
            if (pBoard > aBoard) {
                state.winner = 'player';
            } else if (aBoard > pBoard) {
                state.winner = 'ai';
            } else {
                state.winner = 'draw';
            }
        }, 1000);
    }
}
=======
    if (state.board.every(b => b !== null)) {
        setTimeout(() => {
            checkGameOver();
        }, 1000);
    }
}
>>>>>>> REPLACE
`;

function applyPatch(original, patchStr, name) {
    const searchMarker = '<<<<<<< SEARCH\n';
    const replaceMarker = '=======\n';
    const endMarker = '>>>>>>> REPLACE\n';

    const searchStart = patchStr.indexOf(searchMarker);
    const replaceStart = patchStr.indexOf(replaceMarker);
    const replaceEnd = patchStr.indexOf(endMarker);

    if (searchStart === -1 || replaceStart === -1 || replaceEnd === -1) {
        console.error('Patch format invalid for ' + name);
        return original;
    }

    const searchBlock = patchStr.substring(searchStart + searchMarker.length, replaceStart);
    const replaceBlock = patchStr.substring(replaceStart + replaceMarker.length, replaceEnd);

    if (original.includes(searchBlock)) {
        console.log('Applied ' + name);
        return original.replace(searchBlock, replaceBlock);
    } else {
        console.error('Could not find block for ' + name);
        return original;
    }
}

code = applyPatch(code, captureReplacement, 'capture');
code = applyPatch(code, resolveRulesReplacement, 'resolveRules');
code = applyPatch(code, complexCapturePushReplacement, 'complexCapture');
code = applyPatch(code, basicCapturePushReplacement, 'basicCapture');
code = applyPatch(code, comboCapturePushReplacement, 'comboCapture');
code = applyPatch(code, scoresReplacement, 'scores');
code = applyPatch(code, endRulesReplacement, 'endRules');

fs.writeFileSync(filePath, code, 'utf8');
