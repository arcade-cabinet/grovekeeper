/**
 * Grove placement tests — Wave 10.
 *
 * Verifies:
 *   - The starter grove at (3, 0) is unconditional.
 *   - The function is deterministic in (worldSeed, chunkX, chunkZ).
 *   - The aggregate distribution across many chunks is in the
 *     expected ballpark (~2%, allowing slack for sampling variance).
 *   - Two different seeds produce different placements.
 */

import { describe, expect, it } from "vitest";
import {
  GROVE_RANDOM_PROBABILITY,
  GUARANTEED_GROVE_CHUNKS,
  isGroveChunk,
  SECOND_GROVE_CHUNK,
  STARTER_GROVE_CHUNK,
} from "./grovePlacement";

describe("grovePlacement", () => {
  it("always places the starter grove at (3, 0)", () => {
    expect(STARTER_GROVE_CHUNK).toEqual({ x: 3, z: 0 });
    expect(isGroveChunk(0, 3, 0)).toBe(true);
    // Different world seeds, still the starter grove.
    for (const seed of [0, 1, 42, 9999, -1, 0x7fffffff]) {
      expect(isGroveChunk(seed, 3, 0)).toBe(true);
    }
  });

  it("is deterministic — same inputs produce same output", () => {
    for (const [x, z] of [
      [0, 0],
      [1, 1],
      [-5, 7],
      [12, -3],
      [100, 100],
    ] as const) {
      const a = isGroveChunk(42, x, z);
      const b = isGroveChunk(42, x, z);
      expect(a).toBe(b);
    }
  });

  it("always places the second guaranteed grove at (7, 2)", () => {
    expect(SECOND_GROVE_CHUNK).toEqual({ x: 7, z: 2 });
    expect(GUARANTEED_GROVE_CHUNKS).toContainEqual(SECOND_GROVE_CHUNK);
    for (const seed of [0, 1, 42, 9999, -1, 0x7fffffff]) {
      expect(isGroveChunk(seed, 7, 2)).toBe(true);
    }
  });

  it("distribution across 1000 outer chunks is roughly 2%", () => {
    const seed = 1234;
    let groveCount = 0;
    let total = 0;
    // Sample a 50x20 window of chunks. Skip every guaranteed grove so
    // we measure the random rule in isolation. 1000 samples is enough
    // to keep sampling noise tight around 2%.
    for (let x = 50; x < 100; x++) {
      for (let z = 50; z < 70; z++) {
        if (GUARANTEED_GROVE_CHUNKS.some((g) => g.x === x && g.z === z)) {
          continue;
        }
        total++;
        if (isGroveChunk(seed, x, z)) groveCount++;
      }
    }
    const rate = groveCount / total;
    // Allow 0.5% – 4% — wide enough that the test isn't flaky on
    // different seeds, narrow enough that a 1/10 or 1/100 typo would
    // be caught.
    expect(rate).toBeGreaterThan(0.005);
    expect(rate).toBeLessThan(0.04);
    // Sanity: the configured probability is exactly 1/50.
    expect(GROVE_RANDOM_PROBABILITY).toBeCloseTo(1 / 50, 10);
  });

  it("different seeds produce different placement maps", () => {
    let differences = 0;
    for (let x = 100; x < 150; x++) {
      for (let z = 100; z < 150; z++) {
        if (isGroveChunk(1, x, z) !== isGroveChunk(2, x, z)) {
          differences++;
        }
      }
    }
    // Two independent ~2% Bernoulli streams should disagree on
    // ~3.92% of cells. Out of 2500 we expect ~98 — assert at least
    // a handful so we know the seed actually feeds the RNG.
    expect(differences).toBeGreaterThan(10);
  });

  it("does not throw on negative or extreme coordinates", () => {
    expect(() => isGroveChunk(0, -1000000, -1000000)).not.toThrow();
    expect(() => isGroveChunk(0, 1000000, 1000000)).not.toThrow();
  });
});
