<template>
  <div class="initial-loader" :class="{ 'fade-out': isFadingOut }">
    <div class="loader-content">
      <div class="logo-container">
        <div class="logo-glow"></div>
        <div class="logo-text">TRIPLE TRIAD</div>
      </div>
      
      <div class="loading-bar-container">
        <div class="loading-bar">
          <div class="loading-progress"></div>
        </div>
      </div>

      <div class="status-text">{{ statusMessage }}</div>
      
      <div class="decorative-elements">
        <div class="card-outline card-1"></div>
        <div class="card-outline card-2"></div>
        <div class="card-outline card-3"></div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';

const props = defineProps({
  isFadingOut: Boolean
});

const statusMessage = ref('Initialisation du système...');
const messages = [
  'Vérification de la connexion...',
  'Synchronisation des cartes...',
  'Chargement de la configuration...',
  'Préparation de l\'interface...'
];

onMounted(() => {
  let i = 0;
  const interval = setInterval(() => {
    if (i < messages.length) {
      statusMessage.value = messages[i];
      i++;
    } else {
      clearInterval(interval);
    }
  }, 800);
});
</script>

<style scoped>
.initial-loader {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: radial-gradient(circle at center, #1a1a2e 0%, #0f0f1a 100%);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 9999;
  overflow: hidden;
  transition: opacity 0.8s ease-in-out, transform 0.8s ease-in-out;
}

.initial-loader.fade-out {
  opacity: 0;
  transform: scale(1.1);
  pointer-events: none;
}

.loader-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  position: relative;
  z-index: 2;
}

.logo-container {
  position: relative;
  margin-bottom: 3rem;
}

.logo-text {
  font-family: 'Outfit', 'Inter', sans-serif;
  font-size: 3.5rem;
  font-weight: 900;
  letter-spacing: 0.5rem;
  color: #fff;
  text-shadow: 0 0 20px rgba(255, 191, 0, 0.5);
  animation: pulse 2s infinite ease-in-out;
}

.logo-glow {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 120%;
  height: 120%;
  background: radial-gradient(circle, rgba(255, 191, 0, 0.15) 0%, transparent 70%);
  filter: blur(20px);
  animation: glow-expand 4s infinite alternate ease-in-out;
}

.loading-bar-container {
  width: 300px;
  height: 4px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 2px;
  margin-bottom: 1.5rem;
  overflow: hidden;
  position: relative;
}

.loading-progress {
  position: absolute;
  top: 0;
  left: 0;
  height: 100%;
  width: 40%;
  background: linear-gradient(90deg, transparent, #FFBF00, transparent);
  animation: loading-slide 1.5s infinite ease-in-out;
}

.status-text {
  font-family: 'Inter', sans-serif;
  font-size: 0.9rem;
  color: rgba(255, 255, 255, 0.6);
  text-transform: uppercase;
  letter-spacing: 0.2rem;
}

.decorative-elements {
  position: absolute;
  width: 100vw;
  height: 100vh;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  pointer-events: none;
  z-index: -1;
}

.card-outline {
  position: absolute;
  border: 1px solid rgba(255, 255, 255, 0.03);
  width: 180px;
  height: 250px;
  border-radius: 12px;
}

.card-1 {
  top: 20%;
  left: 15%;
  transform: rotate(-15deg);
  animation: float 6s infinite alternate ease-in-out;
}

.card-2 {
  bottom: 15%;
  right: 10%;
  transform: rotate(10deg);
  animation: float 8s infinite alternate-reverse ease-in-out;
}

.card-3 {
  top: 10%;
  right: 20%;
  transform: rotate(5deg);
  animation: float 7s infinite alternate ease-in-out 1s;
}

@keyframes pulse {
  0%, 100% { transform: scale(1); opacity: 1; }
  50% { transform: scale(1.02); opacity: 0.8; }
}

@keyframes glow-expand {
  0% { transform: translate(-50%, -50%) scale(0.8); opacity: 0.3; }
  100% { transform: translate(-50%, -50%) scale(1.2); opacity: 0.7; }
}

@keyframes loading-slide {
  0% { left: -40%; }
  100% { left: 100%; }
}

@keyframes float {
  0% { transform: translate(0, 0) rotate(-15deg); }
  100% { transform: translate(20px, -30px) rotate(-10deg); }
}
</style>
