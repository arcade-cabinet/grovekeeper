import type { Entity } from "koota";
import { beforeEach, describe, expect, it } from "vitest";
import { destroyAllEntitiesExceptWorld } from "@/koota";
import { spawnGridCell, spawnTree } from "@/startup";
import { Renderable, Tree } from "@/traits";
import { calcGrowthRate, getStageScale, growthSystem } from "./growth";

function setTree(entity: Entity, patch: Partial<ReturnType<typeof Tree>[1]>): void {
  // biome-ignore lint/suspicious/noExplicitAny: schema shape passthrough
  entity.set(Tree, { ...entity.get(Tree), ...(patch as any) });
}

describe("Growth System (5-Stage)", () => {
  beforeEach(() => {
    destroyAllEntitiesExceptWorld();
  });

  describe("getStageScale", () => {
    it("returns 0.08 for Seed (stage 0)", () => {
      expect(getStageScale(0, 0)).toBe(0.08);
    });

    it("returns 0.15 for Sprout (stage 1) at 0 progress", () => {
      expect(getStageScale(1, 0)).toBeCloseTo(0.15);
    });

    it("interpolates partially toward next stage", () => {
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
      const tree = spawnTree(0, 0, "white-oak");

      growthSystem(1, "summer");

      expect(tree.get(Tree).progress).toBeGreaterThan(0);
    });

    it("advances stage when progress reaches 1", () => {
      const tree = spawnTree(0, 0, "white-oak");
      setTree(tree, { progress: 0.99, stage: 1 });

      growthSystem(100, "spring");

      const t = tree.get(Tree);
      expect(t.stage).toBeGreaterThan(1);
      expect(t.progress).toBeLessThan(1);
    });

    it("stops at max stage (4)", () => {
      const tree = spawnTree(0, 0, "white-oak");
      setTree(tree, { stage: 4, progress: 0.5 });

      growthSystem(1000, "spring");

      expect(tree.get(Tree).stage).toBe(4);
    });

    it("resets watered to false on stage advance", () => {
      const tree = spawnTree(0, 0, "white-oak");
      setTree(tree, { stage: 1, progress: 0.99, watered: true });

      growthSystem(100, "spring");

      expect(tree.get(Tree).watered).toBe(false);
    });

    it("updates renderable scale", () => {
      const tree = spawnTree(0, 0, "white-oak");
      setTree(tree, { stage: 2, progress: 0 });

      growthSystem(0, "summer");

      expect(tree.get(Renderable).scale).toBeCloseTo(0.4);
    });

    it("tracks totalGrowthTime", () => {
      const tree = spawnTree(0, 0, "white-oak");

      growthSystem(5, "summer");

      expect(tree.get(Tree).totalGrowthTime).toBe(5);
    });

    it("fertilized tree grows at 2x speed", () => {
      const normalTree = spawnTree(0, 0, "white-oak");

      const fertilizedTree = spawnTree(1, 0, "white-oak");
      setTree(fertilizedTree, { fertilized: true });

      growthSystem(10, "summer");

      expect(fertilizedTree.get(Tree).progress).toBeCloseTo(
        normalTree.get(Tree).progress * 2,
        1,
      );
    });

    it("fertilized flag clears on stage advance", () => {
      const tree = spawnTree(0, 0, "white-oak");
      setTree(tree, { stage: 1, progress: 0.99, fertilized: true });

      growthSystem(100, "spring");

      const t = tree.get(Tree);
      expect(t.stage).toBeGreaterThan(1);
      expect(t.fertilized).toBe(false);
    });

    it("weather multiplier parameter affects growth", () => {
      const tree = spawnTree(0, 0, "white-oak");

      growthSystem(0.5, "summer", 1);
      const clearProgress = tree.get(Tree).progress;

      setTree(tree, { progress: 0, stage: 0 });
      growthSystem(0.5, "summer", 1.3);
      const rainProgress = tree.get(Tree).progress;

      expect(rainProgress / clearProgress).toBeCloseTo(1.3, 1);
    });

    it("drought weather multiplier slows growth", () => {
      const tree = spawnTree(0, 0, "white-oak");

      growthSystem(0.5, "summer", 1);
      const clearProgress = tree.get(Tree).progress;

      setTree(tree, { progress: 0, stage: 0 });
      growthSystem(0.5, "summer", 0.5);
      const droughtProgress = tree.get(Tree).progress;

      expect(droughtProgress / clearProgress).toBeCloseTo(0.5, 1);
    });

    it("progress clamps at 0.99 for max stage", () => {
      const tree = spawnTree(0, 0, "white-oak");
      setTree(tree, { stage: 3, progress: 0.99 });

      growthSystem(1000, "spring");

      const t = tree.get(Tree);
      expect(t.stage).toBe(4);
      expect(t.progress).toBeLessThanOrEqual(0.99);
    });

    it("multiple trees grow independently in the same frame", () => {
      const tree1 = spawnTree(0, 0, "white-oak");
      const tree2 = spawnTree(2, 2, "elder-pine");

      growthSystem(0.5, "summer");

      expect(tree1.get(Tree).progress).toBeGreaterThan(0);
      expect(tree2.get(Tree).progress).toBeGreaterThan(0);
    });

    it("tree with missing species data does not crash", () => {
      spawnTree(0, 0, "nonexistent-species");
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
      const scale = getStageScale(0, 1);
      expect(scale).toBeCloseTo(0.08 + 0.07 * 0.3, 3);
    });

    it("progress at 0.0 returns exact base scale", () => {
      expect(getStageScale(0, 0)).toBe(0.08);
      expect(getStageScale(1, 0)).toBeCloseTo(0.15);
      expect(getStageScale(2, 0)).toBe(0.4);
      expect(getStageScale(3, 0)).toBe(0.8);
      expect(getStageScale(4, 0)).toBeCloseTo(1.2);
    });
  });

  describe("species-specific growth bonuses", () => {
    it("silver-birch gets +20% growth near water tile", () => {
      spawnGridCell(1, 0, "water");

      const birch = spawnTree(0, 0, "silver-birch");
      const plainBirch = spawnTree(5, 5, "silver-birch");

      growthSystem(1, "summer");

      expect(birch.get(Tree).progress).toBeGreaterThan(0);
      expect(plainBirch.get(Tree).progress).toBeGreaterThan(0);
      expect(
        birch.get(Tree).progress / plainBirch.get(Tree).progress,
      ).toBeCloseTo(1.2, 1);
    });

    it("silver-birch does NOT get bonus from distant water", () => {
      spawnGridCell(10, 10, "water");

      const birch = spawnTree(0, 0, "silver-birch");
      const plainBirch = spawnTree(5, 5, "silver-birch");

      growthSystem(1, "summer");

      expect(birch.get(Tree).progress).toBeCloseTo(
        plainBirch.get(Tree).progress,
        5,
      );
    });

    it("mystic-fern gets +15% per adjacent tree (max +60%)", () => {
      const fern = spawnTree(5, 5, "mystic-fern");
      spawnTree(4, 5, "white-oak");
      spawnTree(6, 5, "white-oak");
      const loneFern = spawnTree(20, 20, "mystic-fern");

      growthSystem(1, "summer");

      expect(
        fern.get(Tree).progress / loneFern.get(Tree).progress,
      ).toBeCloseTo(1.3, 1);
    });

    it("mystic-fern bonus caps at +60% (4 neighbors)", () => {
      const fern = spawnTree(5, 5, "mystic-fern");
      for (let dx = -1; dx <= 1; dx++) {
        for (let dz = -1; dz <= 1; dz++) {
          if (dx === 0 && dz === 0) continue;
          spawnTree(5 + dx, 5 + dz, "white-oak");
        }
      }
      const loneFern = spawnTree(20, 20, "mystic-fern");

      growthSystem(1, "summer");

      expect(
        fern.get(Tree).progress / loneFern.get(Tree).progress,
      ).toBeCloseTo(1.6, 1);
    });

    it("non-silver-birch does NOT get water bonus", () => {
      spawnGridCell(1, 0, "water");

      const oak = spawnTree(0, 0, "white-oak");
      const farOak = spawnTree(5, 5, "white-oak");

      growthSystem(1, "summer");

      expect(oak.get(Tree).progress).toBeCloseTo(
        farOak.get(Tree).progress,
        5,
      );
    });

    it("non-mystic-fern does NOT get adjacency bonus", () => {
      const oak = spawnTree(5, 5, "white-oak");
      spawnTree(4, 5, "white-oak");
      spawnTree(6, 5, "white-oak");
      const loneOak = spawnTree(20, 20, "white-oak");

      growthSystem(1, "summer");

      expect(oak.get(Tree).progress).toBeCloseTo(
        loneOak.get(Tree).progress,
        5,
      );
    });
  });
});
