/**
 * mazeGenerator.test.ts
 * Spec §17.5 — Hedge labyrinth detection and world-space placement generation.
 */

import {
  generateLabyrinth,
  type HedgePlacement,
  isLabyrinthChunk,
  LABYRINTH_PROBABILITY,
  type MazeGenerationResult,
} from "./mazeGenerator.ts";

const CHUNK_SIZE = 16;

// ── Helpers ───────────────────────────────────────────────────────────────────

function flatHeightmap(value = 0): Float32Array {
  return new Float32Array(CHUNK_SIZE * CHUNK_SIZE).fill(value);
}

/**
 * Find the first labyrinth chunk in a 30×30 scan (excluding origin).
 * Returns null if none found (should not happen at 3% probability in 900 chunks).
 */
function findLabyrinthChunk(seed: string): { chunkX: number; chunkZ: number } | null {
  for (let x = 1; x <= 30; x++) {
    for (let z = 1; z <= 30; z++) {
      if (isLabyrinthChunk(seed, x, z)) return { chunkX: x, chunkZ: z };
    }
  }
  return null;
}

// ── isLabyrinthChunk ──────────────────────────────────────────────────────────

describe("isLabyrinthChunk (Spec §17.5)", () => {
  it("never returns true for chunk (0,0) — origin is always a village", () => {
    const seed = "Gentle Mossy Hollow";
    expect(isLabyrinthChunk(seed, 0, 0)).toBe(false);
  });

  it("returns a consistent value for the same chunk", () => {
    const seed = "Gentle Mossy Hollow";
    const a = isLabyrinthChunk(seed, 5, 7);
    const b = isLabyrinthChunk(seed, 5, 7);
    expect(a).toBe(b);
  });

  it("finds at least one labyrinth chunk in a 30×30 scan", () => {
    const chunk = findLabyrinthChunk("Gentle Mossy Hollow");
    expect(chunk).not.toBeNull();
  });

  it("different seeds produce different labyrinth distributions", () => {
    const seed1 = "Gentle Mossy Hollow";
    const seed2 = "Ancient Whispering Canopy";
    let sameCount = 0;
    let total = 0;
    for (let x = 1; x <= 10; x++) {
      for (let z = 1; z <= 10; z++) {
        total++;
        if (isLabyrinthChunk(seed1, x, z) === isLabyrinthChunk(seed2, x, z)) {
          sameCount++;
        }
      }
    }
    // Shouldn't be 100% identical.
    expect(sameCount).toBeLessThan(total);
  });

  it("LABYRINTH_PROBABILITY is close to 3% for sparse density", () => {
    expect(LABYRINTH_PROBABILITY).toBeCloseTo(0.03, 2);
  });
});

// ── generateLabyrinth — null guard ────────────────────────────────────────────

describe("generateLabyrinth — null guard (Spec §17.5)", () => {
  it("returns null for chunk (0,0)", () => {
    expect(generateLabyrinth("Gentle Mossy Hollow", 0, 0, flatHeightmap())).toBeNull();
  });

  it("returns null for a non-labyrinth chunk", () => {
    const seed = "Gentle Mossy Hollow";
    for (let x = 1; x <= 30; x++) {
      for (let z = 1; z <= 30; z++) {
        if (!isLabyrinthChunk(seed, x, z)) {
          expect(generateLabyrinth(seed, x, z, flatHeightmap())).toBeNull();
          return;
        }
      }
    }
    throw new Error("Could not find a non-labyrinth chunk in scan range");
  });
});

// ── generateLabyrinth — structure ─────────────────────────────────────────────

