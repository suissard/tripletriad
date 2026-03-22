<template>
  <button
    ref="btnRef"
    class="btn glass-btn-container"
    :class="[
      variantClass,
      { 'glass-panel': glass, 'w-full': fullWidth }
    ]"
    :disabled="disabled"
    @click="$emit('click', $event)"
    @mousedown="impact"
    @touchstart.passive="impact"
  >
    <div ref="wrapperRef" class="glass-masked-wrapper" :style="{ borderRadius: computedRadius }">
        <div class="glass-layer" :style="{
            borderRadius: computedRadius,
            backgroundColor: 'rgba(255, 255, 255, var(--ui-btn-opacity, 0.25))'
        }"></div>
        <canvas ref="canvasRef" class="cracks-canvas"></canvas>
    </div>
    <div class="glass-content" :class="{ 'is-loading': loading }">
      <div v-if="loading" class="btn-spinner"></div>
      <slot v-else></slot>
    </div>
  </button>
</template>

<script setup>
import { computed, ref, onMounted, onBeforeUnmount } from 'vue';

const props = defineProps({
  variant: {
    type: String,
    default: 'secondary', // primary, secondary, accent, ghost
  },
  glass: {
    type: Boolean,
    default: true,
  },
  disabled: {
    type: Boolean,
    default: false,
  },
  fullWidth: {
    type: Boolean,
    default: false,
  },
  loading: {
    type: Boolean,
    default: false,
  }
});

defineEmits(['click']);

const variantClass = computed(() => {
  if (props.variant === 'primary') return 'btn-primary';
  if (props.variant === 'accent') return 'btn-accent';
  if (props.variant === 'secondary') return 'btn-secondary';
  if (props.variant === 'ghost') return 'btn-ghost';
  return ''; // default / none
});

// --- Broken Glass Effect Logic ---
const btnRef = ref(null);
const wrapperRef = ref(null);
const canvasRef = ref(null);
const computedRadius = ref('0px');

let w = 0, h = 0;
let cCtx = null, maskCanvas = null, mCtx = null;
let isRepairing = false, idleTimer = null, animFrame = null;
let repairOrigin = { x: 0, y: 0 }, blobPoints = [];

const init = () => {
    if (!btnRef.value) return;
    const style = window.getComputedStyle(btnRef.value);
    // Inherit the exact border radius from the button
    computedRadius.value = style.borderRadius;
    w = btnRef.value.offsetWidth;
    h = btnRef.value.offsetHeight;

    if (!maskCanvas) {
        maskCanvas = document.createElement('canvas');
        mCtx = maskCanvas.getContext('2d', { willReadFrequently: true });
        cCtx = canvasRef.value.getContext('2d');
    }

    canvasRef.value.width = maskCanvas.width = w;
    canvasRef.value.height = maskCanvas.height = h;

    mCtx.fillStyle = 'black';
    mCtx.fillRect(0, 0, w, h);
    updateMask();
};

const updateMask = () => {
    if(!wrapperRef.value) return;
    const dataUrl = 'url(' + maskCanvas.toDataURL() + ')';
    wrapperRef.value.style.webkitMaskImage = dataUrl;
    wrapperRef.value.style.maskImage = dataUrl;
};

const addCrack = (x, y, angle, depth, width) => {
    if (depth <= 0 || width < 0.1 || !cCtx) return;
    const len = Math.random() * 15 + 5;
    const nx = x + Math.cos(angle) * len;
    const ny = y + Math.sin(angle) * len;

    cCtx.beginPath();
    cCtx.moveTo(x, y);
    cCtx.lineTo(nx, ny);
    cCtx.lineWidth = width;
    cCtx.strokeStyle = 'rgba(255, 255, 255, ' + (0.5 + (depth/20)) + ')';
    cCtx.stroke();

    if (Math.random() > 0.8) addCrack(nx, ny, angle + (Math.random()-0.5)*2, depth-1, width*0.6);
    addCrack(nx, ny, angle + (Math.random()-0.5)*0.3, depth-1, width*0.9);
};

const getConfigValues = () => {
    const rootStyle = getComputedStyle(document.documentElement);
    const holeStr = rootStyle.getPropertyValue('--ui-btn-hole').trim();
    const speedStr = rootStyle.getPropertyValue('--ui-btn-speed').trim();
    return {
        hole: holeStr ? parseFloat(holeStr) : 30,
        speed: speedStr ? parseFloat(speedStr) : 1.0
    };
};

