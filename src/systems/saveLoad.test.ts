import { beforeEach, describe, expect, it } from "vitest";
import { destroyAllEntitiesExceptWorld, koota } from "@/koota";
import { spawnGridCell, spawnTree } from "@/startup";
import { GridCell, Position, Tree } from "@/traits";
import {
  deserializeGrove,
  type GroveSaveData,
  serializeGrove,
} from "./saveLoad";

describe("Save/Load System", () => {
  beforeEach(() => {
    destroyAllEntitiesExceptWorld();
  });

  describe("serializeGrove", () => {
    it("serializes tree entities", () => {
      const tree = spawnTree(3, 5, "white-oak");
      const t = tree.get(Tree);
      tree.set(Tree, {
        ...t,
        stage: 2,
        progress: 0.6,
        watered: true,
        totalGrowthTime: 120,
      });

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
      spawnGridCell(0, 0, "soil");
      spawnGridCell(1, 0, "water");

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

      const trees = Array.from(koota.query(Tree, Position));
      expect(trees).toHaveLength(1);
      const t = trees[0].get(Tree);
      const p = trees[0].get(Position);
      expect(t.speciesId).toBe("white-oak");
      expect(t.stage).toBe(3);
      expect(t.progress).toBeCloseTo(0.4);
      expect(p.x).toBe(3);
      expect(p.z).toBe(5);
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

      const cells = Array.from(koota.query(GridCell, Position));
      expect(cells).toHaveLength(2);
    });

    it("clears existing entities before loading", () => {
      spawnTree(0, 0, "white-oak");
      spawnTree(1, 1, "white-oak");

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

      const trees = Array.from(koota.query(Tree, Position));
      expect(trees).toHaveLength(1);
      expect(trees[0].get(Tree).speciesId).toBe("elder-pine");
    });

    it("round-trips correctly (serialize then deserialize)", () => {
      const tree = spawnTree(7, 9, "cherry-blossom");
      const t = tree.get(Tree);
      tree.set(Tree, {
        ...t,
        stage: 3,
        progress: 0.75,
        watered: true,
        totalGrowthTime: 300,
      });

      spawnGridCell(7, 9, "soil");

      const saved = serializeGrove(12, "round-trip");

      // Clear and reload
      destroyAllEntitiesExceptWorld();

      deserializeGrove(saved);

      const trees = Array.from(koota.query(Tree, Position));
      expect(trees).toHaveLength(1);
      const t2 = trees[0].get(Tree);
      expect(t2.speciesId).toBe("cherry-blossom");
      expect(t2.stage).toBe(3);
      expect(t2.progress).toBeCloseTo(0.75);
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

      const cells = Array.from(koota.query(GridCell, Position));
      const occupiedCell = cells.find((c) => {
        const gc = c.get(GridCell);
        return gc.gridX === 3 && gc.gridZ === 5;
      });
      expect(occupiedCell).toBeDefined();
      const gc = occupiedCell?.get(GridCell);
      expect(gc?.occupied).toBe(true);
      expect(gc?.treeEntity).toBeTruthy();
    });
  });
});