describe("generateLabyrinth — result structure (Spec §17.5)", () => {
  const seed = "Gentle Mossy Hollow";
  let result: MazeGenerationResult;
  let chunkX: number;
  let chunkZ: number;

  beforeAll(() => {
    const chunk = findLabyrinthChunk(seed);
    if (!chunk) throw new Error("No labyrinth chunk found in scan range");
    chunkX = chunk.chunkX;
    chunkZ = chunk.chunkZ;
    const r = generateLabyrinth(seed, chunkX, chunkZ, flatHeightmap());
    if (!r) throw new Error(`Expected labyrinth result for chunk (${chunkX},${chunkZ})`);
    result = r;
  });

  it("returns a non-null result for a labyrinth chunk", () => {
    expect(result).not.toBeNull();
  });

  it("result has a non-empty hedges array", () => {
    expect(result.hedges.length).toBeGreaterThan(0);
  });

  it("result has a non-empty decorations array", () => {
    expect(result.decorations.length).toBeGreaterThan(0);
  });

  it("includes a fountain decoration at center", () => {
    const fountain = result.decorations.find((d) => d.decoration.modelPath.includes("fountain"));
    expect(fountain).toBeDefined();
  });

  it("includes bench decorations", () => {
    const benches = result.decorations.filter((d) => d.decoration.modelPath.includes("bench"));
    expect(benches.length).toBeGreaterThanOrEqual(2);
  });

  it("centerPosition is in world space for the correct chunk", () => {
    // World origin for chunk (chunkX, chunkZ) is (chunkX*16, chunkZ*16).
    const worldOriginX = chunkX * CHUNK_SIZE;
    const worldOriginZ = chunkZ * CHUNK_SIZE;
    expect(result.centerPosition.x).toBeGreaterThanOrEqual(worldOriginX);
    expect(result.centerPosition.z).toBeGreaterThanOrEqual(worldOriginZ);
  });

  it("entrancePosition is at the maze south edge (localZ=0)", () => {
    const worldOriginZ = chunkZ * CHUNK_SIZE;
    // Entrance is at localZ=0, so worldZ = chunkZ * CHUNK_SIZE + 0.
    expect(result.entrancePosition.z).toBeCloseTo(worldOriginZ, 1);
  });

  it("mazeIndex is in [0, 7]", () => {
    expect(result.mazeIndex).toBeGreaterThanOrEqual(0);
    expect(result.mazeIndex).toBeLessThanOrEqual(7);
  });
});

// ── generateLabyrinth — hedge pieces ──────────────────────────────────────────

describe("generateLabyrinth — hedge pieces (Spec §17.5)", () => {
  const seed = "Ancient Whispering Canopy";
  let result: MazeGenerationResult;

  beforeAll(() => {
    const chunk = findLabyrinthChunk(seed);
    if (!chunk) throw new Error("No labyrinth chunk found");
    const r = generateLabyrinth(seed, chunk.chunkX, chunk.chunkZ, flatHeightmap());
    if (!r) throw new Error("Expected labyrinth result");
    result = r;
  });

  it("all hedge pieces have a valid pieceType", () => {
    const validTypes = new Set(["basic", "diagonal", "round", "slope", "triangle"]);
    for (const h of result.hedges) {
      expect(validTypes.has(h.hedge.pieceType)).toBe(true);
    }
  });

  it("all hedge pieces have a valid modelPath", () => {
    for (const h of result.hedges) {
      // Path: hedges/<type>/<type>_<size>.glb or similar
      expect(h.hedge.modelPath).toMatch(/^hedges\/[a-z]+\/.+\.glb$/);
    }
  });

  it("all hedge pieces have a valid rotation (0, 90, 180, or 270 degrees)", () => {
    for (const h of result.hedges) {
      expect([0, 90, 180, 270]).toContain(h.rotationY);
    }
  });

  it("all hedge pieces have a valid sizeClass", () => {
    for (const h of result.hedges) {
      expect(h.hedge.sizeClass).toMatch(/^\d+x\d+$/);
    }
  });
});

// ── generateLabyrinth — decorations ───────────────────────────────────────────

describe("generateLabyrinth — decorations (Spec §17.5)", () => {
  const seed = "Warm Dappled Creek";
  let result: MazeGenerationResult;

  beforeAll(() => {
    const chunk = findLabyrinthChunk(seed);
    if (!chunk) throw new Error("No labyrinth chunk found");
    const r = generateLabyrinth(seed, chunk.chunkX, chunk.chunkZ, flatHeightmap());
    if (!r) throw new Error("Expected labyrinth result");
    result = r;
  });

  it("all decoration modelPaths end in .glb", () => {
    for (const d of result.decorations) {
      expect(d.decoration.modelPath).toMatch(/\.glb$/);
    }
  });

  it("all decoration categories are valid HedgeMiscCategory values", () => {
    const validCategories = new Set(["fences", "flowers", "stone", "structure", "dungeon"]);
    for (const d of result.decorations) {
      expect(validCategories.has(d.decoration.category)).toBe(true);
    }
  });

  it("all decorations have a non-empty itemId", () => {
    for (const d of result.decorations) {
      expect(d.decoration.itemId.length).toBeGreaterThan(0);
    }
  });
});

