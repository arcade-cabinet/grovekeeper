/**
 * Tests for WeatherOverlay pure logic functions.
 * See GAME_SPEC.md §12 (Weather Visual Effects).
 */

import {
  computeDropDuration,
  computeIntensityOpacity,
  computeRainDropCount,
  computeWindAngleDeg,
  computeWindStreakCount,
} from "./weatherOverlayLogic";

describe("WeatherOverlay logic (Spec §12)", () => {
  describe("computeRainDropCount", () => {
    it("returns a positive count at full intensity", () => {
      const count = computeRainDropCount(1.0);
      expect(count).toBeGreaterThan(0);
    });

    it("scales proportionally with intensity", () => {
      const full = computeRainDropCount(1.0);
      const half = computeRainDropCount(0.5);
      expect(half).toBeLessThan(full);
    });

    it("returns at least 1 at minimum intensity", () => {
      expect(computeRainDropCount(0.01)).toBeGreaterThanOrEqual(1);
    });

    it("stays within 2D display budget (<=60)", () => {
      expect(computeRainDropCount(1.0)).toBeLessThanOrEqual(60);
    });

    it("derives from procedural.json rain particle count (500 * 0.06 = 30)", () => {
      // config rain = 500, display ratio 0.06 => 30 at full intensity
      expect(computeRainDropCount(1.0)).toBe(30);
    });
  });

  describe("computeWindStreakCount", () => {
    it("returns a positive count at full intensity", () => {
      expect(computeWindStreakCount(1.0)).toBeGreaterThan(0);
    });

    it("scales with intensity", () => {
      const full = computeWindStreakCount(1.0);
      const half = computeWindStreakCount(0.5);
      expect(half).toBeLessThanOrEqual(full);
    });

    it("derives from procedural.json dust particle count (100 * 0.08 = 8)", () => {
      // config dust = 100, display ratio 0.08 => 8 at full intensity
      expect(computeWindStreakCount(1.0)).toBe(8);
    });
  });

  describe("computeWindAngleDeg", () => {
    it("returns 0 for no lateral wind ([0, -1] = straight ahead)", () => {
      expect(computeWindAngleDeg([0, -1])).toBe(0);
    });

    it("returns positive angle for rightward wind", () => {
      expect(computeWindAngleDeg([1, 0])).toBeGreaterThan(0);
    });

    it("returns negative angle for leftward wind", () => {
      expect(computeWindAngleDeg([-1, 0])).toBeLessThan(0);
    });

    it("clamps within ±45 degrees for unit wind vectors", () => {
      expect(Math.abs(computeWindAngleDeg([1, 0]))).toBeLessThanOrEqual(45);
      expect(Math.abs(computeWindAngleDeg([-1, 0]))).toBeLessThanOrEqual(45);
    });

    it("is symmetric: opposite x gives opposite angle", () => {
      const right = computeWindAngleDeg([0.5, 0]);
      const left = computeWindAngleDeg([-0.5, 0]);
      expect(right).toBeCloseTo(-left);
    });
  });

  describe("computeIntensityOpacity", () => {
    it("returns baseOpacity at intensity=1", () => {
      expect(computeIntensityOpacity(0.7, 1.0)).toBeCloseTo(0.7);
    });

    it("returns 0 at intensity=0", () => {
      expect(computeIntensityOpacity(0.7, 0)).toBe(0);
    });

    it("scales linearly with intensity at mid values", () => {
      expect(computeIntensityOpacity(1.0, 0.5)).toBeCloseTo(0.5);
    });

    it("does not exceed base opacity at intensity > 1", () => {
      expect(computeIntensityOpacity(0.5, 1.5)).toBeCloseTo(0.5);
    });

    it("never returns negative", () => {
      expect(computeIntensityOpacity(0.5, -0.5)).toBe(0);
    });
  });

  describe("computeDropDuration", () => {
    it("returns faster duration at higher intensity", () => {
      const high = computeDropDuration(1000, 1.0);
      const low = computeDropDuration(1000, 0.5);
      expect(high).toBeLessThan(low);
    });

    it("never goes below 200ms minimum", () => {
      expect(computeDropDuration(100, 1.0)).toBeGreaterThanOrEqual(200);
      expect(computeDropDuration(50, 1.0)).toBeGreaterThanOrEqual(200);
    });

    it("at intensity=0.5 returns base duration (1x speed)", () => {
      // speedFactor = 0.5 + 0.5*0.5 = 0.75 => duration = 1000/0.75 ≈ 1333
      const result = computeDropDuration(1000, 0.5);
      expect(result).toBeCloseTo(1333, -2);
    });
  });
});
