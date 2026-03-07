/**
 * SeededNoise -- deterministic Perlin noise utilities for terrain generation.
 *
 * Implements: Perlin noise, fBm, ridged multifractal, domain warping.
 * All seeded from worldSeed -- same seed+coords always produce same value.
 *
 * Used by terrain generation (GAME_SPEC.md §31.1):
 *   "Heightmap: AdvancedSeededNoise (Perlin + fBm + ridged multifractal + domain warping)"
 */

import { createRNG } from "@/game/utils/seedRNG";

// ─── Permutation Table ────────────────────────────────────────────────────────

/**
 * Build a seeded 512-entry permutation table (classic Perlin approach).
 * Fisher-Yates shuffle driven by the Mulberry32 PRNG from seedRNG.
 */
function buildPerm(seed: number): Uint8Array {
  const rng = createRNG(seed);
  const p = new Uint8Array(256);
  for (let i = 0; i < 256; i++) p[i] = i;
  for (let i = 255; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    const tmp = p[i];
    p[i] = p[j];
    p[j] = tmp;
  }
  // Double to avoid wrapping modulo in lookup
  const perm = new Uint8Array(512);
  for (let i = 0; i < 512; i++) perm[i] = p[i & 255];
  return perm;
}

// ─── Gradient helpers ─────────────────────────────────────────────────────────

/** 8 evenly-spaced 2D gradient vectors */
const GRAD2: [number, number][] = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
  [1, 1],
  [-1, 1],
  [1, -1],
  [-1, -1],
];

function grad2(hash: number, x: number, y: number): number {
  const g = GRAD2[hash & 7];
  return g[0] * x + g[1] * y;
}

/** Quintic smoothstep -- C2 continuous, eliminates interpolation artifacts */
function fade(t: number): number {
  return t * t * t * (t * (t * 6 - 15) + 10);
}

function lerp(a: number, b: number, t: number): number {
  return a + t * (b - a);
}

// ─── SeededNoise ──────────────────────────────────────────────────────────────

export class SeededNoise {
  private perm: Uint8Array;

  constructor(worldSeed: number) {
    this.perm = buildPerm(worldSeed);
  }

  /**
   * Classic 2D Perlin noise.
   * Returns a value in approximately [-1, 1].
   * Same worldSeed + (x, y) always returns the same value.
   */
  perlin(x: number, y: number): number {
    const perm = this.perm;
    const xi = Math.floor(x) & 255;
    const yi = Math.floor(y) & 255;
    const xf = x - Math.floor(x);
    const yf = y - Math.floor(y);
    const u = fade(xf);
    const v = fade(yf);

    const aa = perm[perm[xi] + yi];
    const ab = perm[perm[xi] + yi + 1];
    const ba = perm[perm[xi + 1] + yi];
    const bb = perm[perm[xi + 1] + yi + 1];

    return lerp(
      lerp(grad2(aa, xf, yf), grad2(ba, xf - 1, yf), u),
      lerp(grad2(ab, xf, yf - 1), grad2(bb, xf - 1, yf - 1), u),
      v,
    );
  }

  /**
   * Fractional Brownian Motion -- sums `octaves` Perlin layers.
   * Returns in approximately [-1, 1] (normalized by amplitude sum).
   *
   * @param octaves    Number of noise layers (default 6)
   * @param lacunarity Frequency multiplier per octave (default 2.0)
   * @param gain       Amplitude multiplier per octave (default 0.5)
   */
  fbm(x: number, y: number, octaves = 6, lacunarity = 2.0, gain = 0.5): number {
    let value = 0;
    let amplitude = 1;
    let frequency = 1;
    let maxValue = 0;

    for (let i = 0; i < octaves; i++) {
      value += this.perlin(x * frequency, y * frequency) * amplitude;
      maxValue += amplitude;
      amplitude *= gain;
      frequency *= lacunarity;
    }

    return value / maxValue;
  }

  /**
   * Ridged multifractal -- like fBm but inverted absolute value creates sharp ridges.
   * Returns in approximately [0, 1] (ridges near 1, valleys near 0).
   *
   * @param octaves    Number of noise layers (default 6)
   * @param lacunarity Frequency multiplier per octave (default 2.0)
   * @param gain       Amplitude multiplier per octave (default 0.5)
   */
  ridged(x: number, y: number, octaves = 6, lacunarity = 2.0, gain = 0.5): number {
    let value = 0;
    let amplitude = 1;
    let frequency = 1;
    let maxValue = 0;
    let weight = 1;

    for (let i = 0; i < octaves; i++) {
      const signal = 1 - Math.abs(this.perlin(x * frequency, y * frequency));
      const weighted = signal * signal * weight;
      value += weighted * amplitude;
      maxValue += amplitude;
      // Weight next octave by signal -- suppresses flat areas, sharpens ridges
      weight = Math.min(1, Math.max(0, signal * 2));
      amplitude *= gain;
      frequency *= lacunarity;
    }

    return value / maxValue;
  }

  /**
   * Domain warping -- evaluates fBm at coordinates warped by another fBm pass.
   * Produces swirled, turbulent terrain (Inigo Quilez technique).
   * Returns in approximately [-1, 1].
   *
   * @param warpStrength How far coordinates are displaced (default 1.0)
   * @param octaves      Octaves for both warp pass and result pass (default 4)
   */
  domainWarp(x: number, y: number, warpStrength = 1.0, octaves = 4): number {
    // Offset the Y warp sample to break axis symmetry
    const wx = this.fbm(x, y, octaves) * warpStrength;
    const wy = this.fbm(x + 5.2, y + 1.3, octaves) * warpStrength;
    return this.fbm(x + wx, y + wy, octaves);
  }
}
