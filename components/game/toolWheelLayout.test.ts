/**
 * Tests for toolWheelLayout -- radial position math (Spec S11).
 */
import { computeRadialPositions } from "./toolWheelLayout.ts";

describe("computeRadialPositions (Spec S11)", () => {
  it("returns empty array for count=0", () => {
    expect(computeRadialPositions(0, 100)).toEqual([]);
  });

  it("returns single item at top for count=1", () => {
    const [pos] = computeRadialPositions(1, 100);
    // Default offset -90deg => top of circle
    expect(pos.x).toBeCloseTo(0, 5);
    expect(pos.y).toBeCloseTo(-100, 5);
  });

  it("returns 4 items at cardinal directions", () => {
    const positions = computeRadialPositions(4, 50);
    // Top (0), Right (90), Bottom (180), Left (270)
    expect(positions[0].x).toBeCloseTo(0, 5);
    expect(positions[0].y).toBeCloseTo(-50, 5);

    expect(positions[1].x).toBeCloseTo(50, 5);
    expect(positions[1].y).toBeCloseTo(0, 5);

    expect(positions[2].x).toBeCloseTo(0, 5);
    expect(positions[2].y).toBeCloseTo(50, 5);

    expect(positions[3].x).toBeCloseTo(-50, 5);
    expect(positions[3].y).toBeCloseTo(0, 5);
  });

  it("respects custom offset", () => {
    // offset 0deg => start at right (3 o'clock)
    const [pos] = computeRadialPositions(1, 100, 0);
    expect(pos.x).toBeCloseTo(100, 5);
    expect(pos.y).toBeCloseTo(0, 5);
  });

  it("angle degrees are in [0, 360)", () => {
    const positions = computeRadialPositions(8, 100);
    for (const p of positions) {
      expect(p.angleDeg).toBeGreaterThanOrEqual(0);
      expect(p.angleDeg).toBeLessThan(360);
    }
  });

  it("handles negative count gracefully", () => {
    expect(computeRadialPositions(-1, 100)).toEqual([]);
  });
});
