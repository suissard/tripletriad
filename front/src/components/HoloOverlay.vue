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
        class="holo-layer-content card" 
        :data-rarity="getLayerRarity(resolveLayer(inputLayer, i))"
        :data-supertype="resolveLayer(inputLayer, i).supertype || ''"
        :data-subtypes="resolveLayer(inputLayer, i).subtypes || ''"
        :data-gallery="alwaysVisible"
        :style="getLayerStyle(inputLayer, i)"
      >
        <div class="card__shine"></div>
        <div class="card__glare"></div>
      </div>
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
  alwaysVisible: { type: Boolean, default: false },
  supertype: { type: String, default: '' },
  subtypes: { type: [Array, String], default: () => [] }
});

// --- Gestion des masques JPEG (Noir & Blanc -> Transparence) ---
const processedMasks = ref({});
const processedPatterns = ref({});

function processImage(src, index, targetRef) {
  if (!src) return;
  const img = new Image();
  img.crossOrigin = "Anonymous";
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
    targetRef.value[index] = canvas.toDataURL();
  };
  img.src = src;
}

const lastProcessedData = ref({});

watch(() => props.layers, (newLayers) => {
  if (!newLayers) return;
  newLayers.forEach((layer, index) => {
    // Mask
    if (layer.drawData && layer.drawData !== lastProcessedData.value[`m${index}`]) {
      lastProcessedData.value[`m${index}`] = layer.drawData;
      processImage(layer.drawData, index, processedMasks);
    }
    // Pattern
    if (layer.patternData && layer.patternData !== lastProcessedData.value[`p${index}`]) {
      lastProcessedData.value[`p${index}`] = layer.patternData;
      processImage(layer.patternData, index, processedPatterns);
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
const containerStyle = computed(() => {
  const tx = props.tiltX; // -15 to 15
  const ty = props.tiltY; // -15 to 15
  
  // Mapping tilt to 0-100% position (mouse simulation)
  const mx = 50 + (ty * 3.33); 
  const my = 50 - (tx * 3.33); 
  
  // Hypotenuse/Intensity (0 to ~1.0)
  const hyp = Math.min(1.0, Math.sqrt(Math.pow(ty / 15, 2) + Math.pow(tx / 15, 2)));

  return {
    zIndex: 2,
    pointerEvents: 'none',
    '--tx': tx,
    '--ty': ty,
    '--mx': `${mx}%`,
    '--my': `${my}%`,
    '--posx': `${mx}%`,
    '--posy': `${my}%`,
    '--hyp': hyp,
    '--o': props.alwaysVisible ? 1 : hyp, // Define opacity for CSS textures
    '--noise-intensity': props.layers?.[0]?.noiseIntensity || 0
  };
});

function getLayerFrequency(layer) {
  if (!layer.isStandard && layer.foilMode !== 0 && layer.foilScale) {
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
  if (!layer.isStandard && layer.foilMode !== 0) return 2;
  const rng = sfc32(computedSeed.value + 99);
  return 2 + Math.floor(rng() * 2); // Cap at 3 octaves max for performance
}

// Helper to merge layer data
function resolveLayer(l, i) {
  const isStandard = !props.layers || props.layers.length === 0;
  
  return {
    ...l,
    index: i,
    isStandard: isStandard,
    foilMode: l.foilMode || (isStandard ? 10 : 0), // Default to Rare Holo (10) for standard premium
    foilAngle: l.foilAngle !== undefined ? l.foilAngle : (l.angle || 0),
    foilDirection: l.foilDirection || 0,
    foilSpeed: l.foilSpeed || 1.0,
    useRainbow: l.useRainbow || false,
    holoIntensity: l.holoIntensity || 0.6,
    foilScale: l.foilScale || 4.0,
    parallaxDepth: l.parallaxDepth !== undefined ? l.parallaxDepth : 1.0,
    patternData: l.patternData || null,
    supertype: l.supertype || l.dataSupertype || props.supertype || '',
    subtypes: l.subtypes || l.dataSubtypes || props.subtypes || '',
    filterUrl: `url(#holo-filter-${computedSeed.value}-${i})`
  };
}

function getLayerRarity(layer) {
  const mode = layer.foilMode || 10;
  const modeMappings = {
    0: 'rare holo',
    10: 'rare holo',
    11: 'rare radiant',
    12: 'rare holo galaxy',
    13: 'rare secret',
    14: 'rare ultra',
    15: 'rare holo galaxy fullshine',
    16: 'rare holo v',
    17: 'rare holo vmax',
    18: 'rare holo vstar',
    19: 'rare rainbow'
  };
  return modeMappings[mode] || 'rare holo';
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
  let maskImages = [];
  
  if (!layer.isStandard && (layer.drawData || layer.patternData)) {
    if (layer.drawData) {
      const maskSrc = processedMasks.value[index] || layer.drawData;
      maskImages.push(`url(${maskSrc})`);
    }
    if (layer.patternData) {
      const patternSrc = processedPatterns.value[index] || layer.patternData;
      maskImages.push(`url(${patternSrc})`);
    }

    if (maskImages.length > 0) {
      baseStyle.maskImage = maskImages.join(', ');
      baseStyle.webkitMaskImage = maskImages.join(', ');
      baseStyle.maskSize = '71.42% 71.42%';
      baseStyle.webkitMaskSize = '71.42% 71.42%';
      baseStyle.maskRepeat = 'no-repeat';
      baseStyle.webkitMaskRepeat = 'no-repeat';
      baseStyle.maskPosition = 'center';
      baseStyle.webkitMaskPosition = 'center';
      
      if (maskImages.length > 1) {
        // pattern (last in array, bottom) subject to mask (first in array, top)
        // using destination-in so BOTTOM (pattern) is clipped by TOP (mask)
        // actually in -webkit standard: mask-image: mask, pattern;
        // mask-composite: source-in; means "show top image only where it overlaps bottom image"
        // both result in Intersection.
        baseStyle.maskComposite = 'intersect';
        baseStyle.webkitMaskComposite = 'source-in';
      }
    }
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
  
  const depth = Math.min(layer.parallaxDepth || 1.0, 2.1);
  const moveDepth = depth - 1.0;
  const ctx = `calc((var(--tx) + var(--itx)) * ${moveDepth})`;
  const cty = `calc((var(--ty) + var(--ity)) * ${moveDepth})`;
  
  const pY = `calc(50% + ${cty} * 1%)`;
  const pX = `calc(50% + ${ctx} * 1%)`;

  // Local position overrides global --posx/--posy to respect individual layer depth
  // When depth = 1, moveDepth = 0, effect is static (pinned to card)
  const posX = `calc(50% - ${cty} * 3.33%)`;
  const posY = `calc(50% + ${ctx} * 3.33%)`;
  const tiltPosX = `calc(50% + ${cty} * 3.33%)`;
  const tiltPosY = `calc(50% - ${ctx} * 3.33%)`;

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
    case 10: // Rare Holo (Improved)
    case 0:  // Default/Standard
    default: // Rare Holo as new global default
      return {
        ...baseStyle,
        // Handled by CSS [data-rarity="rare holo"]
        mixBlendMode: 'color-dodge',
        background: 'none'
      };
    case 11: // Radiant (Improved)
      return {
        ...baseStyle,
        // Handled by CSS [data-rarity="rare radiant"]
        mixBlendMode: 'color-dodge',
        background: 'none'
      };
    case 12: // Galaxy (Improved)
      return {
        ...baseStyle,
        // Handled by CSS [data-rarity="rare holo galaxy"]
        mixBlendMode: 'color-dodge',
        background: 'none'
      };
    case 13: // Rare Secret (Replaces legacy Gold)
    case 14: // Rare Ultra
    case 15: // Rare Holo GalaxyFullshine
    case 16: // Rare Holo V
    case 17: // Rare Holo VMax
    case 18: // Rare Holo VStar
    case 19: // Rare Rainbow
      return {
        ...baseStyle,
        // Heavy lifting handled by CSS
        mixBlendMode: 'color-dodge',
        background: 'none'
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
  opacity: 1;
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
  transform: translateZ(1px); /* Force GPU acceleration */
  will-change: background-position, transform, filter; /* Optimized rendering */
  position: relative;
  overflow: hidden;
}

.card__shine, .card__glare {
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: 1;
}

.card__glare {
  z-index: 2;
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