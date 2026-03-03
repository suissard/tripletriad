import { reactive } from 'vue';
import { rulesRegistry } from './rules.js';

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
    winner: null
});

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
}
