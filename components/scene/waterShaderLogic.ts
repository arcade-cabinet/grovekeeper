/**
 * Wind Waker-style water shader logic (Spec §31.2).
 *
 * Pure functions for Gerstner wave computation and ShaderMaterial
 * construction. Bright teal/blue palette with foam edges -- styled
 * after Wind Waker's cel-shaded ocean rather than realistic PBR water.
 *
 * The vertex shader displaces vertices with Gerstner waves.
 * The fragment shader blends shallow/deep colors with foam highlights.
 */

import { Color, DoubleSide, type IUniform, ShaderMaterial, Vector2 } from "three";
import proceduralConfig from "@/config/game/procedural.json" with { type: "json" };
import type { GerstnerWaveLayer } from "@/game/ecs/components/procedural/water";

/** Maximum wave layers the shader supports. Unused slots are zero-padded. */
const MAX_LAYERS = 8;

const TWO_PI = Math.PI * 2;

// Default Wind Waker-style colors from procedural.json
const DEFAULT_SHALLOW = "#5dade2";
const DEFAULT_DEEP = "#2e86ab";
const DEFAULT_FOAM = proceduralConfig.water.foamColor;
const DEFAULT_FOAM_THRESHOLD = proceduralConfig.water.foamThreshold;
const DEFAULT_OPACITY = 0.85;

// ─── Pure Wave Computation ────────────────────────────────────────────────────

export interface GerstnerDisplacement {
  dx: number;
  dy: number;
  dz: number;
  foam: number;
}

/**
 * Compute Gerstner wave displacement at a world position and time.
 *
 * Pure function — no Three.js dependencies. Exported for unit testing.
 * Matches the GLSL vertex shader logic exactly so JS-side height queries
 * (e.g. splash particles, buoyancy) return identical values.
 */
export function computeGerstnerDisplacement(
  x: number,
  z: number,
  time: number,
  waves: GerstnerWaveLayer[],
): GerstnerDisplacement {
  let dx = 0;
  let dy = 0;
  let dz = 0;
  let foam = 0;

  for (const wave of waves) {
    const k = TWO_PI / wave.wavelength;
    const phase = (wave.direction[0] * x + wave.direction[1] * z) * k + time * wave.speed;
    const cosP = Math.cos(phase);
    const sinP = Math.sin(phase);

    dx += wave.direction[0] * wave.steepness * wave.amplitude * cosP;
    dz += wave.direction[1] * wave.steepness * wave.amplitude * cosP;
    dy += wave.amplitude * sinP;

    foam += wave.steepness * Math.max(0, sinP);
  }

  return { dx, dy, dz, foam };
}

// ─── GLSL Shaders ─────────────────────────────────────────────────────────────

/**
 * Vertex shader: Gerstner wave displacement with vWorldPos + vFoam outputs.
 * Same displacement formula as computeGerstnerDisplacement above.
 */
export const WIND_WAKER_VERTEX_SHADER = `
  uniform float uTime;
  uniform float uAmplitude[${MAX_LAYERS}];
  uniform float uWavelength[${MAX_LAYERS}];
  uniform float uSpeed[${MAX_LAYERS}];
  uniform float uSteepness[${MAX_LAYERS}];
  uniform vec2 uDirection[${MAX_LAYERS}];

  varying vec2 vUv;
  varying float vFoam;
  varying vec3 vWorldPos;

  const float TWO_PI = 6.283185307;

  void main() {
    vUv = uv;
    vec3 pos = position;
    float foam = 0.0;

    for (int i = 0; i < ${MAX_LAYERS}; i++) {
      float k = TWO_PI / uWavelength[i];
      float phase = dot(uDirection[i], pos.xz) * k + uTime * uSpeed[i];
      float cosP = cos(phase);
      float sinP = sin(phase);

      pos.x += uDirection[i].x * uSteepness[i] * uAmplitude[i] * cosP;
      pos.z += uDirection[i].y * uSteepness[i] * uAmplitude[i] * cosP;
      pos.y += uAmplitude[i] * sinP;

      foam += uSteepness[i] * max(0.0, sinP);
    }

    vFoam = foam;
    vWorldPos = (modelMatrix * vec4(pos, 1.0)).xyz;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
  }
`;

/**
 * Fragment shader: Wind Waker-style cel-shaded water.
 *
 * Blends shallow (bright teal) and deep (darker blue) colors based on
 * a world-space pattern. Adds white foam at wave crests. Applies
 * a subtle edge highlight for the cel-shaded look.
 */
