// src/game/systems/harvest.test.ts
import type { Entity } from "koota";
import { beforeEach, describe, expect, it } from "vitest";
import { actions as gameActions } from "@/actions";
import { destroyAllEntitiesExceptWorld, koota } from "@/koota";
import { spawnTree } from "@/startup";
import { Difficulty, Harvestable, Tree } from "@/traits";
import { collectHarvest, harvestSystem, initHarvestable } from "./harvest";

function setStage(entity: Entity, stage: 0 | 1 | 2 | 3 | 4): void {
  entity.set(Tree, { ...entity.get(Tree), stage });
}

function setPruned(entity: Entity, pruned: boolean): void {
  entity.set(Tree, { ...entity.get(Tree), pruned });
}

function setReady(entity: Entity, ready: boolean): void {
  entity.set(Harvestable, { ...entity.get(Harvestable), ready });
}

describe("Harvest System", () => {
  beforeEach(() => {
    destroyAllEntitiesExceptWorld();
    gameActions().resetGame();
  });

  describe("initHarvestable", () => {
    it("adds harvestable component to mature tree (stage 3)", () => {
      const tree = spawnTree(0, 0, "white-oak");
      setStage(tree, 3);

      initHarvestable(tree);

      expect(tree.has(Harvestable)).toBe(true);
      const h = tree.get(Harvestable);
      expect(h.ready).toBe(false);
      expect(h.cooldownTotal).toBe(45); // white-oak harvest cycle
      expect(h.resources.length).toBeGreaterThan(0);
    });

    it("stores base yields without multipliers", () => {
      const tree = spawnTree(0, 0, "white-oak");
      setStage(tree, 4); // Old Growth
      setPruned(tree, true);

      initHarvestable(tree);

      // Base yield should be stored, not multiplied
      const h = tree.get(Harvestable);
      expect(h.resources[0].amount).toBe(2); // white-oak base timber yield
    });

    it("does not add harvestable to immature tree (stage < 3)", () => {
      const tree = spawnTree(0, 0, "white-oak");
      setStage(tree, 2);

      initHarvestable(tree);

      expect(tree.has(Harvestable)).toBe(false);
    });
  });

  describe("harvestSystem", () => {
    it("advances cooldown elapsed time", () => {
      const tree = spawnTree(0, 0, "white-oak");
      setStage(tree, 3);
      initHarvestable(tree);

      harvestSystem(10);

      expect(tree.get(Harvestable).cooldownElapsed).toBe(10);
    });

    it("marks tree ready when cooldown completes", () => {
      const tree = spawnTree(0, 0, "white-oak");
      setStage(tree, 3);
      initHarvestable(tree);

      harvestSystem(50); // > 45 sec cooldown for white-oak

      expect(tree.get(Harvestable).ready).toBe(true);
    });

    it("does not advance past ready", () => {
      const tree = spawnTree(0, 0, "white-oak");
      setStage(tree, 3);
      initHarvestable(tree);
      setReady(tree, true);

      harvestSystem(100);

      expect(tree.get(Harvestable).ready).toBe(true);
    });
  });

  describe("collectHarvest", () => {
    it("returns resources and resets cooldown", () => {
      const tree = spawnTree(0, 0, "white-oak");
      setStage(tree, 3);
      initHarvestable(tree);
      setReady(tree, true);

      const result = collectHarvest(tree);

      expect(result).not.toBeNull();
      expect(result!.length).toBeGreaterThan(0);
      const h = tree.get(Harvestable);
      expect(h.ready).toBe(false);
      expect(h.cooldownElapsed).toBe(0);
    });

    it("returns null if not ready", () => {
      const tree = spawnTree(0, 0, "white-oak");
      setStage(tree, 3);
      initHarvestable(tree);

      const result = collectHarvest(tree);

      expect(result).toBeNull();
    });

    it("pruned tree gets 1.5x yield at collect time", () => {
      const normalTree = spawnTree(0, 0, "white-oak");
      setStage(normalTree, 3);
      initHarvestable(normalTree);
      setReady(normalTree, true);

      const prunedTree = spawnTree(1, 0, "white-oak");
      setStage(prunedTree, 3);
      setPruned(prunedTree, true);
      initHarvestable(prunedTree);
      setReady(prunedTree, true);

      const normalResult = collectHarvest(normalTree)!;
      const prunedResult = collectHarvest(prunedTree)!;
      expect(prunedResult[0].amount).toBeGreaterThan(normalResult[0].amount);
    });

    it("old growth (stage 4) gets 1.5x yield at collect time", () => {
      const matureTree = spawnTree(0, 0, "white-oak");
      setStage(matureTree, 3);
      initHarvestable(matureTree);
      setReady(matureTree, true);

      const oldTree = spawnTree(1, 0, "white-oak");
      setStage(oldTree, 4);
      initHarvestable(oldTree);
      setReady(oldTree, true);

      const matureResult = collectHarvest(matureTree)!;
      const oldResult = collectHarvest(oldTree)!;
      expect(oldResult[0].amount).toBeGreaterThan(matureResult[0].amount);
    });

    it("clears pruned flag after harvest", () => {
      const tree = spawnTree(0, 0, "white-oak");
      setStage(tree, 3);
      setPruned(tree, true);
      initHarvestable(tree);
      setReady(tree, true);

      collectHarvest(tree);

      expect(tree.get(Tree).pruned).toBe(false);
    });

    it("golden apple gets 3x fruit in autumn", () => {
      const tree = spawnTree(0, 0, "golden-apple");
      setStage(tree, 3);
      initHarvestable(tree);
      setReady(tree, true);

      const summerResult = collectHarvest(tree, "summer")!;
      // Reset for another harvest
      setReady(tree, true);
      const autumnResult = collectHarvest(tree, "autumn")!;

      // Find fruit resources
      const summerFruit =
        summerResult.find((r) => r.type === "fruit")?.amount ?? 0;
      const autumnFruit =
        autumnResult.find((r) => r.type === "fruit")?.amount ?? 0;
      expect(autumnFruit).toBe(summerFruit * 3);
    });

    it("golden apple autumn bonus does not apply in spring", () => {
      const tree = spawnTree(0, 0, "golden-apple");
      setStage(tree, 3);
      initHarvestable(tree);
      setReady(tree, true);
      const springResult = collectHarvest(tree, "spring")!;
      setReady(tree, true);
      const summerResult = collectHarvest(tree, "summer")!;

      const springFruit =
        springResult.find((r) => r.type === "fruit")?.amount ?? 0;
      const summerFruit =
        summerResult.find((r) => r.type === "fruit")?.amount ?? 0;
      expect(springFruit).toBe(summerFruit);
    });

    it("ironbark gets 3x timber at old growth (stage 4)", () => {
      const matureTree = spawnTree(0, 0, "ironbark");
      setStage(matureTree, 3);
      initHarvestable(matureTree);
      setReady(matureTree, true);
      const matureResult = collectHarvest(matureTree)!;

      destroyAllEntitiesExceptWorld();
      const oldTree = spawnTree(0, 0, "ironbark");
      setStage(oldTree, 4);
      initHarvestable(oldTree);
      setReady(oldTree, true);
      const oldResult = collectHarvest(oldTree)!;

      const matureTimber =
        matureResult.find((r) => r.type === "timber")?.amount ?? 0;
      const oldTimber = oldResult.find((r) => r.type === "timber")?.amount ?? 0;

      // Old growth ironbark: stage(1.5x) * ironbark(3.0x) = 4.5x
      expect(oldTimber).toBeGreaterThanOrEqual(Math.ceil(matureTimber * 4.5));
    });

    it("ironbark 3x bonus does not apply at stage 3", () => {
      const matureTree = spawnTree(0, 0, "ironbark");
      setStage(matureTree, 3);
      initHarvestable(matureTree);
      setReady(matureTree, true);
      const matureResult = collectHarvest(matureTree)!;

      destroyAllEntitiesExceptWorld();
      const oldTree = spawnTree(0, 0, "ironbark");
      setStage(oldTree, 4);
      initHarvestable(oldTree);
      setReady(oldTree, true);
      const oldResult = collectHarvest(oldTree)!;

      const matureTimber =
        matureResult.find((r) => r.type === "timber")?.amount ?? 0;
      const oldTimber = oldResult.find((r) => r.type === "timber")?.amount ?? 0;

      // Stage 3 should NOT have the 3x bonus — old growth should be significantly higher
      expect(oldTimber / matureTimber).toBeGreaterThanOrEqual(4);
    });

    it("collectHarvest returns null for entity without harvestable component", () => {
      const tree = spawnTree(0, 0, "white-oak");
      setStage(tree, 2);
      // No initHarvestable called
      expect(collectHarvest(tree)).toBeNull();
    });

    it("stacked multipliers: old growth + pruned + difficulty", () => {
      koota.set(Difficulty, { id: "explore", permadeath: false }); // 1.3x yield

      const tree = spawnTree(0, 0, "white-oak");
      setStage(tree, 4); // old growth: 1.5x
      setPruned(tree, true); // pruned: 1.5x
      initHarvestable(tree);
      setReady(tree, true);
      const result = collectHarvest(tree)!;

      // Base tree at stage 3 no pruning normal difficulty
      destroyAllEntitiesExceptWorld();
      koota.set(Difficulty, { id: "normal", permadeath: false });
      const baseTree = spawnTree(0, 0, "white-oak");
      setStage(baseTree, 3);
      initHarvestable(baseTree);
      setReady(baseTree, true);
      const baseResult = collectHarvest(baseTree)!;

      // Boosted: 1.5 * 1.5 * 1.3 = 2.925x
      expect(result[0].amount).toBeGreaterThan(baseResult[0].amount * 2);

      koota.set(Difficulty, { id: "normal", permadeath: false }); // cleanup
    });

    it("uses Math.ceil for yield rounding with fractional multipliers", () => {
      koota.set(Difficulty, { id: "explore", permadeath: false });
      const tree = spawnTree(0, 0, "white-oak");
      setStage(tree, 3);
      initHarvestable(tree);
      setReady(tree, true);
      const result = collectHarvest(tree)!;

      const timber = result.find((r) => r.type === "timber");
      expect(timber).toBeDefined();
      expect(timber!.amount).toBe(3);
      koota.set(Difficulty, { id: "normal", permadeath: false });
    });
  });
});
