
<template>
  <div ref="wrapperRef" class="glass-masked-wrapper" v-show="hasImpact">
      <div class="glass-layer"></div>
      <canvas ref="canvasRef" class="cracks-canvas"></canvas>
  </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount, watch, nextTick } from 'vue';

const props = defineProps({
  direction: {
    type: String, // 'top', 'bottom', 'left', 'right', or null
    default: null
  }
});

const wrapperRef = ref(null);
const canvasRef = ref(null);
const hasImpact = ref(false);

let w = 0, h = 0;
let cCtx = null, maskCanvas = null, mCtx = null;
let initialized = false;

const init = () => {
    if (!wrapperRef.value || !canvasRef.value) return;

    // We get dimensions from the parent container (the card face)
    const rect = wrapperRef.value.parentElement.getBoundingClientRect();
    w = rect.width;
    h = rect.height;

    if (w === 0 || h === 0) {
        setTimeout(init, 50);
        return;
    }

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
    initialized = true;
};

const updateMask = () => {
    if(!wrapperRef.value || !maskCanvas) return;
    const dataUrl = 'url(' + maskCanvas.toDataURL() + ')';
    wrapperRef.value.style.webkitMaskImage = dataUrl;
    wrapperRef.value.style.maskImage = dataUrl;
};

const addCrack = (x, y, angle, depth, width) => {
    if (depth <= 0 || width < 0.1 || !cCtx) return;
    const len = Math.random() * 12 + 5;
    const nx = x + Math.cos(angle) * len;
    const ny = y + Math.sin(angle) * len;

    cCtx.beginPath();
    cCtx.moveTo(x, y);
    cCtx.lineTo(nx, ny);
    cCtx.lineWidth = width;
    cCtx.strokeStyle = 'rgba(255, 255, 255, ' + (0.4 + (depth/20)) + ')';
    cCtx.stroke();

    if (Math.random() > 0.8) addCrack(nx, ny, angle + (Math.random()-0.5)*2, depth-1, width*0.6);
    addCrack(nx, ny, angle + (Math.random()-0.5)*0.3, depth-1, width*0.9);
};

const triggerImpact = () => {
    if (!props.direction) {
        hasImpact.value = false;
        return;
    }

    if (!initialized) init();
    if (w === 0 || h === 0) return;

    hasImpact.value = true;

    if(cCtx && mCtx) {
        cCtx.clearRect(0, 0, w, h);
        mCtx.globalCompositeOperation = 'source-over';
        mCtx.fillStyle = 'black';
        mCtx.fillRect(0, 0, w, h);
    }

    // Determine impact points based on direction
    const padding = 20; // Distance from edge
    const spread = 25;  // Distance between multiple hits along the edge

    let points = [];
    let cx = w / 2, cy = h / 2;

    if (props.direction === 'top') {
        points = [ {x: cx - spread, y: padding}, {x: cx, y: padding}, {x: cx + spread, y: padding} ];
    } else if (props.direction === 'bottom') {
        points = [ {x: cx - spread, y: h - padding}, {x: cx, y: h - padding}, {x: cx + spread, y: h - padding} ];
    } else if (props.direction === 'left') {
        points = [ {x: padding, y: cy - spread}, {x: padding, y: cy}, {x: padding, y: cy + spread} ];
    } else if (props.direction === 'right') {
        points = [ {x: w - padding, y: cy - spread}, {x: w - padding, y: cy}, {x: w - padding, y: cy + spread} ];
    } else {
        points = [ {x: cx, y: cy} ]; // Fallback center
    }

    const holeRadius = 40; // 80px diameter

    points.forEach(p => {
        // Add random slight jitter
        const x = p.x + (Math.random() - 0.5) * 10;
        const y = p.y + (Math.random() - 0.5) * 10;

        if(cCtx) {
            cCtx.globalCompositeOperation = 'source-over';
            cCtx.lineCap = 'round';
            for(let i=0; i<6; i++) addCrack(x, y, (Math.PI*2/6)*i + Math.random(), 10, 1 + Math.random() * 2);
        }

        if (mCtx) {
            mCtx.globalCompositeOperation = 'destination-out';
            mCtx.beginPath();
            const radius = holeRadius + (Math.random() * holeRadius * 0.2);
            for(let i=0; i<12; i++){
                const a = (Math.PI*2/12)*i;
                const d = radius * (0.4 + Math.random()*0.6);
                mCtx.lineTo(x + Math.cos(a)*d, y + Math.sin(a)*d);
            }
            mCtx.fill();
        }
    });

    updateMask();
};

watch(() => props.direction, (newVal) => {
    if (newVal) {
        nextTick(() => {
            setTimeout(triggerImpact, 50);
        });
    } else {
        hasImpact.value = false;
    }
}, { immediate: true });

onMounted(() => {
    setTimeout(init, 50);
    window.addEventListener('resize', init);
});

onBeforeUnmount(() => {
    window.removeEventListener('resize', init);
});
</script>

<style scoped>
.glass-masked-wrapper {
    position: absolute;
    inset: 0;
    mask-size: 100% 100%;
    -webkit-mask-size: 100% 100%;
    pointer-events: none;
    z-index: 20;
    border-radius: inherit;
}

.glass-layer {
    position: absolute;
    inset: 0;
    box-shadow: inset 0 0 20px rgba(255,255,255,0.2);
    pointer-events: none;
    border-radius: inherit;
    background-color: rgba(255, 255, 255, 0.15);
    backdrop-filter: blur(3px);
    border: 1px solid rgba(255, 255, 255, 0.3);
}

.cracks-canvas {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    pointer-events: none;
    border-radius: inherit;
    z-index: 2;
}
</style>
