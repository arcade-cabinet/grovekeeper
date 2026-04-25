/**
 * Unit tests for GameActions — headless action layer.
 *
 * Tests each action in isolation with a minimal Koota world and fresh state.
 */
import type { Entity } from "koota";
import { beforeEach, describe, expect, it } from "vitest";
import { actions as gameActions } from "@/actions";
import { getSpeciesById } from "@/config/trees";
import { koota, spawnPlayer } from "@/koota";
import { spawnGridCell } from "@/startup";
import {
  FarmerState,
  GridCell,
  Harvestable,
  IsPlayer,
  PlayerProgress,
  Position,
  Resources,
  Seeds,
  Tracking,
  Tree,
} from "@/traits";
import {
  clearRock,
  fertilizeTree,
  findHarvestableTrees,
  findMatureTrees,
  findPlantableTiles,
  findWaterableTrees,
  getPlayerTile,
  harvestTree,
  movePlayerTo,
  plantTree,
  pruneTree,
  removeSeedling,
  selectSpecies,
  selectTool,
  spendToolStamina,
  waterTree,
} from "./GameActions";

/** Set up a minimal 4x4 soil grid + player + seeds. */
function setupWorld() {
  // Destroy every entity in the world.
  for (const entity of koota.query()) entity.destroy();

  // Reset all singleton traits to their defaults.
  gameActions().resetGame();

  // Create player at (2, 2).
  const player = spawnPlayer();
  player.set(Position, { x: 2, y: 0, z: 2 });

  // Create a 4x4 grid of soil tiles.
  for (let x = 0; x < 4; x++) {
    for (let z = 0; z < 4; z++) {
      spawnGridCell(x, z, "soil");
    }
  }

  // Give starting seeds (resetGame already seeded 10 white-oak).
  gameActions().addSeed("white-oak", 20);
}

/** Return the first tree entity, or throw. */
function firstTree(): Entity {
  const t = koota.queryFirst(Tree);
  if (!t) throw new Error("no tree found");
  return t;
}

/** Return the tree at a given grid coordinate, or undefined. */
function treeAt(gridX: number, gridZ: number): Entity | undefined {
  for (const t of koota.query(Tree, Position)) {
    const p = t.get(Position);
    if (p && Math.round(p.x) === gridX && Math.round(p.z) === gridZ) return t;
  }
  return undefined;
}

/** Plant a tree, then stage it up to Mature (3) with Harvestable.ready = true. */
function setupMatureTree(x: number, z: number): Entity {
  plantTree("white-oak", x, z);
  const tree = treeAt(x, z);
  if (!tree) throw new Error("tree not found");
  const td = tree.get(Tree);
  if (td) tree.set(Tree, { ...td, stage: 3, progress: 0 });

  const species = getSpeciesById("white-oak");
  if (species) {
    tree.add(
      Harvestable({
        resources: species.yield.map((y) => ({
          type: y.resource,
          amount: y.amount,
        })),
        cooldownElapsed: 0,
        cooldownTotal: species.harvestCycleSec,
        ready: true,
      }),
    );
  }
  return tree;
}

