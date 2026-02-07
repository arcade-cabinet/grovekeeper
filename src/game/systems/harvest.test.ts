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

    it("stores base yields without multipliers", () => {
      const tree = createTreeEntity(0, 0, "white-oak");
      tree.tree!.stage = 4; // Old Growth
      tree.tree!.pruned = true;
      world.add(tree);

      initHarvestable(tree);

      // Base yield should be stored, not multiplied
      const baseAmount = tree.harvestable!.resources[0].amount;
      expect(baseAmount).toBe(2); // white-oak base timber yield
    });

    it("does not add harvestable to immature tree (stage < 3)", () => {
      const tree = createTreeEntity(0, 0, "white-oak");
      tree.tree!.stage = 2;
      world.add(tree);

      initHarvestable(tree);

      expect(tree.harvestable).toBeUndefined();
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

    it("pruned tree gets 1.5x yield at collect time", () => {
      const normalTree = createTreeEntity(0, 0, "white-oak");
      normalTree.tree!.stage = 3;
      world.add(normalTree);
      initHarvestable(normalTree);
      normalTree.harvestable!.ready = true;

      const prunedTree = createTreeEntity(1, 0, "white-oak");
      prunedTree.tree!.stage = 3;
      prunedTree.tree!.pruned = true;
      world.add(prunedTree);
      initHarvestable(prunedTree);
      prunedTree.harvestable!.ready = true;

      const normalResult = collectHarvest(normalTree)!;
      const prunedResult = collectHarvest(prunedTree)!;
      expect(prunedResult[0].amount).toBeGreaterThan(normalResult[0].amount);
    });

    it("old growth (stage 4) gets 1.5x yield at collect time", () => {
      const matureTree = createTreeEntity(0, 0, "white-oak");
      matureTree.tree!.stage = 3;
      world.add(matureTree);
      initHarvestable(matureTree);
      matureTree.harvestable!.ready = true;

      const oldTree = createTreeEntity(1, 0, "white-oak");
      oldTree.tree!.stage = 4;
      world.add(oldTree);
      initHarvestable(oldTree);
      oldTree.harvestable!.ready = true;

      const matureResult = collectHarvest(matureTree)!;
      const oldResult = collectHarvest(oldTree)!;
      expect(oldResult[0].amount).toBeGreaterThan(matureResult[0].amount);
    });

    it("clears pruned flag after harvest", () => {
      const tree = createTreeEntity(0, 0, "white-oak");
      tree.tree!.stage = 3;
      tree.tree!.pruned = true;
      world.add(tree);
      initHarvestable(tree);
      tree.harvestable!.ready = true;

      collectHarvest(tree);

      expect(tree.tree!.pruned).toBe(false);
    });

    it("golden apple gets 3x fruit in autumn", () => {
      const tree = createTreeEntity(0, 0, "golden-apple");
      tree.tree!.stage = 3;
      world.add(tree);
      initHarvestable(tree);
      tree.harvestable!.ready = true;

      const summerResult = collectHarvest(tree, "summer")!;
      // Reset for another harvest
      tree.harvestable!.ready = true;
      const autumnResult = collectHarvest(tree, "autumn")!;

      // Find fruit resources
      const summerFruit = summerResult.find((r) => r.type === "fruit")?.amount ?? 0;
      const autumnFruit = autumnResult.find((r) => r.type === "fruit")?.amount ?? 0;
      expect(autumnFruit).toBe(summerFruit * 3);
    });
  });
});
