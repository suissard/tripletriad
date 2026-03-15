<template>
  <div class="coin-container" v-if="visible">
    <div class="coin-wrapper" :class="{ 'animating': isAnimating, 'flip-player': targetSide === 'player', 'flip-ai': targetSide === 'ai' }">
      <!-- FRONT: SKULL (Player) -->
      <div class="coin-face face-front">
        <svg viewBox="0 0 100 100" class="svg-icon skull">
          <path d="M50 10 C30 10 15 25 15 45 C15 60 25 75 35 85 L35 90 L65 90 L65 85 C75 75 85 60 85 45 C85 25 70 10 50 10 Z" fill="#FFD700" filter="url(#glow)"/>
          <circle cx="35" cy="45" r="8" fill="#000" />
          <circle cx="65" cy="45" r="8" fill="#000" />
          <path d="M45 60 L50 55 L55 60" stroke="#000" stroke-width="3" fill="none" />
          <path d="M40 75 L60 75" stroke="#000" stroke-width="3" />
          <defs>
            <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>
        </svg>
      </div>
      <!-- BACK: OCTOPUS (AI) -->
      <div class="coin-face face-back">
        <svg viewBox="0 0 100 100" class="svg-icon octopus">
          <circle cx="50" cy="40" r="25" fill="#C0C0C0" filter="url(#glow-silver)"/>
          <circle cx="40" cy="35" r="5" fill="#000" />
          <circle cx="60" cy="35" r="5" fill="#000" />
          <path d="M30 65 Q20 80 40 75 M50 65 Q50 90 60 75 M70 65 Q85 80 65 75" stroke="#C0C0C0" stroke-width="5" fill="none" stroke-linecap="round"/>
          <defs>
            <filter id="glow-silver" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>
        </svg>
      </div>
    </div>
    <div class="result-text" v-if="showResultText">
      {{ targetSide === 'player' ? 'VOUS COMMENCEZ !' : 'L\'IA COMMENCE !' }}
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';

const props = defineProps({
  result: {
    type: String, // 'player' or 'ai'
    required: true
  }
});

const emit = defineEmits(['finished']);

const visible = ref(true);
const isAnimating = ref(false);
const targetSide = ref(null);
const showResultText = ref(false);

onMounted(() => {
  setTimeout(() => {
    startToss();
  }, 500);
});

function startToss() {
  isAnimating.ref = true;
  targetSide.value = props.result;
  
  // Animation duration matches CSS (3s)
  setTimeout(() => {
    isAnimating.value = false;
    showResultText.value = true;
    
    setTimeout(() => {
      emit('finished');
      visible.value = false;
    }, 1500);
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
  background: rgba(0, 0, 0, 0.85);
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  z-index: 9999;
  perspective: 1000px;
}

.coin-wrapper {
  width: 200px;
  height: 200px;
  position: relative;
  transform-style: preserve-3d;
  transition: transform 0.5s;
}

.coin-face {
  position: absolute;
  width: 100%;
  height: 100%;
  backface-visibility: hidden;
  border-radius: 50%;
  display: flex;
  justify-content: center;
  align-items: center;
  border: 5px solid rgba(255, 255, 255, 0.1);
  box-shadow: 0 0 30px rgba(0, 210, 255, 0.3);
}

.face-front {
  background: radial-gradient(circle, #2a2a2a, #000);
}

.face-back {
  background: radial-gradient(circle, #2a2a2a, #000);
  transform: rotateY(180deg);
}

.svg-icon {
  width: 80%;
  height: 80%;
}

.result-text {
  margin-top: 40px;
  font-size: 2.5rem;
  font-weight: bold;
  color: #00d2ff;
  text-shadow: 0 0 10px #00d2ff;
  font-family: 'Orbitron', sans-serif;
  letter-spacing: 4px;
  animation: fadeIn 0.5s ease-out;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(20px); }
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
  20% { transform: rotateY(720deg) translateY(-200px) scale(1.2); }
  100% { transform: rotateY(1440deg) translateY(0); } /* Ends on front */
}

@keyframes toss-ai {
  0% { transform: rotateY(0) translateY(0); }
  20% { transform: rotateY(720deg) translateY(-200px) scale(1.2); }
  100% { transform: rotateY(1620deg) translateY(0); } /* Ends on back (1440 + 180) */
}
</style>
