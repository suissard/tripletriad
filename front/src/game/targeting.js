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
    console.log('[targeting.js] requestSinglePlayerTarget 2D DOM started with step:', JSON.stringify(step));
    return new Promise((resolve) => {
        const w = state.boardWidth || 3;
        const validSlots = [];

        // Determine which slot indices are valid targets
        for (let slotId = 0; slotId < state.board.length; slotId++) {
            const x = slotId % w;
            const y = Math.floor(slotId / w);

            let isValid = true;
            if (step.emptyOnly && state.board[slotId] !== null) isValid = false;
            if (step.enemyOnly && (!state.board[slotId] || state.board[slotId].owner !== 'ai')) isValid = false;
            if (step.origin_type === 'manual' && step.sourceSlotId !== undefined) {
                const reach = step.origin_reach !== undefined && step.origin_reach !== null && step.origin_reach !== 0 ? step.origin_reach : 99;
                const sourceX = step.sourceSlotId % w;
                const sourceY = Math.floor(step.sourceSlotId / w);
                const dist = Math.abs(x - sourceX) + Math.abs(y - sourceY);
                if (dist > reach) {
                    isValid = false;
                }
            }

            if (isValid) {
                validSlots.push(slotId);
            }
        }

        console.log('[targeting.js] valid slot indices for targeting:', validSlots);

        // Put the targeting session in global state so GameBoard.vue can render and handle selection
        state.targeting = {
            active: true,
            step,
            validSlots,
            resolve: (slotId) => {
                const x = slotId % w;
                const y = Math.floor(slotId / w);
                console.log(`[targeting.js] selected slotId: ${slotId} (${x}, ${y})`);
                
                // Clear state.targeting
                state.targeting = {
                    active: false,
                    step: null,
                    resolve: null,
                    validSlots: []
                };
                
                resolve({ x, y });
            },
            cancel: () => {
                // Clear state.targeting
                state.targeting = {
                    active: false,
                    step: null,
                    resolve: null,
                    validSlots: []
                };
                resolve(null);
            }
        };
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

        if (step.origin_type === 'manual' && step.sourceSlotId !== undefined) {
            const reach = step.origin_reach !== undefined && step.origin_reach !== null && step.origin_reach !== 0 ? step.origin_reach : 99;
            const sourceX = step.sourceSlotId % w;
            const sourceY = Math.floor(step.sourceSlotId / w);
            const dist = Math.abs(x - sourceX) + Math.abs(y - sourceY);
            if (dist > reach) {
                valid = false;
            }
        }

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
