import * as THREE from 'three';
import { camera, slots } from './three-scene.js';
import { state } from './state.js';

export async function requestTargets(targetingSteps, board, playerType, context, aiLogic = null) {
    console.log(`[Targeting-Flow] [targeting.js] requestTargets called with playerType: "${playerType}", targetingSteps:`, JSON.stringify(targetingSteps));
    if (!targetingSteps || targetingSteps.length === 0) {
        console.log(`[Targeting-Flow] [targeting.js] No targeting steps found. Returning empty array.`);
        return [];
    }

    const targets = [];

    for (let i = 0; i < targetingSteps.length; i++) {
        const step = targetingSteps[i];
        console.log(`[Targeting-Flow] [targeting.js] Processing step ${i + 1}/${targetingSteps.length}:`, JSON.stringify(step));
        if (playerType === 'player') {
            const target = await requestSinglePlayerTarget(step, board);
            console.log(`[Targeting-Flow] [targeting.js] Step ${i + 1} player target resolved to:`, JSON.stringify(target));
            if (target) {
                targets.push(target);
            } else {
                console.warn(`[Targeting-Flow] [targeting.js] Step ${i + 1} returned null target (possibly cancelled by user).`);
            }
        } else {
            const target = evaluateAITarget(step, board, context, aiLogic);
            console.log(`[Targeting-Flow] [targeting.js] Step ${i + 1} AI target resolved to:`, JSON.stringify(target));
            if (target) {
                targets.push(target);
            }
        }
    }

    console.log(`[Targeting-Flow] [targeting.js] requestTargets returning all targets:`, JSON.stringify(targets));
    return targets;
}

function requestSinglePlayerTarget(step, board) {
    console.log('[Targeting-Flow] [targeting.js] requestSinglePlayerTarget 2D DOM started with step:', JSON.stringify(step));
    return new Promise((resolve) => {
        const w = state.boardWidth || 3;
        const h = state.boardHeight || 3;
        const validSlots = [];

        console.log(`[Targeting-Flow] [targeting.js] Board dimensions: ${w}x${h}. Board state length: ${state.board.length}`);

        // Determine which slot indices are valid targets
        for (let slotId = 0; slotId < state.board.length; slotId++) {
            const x = slotId % w;
            const y = Math.floor(slotId / w);
            const cell = state.board[slotId];

            let isValid = true;
            let reason = '';

            if (step.emptyOnly && cell !== null) {
                isValid = false;
                reason = `Slot ${slotId} is not empty (contains card: ${cell.data?.name})`;
            }
            
            if (isValid && step.enemyOnly && (!cell || cell.owner !== 'ai')) {
                isValid = false;
                reason = `Slot ${slotId} does not belong to enemy (owner: ${cell ? cell.owner : 'none'})`;
            }

            if (isValid && step.origin_type === 'manual' && step.sourceSlotId !== undefined) {
                const reach = step.origin_reach !== undefined && step.origin_reach !== null && step.origin_reach !== 0 ? step.origin_reach : 99;
                const sourceX = step.sourceSlotId % w;
                const sourceY = Math.floor(step.sourceSlotId / w);
                const dist = Math.abs(x - sourceX) + Math.abs(y - sourceY);
                if (dist > reach) {
                    isValid = false;
                    reason = `Slot ${slotId} is out of reach. Manhattan distance from source ${step.sourceSlotId} (${sourceX}, ${sourceY}) is ${dist}, max reach is ${reach}`;
                }
            }

            if (isValid) {
                validSlots.push(slotId);
            } else {
                // Verbose slot invalid log
                console.log(`[Targeting-Flow] [targeting.js] Slot ${slotId} (${x}, ${y}) is INVALID: ${reason}`);
            }
        }

        console.log('[Targeting-Flow] [targeting.js] valid slot indices for targeting:', validSlots);

        if (validSlots.length === 0) {
            console.warn('[Targeting-Flow] [targeting.js] WARNING: No valid slots found for targeting step!');
        }

        // Put the targeting session in global state so GameBoard.vue can render and handle selection
        state.targeting = {
            active: true,
            step,
            validSlots,
            resolve: (slotId) => {
                const x = slotId % w;
                const y = Math.floor(slotId / w);
                console.log(`[Targeting-Flow] [targeting.js] targeting.resolve called for slotId: ${slotId} (${x}, ${y})`);
                
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
                console.log('[Targeting-Flow] [targeting.js] targeting.cancel called');
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
        console.log('[Targeting-Flow] [targeting.js] state.targeting global state set. Waiting for user input...');
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
