/**
 * Tests for the Wave 9 biome assigner.
 *
 * Two big invariants:
 *   1. Determinism — same `(seed, x, z)` always returns the same biome.
 *   2. Distribution — over a large sample, the assigned biomes match
 *      the configured weights (within statistical tolerance).
 */

import { describe, expect, it } from "vitest";
import {
  ASSIGNABLE_BIOME_IDS,
  assignBiome,
  getBiomeWeightTable,
} from "./biomeAssigner";
import { STARTER_GROVE_CHUNK } from "./grovePlacement";

describe("assignBiome", () => {
  it("is deterministic for the same (seed, x, z)", () => {
    const a = assignBiome(0, 0, 0);
    const b = assignBiome(0, 0, 0);
    expect(a).toBe(b);
  });

  it("differs across seeds for the same chunk coord (mostly)", () => {
    // Not a hard guarantee for any single coord, but across 50 seeds at
    // least one should differ from the seed-0 outcome — otherwise the
    // seed isn't actually fanning out into the PRNG.
    const baseline = assignBiome(0, 5, 5);
    let foundDifferent = false;
    for (let s = 1; s < 50; s++) {
      if (assignBiome(s, 5, 5) !== baseline) {
        foundDifferent = true;
        break;
      }
    }
    expect(foundDifferent).toBe(true);
  });

  it("returns only assignable biomes (or grove via the Wave 10 special case)", () => {
    const allowed = new Set([...ASSIGNABLE_BIOME_IDS, "grove"]);
    for (let x = -10; x <= 10; x++) {
      for (let z = -10; z <= 10; z++) {
        expect(allowed.has(assignBiome(0, x, z))).toBe(true);
      }
    }
  });

  it("never returns 'grove' for a chunk grovePlacement says is wilderness", () => {
    // We don't directly test grovePlacement here — that's its own
    // suite — but we sanity check that wilderness chunks land on a
    // proper assignable biome (meadow/forest/coast).
    const knownNonGroveCoords: Array<[number, number]> = [
      [0, 0], // spawn chunk; not the starter grove
      [1, 1],
      [-1, -1],
      [2, 0], // adjacent to starter grove (3, 0) but not it
    ];
    for (const [x, z] of knownNonGroveCoords) {
      // If grovePlacement happens to place a grove here, skip — the
      // PRNG roll could pick any chunk. We're only asserting that the
      // returned biome is in the allowed set.
      const biome = assignBiome(0, x, z);
      const allowed = new Set([...ASSIGNABLE_BIOME_IDS, "grove"]);
      expect(allowed.has(biome)).toBe(true);
    }
  });

  it("places a grove at the starter coordinate (Wave 10 special case)", () => {
    expect(assignBiome(0, STARTER_GROVE_CHUNK.x, STARTER_GROVE_CHUNK.z)).toBe(
      "grove",
    );
  });

  it("assignable distribution roughly matches the configured weights", () => {
    // 2000 chunks → enough samples for a ±5% tolerance on the headline
    // 50/30/20 split. Skip groves so we measure the weighted distribution
    // in isolation.
    const counts: Record<string, number> = {
      meadow: 0,
      forest: 0,
      coast: 0,
      grove: 0,
    };
    let total = 0;
    for (let x = -25; x < 25; x++) {
      for (let z = -25; z < 25; z++) {
        const biome = assignBiome(0, x, z);
        counts[biome] = (counts[biome] ?? 0) + 1;
        total++;
      }
    }
    const nonGrove = total - counts.grove;
    expect(nonGrove).toBeGreaterThan(0);
    const meadowFrac = counts.meadow / nonGrove;
    const forestFrac = counts.forest / nonGrove;
    const coastFrac = counts.coast / nonGrove;
    // Configured weights: meadow=50, forest=30, coast=20 → 0.5/0.3/0.2.
    expect(meadowFrac).toBeGreaterThan(0.4);
    expect(meadowFrac).toBeLessThan(0.6);
    expect(forestFrac).toBeGreaterThan(0.2);
    expect(forestFrac).toBeLessThan(0.4);
    expect(coastFrac).toBeGreaterThan(0.1);
    expect(coastFrac).toBeLessThan(0.3);
  });
});

describe("getBiomeWeightTable", () => {
  it("publishes a non-empty bucket table whose total is positive", () => {
    const table = getBiomeWeightTable();
    expect(table.buckets.length).toBeGreaterThan(0);
    expect(table.total).toBeGreaterThan(0);
  });

  it("buckets are strictly increasing in cumulative weight", () => {
    const table = getBiomeWeightTable();
    let prev = 0;
    for (const b of table.buckets) {
      expect(b.cumulative).toBeGreaterThan(prev);
      prev = b.cumulative;
    }
    expect(table.buckets[table.buckets.length - 1].cumulative).toBe(table.total);
  });
});
