<template>
  <div class="game-view" v-if="['playing', 'gameover', 'coin-toss'].includes(state.gameState)">
    
    <!-- Background overlay -->
    <div class="game-bg"></div>

    <!-- Main Game Layout -->
    <div class="game-layout">

      <!-- LEFT COLUMN: Scores -->
      <div class="side-panel left-panel">
        <ScorePanel
          label="Héros"
          :score="state.pScore"
          color="#00d2ff"
          :health="state.pHealth"
          :mana="state.pMana"
          :maxMana="state.pMaxMana"
        />
        <ScorePanel
          label="Adversaire"
          :score="state.aiScore"
          color="#ff0055"
          :health="state.aiHealth"
          :mana="state.aiMana"
          :maxMana="state.aiMaxMana"
        />
      </div>

      <!-- CENTER COLUMN: Board + Hands -->
      <div class="center-column">
        <!-- Opponent Hand (top) -->
        <OpponentHand />

        <!-- Game Board (center) -->
        <GameBoard />

        <!-- Player Hand (bottom) -->
        <PlayerHand />
      </div>

      <!-- RIGHT COLUMN: Log + End Turn -->
      <div class="side-panel right-panel">
        <ActionLog />
        <EndTurnButton />
      </div>

    </div>

    <!-- Alert message -->
    <Transition name="alert-fade">
      <div v-if="state.alerts" class="game-alert">
        {{ state.alerts }}
      </div>
    </Transition>

    <!-- Game info message -->
    <div class="game-help-msg" v-if="state.turn === 'player' && !state.busy && !state.gameOver">
      <span v-if="state.selectedCardIndex !== null">📍 Cliquez sur une case du plateau</span>
      <span v-else>👆 Sélectionnez une carte dans votre main</span>
    </div>

    <!-- Game Over overlay -->
    <GameOver />

    <!-- Coin Toss Overlay -->
    <CoinToss v-if="state.showCoinToss" :result="state.coinTossResult" @finished="onCoinTossFinished" />

  </div>
</template>

<script setup>
import { onMounted, onBeforeUnmount, watch } from 'vue';
import { state, refillHand, resetGame } from '../game/state.js';
import { initGameListeners, cleanupGameListeners, aiPlay } from '../game/game-actions.js';
import ScorePanel from '../components/ScorePanel.vue';
import GameBoard from '../components/GameBoard.vue';
import PlayerHand from '../components/PlayerHand.vue';
import OpponentHand from '../components/OpponentHand.vue';
import ActionLog from '../components/ActionLog.vue';
import EndTurnButton from '../components/EndTurnButton.vue';
import GameOver from '../components/GameOver.vue';
import CoinToss from '../components/CoinToss.vue';
import { useRouter, useRoute } from 'vue-router';
import { cardLibrary, getCardById, normalizeCard, initAIMatch } from '../game/state.js';

const router = useRouter();
const route = useRoute();

function onCoinTossFinished() {
    state.showCoinToss = false;
    state.gameState = 'playing';
    
    // Initialize AI Match
    resetGame(30, false, state.coinTossResult);
    
    // Generate AI deck
    const aiDeck = [];
    for (let i = 0; i < 5; i++) {
        const randomCard = cardLibrary[Math.floor(Math.random() * cardLibrary.length)];
        aiDeck.push(normalizeCard(randomCard));
    }
    
    // Draw hands
    state.deck = aiDeck;
    refillHand('ai');
    state.deck = state.playerDeckSelection;
    refillHand('player');
    
    initGameListeners();
    startGame();
    
    initAIMatch().catch(e => console.error("Match logging failed:", e));
}

onMounted(() => {
    // If we reach this page by reloading during a multiplayer match, 
    // the WebRTC state is dead. We must return to the main menu.
    if (route.query.match && state.gameState !== 'playing') {
        router.replace({ path: '/', query: { match: route.query.match } });
        return;
    }

    if (route.query.matchId === 'ia' && state.gameState !== 'playing') {
        if (!state.playerDeckSelection && !state.deck.length) {
            // No deck selected, go back to menu
            router.replace({ path: '/' });
            return;
        }
        
        state.gameState = 'coin-toss'; 
        state.coinTossResult = Math.random() < 0.5 ? 'player' : 'ai';
        state.showCoinToss = true;
        return;
    }

    if (!state.online && state.gameState !== 'playing') {
        resetGame();
    }
    initGameListeners();

    if (state.gameState === 'playing') {
        startGame();
    }
});

