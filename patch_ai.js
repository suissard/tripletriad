const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'front', 'src', 'game', 'ai.js');
let code = fs.readFileSync(filePath, 'utf8');

const getBestAIMoveReplacement = `
<<<<<<< SEARCH
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
=======
export function getBestAIMove() {
    let bestScore = -Infinity;
    let bestMove = null;

    const emptySlots = state.board.map((v, i) => v === null ? i : null).filter(v => v !== null);

    for (let slotIdx of emptySlots) {
        for (let c = 0; c < state.aiHand.length; c++) {
            const card = state.aiHand[c];
            const level = card.userData.data.level || 1;

            // AI must be able to afford the card
            if (state.aiMana >= level) {
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
    }
    return bestMove; // Can return null if no moves are possible
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

code = applyPatch(code, getBestAIMoveReplacement, 'getBestAIMove');

fs.writeFileSync(filePath, code, 'utf8');
