import { describe, it, expect, beforeEach } from "vitest";
import { getStageScale, calcGrowthRate, growthSystem } from "./growth";
import { world } from "../ecs/world";
import { createTreeEntity } from "../ecs/archetypes";

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
  });
});
