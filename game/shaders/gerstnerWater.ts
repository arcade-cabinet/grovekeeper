/**
 * Gerstner wave ShaderMaterial for R3F water bodies (Spec §31.2).
 *
 * Implements Gerstner wave vertex displacement:
 *   P'x += D.x * steepness * amplitude * cos(dot(D, P.xz) * k + time * speed)
 *   P'z += D.y * steepness * amplitude * cos(dot(D, P.xz) * k + time * speed)
 *   P'y += amplitude * sin(dot(D, P.xz) * k + time * speed)
 *
 * Usage:
 *   const mat = createGerstnerMaterial(waterBodyComponent);
 *   // In useFrame: updateGerstnerTime(mat, clock.elapsedTime);
 *
 * See GAME_SPEC.md §31.2.
 */

import * as THREE from "three";

import type {
  GerstnerWaveLayer,
  WaterBodyComponent,
} from "@/game/ecs/components/procedural/water";

/** Maximum Gerstner wave layers the shader supports. Unused slots are zero-padded. */
export const MAX_WAVE_LAYERS = 8;

// ─── GLSL Shaders ─────────────────────────────────────────────────────────────

/**
 * Vertex shader: applies per-layer Gerstner displacement to each vertex.
 * Unused layers (amplitude = 0) contribute nothing to displacement.
 * Computes vFoam = steepness-weighted crest indicator passed to fragment.
 */
export const GERSTNER_VERTEX_SHADER = `
  uniform float uTime;
  uniform float uAmplitude[${MAX_WAVE_LAYERS}];
  uniform float uWavelength[${MAX_WAVE_LAYERS}];
  uniform float uSpeed[${MAX_WAVE_LAYERS}];
  uniform float uSteepness[${MAX_WAVE_LAYERS}];
  uniform vec2 uDirection[${MAX_WAVE_LAYERS}];

  varying vec2 vUv;
  varying float vFoam;

  const float TWO_PI = 6.283185307;

  void main() {
    vUv = uv;
    vec3 pos = position;
    float foam = 0.0;

    for (int i = 0; i < ${MAX_WAVE_LAYERS}; i++) {
      float k = TWO_PI / uWavelength[i];
      float phase = dot(uDirection[i], pos.xz) * k + uTime * uSpeed[i];
      float cosP = cos(phase);
      float sinP = sin(phase);

      pos.x += uDirection[i].x * uSteepness[i] * uAmplitude[i] * cosP;
      pos.z += uDirection[i].y * uSteepness[i] * uAmplitude[i] * cosP;
      pos.y += uAmplitude[i] * sinP;

      // Accumulate foam indicator at wave crests (positive sinP = upswing)
      foam += uSteepness[i] * max(0.0, sinP);
    }

    vFoam = foam;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
  }
`;

/**
 * Fragment shader: applies water color with optional foam blend at crests.
 * Foam appears where vFoam exceeds uFoamThreshold (blends toward white).
 */
export const GERSTNER_FRAGMENT_SHADER = `
  uniform vec3 uWaterColor;
  uniform float uOpacity;
  uniform bool uFoamEnabled;
  uniform float uFoamThreshold;

  varying vec2 vUv;
  varying float vFoam;

  void main() {
    vec3 color = uWaterColor;

    if (uFoamEnabled && vFoam > uFoamThreshold) {
      float foamBlend = clamp((vFoam - uFoamThreshold) / 0.4, 0.0, 1.0);
      color = mix(color, vec3(1.0), foamBlend);
    }

    gl_FragColor = vec4(color, uOpacity);
  }
`;

// ─── Uniform Types ─────────────────────────────────────────────────────────────

/** Typed uniform map for a Gerstner water ShaderMaterial. */
export interface GerstnerUniformMap {
  uTime: { value: number };
  uWaterColor: { value: THREE.Color };
  uOpacity: { value: number };
  uFoamEnabled: { value: boolean };
  uFoamThreshold: { value: number };
  uWaveCount: { value: number };
  uAmplitude: { value: number[] };
  uWavelength: { value: number[] };
  uSpeed: { value: number[] };
  uSteepness: { value: number[] };
  uDirection: { value: THREE.Vector2[] };
}

// ─── Pure Factory Functions ────────────────────────────────────────────────────

/**
 * Build Gerstner shader uniforms from a WaterBodyComponent.
 *
 * Pure function — exported as a testable seam.
 * Pads arrays to MAX_WAVE_LAYERS: unused slots have amplitude=0 (no displacement).
 * Wavelength defaults to 1 to avoid division-by-zero in the shader.
 */
