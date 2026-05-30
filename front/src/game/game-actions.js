/**
 * Game Actions — handles player/AI card placement and turn logic.
 * Replaces the old Three.js raycaster-based input.js.
 */
import { state, socketManager, refillHand } from './state.js';
import { resolveRules, sleep, updateScores, endTurn, expandBoard } from './engine.js';
import { getBestAIMove } from './ai.js';
import { requestTargets } from './targeting.js';
import { skillRegistry } from '../../../shared/skills/index.js';

/**
 * Select a card in the player's hand.
 */
export function selectCard(index) {
    if (state.turn !== 'player' || state.busy) return;
    if (index < 0 || index >= state.pHand.length) return;

    // Toggle selection
    if (state.selectedCardIndex === index) {
        state.selectedCardIndex = null;
    } else {
        state.selectedCardIndex = index;
    }
}

/**
 * Place the selected card on the board at the given slot.
 */
export async function placeCard(slotIndex) {
    if (state.turn !== 'player' || state.busy) return;
    if (state.selectedCardIndex === null) return;
    if (state.board[slotIndex] !== null) return;

    const cardIdx = state.selectedCardIndex;
    const card = state.pHand[cardIdx];

    state.busy = true;
    state.selectedCardIndex = null;

    // Determine targeting steps
    const skills = card.skills || [];
    let targetingSteps = [];
    for (const skill of skills) {
        const handler = skillRegistry.getHandler(skill.type);
        if (handler && handler.targetingSteps) {
            targetingSteps = targetingSteps.concat(handler.targetingSteps);
        } else if (skill.origin_type === 'manual') {
            const reach = skill.origin_reach !== undefined && skill.origin_reach !== null && skill.origin_reach !== 0 ? skill.origin_reach : (skill.range !== undefined && skill.range !== null && skill.range !== 0 ? skill.range : 99);
            targetingSteps.push({
                type: 'CELL',
                origin_type: 'manual',
                origin_reach: reach,
                sourceSlotId: slotIndex
            });
        }
    }

    let targets = [];
    if (targetingSteps.length > 0) {
        targets = await requestTargets(targetingSteps, state.board, 'player', {});
        if (!targets || targets.length < targetingSteps.length) {
            // Targeting cancelled or failed
            state.busy = false;
            card.isPlacing = false;
            state.selectedCardIndex = cardIdx; // Re-select the card
            return; // Abort play
        }
    }

    // Mark as being played (don't splice yet to keep hand stable)
    card.isPlacing = true;
    card.revealed = true;

    // Network — delegate completely to TurnManager, no manual local mutations
    if (state.online && state.turnManager) {
        state.pHand.splice(cardIdx, 1);
        const x = slotIndex % 3;
        const y = Math.floor(slotIndex / 3);

        const action = {
            type: 'PLACE_CARD',
            card: {
                id: card.id,
                name: card.name,
                imageUrl: card.imageUrl,
                isPremium: card.isPremium,
                rarity: card.rarity,
                level: card.level,
                topValue: card.topValue,
                bottomValue: card.bottomValue,
                leftValue: card.leftValue,
                rightValue: card.rightValue,
                values: {
                    top: card.top,
                    bottom: card.bottom,
                    left: card.left,
                    right: card.right
                }
            },
            x,
            y,
            player: state.isHost ? 'PLAYER_1' : 'PLAYER_2',
            targets: targets
        };

        await state.turnManager.playLocalAction(action);
        
        refillHand('player');
        updateScores();
        state.busy = false;

        setTimeout(() => {
            handleEndTurn();
        }, 500);

        return;
    }

    // Single Player Local Mutation 
    state.board[slotIndex] = { data: card, owner: 'player' };

    // Log player action
    import('./logger.js').then(({ sendGameLog }) => {
        sendGameLog('placement',
            { type: 'player', id: state.pId },
            { card: card, case: slotIndex }
        );
    });

    await sleep(300);
    
    // Now remove from hand after the animation has started/settled
    const finalIdx = state.pHand.findIndex(c => c.id === card.id);
    if (finalIdx !== -1) {
        state.pHand.splice(finalIdx, 1);
    }

    await resolveRules(slotIndex, 'player', targets);

    refillHand('player');
    // expandBoard();
    updateScores();

    state.busy = false;

    // Automatic end turn after 1 card
    setTimeout(() => {
        handleEndTurn();
    }, 500);
}

export async function processOpponentMove(move) {
    if (move.slot === null || move.slot === undefined) return;

    const card = state.aiHand.splice(move.cardIdx, 1)[0];
    if (!card) return;

    card.revealed = true;

    // AI/Opponent targeting logic
    const skills = card.skills || [];
    let targetingSteps = [];
    for (const skill of skills) {
        const handler = skillRegistry.getHandler(skill.type);
        if (handler && handler.targetingSteps) {
            targetingSteps = targetingSteps.concat(handler.targetingSteps);
        } else if (skill.origin_type === 'manual') {
            const reach = skill.origin_reach !== undefined && skill.origin_reach !== null && skill.origin_reach !== 0 ? skill.origin_reach : (skill.range !== undefined && skill.range !== null && skill.range !== 0 ? skill.range : 99);
            targetingSteps.push({
                type: 'CELL',
                origin_type: 'manual',
                origin_reach: reach,
                sourceSlotId: move.slot
            });
        }
    }

    let targets = [];
    if (targetingSteps.length > 0) {
        // AI targets evaluate synchronously and return immediately
        targets = await requestTargets(targetingSteps, state.board, 'ai', {});
    }

    state.board[move.slot] = { data: card, owner: 'ai' };

    // Log AI action
    import('./logger.js').then(({ sendGameLog }) => {
        sendGameLog('placement',
            { type: 'ai', id: state.aiId },
            { card: card, case: move.slot }
        );
    });

    await sleep(600);
    await resolveRules(move.slot, 'ai', targets);

    refillHand('ai');
    // expandBoard();
    updateScores();
}

/**
 * AI plays its turn (local mode only).
 */
export async function aiPlay() {
    if (state.board.every(b => b !== null) || state.gameOver) return;
    if (state.online) return;

    let move = getBestAIMove();
    if (move) {
        state.busy = true;
        await processOpponentMove(move);
        state.busy = false;
    }
    endTurn('ai');
}

/**
 * Handle end turn action from the player.
 */
export async function handleEndTurn() {
    if (state.turn !== 'player') return;

    state.turn = 'ai'; // Temporarily block double clicks
    endTurn('player');
    refillHand('player');

    if (!state.online) {
        setTimeout(aiPlay, 800);
    }
}

/**
 * Network message handler.
 */
const handleNetworkMove = async (msg) => {
    if (state.online && state.turnManager) {
        await state.turnManager.handleNetworkMessage(msg);
    } else if (msg.type === 'move') {
        await processOpponentMove(msg);
    }
};

/**
 * Initialize network message listener.
 */
export function initGameListeners() {
    socketManager.addMessageListener(handleNetworkMove);
}

/**
 * Cleanup network message listener.
 */
export function cleanupGameListeners() {
    socketManager.removeMessageListener(handleNetworkMove);
}
