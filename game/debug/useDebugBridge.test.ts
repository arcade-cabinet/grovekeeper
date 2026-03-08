/**
 * Debug Bridge — formula and metadata tests (Spec §D.1).
 *
 * Tests the pure, non-ECS parts of the debug bridge:
 *   §D.1.1 — hourToMicroseconds time conversion formula
 *   §D.1.2 — getSupportedQueryTypes catalog
 *
 * ECS serialisation tests live in bridgeQueries.test.ts.
 */

import { getSupportedQueryTypes, hourToMicroseconds } from "./bridgeQueries.ts";

// ── §D.1.1 — hourToMicroseconds formula ──────────────────────────────────────

describe("Debug Bridge §D.1.1 — hourToMicroseconds", () => {
  it("returns 0 for hour 0 (midnight)", () => {
    expect(hourToMicroseconds(0)).toBe(0);
  });

  it("returns 300_000_000 for hour 12 (noon)", () => {
    // 12/24 * 600 * 1_000_000 = 300_000_000
    expect(hourToMicroseconds(12)).toBe(300_000_000);
  });

  it("returns 600_000_000 for hour 24 (end of day)", () => {
    expect(hourToMicroseconds(24)).toBe(600_000_000);
  });

  it("returns 100_000_000 for hour 4", () => {
    // 4/24 * 600 * 1_000_000 = 100_000_000
    expect(hourToMicroseconds(4)).toBe(100_000_000);
  });

  it("returns 25_000_000 for hour 1", () => {
    // 1/24 * 600 * 1_000_000 = 25_000_000
    expect(hourToMicroseconds(1)).toBe(25_000_000);
  });

  it("is linear (hour 6 = half of hour 12)", () => {
    expect(hourToMicroseconds(6)).toBe(hourToMicroseconds(12) / 2);
  });

  it("is proportional (hour 8 = 8/24 of full day)", () => {
    const expected = (8 / 24) * 600 * 1_000_000;
    expect(hourToMicroseconds(8)).toBeCloseTo(expected, 0);
  });
});

// ── §D.1.2 — getSupportedQueryTypes ──────────────────────────────────────────

describe("Debug Bridge §D.1.2 — getSupportedQueryTypes", () => {
  it("includes all required entity types", () => {
    const types = getSupportedQueryTypes();
    const required = [
      "trees",
      "npcs",
      "enemies",
      "structures",
      "campfires",
      "proceduralBuildings",
      "rocks",
      "bushes",
    ];
    for (const t of required) {
      expect(types).toContain(t);
    }
  });

  it("returns at least 8 supported types", () => {
    expect(getSupportedQueryTypes().length).toBeGreaterThanOrEqual(8);
  });

  it("returns an array (not undefined or null)", () => {
    expect(Array.isArray(getSupportedQueryTypes())).toBe(true);
  });
});
