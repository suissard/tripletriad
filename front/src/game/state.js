import { reactive } from 'vue';
import { rulesRegistry } from './rules.js';
import { WebRTCManager } from './WebRTCManager.js';
import cardsData from '../data/cards.json';
import strapiService from '../api/strapi.js';

export const cardLibrary = cardsData;
export const webrtc = new WebRTCManager();

export const createCardData = (i) => ({
    id: i,
    top: Math.floor(Math.random() * 10) + 1,
    right: Math.floor(Math.random() * 10) + 1,
    bottom: Math.floor(Math.random() * 10) + 1,
    left: Math.floor(Math.random() * 10) + 1,
    img: `https://api.dicebear.com/9.x/bottts/png?seed=${i * 42}&backgroundColor=transparent`
});

export const state = reactive({
  premiumMode: 'random', // random | image
    deck: [],
    board: Array(9).fill(null),
    pHand: [],
    aiHand: [],
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
    aiDifficulty: 1,
    online: false,
    isHost: false,
    opponentReady: false,
    selectedFrame: null,
    // UI Navigation State
    leftDrawerOpen: false,
    rightDrawerOpen: false,
    showCollectionPage: window.location.pathname === '/collection',
    // Auth State
    isLoggedIn: false,
    jwt: null,
    user: {
        id: null,
        username: 'Joueur Anonyme',
        avatar: 'https://api.dicebear.com/9.x/bottts/png?seed=player&backgroundColor=transparent'
    },
    // Collection & Decks
    collection: [], // [{ cardId: 1, quantity: 1 }, ...]
    userDecks: [],  // [{ id: 1, documentId: '...', name: 'Deck 1', cards: [id1, id2, ...] }]
    confirmation: { isOpen: false, title: '', message: '' },
    // Deck Editor Page
    showDeckEditor: false,
    showDecksPage: false,
    showBoutiquePage: false,
    editingDeck: { id: null, documentId: null, name: '', cover: null, cards: [] }
});

export function getCardById(id) {
    return cardLibrary.find(c => c.id === id);
}

// Handle Browser Back/Forward navigation
window.addEventListener('popstate', () => {
    state.showCollectionPage = window.location.pathname === '/collection';
    state.showDeckEditor = window.location.pathname === '/deck-editor';
    state.showDecksPage = window.location.pathname === '/decks';
    state.showBoutiquePage = window.location.pathname === '/boutique';
});

// Auth Helpers
export function setAuth(jwt, user) {
    state.jwt = jwt;
    state.user = {
        id: user.id,
        username: user.username,
        coins: user.coins,
        avatar: `https://api.dicebear.com/9.x/bottts/png?seed=${user.username}&backgroundColor=transparent`
    };
    state.isLoggedIn = true;
    strapiService.setToken(jwt);
    localStorage.setItem('tt_jwt', jwt);
    localStorage.setItem('tt_user', JSON.stringify(user));

    // Initial Sync
    fetchUserCollection();
    fetchUserDecks();
}

export function logout() {
    state.jwt = null;
    state.user = {
        id: null,
        username: 'Joueur Anonyme',
        avatar: 'https://api.dicebear.com/9.x/bottts/png?seed=player&backgroundColor=transparent'
    };
    state.isLoggedIn = false;
    state.collection = [];
    state.userDecks = [];
    strapiService.signOut();
    localStorage.removeItem('tt_jwt');
    localStorage.removeItem('tt_user');
}

// REST Sync
// @strapi/client may return raw array or { data: [...] } wrapper — normalize both
function toArray(result) {
    if (Array.isArray(result)) return result;
    if (result?.data && Array.isArray(result.data)) return result.data;
    return [];
}

export async function fetchUserCollection() {
    if (!state.isLoggedIn) return;
    try {
        const result = await strapiService.find('user-cards', {
            filters: { user: { id: state.user.id } },
            populate: ['card']
        });
        const items = toArray(result);
        state.collection = items.map(item => ({
            id: item.id,
            cardId: item.card?.id,
            quantity: item.quantity
        }));
    } catch (e) {
        if (e.status === 401) {
            console.warn('Session expired (401). Logging out.');
            logout();
            return;
        }
        console.error('Collection sync failed', e);
    }
}

export async function fetchUserDecks() {
    if (!state.isLoggedIn) return;
    try {
        const result = await strapiService.find('decks', {
            filters: { user: { id: state.user.id } },
            populate: ['cards']
        });
        const items = toArray(result);
        state.userDecks = items.map(item => ({
            id: item.id,
            documentId: item.documentId,
            name: item.name,
            cover: item.cover,
            cards: (item.cards || []).map(c => c.id)
        }));
    } catch (e) {
        if (e.status === 401) {
            console.warn('Session expired (401). Logging out.');
            logout();
            return;
        }
        console.error('Decks sync failed', e);
    }
}

export async function saveDeckToStrapi(deck) {
    if (!state.isLoggedIn) return false;
    const isNew = !deck.documentId;

    try {
        const payload = {
            name: deck.name,
            user: state.user.id,
            cover: deck.cover,
            cards: deck.cards
        };

        if (isNew) {
            await strapiService.create('decks', payload);
        } else {
            await strapiService.update('decks', deck.documentId, payload);
        }
        fetchUserDecks();
        return true;
    } catch (e) {
        console.error('Deck save failed', e);
    }
    return false;
}

// Restore session on load
const savedJwt = localStorage.getItem('tt_jwt');
const savedUser = localStorage.getItem('tt_user');
if (savedJwt && savedUser) {
    try {
        setAuth(savedJwt, JSON.parse(savedUser));
    } catch (e) {
        logout();
    }
}

export function initDeck(size) {
    state.deck = Array.from({ length: size }, (_, i) => createCardData(i));
}

// Reset the entire game state
export function resetGame(deckSize = 30) {
    initDeck(deckSize);
    state.board = Array(9).fill(null);
    state.pHand = [];
    state.aiHand = [];
    state.turn = 'player';
    state.busy = false;
    state.pScore = 0;
    state.aiScore = 0;
    state.alerts = '';
    state.gameOver = false;
    state.winner = null;
    state.gameState = 'menu';
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

export async function deleteDeckFromStrapi(deckDocumentId) {
    if (!state.isLoggedIn) return false;
    try {
        await strapiService.delete('decks', deckDocumentId);
        fetchUserDecks();
        return true;
    } catch (e) {
        console.error('Deck delete failed', e);
    }
    return false;
}
