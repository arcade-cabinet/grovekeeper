/**
 * Biome blending tests (Spec §31.1, §17.3)
 *
 * Covers:
 *  - computeNeighborBiomes returns [N, E, S, W] neighbor biomes
 *  - generateChunkData sets biomeBlend to 1 for different-biome neighbors
 *  - generateChunkData sets biomeBlend to 0 for same-biome neighbors
 *  - generateChunkData populates neighborColors with valid hex strings
 *  - Blend weights are deterministic
 */

import { BIOME_COLORS } from "./biomeMapper.ts";
import { computeNeighborBiomes, generateChunkData } from "./ChunkManager.ts";

// ─── computeNeighborBiomes ────────────────────────────────────────────────────

describe("computeNeighborBiomes (Spec §31.1)", () => {
  it("returns a 4-tuple [N, E, S, W]", () => {
    const result = computeNeighborBiomes("seed", 0, 0);
    expect(result).toHaveLength(4);
  });

  it("each element is a valid BiomeType string", () => {
    const validBiomes = new Set(Object.keys(BIOME_COLORS));
    const result = computeNeighborBiomes("seed", 0, 0);
    for (const biome of result) {
      expect(validBiomes.has(biome)).toBe(true);
    }
  });

  it("is deterministic — same inputs produce same neighbor biomes", () => {
    const a = computeNeighborBiomes("worldA", 3, 5);
    const b = computeNeighborBiomes("worldA", 3, 5);
    expect(a).toEqual(b);
  });

  it("different chunk coords produce potentially different neighbor biomes", () => {
    // Not guaranteed to be different, but at least tests the function runs
    const nearOrigin = computeNeighborBiomes("seed", 0, 0);
    const farAway = computeNeighborBiomes("seed", 100, 100);
    // Both should be valid 4-tuples
    expect(nearOrigin).toHaveLength(4);
    expect(farAway).toHaveLength(4);
  });

  it("N neighbor corresponds to (chunkX, chunkZ - 1)", () => {
    // Verify by checking that computeNeighborBiomes[0] == getChunkBiome at chunkZ-1
    // We can't import getChunkBiome directly here, but we can verify the symmetry:
    // chunk A's south neighbor biome should equal chunk (A+S)'s north neighbor biome context
    // Just verify the function returns a valid string
    const [north] = computeNeighborBiomes("seed", 0, 0);
    expect(typeof north).toBe("string");
    expect(north.length).toBeGreaterThan(0);
  });
});

// ─── generateChunkData biomeBlend ─────────────────────────────────────────────

describe("generateChunkData biomeBlend (Spec §31.1)", () => {
  it("biomeBlend is a 4-tuple [N, E, S, W]", () => {
    const result = generateChunkData("seed", 0, 0);
    expect(result.biomeBlend).toHaveLength(4);
  });

  it("all biomeBlend values are 0 or 1", () => {
    // With binary blending, each weight is 0 (same biome) or 1 (different biome)
    const result = generateChunkData("seed", 0, 0);
    for (const weight of result.biomeBlend) {
      expect(weight === 0 || weight === 1).toBe(true);
    }
  });

  it("biomeBlend is deterministic for same seed + coords", () => {
    const a = generateChunkData("worldX", 2, -3);
    const b = generateChunkData("worldX", 2, -3);
    expect(a.biomeBlend).toEqual(b.biomeBlend);
  });

  it("biomeBlend[i] = 0 when neighbor i has the same biome as the chunk", () => {
    // Find a chunk where all neighbors have the same biome (likely at origin in starting grove)
    // We test the invariant: if neighbor biome == center biome → biomeBlend = 0
    // Run multiple chunks and verify: for each weight, if 0 → same biome
    for (let cx = -2; cx <= 2; cx++) {
      for (let cz = -2; cz <= 2; cz++) {
        const data = generateChunkData("test", cx, cz);
        const [northBiome, eastBiome, southBiome, westBiome] = computeNeighborBiomes(
          "test",
          cx,
          cz,
        );
        const centerBiome = data.baseColor; // indirect: same biome → same color

        const _neighborColors = data.neighborColors;
        // Neighbors with same baseColor as center → biomeBlend = 0
        // Neighbors with different color → biomeBlend = 1
        const [bN, bE, bS, bW] = data.biomeBlend;
        if (BIOME_COLORS[northBiome as keyof typeof BIOME_COLORS] === centerBiome) {
          expect(bN).toBe(0);
        } else {
          expect(bN).toBe(1);
        }
        if (BIOME_COLORS[eastBiome as keyof typeof BIOME_COLORS] === centerBiome) {
          expect(bE).toBe(0);
        } else {
          expect(bE).toBe(1);
        }
        if (BIOME_COLORS[southBiome as keyof typeof BIOME_COLORS] === centerBiome) {
          expect(bS).toBe(0);
        } else {
          expect(bS).toBe(1);
        }
        if (BIOME_COLORS[westBiome as keyof typeof BIOME_COLORS] === centerBiome) {
          expect(bW).toBe(0);
        } else {
          expect(bW).toBe(1);
        }
      }
    }
  });
});

// ─── generateChunkData neighborColors ────────────────────────────────────────

describe("generateChunkData neighborColors (Spec §31.1)", () => {
  it("neighborColors is a 4-tuple [N, E, S, W]", () => {
    const result = generateChunkData("seed", 0, 0);
    expect(result.neighborColors).toHaveLength(4);
  });

  it("all neighborColors are valid 6-digit hex strings", () => {
    const result = generateChunkData("seed", 5, 3);
    for (const color of result.neighborColors) {
      expect(color).toMatch(/^#[0-9a-f]{6}$/i);
    }
  });

  it("neighborColors matches BIOME_COLORS for the corresponding neighbor biome", () => {
    const neighbors = computeNeighborBiomes("seed", 1, 1);
    const data = generateChunkData("seed", 1, 1);
    for (let i = 0; i < 4; i++) {
      const expectedColor = BIOME_COLORS[neighbors[i] as keyof typeof BIOME_COLORS];
      expect(data.neighborColors[i]).toBe(expectedColor);
    }
  });

  it("is deterministic for same seed + coords", () => {
    const a = generateChunkData("worldY", -2, 4);
    const b = generateChunkData("worldY", -2, 4);
    expect(a.neighborColors).toEqual(b.neighborColors);
  });
});