export function buildGerstnerUniforms(waterBody: WaterBodyComponent): GerstnerUniformMap {
  const count = Math.min(waterBody.waveLayers.length, MAX_WAVE_LAYERS);

  const amplitude = new Array<number>(MAX_WAVE_LAYERS).fill(0);
  const wavelength = new Array<number>(MAX_WAVE_LAYERS).fill(1);
  const speed = new Array<number>(MAX_WAVE_LAYERS).fill(0);
  const steepness = new Array<number>(MAX_WAVE_LAYERS).fill(0);
  const direction: THREE.Vector2[] = Array.from(
    { length: MAX_WAVE_LAYERS },
    () => new THREE.Vector2(1, 0),
  );

  for (let i = 0; i < count; i++) {
    const layer: GerstnerWaveLayer = waterBody.waveLayers[i];
    amplitude[i] = layer.amplitude;
    wavelength[i] = layer.wavelength;
    speed[i] = layer.speed;
    steepness[i] = layer.steepness;
    direction[i] = new THREE.Vector2(layer.direction[0], layer.direction[1]);
  }

  return {
    uTime: { value: 0 },
    uWaterColor: { value: new THREE.Color(waterBody.color) },
    uOpacity: { value: waterBody.opacity },
    uFoamEnabled: { value: waterBody.foamEnabled },
    uFoamThreshold: { value: waterBody.foamThreshold },
    uWaveCount: { value: count },
    uAmplitude: { value: amplitude },
    uWavelength: { value: wavelength },
    uSpeed: { value: speed },
    uSteepness: { value: steepness },
    uDirection: { value: direction },
  };
}

/**
 * Create a Gerstner wave ShaderMaterial from a WaterBodyComponent.
 *
 * The returned material is transparent + double-sided (for planar water planes).
 * Call `updateGerstnerTime(mat, clock.elapsedTime)` each frame from useFrame.
 */
export function createGerstnerMaterial(waterBody: WaterBodyComponent): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    vertexShader: GERSTNER_VERTEX_SHADER,
    fragmentShader: GERSTNER_FRAGMENT_SHADER,
    uniforms: buildGerstnerUniforms(waterBody) as unknown as {
      [uniform: string]: THREE.IUniform;
    },
    transparent: true,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
}

/**
 * Update the time uniform on a Gerstner material — call from useFrame.
 *
 * @param material  The ShaderMaterial returned by createGerstnerMaterial.
 * @param time      Elapsed time in seconds (e.g. three.Clock.elapsedTime).
 */
export function updateGerstnerTime(material: THREE.ShaderMaterial, time: number): void {
  material.uniforms.uTime.value = time;
}

// ─── Caustics ─────────────────────────────────────────────────────────────────

/**
 * UV scale for caustic pattern sampling (spec §31.2: scale 0.5).
 * Smaller values = larger/coarser patterns.
 */
export const CAUSTICS_UV_SCALE = 0.5;

/**
 * Animation speed for caustic pattern (spec §31.2: speed 0.8).
 */
export const CAUSTICS_SPEED = 0.8;

/**
 * Caustic vertex shader — minimal passthrough that forwards UV to fragment.
 */
export const CAUSTICS_VERTEX_SHADER = `
  varying vec2 vUv;

  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

/**
 * Caustic fragment shader — two-layer sine interference pattern.
 *
 * Two offset sine waves scrolled in different directions produce an
 * animated refractive caustic appearance. Output is white light with
 * caustic intensity as alpha — intended for AdditiveBlending.
 */
export const CAUSTICS_FRAGMENT_SHADER = `
  uniform float uTime;
  uniform float uCausticsScale;
  uniform float uCausticsSpeed;

  varying vec2 vUv;

  void main() {
    vec2 uv = vUv * uCausticsScale * 8.0;
    float t = uTime * uCausticsSpeed;

    // Layer A: diagonal scroll
    float a = sin(uv.x + t) * sin(uv.y - t * 0.7);
    // Layer B: counter-scroll at slightly different frequency
    float b = sin(uv.x * 1.3 - t * 0.6 + 1.5) * sin(uv.y * 0.9 + t * 0.5);

    float caustic = max(0.0, (a + b) * 0.5);
    caustic = caustic * caustic; // sharpen the bright rings

    // AdditiveBlending: src_alpha * src_rgb is added to dest
    gl_FragColor = vec4(1.0, 1.0, 1.0, caustic * 0.35);
  }
`;

/**
 * Create an additive caustic ShaderMaterial from a WaterBodyComponent.
 *
 * The caustic plane is rendered with AdditiveBlending so the bright
 * pattern appears to project light onto the terrain below.
 * Call `updateCausticsTime(mat, clock.elapsedTime)` each frame.
 */
export function createCausticsMaterial(): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    vertexShader: CAUSTICS_VERTEX_SHADER,
    fragmentShader: CAUSTICS_FRAGMENT_SHADER,
    uniforms: {
      uTime: { value: 0 },
      uCausticsScale: { value: CAUSTICS_UV_SCALE },
      uCausticsSpeed: { value: CAUSTICS_SPEED },
    },
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
}

/**
 * Update the time uniform on a caustics material — call from useFrame.
 *
 * @param material  The ShaderMaterial returned by createCausticsMaterial.
 * @param time      Elapsed time in seconds.
 */
export function updateCausticsTime(material: THREE.ShaderMaterial, time: number): void {
  material.uniforms.uTime.value = time;
}
