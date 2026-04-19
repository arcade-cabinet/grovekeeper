import { beforeEach, describe, expect, it } from "vitest";
import type { SerializedTree } from "./gameStore";
import {
  levelFromXp,
  totalXpForLevel,
  useGameStore,
  xpToNext,
} from "./gameStore";

describe("Game Store", () => {
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

  describe("Resource system", () => {
    it("starts with zero resources", () => {
      const state = useGameStore.getState();
      expect(state.resources).toEqual({
        timber: 0,
        sap: 0,
        fruit: 0,
        acorns: 0,
      });
    });

    it("addResource increases a specific resource", () => {
      useGameStore.getState().addResource("timber", 10);
      expect(useGameStore.getState().resources.timber).toBe(10);
    });

    it("spendResource decreases a specific resource", () => {
      useGameStore.getState().addResource("sap", 20);
      const success = useGameStore.getState().spendResource("sap", 15);
      expect(success).toBe(true);
      expect(useGameStore.getState().resources.sap).toBe(5);
    });

    it("spendResource returns false if insufficient", () => {
      useGameStore.getState().addResource("fruit", 5);
      const success = useGameStore.getState().spendResource("fruit", 10);
      expect(success).toBe(false);
      expect(useGameStore.getState().resources.fruit).toBe(5);
    });
  });

  describe("Seed inventory", () => {
    it("starts with 10 white-oak seeds", () => {
      expect(useGameStore.getState().seeds["white-oak"]).toBe(10);
    });

    it("addSeed increases seed count", () => {
      useGameStore.getState().addSeed("elder-pine", 5);
      expect(useGameStore.getState().seeds["elder-pine"]).toBe(5);
    });

    it("spendSeed decreases seed count", () => {
      useGameStore.getState().addSeed("cherry-blossom", 3);
      const success = useGameStore.getState().spendSeed("cherry-blossom", 1);
      expect(success).toBe(true);
      expect(useGameStore.getState().seeds["cherry-blossom"]).toBe(2);
    });

    it("spendSeed returns false if insufficient", () => {
      const success = useGameStore.getState().spendSeed("redwood", 1);
      expect(success).toBe(false);
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
      // level 6: 100 + (6-2)*50 + floor(5/5)*200 = 100 + 200 + 200 = 500
      expect(xpToNext(6)).toBe(500);
    });

    it("levels up at 100 XP (level 1 → 2)", () => {
      useGameStore.getState().addXp(99);
      expect(useGameStore.getState().level).toBe(1);

      useGameStore.getState().addXp(1);
      expect(useGameStore.getState().level).toBe(2);
    });

    it("levelFromXp matches totalXpForLevel", () => {
      // To reach level 4: xpToNext(1) + xpToNext(2) + xpToNext(3) = 100 + 100 + 150 = 350
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
      expect(useGameStore.getState().speciesPlanted).toEqual([
        "white-oak",
        "elder-pine",
      ]);
    });

    it("trackSeason adds seasons without duplicates", () => {
      useGameStore.getState().trackSeason("spring");
      useGameStore.getState().trackSeason("spring");
      useGameStore.getState().trackSeason("summer");
      expect(useGameStore.getState().seasonsExperienced).toEqual([
        "spring",
        "summer",
      ]);
    });
  });

  describe("Lifetime resource tracking", () => {
    it("addResource increments lifetime totals", () => {
      useGameStore.getState().addResource("timber", 50);
      useGameStore.getState().addResource("timber", 30);
      expect(useGameStore.getState().lifetimeResources.timber).toBe(80);
    });

    it("spendResource does NOT reduce lifetime totals", () => {
      useGameStore.getState().addResource("sap", 100);
      useGameStore.getState().spendResource("sap", 60);
      expect(useGameStore.getState().lifetimeResources.sap).toBe(100);
      expect(useGameStore.getState().resources.sap).toBe(40);
    });

    it("tracks all 4 resource types independently", () => {
      useGameStore.getState().addResource("timber", 10);
      useGameStore.getState().addResource("sap", 20);
      useGameStore.getState().addResource("fruit", 30);
      useGameStore.getState().addResource("acorns", 40);
      const lr = useGameStore.getState().lifetimeResources;
      expect(lr.timber).toBe(10);
      expect(lr.sap).toBe(20);
      expect(lr.fruit).toBe(30);
      expect(lr.acorns).toBe(40);
    });
  });

  // ===========================================================
  // Grid expansion store action
  // ===========================================================
  describe("expandGrid action", () => {
    it("expands from 12 to 16 when conditions met", () => {
      // Set level 5 and provide resources
      useGameStore.setState({
        level: 5,
        resources: { timber: 100, sap: 50, fruit: 0, acorns: 0 },
      });
      const result = useGameStore.getState().expandGrid();
      expect(result).toBe(true);
      expect(useGameStore.getState().gridSize).toBe(16);
    });

    it("deducts resources on expansion", () => {
      useGameStore.setState({
        level: 5,
        resources: { timber: 200, sap: 100, fruit: 0, acorns: 0 },
      });
      useGameStore.getState().expandGrid();
      const res = useGameStore.getState().resources;
      expect(res.timber).toBe(100); // 200 - 100
      expect(res.sap).toBe(50); // 100 - 50
    });

    it("fails if insufficient level", () => {
      useGameStore.setState({
        level: 4,
        resources: { timber: 1000, sap: 1000, fruit: 1000, acorns: 1000 },
      });
      const result = useGameStore.getState().expandGrid();
      expect(result).toBe(false);
      expect(useGameStore.getState().gridSize).toBe(12);
    });

    it("fails if insufficient resources", () => {
      useGameStore.setState({
        level: 5,
        resources: { timber: 50, sap: 50, fruit: 0, acorns: 0 },
      });
      const result = useGameStore.getState().expandGrid();
      expect(result).toBe(false);
      expect(useGameStore.getState().gridSize).toBe(12);
    });

    it("fails at max grid size (32)", () => {
      useGameStore.setState({
        level: 99,
        gridSize: 32,
        resources: { timber: 9999, sap: 9999, fruit: 9999, acorns: 9999 },
      });
      const result = useGameStore.getState().expandGrid();
      expect(result).toBe(false);
      expect(useGameStore.getState().gridSize).toBe(32);
    });

    it("chain expands through multiple tiers", () => {
      useGameStore.setState({
        level: 20,
        resources: { timber: 9999, sap: 9999, fruit: 9999, acorns: 9999 },
      });
      useGameStore.getState().expandGrid(); // 12 -> 16
      expect(useGameStore.getState().gridSize).toBe(16);
      useGameStore.getState().expandGrid(); // 16 -> 20
      expect(useGameStore.getState().gridSize).toBe(20);
      useGameStore.getState().expandGrid(); // 20 -> 24
      expect(useGameStore.getState().gridSize).toBe(24);
      useGameStore.getState().expandGrid(); // 24 -> 32
      expect(useGameStore.getState().gridSize).toBe(32);
    });
  });

  // ===========================================================
  // Prestige store action
  // ===========================================================
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
        resources: { timber: 9999, sap: 9999, fruit: 9999, acorns: 9999 },
      });
      useGameStore.getState().performPrestige();
      const state = useGameStore.getState();
      expect(state.resources).toEqual({
        timber: 0,
        sap: 0,
        fruit: 0,
        acorns: 0,
      });
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
        lifetimeResources: {
          timber: 5000,
          sap: 3000,
          fruit: 2000,
          acorns: 1000,
        },
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
      // Prestige 1: +10 stamina
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
        unlockedTools: [
          "trowel",
          "watering-can",
          "axe",
          "shovel",
          "pruning-shears",
        ],
      });
      useGameStore.getState().performPrestige();
      expect(useGameStore.getState().unlockedTools).toEqual([
        "trowel",
        "watering-can",
      ]);
    });
  });

  // ===========================================================
  // Quest management actions
  // ===========================================================
  describe("Quest actions", () => {
    const mockQuest = {
      id: "quest_1",
      name: "Test Quest",
      description: "Test",
      goals: [
        {
          id: "goal_1",
          templateId: "plant_any_1",
          name: "Plant",
          description: "Plant a tree",
          targetType: "trees_planted",
          targetAmount: 1,
          currentProgress: 0,
          completed: false,
        },
      ],
      startedAt: 1000,
      completed: false,
      rewards: { xp: 50 },
      difficulty: "easy" as const,
    };

    it("setActiveQuests sets the quest array", () => {
      useGameStore.getState().setActiveQuests([mockQuest]);
      expect(useGameStore.getState().activeQuests).toHaveLength(1);
      expect(useGameStore.getState().activeQuests[0].id).toBe("quest_1");
    });

    it("updateQuest replaces the matching quest", () => {
      useGameStore.getState().setActiveQuests([mockQuest]);
      const updated = { ...mockQuest, completed: true };
      useGameStore.getState().updateQuest("quest_1", updated);
      expect(useGameStore.getState().activeQuests[0].completed).toBe(true);
    });

    it("completeQuest removes from active and adds to completed", () => {
      useGameStore.getState().setActiveQuests([mockQuest]);
      useGameStore.getState().completeQuest("quest_1");
      expect(useGameStore.getState().activeQuests).toHaveLength(0);
      expect(useGameStore.getState().completedQuestIds).toContain("quest_1");
    });

    it("setLastQuestRefresh updates the timestamp", () => {
      useGameStore.getState().setLastQuestRefresh(12345);
      expect(useGameStore.getState().lastQuestRefresh).toBe(12345);
    });
  });

  // ===========================================================
  // Build mode actions
  // ===========================================================
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
      expect(useGameStore.getState().placedStructures[0].templateId).toBe(
        "greenhouse",
      );
    });
  });

  // ===========================================================
  // Discovery and zone actions
  // ===========================================================
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
      expect(useGameStore.getState().discoveredZones).toContain(
        "starting-grove",
      );
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

  // ===========================================================
  // Achievement expansion tracking
  // ===========================================================
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
      expect(useGameStore.getState().wildSpeciesHarvested).toEqual([
        "white-oak",
        "elder-pine",
      ]);
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
      expect(useGameStore.getState().visitedZoneTypes).toEqual([
        "forest",
        "grove",
      ]);
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

  // ===========================================================
  // Tool upgrade actions
  // ===========================================================
  describe("Tool upgrade actions", () => {
    it("upgradeToolTier fails with insufficient resources", () => {
      const result = useGameStore.getState().upgradeToolTier("trowel");
      expect(result).toBe(false);
      expect(useGameStore.getState().toolUpgrades.trowel).toBeUndefined();
    });

    it("upgradeToolTier succeeds with sufficient resources", () => {
      useGameStore.setState({
        resources: { timber: 100, sap: 50, fruit: 50, acorns: 50 },
      });
      const result = useGameStore.getState().upgradeToolTier("trowel");
      expect(result).toBe(true);
      expect(useGameStore.getState().toolUpgrades.trowel).toBe(1);
    });

    it("upgradeToolTier deducts resources", () => {
      useGameStore.setState({
        resources: { timber: 100, sap: 100, fruit: 50, acorns: 50 },
      });
      useGameStore.getState().upgradeToolTier("trowel");
      // Resources should be reduced
      expect(useGameStore.getState().resources.timber).toBeLessThan(100);
    });
  });

  // ===========================================================
  // Time state actions
  // ===========================================================
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

  // ===========================================================
  // Settings actions
  // ===========================================================
  describe("Settings actions", () => {
    it("setHasSeenRules persists", () => {
      useGameStore.getState().setHasSeenRules(true);
      expect(useGameStore.getState().hasSeenRules).toBe(true);
    });

    it("setHapticsEnabled persists", () => {
      useGameStore.getState().setHapticsEnabled(false);
      expect(useGameStore.getState().hapticsEnabled).toBe(false);
    });

    it("setSoundEnabled persists", () => {
      useGameStore.getState().setSoundEnabled(false);
      expect(useGameStore.getState().soundEnabled).toBe(false);
    });
  });

  // ===========================================================
  // Database hydration
  // ===========================================================
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
      // Other fields should remain at defaults
      expect(useGameStore.getState().coins).toBe(100);
      expect(useGameStore.getState().screen).toBe("menu");
    });
  });

  // ===========================================================
  // Level-up auto-unlocks
  // ===========================================================
  describe("Level-up auto-unlocks", () => {
    it("unlocks weeping-willow and almanac at level 2", () => {
      useGameStore.getState().addXp(100); // level 1 -> 2
      const state = useGameStore.getState();
      expect(state.unlockedSpecies).toContain("weeping-willow");
      expect(state.unlockedTools).toContain("almanac");
    });

    it("multi-level jump unlocks all intermediate species and tools", () => {
      useGameStore.getState().addXp(99999); // jump many levels
      const state = useGameStore.getState();
      // Should have unlocked species available at the achieved level
      expect(state.unlockedSpecies.length).toBeGreaterThan(1);
      expect(state.unlockedTools.length).toBeGreaterThan(2);
    });

    it("does not duplicate existing unlocks", () => {
      useGameStore.getState().unlockSpecies("weeping-willow");
      useGameStore.getState().addXp(100); // level 2 also unlocks weeping-willow
      const willowCount = useGameStore
        .getState()
        .unlockedSpecies.filter((s) => s === "weeping-willow").length;
      expect(willowCount).toBe(1);
    });
  });

  // ===========================================================
  // XP formula edge cases
  // ===========================================================
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

  // ===========================================================
  // Cosmetic border actions
  // ===========================================================
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
});
