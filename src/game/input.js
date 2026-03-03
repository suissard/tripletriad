import * as THREE from 'three';
import gsap from 'gsap';
import { state } from './state.js';
import { camera, slots, refillHand } from './three-scene.js';
import { resolveRules, sleep, updateScores } from './engine.js';
import { getBestAIMove } from './ai.js';

let raycaster;
let mouse;
let dragged = null;
let hoveredSlot = null;
let currentListeners = [];

export function initInput() {
    raycaster = new THREE.Raycaster();
    mouse = new THREE.Vector2();

    const onPointerDown = e => {
        if (e.target.closest('.ui-layer')) return;

        if (state.turn !== 'player' || state.busy) return;
        mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
        mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
        raycaster.setFromCamera(mouse, camera);

        const hits = raycaster.intersectObjects(state.pHand);
        if (hits.length > 0) {
            dragged = hits[0].object;
            gsap.to(dragged.position, { y: 2.5, duration: 0.1 });
            gsap.to(dragged.rotation, { x: -Math.PI / 8, duration: 0.1 });
        }
    };

    const onPointerMove = e => {
        if (!dragged) return;
        mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
        mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
        raycaster.setFromCamera(mouse, camera);

        // Movement logic
        const pos = new THREE.Vector3();
        raycaster.ray.intersectPlane(new THREE.Plane(new THREE.Vector3(0, 1, 0), -2), pos);
        dragged.position.lerp(pos, 0.5);

        // Hover effect logic
        const hits = raycaster.intersectObjects(slots);
        const slot = hits.length > 0 ? hits[0].object : null;

        if (hoveredSlot && hoveredSlot !== slot) {
            // Reset previous hover
            hoveredSlot.material.color.setHex(0x111122);
            hoveredSlot.material.opacity = 0.8;
            hoveredSlot = null;
        }

        if (slot && state.board[slot.userData.id] === null) {
            // Apply new hover
            slot.material.color.setHex(0x00d2ff);
            slot.material.opacity = 1.0;
            hoveredSlot = slot;
        }
    };

    const onPointerUp = async () => {
        if (!dragged) return;
        const current = dragged;
        dragged = null;
        gsap.to(current.rotation, { x: 0, duration: 0.2 });

        if (hoveredSlot) {
            hoveredSlot.material.color.setHex(0x111122);
            hoveredSlot.material.opacity = 0.8;
            hoveredSlot = null;
        }

        raycaster.setFromCamera(mouse, camera);
        const hits = raycaster.intersectObjects(slots);
        const slot = hits.length > 0 ? hits[0].object : null;

        if (slot && state.board[slot.userData.id] === null) {
            state.busy = true;
            state.pHand = state.pHand.filter(c => c !== current);
            state.board[slot.userData.id] = current;
            current.userData.data.revealed = true;

            gsap.to(current.position, { x: slot.position.x, y: 0.15, z: slot.position.z, duration: 0.2 });
            await sleep(300);

            await resolveRules(slot.userData.id, 'player');

            refillHand('player');
            updateScores();
            state.turn = 'ai';
            setTimeout(aiPlay, 800);
        } else {
            refillHand('player');
        }
    };

    window.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);

    currentListeners = [
        { type: 'pointerdown', fn: onPointerDown },
        { type: 'pointermove', fn: onPointerMove },
        { type: 'pointerup', fn: onPointerUp }
    ];
}

export function cleanupInput() {
    currentListeners.forEach(l => window.removeEventListener(l.type, l.fn));
    currentListeners = [];
}

export async function aiPlay() {
    if (state.board.every(b => b !== null)) return;
    const move = getBestAIMove();
    if (move.slot === null) return;

    const cardMesh = state.aiHand.splice(move.cardIdx, 1)[0];
    const slot = slots[move.slot];

    state.board[move.slot] = cardMesh;
    cardMesh.userData.data.revealed = true;
    cardMesh.userData.redraw(cardMesh.userData.img, 'ai');

    gsap.to(cardMesh.position, { x: slot.position.x, y: 0.15, z: slot.position.z, duration: 0.6, ease: "power2.out" });
    gsap.to(cardMesh.rotation, { y: 0, z: 0, duration: 0.6 });

    await sleep(600);
    await resolveRules(move.slot, 'ai');

    refillHand('ai');
    updateScores();
    state.turn = 'player';
    state.busy = false;
}
