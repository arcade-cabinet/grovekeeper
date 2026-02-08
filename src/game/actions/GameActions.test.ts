/**
 * Unit tests for GameActions — headless action layer.
 *
 * Tests each action in isolation with a minimal ECS world and fresh store.
 */
import { beforeEach, describe, expect, it } from "vitest";
import { createGridCellEntity, createPlayerEntity } from "../ecs/archetypes";
import { gridCellsQuery, treesQuery, world } from "../ecs/world";
import { useGameStore } from "../stores/gameStore";
import { initHarvestable } from "../systems/harvest";
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
  for (const entity of [...world]) world.remove(entity);
  useGameStore.getState().resetGame();

  // Create player at (2, 2)
  const player = createPlayerEntity();
  player.position!.x = 2;
  player.position!.z = 2;
  world.add(player);

  // Create a 4x4 grid of soil tiles
  for (let x = 0; x < 4; x++) {
    for (let z = 0; z < 4; z++) {
      world.add(createGridCellEntity(x, z, "soil"));
    }
  }

  // Give starting seeds
  useGameStore.getState().addSeed("white-oak", 20);
}

describe("GameActions", () => {
  beforeEach(setupWorld);

  // ─── plantTree ───────────────────────────────
  describe("plantTree", () => {
    it("plants a tree on an empty soil tile", () => {
      const result = plantTree("white-oak", 0, 0);
      expect(result).toBe(true);

      const state = useGameStore.getState();
      expect(state.treesPlanted).toBe(1);
      expect(state.xp).toBeGreaterThan(0);
      // resetGame gives 10 seeds, addSeed adds 20 = 30 total, minus 1 = 29
      expect(state.seeds["white-oak"]).toBe(29);
    });

    it("creates a tree entity in the ECS world", () => {
      plantTree("white-oak", 1, 1);
      const trees = [...treesQuery];
      expect(trees.length).toBe(1);
      expect(trees[0].tree?.speciesId).toBe("white-oak");
    });

    it("marks tile as occupied after planting", () => {
      plantTree("white-oak", 0, 0);
      const cell = [...gridCellsQuery].find(
        (c) => c.gridCell?.gridX === 0 && c.gridCell?.gridZ === 0,
      );
      expect(cell?.gridCell?.occupied).toBe(true);
    });

    it("fails if tile is occupied", () => {
      plantTree("white-oak", 0, 0);
      const result = plantTree("white-oak", 0, 0);
      expect(result).toBe(false);
    });

    it("fails if no seeds available", () => {
      useGameStore.setState({ seeds: {} });
      const result = plantTree("white-oak", 0, 0);
      expect(result).toBe(false);
    });

    it("fails if cell does not exist", () => {
      const result = plantTree("white-oak", 99, 99);
      expect(result).toBe(false);
    });

    it("tracks species planted", () => {
      plantTree("white-oak", 0, 0);
      expect(useGameStore.getState().speciesPlanted).toContain("white-oak");
    });
  });

  // ─── waterTree ───────────────────────────────
  describe("waterTree", () => {
    it("waters an unwatered tree", () => {
      plantTree("white-oak", 1, 1);
      const tree = [...treesQuery][0];
      const result = waterTree(tree.id);
      expect(result).toBe(true);
      expect(tree.tree?.watered).toBe(true);
    });

    it("awards XP for watering", () => {
      plantTree("white-oak", 1, 1);
      const tree = [...treesQuery][0];
      const xpBefore = useGameStore.getState().xp;
      waterTree(tree.id);
      expect(useGameStore.getState().xp).toBe(xpBefore + 5);
    });

    it("fails if tree is already watered", () => {
      plantTree("white-oak", 1, 1);
      const tree = [...treesQuery][0];
      waterTree(tree.id);
      const result = waterTree(tree.id);
      expect(result).toBe(false);
    });

    it("fails for non-existent tree", () => {
      const result = waterTree("nonexistent");
      expect(result).toBe(false);
    });
  });

  // ─── harvestTree ─────────────────────────────
  describe("harvestTree", () => {
    it("harvests a mature tree and gains resources", () => {
      plantTree("white-oak", 0, 0);
      const tree = [...treesQuery][0];
      // Advance to stage 3 (mature)
      tree.tree!.stage = 3;
      tree.tree!.progress = 0;
      initHarvestable(tree);
      tree.harvestable!.ready = true;

      const result = harvestTree(tree.id);
      expect(result).not.toBeNull();
      expect(result!.length).toBeGreaterThan(0);
      expect(useGameStore.getState().treesHarvested).toBe(1);
    });

    it("removes tree from world after harvest", () => {
      plantTree("white-oak", 0, 0);
      const tree = [...treesQuery][0];
      tree.tree!.stage = 3;
      initHarvestable(tree);
      tree.harvestable!.ready = true;

      harvestTree(tree.id);
      expect([...treesQuery].length).toBe(0);
    });

    it("clears tile occupancy after harvest", () => {
      plantTree("white-oak", 0, 0);
      const tree = [...treesQuery][0];
      tree.tree!.stage = 3;
      initHarvestable(tree);
      tree.harvestable!.ready = true;

      harvestTree(tree.id);
      const cell = [...gridCellsQuery].find(
        (c) => c.gridCell?.gridX === 0 && c.gridCell?.gridZ === 0,
      );
      expect(cell?.gridCell?.occupied).toBe(false);
    });

    it("fails for immature tree (stage < 3)", () => {
      plantTree("white-oak", 0, 0);
      const tree = [...treesQuery][0];
      const result = harvestTree(tree.id);
      expect(result).toBeNull();
    });

    it("adds resources to the store", () => {
      plantTree("white-oak", 0, 0);
      const tree = [...treesQuery][0];
      tree.tree!.stage = 3;
      initHarvestable(tree);
      tree.harvestable!.ready = true;

      const timberBefore = useGameStore.getState().resources.timber;
      harvestTree(tree.id);
      expect(useGameStore.getState().resources.timber).toBeGreaterThan(
        timberBefore,
      );
    });
  });

  // ─── pruneTree ───────────────────────────────
  describe("pruneTree", () => {
    it("marks a mature tree as pruned", () => {
      plantTree("white-oak", 0, 0);
      const tree = [...treesQuery][0];
      tree.tree!.stage = 3;
      initHarvestable(tree);

      const result = pruneTree(tree.id);
      expect(result).toBe(true);
      expect(tree.tree?.pruned).toBe(true);
    });

    it("fails for immature tree", () => {
      plantTree("white-oak", 0, 0);
      const tree = [...treesQuery][0];
      const result = pruneTree(tree.id);
      expect(result).toBe(false);
    });
  });

  // ─── fertilizeTree ───────────────────────────
  describe("fertilizeTree", () => {
    it("fertilizes a tree when player has 5 acorns", () => {
      useGameStore.getState().addResource("acorns", 10);
      plantTree("white-oak", 0, 0);
      const tree = [...treesQuery][0];

      const result = fertilizeTree(tree.id);
      expect(result).toBe(true);
      expect(tree.tree?.fertilized).toBe(true);
    });

    it("spends 5 acorns", () => {
      useGameStore.getState().addResource("acorns", 10);
      plantTree("white-oak", 0, 0);
      const tree = [...treesQuery][0];

      fertilizeTree(tree.id);
      expect(useGameStore.getState().resources.acorns).toBe(5);
    });

    it("fails if already fertilized", () => {
      useGameStore.getState().addResource("acorns", 20);
      plantTree("white-oak", 0, 0);
      const tree = [...treesQuery][0];
      fertilizeTree(tree.id);
      const result = fertilizeTree(tree.id);
      expect(result).toBe(false);
    });

    it("fails if not enough acorns", () => {
      plantTree("white-oak", 0, 0);
      const tree = [...treesQuery][0];
      const result = fertilizeTree(tree.id);
      expect(result).toBe(false);
    });
  });

  // ─── clearRock ───────────────────────────────
  describe("clearRock", () => {
    it("converts a rock tile to soil", () => {
      // Add a rock tile at (3, 3)
      const rockCell = [...gridCellsQuery].find(
        (c) => c.gridCell?.gridX === 3 && c.gridCell?.gridZ === 3,
      );
      if (rockCell?.gridCell) rockCell.gridCell.type = "rock";

      const result = clearRock(3, 3);
      expect(result).toBe(true);
      expect(rockCell?.gridCell?.type).toBe("soil");
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
      const tree = [...treesQuery][0];
      expect(tree.tree?.stage).toBe(0);

      const result = removeSeedling(tree.id);
      expect(result).toBe(true);
      expect([...treesQuery].length).toBe(0);
    });

    it("fails for stage 2+ tree", () => {
      plantTree("white-oak", 0, 0);
      const tree = [...treesQuery][0];
      tree.tree!.stage = 2;

      const result = removeSeedling(tree.id);
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
      // 4x4 grid = 16 tiles, minus 1 occupied = 15
      expect(tiles.length).toBe(15);
    });

    it("findWaterableTrees returns unwatered trees", () => {
      plantTree("white-oak", 0, 0);
      plantTree("white-oak", 1, 0);
      expect(findWaterableTrees().length).toBe(2);

      const tree = [...treesQuery][0];
      waterTree(tree.id);
      expect(findWaterableTrees().length).toBe(1);
    });

    it("findHarvestableTrees returns ready-to-harvest trees", () => {
      plantTree("white-oak", 0, 0);
      const tree = [...treesQuery][0];
      tree.tree!.stage = 3;
      initHarvestable(tree);
      tree.harvestable!.ready = true;

      expect(findHarvestableTrees().length).toBe(1);
    });

    it("findMatureTrees returns stage 3+ trees", () => {
      plantTree("white-oak", 0, 0);
      plantTree("white-oak", 1, 0);
      const trees = [...treesQuery];
      trees[0].tree!.stage = 3;
      trees[1].tree!.stage = 1;

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
      useGameStore.setState({ stamina: 100 });
      const result = spendToolStamina("trowel");
      expect(result).toBe(true);
      expect(useGameStore.getState().stamina).toBe(95); // trowel costs 5
    });

    it("spendToolStamina returns false when stamina insufficient", () => {
      useGameStore.setState({ stamina: 2 });
      const result = spendToolStamina("trowel");
      expect(result).toBe(false);
    });

    it("spendToolStamina returns true for zero-cost tools", () => {
      const result = spendToolStamina("almanac");
      expect(result).toBe(true);
    });

    it("selectTool updates store", () => {
      selectTool("axe");
      expect(useGameStore.getState().selectedTool).toBe("axe");
    });

    it("selectSpecies updates store", () => {
      selectSpecies("sugar-maple");
      expect(useGameStore.getState().selectedSpecies).toBe("sugar-maple");
    });
  });
});
