/**
 * chunkPersistence tests (Spec §26.2)
 *
 * Verifies delta-only chunk storage: only modified chunks are saved,
 * unmodified chunks cost zero storage, and applying a diff restores
 * player-planted trees to the ECS world.
 */

import { world } from "@/game/ecs/world";
import {
  applyChunkDiff,
  type ChunkDiff,
  chunkDiffs$,
  clearAllChunkDiffs,
  clearChunkDiff,
  isChunkModified,
  loadChunkDiff,
  type PlantedCrop,
  type PlantedTree,
  recordPlantedCrop,
  recordPlantedTree,
  saveChunkDiff,
  updateCropInDiff,
} from "./chunkPersistence";

const CHUNK_SIZE = 16; // matches config/game/grid.json chunkSize

function makeTree(overrides?: Partial<PlantedTree>): PlantedTree {
  return {
    localX: 2,
    localZ: 3,
    speciesId: "white-oak",
    stage: 0,
    progress: 0,
    plantedAt: 1000,
    meshSeed: 42,
    ...overrides,
  };
}

describe("chunkPersistence (Spec §26.2)", () => {
  beforeEach(() => {
    clearAllChunkDiffs();
    // Clean ECS world between tests
    for (const entity of [...world.entities]) {
      world.remove(entity);
    }
  });

  // ─── isChunkModified ───────────────────────────────────────────────────────

  describe("isChunkModified", () => {
    it("returns false for an unmodified chunk", () => {
      expect(isChunkModified("0,0")).toBe(false);
    });

    it("returns true after saving a diff", () => {
      saveChunkDiff("0,0", { plantedTrees: [] });
      expect(isChunkModified("0,0")).toBe(true);
    });

    it("returns false after the diff is cleared", () => {
      saveChunkDiff("0,0", { plantedTrees: [] });
      clearChunkDiff("0,0");
      expect(isChunkModified("0,0")).toBe(false);
    });
  });

  // ─── loadChunkDiff ─────────────────────────────────────────────────────────

  describe("loadChunkDiff", () => {
    it("returns null for an unmodified chunk", () => {
      expect(loadChunkDiff("0,0")).toBeNull();
    });

    it("returns the stored diff after saving", () => {
      const diff: ChunkDiff = { plantedTrees: [makeTree()] };
      saveChunkDiff("0,0", diff);
      expect(loadChunkDiff("0,0")).toEqual(diff);
    });

    it("returns null for a key that was never saved", () => {
      saveChunkDiff("1,0", { plantedTrees: [] });
      expect(loadChunkDiff("99,99")).toBeNull();
    });
  });

  // ─── saveChunkDiff ─────────────────────────────────────────────────────────

  describe("saveChunkDiff", () => {
    it("stores and retrieves a diff round-trip", () => {
      const diff: ChunkDiff = { plantedTrees: [makeTree({ speciesId: "pine" })] };
      saveChunkDiff("2,3", diff);
      expect(loadChunkDiff("2,3")).toEqual(diff);
    });

    it("overwrites a previous diff for the same key", () => {
      saveChunkDiff("0,0", { plantedTrees: [makeTree()] });
      const newDiff: ChunkDiff = { plantedTrees: [] };
      saveChunkDiff("0,0", newDiff);
      expect(loadChunkDiff("0,0")).toEqual(newDiff);
    });

    it("does not affect other chunk keys", () => {
      saveChunkDiff("1,0", { plantedTrees: [makeTree()] });
      expect(loadChunkDiff("0,0")).toBeNull();
      expect(loadChunkDiff("2,0")).toBeNull();
    });
  });

  // ─── clearChunkDiff ────────────────────────────────────────────────────────

  describe("clearChunkDiff", () => {
    it("removes the diff for a specific chunk", () => {
      saveChunkDiff("0,0", { plantedTrees: [makeTree()] });
      clearChunkDiff("0,0");
      expect(loadChunkDiff("0,0")).toBeNull();
    });

    it("does not affect other chunks when clearing one", () => {
      saveChunkDiff("0,0", { plantedTrees: [makeTree()] });
      saveChunkDiff("1,0", { plantedTrees: [makeTree()] });
      clearChunkDiff("0,0");
      expect(loadChunkDiff("1,0")).not.toBeNull();
    });

    it("is a no-op for a chunk that was never modified", () => {
      expect(() => clearChunkDiff("99,99")).not.toThrow();
      expect(loadChunkDiff("99,99")).toBeNull();
    });
  });

  // ─── clearAllChunkDiffs ────────────────────────────────────────────────────

  describe("clearAllChunkDiffs", () => {
    it("removes all stored diffs", () => {
      saveChunkDiff("0,0", { plantedTrees: [makeTree()] });
      saveChunkDiff("1,0", { plantedTrees: [makeTree()] });
      saveChunkDiff("-1,2", { plantedTrees: [makeTree()] });
      clearAllChunkDiffs();
      expect(loadChunkDiff("0,0")).toBeNull();
      expect(loadChunkDiff("1,0")).toBeNull();
      expect(loadChunkDiff("-1,2")).toBeNull();
    });

    it("leaves the observable with no keys", () => {
      saveChunkDiff("0,0", { plantedTrees: [makeTree()] });
      saveChunkDiff("5,5", { plantedTrees: [makeTree()] });
      clearAllChunkDiffs();
      expect(Object.keys(chunkDiffs$.peek())).toHaveLength(0);
    });
  });

  // ─── recordPlantedTree ─────────────────────────────────────────────────────

  describe("recordPlantedTree", () => {
    it("creates a diff for an unmodified chunk on first plant", () => {
      expect(isChunkModified("0,0")).toBe(false);
      recordPlantedTree("0,0", makeTree());
      expect(isChunkModified("0,0")).toBe(true);
    });

    it("stores the tree in the chunk diff", () => {
      const tree = makeTree({ speciesId: "white-oak" });
      recordPlantedTree("0,0", tree);
      expect(loadChunkDiff("0,0")?.plantedTrees).toContainEqual(tree);
    });

    it("accumulates multiple trees in the same chunk", () => {
      recordPlantedTree("0,0", makeTree({ localX: 1 }));
      recordPlantedTree("0,0", makeTree({ localX: 2 }));
      recordPlantedTree("0,0", makeTree({ localX: 3 }));
      expect(loadChunkDiff("0,0")?.plantedTrees).toHaveLength(3);
    });

    it("preserves all tree fields in the diff", () => {
      const tree = makeTree({ speciesId: "pine", stage: 2, progress: 0.5, meshSeed: 77 });
      recordPlantedTree("0,0", tree);
      const stored = loadChunkDiff("0,0")?.plantedTrees[0];
      expect(stored).toEqual(tree);
    });
  });

  // ─── Zero storage for unmodified chunks ────────────────────────────────────

  describe("zero storage for unmodified chunks", () => {
    it("has no entries in chunkDiffs$ at startup", () => {
      expect(Object.keys(chunkDiffs$.peek())).toHaveLength(0);
    });

    it("stores entries only for modified chunks", () => {
      saveChunkDiff("3,4", { plantedTrees: [makeTree()] });
      const keys = Object.keys(chunkDiffs$.peek());
      expect(keys).toHaveLength(1);
      expect(keys[0]).toBe("3,4");
    });

    it("after clearAllChunkDiffs, storage is empty", () => {
      saveChunkDiff("0,0", { plantedTrees: [makeTree()] });
      clearAllChunkDiffs();
      expect(Object.keys(chunkDiffs$.peek())).toHaveLength(0);
    });
  });

  // ─── applyChunkDiff ────────────────────────────────────────────────────────

  describe("applyChunkDiff", () => {
    it("does nothing if the chunk has no diff", () => {
      const before = world.entities.length;
      applyChunkDiff("0,0", 0, 0);
      expect(world.entities.length).toBe(before);
    });

    it("spawns one tree entity per stored planted tree", () => {
      recordPlantedTree("0,0", makeTree({ localX: 4, localZ: 5 }));
      const before = world.entities.length;
      applyChunkDiff("0,0", 0, 0);
      expect(world.entities.length).toBe(before + 1);
    });

    it("spawns multiple entities for multiple planted trees", () => {
      recordPlantedTree("0,0", makeTree({ localX: 1 }));
      recordPlantedTree("0,0", makeTree({ localX: 2 }));
      applyChunkDiff("0,0", 0, 0);
      expect(world.with("tree").entities.length).toBe(2);
    });

    it("places the tree at the correct world-space position", () => {
      const localX = 4;
      const localZ = 7;
      const chunkX = 2;
      const chunkZ = -1;
      recordPlantedTree("2,-1", makeTree({ localX, localZ }));
      applyChunkDiff("2,-1", chunkX, chunkZ);
      const trees = world.with("tree", "position").entities;
      const planted = trees.find(
        (e) =>
          e.position?.x === chunkX * CHUNK_SIZE + localX &&
          e.position?.z === chunkZ * CHUNK_SIZE + localZ,
      );
      expect(planted).toBeDefined();
    });

    it("restores speciesId from the diff", () => {
      recordPlantedTree("0,0", makeTree({ speciesId: "silver-maple" }));
      applyChunkDiff("0,0", 0, 0);
      const found = world.with("tree").entities.find(
        (e) => e.tree?.speciesId === "silver-maple",
      );
      expect(found).toBeDefined();
    });

    it("restores stage and progress from the diff", () => {
      recordPlantedTree("0,0", makeTree({ stage: 3, progress: 0.75 }));
      applyChunkDiff("0,0", 0, 0);
      const tree = world.with("tree").entities[0];
      expect(tree?.tree?.stage).toBe(3);
      expect(tree?.tree?.progress).toBe(0.75);
    });

    it("round-trip: plant → unload → reload → tree in world", () => {
      const chunkKey = "0,0";
      const tree = makeTree({ speciesId: "white-oak", localX: 8, localZ: 8 });

      // Player plants a tree
      recordPlantedTree(chunkKey, tree);

      // Simulate chunk unload (remove all ECS entities)
      for (const entity of [...world.entities]) {
        world.remove(entity);
      }
      expect(world.entities.length).toBe(0);

      // Player returns to chunk — apply stored diff
      applyChunkDiff(chunkKey, 0, 0);

      // Tree should be restored
      const trees = world.with("tree").entities;
      expect(trees.length).toBe(1);
      expect(trees[0].tree?.speciesId).toBe("white-oak");
    });
  });
});

