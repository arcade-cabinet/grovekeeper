import {
  drainToolDurability,
  findHarvestableTrees,
  findMatureTrees,
  findPlantableTiles,
  findWaterableTrees,
  getPlayerTile,
  plantTree,
  pruneTree,
  selectTool,
  spendToolStamina,
  waterTree,
} from "@/game/actions";
import type { Entity } from "@/game/ecs/world";
import { generateEntityId, world } from "@/game/ecs/world";
import { useGameStore } from "@/game/stores";

// Mock harvest module
jest.mock("@/game/systems/harvest", () => ({
  collectHarvest: jest.fn(() => null),
  initHarvestable: jest.fn(),
}));

// Mock StructureManager
jest.mock("@/game/structures/StructureManager", () => ({
  getTemplate: jest.fn(() => null),
  canPlace: jest.fn(() => false),
}));

// Mock Toast
jest.mock("@/game/ui/Toast", () => ({
  showToast: jest.fn(),
}));

function addGridCell(
  gridX: number,
  gridZ: number,
  type: "soil" | "water" | "rock" | "path" = "soil",
  occupied = false,
): Entity {
  const entity: Entity = {
    id: generateEntityId(),
    position: { x: gridX, y: 0, z: gridZ },
    gridCell: { gridX, gridZ, type, occupied, treeEntityId: null },
  };
  world.add(entity);
  return entity;
}

function addPlayer(x = 6, z = 6): Entity {
  const entity: Entity = {
    id: "player",
    position: { x, y: 0, z },
    player: {
      coins: 100,
      xp: 0,
      level: 1,
      currentTool: "trowel",
      unlockedTools: ["trowel", "watering-can"],
      unlockedSpecies: ["white-oak"],
      stamina: 100,
      maxStamina: 100,
      hunger: 100,
      maxHunger: 100,
    },
    renderable: { visible: true, scale: 1 },
  };
  world.add(entity);
  return entity;
}

function addTree(
  gridX: number,
  gridZ: number,
  speciesId = "white-oak",
  stage: 0 | 1 | 2 | 3 | 4 = 0,
  watered = false,
): Entity {
  const entity: Entity = {
    id: generateEntityId(),
    position: { x: gridX, y: 0, z: gridZ },
    tree: {
      speciesId,
      stage,
      progress: 0,
      watered,
      totalGrowthTime: 0,
      plantedAt: Date.now(),
      meshSeed: 12345,
      wild: false,
      pruned: false,
      fertilized: false,
      baseModel: "tree01",
      winterModel: "",
      useWinterModel: false,
      seasonTint: "#228B22",
    },
    renderable: { visible: true, scale: 0.1 },
  };
  if (stage >= 3) {
    entity.harvestable = {
      resources: [{ type: "timber", amount: 2 }],
      cooldownElapsed: 0,
      cooldownTotal: 45,
      ready: stage >= 3,
    };
  }
  world.add(entity);
  return entity;
}

