// src/game/systems/harvest.test.ts
import { describe, it, expect, beforeEach } from "vitest";
import { harvestSystem, initHarvestable, collectHarvest } from "./harvest";
import { world } from "../ecs/world";
import { createTreeEntity } from "../ecs/archetypes";

describe("Harvest System", () => {
  beforeEach(() => {
    for (const entity of [...world]) {
      world.remove(entity);
    }
  });

  describe("initHarvestable", () => {
    it("adds harvestable component to mature tree (stage 3)", () => {
      const tree = createTreeEntity(0, 0, "white-oak");
      tree.tree!.stage = 3;
      world.add(tree);

      initHarvestable(tree);

      expect(tree.harvestable).toBeDefined();
      expect(tree.harvestable!.ready).toBe(false);
      expect(tree.harvestable!.cooldownTotal).toBe(45); // white-oak harvest cycle
      expect(tree.harvestable!.resources.length).toBeGreaterThan(0);
    });

    it("does not add harvestable to immature tree (stage < 3)", () => {
      const tree = createTreeEntity(0, 0, "white-oak");
      tree.tree!.stage = 2;
      world.add(tree);

      initHarvestable(tree);

      expect(tree.harvestable).toBeUndefined();
    });

    it("old growth (stage 4) gets 1.5x yield", () => {
      const matureTree = createTreeEntity(0, 0, "white-oak");
      matureTree.tree!.stage = 3;
      world.add(matureTree);
      initHarvestable(matureTree);

      const oldTree = createTreeEntity(1, 0, "white-oak");
      oldTree.tree!.stage = 4;
      world.add(oldTree);
      initHarvestable(oldTree);

      const matureAmount = matureTree.harvestable!.resources[0].amount;
      const oldAmount = oldTree.harvestable!.resources[0].amount;
      expect(oldAmount).toBeGreaterThan(matureAmount);
    });
  });

  describe("harvestSystem", () => {
    it("advances cooldown elapsed time", () => {
      const tree = createTreeEntity(0, 0, "white-oak");
      tree.tree!.stage = 3;
      world.add(tree);
      initHarvestable(tree);

      harvestSystem(10);

      expect(tree.harvestable!.cooldownElapsed).toBe(10);
    });

    it("marks tree ready when cooldown completes", () => {
      const tree = createTreeEntity(0, 0, "white-oak");
      tree.tree!.stage = 3;
      world.add(tree);
      initHarvestable(tree);

      harvestSystem(50); // > 45 sec cooldown for white-oak

      expect(tree.harvestable!.ready).toBe(true);
    });

    it("does not advance past ready", () => {
      const tree = createTreeEntity(0, 0, "white-oak");
      tree.tree!.stage = 3;
      world.add(tree);
      initHarvestable(tree);
      tree.harvestable!.ready = true;

      harvestSystem(100);

      expect(tree.harvestable!.ready).toBe(true);
    });
  });

  describe("collectHarvest", () => {
    it("returns resources and resets cooldown", () => {
      const tree = createTreeEntity(0, 0, "white-oak");
      tree.tree!.stage = 3;
      world.add(tree);
      initHarvestable(tree);
      tree.harvestable!.ready = true;

      const result = collectHarvest(tree);

      expect(result).not.toBeNull();
      expect(result!.length).toBeGreaterThan(0);
      expect(tree.harvestable!.ready).toBe(false);
      expect(tree.harvestable!.cooldownElapsed).toBe(0);
    });

    it("returns null if not ready", () => {
      const tree = createTreeEntity(0, 0, "white-oak");
      tree.tree!.stage = 3;
      world.add(tree);
      initHarvestable(tree);

      const result = collectHarvest(tree);

      expect(result).toBeNull();
    });
  });
});
