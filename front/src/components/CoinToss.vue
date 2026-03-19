<template>
  <div class="coin-container" v-if="visible">
    <div class="coin-wrapper" :class="{ 'animating': isAnimating, 'flip-player': targetSide === 'player', 'flip-ai': targetSide === 'ai' }">
      <!-- FRONT: Player Side -->
      <div class="coin-face face-front">
        <CoinBase color="#00d2ff">
          <FactionIcon v-if="factionPlayer" :id="factionPlayer.id" class="svg-icon" :style="{ color: factionPlayer.color }" />
        </CoinBase>
      </div>
      <!-- BACK: AI Side -->
      <div class="coin-face face-back">
        <CoinBase color="#ff0055">
          <FactionIcon v-if="factionAI" :id="factionAI.id" class="svg-icon" :style="{ color: factionAI.color }" />
        </CoinBase>
      </div>
    </div>
    <div class="result-text" v-if="showResultText">
      <span v-if="targetSide === 'player'" class="player-win">VOUS COMMENCEZ !</span>
      <span v-else class="ai-win">L'ADVERSAIRE COMMENCE !</span>
      <div class="faction-names" v-if="factionPlayer && factionAI">
        <span :style="{ color: factionPlayer.color }">{{ factionPlayer.name }}</span>
        <span class="vs"> VS </span>
        <span :style="{ color: factionAI.color }">{{ factionAI.name }}</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { factions } from '../data/factions';
import FactionIcon from './FactionIcon.vue';
import CoinBase from './CoinBase.vue';

const props = defineProps({
  result: {
    type: String, // 'player' or 'ai'
    required: true
  },
  forcePlayerFactionId: {
    type: String,
    default: null
  },
  forceAiFactionId: {
    type: String,
    default: null
  }
});

const emit = defineEmits(['finished']);

const visible = ref(true);
const isAnimating = ref(false);
const targetSide = ref(null);
const showResultText = ref(false);

const factionPlayer = ref(null);
const factionAI = ref(null);

onMounted(() => {
  // Set Player faction
  if (props.forcePlayerFactionId && props.forcePlayerFactionId !== 'random') {
    factionPlayer.value = factions.find(f => f.id === props.forcePlayerFactionId);
  } else {
    factionPlayer.value = factions[Math.floor(Math.random() * factions.length)];
  }

  // Set AI faction
  if (props.forceAiFactionId && props.forceAiFactionId !== 'random') {
    factionAI.value = factions.find(f => f.id === props.forceAiFactionId);
  } else {
    // Pick a random one different from player if possible
    let available = factions.filter(f => f.id !== factionPlayer.value?.id);
    if (available.length === 0) available = factions;
    factionAI.value = available[Math.floor(Math.random() * available.length)];
  }

  setTimeout(() => {
    startToss();
  }, 800);
});

function startToss() {
  isAnimating.value = true;
  targetSide.value = props.result;
  
  // Animation duration matches CSS (3s)
  setTimeout(() => {
    isAnimating.value = false;
    showResultText.value = true;
    
    setTimeout(() => {
      emit('finished');
      visible.value = false;
    }, 2000);
  }, 3000);
}
</script>

<style scoped>
.coin-container {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background: rgba(13, 15, 18, 0.95);
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  z-index: 9999;
  perspective: 1200px;
}

.coin-wrapper {
  width: 180px;
  height: 180px;
  position: relative;
  transform-style: preserve-3d;
  transition: transform 0.8s cubic-bezier(0.4, 0.2, 0.2, 1);
}

.coin-face {
  position: absolute;
  width: 100%;
  height: 100%;
  backface-visibility: hidden;
  display: flex;
  justify-content: center;
  align-items: center;
}

.face-front {
  transform: rotateY(0deg);
}

.face-back {
  transform: rotateY(180deg);
}

.svg-icon {
  width: 100%;
  height: 100%;
  filter: drop-shadow(0 0 10px currentColor);
}

.result-text {
  margin-top: 50px;
  text-align: center;
  font-family: 'Orbitron', sans-serif;
  animation: fadeIn 0.6s ease-out;
}

.player-win {
  font-size: 2.2rem;
  font-weight: 900;
  color: #00d2ff;
  text-shadow: 0 0 15px #00d2ff;
  letter-spacing: 4px;
}

.ai-win {
  font-size: 2.2rem;
  font-weight: 900;
  color: #ff0055;
  text-shadow: 0 0 15px #ff0055;
  letter-spacing: 4px;
}

.faction-names {
  margin-top: 15px;
  font-size: 1.1rem;
  color: #888;
  letter-spacing: 2px;
}

.vs {
  margin: 0 10px;
  color: #444;
  font-size: 0.9rem;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(30px); }
  to { opacity: 1; transform: translateY(0); }
}

/* Flipped states */
.flip-player {
  animation: toss-player 3s cubic-bezier(0.1, 0.8, 0.2, 1) forwards;
}

.flip-ai {
  animation: toss-ai 3s cubic-bezier(0.1, 0.8, 0.2, 1) forwards;
}

@keyframes toss-player {
  0% { transform: rotateY(0) translateY(0); }
  30% { transform: rotateY(720deg) translateY(-250px) scale(1.3); }
  100% { transform: rotateY(1440deg) translateY(0); } /* Ends on front face (Player) */
}

@keyframes toss-ai {
  0% { transform: rotateY(0) translateY(0); }
  30% { transform: rotateY(720deg) translateY(-250px) scale(1.3); }
  100% { transform: rotateY(1620deg) translateY(0); } /* Ends on back face (AI) */
}
</style>
