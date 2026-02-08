import { beforeEach, describe, expect, it } from "vitest";
import { createGridCellEntity, createTreeEntity } from "../ecs/archetypes";
import { gridCellsQuery, treesQuery, world } from "../ecs/world";
import {
  deserializeGrove,
  type GroveSaveData,
  serializeGrove,
} from "./saveLoad";

describe("Save/Load System", () => {
  beforeEach(() => {
    for (const entity of [...world]) {
      world.remove(entity);
    }
  });

  describe("serializeGrove", () => {
    it("serializes tree entities", () => {
      const tree = createTreeEntity(3, 5, "white-oak");
      tree.tree!.stage = 2;
      tree.tree!.progress = 0.6;
      tree.tree!.watered = true;
      tree.tree!.totalGrowthTime = 120;
      world.add(tree);

      const data = serializeGrove(12, "test-seed");

      expect(data.trees).toHaveLength(1);
      expect(data.trees[0].col).toBe(3);
      expect(data.trees[0].row).toBe(5);
      expect(data.trees[0].speciesId).toBe("white-oak");
      expect(data.trees[0].stage).toBe(2);
      expect(data.trees[0].progress).toBeCloseTo(0.6);
      expect(data.trees[0].watered).toBe(true);
    });

    it("serializes grid tiles", () => {
      world.add(createGridCellEntity(0, 0, "soil"));
      world.add(createGridCellEntity(1, 0, "water"));

      const data = serializeGrove(12, "test-seed");

      expect(data.tiles).toHaveLength(2);
    });

    it("includes grid metadata", () => {
      const data = serializeGrove(12, "my-seed");
      expect(data.gridSize).toBe(12);
      expect(data.seed).toBe("my-seed");
      expect(data.version).toBe(1);
    });
  });

  describe("deserializeGrove", () => {
    it("recreates tree entities from save data", () => {
      const saveData: GroveSaveData = {
        version: 1,
        timestamp: Date.now(),
        gridSize: 12,
        seed: "test",
        tiles: [{ col: 3, row: 5, type: "soil" }],
        trees: [
          {
            col: 3,
            row: 5,
            speciesId: "white-oak",
            meshSeed: 12345,
            stage: 3,
            progress: 0.4,
            watered: false,
            totalGrowthTime: 200,
            plantedAt: 1000000,
          },
        ],
      };

      deserializeGrove(saveData);

      const trees = [...treesQuery];
      expect(trees).toHaveLength(1);
      expect(trees[0].tree!.speciesId).toBe("white-oak");
      expect(trees[0].tree!.stage).toBe(3);
      expect(trees[0].tree!.progress).toBeCloseTo(0.4);
      expect(trees[0].position!.x).toBe(3);
      expect(trees[0].position!.z).toBe(5);
    });

    it("recreates grid cell entities from save data", () => {
      const saveData: GroveSaveData = {
        version: 1,
        timestamp: Date.now(),
        gridSize: 12,
        seed: "test",
        tiles: [
          { col: 0, row: 0, type: "soil" },
          { col: 1, row: 0, type: "water" },
        ],
        trees: [],
      };

      deserializeGrove(saveData);

      const cells = [...gridCellsQuery];
      expect(cells).toHaveLength(2);
    });

    it("clears existing entities before loading", () => {
      world.add(createTreeEntity(0, 0, "white-oak"));
      world.add(createTreeEntity(1, 1, "white-oak"));

      const saveData: GroveSaveData = {
        version: 1,
        timestamp: Date.now(),
        gridSize: 12,
        seed: "test",
        tiles: [],
        trees: [
          {
            col: 5,
            row: 5,
            speciesId: "elder-pine",
            meshSeed: 99,
            stage: 1,
            progress: 0.2,
            watered: false,
            totalGrowthTime: 30,
            plantedAt: 1000000,
          },
        ],
      };

      deserializeGrove(saveData);

      const trees = [...treesQuery];
      expect(trees).toHaveLength(1);
      expect(trees[0].tree!.speciesId).toBe("elder-pine");
    });

    it("round-trips correctly (serialize then deserialize)", () => {
      const tree = createTreeEntity(7, 9, "cherry-blossom");
      tree.tree!.stage = 3;
      tree.tree!.progress = 0.75;
      tree.tree!.watered = true;
      tree.tree!.totalGrowthTime = 300;
      world.add(tree);

      world.add(createGridCellEntity(7, 9, "soil"));

      const saved = serializeGrove(12, "round-trip");

      // Clear and reload
      for (const entity of [...world]) {
        world.remove(entity);
      }

      deserializeGrove(saved);

      const trees = [...treesQuery];
      expect(trees).toHaveLength(1);
      expect(trees[0].tree!.speciesId).toBe("cherry-blossom");
      expect(trees[0].tree!.stage).toBe(3);
      expect(trees[0].tree!.progress).toBeCloseTo(0.75);
    });

    it("marks grid cells as occupied when trees exist on them", () => {
      const saveData: GroveSaveData = {
        version: 1,
        timestamp: Date.now(),
        gridSize: 12,
        seed: "test",
        tiles: [{ col: 3, row: 5, type: "soil" }],
        trees: [
          {
            col: 3,
            row: 5,
            speciesId: "white-oak",
            meshSeed: 12345,
            stage: 2,
            progress: 0.5,
            watered: false,
            totalGrowthTime: 100,
            plantedAt: 1000000,
          },
        ],
      };

      deserializeGrove(saveData);

      const cells = [...gridCellsQuery];
      const occupiedCell = cells.find(
        (c) => c.gridCell!.gridX === 3 && c.gridCell!.gridZ === 5,
      );
      expect(occupiedCell?.gridCell!.occupied).toBe(true);
      expect(occupiedCell?.gridCell!.treeEntityId).toBeTruthy();
    });
  });
});
