/**
 * Tests for computeHeadBob pure function (Spec §9).
 *
 * Head bob adds a subtle vertical oscillation to the FPS camera
 * when the player is moving, for embodied locomotion feel.
 */

import { computeHeadBob } from "./headBob.ts";

describe("computeHeadBob (Spec §9)", () => {
  it("returns 0 when speed is below threshold (0.1)", () => {
    expect(computeHeadBob(1.0, 0.0)).toBe(0);
    expect(computeHeadBob(1.0, 0.05)).toBe(0);
    expect(computeHeadBob(1.0, 0.1)).toBe(0);
  });

  it("returns non-zero when speed exceeds threshold", () => {
    // At arbitrary elapsed time with speed > 0.1, bob should produce a value
    const result = computeHeadBob(0.25, 1.0);
    expect(result).not.toBe(0);
  });

  it("produces output bounded by [-amplitude, +amplitude] (0.02m)", () => {
    // Sample many time values to verify bounds
    for (let t = 0; t < 10; t += 0.01) {
      const bob = computeHeadBob(t, 1.0);
      expect(bob).toBeGreaterThanOrEqual(-0.02);
      expect(bob).toBeLessThanOrEqual(0.02);
    }
  });

  it("oscillates at 8 Hz (period = 0.125s)", () => {
    const speed = 1.0;
    // sin(2 * PI * 8 * t) has period 0.125s
    // At t = 0, sin = 0
    const atZero = computeHeadBob(0, speed);
    expect(atZero).toBeCloseTo(0, 5);

    // At t = 1/(8*4) = 0.03125 (quarter period), sin = 1 → amplitude
    const atQuarter = computeHeadBob(0.03125, speed);
    expect(atQuarter).toBeCloseTo(0.02, 5);

    // At t = 0.0625 (half period), sin = 0
    const atHalf = computeHeadBob(0.0625, speed);
    expect(atHalf).toBeCloseTo(0, 5);

    // At t = 0.09375 (three-quarter period), sin = -1 → -amplitude
    const atThreeQuarter = computeHeadBob(0.09375, speed);
    expect(atThreeQuarter).toBeCloseTo(-0.02, 5);
  });

  it("returns 0 at elapsed time 0 regardless of speed", () => {
    // sin(0) = 0
    expect(computeHeadBob(0, 5.0)).toBe(0);
    expect(computeHeadBob(0, 100.0)).toBe(0);
  });

  it("handles very large elapsed times without NaN", () => {
    const result = computeHeadBob(999999, 1.0);
    expect(Number.isFinite(result)).toBe(true);
    expect(Math.abs(result)).toBeLessThanOrEqual(0.02);
  });
});
