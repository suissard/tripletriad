<template>
  <div class="toggleWrapper" @mousedown="isPressed = true" @mouseup="isPressed = false" @mouseleave="isPressed = false" @click="$emit('click')">
    <div class="buttonShell" :class="{ 'is-pressed': isPressed }">
      <button class="coreButton">
        <div class="innerLayer">
          <span class="particleCloud">
            <span class="dot"></span>
            <span class="dot"></span>
            <span class="dot"></span>
            <span class="dot"></span>
            <span class="dot"></span>
            <span class="dot"></span>
            <span class="dot"></span>
            <span class="dot"></span>
          </span>
          <div class="edgeGlow"></div>
          <div class="mirrorShade"></div>
          <div class="shineStrip"></div>
          <div class="haloRing">
            <div class="spectrumBand"></div>
          </div>
          <div class="wordZone">
            <p class="groupA">
              <span>{{ text }}</span>
            </p>
            <p class="groupB">
              <span>{{ activeText }}</span>
            </p>
          </div>
          <div class="fluidMotion">
            <div class="waveGenerator"></div>
          </div>
          <div class="backCanvas"></div>
        </div>
      </button>
    </div>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue';

const props = defineProps({
  text: {
    type: String,
    required: true
  },
  activeText: {
    type: String,
    default: 'Ouverture...'
  }
});

defineEmits(['click']);

const isPressed = ref(false);
</script>

