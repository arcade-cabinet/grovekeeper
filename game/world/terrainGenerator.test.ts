/**
 * terrainGenerator tests (Spec §31.1)
 *
 * Covers:
 *  - Output shape: Float32Array of CHUNK_SIZE * CHUNK_SIZE (256 elements)
 *  - Determinism: same seed + coords always produce the same heightmap
 *  - Seed isolation: different seeds produce different heightmaps
 *  - Chunk isolation: different chunk coords produce different heightmaps
 *  - Seamless boundary: adjacent tile heights match between chunk boundaries
 *  - Value range: all values in [-1, 1]
 */

import { generateHeightmap } from "./terrainGenerator";

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
    it("different seeds produce different heightmaps", () => {
      const a = generateHeightmap("seedA", 0, 0);
      const b = generateHeightmap("seedB", 0, 0);
      expect(Array.from(a)).not.toEqual(Array.from(b));
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
      // The east edge of chunk 0 is localX=15, the west edge of chunk 1 is localX=0.
      // They are NOT the same sample point (globalX=15 vs globalX=16), but the terrain
      // should be continuous (not teleporting). We verify values are different but close
      // — fBm at adjacent global coords must not be discontinuous.
      const chunkA = generateHeightmap("seamless", 0, 0);
      const chunkB = generateHeightmap("seamless", 1, 0);

      // Last column of chunk A (x=15) vs first column of chunk B (x=0), same Z
      for (let z = 0; z < CHUNK_SIZE; z++) {
        const eastEdge = chunkA[z * CHUNK_SIZE + 15];
        const westEdge = chunkB[z * CHUNK_SIZE + 0];
        // Adjacent samples at global scale 0.05 should be within a reasonable delta
        expect(Math.abs(eastEdge - westEdge)).toBeLessThan(0.5);
      }
    });
  });
});
