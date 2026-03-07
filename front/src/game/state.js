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
  holoFineness: 0.05, // default texture scale for SVG filter
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
        avatar: 'https://api.dicebear.com/9.x/bottts/png?seed=player&backgroundColor=transparent',
        dust: 0
    },

    // Collection & Decks
    collection: [], // [{ cardId: 1, quantity: 1 }, ...]
    userDecks: [],  // [{ id: 1, documentId: '...', name: 'Deck 1', cards: [id1, id2, ...] }]
    confirmation: { isOpen: false, title: '', message: '' },
    strapiConnected: false, // true only after a successful API call
    // Deck Editor Page
    showDeckEditor: window.location.pathname === '/deck-editor',
    showDecksPage: window.location.pathname === '/decks',
    showBoutiquePage: window.location.pathname === '/boutique',
    showDevTestPage: false,
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
        coins: 0,  // Don't trust cached values, will be synced from API
        dust: 0,
        avatar: `https://api.dicebear.com/9.x/bottts/png?seed=${user.username}&backgroundColor=transparent`
    };

    state.isLoggedIn = true;
    state.strapiConnected = false; // Not confirmed yet
    strapiService.setToken(jwt);
    localStorage.setItem('tt_jwt', jwt);
    localStorage.setItem('tt_user', JSON.stringify(user));

    // Initial Sync — will set strapiConnected on success
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
            populate: ['card'],
            pagination: { pageSize: 1000 }
        });
        const items = toArray(result);
        state.collection = items.map(item => ({
            id: item.id,
            cardId: item.card?.id,
            quantity: item.quantity,
            isPremium: !!item.isPremium
        }));

        // Sync coins & dust from the real user record
        const userData = await strapiService.find(`users/${state.user.id}`);
        if (userData) {
            if (typeof userData.coins !== 'undefined') state.user.coins = userData.coins;
            if (typeof userData.dust !== 'undefined') state.user.dust = userData.dust;
            if (typeof userData.premiumMode !== 'undefined' && userData.premiumMode !== null) state.premiumMode = userData.premiumMode;
            if (typeof userData.holoFineness !== 'undefined' && userData.holoFineness !== null) state.holoFineness = userData.holoFineness;
            
            const updatedUser = { ...JSON.parse(localStorage.getItem('tt_user') || '{}'), dust: state.user.dust, coins: state.user.coins };
            localStorage.setItem('tt_user', JSON.stringify(updatedUser));
            
            // Also sync to dev_options in localStorage to keep them mirrored
            const currentDevOps = JSON.parse(localStorage.getItem('dev_options') || '{}');
            localStorage.setItem('dev_options', JSON.stringify({
                ...currentDevOps,
                premiumMode: state.premiumMode,
                holoFineness: state.holoFineness
            }));
        }

        state.strapiConnected = true;
    } catch (e) {
        if (e.status === 401) {
            console.warn('Session expired (401). Logging out.');
            logout();
            return;
        }
        console.error('Collection sync failed', e);
        state.strapiConnected = false;
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
    state.pHealth = 20;
    state.aiHealth = 20;
    state.pMaxMana = 1;
    state.aiMaxMana = 1;
    state.pMana = 1;
    state.aiMana = 1;
    state.actionLog = [];
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

// CRAFTING & DISENCHANTING
export async function craftCard(cardId) {
    if (!state.isLoggedIn) return false;
    try {
        const result = await strapiService.request('POST', '/user-cards/craft', {
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ cardId })
        });

        if (!result.error) {
            state.user.dust = result.newDustTotal;

            // Update collection
            const existing = state.collection.find(c => c.cardId === cardId);
            if (existing) {
                existing.quantity = result.newQuantity;
            } else {
                state.collection.push({ cardId, quantity: 1 });
            }

            // Sync user dust to localStorage
            const updatedUser = { ...JSON.parse(localStorage.getItem('tt_user') || '{}'), dust: state.user.dust };
            localStorage.setItem('tt_user', JSON.stringify(updatedUser));
            return true;
        } else {
            console.error('Crafting failed:', result.error?.message || result.error);
            alert(`Erreur: ${result.error?.message || result.error}`);
            return false;
        }
    } catch (e) {
        console.error('Crafting failed', e);
        return false;
    }
}

export async function disenchantCard(cardId) {
    if (!state.isLoggedIn) return false;
    try {
        const result = await strapiService.request('POST', '/user-cards/disenchant', {
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ cardId })
        });

        if (!result.error) {
            state.user.dust = result.newDustTotal;

            // Update collection
            const existingIndex = state.collection.findIndex(c => c.cardId === cardId);
            if (existingIndex !== -1) {
                if (result.newQuantity === 0) {
                    state.collection.splice(existingIndex, 1);
                } else {
                    state.collection[existingIndex].quantity = result.newQuantity;
                }
            }

            // Sync user dust to localStorage
            const updatedUser = { ...JSON.parse(localStorage.getItem('tt_user') || '{}'), dust: state.user.dust };
            localStorage.setItem('tt_user', JSON.stringify(updatedUser));
            return true;
        } else {
            console.error('Disenchant failed:', result.error?.message || result.error);
            alert(`Erreur: ${result.error?.message || result.error}`);
            return false;
        }
    } catch (e) {
        console.error('Disenchanting failed', e);
        return false;
    }
}

export async function massDisenchantCards() {
    if (!state.isLoggedIn) return false;

    const confirm = await confirmAction('Désenchantement de masse', 'Êtes-vous sûr de vouloir détruire toutes vos cartes en surplus pour obtenir de la poussière ?');
    if (!confirm) return false;

    try {
        const result = await strapiService.request('POST', '/user-cards/mass-disenchant', {
            headers: { 'Content-Type': 'application/json' }
        });

        if (!result.error) {
            if (result.cardsDestroyed > 0) {
                alert(`${result.cardsDestroyed} cartes détruites pour ${result.totalDustGained} ✨ Poussière.`);
                await fetchUserCollection(); // Full refresh
            } else {
                alert('Aucune carte en surplus à désenchanter.');
            }
            return true;
        } else {
            console.error('Mass disenchant failed:', result.error?.message || result.error);
            alert(`Erreur: ${result.error?.message || result.error}`);
            return false;
        }
    } catch (e) {
        console.error('Mass disenchanting failed', e);
        return false;
    }
}

// DEV FUNCTIONS
export async function addDevCoins(amount) {
    if (!state.isLoggedIn) return;
    try {
        const newCoins = state.user.coins + amount;
        await strapiService.update('users', state.user.id, { coins: newCoins });
        state.user.coins = newCoins;
        const updatedUser = { ...JSON.parse(localStorage.getItem('tt_user') || '{}'), coins: newCoins };
        localStorage.setItem('tt_user', JSON.stringify(updatedUser));
        console.log(`[Dev] Added ${amount} coins. New total: ${newCoins}`);
    } catch (e) {
        console.error('[Dev] Failed to add coins:', e);
    }
}

export async function addDevDust(amount) {
    if (!state.isLoggedIn) return;
    try {
        const newDust = state.user.dust + amount;
        await strapiService.update('users', state.user.id, { dust: newDust });
        state.user.dust = newDust;
        const updatedUser = { ...JSON.parse(localStorage.getItem('tt_user') || '{}'), dust: newDust };
        localStorage.setItem('tt_user', JSON.stringify(updatedUser));
        console.log(`[Dev] Added ${amount} dust. New total: ${newDust}`);
    } catch (e) {
        console.error('[Dev] Failed to add dust:', e);
    }
}
