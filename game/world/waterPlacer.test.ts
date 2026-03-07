/**
 * waterPlacer.test.ts
 * Spec §31.2 — Water body placement from heightmap low points and biome.
 */

import type { BiomeWaterRule } from "./waterPlacer.ts";
import {
  computeFlowDirection,
  findLocalMinima,
  getBiomeWaterRule,
  LOW_POINT_THRESHOLD,
  MAX_WATER_BODIES_PER_CHUNK,
  placeWaterBodies,
  selectWaterType,
} from "./waterPlacer.ts";

const SIZE = 16;

// ── Helpers ────────────────────────────────────────────────────────────────────

function flatHeightmap(size: number, value: number): Float32Array {
  return new Float32Array(size * size).fill(value);
}

/** Flat heightmap with one interior cell set to `lowValue`. */
function heightmapWithMinAt(
  size: number,
  x: number,
  z: number,
  lowValue: number,
  surround: number,
): Float32Array {
  const hm = new Float32Array(size * size).fill(surround);
  hm[z * size + x] = lowValue;
  return hm;
}

/** Sloped heightmap: height = x * xSlope + z * zSlope. */
function slopedHeightmap(size: number, xSlope: number, zSlope: number): Float32Array {
  const hm = new Float32Array(size * size);
  for (let z = 0; z < size; z++) {
    for (let x = 0; x < size; x++) {
      hm[z * size + x] = x * xSlope + z * zSlope;
    }
  }
  return hm;
}

// ── findLocalMinima ────────────────────────────────────────────────────────────

describe("findLocalMinima (Spec §31.2)", () => {
  it("finds a local minimum below threshold at an interior position", () => {
    const hm = heightmapWithMinAt(SIZE, 5, 5, -0.4, 0.1);
    const minima = findLocalMinima(hm, SIZE, LOW_POINT_THRESHOLD);
    expect(minima).toHaveLength(1);
    expect(minima[0].localX).toBe(5);
    expect(minima[0].localZ).toBe(5);
    expect(minima[0].height).toBeCloseTo(-0.4);
  });

  it("ignores cells at or above the threshold", () => {
    // -0.1 >= LOW_POINT_THRESHOLD (-0.2) — should be excluded
    const hm = heightmapWithMinAt(SIZE, 5, 5, -0.1, 0.1);
    expect(findLocalMinima(hm, SIZE, LOW_POINT_THRESHOLD)).toHaveLength(0);
  });

  it("skips edge cells (no full 8-neighbor ring)", () => {
    const hm = new Float32Array(SIZE * SIZE).fill(0.1);
    hm[0 * SIZE + 0] = -0.5; // corner (x=0, z=0) — edge
    hm[0 * SIZE + 1] = -0.5; // (x=1, z=0) — top edge
    const minima = findLocalMinima(hm, SIZE, LOW_POINT_THRESHOLD);
    expect(minima.every((m) => m.localX > 0 && m.localZ > 0)).toBe(true);
  });

  it("does not treat a cell as a minimum when a neighbor is lower", () => {
    const hm = flatHeightmap(SIZE, 0.1);
    hm[5 * SIZE + 5] = -0.4; // candidate
    hm[5 * SIZE + 6] = -0.5; // lower neighbor → (5,5) is NOT a minimum
    const minima = findLocalMinima(hm, SIZE, LOW_POINT_THRESHOLD);
    expect(minima.find((m) => m.localX === 5 && m.localZ === 5)).toBeUndefined();
  });

  it("returns empty array when no cells are below threshold", () => {
    const hm = flatHeightmap(SIZE, 0.5);
    expect(findLocalMinima(hm, SIZE, LOW_POINT_THRESHOLD)).toHaveLength(0);
  });

  it("finds multiple non-adjacent minima", () => {
    const hm = flatHeightmap(SIZE, 0.1);
    hm[3 * SIZE + 3] = -0.5;
    hm[9 * SIZE + 9] = -0.4;
    const minima = findLocalMinima(hm, SIZE, LOW_POINT_THRESHOLD);
    expect(minima).toHaveLength(2);
  });
});

// ── computeFlowDirection ──────────────────────────────────────────────────────

