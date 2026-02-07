import { describe, it, expect } from "vitest";
import {
  generateQuest,
  generateDailyQuests,
  updateQuestProgress,
  getAllGoals,
  GOAL_POOLS,
} from "./quests";

describe("Quest System", () => {
  describe("Goal Pools", () => {
    it("collection pool has goals (no longer empty)", () => {
      expect(GOAL_POOLS.collection.length).toBeGreaterThan(0);
    });

    it("exploration pool has goals (no longer empty)", () => {
      expect(GOAL_POOLS.exploration.length).toBeGreaterThan(0);
    });

    it("no goal template has a coins field", () => {
      const allGoals = getAllGoals();
      for (const goal of allGoals) {
        expect((goal.rewards as Record<string, unknown>).coins).toBeUndefined();
      }
    });

    it("all goal templates have xp reward", () => {
      const allGoals = getAllGoals();
      for (const goal of allGoals) {
        expect(goal.rewards.xp).toBeDefined();
        expect(goal.rewards.xp.min).toBeGreaterThanOrEqual(0);
        expect(goal.rewards.xp.max).toBeGreaterThanOrEqual(goal.rewards.xp.min);
      }
    });

    it("some goals have resource rewards", () => {
      const allGoals = getAllGoals();
      const withResources = allGoals.filter((g) => g.rewards.resources && g.rewards.resources.length > 0);
      expect(withResources.length).toBeGreaterThan(0);
    });

    it("some goals have seed rewards", () => {
      const allGoals = getAllGoals();
      const withSeeds = allGoals.filter((g) => g.rewards.seeds && g.rewards.seeds.length > 0);
      expect(withSeeds.length).toBeGreaterThan(0);
    });
  });

  describe("Exploration goals", () => {
    it("has visit_non_starting goal", () => {
      const goal = GOAL_POOLS.exploration.find((g) => g.id === "visit_non_starting");
      expect(goal).toBeDefined();
      expect(goal!.targetType).toBe("zones_visited_non_starting");
    });

    it("has visit_3_zones goal", () => {
      const goal = GOAL_POOLS.exploration.find((g) => g.id === "visit_3_zones");
      expect(goal).toBeDefined();
      expect(goal!.targetAmount).toBe(3);
    });

    it("has visit_wild_forest goal with zoneType", () => {
      const goal = GOAL_POOLS.exploration.find((g) => g.id === "visit_wild_forest");
      expect(goal).toBeDefined();
      expect(goal!.zoneType).toBe("forest");
    });

    it("has visit_settlement goal", () => {
      const goal = GOAL_POOLS.exploration.find((g) => g.id === "visit_settlement");
      expect(goal).toBeDefined();
      expect(goal!.zoneType).toBe("settlement");
    });
  });

  describe("Collection goals", () => {
    it("has timber collection goal", () => {
      const goal = GOAL_POOLS.collection.find((g) => g.id === "collect_timber_50");
      expect(goal).toBeDefined();
      expect(goal!.targetType).toBe("timber_collected");
      expect(goal!.targetAmount).toBe(50);
    });

    it("has sap collection goal", () => {
      const goal = GOAL_POOLS.collection.find((g) => g.id === "collect_sap_30");
      expect(goal).toBeDefined();
      expect(goal!.targetAmount).toBe(30);
    });

    it("has fruit collection goal", () => {
      const goal = GOAL_POOLS.collection.find((g) => g.id === "collect_fruit_20");
      expect(goal).toBeDefined();
      expect(goal!.targetAmount).toBe(20);
    });

    it("has acorn collection goal", () => {
      const goal = GOAL_POOLS.collection.find((g) => g.id === "collect_acorns_15");
      expect(goal).toBeDefined();
      expect(goal!.targetAmount).toBe(15);
    });
  });

  describe("generateQuest", () => {
    it("returns a quest with no coins in rewards", () => {
      const quest = generateQuest("easy", "spring");
      expect(quest).not.toBeNull();
      expect((quest!.rewards as Record<string, unknown>).coins).toBeUndefined();
      expect(quest!.rewards.xp).toBeGreaterThanOrEqual(0);
    });

    it("easy quest has 1 goal", () => {
      const quest = generateQuest("easy", "spring");
      expect(quest).not.toBeNull();
      expect(quest!.goals.length).toBe(1);
    });

    it("medium quest has 2 goals", () => {
      const quest = generateQuest("medium", "spring");
      expect(quest).not.toBeNull();
      expect(quest!.goals.length).toBe(2);
    });

    it("hard quest has 3 goals", () => {
      const quest = generateQuest("hard", "spring");
      expect(quest).not.toBeNull();
      expect(quest!.goals.length).toBe(3);
    });

    it("quest rewards may include resources", () => {
      // Generate several to find one with resources (since pool selection is random)
      let foundResources = false;
      for (let i = 0; i < 20; i++) {
        const quest = generateQuest("medium", "spring");
        if (quest?.rewards.resources && quest.rewards.resources.length > 0) {
          foundResources = true;
          break;
        }
      }
      expect(foundResources).toBe(true);
    });

    it("exploration goals can appear in easy quests", () => {
      let foundExploration = false;
      for (let i = 0; i < 50; i++) {
        const quest = generateQuest("easy", "spring");
        if (quest?.goals.some((g) => g.targetType.startsWith("zones_"))) {
          foundExploration = true;
          break;
        }
      }
      expect(foundExploration).toBe(true);
    });

    it("collection goals can appear in medium quests", () => {
      let foundCollection = false;
      for (let i = 0; i < 50; i++) {
        const quest = generateQuest("medium", "spring");
        if (quest?.goals.some((g) => g.targetType.endsWith("_collected"))) {
          foundCollection = true;
          break;
        }
      }
      expect(foundCollection).toBe(true);
    });
  });

  describe("generateDailyQuests", () => {
    it("generates 1 quest for level 1 player", () => {
      const quests = generateDailyQuests("spring", 1, new Set());
      expect(quests.length).toBe(1);
    });

    it("generates 2 quests for level 3 player", () => {
      const quests = generateDailyQuests("spring", 3, new Set());
      expect(quests.length).toBe(2);
    });

    it("generates 3 quests for level 7 player", () => {
      const quests = generateDailyQuests("spring", 7, new Set());
      expect(quests.length).toBe(3);
    });

    it("generates 4 quests for level 15 player", () => {
      const quests = generateDailyQuests("spring", 15, new Set());
      expect(quests.length).toBe(4);
    });
  });

  describe("updateQuestProgress", () => {
    it("updates matching goal progress", () => {
      const quest = generateQuest("easy", "spring")!;
      const targetType = quest.goals[0].targetType;
      const updated = updateQuestProgress(quest, targetType, 1);
      expect(updated.goals[0].currentProgress).toBe(1);
    });

    it("marks goal as completed when target met", () => {
      const quest = generateQuest("easy", "spring")!;
      const goal = quest.goals[0];
      const updated = updateQuestProgress(quest, goal.targetType, goal.targetAmount);
      expect(updated.goals[0].completed).toBe(true);
    });

    it("marks quest completed when all goals done", () => {
      const quest = generateQuest("easy", "spring")!;
      const goal = quest.goals[0];
      const updated = updateQuestProgress(quest, goal.targetType, goal.targetAmount);
      expect(updated.completed).toBe(true);
    });

    it("does not update non-matching event types", () => {
      const quest = generateQuest("easy", "spring")!;
      const updated = updateQuestProgress(quest, "nonexistent_event", 5);
      expect(updated.goals[0].currentProgress).toBe(0);
    });
  });
});
