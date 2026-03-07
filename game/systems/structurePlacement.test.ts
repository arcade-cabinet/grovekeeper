/**
 * Structure placement system tests.
 */
import {
  canPlace,
  deductBuildCost,
  getActiveEffects,
  getStructureById,
  getStructures,
  getStructuresByCategory,
  getStructuresForLevel,
  getTotalEffect,
  hasSpacingConflict,
  snapToGrid,
} from "@/game/systems/structurePlacement";

describe("Structure Placement System", () => {
  describe("Config accessors", () => {
    it("should load all structures from config", () => {
      const structures = getStructures();
      expect(structures.length).toBeGreaterThan(0);
    });

    it("should find a structure by id", () => {
      const barn = getStructureById("barn");
      expect(barn).toBeDefined();
      expect(barn?.name).toBe("Barn");
      expect(barn?.category).toBe("storage");
    });

    it("should return undefined for unknown structure", () => {
      expect(getStructureById("nonexistent")).toBeUndefined();
    });

    it("should filter structures by category", () => {
      const essential = getStructuresByCategory("essential");
      expect(essential.length).toBeGreaterThan(0);
      for (const s of essential) {
        expect(s.category).toBe("essential");
      }
    });

    it("should filter structures by player level", () => {
      const level1 = getStructuresForLevel(1);
      for (const s of level1) {
        expect(s.level).toBeLessThanOrEqual(1);
      }
      const level20 = getStructuresForLevel(20);
      expect(level20.length).toBeGreaterThan(level1.length);
    });
  });

  describe("Grid snapping", () => {
    it("should snap to nearest grid position", () => {
      expect(snapToGrid(3.7, 5.2)).toEqual({ x: 2, z: 4 });
      expect(snapToGrid(0, 0)).toEqual({ x: 0, z: 0 });
      expect(snapToGrid(4, 6)).toEqual({ x: 4, z: 6 });
    });

    it("should handle negative coordinates", () => {
      const result = snapToGrid(-3.5, -1.2);
      expect(result.x).toBe(-4);
      expect(result.z).toBe(-2);
    });
  });

  describe("Spacing conflict", () => {
    it("should detect structures too close together", () => {
      const existing = [{ templateId: "barn", worldX: 0, worldZ: 0 }];
      expect(hasSpacingConflict({ x: 1, z: 1 }, existing)).toBe(true);
    });

    it("should allow structures with enough spacing", () => {
      const existing = [{ templateId: "barn", worldX: 0, worldZ: 0 }];
      expect(hasSpacingConflict({ x: 10, z: 10 }, existing)).toBe(false);
    });

    it("should allow placement with no existing structures", () => {
      expect(hasSpacingConflict({ x: 5, z: 5 }, [])).toBe(false);
    });
  });

  describe("Placement validation", () => {
    it("should allow valid placement", () => {
      const result = canPlace(
        "campfire-1",
        { x: 10, z: 10 },
        5,
        { timber: 100, sap: 100, fruit: 100, acorns: 100 },
        [],
      );
      expect(result.valid).toBe(true);
    });

    it("should reject unknown structure", () => {
      const result = canPlace("fake", { x: 0, z: 0 }, 99, {}, []);
      expect(result.valid).toBe(false);
      expect(result.reason).toBe("Unknown structure");
    });

    it("should reject if player level too low", () => {
      const result = canPlace(
        "barn",
        { x: 10, z: 10 },
        1,
        { timber: 100, sap: 100, fruit: 100, acorns: 100 },
        [],
      );
      expect(result.valid).toBe(false);
      expect(result.reason).toContain("level");
    });

    it("should reject if not enough resources", () => {
      const result = canPlace(
        "campfire-1",
        { x: 10, z: 10 },
        5,
        { timber: 0 },
        [],
      );
      expect(result.valid).toBe(false);
      expect(result.reason).toContain("Not enough");
    });

    it("should reject if too close to existing structure", () => {
      const result = canPlace(
        "campfire-1",
        { x: 1, z: 1 },
        5,
        { timber: 100 },
        [{ templateId: "barn", worldX: 0, worldZ: 0 }],
      );
      expect(result.valid).toBe(false);
      expect(result.reason).toContain("Too close");
    });
  });

  describe("Build cost deduction", () => {
    it("should deduct build costs from resources", () => {
      const def = getStructureById("campfire-1");
      expect(def).toBeDefined();
      const result = deductBuildCost(def!, { timber: 20, sap: 10 });
      expect(result.timber).toBe(15);
      expect(result.sap).toBe(10);
    });
  });

  describe("Effect system", () => {
    it("should find effects within radius", () => {
      const structures = [{ templateId: "water-well", worldX: 0, worldZ: 0 }];
      const effects = getActiveEffects({ x: 2, z: 2 }, structures);
      expect(effects.length).toBe(1);
      expect(effects[0].effectType).toBe("growth_boost");
    });

    it("should not include effects outside radius", () => {
      const structures = [{ templateId: "water-well", worldX: 0, worldZ: 0 }];
      const effects = getActiveEffects({ x: 100, z: 100 }, structures);
      expect(effects.length).toBe(0);
    });

    it("should sum total effect magnitude", () => {
      const structures = [
        { templateId: "water-well", worldX: 0, worldZ: 0 },
        { templateId: "bird-house", worldX: 2, worldZ: 0 },
      ];
      const total = getTotalEffect("growth_boost", { x: 1, z: 0 }, structures);
      expect(total).toBeGreaterThan(0);
    });
  });
});