describe("GameActions", () => {
  beforeEach(setupWorld);

  // ─── plantTree ───────────────────────────────
  describe("plantTree", () => {
    it("plants a tree on an empty soil tile", () => {
      const result = plantTree("white-oak", 0, 0);
      expect(result).toBe(true);

      // resetGame gives 10 seeds, addSeed adds 20 = 30 total, minus 1 = 29.
      const seeds = koota.get(Seeds);
      expect(seeds?.["white-oak"]).toBe(29);

      // Plant granted some XP and incremented the tracker.
      expect(koota.get(PlayerProgress)?.xp ?? 0).toBeGreaterThan(0);
      expect(koota.get(Tracking)?.treesPlanted).toBe(1);
    });

    it("creates a tree entity in the ECS world", () => {
      plantTree("white-oak", 1, 1);
      const trees = koota.query(Tree);
      expect(trees.length).toBe(1);
      expect(trees[0].get(Tree)?.speciesId).toBe("white-oak");
    });

    it("marks tile as occupied after planting", () => {
      plantTree("white-oak", 0, 0);
      const cell = koota.query(GridCell).find((c) => {
        const gc = c.get(GridCell);
        return gc?.gridX === 0 && gc?.gridZ === 0;
      });
      expect(cell?.get(GridCell)?.occupied).toBe(true);
    });

    it("fails if tile is occupied", () => {
      plantTree("white-oak", 0, 0);
      const result = plantTree("white-oak", 0, 0);
      expect(result).toBe(false);
    });

    it("fails if no seeds available", () => {
      koota.set(Seeds, {});
      const result = plantTree("white-oak", 0, 0);
      expect(result).toBe(false);
    });

    it("fails if cell does not exist", () => {
      const result = plantTree("white-oak", 99, 99);
      expect(result).toBe(false);
    });

    it("tracks species planted", () => {
      plantTree("white-oak", 0, 0);
      expect(koota.get(Tracking)?.speciesPlanted).toContain("white-oak");
    });
  });

  // ─── waterTree ───────────────────────────────
  describe("waterTree", () => {
    it("waters an unwatered tree", () => {
      plantTree("white-oak", 1, 1);
      const tree = firstTree();
      const result = waterTree(tree);
      expect(result).toBe(true);
      expect(tree.get(Tree)?.watered).toBe(true);
    });

    it("awards XP for watering", () => {
      plantTree("white-oak", 1, 1);
      const tree = firstTree();
      const xpBefore = koota.get(PlayerProgress)?.xp ?? 0;
      waterTree(tree);
      const xpAfter = koota.get(PlayerProgress)?.xp ?? 0;
      expect(xpAfter).toBe(xpBefore + 5);
    });

    it("fails if tree is already watered", () => {
      plantTree("white-oak", 1, 1);
      const tree = firstTree();
      waterTree(tree);
      const result = waterTree(tree);
      expect(result).toBe(false);
    });

    it("fails for non-existent tree", () => {
      const result = waterTree(undefined);
      expect(result).toBe(false);
    });
  });

  // ─── harvestTree ─────────────────────────────
  describe("harvestTree", () => {
    it("harvests a mature tree and gains resources", () => {
      const tree = setupMatureTree(0, 0);
      const result = harvestTree(tree);
      expect(result).not.toBeNull();
      expect(result!.length).toBeGreaterThan(0);
      expect(koota.get(Tracking)?.treesHarvested).toBe(1);
    });

    it("removes tree from world after harvest", () => {
      const tree = setupMatureTree(0, 0);
      harvestTree(tree);
      expect(koota.query(Tree).length).toBe(0);
    });

    it("clears tile occupancy after harvest", () => {
      const tree = setupMatureTree(0, 0);
      harvestTree(tree);
      const cell = koota.query(GridCell).find((c) => {
        const gc = c.get(GridCell);
        return gc?.gridX === 0 && gc?.gridZ === 0;
      });
      expect(cell?.get(GridCell)?.occupied).toBe(false);
    });

    it("fails for immature tree (stage < 3)", () => {
      plantTree("white-oak", 0, 0);
      const tree = firstTree();
      const result = harvestTree(tree);
      expect(result).toBeNull();
    });

    it("adds resources to the store", () => {
      const timberBefore = koota.get(Resources)?.timber ?? 0;
      const tree = setupMatureTree(0, 0);
      harvestTree(tree);
      const timberAfter = koota.get(Resources)?.timber ?? 0;
      expect(timberAfter).toBeGreaterThan(timberBefore);
    });
  });

  // ─── pruneTree ───────────────────────────────
  describe("pruneTree", () => {
    it("marks a mature tree as pruned", () => {
      plantTree("white-oak", 0, 0);
      const tree = firstTree();
      const td = tree.get(Tree);
      if (td) tree.set(Tree, { ...td, stage: 3 });

      const result = pruneTree(tree);
      expect(result).toBe(true);
      expect(tree.get(Tree)?.pruned).toBe(true);
    });

    it("fails for immature tree", () => {
      plantTree("white-oak", 0, 0);
      const tree = firstTree();
      const result = pruneTree(tree);
      expect(result).toBe(false);
    });
  });

  // ─── fertilizeTree ───────────────────────────
  describe("fertilizeTree", () => {
    it("fertilizes a tree when player has 5 acorns", () => {
      gameActions().addResource("acorns", 10);
      plantTree("white-oak", 0, 0);
      const tree = firstTree();

      const result = fertilizeTree(tree);
      expect(result).toBe(true);
      expect(tree.get(Tree)?.fertilized).toBe(true);
    });

    it("spends 5 acorns", () => {
      gameActions().addResource("acorns", 10);
      plantTree("white-oak", 0, 0);
      const tree = firstTree();

      fertilizeTree(tree);
      expect(koota.get(Resources)?.acorns).toBe(5);
    });

    it("fails if already fertilized", () => {
      gameActions().addResource("acorns", 20);
      plantTree("white-oak", 0, 0);
      const tree = firstTree();
      fertilizeTree(tree);
      const result = fertilizeTree(tree);
      expect(result).toBe(false);
    });

    it("fails if not enough acorns", () => {
      plantTree("white-oak", 0, 0);
      const tree = firstTree();
      const result = fertilizeTree(tree);
      expect(result).toBe(false);
    });
  });

  // ─── clearRock ───────────────────────────────
  describe("clearRock", () => {
    it("converts a rock tile to soil", () => {
      // Flip a soil tile at (3, 3) into a rock tile.
      const rockCell = koota.query(GridCell).find((c) => {
        const gc = c.get(GridCell);
        return gc?.gridX === 3 && gc?.gridZ === 3;
      });
      const gc = rockCell?.get(GridCell);
      if (rockCell && gc) rockCell.set(GridCell, { ...gc, type: "rock" });

      const result = clearRock(3, 3);
      expect(result).toBe(true);
      expect(rockCell?.get(GridCell)?.type).toBe("soil");
    });

    it("fails on non-rock tile", () => {
      const result = clearRock(0, 0);
      expect(result).toBe(false);
    });
  });

  // ─── removeSeedling ──────────────────────────
  describe("removeSeedling", () => {
    it("removes a stage 0 tree", () => {
      plantTree("white-oak", 0, 0);
      const tree = firstTree();
      expect(tree.get(Tree)?.stage).toBe(0);

      const result = removeSeedling(tree);
      expect(result).toBe(true);
      expect(koota.query(Tree).length).toBe(0);
    });

    it("fails for stage 2+ tree", () => {
      plantTree("white-oak", 0, 0);
      const tree = firstTree();
      const td = tree.get(Tree);
      if (td) tree.set(Tree, { ...td, stage: 2 });

      const result = removeSeedling(tree);
      expect(result).toBe(false);
    });
  });

  // ─── movePlayerTo ────────────────────────────
  describe("movePlayerTo", () => {
    it("teleports the player to a new position", () => {
      movePlayerTo(3, 3);
      const tile = getPlayerTile();
      expect(tile).toEqual({ gridX: 3, gridZ: 3 });
    });
  });

  // ─── Query Helpers ───────────────────────────
  describe("query helpers", () => {
    it("findPlantableTiles returns only empty soil tiles", () => {
      plantTree("white-oak", 0, 0);
      const tiles = findPlantableTiles();
      // 4x4 grid = 16 tiles, minus 1 occupied = 15.
      expect(tiles.length).toBe(15);
    });

    it("findWaterableTrees returns unwatered trees", () => {
      plantTree("white-oak", 0, 0);
      plantTree("white-oak", 1, 0);
      expect(findWaterableTrees().length).toBe(2);

      const tree = firstTree();
      waterTree(tree);
      expect(findWaterableTrees().length).toBe(1);
    });

    it("findHarvestableTrees returns ready-to-harvest trees", () => {
      setupMatureTree(0, 0);
      expect(findHarvestableTrees().length).toBe(1);
    });

    it("findMatureTrees returns stage 3+ trees", () => {
      plantTree("white-oak", 0, 0);
      plantTree("white-oak", 1, 0);
      const trees = koota.query(Tree, Position);
      const t0 = trees[0];
      const t1 = trees[1];
      const td0 = t0.get(Tree);
      const td1 = t1.get(Tree);
      if (td0) t0.set(Tree, { ...td0, stage: 3 });
      if (td1) t1.set(Tree, { ...td1, stage: 1 });

      expect(findMatureTrees().length).toBe(1);
    });

    it("getPlayerTile returns player grid coordinates", () => {
      movePlayerTo(2, 3);
      expect(getPlayerTile()).toEqual({ gridX: 2, gridZ: 3 });
    });
  });

  // ─── Tool helpers ────────────────────────────
  describe("tool helpers", () => {
    it("spendToolStamina spends stamina for a tool", () => {
      const player = koota.queryFirst(IsPlayer, FarmerState);
      if (player) player.set(FarmerState, { stamina: 100, maxStamina: 100 });
      const result = spendToolStamina("trowel");
      expect(result).toBe(true);
      // trowel costs 5.
      expect(
        koota.queryFirst(IsPlayer, FarmerState)?.get(FarmerState)?.stamina,
      ).toBe(95);
    });

    it("spendToolStamina returns false when stamina insufficient", () => {
      const player = koota.queryFirst(IsPlayer, FarmerState);
      if (player) player.set(FarmerState, { stamina: 2, maxStamina: 100 });
      const result = spendToolStamina("trowel");
      expect(result).toBe(false);
    });

    it("spendToolStamina returns true for zero-cost tools", () => {
      const result = spendToolStamina("almanac");
      expect(result).toBe(true);
    });

    it("selectTool updates store", () => {
      selectTool("axe");
      expect(koota.get(PlayerProgress)?.selectedTool).toBe("axe");
    });

    it("selectSpecies updates store", () => {
      selectSpecies("sugar-maple");
      expect(koota.get(PlayerProgress)?.selectedSpecies).toBe("sugar-maple");
    });
  });
});