describe("computeFlowDirection (Spec §31.2)", () => {
  it("points left [-1, 0] on a left-to-right rising slope", () => {
    // height increases with x → water flows left (toward lower x)
    const hm = slopedHeightmap(SIZE, 0.1, 0);
    const [dx, dz] = computeFlowDirection(hm, 5, 5, SIZE);
    expect(dx).toBeCloseTo(-1);
    expect(dz).toBeCloseTo(0);
  });

  it("points backward [0, -1] on a front-to-back rising slope", () => {
    // height increases with z → water flows toward z=0
    const hm = slopedHeightmap(SIZE, 0, 0.1);
    const [dx, dz] = computeFlowDirection(hm, 5, 5, SIZE);
    expect(dx).toBeCloseTo(0);
    expect(dz).toBeCloseTo(-1);
  });

  it("falls back to [1, 0] for flat terrain (zero gradient)", () => {
    const hm = flatHeightmap(SIZE, 0.5);
    expect(computeFlowDirection(hm, 5, 5, SIZE)).toEqual([1, 0]);
  });

  it("returns a unit vector for diagonal slope", () => {
    const hm = slopedHeightmap(SIZE, 0.1, 0.1);
    const [dx, dz] = computeFlowDirection(hm, 5, 5, SIZE);
    const mag = Math.sqrt(dx * dx + dz * dz);
    expect(mag).toBeCloseTo(1, 5);
  });
});

// ── getBiomeWaterRule ─────────────────────────────────────────────────────────

describe("getBiomeWaterRule (Spec §31.2)", () => {
  it("returns probability=0 for frozen-peaks (no liquid water)", () => {
    expect(getBiomeWaterRule("frozen-peaks").probability).toBe(0);
  });

  it("wetlands has the highest placement probability", () => {
    const biomes = ["meadow", "ancient-forest", "rocky-highlands", "starting-grove"] as const;
    const wetlands = getBiomeWaterRule("wetlands").probability;
    for (const b of biomes) {
      expect(wetlands).toBeGreaterThan(getBiomeWaterRule(b).probability);
    }
  });

  it("wetlands has positive river and stream chance", () => {
    const rule = getBiomeWaterRule("wetlands");
    expect(rule.riverChance).toBeGreaterThan(0);
    expect(rule.streamChance).toBeGreaterThan(0);
  });

  it("rocky-highlands has streamChance=1.0 (only streams, no rivers/ponds)", () => {
    const rule = getBiomeWaterRule("rocky-highlands");
    expect(rule.riverChance).toBe(0);
    expect(rule.streamChance).toBe(1.0);
  });

  it("meadow has only ponds (riverChance=0, streamChance=0)", () => {
    const rule = getBiomeWaterRule("meadow");
    expect(rule.riverChance).toBe(0);
    expect(rule.streamChance).toBe(0);
  });
});

// ── selectWaterType ───────────────────────────────────────────────────────────

describe("selectWaterType (Spec §31.2)", () => {
  const rule: BiomeWaterRule = { probability: 0.5, riverChance: 0.3, streamChance: 0.1 };

  it("returns null when roll >= probability", () => {
    expect(selectWaterType(rule, 0.5)).toBeNull();
    expect(selectWaterType(rule, 0.9)).toBeNull();
  });

  it("returns river when normalized roll is within riverChance", () => {
    // roll=0.05 → normalized=0.1 < 0.3 → river
    expect(selectWaterType(rule, 0.05)).toBe("river");
  });

  it("returns stream when normalized roll is within stream band", () => {
    // roll=0.175 → normalized=0.35; riverChance=0.3, +streamChance=0.1 → [0.3, 0.4)
    expect(selectWaterType(rule, 0.175)).toBe("stream");
  });

  it("returns pond when normalized roll exceeds river+stream band", () => {
    // roll=0.4 → normalized=0.8 >= 0.4 → pond
    expect(selectWaterType(rule, 0.4)).toBe("pond");
  });

  it("always returns null for probability=0 rule", () => {
    const frozenRule: BiomeWaterRule = { probability: 0, riverChance: 0, streamChance: 0 };
    expect(selectWaterType(frozenRule, 0)).toBeNull();
    expect(selectWaterType(frozenRule, 0.001)).toBeNull();
  });

  it("rocky-highlands rule always returns stream within placed band", () => {
    const rh: BiomeWaterRule = { probability: 0.2, riverChance: 0, streamChance: 1.0 };
    // Any roll in [0, 0.2) must be "stream"
    for (const roll of [0, 0.05, 0.1, 0.19]) {
      expect(selectWaterType(rh, roll)).toBe("stream");
    }
  });
});

// ── placeWaterBodies ──────────────────────────────────────────────────────────