// ── Determinism ───────────────────────────────────────────────────────────────

describe("generateLabyrinth — determinism (Spec §17.5)", () => {
  it("same inputs produce identical output", () => {
    const seed = "Gentle Mossy Hollow";
    const chunk = findLabyrinthChunk(seed);
    if (!chunk) throw new Error("No labyrinth chunk found");
    const { chunkX, chunkZ } = chunk;
    const hm = flatHeightmap();

    const r1 = generateLabyrinth(seed, chunkX, chunkZ, hm);
    const r2 = generateLabyrinth(seed, chunkX, chunkZ, hm);

    if (!r1 || !r2) throw new Error("Expected non-null results");

    expect(r1.hedges.length).toBe(r2.hedges.length);
    expect(r1.decorations.length).toBe(r2.decorations.length);
    expect(r1.mazeIndex).toBe(r2.mazeIndex);
    expect(r1.centerPosition).toEqual(r2.centerPosition);
    expect(r1.entrancePosition).toEqual(r2.entrancePosition);

    for (let i = 0; i < r1.hedges.length; i++) {
      expect(r1.hedges[i].hedge.modelPath).toBe(r2.hedges[i].hedge.modelPath);
      expect(r1.hedges[i].rotationY).toBe(r2.hedges[i].rotationY);
      expect(r1.hedges[i].position).toEqual(r2.hedges[i].position);
    }
  });

  it("different world seeds produce different hedge layouts", () => {
    // Find a chunk that is a labyrinth for both seeds — tricky, so just
    // compare two labyrinth chunks from different seeds.
    const s1 = "Gentle Mossy Hollow";
    const s2 = "Ancient Whispering Canopy";
    const c1 = findLabyrinthChunk(s1);
    const c2 = findLabyrinthChunk(s2);
    if (!c1 || !c2) throw new Error("No labyrinth chunk found");

    const r1 = generateLabyrinth(s1, c1.chunkX, c1.chunkZ, flatHeightmap());
    const r2 = generateLabyrinth(s2, c2.chunkX, c2.chunkZ, flatHeightmap());
    if (!r1 || !r2) throw new Error("Expected non-null results");

    // At minimum, maze center positions should differ.
    const samePieces =
      r1.hedges.length === r2.hedges.length &&
      r1.hedges.every((h, i) => h.hedge.modelPath === r2.hedges[i].hedge.modelPath);
    // Different seeds/chunks — either different layout or different world coords.
    const same =
      samePieces &&
      r1.centerPosition.x === r2.centerPosition.x &&
      r1.centerPosition.z === r2.centerPosition.z;
    expect(same).toBe(false);
  });
});

// ── Heightmap elevation sampling ──────────────────────────────────────────────

describe("generateLabyrinth — elevation sampling (Spec §17.5)", () => {
  it("centerPosition.y reflects heightmap at center local coords", () => {
    const seed = "Gentle Mossy Hollow";
    const chunk = findLabyrinthChunk(seed);
    if (!chunk) throw new Error("No labyrinth chunk found");

    const hm = flatHeightmap(5.0);
    const r = generateLabyrinth(seed, chunk.chunkX, chunk.chunkZ, hm);
    expect(r?.centerPosition.y).toBeCloseTo(5.0);
  });

  it("hedges have y=0 on flat terrain", () => {
    const seed = "Gentle Mossy Hollow";
    const chunk = findLabyrinthChunk(seed);
    if (!chunk) throw new Error("No labyrinth chunk found");

    const r = generateLabyrinth(seed, chunk.chunkX, chunk.chunkZ, flatHeightmap(0));
    if (!r) throw new Error("Expected result");
    for (const h of r.hedges) {
      expect(h.position.y).toBe(0);
    }
  });
});
