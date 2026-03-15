/**
 * Game Actions — handles player/AI card placement and turn logic.
 * Replaces the old Three.js raycaster-based input.js.
 */
import { state, webrtc, refillHand } from './state.js';
import { resolveRules, sleep, updateScores, endTurn } from './engine.js';
import { getBestAIMove } from './ai.js';

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
        const cost = 1; // All cards cost 1 mana now
        if (state.pMana < cost) {
            state.alerts = "Plus d'actions possibles ce tour!";
            setTimeout(() => { if (state.alerts === "Plus d'actions possibles ce tour!") state.alerts = ''; }, 1500);
            return;
        }
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
    const cost = 1; // All cards cost 1 mana now

    if (state.pMana < cost) {
        state.alerts = "Plus d'actions possibles ce tour!";
        setTimeout(() => { if (state.alerts === "Plus d'actions possibles ce tour!") state.alerts = ''; }, 1500);
        return;
    }

    state.busy = true;
    state.pMana -= cost;
    state.selectedCardIndex = null;

    // Remove from hand
    state.pHand.splice(cardIdx, 1);
    card.revealed = true;

    // Network — delegate completely to TurnManager, no manual local mutations
    if (state.online && state.turnManager) {
        const x = slotIndex % 3;
        const y = Math.floor(slotIndex / 3);

        const action = {
            type: 'PLACE_CARD',
            card: {
                id: card.id,
                name: card.name,
                imageUrl: card.img || card.imageUrl,
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
            player: state.isHost ? 'PLAYER_1' : 'PLAYER_2'
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
    await resolveRules(slotIndex, 'player');

    refillHand('player');
    updateScores();

    state.busy = false;

    // Automatic end turn after 1 card
    setTimeout(() => {
        handleEndTurn();
    }, 500);
}

/**
 * Process a network opponent move.
 */
export async function processOpponentMove(move) {
    if (move.slot === null || move.slot === undefined) return;

    const card = state.aiHand.splice(move.cardIdx, 1)[0];
    if (!card) return;

    const cost = 1;
    state.aiMana -= cost;

    card.revealed = true;
    state.board[move.slot] = { data: card, owner: 'ai' };

    // Log AI action
    import('./logger.js').then(({ sendGameLog }) => {
        sendGameLog('placement',
            { type: 'ai', id: state.aiId },
            { card: card, case: move.slot }
        );
    });

    await sleep(600);
    await resolveRules(move.slot, 'ai');

    refillHand('ai');
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

        // Try another move if AI still has mana and cards
        setTimeout(aiPlay, 800);
    } else {
        // AI has no valid moves or not enough mana → end turn
        endTurn('ai');
    }
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
    webrtc.addMessageListener(handleNetworkMove);
}

/**
 * Cleanup network message listener.
 */
export function cleanupGameListeners() {
    webrtc.removeMessageListener(handleNetworkMove);
}
