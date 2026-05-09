import * as THREE from 'three';
import { camera, slots } from './three-scene.js';
import { state } from './state.js';

export async function requestTargets(targetingSteps, board, playerType, context, aiLogic = null) {
    if (!targetingSteps || targetingSteps.length === 0) return [];

    const targets = [];

    for (const step of targetingSteps) {
        if (playerType === 'player') {
            const target = await requestSinglePlayerTarget(step, board);
            if (target) {
                targets.push(target);
            }
        } else {
            const target = evaluateAITarget(step, board, context, aiLogic);
            if (target) {
                targets.push(target);
            }
        }
    }

    return targets;
}

function requestSinglePlayerTarget(step, board) {
    return new Promise((resolve) => {
        const originalCursor = document.body.style.cursor;
        document.body.style.cursor = 'url(/target-cursor.svg) 50 50, crosshair';

        const raycaster = new THREE.Raycaster();
        const mouse = new THREE.Vector2();

        const onTargetClick = (e) => {
            if (e.target.closest('.ui-layer')) return;

            // Prevent default behavior or bubbling
            e.stopPropagation();

            mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
            mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
            raycaster.setFromCamera(mouse, camera);

            const hits = raycaster.intersectObjects(slots);
            if (hits.length > 0) {
                const slot = hits[0].object;
                const slotId = slot.userData.id;

                const w = state.boardWidth || 3;
                const x = slotId % w;
                const y = Math.floor(slotId / w);

                // Validate if needed based on step
                if (step.emptyOnly && state.board[slotId] !== null) {
                    return; // Invalid
                }

                if (step.enemyOnly && (!state.board[slotId] || state.board[slotId].owner !== 'ai')) {
                    return; // Invalid
                }

                // Valid target
                window.removeEventListener('pointerdown', onTargetClick, true);
                document.body.style.cursor = originalCursor;
                resolve({ x, y });
            }
        };

        window.addEventListener('pointerdown', onTargetClick, true);
    });
}

function evaluateAITarget(step, board, context, aiLogic) {
    const validTargets = [];
    const w = state.boardWidth || 3;
    for (let i = 0; i < state.board.length; i++) {
        const x = i % w;
        const y = Math.floor(i / w);
        const cell = state.board[i];

        let valid = true;
        if (step.emptyOnly && cell !== null) valid = false;
        if (step.enemyOnly && (!cell || cell.owner !== 'player')) valid = false; // AI targeting player

        if (valid) {
            validTargets.push({ x, y, id: i });
        }
    }

    if (validTargets.length === 0) return null;

    if (aiLogic && typeof aiLogic === 'function') {
        return aiLogic(validTargets, step, context);
    }

    // Default AI logic: pick random
    const randomIndex = Math.floor(Math.random() * validTargets.length);
    return { x: validTargets[randomIndex].x, y: validTargets[randomIndex].y };
}
