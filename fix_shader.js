import fs from 'fs';
const file = 'back-office/src/views/FoilEditorView.vue';
let content = fs.readFileSync(file, 'utf8');

// Replace script tags containing shaders
content = content.replace(/<div v-show="false">[\s\S]*?<\/div>/m, '');
content = content.replace('const MAX_LAYERS = 5;', `
const MAX_LAYERS = 5;

const vertexShaderStr = \`
  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vViewPosition;
  void main() {
      vUv = uv;
      vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
      vNormal = normalize(normalMatrix * normal);
      vViewPosition = -mvPosition.xyz;
      gl_Position = projectionMatrix * mvPosition;
  }
\`;

const fragmentShaderStr = \`
  #define MAX_LAYERS 5
  uniform sampler2D tDiffuse;
  uniform sampler2D uDrawMask0;
  uniform sampler2D uDrawMask1;
  uniform sampler2D uDrawMask2;
  uniform sampler2D uDrawMask3;
  uniform sampler2D uDrawMask4;
  uniform int uLayerCount;
  uniform int uActiveLayer;
  uniform bool uShowMask;
  uniform float uTime;
  uniform bool uLayerEnabled[MAX_LAYERS];
  uniform vec3 uTargetColors[MAX_LAYERS];
  uniform float uSensitivities[MAX_LAYERS];
  uniform float uTolerances[MAX_LAYERS];
  uniform float uHoloIntensities[MAX_LAYERS];
  uniform float uFoilScales[MAX_LAYERS];
  uniform float uFoilAngles[MAX_LAYERS];
  uniform vec3 uFoilColors[MAX_LAYERS];
  uniform float uFoilSpeeds[MAX_LAYERS];
  uniform int uFoilModes[MAX_LAYERS];
  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vViewPosition;

  vec3 spectral(float x) {
      vec3 c = vec3(0.0);
      c.r = smoothstep(0.4, 0.2, x) + smoothstep(0.7, 1.0, x);
      c.g = smoothstep(0.1, 0.4, x) * smoothstep(0.7, 0.4, x);
      c.b = smoothstep(0.4, 0.7, x) * smoothstep(1.0, 0.7, x);
      return c;
  }

  mat2 rotate2d(float angle) {
      return mat2(cos(angle), -sin(angle), sin(angle), cos(angle));
  }

  void main() {
      vec4 tex = texture2D(tDiffuse, vUv);
      vec3 viewDir = normalize(vViewPosition);
      float fresnel = dot(viewDir, vNormal);
      vec3 totalHolo = vec3(0.0);
      float totalShine = 0.0;

      for(int i = 0; i < MAX_LAYERS; i++) {
          if (i >= uLayerCount) break;
          float colorDist = distance(tex.rgb, uTargetColors[i]);
          float mask = 1.0 - smoothstep(uSensitivities[i], uSensitivities[i] + uTolerances[i], colorDist);
          float drawnMask = 1.0;
          if (i == 0) drawnMask = texture2D(uDrawMask0, vUv).r;
          else if (i == 1) drawnMask = texture2D(uDrawMask1, vUv).r;
          else if (i == 2) drawnMask = texture2D(uDrawMask2, vUv).r;
          else if (i == 3) drawnMask = texture2D(uDrawMask3, vUv).r;
          else if (i == 4) drawnMask = texture2D(uDrawMask4, vUv).r;

          mask *= drawnMask;

          if (uShowMask && i == uActiveLayer) {
              vec3 oppositeColor = vec3(1.0) - uTargetColors[i];
              gl_FragColor = vec4(mix(tex.rgb, oppositeColor, mask), 1.0);
              return;
          }

          if (!uLayerEnabled[i]) continue;

          int mode = uFoilModes[i];
          float speed = uFoilSpeeds[i];
          float t = uTime * speed;
          vec2 rotatedUv = rotate2d(uFoilAngles[i]) * vUv;
          vec3 rainbow = vec3(0.0);

          if (mode == 2) {
              float e1 = sin(rotatedUv.x * uFoilScales[i] * 8.0 + t * 15.0);
              float e2 = cos(rotatedUv.y * uFoilScales[i] * 8.0 - t * 12.0);
              float elec = pow(max(0.0, sin(e1 + e2)), 15.0);
              rainbow = uFoilColors[i] * elec * 5.0;
          } else {
              float noise = sin(rotatedUv.x * uFoilScales[i] + rotatedUv.y * uFoilScales[i] + (1.0 - fresnel) * 4.0 + t * 0.4) * 0.5 + 0.5;
              rainbow = spectral(noise) * uFoilColors[i];
          }

          if (mode == 1) {
              mask *= (sin(t * 3.0) * 0.5 + 0.5);
          } else if (mode == 3) {
              float inner = 1.0 - smoothstep(max(0.0, uSensitivities[i] - 0.05), uSensitivities[i], colorDist);
              mask = max(0.0, mask - inner) * drawnMask;
          }

          totalHolo += rainbow * uHoloIntensities[i] * mask * (1.1 - fresnel);
          totalShine += pow(1.0 - fresnel, 5.0) * 0.4 * uHoloIntensities[i] * mask;
      }
      gl_FragColor = vec4(tex.rgb + totalHolo + totalShine, 1.0);
  }
\`;
`);

content = content.replace("vertexShader: document.getElementById('vertexShader').textContent", "vertexShader: vertexShaderStr");
content = content.replace("fragmentShader: document.getElementById('fragmentShader').textContent", "fragmentShader: fragmentShaderStr");

fs.writeFileSync(file, content);
