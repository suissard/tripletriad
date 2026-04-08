<template>
  <div 
    class="holo-container" 
    :class="{ 'always-visible': alwaysVisible }"
    :style="containerStyle"
  >
    <!-- GLOBAL NOISE/GRAIN LAYER -->
    <div class="holo-noise"></div>
    
    <div 
      v-for="(inputLayer, i) in (props.layers && props.layers.length > 0 ? props.layers : [{}])" 
      :key="i"
      class="holo-layer"
      :style="{ zIndex: 3 + i }"
    >
      <!-- SVG filter for this layer's texture -->
      <svg width="0" height="0" style="position:absolute">
        <filter :id="`holo-filter-${computedSeed}-${i}`" x="-50%" y="-50%" width="200%" height="200%" color-interpolation-filters="sRGB">
          <feTurbulence 
            type="fractalNoise" 
            :baseFrequency="getLayerFrequency(resolveLayer(inputLayer, i))" 
            :numOctaves="getLayerOctaves(resolveLayer(inputLayer, i))" 
            :seed="computedSeed + i" 
          />
          <feColorMatrix type="saturate" values="0" />
          <feComposite in2="SourceGraphic" operator="in" />
          <feBlend in2="SourceGraphic" mode="soft-light" />
        </filter>
      </svg>

      <div 
        class="holo-layer-content" 
        :style="getLayerStyle(inputLayer, i)"
      ></div>
    </div>
  </div>
</template>

<script setup>
import { computed, ref, watch } from 'vue';
import { state } from '../game/state.js';

const props = defineProps({
  layers: { type: Array, default: null },
  seed: { type: Number, default: 0 },
  tiltX: { type: Number, default: 0 },
  tiltY: { type: Number, default: 0 },
  alwaysVisible: { type: Boolean, default: false }
});

// --- Gestion des masques JPEG (Noir & Blanc -> Transparence) ---
const processedMasks = ref({});

function processMask(src, index) {
  if (!src) return;
  const img = new Image();
  img.crossOrigin = "Anonymous"; // Sécurité pour les URLs externes
  img.onload = () => {
    const canvas = document.createElement('canvas');
    canvas.width = img.width;
    canvas.height = img.height;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0);
    
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;
    
    // Transforme la luminosité (noir/blanc) en opacité (alpha)
    for (let i = 0; i < data.length; i += 4) {
        const luminance = (data[i] + data[i+1] + data[i+2]) / 3;
        data[i+3] = luminance; // Modification de l'alpha
    }
    ctx.putImageData(imageData, 0, 0);
    processedMasks.value[index] = canvas.toDataURL();
  };
  img.src = src;
}

const lastProcessedData = ref({});

watch(() => props.layers, (newLayers) => {
  if (!newLayers) return;
  newLayers.forEach((layer, index) => {
    if (layer.drawData && layer.drawData !== lastProcessedData.value[index]) {
      lastProcessedData.value[index] = layer.drawData;
      processMask(layer.drawData, index);
    }
  });
}, { immediate: true, deep: true });

