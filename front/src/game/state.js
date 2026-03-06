import { reactive } from 'vue';
import { rulesRegistry } from './rules.js';
import { WebRTCManager } from './WebRTCManager.js';
import cardsData from '../data/cards.json';

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
    showCollectionPage: false,
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
    userDecks: []   // [{ id: 1, name: 'Deck 1', cards: [id1, id2, ...] }]
});

export function getCardById(id) {
    return cardLibrary.find(c => c.id === id);
}

// Auth Helpers
export function setAuth(jwt, user) {
    state.jwt = jwt;
    state.user = {
        id: user.id,
        username: user.username,
        avatar: `https://api.dicebear.com/9.x/bottts/png?seed=${user.username}&backgroundColor=transparent`
    };
    state.isLoggedIn = true;
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
    localStorage.removeItem('tt_jwt');
    localStorage.removeItem('tt_user');
}

// REST Sync
const API_URL = 'http://localhost:1337/api';

export async function fetchUserCollection() {
    if (!state.isLoggedIn) return;
    try {
        const res = await fetch(`${API_URL}/user-cards?filters[user][id]=${state.user.id}&populate=card`, {
            headers: { 'Authorization': `Bearer ${state.jwt}` }
        });
        const data = await res.json();
        if (data.data) {
            state.collection = data.data.map(item => ({
                id: item.id,
                cardId: item.card.id,
                quantity: item.quantity
            }));
        }
    } catch (e) {
        console.error('Collection sync failed', e);
    }
}

export async function fetchUserDecks() {
    if (!state.isLoggedIn) return;
    try {
        const res = await fetch(`${API_URL}/decks?filters[user][id]=${state.user.id}&populate=cards`, {
            headers: { 'Authorization': `Bearer ${state.jwt}` }
        });
        const data = await res.json();
        if (data.data) {
            state.userDecks = data.data.map(item => ({
                id: item.id,
                name: item.name,
                cards: item.cards.map(c => c.id)
            }));
        }
    } catch (e) {
        console.error('Decks sync failed', e);
    }
}

export async function saveDeckToStrapi(deck) {
    if (!state.isLoggedIn) return;
    const isNew = typeof deck.id === 'number' && deck.id > 1000000000; // Mock ID from Date.now()
    const method = isNew ? 'POST' : 'PUT';
    const endpoint = isNew ? '/decks' : `/decks/${deck.id}`;

    try {
        const res = await fetch(`${API_URL}${endpoint}`, {
            method,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${state.jwt}`
            },
            body: JSON.stringify({
                data: {
                    name: deck.name,
                    user: state.user.id,
                    cards: deck.cards // Strapi expects array of IDs for relation
                }
            })
        });
        const data = await res.json();
        if (data.data) {
            // Refresh local list
            fetchUserDecks();
            return true;
        }
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
