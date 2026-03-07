import { emptyResources } from "@/game/config/resources";
import { chunkDiffs$, saveChunkDiff } from "@/game/world/chunkPersistence";
import type { SerializedTree } from "./core";
import { levelFromXp, totalXpForLevel, useGameStore, xpToNext } from "./index";

describe("Player State Store (Spec §3, §11, §12, §13, §16)", () => {
  beforeEach(() => {
    useGameStore.getState().resetGame();
  });

  describe("Initial state", () => {
    it("starts on menu screen", () => {
      expect(useGameStore.getState().screen).toBe("menu");
    });

    it("has initial coins", () => {
      expect(useGameStore.getState().coins).toBe(100);
    });

    it("has default tools unlocked", () => {
      const tools = useGameStore.getState().unlockedTools;
      expect(tools).toContain("trowel");
      expect(tools).toContain("watering-can");
    });

    it("has starter species unlocked", () => {
      const species = useGameStore.getState().unlockedSpecies;
      expect(species).toContain("white-oak");
    });
  });

  describe("Actions", () => {
    it("setScreen changes current screen", () => {
      useGameStore.getState().setScreen("playing");
      expect(useGameStore.getState().screen).toBe("playing");
    });

    it("addCoins increases coin count", () => {
      const initial = useGameStore.getState().coins;
      useGameStore.getState().addCoins(50);
      expect(useGameStore.getState().coins).toBe(initial + 50);
    });

    it("addXp increases XP and can level up", () => {
      useGameStore.getState().addXp(100);
      expect(useGameStore.getState().xp).toBe(100);
      expect(useGameStore.getState().level).toBe(2);
    });

    it("unlockTool adds new tool without duplicates", () => {
      useGameStore.getState().unlockTool("axe");
      useGameStore.getState().unlockTool("axe");
      const tools = useGameStore.getState().unlockedTools;
      expect(tools.filter((t) => t === "axe").length).toBe(1);
    });

    it("unlockSpecies adds new species without duplicates", () => {
      useGameStore.getState().unlockSpecies("pine");
      useGameStore.getState().unlockSpecies("pine");
      const species = useGameStore.getState().unlockedSpecies;
      expect(species.filter((s) => s === "pine").length).toBe(1);
    });

    it("incrementTreesPlanted tracks planted trees", () => {
      useGameStore.getState().incrementTreesPlanted();
      useGameStore.getState().incrementTreesPlanted();
      expect(useGameStore.getState().treesPlanted).toBe(2);
    });

    it("resetGame restores initial state", () => {
      useGameStore.getState().addCoins(1000);
      useGameStore.getState().setScreen("playing");
      useGameStore.getState().resetGame();
      expect(useGameStore.getState().coins).toBe(100);
      expect(useGameStore.getState().screen).toBe("menu");
    });
  });

  describe("Stamina", () => {
    it("starts with 100 stamina", () => {
      expect(useGameStore.getState().stamina).toBe(100);
      expect(useGameStore.getState().maxStamina).toBe(100);
    });

    it("setStamina updates stamina value", () => {
      useGameStore.getState().setStamina(50);
      expect(useGameStore.getState().stamina).toBe(50);
    });

    it("resetGame restores stamina to 100", () => {
      useGameStore.getState().setStamina(0);
      useGameStore.getState().resetGame();
      expect(useGameStore.getState().stamina).toBe(100);
    });
  });

  describe("Grove serialization", () => {
    const mockTree: SerializedTree = {
      speciesId: "white-oak",
      gridX: 3,
      gridZ: 5,
      stage: 2,
      progress: 0.4,
      watered: true,
      totalGrowthTime: 60,
      plantedAt: Date.now(),
      meshSeed: 12345,
    };

    it("starts with null groveData", () => {
      expect(useGameStore.getState().groveData).toBeNull();
    });

    it("saveGrove stores trees and player position", () => {
      useGameStore.getState().saveGrove([mockTree], { x: 4, z: 7 });
      const grove = useGameStore.getState().groveData;
      expect(grove).not.toBeNull();
      expect(grove!.trees).toHaveLength(1);
      expect(grove!.trees[0].speciesId).toBe("white-oak");
      expect(grove!.trees[0].stage).toBe(2);
      expect(grove!.playerPosition).toEqual({ x: 4, z: 7 });
    });

    it("saveGrove round-trips all tree fields", () => {
      useGameStore.getState().saveGrove([mockTree], { x: 0, z: 0 });
      const saved = useGameStore.getState().groveData!.trees[0];
      expect(saved.speciesId).toBe(mockTree.speciesId);
      expect(saved.gridX).toBe(mockTree.gridX);
      expect(saved.gridZ).toBe(mockTree.gridZ);
      expect(saved.stage).toBe(mockTree.stage);
      expect(saved.progress).toBe(mockTree.progress);
      expect(saved.watered).toBe(mockTree.watered);
      expect(saved.totalGrowthTime).toBe(mockTree.totalGrowthTime);
      expect(saved.plantedAt).toBe(mockTree.plantedAt);
      expect(saved.meshSeed).toBe(mockTree.meshSeed);
    });

    it("saveGrove overwrites previous grove data", () => {
      useGameStore.getState().saveGrove([mockTree], { x: 0, z: 0 });
      useGameStore.getState().saveGrove([], { x: 1, z: 1 });
      const grove = useGameStore.getState().groveData;
      expect(grove!.trees).toHaveLength(0);
      expect(grove!.playerPosition).toEqual({ x: 1, z: 1 });
    });

    it("resetGame clears groveData", () => {
      useGameStore.getState().saveGrove([mockTree], { x: 0, z: 0 });
      useGameStore.getState().resetGame();
      expect(useGameStore.getState().groveData).toBeNull();
    });
  });

  describe("Level progression (spec formula)", () => {
    it("xpToNext returns 100 for level 1", () => {
      expect(xpToNext(1)).toBe(100);
    });

    it("xpToNext returns 100 for level 2", () => {
      expect(xpToNext(2)).toBe(100);
    });

    it("xpToNext returns 150 for level 3", () => {
      expect(xpToNext(3)).toBe(150);
    });

    it("xpToNext includes milestone bonus at level 6", () => {
      expect(xpToNext(6)).toBe(500);
    });

    it("levels up at 100 XP (level 1 -> 2)", () => {
      useGameStore.getState().addXp(99);
      expect(useGameStore.getState().level).toBe(1);
      useGameStore.getState().addXp(1);
      expect(useGameStore.getState().level).toBe(2);
    });

    it("levelFromXp matches totalXpForLevel", () => {
      expect(totalXpForLevel(4)).toBe(350);
      expect(levelFromXp(350)).toBe(4);
      expect(levelFromXp(349)).toBe(3);
    });
  });

  describe("Stamina spending", () => {
    it("spendStamina reduces stamina and returns true", () => {
      const result = useGameStore.getState().spendStamina(10);
      expect(result).toBe(true);
      expect(useGameStore.getState().stamina).toBe(90);
    });

    it("spendStamina returns false if insufficient", () => {
      useGameStore.getState().setStamina(5);
      const result = useGameStore.getState().spendStamina(10);
      expect(result).toBe(false);
      expect(useGameStore.getState().stamina).toBe(5);
    });
  });

  describe("Achievement tracking", () => {
    it("unlockAchievement adds to achievements array", () => {
      useGameStore.getState().unlockAchievement("first-seed");
      expect(useGameStore.getState().achievements).toContain("first-seed");
    });

    it("unlockAchievement does not duplicate", () => {
      useGameStore.getState().unlockAchievement("first-seed");
      useGameStore.getState().unlockAchievement("first-seed");
      expect(
        useGameStore.getState().achievements.filter((a) => a === "first-seed"),
      ).toHaveLength(1);
    });
  });

  describe("Species and season tracking", () => {
    it("trackSpeciesPlanted adds species without duplicates", () => {
      useGameStore.getState().trackSpeciesPlanted("white-oak");
      useGameStore.getState().trackSpeciesPlanted("white-oak");
      useGameStore.getState().trackSpeciesPlanted("elder-pine");
      expect(useGameStore.getState().speciesPlanted).toEqual(["white-oak", "elder-pine"]);
    });

    it("trackSeason adds seasons without duplicates", () => {
      useGameStore.getState().trackSeason("spring");
      useGameStore.getState().trackSeason("spring");
      useGameStore.getState().trackSeason("summer");
      expect(useGameStore.getState().seasonsExperienced).toEqual(["spring", "summer"]);
    });
  });

  describe("expandGrid action", () => {
    it("expands from 12 to 16 when conditions met", () => {
      useGameStore.setState({
        level: 5,
        resources: { ...emptyResources(), timber: 100, sap: 50 },
      });
      const result = useGameStore.getState().expandGrid();
      expect(result).toBe(true);
      expect(useGameStore.getState().gridSize).toBe(16);
    });

    it("deducts resources on expansion", () => {
      useGameStore.setState({
        level: 5,
        resources: { ...emptyResources(), timber: 200, sap: 100 },
      });
      useGameStore.getState().expandGrid();
      const res = useGameStore.getState().resources;
      expect(res.timber).toBe(100);
      expect(res.sap).toBe(50);
    });

    it("fails if insufficient level", () => {
      useGameStore.setState({
        level: 4,
        resources: { ...emptyResources(), timber: 1000, sap: 1000, fruit: 1000, acorns: 1000 },
      });
      const result = useGameStore.getState().expandGrid();
      expect(result).toBe(false);
      expect(useGameStore.getState().gridSize).toBe(12);
    });

    it("fails if insufficient resources", () => {
      useGameStore.setState({
        level: 5,
        resources: { ...emptyResources(), timber: 50, sap: 50 },
      });
      const result = useGameStore.getState().expandGrid();
      expect(result).toBe(false);
      expect(useGameStore.getState().gridSize).toBe(12);
    });

    it("fails at max grid size (32)", () => {
      useGameStore.setState({
        level: 99,
        gridSize: 32,
        resources: { ...emptyResources(), timber: 9999, sap: 9999, fruit: 9999, acorns: 9999 },
      });
      const result = useGameStore.getState().expandGrid();
      expect(result).toBe(false);
      expect(useGameStore.getState().gridSize).toBe(32);
    });

    it("chain expands through multiple tiers", () => {
      useGameStore.setState({
        level: 20,
        resources: { ...emptyResources(), timber: 9999, sap: 9999, fruit: 9999, acorns: 9999 },
      });
      useGameStore.getState().expandGrid();
      expect(useGameStore.getState().gridSize).toBe(16);
      useGameStore.getState().expandGrid();
      expect(useGameStore.getState().gridSize).toBe(20);
      useGameStore.getState().expandGrid();
      expect(useGameStore.getState().gridSize).toBe(24);
      useGameStore.getState().expandGrid();
      expect(useGameStore.getState().gridSize).toBe(32);
    });
  });

  describe("performPrestige action", () => {
    it("fails if level < 25", () => {
      useGameStore.setState({ level: 24 });
      const result = useGameStore.getState().performPrestige();
      expect(result).toBe(false);
      expect(useGameStore.getState().prestigeCount).toBe(0);
    });

    it("succeeds at level 25 and increments prestige count", () => {
      useGameStore.setState({ level: 25, xp: 99999 });
      const result = useGameStore.getState().performPrestige();
      expect(result).toBe(true);
      expect(useGameStore.getState().prestigeCount).toBe(1);
    });

    it("resets level, xp, trees planted/harvested/watered/matured to 0/1", () => {
      useGameStore.setState({
        level: 25,
        xp: 99999,
        treesPlanted: 500,
        treesHarvested: 200,
        treesWatered: 300,
        treesMatured: 100,
      });
      useGameStore.getState().performPrestige();
      const state = useGameStore.getState();
      expect(state.level).toBe(1);
      expect(state.xp).toBe(0);
      expect(state.treesPlanted).toBe(0);
      expect(state.treesHarvested).toBe(0);
      expect(state.treesWatered).toBe(0);
      expect(state.treesMatured).toBe(0);
    });

    it("resets resources and seeds to defaults", () => {
      useGameStore.setState({
        level: 25,
        xp: 99999,
        resources: { ...emptyResources(), timber: 9999, sap: 9999, fruit: 9999, acorns: 9999 },
      });
      useGameStore.getState().performPrestige();
      const state = useGameStore.getState();
      expect(state.resources).toEqual(emptyResources());
      expect(state.seeds).toEqual({ "white-oak": 10 });
    });

    it("preserves achievements across prestige", () => {
      useGameStore.setState({
        level: 25,
        xp: 99999,
        achievements: ["first-seed", "seed-spreader"],
      });
      useGameStore.getState().performPrestige();
      expect(useGameStore.getState().achievements).toContain("first-seed");
      expect(useGameStore.getState().achievements).toContain("seed-spreader");
    });

    it("preserves lifetime resources across prestige", () => {
      useGameStore.setState({
        level: 25,
        xp: 99999,
        lifetimeResources: { ...emptyResources(), timber: 5000, sap: 3000, fruit: 2000, acorns: 1000 },
      });
      useGameStore.getState().performPrestige();
      expect(useGameStore.getState().lifetimeResources.timber).toBe(5000);
    });

    it("preserves settings across prestige", () => {
      useGameStore.setState({
        level: 25,
        xp: 99999,
        hasSeenRules: true,
        hapticsEnabled: false,
        soundEnabled: false,
      });
      useGameStore.getState().performPrestige();
      const state = useGameStore.getState();
      expect(state.hasSeenRules).toBe(true);
      expect(state.hapticsEnabled).toBe(false);
      expect(state.soundEnabled).toBe(false);
    });

    it("increases max stamina with prestige bonus", () => {
      useGameStore.setState({ level: 25, xp: 99999 });
      useGameStore.getState().performPrestige();
      expect(useGameStore.getState().maxStamina).toBe(110);
      expect(useGameStore.getState().stamina).toBe(110);
    });

    it("unlocks crystal-oak at prestige 1", () => {
      useGameStore.setState({ level: 25, xp: 99999 });
      useGameStore.getState().performPrestige();
      expect(useGameStore.getState().unlockedSpecies).toContain("crystal-oak");
    });

    it("resets grid size to 12", () => {
      useGameStore.setState({ level: 25, xp: 99999, gridSize: 24 });
      useGameStore.getState().performPrestige();
      expect(useGameStore.getState().gridSize).toBe(12);
    });

    it("clears placed structures", () => {
      useGameStore.setState({
        level: 25,
        xp: 99999,
        placedStructures: [{ templateId: "well", worldX: 5, worldZ: 5 }],
      });
      useGameStore.getState().performPrestige();
      expect(useGameStore.getState().placedStructures).toEqual([]);
    });

    it("resets tools to trowel and watering-can", () => {
      useGameStore.setState({
        level: 25,
        xp: 99999,
        unlockedTools: ["trowel", "watering-can", "axe", "shovel", "pruning-shears"],
      });
      useGameStore.getState().performPrestige();
      expect(useGameStore.getState().unlockedTools).toEqual(["trowel", "watering-can"]);
    });
  });

  describe("performPrestige -- chunk-based NG+ (Spec §16.3)", () => {
    beforeEach(() => {
      useGameStore.getState().resetGame();
    });

    it("clears all chunk diffs on prestige", () => {
      saveChunkDiff("0,0", {
        plantedTrees: [
          { localX: 0, localZ: 0, speciesId: "white-oak", stage: 1, progress: 0.5, plantedAt: 0, meshSeed: 1 },
        ],
      });
      saveChunkDiff("1,0", { plantedTrees: [] });
      expect(Object.keys(chunkDiffs$.peek())).toHaveLength(2);

      useGameStore.setState({ level: 25 });
      useGameStore.getState().performPrestige();

      expect(chunkDiffs$.peek()).toEqual({});
    });

    it("generates a new non-empty worldSeed on prestige", () => {
      useGameStore.setState({ level: 25, worldSeed: "old-seed" });
      useGameStore.getState().performPrestige();
      const newSeed = useGameStore.getState().worldSeed;
      expect(newSeed).not.toBe("old-seed");
      expect(newSeed.length).toBeGreaterThan(0);
    });

    it("resets questChainState to fresh state on prestige", () => {
      useGameStore.getState().discoverSpirit("spirit-0");
      const prePrestige = useGameStore.getState().questChainState;
      expect(Object.keys(prePrestige.activeChains)).toHaveLength(1);

      useGameStore.setState({ level: 25 });
      useGameStore.getState().performPrestige();

      const postPrestige = useGameStore.getState().questChainState;
      expect(Object.keys(postPrestige.activeChains)).toHaveLength(0);
    });

    it("resets toolUpgrades on prestige", () => {
      useGameStore.setState({ level: 25, toolUpgrades: { trowel: 2, axe: 1 } });
      useGameStore.getState().performPrestige();
      expect(useGameStore.getState().toolUpgrades).toEqual({});
    });

    it("resets toolDurabilities on prestige", () => {
      useGameStore.setState({ level: 25, toolDurabilities: { trowel: 50, axe: 75 } });
      useGameStore.getState().performPrestige();
      expect(useGameStore.getState().toolDurabilities).toEqual({});
    });

    it("carries over discoveredSpiritIds across prestige", () => {
      useGameStore.getState().discoverSpirit("spirit-0");
      useGameStore.getState().discoverSpirit("spirit-1");
      useGameStore.setState({ level: 25 });
      useGameStore.getState().performPrestige();
      const ids = useGameStore.getState().discoveredSpiritIds;
      expect(ids).toContain("spirit-0");
      expect(ids).toContain("spirit-1");
    });

    it("carries over npcRelationships across prestige", () => {
      useGameStore.getState().setNpcRelationship("elder-oak", 80);
      useGameStore.setState({ level: 25 });
      useGameStore.getState().performPrestige();
      expect(useGameStore.getState().npcRelationships["elder-oak"]).toBe(80);
    });
  });

  describe("Build mode actions", () => {
    it("setBuildMode enables build mode with template", () => {
      useGameStore.getState().setBuildMode(true, "well");
      const state = useGameStore.getState();
      expect(state.buildMode).toBe(true);
      expect(state.buildTemplateId).toBe("well");
    });

    it("setBuildMode disables build mode and clears template", () => {
      useGameStore.getState().setBuildMode(true, "well");
      useGameStore.getState().setBuildMode(false);
      const state = useGameStore.getState();
      expect(state.buildMode).toBe(false);
      expect(state.buildTemplateId).toBeNull();
    });

    it("addPlacedStructure adds to the array", () => {
      useGameStore.getState().addPlacedStructure("well", 5, 5);
      expect(useGameStore.getState().placedStructures).toHaveLength(1);
      expect(useGameStore.getState().placedStructures[0]).toEqual({
        templateId: "well",
        worldX: 5,
        worldZ: 5,
      });
    });

    it("removePlacedStructure removes by position", () => {
      useGameStore.getState().addPlacedStructure("well", 5, 5);
      useGameStore.getState().addPlacedStructure("greenhouse", 10, 10);
      useGameStore.getState().removePlacedStructure(5, 5);
      expect(useGameStore.getState().placedStructures).toHaveLength(1);
      expect(useGameStore.getState().placedStructures[0].templateId).toBe("greenhouse");
    });
  });

  describe("Discovery and zone actions", () => {
    it("discoverZone adds zone and returns true", () => {
      const result = useGameStore.getState().discoverZone("forest-1");
      expect(result).toBe(true);
      expect(useGameStore.getState().discoveredZones).toContain("forest-1");
    });

    it("discoverZone returns false for already discovered zone", () => {
      useGameStore.getState().discoverZone("forest-1");
      const result = useGameStore.getState().discoverZone("forest-1");
      expect(result).toBe(false);
    });

    it("discoverZone awards 50 discovery XP", () => {
      const initialXp = useGameStore.getState().xp;
      useGameStore.getState().discoverZone("forest-1");
      expect(useGameStore.getState().xp).toBe(initialXp + 50);
    });

    it("starting-grove is already discovered", () => {
      expect(useGameStore.getState().discoveredZones).toContain("starting-grove");
    });

    it("setCurrentZoneId changes current zone", () => {
      useGameStore.getState().setCurrentZoneId("forest-1");
      expect(useGameStore.getState().currentZoneId).toBe("forest-1");
    });

    it("setWorldSeed changes world seed", () => {
      useGameStore.getState().setWorldSeed("abc123");
      expect(useGameStore.getState().worldSeed).toBe("abc123");
    });
  });

  describe("Achievement expansion tracking actions", () => {
    it("incrementToolUse counts tool uses", () => {
      useGameStore.getState().incrementToolUse("watering-can");
      useGameStore.getState().incrementToolUse("watering-can");
      useGameStore.getState().incrementToolUse("axe");
      const counts = useGameStore.getState().toolUseCounts;
      expect(counts["watering-can"]).toBe(2);
      expect(counts.axe).toBe(1);
    });

    it("incrementWildTreesHarvested increments count", () => {
      useGameStore.getState().incrementWildTreesHarvested("white-oak");
      useGameStore.getState().incrementWildTreesHarvested("elder-pine");
      expect(useGameStore.getState().wildTreesHarvested).toBe(2);
    });

    it("incrementWildTreesHarvested tracks unique species", () => {
      useGameStore.getState().incrementWildTreesHarvested("white-oak");
      useGameStore.getState().incrementWildTreesHarvested("white-oak");
      useGameStore.getState().incrementWildTreesHarvested("elder-pine");
      expect(useGameStore.getState().wildSpeciesHarvested).toEqual(["white-oak", "elder-pine"]);
    });

    it("incrementWildTreesRegrown increments count", () => {
      useGameStore.getState().incrementWildTreesRegrown();
      useGameStore.getState().incrementWildTreesRegrown();
      expect(useGameStore.getState().wildTreesRegrown).toBe(2);
    });

    it("trackVisitedZoneType adds unique zone types", () => {
      useGameStore.getState().trackVisitedZoneType("forest");
      useGameStore.getState().trackVisitedZoneType("forest");
      useGameStore.getState().trackVisitedZoneType("grove");
      expect(useGameStore.getState().visitedZoneTypes).toEqual(["forest", "grove"]);
    });

    it("incrementSeasonalPlanting only increments spring count", () => {
      useGameStore.getState().incrementSeasonalPlanting("spring");
      useGameStore.getState().incrementSeasonalPlanting("summer");
      expect(useGameStore.getState().treesPlantedInSpring).toBe(1);
    });

    it("incrementSeasonalHarvest only increments autumn count", () => {
      useGameStore.getState().incrementSeasonalHarvest("autumn");
      useGameStore.getState().incrementSeasonalHarvest("spring");
      expect(useGameStore.getState().treesHarvestedInAutumn).toBe(1);
    });
  });

  describe("Tool upgrade actions", () => {
    it("upgradeToolTier fails with insufficient resources", () => {
      const result = useGameStore.getState().upgradeToolTier("trowel");
      expect(result).toBe(false);
      expect(useGameStore.getState().toolUpgrades.trowel).toBeUndefined();
    });

    it("upgradeToolTier succeeds with sufficient resources", () => {
      useGameStore.setState({
        resources: { ...emptyResources(), timber: 100, sap: 50, fruit: 50, acorns: 50 },
      });
      const result = useGameStore.getState().upgradeToolTier("trowel");
      expect(result).toBe(true);
      expect(useGameStore.getState().toolUpgrades.trowel).toBe(1);
    });

    it("upgradeToolTier deducts resources", () => {
      useGameStore.setState({
        resources: { ...emptyResources(), timber: 100, sap: 100, fruit: 50, acorns: 50 },
      });
      useGameStore.getState().upgradeToolTier("trowel");
      expect(useGameStore.getState().resources.timber).toBeLessThan(100);
    });
  });

  describe("Time state actions", () => {
    it("setGameTime updates game time microseconds", () => {
      useGameStore.getState().setGameTime(999999);
      expect(useGameStore.getState().gameTimeMicroseconds).toBe(999999);
    });

    it("setCurrentSeason updates season", () => {
      useGameStore.getState().setCurrentSeason("winter");
      expect(useGameStore.getState().currentSeason).toBe("winter");
    });

    it("setCurrentDay updates day", () => {
      useGameStore.getState().setCurrentDay(15);
      expect(useGameStore.getState().currentDay).toBe(15);
    });
  });

  describe("Level-up auto-unlocks", () => {
    it("unlocks weeping-willow and almanac at level 2", () => {
      useGameStore.getState().addXp(100);
      const state = useGameStore.getState();
      expect(state.unlockedSpecies).toContain("weeping-willow");
      expect(state.unlockedTools).toContain("almanac");
    });

    it("multi-level jump unlocks all intermediate species and tools", () => {
      useGameStore.getState().addXp(99999);
      const state = useGameStore.getState();
      expect(state.unlockedSpecies.length).toBeGreaterThan(1);
      expect(state.unlockedTools.length).toBeGreaterThan(2);
    });

    it("does not duplicate existing unlocks", () => {
      useGameStore.getState().unlockSpecies("weeping-willow");
      useGameStore.getState().addXp(100);
      const willowCount = useGameStore
        .getState()
        .unlockedSpecies.filter((s) => s === "weeping-willow").length;
      expect(willowCount).toBe(1);
    });
  });

  describe("XP formula edge cases", () => {
    it("xpToNext for level 0 returns 100", () => {
      expect(xpToNext(0)).toBe(100);
    });

    it("xpToNext for negative level returns 100", () => {
      expect(xpToNext(-5)).toBe(100);
    });

    it("totalXpForLevel(1) is 0", () => {
      expect(totalXpForLevel(1)).toBe(0);
    });

    it("levelFromXp(0) is 1", () => {
      expect(levelFromXp(0)).toBe(1);
    });

    it("XP consistently increases with each level", () => {
      for (let lv = 1; lv <= 30; lv++) {
        expect(xpToNext(lv + 1)).toBeGreaterThanOrEqual(xpToNext(lv));
      }
    });

    it("totalXpForLevel is strictly increasing", () => {
      for (let lv = 1; lv <= 30; lv++) {
        expect(totalXpForLevel(lv + 1)).toBeGreaterThan(totalXpForLevel(lv));
      }
    });

    it("levelFromXp and totalXpForLevel are inverses for levels 1-30", () => {
      for (let lv = 1; lv <= 30; lv++) {
        const xp = totalXpForLevel(lv);
        expect(levelFromXp(xp)).toBe(lv);
      }
    });
  });

  describe("Border cosmetic actions", () => {
    it("setActiveBorderCosmetic sets cosmetic ID", () => {
      useGameStore.getState().setActiveBorderCosmetic("stone-wall");
      expect(useGameStore.getState().activeBorderCosmetic).toBe("stone-wall");
    });

    it("setActiveBorderCosmetic can set to null", () => {
      useGameStore.getState().setActiveBorderCosmetic("stone-wall");
      useGameStore.getState().setActiveBorderCosmetic(null);
      expect(useGameStore.getState().activeBorderCosmetic).toBeNull();
    });
  });

  describe("subscribe -- auto-save trigger (Spec §7)", () => {
    it("fires listener when state changes", () => {
      const listener = jest.fn();
      const unsub = useGameStore.subscribe(listener);
      listener.mockClear();

      useGameStore.getState().addCoins(50);
      expect(listener).toHaveBeenCalled();

      unsub();
    });

    it("returns an unsubscribe function that stops future notifications", () => {
      const listener = jest.fn();
      const unsub = useGameStore.subscribe(listener);
      listener.mockClear();

      unsub();
      useGameStore.getState().addCoins(50);
      expect(listener).not.toHaveBeenCalled();
    });

    it("fires on saveGrove -- confirming save action triggers auto-save", () => {
      const listener = jest.fn();
      const unsub = useGameStore.subscribe(listener);
      listener.mockClear();

      useGameStore.getState().saveGrove([], { x: 0, z: 0 });
      expect(listener).toHaveBeenCalled();

      unsub();
    });

    it("fires on hydrateFromDb -- confirming load triggers subscribers", () => {
      const listener = jest.fn();
      const unsub = useGameStore.subscribe(listener);
      listener.mockClear();

      useGameStore.getState().hydrateFromDb({ level: 5, xp: 500 });
      expect(listener).toHaveBeenCalled();

      unsub();
    });

    it("fires on resetGame -- confirming new game clears and notifies", () => {
      const listener = jest.fn();
      const unsub = useGameStore.subscribe(listener);
      listener.mockClear();

      useGameStore.getState().resetGame("new-seed");
      expect(listener).toHaveBeenCalled();
      expect(useGameStore.getState().worldSeed).toBe("new-seed");

      unsub();
    });

    it("multiple independent subscribers all fire on state change", () => {
      const listenerA = jest.fn();
      const listenerB = jest.fn();
      const unsubA = useGameStore.subscribe(listenerA);
      const unsubB = useGameStore.subscribe(listenerB);
      listenerA.mockClear();
      listenerB.mockClear();

      useGameStore.getState().addCoins(10);
      expect(listenerA).toHaveBeenCalled();
      expect(listenerB).toHaveBeenCalled();

      unsubA();
      unsubB();
    });
  });

  describe("hydrateFromDb action", () => {
    it("bulk-sets partial state", () => {
      useGameStore.getState().hydrateFromDb({
        level: 10,
        xp: 5000,
        treesPlanted: 100,
        stamina: 80,
      });
      const state = useGameStore.getState();
      expect(state.level).toBe(10);
      expect(state.xp).toBe(5000);
      expect(state.treesPlanted).toBe(100);
      expect(state.stamina).toBe(80);
    });

    it("only overrides specified fields", () => {
      useGameStore.getState().hydrateFromDb({ level: 15 });
      expect(useGameStore.getState().coins).toBe(100);
      expect(useGameStore.getState().screen).toBe("menu");
    });
  });

  describe("Survival state — initial values (Spec §12)", () => {
    it("starts with hunger=100 for default state", () => {
      expect(useGameStore.getState().hunger).toBe(100);
    });

    it("starts with maxHunger=100 for default state", () => {
      expect(useGameStore.getState().maxHunger).toBe(100);
    });

    it("starts with lastCampfireId=null", () => {
      expect(useGameStore.getState().lastCampfireId).toBeNull();
    });

    it("starts with lastCampfirePosition=null", () => {
      expect(useGameStore.getState().lastCampfirePosition).toBeNull();
    });

    it("starts with bodyTemp=37.0", () => {
      expect(useGameStore.getState().bodyTemp).toBe(37.0);
    });
  });

  describe("startNewGame — difficulty-based heart initialization (Spec §12.3)", () => {
    it("seedling difficulty: hunger=100, hearts=maxHearts=7", () => {
      useGameStore.getState().startNewGame("seedling");
      const state = useGameStore.getState();
      expect(state.hunger).toBe(100);
      expect(state.hearts).toBe(7);
      expect(state.maxHearts).toBe(7);
    });

    it("sapling difficulty: hunger=100, hearts=maxHearts=5", () => {
      useGameStore.getState().startNewGame("sapling");
      const state = useGameStore.getState();
      expect(state.hunger).toBe(100);
      expect(state.hearts).toBe(5);
      expect(state.maxHearts).toBe(5);
    });

    it("hardwood difficulty: hunger=100, hearts=maxHearts=4", () => {
      useGameStore.getState().startNewGame("hardwood");
      const state = useGameStore.getState();
      expect(state.hunger).toBe(100);
      expect(state.hearts).toBe(4);
      expect(state.maxHearts).toBe(4);
    });

    it("ironwood difficulty: hunger=100, hearts=maxHearts=3", () => {
      useGameStore.getState().startNewGame("ironwood");
      const state = useGameStore.getState();
      expect(state.hunger).toBe(100);
      expect(state.hearts).toBe(3);
      expect(state.maxHearts).toBe(3);
    });

    it("startNewGame resets lastCampfireId to null", () => {
      useGameStore.getState().setLastCampfire("camp-1", { x: 10, y: 0, z: 10 });
      useGameStore.getState().startNewGame("sapling");
      expect(useGameStore.getState().lastCampfireId).toBeNull();
    });

    it("startNewGame resets bodyTemp to 37.0", () => {
      useGameStore.getState().setBodyTemp(34.0);
      useGameStore.getState().startNewGame("sapling");
      expect(useGameStore.getState().bodyTemp).toBe(37.0);
    });

    it("unknown difficulty falls back to maxHearts=3", () => {
      useGameStore.getState().startNewGame("not-a-real-difficulty");
      expect(useGameStore.getState().maxHearts).toBe(3);
      expect(useGameStore.getState().hearts).toBe(3);
    });
  });

  describe("Survival actions (Spec §12)", () => {
    it("setHunger updates hunger", () => {
      useGameStore.getState().setHunger(50);
      expect(useGameStore.getState().hunger).toBe(50);
    });

    it("setHearts updates hearts", () => {
      useGameStore.getState().setHearts(2);
      expect(useGameStore.getState().hearts).toBe(2);
    });

    it("setMaxHearts updates maxHearts", () => {
      useGameStore.getState().setMaxHearts(5);
      expect(useGameStore.getState().maxHearts).toBe(5);
    });

    it("setBodyTemp updates bodyTemp", () => {
      useGameStore.getState().setBodyTemp(35.5);
      expect(useGameStore.getState().bodyTemp).toBe(35.5);
    });

    it("setLastCampfire stores campfire id and position", () => {
      useGameStore.getState().setLastCampfire("camp-42", { x: 5, y: 0, z: 8 });
      const state = useGameStore.getState();
      expect(state.lastCampfireId).toBe("camp-42");
      expect(state.lastCampfirePosition).toEqual({ x: 5, y: 0, z: 8 });
    });

    it("setLastCampfire can clear campfire to null", () => {
      useGameStore.getState().setLastCampfire("camp-1", { x: 1, y: 0, z: 1 });
      useGameStore.getState().setLastCampfire(null, null);
      const state = useGameStore.getState();
      expect(state.lastCampfireId).toBeNull();
      expect(state.lastCampfirePosition).toBeNull();
    });

    it("resetGame clears survival state to defaults", () => {
      useGameStore.getState().setHunger(20);
      useGameStore.getState().setHearts(1);
      useGameStore.getState().setBodyTemp(34.0);
      useGameStore.getState().setLastCampfire("camp-1", { x: 1, y: 0, z: 1 });
      useGameStore.getState().resetGame();
      const state = useGameStore.getState();
      expect(state.hunger).toBe(100);
      expect(state.hearts).toBe(3);
      expect(state.bodyTemp).toBe(37.0);
      expect(state.lastCampfireId).toBeNull();
      expect(state.lastCampfirePosition).toBeNull();
    });
  });
});