// --- Hashing & PRNG utilities ---
function hashCode(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

function sfc32(a) {
  return function() {
    a |= 0; a = a + 0x6D2B79F5 | 0;
    var t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  }
}

const computedSeed = computed(() => props.seed);

// Transfert l'inclinaison en variables CSS pour des perfs optimales
const containerStyle = computed(() => ({
  zIndex: 2,
  pointerEvents: 'none',
  '--tx': props.tiltX,
  '--ty': props.tiltY,
  '--x': `${50 + props.tiltY * 3.33}%`,
  '--y': `${50 - props.tiltX * 3.33}%`,
  '--posx': `${50 - props.tiltY * 3.33}%`,
  '--posy': `${50 + props.tiltX * 3.33}%`,
  '--noise-intensity': props.layers?.[0]?.noiseIntensity || 0
}));

function getLayerFrequency(layer) {
  if (!layer.isStandard && layer.foilScale) {
    const f = (layer.foilScale / 100).toFixed(4);
    return `${f} ${f}`;
  }
  const rng = sfc32(computedSeed.value + 42);
  const fineness = state.holoFineness || 0.05;
  const base = fineness * 0.4;
  const range = fineness * 1.6;
  return `${(base + rng() * range).toFixed(4)} ${(base + rng() * range).toFixed(4)}`;
}

function getLayerOctaves(layer) {
  if (!layer.isStandard) return 3;
  const rng = sfc32(computedSeed.value + 99);
  return 2 + Math.floor(rng() * 4);
}

// Helper to merge layer data
function resolveLayer(l, i) {
  const isStandard = !props.layers || props.layers.length === 0;
  
  return {
    ...l,
    index: i,
    isStandard: isStandard,
    foilAngle: l.foilAngle !== undefined ? l.foilAngle : (l.angle || 0),
    foilDirection: l.foilDirection || 0,
    foilSpeed: l.foilSpeed || 1.0,
    useRainbow: l.useRainbow || false,
    holoIntensity: l.holoIntensity || 0.6,
    foilScale: l.foilScale || 4.0,
    filterUrl: `url(#holo-filter-${computedSeed.value}-${i})`
  };
}

// Rendering style function
function getLayerStyle(inputLayer, index) {
  const layer = resolveLayer(inputLayer, index);
  const rng = sfc32(computedSeed.value + index);
  
  const baseStyle = {
    position: 'absolute',
    inset: '-20%',
    width: '140%',
    height: '140%',
    opacity: layer.isStandard ? 0.6 : layer.holoIntensity,
    zIndex: 2 + index,
    '--foil-speed': `${10 / (layer.foilSpeed || 1)}s`,
    '--foil-direction': `${layer.foilDirection || 0}deg`,
  };

  // Application du masque transparent généré ou de l'original
  if (!layer.isStandard && layer.drawData) {
    const maskSrc = processedMasks.value[index] || layer.drawData;
    baseStyle.maskImage = `url(${maskSrc})`;
    baseStyle.webkitMaskImage = `url(${maskSrc})`;
    baseStyle.maskSize = '71.42% 71.42%';
    baseStyle.webkitMaskSize = '71.42% 71.42%';
    baseStyle.maskRepeat = 'no-repeat';
    baseStyle.webkitMaskRepeat = 'no-repeat';
    baseStyle.maskPosition = 'center';
    baseStyle.webkitMaskPosition = 'center';
  }

  // Color logic
  let foilColor = layer.foilColor || '#ffffff';
  let isRainbow = layer.useRainbow || layer.isStandard;
  
  const hueBase = rng() * 360;
  let rainbowColors = [];
  if (isRainbow) {
    for (let i = 0; i <= 6; i++) {
        rainbowColors.push(`hsla(${(hueBase + i * 50) % 360}, 100%, 75%, 0.8)`);
    }
  }

  const angle = `${layer.foilAngle - layer.foilDirection}deg`;
  const scale = layer.foilScale * 50;
  
  const depth = layer.parallaxDepth !== undefined ? layer.parallaxDepth : 1.0;
  const ctx = `calc((var(--tx) + var(--itx)) * ${depth})`;
  const cty = `calc((var(--ty) + var(--ity)) * ${depth})`;
  
  const pY = `calc(50% + ${cty} * 1%)`;
  const pX = `calc(50% + ${ctx} * 1%)`;

  const mode = layer.foilMode || 0;

  switch (mode) {
    case 1: // Pulse
      return {
        ...baseStyle,
        background: `radial-gradient(circle at 50% 50%, ${foilColor}, transparent 70%)`,
        backgroundSize: '100% 100%',
        animation: 'holo-pulse var(--foil-speed) infinite ease-in-out',
        mixBlendMode: 'screen'
      };
    case 2: // Electric
      return {
        ...baseStyle,
        background: `repeating-linear-gradient(${angle}, transparent, ${isRainbow ? rainbowColors[0] : foilColor} 2px, transparent 4px)`,
        backgroundSize: `${scale/2}% ${scale/2}%`,
        backgroundPosition: `calc(50% + ${cty} * 2%) calc(50% + ${ctx} * 2%)`,
        filter: `${layer.filterUrl} contrast(2) brightness(1.5)`,
        animation: 'holo-direction-slide var(--foil-speed) infinite linear',
        opacity: (0.5 + rng() * 0.2) * (layer.holoIntensity || 1.0)
      };
    case 3: // Shimmer / Sparkle
      return {
        ...baseStyle,
        background: `radial-gradient(circle at 50% 50%, white 1px, transparent 1px)`,
        backgroundSize: '12px 12px',
        backgroundPosition: `calc(50% + ${cty} * 1.5%) calc(50% + ${ctx} * 1.5%)`,
        opacity: `calc(0.1 + (max(${ctx}, -1 * ${ctx}) + max(${cty}, -1 * ${cty})) / 50)`,
        animation: 'sparkle-pulse 4s infinite ease-in-out',
        mixBlendMode: 'screen'
      };
    case 4: // Flare
      return {
        ...baseStyle,
        background: `linear-gradient(${angle}, transparent 40%, ${foilColor} 50%, transparent 60%)`,
        backgroundSize: `${scale}% ${scale}%`,
        backgroundPosition: `calc(50% + (${ctx} + ${cty}) * 1.5%) calc(50% + (${ctx} + ${cty}) * 1.5%)`,
        animation: 'holo-direction-slide var(--foil-speed) infinite linear',
        mixBlendMode: 'screen',
        opacity: 0.7 * (layer.holoIntensity || 1.0)
      };
    case 5: // Prism / Glass
      return {
        ...baseStyle,
        background: `linear-gradient(${angle}, transparent, ${foilColor} 10%, transparent 20%, ${foilColor} 40%, transparent 60%)`,
        backgroundSize: `${scale}% ${scale}%`,
        backgroundPosition: `calc(50% + ${cty} * 1.2%) calc(50% + ${ctx} * 1.2%)`,
        filter: 'contrast(1.5) brightness(1.2) blur(1px)',
        animation: 'holo-direction-slide var(--foil-speed) infinite linear',
        mixBlendMode: 'overlay',
        opacity: (layer.holoIntensity || 1.0)
      };
    case 6: // Fluid / Water
      return {
        ...baseStyle,
        background: `linear-gradient(${angle}, ${foilColor}, transparent, ${foilColor})`,
        backgroundSize: `${scale}% ${scale}%`,
        backgroundPosition: `${pY} ${pX}`,
        animation: 'holo-direction-slide var(--foil-speed) infinite ease-in-out',
        filter: layer.filterUrl,
        mixBlendMode: 'overlay',
        opacity: (layer.holoIntensity || 1.0)
      };
    case 7: // Digital / Matrix
      return {
        ...baseStyle,
        background: `linear-gradient(rgba(0,255,0,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(0,255,0,0.1) 1px, transparent 1px)`,
        backgroundSize: `${scale/10}px ${scale/10}px`,
        backgroundPosition: `calc(50% + ${cty} * 0.5%) calc(50% + ${ctx} * 0.5%)`,
        animation: 'holo-direction-slide var(--foil-speed) infinite linear',
        color: foilColor,
        mixBlendMode: 'screen',
        opacity: (layer.holoIntensity || 1.0)
      };
    case 8: // Stars
      return {
        ...baseStyle,
        background: `radial-gradient(circle at 50% 50%, white, transparent 40%)`,
        backgroundSize: '40px 40px',
        backgroundPosition: `calc(50% + ${cty} * 1.2%) calc(50% + ${ctx} * 1.2%)`,
        maskImage: `radial-gradient(circle, white, transparent 10%)`,
        animation: 'sparkle-pulse 6s infinite linear',
        mixBlendMode: 'screen'
      };
    case 9: // Nebula
      return {
        ...baseStyle,
        background: `radial-gradient(circle at calc(50% + ${cty}*1%) calc(50% + ${ctx}*1%), ${isRainbow ? rainbowColors[0] : foilColor}, transparent 60%), radial-gradient(circle at calc(20% - ${cty}*1%) calc(80% - ${ctx}*1%), ${isRainbow ? rainbowColors[3] : '#ff00ff'}, transparent 60%)`,
        backgroundSize: '150% 150%',
        filter: 'blur(10px) brightness(1.2)',
        mixBlendMode: 'overlay',
        opacity: (layer.holoIntensity || 0.6)
      };
    case 10: // Rare Holo (Classique)
    case 0:  // Default/Standard
    default: // Rare Holo as new global default
      return {
        ...baseStyle,
        backgroundImage: `linear-gradient(115deg, transparent 20%, rgba(255, 0, 0, 0.5) 25%, rgba(255, 165, 0, 0.5) 35%, rgba(255, 255, 0, 0.5) 45%, rgba(0, 128, 0, 0.5) 55%, rgba(0, 0, 255, 0.5) 65%, rgba(75, 0, 130, 0.5) 75%, rgba(238, 130, 238, 0.5) 85%, transparent 90%)`,
        backgroundSize: '200% 200%',
        backgroundPosition: `var(--posx) var(--posy)`,
        mixBlendMode: 'color-dodge',
        filter: 'brightness(1.2) contrast(1.2)',
        animation: 'holo-idle-slide 10s infinite linear'
      };
    case 11: // Radiant / V (Stries)
      return {
        ...baseStyle,
        backgroundImage: `repeating-linear-gradient(-45deg, rgba(255,100,100,0.5), rgba(255,200,100,0.5) 10%, rgba(100,255,100,0.5) 20%, rgba(100,100,255,0.5) 30%, rgba(255,100,255,0.5) 40%, rgba(255,100,100,0.5) 50%), repeating-linear-gradient(45deg, transparent 0%, rgba(255,255,255,0.3) 2%, transparent 4%)`,
        backgroundSize: '400% 400%',
        backgroundPosition: `var(--posx) var(--posy)`,
        mixBlendMode: 'color-dodge',
        filter: 'brightness(1.3) contrast(1.5) saturate(1.2)',
        animation: 'holo-idle-slide 15s infinite linear'
      };
    case 12: // Galaxy / Cosmos
      return {
        ...baseStyle,
        backgroundImage: `radial-gradient(circle at var(--posx) var(--posy), rgba(255,255,255,0.8) 0%, transparent 15%), radial-gradient(circle at calc(var(--posx) * 0.5) calc(var(--posy) * 1.5), rgba(200,200,255,0.6) 0%, transparent 10%), radial-gradient(circle at calc(var(--posx) * 1.5) calc(var(--posy) * 0.5), rgba(255,200,255,0.6) 0%, transparent 10%), linear-gradient(115deg, rgba(255, 0, 0, 0.2), rgba(0, 0, 255, 0.2), rgba(0, 255, 0, 0.2))`,
        backgroundSize: '150% 150%',
        backgroundPosition: 'center',
        mixBlendMode: 'color-dodge',
        filter: 'brightness(1.4) contrast(1.5)',
        animation: 'holo-pulse 8s infinite alternate ease-in-out'
      };
    case 13: // Gold / Secret Rare
      return {
        ...baseStyle,
        backgroundImage: `repeating-linear-gradient(45deg, rgba(255,215,0,0.6) 0%, rgba(255,255,255,0.6) 10%, rgba(218,165,32,0.6) 20%, rgba(255,215,0,0.6) 30%), radial-gradient(farthest-corner circle at var(--x) var(--y), transparent 0%, rgba(139,69,19,0.4) 100%)`,
        backgroundSize: '200% 200%',
        backgroundPosition: `var(--posx) var(--posy)`,
        mixBlendMode: 'color-dodge',
        filter: 'brightness(1.1) contrast(1.3) sepia(0.5)',
        animation: 'holo-idle-slide 12s infinite linear'
      };
  }
}
</script>

<style scoped>
.holo-container {
  position: absolute;
  inset: 0;
  border-radius: inherit;
  overflow: hidden;
  z-index: 2;
  opacity: 0;
  transition: opacity 0.5s ease;
  pointer-events: none;
  
  /* Idle Animation State */
  --itx: 0;
  --ity: 0;
  animation: holo-idle-x 12s infinite ease-in-out, holo-idle-y 15s infinite ease-in-out;
}

.holo-noise {
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: 5;
  mix-blend-mode: overlay;
  opacity: var(--noise-intensity, 0);
  background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='1.2' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.7'/%3E%3C/svg%3E");
  transition: opacity 0.3s ease;
}

@keyframes holo-idle-x {
  0%, 100% { --itx: -2; }
  50% { --itx: 2; }
}

@keyframes holo-idle-y {
  0%, 100% { --ity: -1.5; }
  50% { --ity: 1.5; }
}

.holo-container.always-visible {
  opacity: 1 !important;
}

.holo-layer-content {
  transform: translateZ(1px); /* Force GPU accélération */
  will-change: background-position, transform; /* Aide le navigateur à optimiser */
}

@keyframes holo-slide {
  0% { transform: translate(0, 0); }
  50% { transform: translate(-5%, -5%); }
  100% { transform: translate(0, 0); }
}

@keyframes holo-direction-slide {
  0% { transform: rotate(var(--foil-direction)) translate(0%, 0); }
  100% { transform: rotate(var(--foil-direction)) translate(-40%, 0); }
}

@keyframes holo-pulse {
  0%, 100% { transform: scale(1); opacity: 0.5; }
  50% { transform: scale(1.2); opacity: 1; }
}

@keyframes holo-idle-slide {
  0% { background-position: 0% 50%; opacity: 0.8; }
  50% { background-position: 100% 50%; opacity: 1.0; }
  100% { background-position: 0% 50%; opacity: 0.8; }
}

@keyframes sparkle-pulse {
  0%, 100% { transform: scale(1) rotate(0deg); opacity: 0.2; }
  50% { transform: scale(1.05) rotate(1deg); opacity: 0.5; }
}

@keyframes matrix-scroll {
  0% { background-position: calc(50% + var(--ty) * 0.5%) calc(50% + var(--tx) * 0.5%); }
  100% { background-position: calc(50% + var(--ty) * 0.5%) calc(150% + var(--tx) * 0.5%); }
}
</style>