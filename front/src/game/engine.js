import { state } from './state.js';
import { rulesRegistry } from './rules.js';
import gsap from 'gsap';

export const sleep = ms => new Promise(r => setTimeout(r, ms));

export function getNeighbors(index) {
    return [
        { i: index - 3, dir: 'top', opp: 'bottom', valid: index >= 3 },
        { i: index + 3, dir: 'bottom', opp: 'top', valid: index <= 5 },
        { i: index - 1, dir: 'left', opp: 'right', valid: index % 3 !== 0 },
        { i: index + 1, dir: 'right', opp: 'left', valid: index % 3 !== 2 }
    ].filter(n => n.valid);
}

export function captureCard(mesh, newOwner) {
    mesh.userData.data.revealed = true;

    mesh.userData.owner = newOwner;
    const col = newOwner === 'player' ? 0x00d2ff : 0xff0055;

    mesh.material[0].color.setHex(col);
    mesh.material[1].color.setHex(col);
    mesh.material[4].color.setHex(col);
    mesh.material[5].color.setHex(col);

    if (mesh.userData.redraw) {
        mesh.userData.redraw(mesh.userData.img, newOwner);
    }

    gsap.to(mesh.rotation, { z: mesh.rotation.z + Math.PI * 2, y: mesh.rotation.y + Math.PI * 2, duration: 0.5, ease: "power2.out" });
    gsap.to(mesh.position, { y: 1.5, duration: 0.25, yoyo: true, repeat: 1 });
}

export function showAlert(text) {
    state.alerts = text;
    // Clearing the alert after a delay so it can be re-triggered
    setTimeout(() => {
        if (state.alerts === text) state.alerts = '';
    }, 1500);
}

export async function resolveRules(startIndex, owner) {
    const useCombo = state.rules.combo;

    let comboStack = [];
    const neighbors = getNeighbors(startIndex);
    const centerCard = state.board[startIndex];

    let complexCaptures = new Set();
    let triggeredAlerts = [];

    // Dynamically execute enabled modular rules
    rulesRegistry.forEach(rule => {
        if (state.rules[rule.id] && rule.id !== 'combo') {
            const result = rule.execute(centerCard, neighbors, state.board);
            if (result.triggered) {
                result.captures.forEach(c => complexCaptures.add(c));
                if (result.alertMessage) triggeredAlerts.push(result.alertMessage);
            }
        }
    });

    for (let card of complexCaptures) {
        if (card.userData.owner !== owner) {
            captureCard(card, owner);
            const cardIndex = state.board.indexOf(card);
            comboStack.push(cardIndex);

            // Show the first alert that was triggered
            if (triggeredAlerts.length > 0) {
                showAlert(triggeredAlerts[0]);
                triggeredAlerts.shift();
            }
        }
    }

    neighbors.forEach(n => {
        const adj = state.board[n.i];
        if (adj && adj.userData.owner !== owner && centerCard.userData.data[n.dir] > adj.userData.data[n.opp]) {
            if (!complexCaptures.has(adj)) captureCard(adj, owner);
        }
    });

    if (comboStack.length > 0) await sleep(600);

    // Vide la pile si la règle combo est désactivée
    if (!useCombo) comboStack = [];

    while (comboStack.length > 0) {
        let currentIdx = comboStack.shift();
        const comboCard = state.board[currentIdx];
        if (!comboCard) continue;

        let newCaptures = false;

        getNeighbors(currentIdx).forEach(n => {
            const adj = state.board[n.i];
            if (adj && adj.userData.owner !== owner && comboCard.userData.data[n.dir] > adj.userData.data[n.opp]) {
                captureCard(adj, owner);
                comboStack.push(n.i);
                newCaptures = true;
            }
        });

        if (newCaptures) {
            showAlert("COMBO!");
            await sleep(600);
        }
    }

    updateScores();
}

export function updateScores() {
    let pBoard = 0, aBoard = 0;
    state.board.forEach(c => {
        if (c) (c.userData.owner === 'player' ? pBoard++ : aBoard++);
    });

    state.pScore = pBoard;
    state.aiScore = aBoard;

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
