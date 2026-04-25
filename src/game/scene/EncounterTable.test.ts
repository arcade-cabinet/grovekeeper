/**
 * EncounterTable tests — Wave 14/15.
 *
 * Verifies:
 *   - grove biome ALWAYS returns empty (sacred invariant),
 *   - meadow / forest produce non-empty lists with curated mixes,
 *   - coast returns empty (RC TODO; will be filled in a later wave),
 *   - same inputs → same outputs (determinism),
 *   - different chunk coords produce different rolls.
 */

import { describe, expect, it } from "vitest";
import { rollEncounters } from "./EncounterTable";

const SEED = 12345;
const SIZE = 16;

function roll(biome: "meadow" | "forest" | "coast" | "grove", x = 0, z = 0) {
  return rollEncounters({
    biome,
    worldSeed: SEED,
    chunkX: x,
    chunkZ: z,
    timeOfDay: "day",
    chunkSize: SIZE,
  });
}

describe("EncounterTable", () => {
  it("grove biome always returns empty (sanctuary invariant)", () => {
    expect(roll("grove", 0, 0)).toEqual([]);
    expect(roll("grove", 3, 0)).toEqual([]);
    expect(roll("grove", -7, 42)).toEqual([]);
  });

  it("coast biome returns empty for RC", () => {
    expect(roll("coast", 0, 0)).toEqual([]);
    expect(roll("coast", 5, 5)).toEqual([]);
  });

  it("meadow biome produces at least 2 rabbits across all chunks", () => {
    let totalRabbits = 0;
    for (let x = 0; x < 10; x++) {
      const list = roll("meadow", x, 0);
      totalRabbits += list.filter((s) => s.species === "rabbit").length;
    }
    expect(totalRabbits).toBeGreaterThanOrEqual(20);
  });

  it("forest biome includes both rabbits and deer", () => {
    let rabbits = 0;
    let deer = 0;
    for (let x = 0; x < 20; x++) {
      const list = roll("forest", x, 0);
      rabbits += list.filter((s) => s.species === "rabbit").length;
      deer += list.filter((s) => s.species === "deer").length;
    }
    expect(rabbits).toBeGreaterThan(0);
    expect(deer).toBeGreaterThan(0);
  });

  it("hostiles are rare (<25% of meadow chunks have a wolf)", () => {
    let wolves = 0;
    const N = 100;
    for (let x = 0; x < N; x++) {
      const list = roll("meadow", x, 0);
      if (list.some((s) => s.species === "wolf-pup")) wolves++;
    }
    expect(wolves).toBeLessThan(N * 0.25);
  });

  it("is deterministic — same inputs produce same outputs", () => {
    const a = roll("meadow", 4, 7);
    const b = roll("meadow", 4, 7);
    expect(a).toEqual(b);
  });

  it("different chunks produce different rolls (not identical)", () => {
    const a = roll("meadow", 0, 0);
    const b = roll("meadow", 100, 100);
    expect(a).not.toEqual(b);
  });

  it("spawn offsets stay within chunk bounds", () => {
    for (let x = 0; x < 10; x++) {
      const list = roll("meadow", x, 0);
      for (const s of list) {
        expect(s.localX).toBeGreaterThanOrEqual(0);
        expect(s.localX).toBeLessThan(SIZE);
        expect(s.localZ).toBeGreaterThanOrEqual(0);
        expect(s.localZ).toBeLessThan(SIZE);
      }
    }
  });
});
