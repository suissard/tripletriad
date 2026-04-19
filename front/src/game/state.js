import { reactive } from 'vue';
import { rulesRegistry } from './rules.js';
import { WebRTCManager } from './WebRTCManager.js';
import { TurnManager } from './TurnManager.js';
import { GameEngine } from './GameEngine.js';
import { gameEvents } from './events.js';
import cardsData from '../../../shared/data/cards.json' with { type: 'json' };
import strapiService from '../api/strapi.js';
import { getStrapiUrl, getStrapiMediaUrl } from '../utils/url.js';
import { normalizeCard } from '../utils/cardUtils.js';
export { normalizeCard };

// export const cardLibrary = reactive([...cardsData]); // Moved below normalizeCard
export const webrtc = new WebRTCManager();

// normalizeCard moved to ../utils/cardUtils.js

export const cardLibrary = reactive(cardsData.map(normalizeCard));

export const createCardData = (i) => {
    const raw = {
        id: i,
        name: `Fighter #${i}`,
        topValue: String(Math.floor(Math.random() * 9) + 1),
        rightValue: String(Math.floor(Math.random() * 9) + 1),
        bottomValue: String(Math.floor(Math.random() * 9) + 1),
        leftValue: String(Math.floor(Math.random() * 9) + 1),
    };
    return normalizeCard({
        ...raw,
        imageUrl: `https://api.dicebear.com/9.x/bottts/svg?seed=${i * 42}&backgroundColor=transparent`
    });
};

/**
 * Shuffles an array in place using Fisher-Yates algorithm.
 */