// ---------------------------------------------------------------------------
// Crop persistence (Spec §8)
// ---------------------------------------------------------------------------

function makeCrop(overrides?: Partial<PlantedCrop>): PlantedCrop {
  return {
    localX: 3,
    localZ: 4,
    cropId: "carrot",
    stage: 0,
    progress: 0,
    watered: false,
    ...overrides,
  };
}

describe("chunkPersistence — crops (Spec §8)", () => {
  beforeEach(() => {
    clearAllChunkDiffs();
    for (const entity of [...world.entities]) {
      world.remove(entity);
    }
  });

  // ─── recordPlantedCrop ───────────────────────────────────────────────────

  describe("recordPlantedCrop", () => {
    it("creates a diff entry on first crop plant", () => {
      recordPlantedCrop("0,0", makeCrop());
      expect(isChunkModified("0,0")).toBe(true);
    });

    it("stores the crop in plantedCrops array", () => {
      const crop = makeCrop({ cropId: "tomato", localX: 1, localZ: 2 });
      recordPlantedCrop("0,0", crop);
      expect(loadChunkDiff("0,0")?.plantedCrops).toContainEqual(crop);
    });

    it("accumulates multiple crops in the same chunk", () => {
      recordPlantedCrop("0,0", makeCrop({ localX: 1 }));
      recordPlantedCrop("0,0", makeCrop({ localX: 2 }));
      expect(loadChunkDiff("0,0")?.plantedCrops).toHaveLength(2);
    });

    it("preserves existing plantedTrees when adding a crop", () => {
      recordPlantedTree("0,0", makeTree());
      recordPlantedCrop("0,0", makeCrop());
      const diff = loadChunkDiff("0,0");
      expect(diff?.plantedTrees).toHaveLength(1);
      expect(diff?.plantedCrops).toHaveLength(1);
    });
  });

  // ─── updateCropInDiff ────────────────────────────────────────────────────

  describe("updateCropInDiff", () => {
    it("updates stage and progress for a matching crop", () => {
      recordPlantedCrop("0,0", makeCrop({ localX: 3, localZ: 4 }));
      updateCropInDiff("0,0", 3, 4, 2, 0.75, false);
      const stored = loadChunkDiff("0,0")?.plantedCrops?.[0];
      expect(stored?.stage).toBe(2);
      expect(stored?.progress).toBe(0.75);
    });

    it("is a no-op when no crop at the given position", () => {
      recordPlantedCrop("0,0", makeCrop({ localX: 1, localZ: 1 }));
      updateCropInDiff("0,0", 9, 9, 3, 1, false);
      const stored = loadChunkDiff("0,0")?.plantedCrops?.[0];
      expect(stored?.localX).toBe(1); // unchanged
    });

    it("is a no-op for a chunk with no diff", () => {
      expect(() => updateCropInDiff("99,99", 0, 0, 1, 0.5, false)).not.toThrow();
    });
  });

  // ─── applyChunkDiff — crops ──────────────────────────────────────────────

  describe("applyChunkDiff with crops", () => {
    it("spawns a crop entity per stored planted crop", () => {
      recordPlantedCrop("0,0", makeCrop({ localX: 2, localZ: 3 }));
      const before = world.entities.length;
      applyChunkDiff("0,0", 0, 0);
      expect(world.entities.length).toBe(before + 1);
    });

    it("restores crop fields correctly", () => {
      recordPlantedCrop("0,0", makeCrop({ cropId: "tomato", stage: 2, progress: 0.6 }));
      applyChunkDiff("0,0", 0, 0);
      const crop = world.with("crop").entities[0];
      expect(crop?.crop?.cropId).toBe("tomato");
      expect(crop?.crop?.stage).toBe(2);
      expect(crop?.crop?.progress).toBe(0.6);
    });

    it("places the crop at the correct world-space position", () => {
      const chunkX = 1;
      const chunkZ = 2;
      recordPlantedCrop("1,2", makeCrop({ localX: 5, localZ: 6 }));
      applyChunkDiff("1,2", chunkX, chunkZ);
      const crop = world.with("crop", "position").entities[0];
      expect(crop?.position?.x).toBe(chunkX * CHUNK_SIZE + 5);
      expect(crop?.position?.z).toBe(chunkZ * CHUNK_SIZE + 6);
    });

    it("skips crops with unknown cropId gracefully", () => {
      saveChunkDiff("0,0", {
        plantedTrees: [],
        plantedCrops: [{ localX: 0, localZ: 0, cropId: "banana" as never, stage: 0, progress: 0, watered: false }],
      });
      const before = world.entities.length;
      expect(() => applyChunkDiff("0,0", 0, 0)).not.toThrow();
      expect(world.entities.length).toBe(before); // no entity added
    });

    it("round-trip: plant crop → unload → reload → crop in world", () => {
      const chunkKey = "2,3";
      recordPlantedCrop(chunkKey, makeCrop({ cropId: "pumpkin", stage: 1, progress: 0.4 }));

      for (const entity of [...world.entities]) world.remove(entity);

      applyChunkDiff(chunkKey, 2, 3);

      const crops = world.with("crop").entities;
      expect(crops.length).toBe(1);
      expect(crops[0].crop?.cropId).toBe("pumpkin");
      expect(crops[0].crop?.stage).toBe(1);
    });
  });
});
