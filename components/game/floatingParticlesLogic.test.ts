/**
 * Tests for FloatingParticles weather particle pure logic functions.
 * See GAME_SPEC.md §36 (Particle Emitter Effects).
 */

import {
  computeDisplayParticleCount,
  computeParticleOpacity,
  computeWindDrift,
  MAX_DISPLAY_WEATHER_PARTICLES,
} from "./floatingParticlesLogic.ts";

describe("FloatingParticles weather logic (Spec §36)", () => {
  describe("computeWindDrift", () => {
    it("returns 0 for no lateral wind (x=0)", () => {
      expect(computeWindDrift([0, -1], 1.0, 375)).toBe(0);
    });

    it("returns positive drift for rightward wind (x=1)", () => {
      expect(computeWindDrift([1, 0], 1.0, 375)).toBeGreaterThan(0);
    });

    it("returns negative drift for leftward wind (x=-1)", () => {
      expect(computeWindDrift([-1, 0], 1.0, 375)).toBeLessThan(0);
    });

    it("scales with wind speed", () => {
      const fast = computeWindDrift([1, 0], 2.0, 375);
      const slow = computeWindDrift([1, 0], 0.5, 375);
      expect(fast).toBeGreaterThan(slow);
    });

    it("scales with screen width", () => {
      const wide = computeWindDrift([1, 0], 1.0, 750);
      const narrow = computeWindDrift([1, 0], 1.0, 375);
      expect(wide).toBeGreaterThan(narrow);
    });

    it("is symmetric: opposite x gives opposite drift", () => {
      const right = computeWindDrift([0.5, 0], 1.0, 375);
      const left = computeWindDrift([-0.5, 0], 1.0, 375);
      expect(right).toBeCloseTo(-left);
    });
  });

  describe("computeDisplayParticleCount", () => {
    it("returns 0 at intensity=0", () => {
      expect(computeDisplayParticleCount({ maxParticles: 500 }, 0)).toBe(0);
    });

    it("caps at maxDisplay (default MAX_DISPLAY_WEATHER_PARTICLES)", () => {
      expect(computeDisplayParticleCount({ maxParticles: 500 }, 1.0)).toBe(
        MAX_DISPLAY_WEATHER_PARTICLES,
      );
    });

    it("caps at custom maxDisplay", () => {
      expect(computeDisplayParticleCount({ maxParticles: 500 }, 1.0, 15)).toBe(15);
    });

    it("scales with intensity when below the cap", () => {
      const full = computeDisplayParticleCount({ maxParticles: 20 }, 1.0, 30);
      const half = computeDisplayParticleCount({ maxParticles: 20 }, 0.5, 30);
      expect(half).toBeLessThan(full);
    });

    it("never returns negative", () => {
      expect(computeDisplayParticleCount({ maxParticles: 100 }, -1)).toBe(0);
    });
  });

  describe("computeParticleOpacity", () => {
    it("returns 0 at lifecycle progress=0", () => {
      expect(computeParticleOpacity(0, 0.8)).toBe(0);
    });

    it("returns 0 for negative progress", () => {
      expect(computeParticleOpacity(-0.1, 0.8)).toBe(0);
    });

    it("fades in linearly over the first 20% of lifetime", () => {
      expect(computeParticleOpacity(0.1, 1.0)).toBeCloseTo(0.5, 1);
      expect(computeParticleOpacity(0.2, 1.0)).toBeCloseTo(1.0, 1);
    });

    it("holds full opacity between 20% and 70%", () => {
      expect(computeParticleOpacity(0.5, 0.8)).toBeCloseTo(0.8, 5);
    });

    it("fades out over the last 30% of lifetime", () => {
      expect(computeParticleOpacity(0.7, 1.0)).toBeCloseTo(1.0, 1);
      expect(computeParticleOpacity(1.0, 1.0)).toBeCloseTo(0.0, 1);
    });

    it("scales peak opacity with baseOpacity", () => {
      const high = computeParticleOpacity(0.5, 1.0);
      const low = computeParticleOpacity(0.5, 0.5);
      expect(high).toBeGreaterThan(low);
    });
  });
});