watch(() => state.gameState, (newState) => {
    if (newState === 'playing') {
        startGame();
    }
});

function startGame() {
    if (!state.online || state.isHost) {
        refillHand('player');
        refillHand('ai');
    } else {
        refillHand('ai');
        refillHand('player');
    }

    if (!state.online && state.turn === 'ai') {
        setTimeout(aiPlay, 1000);
    }
}

onBeforeUnmount(() => {
    cleanupGameListeners();
    state.showCoinToss = false;
});
</script>

<style scoped>
.game-view {
  position: fixed;
  inset: 0;
  z-index: 5;
  overflow: hidden;
}

.game-bg {
  position: absolute;
  inset: 0;
  background: linear-gradient(135deg, #0a0a1a 0%, #0d1b2a 30%, #1b1040 60%, #0a0a1a 100%);
  z-index: 0;
}

.game-bg::before {
  content: '';
  position: absolute;
  inset: 0;
  background:
    radial-gradient(ellipse at 20% 50%, rgba(0, 210, 255, 0.06) 0%, transparent 50%),
    radial-gradient(ellipse at 80% 30%, rgba(255, 0, 85, 0.05) 0%, transparent 50%),
    radial-gradient(ellipse at 50% 80%, rgba(156, 39, 176, 0.04) 0%, transparent 40%);
  pointer-events: none;
}

.game-layout {
  position: relative;
  z-index: 1;
  display: flex;
  align-items: stretch;
  justify-content: center;
  height: 100vh;
  padding: 20px;
  box-sizing: border-box;
  gap: 20px;
}

.side-panel {
  display: flex;
  flex-direction: column;
  gap: 16px;
  justify-content: center;
  min-width: 220px;
  max-width: 280px;
  flex-shrink: 0;
}

.left-panel {
  align-items: flex-start;
}

.right-panel {
  align-items: flex-end;
}

/* Override ActionLog and EndTurnButton positioning — they are no longer absolutely positioned */
.right-panel :deep(.action-log-container) {
  position: static;
  transform: none;
  width: 100%;
}

.right-panel :deep(.end-turn-container) {
  position: static;
  transform: none;
}

.center-column {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16px;
  flex: 1;
  max-width: 500px;
}

/* Alert */
.game-alert {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  background: rgba(0, 0, 0, 0.85);
  color: #ffd700;
  font-size: 2.5rem;
  font-weight: 900;
  padding: 16px 40px;
  border-radius: 16px;
  border: 2px solid #ffd700;
  text-shadow: 0 0 20px rgba(255, 215, 0, 0.6);
  box-shadow: 0 0 40px rgba(255, 215, 0, 0.3);
  z-index: 50;
  pointer-events: none;
  letter-spacing: 4px;
  text-transform: uppercase;
}

.alert-fade-enter-active { transition: all 0.3s ease-out; }
.alert-fade-leave-active { transition: all 0.5s ease-in; }
.alert-fade-enter-from { opacity: 0; transform: translate(-50%, -50%) scale(0.5); }
.alert-fade-leave-to { opacity: 0; transform: translate(-50%, -50%) scale(1.3); }

/* Help message */
.game-help-msg {
  position: absolute;
  bottom: 12px;
  left: 50%;
  transform: translateX(-50%);
  color: rgba(255, 255, 255, 0.35);
  font-size: 0.85rem;
  pointer-events: none;
  z-index: 10;
  text-align: center;
  white-space: nowrap;
}

/* Responsive */
@media (max-width: 900px) {
  .game-layout {
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 2px;
    gap: 4px;
    overflow: hidden;
  }

  .side-panel {
    flex-direction: row;
    min-width: unset;
    width: 100%;
    justify-content: center;
    gap: 8px;
    padding: 5px;
  }

  .arena {
    transform: scale(0.85);
    margin: -15px 0;
  }
}
</style>
