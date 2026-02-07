import { describe, it, expect, beforeEach } from "vitest";
import { getStageScale, calcGrowthRate, growthSystem } from "./growth";
import { world } from "../ecs/world";
import { createTreeEntity, createGridCellEntity } from "../ecs/archetypes";

describe("Growth System (5-Stage)", () => {
  beforeEach(() => {
    for (const entity of [...world]) {
      world.remove(entity);
    }
  });

  describe("getStageScale", () => {
    it("returns 0.08 for Seed (stage 0)", () => {
      expect(getStageScale(0, 0)).toBe(0.08);
    });

    it("returns 0.15 for Sprout (stage 1) at 0 progress", () => {
      expect(getStageScale(1, 0)).toBeCloseTo(0.15);
    });

    it("interpolates partially toward next stage", () => {
      // At stage 1 with 0.5 progress, should be between 0.15 and 0.4
      const scale = getStageScale(1, 0.5);
      expect(scale).toBeGreaterThan(0.15);
      expect(scale).toBeLessThan(0.4);
    });

    it("returns 1.2 for Old Growth (stage 4)", () => {
      expect(getStageScale(4, 0)).toBeCloseTo(1.2);
    });
  });

  describe("calcGrowthRate", () => {
    it("returns positive rate for spring with easy tree", () => {
      const rate = calcGrowthRate({
        baseTime: 15,
        difficulty: 1,
        season: "spring",
        watered: false,
        evergreen: false,
      });
      expect(rate).toBeGreaterThan(0);
    });

    it("returns 0 for non-evergreen in winter", () => {
      const rate = calcGrowthRate({
        baseTime: 15,
        difficulty: 1,
        season: "winter",
        watered: false,
        evergreen: false,
      });
      expect(rate).toBe(0);
    });

    it("returns > 0 for evergreen in winter (0.3x)", () => {
      const rate = calcGrowthRate({
        baseTime: 15,
        difficulty: 1,
        season: "winter",
        watered: false,
        evergreen: true,
      });
      expect(rate).toBeGreaterThan(0);
    });

    it("watered trees grow faster (1.3x bonus)", () => {
      const dry = calcGrowthRate({
        baseTime: 15,
        difficulty: 1,
        season: "summer",
        watered: false,
        evergreen: false,
      });
      const wet = calcGrowthRate({
        baseTime: 15,
        difficulty: 1,
        season: "summer",
        watered: true,
        evergreen: false,
      });
      expect(wet / dry).toBeCloseTo(1.3);
    });

    it("harder trees grow slower", () => {
      const easy = calcGrowthRate({
        baseTime: 15,
        difficulty: 1,
        season: "summer",
        watered: false,
        evergreen: false,
      });
      const hard = calcGrowthRate({
        baseTime: 15,
        difficulty: 3,
        season: "summer",
        watered: false,
        evergreen: false,
      });
      expect(easy).toBeGreaterThan(hard);
    });

    it("spring gives 1.5x bonus", () => {
      const summer = calcGrowthRate({
        baseTime: 15,
        difficulty: 1,
        season: "summer",
        watered: false,
        evergreen: false,
      });
      const spring = calcGrowthRate({
        baseTime: 15,
        difficulty: 1,
        season: "spring",
        watered: false,
        evergreen: false,
      });
      expect(spring / summer).toBeCloseTo(1.5);
    });
  });

  describe("growthSystem integration", () => {
    it("increases progress over time", () => {
      const tree = createTreeEntity(0, 0, "white-oak");
      world.add(tree);

      growthSystem(1, "summer");

      expect(tree.tree!.progress).toBeGreaterThan(0);
    });

    it("advances stage when progress reaches 1", () => {
      const tree = createTreeEntity(0, 0, "white-oak");
      tree.tree!.progress = 0.99;
      tree.tree!.stage = 1;
      world.add(tree);

      // Large delta to push past 1.0
      growthSystem(100, "spring");

      expect(tree.tree!.stage).toBeGreaterThan(1);
      expect(tree.tree!.progress).toBeLessThan(1);
    });

    it("stops at max stage (4)", () => {
      const tree = createTreeEntity(0, 0, "white-oak");
      tree.tree!.stage = 4;
      tree.tree!.progress = 0.5;
      world.add(tree);

      growthSystem(1000, "spring");

      expect(tree.tree!.stage).toBe(4);
    });

    it("resets watered to false on stage advance", () => {
      const tree = createTreeEntity(0, 0, "white-oak");
      tree.tree!.stage = 1;
      tree.tree!.progress = 0.99;
      tree.tree!.watered = true;
      world.add(tree);

      growthSystem(100, "spring");

      expect(tree.tree!.watered).toBe(false);
    });

    it("updates renderable scale", () => {
      const tree = createTreeEntity(0, 0, "white-oak");
      tree.tree!.stage = 2;
      tree.tree!.progress = 0;
      world.add(tree);

      growthSystem(0, "summer");

      expect(tree.renderable!.scale).toBeCloseTo(0.4);
    });

    it("tracks totalGrowthTime", () => {
      const tree = createTreeEntity(0, 0, "white-oak");
      world.add(tree);

      growthSystem(5, "summer");

      expect(tree.tree!.totalGrowthTime).toBe(5);
    });

    it("fertilized tree grows at 2x speed", () => {
      const normalTree = createTreeEntity(0, 0, "white-oak");
      world.add(normalTree);

      const fertilizedTree = createTreeEntity(1, 0, "white-oak");
      fertilizedTree.tree!.fertilized = true;
      world.add(fertilizedTree);

      growthSystem(10, "summer");

      // Fertilized tree should have roughly 2x the progress
      expect(fertilizedTree.tree!.progress).toBeCloseTo(
        normalTree.tree!.progress * 2,
        1,
      );
    });

    it("fertilized flag clears on stage advance", () => {
      const tree = createTreeEntity(0, 0, "white-oak");
      tree.tree!.stage = 1;
      tree.tree!.progress = 0.99;
      tree.tree!.fertilized = true;
      world.add(tree);

      growthSystem(100, "spring");

      expect(tree.tree!.stage).toBeGreaterThan(1);
      expect(tree.tree!.fertilized).toBe(false);
    });

    it("weather multiplier parameter affects growth", () => {
      const tree = createTreeEntity(0, 0, "white-oak");
      world.add(tree);

      // Use small deltaTime to avoid stage wrapping
      growthSystem(0.5, "summer", 1);
      const clearProgress = tree.tree!.progress;

      tree.tree!.progress = 0;
      tree.tree!.stage = 0;
      growthSystem(0.5, "summer", 1.3);
      const rainProgress = tree.tree!.progress;

      expect(rainProgress / clearProgress).toBeCloseTo(1.3, 1);
    });

    it("drought weather multiplier slows growth", () => {
      const tree = createTreeEntity(0, 0, "white-oak");
      world.add(tree);

      growthSystem(0.5, "summer", 1);
      const clearProgress = tree.tree!.progress;

      tree.tree!.progress = 0;
      tree.tree!.stage = 0;
      growthSystem(0.5, "summer", 0.5);
      const droughtProgress = tree.tree!.progress;

      expect(droughtProgress / clearProgress).toBeCloseTo(0.5, 1);
    });

    it("progress clamps at 0.99 for max stage", () => {
      const tree = createTreeEntity(0, 0, "white-oak");
      // Start at stage 3 with near-complete progress so growthSystem
      // transitions to stage 4 and exercises the clamp path
      tree.tree!.stage = 3;
      tree.tree!.progress = 0.99;
      world.add(tree);

      growthSystem(1000, "spring");

      expect(tree.tree!.stage).toBe(4);
      expect(tree.tree!.progress).toBeLessThanOrEqual(0.99);
    });

    it("multiple trees grow independently in the same frame", () => {
      const tree1 = createTreeEntity(0, 0, "white-oak");
      world.add(tree1);
      const tree2 = createTreeEntity(2, 2, "elder-pine");
      world.add(tree2);

      // Use small deltaTime to stay within stage 0
      growthSystem(0.5, "summer");

      // Both trees should have progressed
      expect(tree1.tree!.progress).toBeGreaterThan(0);
      expect(tree2.tree!.progress).toBeGreaterThan(0);
    });

    it("tree with missing species data does not crash", () => {
      const tree = createTreeEntity(0, 0, "nonexistent-species");
      world.add(tree);

      // Should not throw
      expect(() => growthSystem(10, "summer")).not.toThrow();
    });
  });

  describe("calcGrowthRate edge cases", () => {
    it("returns 0 for baseTime of 0", () => {
      const rate = calcGrowthRate({
        baseTime: 0,
        difficulty: 1,
        season: "summer",
        watered: false,
        evergreen: false,
      });
      expect(rate).toBe(0);
    });

    it("returns 0 for negative baseTime", () => {
      const rate = calcGrowthRate({
        baseTime: -10,
        difficulty: 1,
        season: "summer",
        watered: false,
        evergreen: false,
      });
      expect(rate).toBe(0);
    });

    it("autumn season gives 0.8x rate", () => {
      const autumn = calcGrowthRate({
        baseTime: 15,
        difficulty: 1,
        season: "autumn",
        watered: false,
        evergreen: false,
      });
      const summer = calcGrowthRate({
        baseTime: 15,
        difficulty: 1,
        season: "summer",
        watered: false,
        evergreen: false,
      });
      expect(autumn / summer).toBeCloseTo(0.8, 5);
    });

    it("unknown season defaults to 1.0 multiplier", () => {
      const unknown = calcGrowthRate({
        baseTime: 15,
        difficulty: 1,
        season: "monsoon",
        watered: false,
        evergreen: false,
      });
      const summer = calcGrowthRate({
        baseTime: 15,
        difficulty: 1,
        season: "summer",
        watered: false,
        evergreen: false,
      });
      expect(unknown).toBeCloseTo(summer, 5);
    });

    it("ghost-birch has special winter rate of 0.5x", () => {
      const ghostBirch = calcGrowthRate({
        baseTime: 15,
        difficulty: 1,
        season: "winter",
        watered: false,
        evergreen: false,
        speciesId: "ghost-birch",
      });
      const summer = calcGrowthRate({
        baseTime: 15,
        difficulty: 1,
        season: "summer",
        watered: false,
        evergreen: false,
        speciesId: "ghost-birch",
      });
      expect(ghostBirch / summer).toBeCloseTo(0.5, 5);
    });

    it("evergreen winter rate is 0.3x", () => {
      const evergreen = calcGrowthRate({
        baseTime: 15,
        difficulty: 1,
        season: "winter",
        watered: false,
        evergreen: true,
      });
      const summer = calcGrowthRate({
        baseTime: 15,
        difficulty: 1,
        season: "summer",
        watered: false,
        evergreen: true,
      });
      expect(evergreen / summer).toBeCloseTo(0.3, 5);
    });
  });

  describe("getStageScale edge cases", () => {
    it("negative stage clamps to 0", () => {
      expect(getStageScale(-1, 0)).toBe(0.08);
    });

    it("stage above max clamps to max", () => {
      expect(getStageScale(10, 0)).toBe(1.2);
    });

    it("progress at 1 interpolates 30% toward next stage", () => {
      // At stage 0, progress 1: base=0.08, next=0.15
      // result = 0.08 + (0.15-0.08) * 1 * 0.3 = 0.08 + 0.021 = 0.101
      const scale = getStageScale(0, 1);
      expect(scale).toBeCloseTo(0.08 + 0.07 * 0.3, 3);
    });

    it("progress at 0.0 returns exact base scale", () => {
      expect(getStageScale(0, 0)).toBe(0.08);
      expect(getStageScale(1, 0)).toBe(0.15);
      expect(getStageScale(2, 0)).toBe(0.4);
      expect(getStageScale(3, 0)).toBe(0.8);
      expect(getStageScale(4, 0)).toBe(1.2);
    });
  });

  describe("species-specific growth bonuses", () => {
    it("silver-birch gets +20% growth near water tile", () => {
      // Place a water tile adjacent to the tree
      const waterCell = createGridCellEntity(1, 0, "water");
      world.add(waterCell);

      const birch = createTreeEntity(0, 0, "silver-birch");
      world.add(birch);

      const plainBirch = createTreeEntity(5, 5, "silver-birch");
      world.add(plainBirch);

      growthSystem(1, "summer");

      // Birch near water should grow 1.2x faster
      expect(birch.tree!.progress).toBeGreaterThan(0);
      expect(plainBirch.tree!.progress).toBeGreaterThan(0);
      expect(birch.tree!.progress / plainBirch.tree!.progress).toBeCloseTo(1.2, 1);
    });

    it("silver-birch does NOT get bonus from distant water", () => {
      // Water at (10, 10) is too far from tree at (0, 0)
      const waterCell = createGridCellEntity(10, 10, "water");
      world.add(waterCell);

      const birch = createTreeEntity(0, 0, "silver-birch");
      world.add(birch);

      const plainBirch = createTreeEntity(5, 5, "silver-birch");
      world.add(plainBirch);

      growthSystem(1, "summer");

      // Both should grow at the same rate (no water bonus)
      expect(birch.tree!.progress).toBeCloseTo(plainBirch.tree!.progress, 5);
    });

    it("mystic-fern gets +15% per adjacent tree (max +60%)", () => {
      const fern = createTreeEntity(5, 5, "mystic-fern");
      world.add(fern);

      // Add 2 adjacent trees
      const neighbor1 = createTreeEntity(4, 5, "white-oak");
      world.add(neighbor1);
      const neighbor2 = createTreeEntity(6, 5, "white-oak");
      world.add(neighbor2);

      // A lone fern for comparison
      const loneFern = createTreeEntity(20, 20, "mystic-fern");
      world.add(loneFern);

      growthSystem(1, "summer");

      // Fern with 2 neighbors: 1 + 2*0.15 = 1.3x
      expect(fern.tree!.progress / loneFern.tree!.progress).toBeCloseTo(1.3, 1);
    });

    it("mystic-fern bonus caps at +60% (4 neighbors)", () => {
      const fern = createTreeEntity(5, 5, "mystic-fern");
      world.add(fern);

      // Surround with 8 adjacent trees (all 8 neighbors)
      for (let dx = -1; dx <= 1; dx++) {
        for (let dz = -1; dz <= 1; dz++) {
          if (dx === 0 && dz === 0) continue;
          world.add(createTreeEntity(5 + dx, 5 + dz, "white-oak"));
        }
      }

      // A lone fern for comparison
      const loneFern = createTreeEntity(20, 20, "mystic-fern");
      world.add(loneFern);

      growthSystem(1, "summer");

      // 8 neighbors * 0.15 = 1.2, capped at 0.6 → 1.6x
      expect(fern.tree!.progress / loneFern.tree!.progress).toBeCloseTo(1.6, 1);
    });

    it("non-silver-birch does NOT get water bonus", () => {
      const waterCell = createGridCellEntity(1, 0, "water");
      world.add(waterCell);

      const oak = createTreeEntity(0, 0, "white-oak");
      world.add(oak);

      const farOak = createTreeEntity(5, 5, "white-oak");
      world.add(farOak);

      growthSystem(1, "summer");

      // White-oak should not get water bonus
      expect(oak.tree!.progress).toBeCloseTo(farOak.tree!.progress, 5);
    });

    it("non-mystic-fern does NOT get adjacency bonus", () => {
      const oak = createTreeEntity(5, 5, "white-oak");
      world.add(oak);

      // Add neighbors
      world.add(createTreeEntity(4, 5, "white-oak"));
      world.add(createTreeEntity(6, 5, "white-oak"));

      const loneOak = createTreeEntity(20, 20, "white-oak");
      world.add(loneOak);

      growthSystem(1, "summer");

      // White-oak should not get adjacency bonus
      expect(oak.tree!.progress).toBeCloseTo(loneOak.tree!.progress, 5);
    });
  });
});