export function shuffle(array) {
    if (!array || !Array.isArray(array)) return array;
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

/**
 * Wraps and normalizes board entries from either local {data, owner} format
 * or raw GameEngine card format.
 */
function normalizeBoard(board) {
    if (!board || board.length === 0) {
        state.boardWidth = 4;
        state.boardHeight = 4;
        return Array(16).fill(null);
    }
    
    let flat;
    if (Array.isArray(board[0])) {
        // Multi-dimensional array from GameEngine logic
        state.boardHeight = board.length;
        state.boardWidth = board[0].length;
        flat = board.flat();
    } else {
        flat = board;
    }
    
    return flat.map(entry => {
        if (!entry) return null;
        
        // Case 1: Entry is { data, owner } (Local Engine format)
        if (entry.data && entry.owner) {
            return {
                data: normalizeCard(entry.data),
                owner: entry.owner
            };
        }
        
        // Case 2: Entry is a raw Card object with owner property (Multiplayer/GameEngine format)
        if (entry.owner) {
            return {
                data: normalizeCard(entry),
                owner: entry.owner
            };
        }

        // Fallback
        return {
            data: normalizeCard(entry),
            owner: entry.owner || 'player'
        };
    });
}

export const state = reactive({
  premiumMode: 'random', // random | image
  holoFineness: 0.05, // default texture scale for SVG filter
  pDeck: [],
  aiDeck: [],
    // Dynamic Board dimensions
    boardWidth: 4,
    boardHeight: 4,
    // Board: Array of { data: cardDataObj, owner: 'player'|'ai' } | null
    board: Array(16).fill(null),
    // Hands: Arrays of plain card data objects
    pHand: [],
    aiHand: [],
    // Dynamic Player IDs for Ownership
    pId: 'player',
    aiId: 'ai',
    // Currently selected card index in player hand (for click-to-place)
    selectedCardIndex: null,
    turn: 'player',
    busy: false,
    pScore: 0,
    aiScore: 0,
    rules: rulesRegistry.reduce((acc, rule) => {
        acc[rule.id] = rule.defaultState;
        return acc;
    }, {}),
    alerts: '',
    gameOver: false,
    winner: null,
    gameState: 'menu',
    pHealth: 20,
    aiHealth: 20,
    pMana: 1,
    pMaxMana: 1,
    aiMana: 1,
    aiMaxMana: 1,
    actionLog: [],
    aiDifficulty: 1,
    online: false,
    isHost: false,
    opponentReady: false,
    selectedFrame: null,
    menuView: 'main', // 'main', 'ai', 'multi'
    // UI Navigation State
    leftDrawerOpen: false,
    rightDrawerOpen: false,

    confirmation: { isOpen: false, title: '', message: '' },
    // Deck Editor Page
    editingDeck: { id: null, documentId: null, name: '', cover: null, cards: [], cardBack: 'default' },
    
    // Logging / Match
    matchId: null,

    // P2P Engine
    turnManager: null,

    // Starting Flow
    showCoinToss: false,
    boardBackground: null,
    coinTossResult: 'player', // 'player' | 'ai'

    // UI/Dragging
    hoveredSlotIndex: null,

    // Story Mode
    isStoryMatch: false,
    storyEnemyDeckConfig: [],
    onStoryMatchEnd: null,
    storyMatchData: null,

    // Combo visual effect
    comboCount: 0,
    comboActiveIndex: null,

    // Capture preview (Map<slotIndex, {directCaptures, comboCaptures, totalCaptures}> | null)
    capturePreview: null,
});

export function getCardById(id) {
    return cardLibrary.find(c => c.id === id);
}

/**
 * Loads all cards from Strapi and updates the cardLibrary.
 */
export async function loadCardsFromStrapi() {
    console.log("[GameManager] Fetching cards from Strapi...");
    try {
        let allCards = [];
        let page = 1;
        let pageCount = 1;

        do {
            const result = await strapiService.find('cards', {
                populate: ['image', 'faction'],
                pagination: { page, pageSize: 100 }
            });
            
            const rawCards = Array.isArray(result) ? result : (result?.data || []);
            allCards = [...allCards, ...rawCards];
            
            const meta = result?.meta?.pagination;
            pageCount = meta?.pageCount || 1;
            page++;
        } while (page <= pageCount);
        
        if (allCards.length > 0) {
            const normalized = allCards.map(c => normalizeCard(c));
            cardLibrary.splice(0, cardLibrary.length, ...normalized);
            console.log(`[GameManager] Successfully loaded ${cardLibrary.length} cards from Strapi.`);
        } else {
            console.warn("[GameManager] No cards found in Strapi. Keeping local defaults.");
        }
    } catch (error) {
        console.error("[GameManager] Failed to load cards from Strapi:", error);
    }
}







/**
 * Initialise le TurnManager pour une partie en ligne
 */
export function initOnlineTurnManager(isHost, startingPlayer = 'PLAYER_1') {
    const localPlayer = isHost ? 'PLAYER_1' : 'PLAYER_2';
    
    state.turnManager = new TurnManager({
        localPlayer,
        initialState: GameEngine.createInitialState(startingPlayer),
        
        sendNetworkMessage: (msg) => {
            webrtc.sendMessage(msg);
        },
        
        onStateUpdate: (newState) => {
            console.log("[TurnManager] State Updated:", newState);
            state.board = normalizeBoard(newState.board);
            
            const newTurn = newState.currentPlayer === localPlayer ? 'player' : 'ai';
            
            if (state.turn !== newTurn) {
                if (newTurn === 'player') {
                    state.pMana = 1;
                    state.pMaxMana = 1;
                } else {
                    state.aiMana = 1;
                    state.aiMaxMana = 1;
                }
            }
            state.turn = newTurn;
            state.gameOver = newState.isFinished;
            state.winner = newState.winner;
            state.busy = false;
        },
        
        onDesync: async (turnIndex, localHash, remoteHash) => {
            console.error(`[Desync] Turn ${turnIndex} - Local: ${localHash}, Remote: ${remoteHash}`);
            state.alerts = "Désynchronisation détectée ! Arbitrage en cours...";
            
            try {
                // Appel à l'arbitre Strapi
                const response = await fetch(`${webrtc.strapiUrl}/api/match/arbitrate`, {
                    method: 'POST',
                    headers: { 
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${state.jwt}`
                    },
                    body: JSON.stringify({
                        matchId: webrtc.uuid,
                        logs: state.actionLog
                    })
                });
                
                const result = await response.json();
                
                if (result.status === 'SUCCESS') {
                    hydrate(result.state);
                    state.alerts = "Partie resynchronisée par le serveur.";
                } else if (result.status === 'ABORTED') {
                    state.gameOver = true;
                    state.alerts = "Partie annulée : suspicion de triche.";
                }
            } catch (e) {
                console.error("Arbitration failed", e);
                state.alerts = "Erreur fatale de synchronisation.";
            }
        },
        
        onRemoteAction: (action) => {
            // Deprecated: UI logic is moving to gameEvents
            // Keeping for temporary fallback if needed during refactor
        }
    });

    state.online = true;
    state.isHost = isHost;
    state.pId = localPlayer;
    state.aiId = localPlayer === 'PLAYER_1' ? 'PLAYER_2' : 'PLAYER_1';
}

/**
 * Hydrates the local state from a server-provided state (arbitrated or synced).
 * Vue reactivity handles the visual update automatically.
 */
export function hydrate(forcedState) {
    console.log("[GameManager] Hydrating state from server...", forcedState);

    // 1. Update Board State
    state.board = normalizeBoard(forcedState.board);

    // 2. Update metadata
    state.turn = forcedState.currentPlayer === 'PLAYER_1' ? 'player' : 'ai';
    state.gameOver = forcedState.isFinished;
    state.winner = forcedState.winner;

    // 3. Clear busy flag
    state.busy = false;
}



export function initDeck(size) {
    state.pDeck = Array.from({ length: size }, (_, i) => createCardData(i));
    state.aiDeck = Array.from({ length: size }, (_, i) => createCardData(i + size));
}

/**
 * Draw cards from deck to fill a hand to 3 cards (pure data, no scene manipulation).
 */
export function refillHand(owner) {
    const deck = owner === 'player' ? state.pDeck : state.aiDeck;
    const hand = owner === 'player' ? state.pHand : state.aiHand;
    while (hand.length < 3 && deck.length > 0) {
        const card = deck.pop();
        if (owner === 'ai') {
            card.revealed = false; // AI cards are face-down by default
        }

        // Ensure card hook exists and emit CARD_DRAWN
        if (typeof card.onDrawn === 'function') {
            card.onDrawn({ owner });
        }
        gameEvents.emit('CARD_DRAWN', { card, owner });
        hand.push(card);
    }
}

// Helper to generate a UUID for AI matches
function generateLocalUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
        const r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

// Reset the entire game state
export function resetGame(deckSize = 30, goToMenu = true, forcedTurn = null) {
    gameEvents.emit('MATCH_START', {});
    initDeck(deckSize);
    state.boardWidth = 4;
    state.boardHeight = 4;
    state.board = Array(16).fill(null);
    state.matchId = null;
    state.pHand = [];
    state.aiHand = [];
    state.pDeck = [];
    state.aiDeck = [];
    state.selectedCardIndex = null;
    
    if (forcedTurn) {
        state.turn = forcedTurn;
    } else {
        state.turn = Math.random() < 0.5 ? 'player' : 'ai';
    }
    state.busy = false;
    state.pScore = 0;
    state.aiScore = 0;
    state.alerts = '';
    state.gameOver = false;
    state.winner = null;
    state.pId = 'player';
    state.aiId = 'ai';
    
    if (goToMenu) {
        state.gameState = 'menu';
    }

    state.pHealth = 20;
    state.aiHealth = 20;
    state.pMaxMana = 1;
    state.aiMaxMana = 1;
    state.pMana = 1;
    state.aiMana = 1;
    state.actionLog = [];
    state.showCoinToss = false;

    // Reset combo state
    state.comboCount = 0;
    state.comboActiveIndex = null;
    state.capturePreview = null;
}

/**
 * Initializes a new match ID for local AI games
 * and saves it to the Strapi backend.
 */
export async function initAIMatch() {
    state.matchId = generateLocalUUID();

    try {
        await fetch(getStrapiUrl('/webrtc/matches'), {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...(strapiService.token ? { 'Authorization': `Bearer ${strapiService.token}` } : {})
            },
            body: JSON.stringify({
                uuid: state.matchId,
                offer: null, // No WebRTC offer needed for AI
                users: [] // You might want to populate with the current user ID if authenticated
            })
        });
        console.log(`[GameManager] AI Match Initialized with UUID: ${state.matchId}`);
    } catch (error) {
        console.error("[GameManager] Failed to create AI match on server", error);
    }
}

// Confirmation System
let confirmationPromiseResolve = null;

export function confirmAction(title, message) {
    state.confirmation.title = title;
    state.confirmation.message = message;
    state.confirmation.isOpen = true;

    return new Promise((resolve) => {
        confirmationPromiseResolve = resolve;
    });
}

export function resolveConfirmation(result) {
    state.confirmation.isOpen = false;
    if (confirmationPromiseResolve) {
        confirmationPromiseResolve(result);
        confirmationPromiseResolve = null;
    }
}



import { sendGameLog } from './logger.js';

// --- CENTRAL EVENT LISTENERS ---
gameEvents.on('CARD_PLACED', (payload) => {
    const { action, captures } = payload;
    
    if (state.online) {
        // En multi, GameEngine calcule les captures "silencieusement",
        // il faut les mapper pour ActionLog.vue manuellement.
        const actionRecord = {
            owner: action.player,
            playedCard: action.card,
            capturedCards: captures || []
        };
        state.actionLog.push(actionRecord);
        if (state.actionLog.length > 5) {
            state.actionLog.shift();
        }

        // Si l'adversaire a joué
        if (action.player === state.aiId) {
            state.aiMana -= 1;
            if (state.aiHand.length > 0) {
                state.aiHand.pop(); 
            }
        }
    }

    sendGameLog('placement',
        { type: action.player === state.pId ? 'player' : 'ai', id: action.player },
        { card: action.card, case: action.y * 3 + action.x }
    );
});

gameEvents.on('CARD_CAPTURED', (payload) => {
    sendGameLog('competence',
        { type: payload.capturer === state.pId ? 'player' : 'ai', id: payload.capturer },
        { count: payload.count }
    );
});

gameEvents.on('TURN_START', (payload) => {
    sendGameLog('turn_start',
        { type: 'system', id: 'system' },
        { player: payload.player }
    );
});

gameEvents.on('GAME_OVER', (payload) => {
    sendGameLog('game_over',
        { type: 'system', id: 'system' },
        { winner: payload.winner }
    );
});

// --- EVENT LOGGING & CARD HOOKS ---

gameEvents.on('MATCH_START', (payload) => {
    console.log('[Event] MATCH_START - La partie commence.');
});

gameEvents.on('TURN_START', (payload) => {
    console.log(`[Event] TURN_START - C'est au tour de: ${payload.player}`);
});

gameEvents.on('CARD_DRAWN', (payload) => {
    console.log(`[Event] CARD_DRAWN - Carte piochée par ${payload.owner}:`, payload.card.name || payload.card.id);
    // Note: onDrawn is already called locally inside refillHand, but we can keep it here if emitted from elsewhere
});

gameEvents.on('CARD_PLACED', (payload) => {
    console.log(`[Event] CARD_PLACED - Carte posée en (${payload.action.x}, ${payload.action.y}) par ${payload.action.player}:`, payload.action.card.name || payload.action.card.id);
    // On the board, the card might be raw data or wrapped in a cell.
    // Ensure we trigger the hook on the actual card data object.
    const cardData = payload.action.card;
    if (typeof cardData.onPlaced === 'function') {
        cardData.onPlaced(payload);
    }
});

gameEvents.on('CARD_CAPTURED', (payload) => {
    console.log(`[Event] CARD_CAPTURED - ${payload.count} carte(s) capturée(s) par ${payload.capturer}.`);
    // NOTE: For individual card captures, we might want to emit a per-card capture event later,
    // but the current gameEvents.emit('CARD_CAPTURED') usually sends a 'count' in TurnManager.js
    // Let's hook into the captured cards if they are available in the payload.
    if (payload.capturedCards && Array.isArray(payload.capturedCards)) {
        payload.capturedCards.forEach(cardData => {
            if (typeof cardData.onCaptured === 'function') {
                cardData.onCaptured({ ...payload, capturedCard: cardData });
            }
        });
    }
});

gameEvents.on('GAME_OVER', (payload) => {
    console.log(`[Event] GAME_OVER - La partie est terminée. Vainqueur: ${payload.winner}`);
});

gameEvents.on('SHOW_ALERT', (payload) => {
    // Re-use engine's showAlert logic adapted for state
    state.alerts = payload.text;
    setTimeout(() => {
        if (state.alerts === payload.text) state.alerts = '';
    }, 2000);
});