export const WIND_WAKER_FRAGMENT_SHADER = `
  uniform vec3 uShallowColor;
  uniform vec3 uDeepColor;
  uniform vec3 uFoamColor;
  uniform float uFoamThreshold;
  uniform float uOpacity;
  uniform float uTime;

  varying vec2 vUv;
  varying float vFoam;
  varying vec3 vWorldPos;

  void main() {
    // Blend shallow/deep based on world-space sine pattern (Wind Waker banding)
    float depthFactor = sin(vWorldPos.x * 0.3 + vWorldPos.z * 0.2 + uTime * 0.4) * 0.5 + 0.5;
    // Quantize to 3 bands for cel-shaded look
    depthFactor = floor(depthFactor * 3.0) / 3.0;

    vec3 color = mix(uShallowColor, uDeepColor, depthFactor);

    // Foam at wave crests
    if (vFoam > uFoamThreshold) {
      float foamBlend = clamp((vFoam - uFoamThreshold) / 0.3, 0.0, 1.0);
      // Quantize foam for cel-shaded bands
      foamBlend = step(0.3, foamBlend);
      color = mix(color, uFoamColor, foamBlend * 0.7);
    }

    // Subtle specular highlight at wave peaks for sparkle
    float sparkle = pow(max(0.0, sin(vWorldPos.x * 2.0 + uTime * 1.5) *
                                 sin(vWorldPos.z * 2.0 - uTime * 1.2)), 8.0);
    color += vec3(1.0) * sparkle * 0.15;

    gl_FragColor = vec4(color, uOpacity);
  }
`;

// ─── Uniform Types ────────────────────────────────────────────────────────────

export interface WindWakerUniformMap {
  uTime: { value: number };
  uShallowColor: { value: Color };
  uDeepColor: { value: Color };
  uFoamColor: { value: Color };
  uFoamThreshold: { value: number };
  uOpacity: { value: number };
  uAmplitude: { value: number[] };
  uWavelength: { value: number[] };
  uSpeed: { value: number[] };
  uSteepness: { value: number[] };
  uDirection: { value: Vector2[] };
}

export interface WindWakerColorOptions {
  shallowColor?: string;
  deepColor?: string;
  foamColor?: string;
  foamThreshold?: number;
  opacity?: number;
}

// ─── Factory Functions ────────────────────────────────────────────────────────

/**
 * Build shader uniforms for Wind Waker water from wave layers + color options.
 * Pure function — exported for testing.
 */
export function buildWindWakerUniforms(
  waves: GerstnerWaveLayer[],
  options?: WindWakerColorOptions,
): WindWakerUniformMap {
  const count = Math.min(waves.length, MAX_LAYERS);

  const amplitude = new Array<number>(MAX_LAYERS).fill(0);
  const wavelength = new Array<number>(MAX_LAYERS).fill(1);
  const speed = new Array<number>(MAX_LAYERS).fill(0);
  const steepness = new Array<number>(MAX_LAYERS).fill(0);
  const direction: Vector2[] = Array.from({ length: MAX_LAYERS }, () => new Vector2(1, 0));

  for (let i = 0; i < count; i++) {
    const layer = waves[i];
    amplitude[i] = layer.amplitude;
    wavelength[i] = layer.wavelength;
    speed[i] = layer.speed;
    steepness[i] = layer.steepness;
    direction[i] = new Vector2(layer.direction[0], layer.direction[1]);
  }

  return {
    uTime: { value: 0 },
    uShallowColor: { value: new Color(options?.shallowColor ?? DEFAULT_SHALLOW) },
    uDeepColor: { value: new Color(options?.deepColor ?? DEFAULT_DEEP) },
    uFoamColor: { value: new Color(options?.foamColor ?? DEFAULT_FOAM) },
    uFoamThreshold: { value: options?.foamThreshold ?? DEFAULT_FOAM_THRESHOLD },
    uOpacity: { value: options?.opacity ?? DEFAULT_OPACITY },
    uAmplitude: { value: amplitude },
    uWavelength: { value: wavelength },
    uSpeed: { value: speed },
    uSteepness: { value: steepness },
    uDirection: { value: direction },
  };
}

/**
 * Create a Wind Waker-style ShaderMaterial.
 * Call updateWindWakerTime(mat, clock.elapsedTime) each frame from useFrame.
 */
export function createWindWakerMaterial(
  waves: GerstnerWaveLayer[],
  options?: WindWakerColorOptions,
): ShaderMaterial {
  return new ShaderMaterial({
    vertexShader: WIND_WAKER_VERTEX_SHADER,
    fragmentShader: WIND_WAKER_FRAGMENT_SHADER,
    uniforms: buildWindWakerUniforms(waves, options) as unknown as {
      [uniform: string]: IUniform;
    },
    transparent: true,
    side: DoubleSide,
    depthWrite: false,
  });
}

/**
 * Update the time uniform on a Wind Waker water material.
 */
export function updateWindWakerTime(material: ShaderMaterial, time: number): void {
  material.uniforms.uTime.value = time;
}
