const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'front', 'src', 'game', 'input.js');
let code = fs.readFileSync(filePath, 'utf8');

const onPointerUpReplacement = `
<<<<<<< SEARCH
        if (slot && state.board[slot.userData.id] === null) {
            state.busy = true;

            const cardIdx = state.pHand.indexOf(current);

            state.pHand = state.pHand.filter(c => c !== current);
            state.board[slot.userData.id] = current;
            current.userData.data.revealed = true;

            gsap.to(current.position, { x: slot.position.x, y: 0.15, z: slot.position.z, duration: 0.2 });
            await sleep(300);

            await resolveRules(slot.userData.id, 'player');

            refillHand('player');
            updateScores();
            state.turn = 'ai';

            if (state.online) {
                webrtc.sendMessage({ type: 'move', cardIdx: cardIdx, slot: slot.userData.id });
                // Do not call aiPlay in online mode
            } else {
                setTimeout(aiPlay, 800);
            }
        } else {
            refillHand('player');
        }
=======
        if (slot && state.board[slot.userData.id] === null) {
            const cardLevel = current.userData.data.level || 1;

            if (state.pMana >= cardLevel) {
                state.busy = true;
                state.pMana -= cardLevel;

                const cardIdx = state.pHand.indexOf(current);

                state.pHand = state.pHand.filter(c => c !== current);
                state.board[slot.userData.id] = current;
                current.userData.data.revealed = true;

                gsap.to(current.position, { x: slot.position.x, y: 0.15, z: slot.position.z, duration: 0.2 });
                await sleep(300);

                await resolveRules(slot.userData.id, 'player');

                refillHand('player');
                updateScores();

                // turn logic is now manual
                state.busy = false;

                if (state.online) {
                    webrtc.sendMessage({ type: 'move', cardIdx: cardIdx, slot: slot.userData.id });
                }
            } else {
                state.alerts = "Pas assez de Mana!";
                setTimeout(() => { if (state.alerts === "Pas assez de Mana!") state.alerts = ''; }, 1500);
                refillHand('player');
            }
        } else {
            refillHand('player');
        }
>>>>>>> REPLACE
`;


const processOpponentMoveReplacement = `
<<<<<<< SEARCH
    gsap.to(cardMesh.position, { x: slot.position.x, y: 0.15, z: slot.position.z, duration: 0.6, ease: "power2.out" });
    gsap.to(cardMesh.rotation, { y: 0, z: 0, duration: 0.6 });

    await sleep(600);
    await resolveRules(move.slot, 'ai');

    refillHand('ai');
    updateScores();
    state.turn = 'player';
    state.busy = false;
}
=======
    gsap.to(cardMesh.position, { x: slot.position.x, y: 0.15, z: slot.position.z, duration: 0.6, ease: "power2.out" });
    gsap.to(cardMesh.rotation, { y: 0, z: 0, duration: 0.6 });

    await sleep(600);
    await resolveRules(move.slot, 'ai');

    refillHand('ai');
    updateScores();
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

code = applyPatch(code, onPointerUpReplacement, 'onPointerUp');
code = applyPatch(code, processOpponentMoveReplacement, 'processOpponentMove');


fs.writeFileSync(filePath, code, 'utf8');
