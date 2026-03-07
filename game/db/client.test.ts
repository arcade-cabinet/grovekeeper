import { getTableColumns, getTableName } from "drizzle-orm";
import {
  saveConfig,
  player,
  resources,
  seeds,
  unlocks,
  achievements,
  trees,
  gridCells,
  structures,
  quests,
  questGoals,
  worldState,
  timeState,
  tracking,
  settings,
  toolUpgrades,
} from "./schema";

describe("db schema", () => {
  describe("save_config table", () => {
    it("has the correct table name", () => {
      expect(getTableName(saveConfig)).toBe("save_config");
    });

    it("has all required columns", () => {
      const columns = getTableColumns(saveConfig);
      const columnNames = Object.keys(columns);
      expect(columnNames).toContain("id");
      expect(columnNames).toContain("difficulty");
      expect(columnNames).toContain("permadeath");
      expect(columnNames).toContain("version");
      expect(columnNames).toContain("createdAt");
    });
  });

  describe("player table", () => {
    it("has the correct table name", () => {
      expect(getTableName(player)).toBe("player");
    });

    it("has all required columns", () => {
      const columns = getTableColumns(player);
      const columnNames = Object.keys(columns);
      expect(columnNames).toContain("id");
      expect(columnNames).toContain("level");
      expect(columnNames).toContain("xp");
      expect(columnNames).toContain("coins");
      expect(columnNames).toContain("stamina");
      expect(columnNames).toContain("maxStamina");
      expect(columnNames).toContain("selectedTool");
      expect(columnNames).toContain("selectedSpecies");
      expect(columnNames).toContain("gridSize");
      expect(columnNames).toContain("prestigeCount");
      expect(columnNames).toContain("activeBorderCosmetic");
      expect(columnNames).toContain("bodyTemp");
    });
  });

  describe("resources table", () => {
    it("has the correct table name", () => {
      expect(getTableName(resources)).toBe("resources");
    });

    it("has all required columns", () => {
      const columns = getTableColumns(resources);
      const columnNames = Object.keys(columns);
      expect(columnNames).toContain("id");
      expect(columnNames).toContain("type");
      expect(columnNames).toContain("current");
      expect(columnNames).toContain("lifetime");
    });
  });

  describe("seeds table", () => {
    it("has the correct table name", () => {
      expect(getTableName(seeds)).toBe("seeds");
    });
  });

  describe("unlocks table", () => {
    it("has the correct table name", () => {
      expect(getTableName(unlocks)).toBe("unlocks");
    });
  });

  describe("achievements table", () => {
    it("has the correct table name", () => {
      expect(getTableName(achievements)).toBe("achievements");
    });
  });

  describe("trees table", () => {
    it("has the correct table name", () => {
      expect(getTableName(trees)).toBe("trees");
    });

    it("has all required columns", () => {
      const columns = getTableColumns(trees);
      const columnNames = Object.keys(columns);
      expect(columnNames).toContain("speciesId");
      expect(columnNames).toContain("gridX");
      expect(columnNames).toContain("gridZ");
      expect(columnNames).toContain("zoneId");
      expect(columnNames).toContain("stage");
      expect(columnNames).toContain("progress");
      expect(columnNames).toContain("watered");
      expect(columnNames).toContain("fertilized");
      expect(columnNames).toContain("pruned");
      expect(columnNames).toContain("totalGrowthTime");
      expect(columnNames).toContain("plantedAt");
      expect(columnNames).toContain("meshSeed");
      expect(columnNames).toContain("harvestCooldownElapsed");
      expect(columnNames).toContain("harvestReady");
      expect(columnNames).toContain("blightType");
    });
  });

  describe("grid_cells table", () => {
    it("has the correct table name", () => {
      expect(getTableName(gridCells)).toBe("grid_cells");
    });
  });

  describe("structures table", () => {
    it("has the correct table name", () => {
      expect(getTableName(structures)).toBe("structures");
    });
  });

  describe("quests table", () => {
    it("has the correct table name", () => {
      expect(getTableName(quests)).toBe("quests");
    });
  });

  describe("quest_goals table", () => {
    it("has the correct table name", () => {
      expect(getTableName(questGoals)).toBe("quest_goals");
    });
  });

  describe("world_state table", () => {
    it("has the correct table name", () => {
      expect(getTableName(worldState)).toBe("world_state");
    });
  });

  describe("time_state table", () => {
    it("has the correct table name", () => {
      expect(getTableName(timeState)).toBe("time_state");
    });
  });

  describe("tracking table", () => {
    it("has the correct table name", () => {
      expect(getTableName(tracking)).toBe("tracking");
    });

    it("has all tracking columns", () => {
      const columns = getTableColumns(tracking);
      const columnNames = Object.keys(columns);
      expect(columnNames).toContain("treesPlanted");
      expect(columnNames).toContain("treesMatured");
      expect(columnNames).toContain("treesHarvested");
      expect(columnNames).toContain("treesWatered");
      expect(columnNames).toContain("seasonsExperiencedJson");
      expect(columnNames).toContain("speciesPlantedJson");
      expect(columnNames).toContain("toolUseCountsJson");
    });
  });

  describe("settings table", () => {
    it("has the correct table name", () => {
      expect(getTableName(settings)).toBe("settings");
    });

    it("has all required columns", () => {
      const columns = getTableColumns(settings);
      const columnNames = Object.keys(columns);
      expect(columnNames).toContain("id");
      expect(columnNames).toContain("hasSeenRules");
      expect(columnNames).toContain("hapticsEnabled");
      expect(columnNames).toContain("soundEnabled");
    });
  });

  describe("tool_upgrades table", () => {
    it("has the correct table name", () => {
      expect(getTableName(toolUpgrades)).toBe("tool_upgrades");
    });
  });

  it("exports all 16 tables", () => {
    const tables = [
      saveConfig, player, resources, seeds, unlocks, achievements,
      trees, gridCells, structures, quests, questGoals, worldState,
      timeState, tracking, settings, toolUpgrades,
    ];
    expect(tables).toHaveLength(16);
    for (const table of tables) {
      expect(table).toBeDefined();
    }
  });
});