const impact = (e) => {
    if (props.disabled) return;

    // Ensure canvas matches button size (fixes layout shifts)
    if (btnRef.value && (btnRef.value.offsetWidth !== w || btnRef.value.offsetHeight !== h)) {
        init();
    }

    isRepairing = false;
    clearTimeout(idleTimer);
    cancelAnimationFrame(animFrame);

    const r = btnRef.value.getBoundingClientRect();
    const x = (e.clientX || (e.touches && e.touches[0].clientX)) - r.left;
    const y = (e.clientY || (e.touches && e.touches[0].clientY)) - r.top;

    btnRef.value.classList.remove('impact-shake');
    void btnRef.value.offsetWidth;
    btnRef.value.classList.add('impact-shake');

    if(cCtx) {
        cCtx.globalCompositeOperation = 'source-over';
        cCtx.lineCap = 'round';
        for(let i=0; i<12; i++) addCrack(x, y, (Math.PI*2/12)*i + Math.random(), 18, 1 + Math.random() * 3);
    }

    const cfg = getConfigValues();

    if (cfg.hole > 0) {
        mCtx.globalCompositeOperation = 'destination-out';
        mCtx.beginPath();
        const radius = cfg.hole + (Math.random() * cfg.hole * 0.5);
        for(let i=0; i<12; i++){
            const a = (Math.PI*2/12)*i;
            const d = radius * (0.3 + Math.random()*0.7);
            mCtx.lineTo(x + Math.cos(a)*d, y + Math.sin(a)*d);
        }
        mCtx.fill();
        updateMask();
    }

    idleTimer = setTimeout(() => startRepair(cfg.speed), 1000);
};

const startRepair = (speed) => {
    isRepairing = true;
    repairOrigin = { x: w/2, y: h/2 };
    for(let i=0; i<30; i++) {
        const rx = Math.floor(Math.random() * w);
        const ry = Math.floor(Math.random() * h);
        if (mCtx.getImageData(rx, ry, 1, 1).data[3] > 0) { repairOrigin = {x: rx, y: ry}; break; }
    }

    blobPoints = [];
    for(let i=0; i<30; i++) blobPoints.push({ angle: (Math.PI*2/30)*i, r: 0, s: (2 + Math.random()*4) * speed });
    animFrame = requestAnimationFrame(() => repairLoop(speed));
};

const repairLoop = (speed) => {
    if (!isRepairing) return;
    let maskChanged = false, allMax = true;
    const maxRadius = Math.hypot(w, h);

    const blobPath = new Path2D();
    blobPoints.forEach((p, i) => {
        p.r += p.s; p.s += (Math.random() - 0.4) * speed;
        if (p.r < maxRadius) { allMax = false; maskChanged = true; }
        const px = repairOrigin.x + Math.cos(p.angle) * p.r;
        const py = repairOrigin.y + Math.sin(p.angle) * p.r;
        if (i === 0) blobPath.moveTo(px, py); else blobPath.lineTo(px, py);
    });
    blobPath.closePath();

    mCtx.globalCompositeOperation = 'source-over';
    mCtx.fillStyle = 'black'; mCtx.fill(blobPath);
    if(cCtx) {
        cCtx.globalCompositeOperation = 'destination-out';
        cCtx.fillStyle = 'black'; cCtx.fill(blobPath);
    }

    if (maskChanged) updateMask();

    if (!allMax) animFrame = requestAnimationFrame(() => repairLoop(speed));
    else {
        isRepairing = false;
        mCtx.fillRect(0, 0, w, h);
        if(cCtx) cCtx.clearRect(0, 0, w, h);
        updateMask();
    }
};

onMounted(() => {
    // Small timeout to let CSS layout calculate final borders/dimensions
    setTimeout(init, 50);
    window.addEventListener('resize', init);
});
onBeforeUnmount(() => {
    window.removeEventListener('resize', init);
    clearTimeout(idleTimer);
    cancelAnimationFrame(animFrame);
});
</script>

<style scoped>
/* Inherits from global styles in style.css (.btn, .btn-primary, .glass-panel, etc.) */
.btn-ghost {
  background: transparent;
  border: 1px solid transparent;
  color: inherit;
  box-shadow: none;
}
.btn-ghost:hover {
  background: rgba(255, 255, 255, 0.1);
}

/* --- BROKEN GLASS STYLES --- */
.glass-btn-container {
    position: relative;
    overflow: hidden; /* Fallback containment */
    /* Use normal button cursor unless we specifically want crosshair */
    /* cursor: crosshair; */
}

.glass-masked-wrapper {
    position: absolute;
    inset: 0;
    mask-size: 100% 100%;
    -webkit-mask-size: 100% 100%;
    pointer-events: none; /* Let clicks pass to button */
}

.glass-layer {
    position: absolute;
    inset: 0;
    border: 1px solid rgba(255, 255, 255, 0.5);
    box-shadow: inset 0 0 20px rgba(255,255,255,0.2);
    pointer-events: none;
}

.cracks-canvas {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    pointer-events: none;
    z-index: 2;
}

.glass-content {
    position: relative;
    z-index: 10;
    /* Do not block clicks inside the button */
    pointer-events: auto;
    width: 100%;
    height: 100%;
    display: flex;
    justify-content: center;
    align-items: center;
}

@keyframes hammer-hit {
    0% { transform: translate(0, 0); filter: brightness(1); }
    10% { transform: translate(-4px, 3px); filter: brightness(1.3); }
    20% { transform: translate(3px, -2px); filter: brightness(1); }
    30% { transform: translate(-2px, 1px); }
    40% { transform: translate(0, 0); }
}
.impact-shake {
    animation: hammer-hit 0.2s cubic-bezier(0.36, 0.07, 0.19, 0.97) both;
}

.is-loading {
  gap: 10px;
}

.btn-spinner {
  width: 1.2rem;
  height: 1.2rem;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top-color: white;
  border-radius: 50%;
  animation: btn-rotate 0.8s linear infinite;
}

@keyframes btn-rotate {
  to { transform: rotate(360deg); }
}
</style>
