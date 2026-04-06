/**
 * Shared Vertex and Fragment Shaders for Holographic Foil Effects
 * Used in both HoloEffectCanvas.vue (Game) and FoilEditorView.vue (Admin)
 **/

export const vertexShaderStr = `
  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vViewPosition;
  varying vec3 vWorldPosition;
  void main() {
      vUv = uv;
      vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
      vNormal = normalize(normalMatrix * normal);
      vViewPosition = -mvPosition.xyz;
      vWorldPosition = (modelMatrix * vec4(position, 1.0)).xyz;
      gl_Position = projectionMatrix * mvPosition;
  }
`;

export const fragmentShaderStr = `
  #define MAX_LAYERS 5
  uniform sampler2D tDiffuse;
  uniform sampler2D uDrawMask0;
  uniform sampler2D uDrawMask1;
  uniform sampler2D uDrawMask2;
  uniform sampler2D uDrawMask3;
  uniform sampler2D uDrawMask4;
  uniform int uLayerCount;
  uniform int uActiveLayer; // Used for editor preview
  uniform bool uShowMask;   // Used for editor painting
  uniform float uTime;
  uniform vec2 uTilt;
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

  float random(vec2 st) {
      return fract(sin(dot(st.xy, vec2(12.9898,78.233))) * 43758.5453123);
  }

  void main() {
      vec4 tex = texture2D(tDiffuse, vUv);
      vec3 viewDir = normalize(vViewPosition);
      
      // Artificial tilt boost for glare
      vec3 modifiedNormal = normalize(vNormal + vec3(uTilt.x * 0.5, uTilt.y * 0.5, 0.0));
      float fresnel = dot(viewDir, modifiedNormal);
      
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

          // SPECIAL EDITOR MASK MODE (Only if uShowMask is true and i is uActiveLayer)
          if (uShowMask && i == uActiveLayer) {
              vec3 targetColor = uTargetColors[i];
              vec3 oppositeColor = vec3(1.0) - targetColor;
              float stripe = step(0.5, fract((vUv.x + vUv.y) * 20.0));
              vec3 maskColor = mix(oppositeColor, targetColor, stripe);
              gl_FragColor = vec4(mix(tex.rgb, maskColor, mask * 0.8), 1.0);
              return;
          }

          if (!uLayerEnabled[i]) continue;

          int mode = uFoilModes[i];
          float speed = uFoilSpeeds[i];
          float t = uTime * speed;
          
          // Add tilt shift to UV for motion
          vec2 shiftedUv = vUv + uTilt * 0.1;
          vec2 rotatedUv = rotate2d(uFoilAngles[i]) * shiftedUv;
          
          vec3 rainbow = vec3(0.0);

          if (mode == 2) {
              float e1 = sin(rotatedUv.x * uFoilScales[i] * 8.0 + t * 15.0);
              float e2 = cos(rotatedUv.y * uFoilScales[i] * 8.0 - t * 12.0);
              float elec = pow(max(0.0, sin(e1 + e2)), 15.0);
              rainbow = uFoilColors[i] * elec * 5.0;
          } else if (mode == 4) {
              vec2 gv = fract(rotatedUv * uFoilScales[i] * 5.0 + vec2(0.0, -t * 2.0)) - 0.5;
              vec2 id = floor(rotatedUv * uFoilScales[i] * 5.0 + vec2(0.0, -t * 2.0));
              float rand = fract(sin(dot(id, vec2(12.9898, 78.233))) * 43758.5453);
              gv.x += sin(t * 3.0 + rand * 10.0) * 0.2;

              float d = length(gv);
              float bubbleRadius = 0.3 + rand * 0.2;
              float bubbleEdge = smoothstep(bubbleRadius, bubbleRadius - 0.05, d) - smoothstep(bubbleRadius - 0.05, bubbleRadius - 0.1, d);
              float bubbleHighlight = smoothstep(bubbleRadius - 0.1, bubbleRadius - 0.2, d) * smoothstep(0.1, -0.1, gv.y + gv.x);

              rainbow = uFoilColors[i] * (bubbleEdge + bubbleHighlight * 0.5);
          } else {
              float noise = sin(rotatedUv.x * uFoilScales[i] + rotatedUv.y * uFoilScales[i] + (1.0 - fresnel) * 4.0 + t * 0.4) * 0.5 + 0.5;
              rainbow = spectral(noise) * uFoilColors[i];
          }

          // Add procedural grain/texture
          float grainP = random(vUv * (100.0 + uFoilScales[i] * 10.0) + uTime * 0.05);
          rainbow *= (0.7 + grainP * 0.6); 

          if (mode == 1) {
              mask *= (sin(t * 3.0) * 0.5 + 0.5);
          } else if (mode == 3) {
              float inner = 1.0 - smoothstep(max(0.0, uSensitivities[i] - 0.05), uSensitivities[i], colorDist);
              mask = max(0.0, mask - inner) * drawnMask;
          }

          if (mode == 4) {
             totalHolo += rainbow * uHoloIntensities[i] * mask;
             totalShine += pow(1.0 - fresnel, 5.0) * 0.2 * uHoloIntensities[i] * mask;
          } else {
             totalHolo += rainbow * uHoloIntensities[i] * mask * (1.1 - fresnel);
             totalShine += pow(1.0 - fresnel, 5.0) * 0.4 * uHoloIntensities[i] * mask;
          }
      }
      gl_FragColor = vec4(tex.rgb + totalHolo + totalShine, 1.0);
  }
`;