describe("placeWaterBodies (Spec §31.2)", () => {
  it("returns empty array for frozen-peaks (no liquid water)", () => {
    const hm = heightmapWithMinAt(SIZE, 5, 5, -0.5, 0.1);
    expect(placeWaterBodies("seed", 0, 0, hm, "frozen-peaks")).toHaveLength(0);
  });

  it("returns empty array when heightmap has no low points", () => {
    const hm = flatHeightmap(SIZE, 0.5);
    expect(placeWaterBodies("seed", 0, 0, hm, "wetlands")).toHaveLength(0);
  });

  it("is deterministic — same inputs always produce same outputs", () => {
    const hm = heightmapWithMinAt(SIZE, 5, 5, -0.5, 0.1);
    const r1 = placeWaterBodies("world-seed", 1, 1, hm, "wetlands");
    const r2 = placeWaterBodies("world-seed", 1, 1, hm, "wetlands");
    expect(r1).toEqual(r2);
  });

  it("different seeds produce different results", () => {
    // Use many minima to make placements highly likely
    const hm = flatHeightmap(SIZE, 0.1);
    for (const [x, z] of [
      [3, 3],
      [7, 3],
      [11, 3],
      [3, 9],
      [7, 9],
      [11, 9],
    ]) {
      hm[z * SIZE + x] = -0.5;
    }
    const r1 = placeWaterBodies("seed-A", 0, 0, hm, "wetlands");
    const r2 = placeWaterBodies("seed-B", 0, 0, hm, "wetlands");
    // At least the two seeds should differ at chunk (0,0)
    expect(JSON.stringify(r1)).not.toBe(JSON.stringify(r2));
  });

  it("never exceeds MAX_WATER_BODIES_PER_CHUNK", () => {
    // Dense minima grid — many candidates
    const hm = flatHeightmap(SIZE, 0.1);
    for (const [x, z] of [
      [3, 3],
      [7, 3],
      [11, 3],
      [3, 9],
      [7, 9],
      [11, 9],
    ]) {
      hm[z * SIZE + x] = -0.5;
    }
    const placements = placeWaterBodies("seed", 0, 0, hm, "wetlands");
    expect(placements.length).toBeLessThanOrEqual(MAX_WATER_BODIES_PER_CHUNK);
  });

  it("places water at world-space position = chunkOffset + localCoord", () => {
    // Single minimum at localX=5, localZ=7 in chunk (2, 3)
    const hm = heightmapWithMinAt(SIZE, 5, 7, -0.5, 0.1);
    const placements = placeWaterBodies("test-world", 2, 3, hm, "wetlands");
    if (placements.length > 0) {
      const p = placements[0];
      expect(p.position.x).toBe(2 * SIZE + 5); // = 37
      expect(p.position.z).toBe(3 * SIZE + 7); // = 55
      // y = height * heightScale = -0.5 * 4.0 = -2.0
      expect(p.position.y).toBeCloseTo(-0.5 * 4.0);
    }
  });

  it("rocky-highlands placements are always streams", () => {
    const hm = flatHeightmap(SIZE, 0.1);
    for (const [x, z] of [
      [3, 3],
      [7, 3],
      [11, 3],
      [3, 9],
      [7, 9],
      [11, 9],
    ]) {
      hm[z * SIZE + x] = -0.5;
    }
    const placements = placeWaterBodies("seed", 0, 0, hm, "rocky-highlands");
    for (const p of placements) {
      expect(p.waterBody.waterType).toBe("stream");
    }
  });

  it("river/stream placements have a normalized flowDirection (magnitude ≈ 1)", () => {
    // Sloped heightmap so rivers have a real gradient
    const hm = slopedHeightmap(SIZE, 0.05, 0.02);
    // Carve minima below threshold in the slope
    hm[5 * SIZE + 5] = -0.5;
    hm[9 * SIZE + 7] = -0.5;
    const placements = placeWaterBodies("slope-seed", 0, 0, hm, "wetlands");
    for (const p of placements) {
      if (p.waterBody.waterType === "river" || p.waterBody.waterType === "stream") {
        const [dx, dz] = p.waterBody.flowDirection;
        const mag = Math.sqrt(dx * dx + dz * dz);
        expect(mag).toBeCloseTo(1, 4);
      }
    }
  });

  it("each placement has a valid WaterBodyComponent with required fields", () => {
    const hm = heightmapWithMinAt(SIZE, 5, 5, -0.5, 0.1);
    const placements = placeWaterBodies("world-seed", 1, 1, hm, "wetlands");
    for (const p of placements) {
      const wb = p.waterBody;
      expect(wb.waterType).toBeDefined();
      expect(wb.waveLayers.length).toBeGreaterThan(0);
      expect(wb.color).toMatch(/^#/);
      expect(wb.opacity).toBeGreaterThan(0);
      expect(wb.size.width).toBeGreaterThan(0);
      expect(wb.size.depth).toBeGreaterThan(0);
      expect(typeof wb.foamEnabled).toBe("boolean");
      expect(typeof wb.causticsEnabled).toBe("boolean");
    }
  });
});
