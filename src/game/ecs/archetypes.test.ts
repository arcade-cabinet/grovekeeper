import { describe, it, expect } from "vitest";
import { createTreeEntity, restoreTreeEntity, createGridCellEntity, createPlayerEntity } from "./archetypes";
import { getStageScale } from "../systems/growth";
import type { SerializedTree } from "../stores/gameStore";

describe("archetypes", () => {
  describe("createTreeEntity", () => {
    it("creates a tree at the specified grid position", () => {
      const tree = createTreeEntity(3, 5, "white-oak");
      expect(tree.position).toEqual({ x: 3, y: 0, z: 5 });
      expect(tree.tree?.speciesId).toBe("white-oak");
      expect(tree.tree?.stage).toBe(0);
      expect(tree.tree?.progress).toBe(0);
    });

    it("assigns a deterministic meshSeed", () => {
      const tree1 = createTreeEntity(3, 5, "white-oak");
      const tree2 = createTreeEntity(3, 5, "white-oak");
      expect(tree1.tree?.meshSeed).toBe(tree2.tree?.meshSeed);
    });

    it("generates unique entity IDs", () => {
      const tree1 = createTreeEntity(0, 0, "white-oak");
      const tree2 = createTreeEntity(0, 0, "white-oak");
      expect(tree1.id).not.toBe(tree2.id);
    });
  });

  describe("restoreTreeEntity", () => {
    const savedTree: SerializedTree = {
      speciesId: "elder-pine",
      gridX: 7,
      gridZ: 4,
      stage: 3,
      progress: 0.65,
      watered: true,
      totalGrowthTime: 120.5,
      plantedAt: 1700000000000,
      meshSeed: 42,
    };

    it("restores all tree component fields", () => {
      const entity = restoreTreeEntity(savedTree);
      expect(entity.tree).toEqual({
        speciesId: "elder-pine",
        stage: 3,
        progress: 0.65,
        watered: true,
        totalGrowthTime: 120.5,
        plantedAt: 1700000000000,
        meshSeed: 42,
      });
    });

    it("places entity at the saved grid position", () => {
      const entity = restoreTreeEntity(savedTree);
      expect(entity.position).toEqual({ x: 7, y: 0, z: 4 });
    });

    it("creates a renderable with correct scale for the stage", () => {
      const entity = restoreTreeEntity(savedTree);
      expect(entity.renderable).toBeDefined();
      expect(entity.renderable?.visible).toBe(true);
      expect(entity.renderable?.scale).toBe(getStageScale(savedTree.stage, savedTree.progress));
    });

    it("generates a unique entity ID", () => {
      const e1 = restoreTreeEntity(savedTree);
      const e2 = restoreTreeEntity(savedTree);
      expect(e1.id).not.toBe(e2.id);
    });

    it("preserves stage 0 (seed) correctly", () => {
      const seedData: SerializedTree = {
        ...savedTree,
        stage: 0,
        progress: 0.1,
      };
      const entity = restoreTreeEntity(seedData);
      expect(entity.tree?.stage).toBe(0);
      expect(entity.tree?.progress).toBe(0.1);
    });
  });

  describe("createPlayerEntity", () => {
    it("creates player at grid center", () => {
      const player = createPlayerEntity();
      expect(player.id).toBe("player");
      expect(player.position).toEqual({ x: 6, y: 0, z: 6 });
    });
  });

  describe("createGridCellEntity", () => {
    it("creates a soil cell by default", () => {
      const cell = createGridCellEntity(2, 3);
      expect(cell.gridCell?.type).toBe("soil");
      expect(cell.gridCell?.occupied).toBe(false);
    });
  });
});
