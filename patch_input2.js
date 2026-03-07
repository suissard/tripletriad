const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'front', 'src', 'game', 'input.js');
let code = fs.readFileSync(filePath, 'utf8');

const processOpponentMoveReplacement = `
<<<<<<< SEARCH
export async function processOpponentMove(move) {
    if (move.slot === null) return;

    const cardMesh = state.aiHand.splice(move.cardIdx, 1)[0];
    const slot = slots[move.slot];

    state.board[move.slot] = cardMesh;
    cardMesh.userData.data.revealed = true;
    cardMesh.userData.redraw(cardMesh.userData.img, 'ai');
=======
export async function processOpponentMove(move) {
    if (move.slot === null) return;

    const cardMesh = state.aiHand.splice(move.cardIdx, 1)[0];
    const slot = slots[move.slot];

    const cardLevel = cardMesh.userData.data.level || 1;
    state.aiMana -= cardLevel;

    state.board[move.slot] = cardMesh;
    cardMesh.userData.data.revealed = true;
    cardMesh.userData.redraw(cardMesh.userData.img, 'ai');
>>>>>>> REPLACE
`;


const aiPlayReplacement = `
<<<<<<< SEARCH
export async function aiPlay() {
    if (state.board.every(b => b !== null)) return;
    if (state.online) return;

    const move = getBestAIMove();
    await processOpponentMove(move);
}
=======
import { endTurn } from './engine.js';

export async function aiPlay() {
    if (state.board.every(b => b !== null) || state.gameOver) return;
    if (state.online) return;

    let move = getBestAIMove();
    if (move) {
        state.busy = true;
        await processOpponentMove(move);
        state.busy = false;

        // Try another move if AI still has mana and cards
        setTimeout(aiPlay, 800);
    } else {
        // AI has no valid moves left or not enough mana, ends turn
        endTurn('ai');
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

code = applyPatch(code, processOpponentMoveReplacement, 'processOpponentMove');
code = applyPatch(code, aiPlayReplacement, 'aiPlay');

fs.writeFileSync(filePath, code, 'utf8');