describe("GameActions", () => {
  beforeEach(() => {
    // Clear ECS world
    for (const entity of [...world.entities]) {
      world.remove(entity);
    }
    // Reset game store
    useGameStore.getState().resetGame();
  });

  describe("findPlantableTiles", () => {
    it("returns empty array when no grid cells exist", () => {
      expect(findPlantableTiles()).toEqual([]);
    });

    it("returns soil tiles that are not occupied", () => {
      addGridCell(0, 0, "soil", false);
      addGridCell(1, 0, "soil", true);
      addGridCell(2, 0, "water", false);
      const tiles = findPlantableTiles();
      expect(tiles).toHaveLength(1);
      expect(tiles[0].gridX).toBe(0);
      expect(tiles[0].gridZ).toBe(0);
    });

    it("excludes water and rock tiles", () => {
      addGridCell(0, 0, "water", false);
      addGridCell(1, 0, "rock", false);
      const tiles = findPlantableTiles();
      expect(tiles).toHaveLength(0);
    });

    it("returns multiple plantable tiles", () => {
      addGridCell(0, 0, "soil", false);
      addGridCell(1, 1, "soil", false);
      addGridCell(2, 2, "soil", false);
      expect(findPlantableTiles()).toHaveLength(3);
    });
  });

  describe("findWaterableTrees", () => {
    it("returns empty array when no trees exist", () => {
      expect(findWaterableTrees()).toEqual([]);
    });

    it("returns trees that are not watered", () => {
      addTree(0, 0, "white-oak", 0, false);
      addTree(1, 0, "white-oak", 0, true);
      const trees = findWaterableTrees();
      expect(trees).toHaveLength(1);
      expect(trees[0].tree!.watered).toBe(false);
    });
  });

  describe("findHarvestableTrees", () => {
    it("returns empty array when no harvestable trees exist", () => {
      expect(findHarvestableTrees()).toEqual([]);
    });

    it("returns trees with harvestable.ready === true", () => {
      const tree = addTree(0, 0, "white-oak", 3);
      tree.harvestable!.ready = true;
      const result = findHarvestableTrees();
      expect(result).toHaveLength(1);
    });

    it("excludes trees with harvestable.ready === false", () => {
      const tree = addTree(0, 0, "white-oak", 3);
      tree.harvestable!.ready = false;
      expect(findHarvestableTrees()).toHaveLength(0);
    });
  });

  describe("findMatureTrees", () => {
    it("returns empty array when no trees exist", () => {
      expect(findMatureTrees()).toEqual([]);
    });

    it("returns trees at stage 3 and above", () => {
      addTree(0, 0, "white-oak", 2);
      addTree(1, 0, "white-oak", 3);
      addTree(2, 0, "white-oak", 4);
      const result = findMatureTrees();
      expect(result).toHaveLength(2);
    });
  });

  describe("getPlayerTile", () => {
    it("returns null when no player entity exists", () => {
      expect(getPlayerTile()).toBeNull();
    });

    it("returns rounded player position", () => {
      addPlayer(5.7, 3.2);
      const tile = getPlayerTile();
      expect(tile).toEqual({ gridX: 6, gridZ: 3 });
    });
  });

  describe("plantTree", () => {
    it("fails when player has no seeds", () => {
      addGridCell(3, 3, "soil", false);
      useGameStore.getState().spendSeed("white-oak", 10);
      expect(plantTree("white-oak", 3, 3)).toBe(false);
    });

    it("fails when target cell does not exist", () => {
      expect(plantTree("white-oak", 99, 99)).toBe(false);
    });

    it("fails when target cell is occupied", () => {
      addGridCell(3, 3, "soil", true);
      expect(plantTree("white-oak", 3, 3)).toBe(false);
    });

    it("fails when target cell is water", () => {
      addGridCell(3, 3, "water", false);
      expect(plantTree("white-oak", 3, 3)).toBe(false);
    });

    it("succeeds on valid empty soil tile with seeds", () => {
      addGridCell(3, 3, "soil", false);
      const result = plantTree("white-oak", 3, 3);
      expect(result).toBe(true);
    });

    it("spends a seed on successful plant", () => {
      addGridCell(3, 3, "soil", false);
      const seedsBefore = useGameStore.getState().seeds["white-oak"];
      plantTree("white-oak", 3, 3);
      const seedsAfter = useGameStore.getState().seeds["white-oak"];
      expect(seedsAfter).toBe(seedsBefore - 1);
    });

    it("marks tile as occupied after planting", () => {
      const cellEntity = addGridCell(3, 3, "soil", false);
      plantTree("white-oak", 3, 3);
      expect(cellEntity.gridCell!.occupied).toBe(true);
    });

    it("increments treesPlanted stat", () => {
      addGridCell(3, 3, "soil", false);
      plantTree("white-oak", 3, 3);
      expect(useGameStore.getState().treesPlanted).toBe(1);
    });

    it("adds XP on successful plant", () => {
      addGridCell(3, 3, "soil", false);
      plantTree("white-oak", 3, 3);
      expect(useGameStore.getState().xp).toBeGreaterThan(0);
    });
  });

  describe("waterTree", () => {
    it("fails when tree does not exist", () => {
      expect(waterTree("nonexistent")).toBe(false);
    });

    it("fails when tree is already watered", () => {
      const tree = addTree(0, 0, "white-oak", 0, true);
      expect(waterTree(tree.id)).toBe(false);
    });

    it("succeeds and sets watered to true", () => {
      const tree = addTree(0, 0, "white-oak", 0, false);
      const result = waterTree(tree.id);
      expect(result).toBe(true);
      expect(tree.tree!.watered).toBe(true);
    });

    it("increments treesWatered stat", () => {
      const tree = addTree(0, 0, "white-oak", 0, false);
      waterTree(tree.id);
      expect(useGameStore.getState().treesWatered).toBe(1);
    });

    it("adds XP on successful water", () => {
      const tree = addTree(0, 0, "white-oak", 0, false);
      waterTree(tree.id);
      expect(useGameStore.getState().xp).toBe(5);
    });
  });

  describe("pruneTree", () => {
    it("fails on non-mature tree (stage < 3)", () => {
      const tree = addTree(0, 0, "white-oak", 2);
      expect(pruneTree(tree.id)).toBe(false);
    });

    it("succeeds on mature tree and sets pruned flag", () => {
      const tree = addTree(0, 0, "white-oak", 3);
      const result = pruneTree(tree.id);
      expect(result).toBe(true);
      expect(tree.tree!.pruned).toBe(true);
    });

    it("adds XP on successful prune", () => {
      const tree = addTree(0, 0, "white-oak", 3);
      pruneTree(tree.id);
      expect(useGameStore.getState().xp).toBe(5);
    });

    it("fails when tree does not exist", () => {
      expect(pruneTree("nonexistent")).toBe(false);
    });
  });

  describe("selectTool", () => {
    it("updates the selected tool in the store", () => {
      selectTool("axe");
      expect(useGameStore.getState().selectedTool).toBe("axe");
    });

    it("can switch between tools", () => {
      selectTool("axe");
      selectTool("watering-can");
      expect(useGameStore.getState().selectedTool).toBe("watering-can");
    });
  });

  describe("spendToolStamina", () => {
    it("returns true for tools with 0 stamina cost", () => {
      expect(spendToolStamina("almanac")).toBe(true);
    });

    it("returns true and reduces stamina for trowel", () => {
      const before = useGameStore.getState().stamina;
      const result = spendToolStamina("trowel");
      expect(result).toBe(true);
      expect(useGameStore.getState().stamina).toBe(before - 5);
    });

    it("returns true for unknown tool ID (getToolById returns undefined)", () => {
      // When tool is not found, spendToolStamina returns true (no cost)
      expect(spendToolStamina("nonexistent-tool")).toBe(true);
    });

    it("returns false when stamina is insufficient", () => {
      useGameStore.getState().setStamina(2);
      expect(spendToolStamina("trowel")).toBe(false);
      expect(useGameStore.getState().stamina).toBe(2);
    });
  });

  describe("drainToolDurability (Spec §11.3)", () => {
    it("returns true for tools with maxDurability === 0 (almanac, seed-pouch)", () => {
      // Tools exempt from wear always return true regardless of state
      expect(drainToolDurability("almanac")).toBe(true);
      expect(drainToolDurability("seed-pouch")).toBe(true);
    });

    it("returns true for unknown tool ID (no-op, no cost)", () => {
      expect(drainToolDurability("nonexistent-tool")).toBe(true);
    });

    it("drains 1 durability on standard use", () => {
      // Lazy init: absent from map = maxDurability (100)
      drainToolDurability("trowel");
      expect(useGameStore.getState().toolDurabilities.trowel).toBe(99);
    });

    it("drains a custom amount when specified", () => {
      // Wrong target = 3 durability per Spec §11.3
      drainToolDurability("axe", 3);
      expect(useGameStore.getState().toolDurabilities.axe).toBe(97);
    });

    it("returns false when tool is already broken (durability === 0)", () => {
      useGameStore.getState().setToolDurability("trowel", 0);
      expect(drainToolDurability("trowel")).toBe(false);
    });

    it("clamps durability at 0, does not go negative", () => {
      useGameStore.getState().setToolDurability("shovel", 1);
      drainToolDurability("shovel", 5);
      expect(useGameStore.getState().toolDurabilities.shovel).toBe(0);
    });

    it("each consecutive drain reduces durability by 1", () => {
      drainToolDurability("watering-can");
      drainToolDurability("watering-can");
      drainToolDurability("watering-can");
      expect(useGameStore.getState().toolDurabilities["watering-can"]).toBe(97);
    });
  });
});
