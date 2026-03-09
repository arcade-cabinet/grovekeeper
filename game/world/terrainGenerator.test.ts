/**
 * terrainGenerator tests (Spec §31.1, §17.3a)
 *
 * Covers:
 *  - Output shape: Float32Array of CHUNK_SIZE * CHUNK_SIZE (256 elements)
 *  - Determinism: same seed + coords always produce the same heightmap
 *  - Seed isolation: different seeds produce different heightmaps
 *  - Chunk isolation: different chunk coords produce different heightmaps
 *  - Seamless boundary: adjacent tile heights match between chunk boundaries
 *  - Value range: all values in [-1, 1]
 *  - Rootmere flatten: chunk (0,0) village area is flat (Spec §17.3a)
 *  - No mutation for other chunks: chunk (1,0) is unaffected by flattening
 */

import {
  generateHeightmap,
  VILLAGE_BLEND_TILES,
  VILLAGE_CENTER_X,
  VILLAGE_CENTER_Z,
  VILLAGE_FLAT_HEIGHT,
  VILLAGE_FLAT_RADIUS,
} from "./terrainGenerator.ts";

const CHUNK_SIZE = 16;

describe("generateHeightmap (Spec §31.1)", () => {
  describe("output shape", () => {
    it("returns a Float32Array", () => {
      const result = generateHeightmap("seed", 0, 0);
      expect(result).toBeInstanceOf(Float32Array);
    });

    it("has CHUNK_SIZE * CHUNK_SIZE (256) elements", () => {
      const result = generateHeightmap("seed", 0, 0);
      expect(result.length).toBe(CHUNK_SIZE * CHUNK_SIZE);
    });

    it("has exactly 256 elements for any chunk", () => {
      expect(generateHeightmap("seed", 3, -2).length).toBe(256);
      expect(generateHeightmap("seed", -5, 10).length).toBe(256);
    });
  });

  describe("determinism", () => {
    it("same seed + coords returns identical heightmap", () => {
      const a = generateHeightmap("worldA", 2, 3);
      const b = generateHeightmap("worldA", 2, 3);
      expect(Array.from(a)).toEqual(Array.from(b));
    });

    it("same result regardless of call order", () => {
      const first = generateHeightmap("seedX", 0, 0);
      generateHeightmap("seedX", 1, 0); // side-effect check
      const second = generateHeightmap("seedX", 0, 0);
      expect(Array.from(first)).toEqual(Array.from(second));
    });

    it("negative chunk coords are deterministic", () => {
      const a = generateHeightmap("seed", -3, -4);
      const b = generateHeightmap("seed", -3, -4);
      expect(Array.from(a)).toEqual(Array.from(b));
    });
  });

  describe("seed isolation", () => {
    it("different seeds produce different heightmaps (non-origin chunk)", () => {
      // Note: chunk (0,0) is intentionally flat for all seeds (Rootmere — Spec §17.3a).
      // Use a non-origin chunk where natural noise varies by seed.
      const a = generateHeightmap("seedA", 1, 0);
      const b = generateHeightmap("seedB", 1, 0);
      expect(Array.from(a)).not.toEqual(Array.from(b));
    });

    it("chunk (0,0) is flat regardless of seed (Rootmere fixed terrain)", () => {
      // chunk (0,0) flat radius covers all 16x16 tiles — same for any seed.
      const a = generateHeightmap("seedA", 0, 0);
      const b = generateHeightmap("seedB", 0, 0);
      expect(Array.from(a)).toEqual(Array.from(b));
    });
  });

  describe("chunk isolation", () => {
    it("different X coords produce different heightmaps", () => {
      const a = generateHeightmap("seed", 0, 0);
      const b = generateHeightmap("seed", 1, 0);
      expect(Array.from(a)).not.toEqual(Array.from(b));
    });

    it("different Z coords produce different heightmaps", () => {
      const a = generateHeightmap("seed", 0, 0);
      const b = generateHeightmap("seed", 0, 1);
      expect(Array.from(a)).not.toEqual(Array.from(b));
    });
  });

  describe("value range", () => {
    it("all values are in [-1, 1]", () => {
      const heightmap = generateHeightmap("range-test", 5, -3);
      for (const v of heightmap) {
        expect(v).toBeGreaterThanOrEqual(-1);
        expect(v).toBeLessThanOrEqual(1);
      }
    });

    it("values at origin chunk are in [-1, 1]", () => {
      const heightmap = generateHeightmap("range-test", 0, 0);
      for (const v of heightmap) {
        expect(v).toBeGreaterThanOrEqual(-1);
        expect(v).toBeLessThanOrEqual(1);
      }
    });
  });

  describe("seamless boundaries (Spec §31.1)", () => {
    it("east edge of chunk (0,0) matches west edge of chunk (1,0) in global space", () => {
      const chunkA = generateHeightmap("seamless", 0, 0);
      const chunkB = generateHeightmap("seamless", 1, 0);
      for (let z = 0; z < CHUNK_SIZE; z++) {
        const eastEdge = chunkA[z * CHUNK_SIZE + 15];
        const westEdge = chunkB[z * CHUNK_SIZE + 0];
        expect(Math.abs(eastEdge - westEdge)).toBeLessThan(0.5);
      }
    });
  });

  // ── Rootmere village flatten pass (Spec §17.3a) ───────────────────────────

  describe("Rootmere flatten pass — chunk (0,0) (Spec §17.3a)", () => {
    const hm00 = generateHeightmap("any-seed", 0, 0);

    it("village center tile is exactly VILLAGE_FLAT_HEIGHT", () => {
      const idx = VILLAGE_CENTER_Z * CHUNK_SIZE + VILLAGE_CENTER_X;
      expect(hm00[idx]).toBeCloseTo(VILLAGE_FLAT_HEIGHT);
    });

    it("all tiles within FLAT_RADIUS of center are exactly VILLAGE_FLAT_HEIGHT", () => {
      for (let z = 0; z < CHUNK_SIZE; z++) {
        for (let x = 0; x < CHUNK_SIZE; x++) {
          const dx = x - VILLAGE_CENTER_X;
          const dz = z - VILLAGE_CENTER_Z;
          const dist = Math.sqrt(dx * dx + dz * dz);
          if (dist < VILLAGE_FLAT_RADIUS) {
            expect(hm00[z * CHUNK_SIZE + x]).toBeCloseTo(VILLAGE_FLAT_HEIGHT, 5);
          }
        }
      }
    });

    it("all corners of chunk (0,0) are within FLAT_RADIUS of center — all flat", () => {
      // Max corner distance from center (8,8) = sqrt(8^2+8^2) = ~11.31 < FLAT_RADIUS(14)
      const cornerDist = Math.sqrt((0 - VILLAGE_CENTER_X) ** 2 + (0 - VILLAGE_CENTER_Z) ** 2);
      expect(cornerDist).toBeLessThan(VILLAGE_FLAT_RADIUS);
      // All four corners should be flat
      expect(hm00[0 * CHUNK_SIZE + 0]).toBeCloseTo(VILLAGE_FLAT_HEIGHT, 5);
      expect(hm00[0 * CHUNK_SIZE + 15]).toBeCloseTo(VILLAGE_FLAT_HEIGHT, 5);
      expect(hm00[15 * CHUNK_SIZE + 0]).toBeCloseTo(VILLAGE_FLAT_HEIGHT, 5);
      expect(hm00[15 * CHUNK_SIZE + 15]).toBeCloseTo(VILLAGE_FLAT_HEIGHT, 5);
    });

    it("blend tiles constant is positive (blend zone exists)", () => {
      expect(VILLAGE_BLEND_TILES).toBeGreaterThan(0);
      expect(VILLAGE_FLAT_RADIUS).toBeGreaterThan(0);
    });

    it("flat region is deterministic across seeds", () => {
      const hm1 = generateHeightmap("seedA", 0, 0);
      const hm2 = generateHeightmap("seedB", 0, 0);
      // All tiles within FLAT_RADIUS are VILLAGE_FLAT_HEIGHT regardless of seed
      for (let z = 0; z < CHUNK_SIZE; z++) {
        for (let x = 0; x < CHUNK_SIZE; x++) {
          const dx = x - VILLAGE_CENTER_X;
          const dz = z - VILLAGE_CENTER_Z;
          const dist = Math.sqrt(dx * dx + dz * dz);
          if (dist < VILLAGE_FLAT_RADIUS) {
            expect(hm1[z * CHUNK_SIZE + x]).toBeCloseTo(VILLAGE_FLAT_HEIGHT, 5);
            expect(hm2[z * CHUNK_SIZE + x]).toBeCloseTo(VILLAGE_FLAT_HEIGHT, 5);
          }
        }
      }
    });
  });

  describe("Rootmere flatten pass — other chunks NOT affected (Spec §17.3a)", () => {
    it("chunk (1,0) heightmap values are NOT all VILLAGE_FLAT_HEIGHT", () => {
      const hm = generateHeightmap("any-seed", 1, 0);
      const allFlat = Array.from(hm).every((v) => Math.abs(v - VILLAGE_FLAT_HEIGHT) < 0.001);
      expect(allFlat).toBe(false);
    });

    it("chunk (0,1) heightmap values are NOT all VILLAGE_FLAT_HEIGHT", () => {
      const hm = generateHeightmap("any-seed", 0, 1);
      const allFlat = Array.from(hm).every((v) => Math.abs(v - VILLAGE_FLAT_HEIGHT) < 0.001);
      expect(allFlat).toBe(false);
    });

    it("chunk (-1,0) heightmap values are NOT all VILLAGE_FLAT_HEIGHT", () => {
      const hm = generateHeightmap("any-seed", -1, 0);
      const allFlat = Array.from(hm).every((v) => Math.abs(v - VILLAGE_FLAT_HEIGHT) < 0.001);
      expect(allFlat).toBe(false);
    });

    it("chunk (1,0) produces different results for different seeds (natural noise used)", () => {
      const hmA = generateHeightmap("seedA", 1, 0);
      const hmB = generateHeightmap("seedB", 1, 0);
      expect(Array.from(hmA)).not.toEqual(Array.from(hmB));
    });
  });
});
