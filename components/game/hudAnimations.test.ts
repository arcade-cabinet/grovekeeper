/**
 * Tests for hudAnimations -- HUD animation utility functions (Spec S24).
 */
import {
  distance2D,
  spiritGlowIntensity,
  staminaArcPath,
  temperatureExtreme,
} from "./hudAnimations.ts";

// -- staminaArcPath -----------------------------------------------------------

describe("staminaArcPath (Spec S24)", () => {
  it("returns empty string for fraction <= 0", () => {
    expect(staminaArcPath(50, 50, 20, 0)).toBe("");
    expect(staminaArcPath(50, 50, 20, -0.5)).toBe("");
  });

  it("returns a full circle path for fraction >= 1", () => {
    const path = staminaArcPath(50, 50, 20, 1);
    expect(path).toContain("M 50 30"); // start at top (cy - radius)
    expect(path).toContain("A 20 20");
    // Two arcs for full circle
    expect((path.match(/A /g) || []).length).toBe(2);
  });

  it("returns a single arc for partial fraction", () => {
    const path = staminaArcPath(50, 50, 20, 0.5);
    expect(path).toContain("M ");
    expect(path).toContain("A 20 20");
    // Half circle -> large arc flag = 0 (exactly 0.5 is not > 0.5)
    expect(path).toContain("0 0 1");
  });

  it("uses large arc flag for fraction > 0.5", () => {
    const path = staminaArcPath(50, 50, 20, 0.75);
    expect(path).toContain("0 1 1"); // large arc = 1
  });

  it("starts at 12 o'clock position", () => {
    const path = staminaArcPath(50, 50, 20, 0.25);
    // First point should be at top: (cx, cy - radius)
    expect(path.startsWith("M 50 30")).toBe(true);
  });
});

// -- spiritGlowIntensity -----------------------------------------------------

describe("spiritGlowIntensity (Spec S24)", () => {
  it("returns 1 for distance 0 (spirit on top of player)", () => {
    expect(spiritGlowIntensity(0)).toBe(1);
  });

  it("returns 0 for distance >= maxRange", () => {
    expect(spiritGlowIntensity(20)).toBe(0);
    expect(spiritGlowIntensity(100)).toBe(0);
  });

  it("returns value between 0 and 1 for intermediate distance", () => {
    const intensity = spiritGlowIntensity(10, 20);
    expect(intensity).toBeGreaterThan(0);
    expect(intensity).toBeLessThan(1);
  });

  it("intensity is higher for closer distances (inverse relationship)", () => {
    const close = spiritGlowIntensity(5, 20);
    const far = spiritGlowIntensity(15, 20);
    expect(close).toBeGreaterThan(far);
  });

  it("respects custom maxRange", () => {
    expect(spiritGlowIntensity(10, 10)).toBe(0);
    expect(spiritGlowIntensity(5, 10)).toBeGreaterThan(0);
  });
});

// -- temperatureExtreme -------------------------------------------------------

describe("temperatureExtreme (Spec S24)", () => {
  it('returns "cold" when bodyTemp < 30', () => {
    expect(temperatureExtreme(25)).toBe("cold");
    expect(temperatureExtreme(0)).toBe("cold");
  });

  it('returns "hot" when bodyTemp > 80', () => {
    expect(temperatureExtreme(85)).toBe("hot");
    expect(temperatureExtreme(100)).toBe("hot");
  });

  it("returns null for normal body temp", () => {
    expect(temperatureExtreme(37)).toBeNull();
    expect(temperatureExtreme(30)).toBeNull();
    expect(temperatureExtreme(80)).toBeNull();
  });
});

// -- distance2D ---------------------------------------------------------------

describe("distance2D", () => {
  it("returns 0 for same point", () => {
    expect(distance2D(5, 5, 5, 5)).toBe(0);
  });

  it("computes correct distance for 3-4-5 triangle", () => {
    expect(distance2D(0, 0, 3, 4)).toBe(5);
  });

  it("is symmetric", () => {
    expect(distance2D(1, 2, 4, 6)).toBe(distance2D(4, 6, 1, 2));
  });
});