<style scoped>
.toggleWrapper {
  perspective: 60px;
  cursor: pointer;
  user-select: none;
  position: relative;
  display: inline-block;
  width: 100%; /* Take full width of parent in menu list */
  margin-bottom: 5px; /* Space between buttons */
  height: 60px;
}
.buttonShell {
  position: relative;
  width: 100%;
  height: 100%;
}
.coreButton {
  outline: none;
  cursor: pointer;
  border: 0;
  font-size: 16px; /* Adjust font size to fit drawer */
  border-radius: 60px;
  position: relative;
  width: 100%; /* Adapt width */
  height: 60px; /* Adapt height */
  pointer-events: none;
  transition: all 0.3s ease;
  box-shadow:
    0 -8px 20px rgba(100, 50, 150, 0.3),
    0 15px 30px rgba(100, 50, 150, 0.4);
  background: linear-gradient(to bottom, #0f0f1a 80%, #e0e0e0 100%);
  padding: 0; /* Remove default padding */
  display: block;
}
.innerLayer {
  border-radius: 50px;
  height: 100%;
  transform: translateY(-4px);
  background: linear-gradient(to bottom, #c0c0c0 0%, #ffffff 50%, #1a1a1a 100%);
  position: relative;
  transition: all 0.4s ease;
  overflow: hidden;
}
.particleCloud {
  position: absolute;
  inset: 0;
  z-index: 15;
  opacity: 0;
  transition: opacity 0.4s;
}
.dot {
  position: absolute;
  filter: blur(1.5px);
}
.dot::before {
  content: "";
  display: block;
  width: 12px;
  height: 3px;
  background: linear-gradient(90deg, #c084fc, #f0abfc);
  transform-origin: left;
  animation: floatParticle 0.8s infinite linear;
  opacity: 0;
}
.dot:nth-child(1) {
  left: 50%;
  top: 15%;
  --angle: -30deg;
  --dist: 4em;
  --delay: 0s;
}
.dot:nth-child(2) {
  left: 35%;
  top: 60%;
  --angle: 120deg;
  --dist: 6em;
  --delay: 0.1s;
}
.dot:nth-child(3) {
  left: 80%;
  top: 55%;
  --angle: 20deg;
  --dist: 5.5em;
  --delay: 0.2s;
}
.dot:nth-child(4) {
  left: 20%;
  top: 25%;
  --angle: -100deg;
  --dist: 4.5em;
  --delay: 0.3s;
}
.dot:nth-child(5) {
  left: 65%;
  top: 40%;
  --angle: 150deg;
  --dist: 5em;
  --delay: 0.4s;
}
.dot:nth-child(6) {
  left: 45%;
  top: 75%;
  --angle: -45deg;
  --dist: 6.5em;
  --delay: 0.5s;
}
.dot:nth-child(7) {
  left: 70%;
  top: 20%;
  --angle: 60deg;
  --dist: 4.2em;
  --delay: 0.6s;
}
.dot:nth-child(8) {
  left: 30%;
  top: 45%;
  --angle: -70deg;
  --dist: 5.8em;
  --delay: 0.7s;
}
@keyframes floatParticle {
  0% {
    transform: rotate(var(--angle)) translateX(var(--dist)) rotate(45deg)
      skew(10deg, 10deg) scale(0.8);
    opacity: 0;
  }
  50% {
    opacity: 1;
  }
  100% {
    transform: rotate(var(--angle)) translateX(0) rotate(45deg)
      skew(20deg, 20deg) scale(1);
    opacity: 0;
  }
}
.edgeGlow {
  border-radius: 60px;
  border: 2px solid rgba(180, 130, 255, 0.8);
  position: absolute;
  inset: -5px;
  opacity: 0;
  transition: opacity 0.5s;
  z-index: 12;
  mix-blend-mode: overlay;
  transform: scale(1.05);
  pointer-events: none;
  box-shadow: 0 0 15px #a855f7;
}
.mirrorShade {
  position: absolute;
  inset: 0;
  z-index: 10;
  pointer-events: none;
  overflow: hidden;
  border-radius: 50px;
}
.mirrorShade::before,
.mirrorShade::after {
  content: "";
  position: absolute;
  inset: 0;
  background: rgba(255, 255, 255, 0.05);
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  border-left: 1px solid rgba(255, 255, 255, 0.15);
  transition: all 0.5s;
}
.mirrorShade::before {
  transform: skewX(60deg) rotate(340deg) translate(-40px, -50px);
}
.mirrorShade::after {
  transform: skewX(55deg) rotate(340deg) translate(100px, -10px);
}
.toggleWrapper:hover .mirrorShade::before {
  transform: skewX(60deg) rotate(340deg) translate(-25px, -52px);
}
.toggleWrapper:hover .mirrorShade::after {
  transform: skewX(55deg) rotate(340deg) translate(75px, -10px);
}
.shineStrip {
  position: absolute;
  z-index: 11;
  inset: 0;
  overflow: hidden;
  border-radius: 50px;
}
.shineStrip::before {
  content: "";
  position: absolute;
  width: 100%;
  background: linear-gradient(
    to right,
    rgba(220, 190, 255, 0.1) 10%,
    rgba(220, 190, 255, 0.5) 50%,
    rgba(220, 190, 255, 0.1) 90%
  );
  top: -30%;
  bottom: -30%;
  left: -120%;
  opacity: 0.9;
  transition: transform 0.6s cubic-bezier(0.4, 0, 0.2, 1);
  transform: translate(200%, 0) skew(25deg);
}
.toggleWrapper:hover .shineStrip::before {
  transform: translateX(0) skew(-25deg);
  opacity: 0.6;
}
.haloRing {
  position: absolute;
  overflow: hidden;
  border-radius: 60px;
  inset: -3px;
  bottom: -5px;
  filter: blur(1px);
  opacity: 0;
  transition: opacity 0.4s;
}
.haloRing::before {
  content: "";
  position: absolute;
  inset: 5px;
  width: 100px;
  height: 250px;
  margin: auto;
  background: linear-gradient(to right, transparent, #ffffff, transparent);
  animation: spinHalo 4s linear infinite;
}
@keyframes spinHalo {
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
}
.spectrumBand {
  position: absolute;
  width: 100%;
  height: 100px;
  z-index: 9;
  top: 45%;
  left: 0;
  background: repeating-linear-gradient(
    90deg,
    #60a5fa 10%,
    #f9a8d4 20%,
    #fde047 30%,
    #86efac 40%,
    #60a5fa 50%
  );
  background-size: 200% 100%;
  filter: invert(90%);
  mix-blend-mode: overlay;
  mask-image: radial-gradient(ellipse at 50%, black 40%, transparent 70%);
  opacity: 0.5;
  animation: driftSpectrum 15s linear infinite;
}
.spectrumBand::after {
  content: "";
  position: absolute;
  inset: 0;
  background: inherit;
  background-size: 150% 100%;
  mix-blend-mode: difference;
  animation: driftSpectrum 20s linear infinite reverse;
}
@keyframes driftSpectrum {
  0% {
    background-position: 0% 50%;
  }
  100% {
    background-position: 200% 50%;
  }
}
.backCanvas {
  z-index: 1;
  position: absolute;
  inset: 5px;
  border-radius: 50px;
  overflow: hidden;
}
.backCanvas::before {
  content: "";
  inset: 0;
  position: absolute;
  filter: blur(5px);
  background: linear-gradient(
    10deg,
    #0a0a1a 0%,
    #1a1f4a 40%,
    #2a1f6a 50%,
    #9a4f8f 60%,
    #b59f6e 70%,
    #a0c0e0 85%,
    #70b0ff 100%
  );
}
.wordZone {
  pointer-events: none;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 5;
  position: relative;
  height: 100%;
  font-size: 16px; /* Adjusted font size for long text */
  font-weight: 600;
  border-radius: 50px;
  box-shadow:
    inset -4px -2px 3px -2px rgba(255, 255, 255, 0.3),
    inset 4px -4px 3px -2px rgba(255, 255, 255, 0.3),
    inset -1px 1px 5px 3px rgba(255, 255, 255, 0.5),
    inset 1px 3px 6px #006a9e;
  overflow: hidden;
}
.wordZone p {
  position: absolute;
  color: rgba(255, 255, 255, 0.9);
  white-space: nowrap; /* Do not break */
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  margin: 0; /* Remove default margin from <p> */
}
.toggleWrapper:active .wordZone {
  box-shadow:
    inset -4px -2px 3px -2px rgba(255, 255, 255, 0.3),
    inset 4px -4px 3px -2px rgba(255, 255, 255, 0.3),
    inset -1px 1px 5px 3px rgba(255, 255, 255, 0.5),
    inset 1px 3px 6px #006a9e,
    inset 0 0 20px rgba(150, 100, 255, 0.3);
}
.groupA span {
  opacity: 1;
  transition: opacity 0.3s;
}
.groupB span {
  opacity: 0;
  transition: opacity 0.3s;
}
.fluidMotion {
  position: absolute;
  z-index: 3;
  inset: 3px;
  overflow: hidden;
  border-radius: 50px;
}
.fluidMotion .waveGenerator {
  position: absolute;
  inset: 0;
  margin: auto;
  transition: transform 0.7s cubic-bezier(0.3, -0.3, 0.3, 1.3);
  filter: blur(5px);
  top: 700px;
  left: -60px;
}
.fluidMotion .waveGenerator::before {
  content: "";
  width: 900px;
  height: 900px;
  position: absolute;
  left: 50%;
  border-radius: 45%;
  background: radial-gradient(circle at 30% 50%, #ffffff 30%, #0f0f2a 80%);
  animation: spinWave 6s linear infinite;
  opacity: 0.5;
  filter: blur(3px);
  top: -10px;
}
@keyframes spinWave {
  0% {
    transform: translate(-50%, -75%) rotate(0deg);
  }
  100% {
    transform: translate(-50%, -75%) rotate(360deg);
  }
}
.toggleWrapper:hover .waveGenerator {
  transform: translateY(-8px);
}
.toggleWrapper:hover .particleCloud {
  opacity: 1;
}
.toggleWrapper:hover .haloRing {
  opacity: 1;
}
.toggleWrapper:hover .innerLayer {
  transform: translateY(-6px);
}
.toggleWrapper:active .innerLayer {
  transform: translateY(0);
}
.buttonShell.is-pressed .groupA span {
  opacity: 0;
}
.buttonShell.is-pressed .groupB span {
  opacity: 1;
}
.buttonShell.is-pressed .edgeGlow {
  opacity: 1;
}
.buttonShell.is-pressed .particleCloud {
  opacity: 0;
}
</style>
