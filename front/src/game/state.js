import { reactive } from 'vue';
import { rulesRegistry } from './rules.js';
import { WebRTCManager } from './WebRTCManager.js';
import { TurnManager } from './TurnManager.js';
import { GameEngine } from './GameEngine.js';
import { gameEvents } from './events.js';
import cardsData from '../../../shared/data/cards.json';
import strapiService from '../api/strapi.js';

// export const cardLibrary = reactive([...cardsData]); // Moved below normalizeCard
export const webrtc = new WebRTCManager();

/**
 * Parse a card stat value: 'A' → 10, string numbers → int
 */
function parseStatValue(v) {
    if (v === 'A' || v === 'a') return 10;
    const n = parseInt(v, 10);
    return isNaN(n) ? 0 : n;
}

/**
 * Create a card data object from a raw card (from cards.json or random).
 * Normalizes topValue/rightValue/bottomValue/leftValue → top/right/bottom/left as numbers.
 */
export function normalizeCard(raw) {
    // Robust image URL extraction for Strapi
    let imgUrl = raw.imageUrl || raw.img;
    
    // Handle Strapi media object (both flat and nested structures)
    const strapiImg = raw.image?.data?.attributes || raw.image;
    if (strapiImg?.url) {
        imgUrl = strapiImg.url.startsWith('http') 
            ? strapiImg.url 
            : `${strapiService.MEDIA_URL}${strapiImg.url}`;
    }

    if (!imgUrl) {
        imgUrl = `https://api.dicebear.com/9.x/bottts/png?seed=${(raw.id || 0) * 42}&backgroundColor=transparent`;
    }

    return {
        id: raw.id,
        documentId: raw.documentId,
        name: raw.name || `Card #${raw.id}`,
        description: raw.description || '',
        level: GameEngine.calculateCardLevel(raw),
        element: raw.element || 'None',
        elements: Array.isArray(raw.elements) ? raw.elements : (raw.element && raw.element !== 'None' ? [raw.element] : []),
        faction: raw.faction || 'neutre',
        top: raw.top ?? parseStatValue(raw.topValue),
        right: raw.right ?? parseStatValue(raw.rightValue),
        bottom: raw.bottom ?? parseStatValue(raw.bottomValue),
        left: raw.left ?? parseStatValue(raw.leftValue),
        topValue: raw.topValue ?? (raw.top === 10 ? 'A' : String(raw.top)),
        rightValue: raw.rightValue ?? (raw.right === 10 ? 'A' : String(raw.right)),
        bottomValue: raw.bottomValue ?? (raw.bottom === 10 ? 'A' : String(raw.bottom)),
        leftValue: raw.leftValue ?? (raw.left === 10 ? 'A' : String(raw.left)),
        imageUrl: imgUrl,
        revealed: raw.revealed !== undefined ? raw.revealed : true,
        isPremium: false, // Will be set by ownership logic in components
        rarity: raw.rarity || null
    };
}

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
        imageUrl: `https://api.dicebear.com/9.x/bottts/png?seed=${i * 42}&backgroundColor=transparent`
    });
};

/**
 * Wraps and normalizes board entries from either local {data, owner} format
 * or raw GameEngine card format.
 */
function normalizeBoard(board) {
    if (!board) return Array(9).fill(null);
    const flat = Array.isArray(board[0]) ? board.flat() : board;
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
  deck: [],
    // Board: Array of { data: cardDataObj, owner: 'player'|'ai' } | null
    board: Array(9).fill(null),
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
    coinTossResult: 'player', // 'player' | 'ai'

    // UI/Dragging
    hoveredSlotIndex: null,
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
        const result = await strapiService.find('cards', {
            populate: ['image'],
            pagination: { pageSize: 1000 }
        });
        
        // Handle both array and { data: [...] } formats
        const rawCards = Array.isArray(result) ? result : (result?.data || []);
        
        if (rawCards.length > 0) {
            const normalized = rawCards.map(c => normalizeCard(c));
            // Update the reactive array in place
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
    state.deck = Array.from({ length: size }, (_, i) => createCardData(i));
}

/**
 * Draw cards from deck to fill a hand to 3 cards (pure data, no scene manipulation).
 */
export function refillHand(owner) {
    const hand = owner === 'player' ? state.pHand : state.aiHand;
    while (hand.length < 3 && state.deck.length > 0) {
        const card = state.deck.pop();
        if (owner === 'ai') {
            card.revealed = false; // AI cards are face-down by default
        }
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
    initDeck(deckSize);
    state.board = Array(9).fill(null);
    state.matchId = null;
    state.pHand = [];
    state.aiHand = [];
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
}

/**
 * Initializes a new match ID for local AI games
 * and saves it to the Strapi backend.
 */
export async function initAIMatch() {
    state.matchId = generateLocalUUID();

    try {
        await fetch(`${strapiService.BASE_URL}/webrtc/matches`, {
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
