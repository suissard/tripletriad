<template>
  <div ref="containerRef" class="holo-effect-canvas absolute inset-0 pointer-events-none rounded-[inherit] overflow-hidden z-[2]">
  </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount, watch, shallowRef } from 'vue';
import * as THREE from 'three';
import { vertexShaderStr, fragmentShaderStr } from '../../utils/shaders/holoShader.js';

const props = defineProps({
  imageUrl: { type: String, required: true },
  effect: { type: Object, required: true },
  tiltX: { type: Number, default: 0 }, // -1 to 1
  tiltY: { type: Number, default: 0 }  // -1 to 1
});

const MAX_LAYERS = 5;

const containerRef = ref(null);
const scene = shallowRef(null);
const camera = shallowRef(null);
const renderer = shallowRef(null);
const mesh = shallowRef(null);
const material = shallowRef(null);
const textureLoader = shallowRef(null);

let animationFrameId = null;
let dummyTexture = null;

onMounted(() => {
  initThreeJS();
  loadTextureAndSetupEffect();
});

onBeforeUnmount(() => {
  if (animationFrameId) cancelAnimationFrame(animationFrameId);
  if (renderer.value) {
    renderer.value.dispose();
  }
  if (dummyTexture) dummyTexture.dispose();
});

function initThreeJS() {
  const container = containerRef.value;
  if (!container) return;

  const width = container.clientWidth || 300;
  const height = container.clientHeight || 420;
  const aspect = width / height;

  scene.value = new THREE.Scene();
  camera.value = new THREE.PerspectiveCamera(45, aspect, 0.1, 1000);
  camera.value.position.z = 5;

  renderer.value = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.value.setPixelRatio(Math.min(window.devicePixelRatio, 2)); 
  renderer.value.setSize(width, height);
  container.appendChild(renderer.value.domElement);

  textureLoader.value = new THREE.TextureLoader();

  const dcv = document.createElement('canvas');
  dcv.width = 1; dcv.height = 1;
  dummyTexture = new THREE.CanvasTexture(dcv);

  animate();
}

function loadTextureAndSetupEffect() {
  if (!textureLoader.value || !props.imageUrl) return;

  textureLoader.value.load(props.imageUrl, (tex) => {
    if (mesh.value) scene.value.remove(mesh.value);

    const aspect = tex.image.width / tex.image.height;
    const planeHeight = 4.0;
    const planeWidth = planeHeight * aspect;
    const geometry = new THREE.PlaneGeometry(planeWidth, planeHeight, 32, 32); 

    material.value = new THREE.ShaderMaterial({
      vertexShader: vertexShaderStr,
      fragmentShader: fragmentShaderStr,
      uniforms: {
        tDiffuse: { value: tex },
        uLayerCount: { value: 0 },
        uActiveLayer: { value: 0 },
        uShowMask: { value: false },
        uTime: { value: 0 },
        uTilt: { value: new THREE.Vector2(0, 0) },
        uLayerEnabled: { value: new Array(MAX_LAYERS).fill(true) },
        uTargetColors: { value: new Array(MAX_LAYERS).fill(0).map(()=>new THREE.Color()) },
        uSensitivities: { value: new Array(MAX_LAYERS).fill(0) },
        uTolerances: { value: new Array(MAX_LAYERS).fill(0) },
        uHoloIntensities: { value: new Array(MAX_LAYERS).fill(0.5) },
        uFoilScales: { value: new Array(MAX_LAYERS).fill(0) },
        uFoilAngles: { value: new Array(MAX_LAYERS).fill(0) },
        uFoilColors: { value: new Array(MAX_LAYERS).fill(0).map(()=>new THREE.Color()) },
        uFoilSpeeds: { value: new Array(MAX_LAYERS).fill(0) },
        uFoilModes: { value: new Array(MAX_LAYERS).fill(0) },
        uDrawMask0: { value: dummyTexture },
        uDrawMask1: { value: dummyTexture },
        uDrawMask2: { value: dummyTexture },
        uDrawMask3: { value: dummyTexture },
        uDrawMask4: { value: dummyTexture }
      }
    });

    mesh.value = new THREE.Mesh(geometry, material.value);
    scene.value.add(mesh.value);
    
    syncUniforms();
  });
}

function syncUniforms() {
  if (!material.value || !props.effect) return;
  const uniforms = material.value.uniforms;
  const layers = props.effect.layers || [];

  uniforms.uLayerCount.value = layers.length;

  for (let i = 0; i < MAX_LAYERS; i++) {
    if (i < layers.length) {
      const l = layers[i];
      uniforms.uLayerEnabled.value[i] = l.enabled;
      uniforms.uTargetColors.value[i].set(l.targetColor);
      uniforms.uSensitivities.value[i] = l.sensitivity;
      uniforms.uTolerances.value[i] = l.tolerance;
      uniforms.uHoloIntensities.value[i] = l.holoIntensity;
      uniforms.uFoilScales.value[i] = l.foilScale;
      uniforms.uFoilAngles.value[i] = l.foilAngle * Math.PI / 180;
      uniforms.uFoilColors.value[i].set(l.foilColor);
      uniforms.uFoilSpeeds.value[i] = l.foilSpeed;
      uniforms.uFoilModes.value[i] = l.foilMode;
      
      if (l.drawData) {
        const img = new Image();
        img.onload = () => {
          const canvasTex = new THREE.CanvasTexture(img);
          uniforms['uDrawMask' + i].value = canvasTex;
        };
        img.src = l.drawData;
      } else {
        uniforms['uDrawMask' + i].value = dummyTexture;
      }
    } else {
      uniforms.uLayerEnabled.value[i] = false;
      uniforms['uDrawMask' + i].value = dummyTexture;
    }
  }
}

function animate() {
  animationFrameId = requestAnimationFrame(animate);
  if (material.value) {
    material.value.uniforms.uTime.value = performance.now() / 1000;
    material.value.uniforms.uTilt.value.set(props.tiltX, props.tiltY);
  }
  if (renderer.value && scene.value && camera.value) {
    renderer.value.render(scene.value, camera.value);
  }
}

watch(() => props.effect, () => {
  syncUniforms();
}, { deep: true });

watch(() => props.imageUrl, () => {
  loadTextureAndSetupEffect();
});

</script>

<style scoped>
.holo-effect-canvas {
  width: 100%;
  height: 100%;
  z-index: 2; /* Below name bar (3) and stats cross (4) */
}
:deep(canvas) {
  width: 100% !important;
  height: 100% !important;
  display: block;
  pointer-events: none !important;
}
</style>