// ---------------------------------------------------------------------------
// Chunk-based world-gen structure placement (Spec §18, §17.1)
// ---------------------------------------------------------------------------

import { spawnChunkStructures } from "@/game/systems/structurePlacement";

const CHUNK_SIZE = 16;

function flatHeightmap(): Float32Array {
  return new Float32Array(CHUNK_SIZE * CHUNK_SIZE).fill(0);
}

describe("spawnChunkStructures (Spec §18, §17.1)", () => {
  it("returns an array for a known biome", () => {
    const result = spawnChunkStructures("TestSeed", 0, 0, "starting-grove", flatHeightmap());
    expect(Array.isArray(result)).toBe(true);
  });

  it("is deterministic for the same inputs", () => {
    const hm = flatHeightmap();
    const a = spawnChunkStructures("MySeed", 4, 7, "meadow", hm);
    const b = spawnChunkStructures("MySeed", 4, 7, "meadow", hm);
    expect(a.length).toBe(b.length);
    if (a.length > 0) {
      expect(a[0].position).toEqual(b[0].position);
      expect(a[0].structure.templateId).toBe(b[0].structure.templateId);
    }
  });

  it("placed structure templateId is in the biome's allowedIds", () => {
    // Use many chunk coords to find a chunk that spawns a structure
    const allowed = ["water-post", "bird-house", "campfire-1"]; // starting-grove
    for (let cx = 0; cx < 20; cx++) {
      const result = spawnChunkStructures("SearchSeed", cx, 0, "starting-grove", flatHeightmap());
      for (const sp of result) {
        expect(allowed).toContain(sp.structure.templateId);
      }
    }
  });

  it("structure positions are within chunk world bounds", () => {
    for (let cx = 0; cx < 30; cx++) {
      const result = spawnChunkStructures("BoundSeed", cx, 2, "orchard-valley", flatHeightmap());
      for (const sp of result) {
        expect(sp.position.x).toBeGreaterThanOrEqual(cx * CHUNK_SIZE);
        expect(sp.position.x).toBeLessThan((cx + 1) * CHUNK_SIZE);
        expect(sp.position.z).toBeGreaterThanOrEqual(2 * CHUNK_SIZE);
        expect(sp.position.z).toBeLessThan(3 * CHUNK_SIZE);
      }
    }
  });

  it("structure has required StructureComponent fields", () => {
    for (let cx = 0; cx < 30; cx++) {
      const result = spawnChunkStructures("FieldSeed", cx, 0, "starting-grove", flatHeightmap());
      for (const sp of result) {
        expect(sp.structure.templateId).toBeTruthy();
        expect(sp.structure.modelPath).toBeTruthy();
        expect(sp.structure.category).toBeTruthy();
        expect(typeof sp.structure.level).toBe("number");
        expect(Array.isArray(sp.structure.buildCost)).toBe(true);
      }
    }
  });

  it("returns empty array for frozen-peaks biome with low probability across most chunks", () => {
    // frozen-peaks probability is 0.05 — very few chunks should have a structure
    let spawnCount = 0;
    for (let cx = 0; cx < 10; cx++) {
      const result = spawnChunkStructures("FreezeSeed", cx, 0, "frozen-peaks", flatHeightmap());
      spawnCount += result.length;
    }
    // At 5% probability, 10 chunks → expected ~0.5 — most runs will have 0 or 1
    expect(spawnCount).toBeLessThanOrEqual(3);
  });

  it("falls back to starting-grove template for unknown biome", () => {
    // Should not throw
    const result = spawnChunkStructures("FallbackSeed", 0, 0, "unknown-biome", flatHeightmap());
    expect(Array.isArray(result)).toBe(true);
  });
});
