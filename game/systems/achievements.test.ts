import type { PlayerStats } from "./achievements/index.ts";
import { ACHIEVEMENTS, checkAchievements, getAchievementById } from "./achievements/index.ts";

function makeStats(overrides: Partial<PlayerStats> = {}): PlayerStats {
  return {
    treesPlanted: 0,
    treesHarvested: 0,
    treesWatered: 0,
    totalTimber: 0,
    totalSap: 0,
    totalFruit: 0,
    totalAcorns: 0,
    level: 1,
    speciesPlanted: [],
    maxStageReached: 0,
    currentGridSize: 12,
    prestigeCount: 0,
    questsCompleted: 0,
    recipesUnlocked: 0,
    structuresPlaced: 0,
    oldGrowthCount: 0,
    npcsFriended: 0,
    totalDaysPlayed: 0,
    tradeCount: 0,
    festivalCount: 0,
    discoveryCount: 0,
    chunksVisited: 0,
    biomesDiscovered: 0,
    spiritsDiscovered: 0,
    ...overrides,
  };
}

describe("achievements system (Spec §25)", () => {
  describe("ACHIEVEMENTS catalog", () => {
    it("has 45 achievements total", () => {
      expect(ACHIEVEMENTS).toHaveLength(45);
    });

    it("each achievement has a unique ID", () => {
      const ids = ACHIEVEMENTS.map((a) => a.id);
      expect(new Set(ids).size).toBe(ids.length);
    });

    it("each achievement has a check function", () => {
      for (const achievement of ACHIEVEMENTS) {
        expect(typeof achievement.check).toBe("function");
      }
    });

    it("covers multiple categories", () => {
      const categories = new Set(ACHIEVEMENTS.map((a) => a.category));
      expect(categories.size).toBeGreaterThanOrEqual(5);
    });
  });

  describe("checkAchievements", () => {
    it("returns empty when no achievements are earned", () => {
      const newlyEarned = checkAchievements(makeStats(), []);
      expect(newlyEarned).toEqual([]);
    });

    it("detects first-seed achievement", () => {
      const stats = makeStats({ treesPlanted: 1 });
      const newlyEarned = checkAchievements(stats, []);
      expect(newlyEarned).toContain("first-seed");
    });

    it("detects multiple achievements at once", () => {
      const stats = makeStats({
        treesPlanted: 1,
        treesHarvested: 1,
        level: 5,
      });
      const newlyEarned = checkAchievements(stats, []);
      expect(newlyEarned).toContain("first-seed");
      expect(newlyEarned).toContain("first-harvest");
      expect(newlyEarned).toContain("level-5");
    });

    it("does not return already-earned achievements", () => {
      const stats = makeStats({ treesPlanted: 1 });
      const newlyEarned = checkAchievements(stats, ["first-seed"]);
      expect(newlyEarned).not.toContain("first-seed");
    });

    it("detects planting milestones", () => {
      const stats = makeStats({ treesPlanted: 500 });
      const earned = checkAchievements(stats, []);
      expect(earned).toContain("first-seed");
      expect(earned).toContain("green-thumb");
      expect(earned).toContain("forest-founder");
      expect(earned).toContain("grove-master");
    });

    it("detects harvesting milestones", () => {
      const stats = makeStats({ treesHarvested: 200 });
      const earned = checkAchievements(stats, []);
      expect(earned).toContain("first-harvest");
      expect(earned).toContain("lumberjack");
      expect(earned).toContain("master-harvester");
    });

    it("detects species collector achievement", () => {
      const allSpecies = [
        "white-oak",
        "weeping-willow",
        "elder-pine",
        "cherry-blossom",
        "ghost-birch",
        "redwood",
        "flame-maple",
        "baobab",
        "silver-birch",
        "ironbark",
        "golden-apple",
        "mystic-fern",
      ];
      const stats = makeStats({ speciesPlanted: allSpecies });
      const earned = checkAchievements(stats, []);
      expect(earned).toContain("species-collector");
    });

    it("does not award species collector with incomplete list", () => {
      const stats = makeStats({
        speciesPlanted: ["white-oak", "elder-pine"],
      });
      const earned = checkAchievements(stats, []);
      expect(earned).not.toContain("species-collector");
    });

    it("detects resource collection achievements", () => {
      const stats = makeStats({
        totalTimber: 500,
        totalSap: 200,
        totalFruit: 200,
        totalAcorns: 300,
      });
      const earned = checkAchievements(stats, []);
      expect(earned).toContain("timber-baron");
      expect(earned).toContain("sap-tapper");
      expect(earned).toContain("fruit-gatherer");
      expect(earned).toContain("acorn-hoarder");
    });

    it("detects growing achievements", () => {
      const stats = makeStats({
        maxStageReached: 4,
        treesWatered: 100,
        oldGrowthCount: 10,
      });
      const earned = checkAchievements(stats, []);
      expect(earned).toContain("patient-keeper");
      expect(earned).toContain("watering-wizard");
      expect(earned).toContain("ancient-grove");
    });

    it("detects prestige and mastery achievements", () => {
      const stats = makeStats({
        level: 25,
        prestigeCount: 1,
        currentGridSize: 32,
      });
      const earned = checkAchievements(stats, []);
      expect(earned).toContain("level-25");
      expect(earned).toContain("first-prestige");
      expect(earned).toContain("grid-master");
    });

    it("detects social achievements", () => {
      const stats = makeStats({
        npcsFriended: 5,
        questsCompleted: 8,
      });
      const earned = checkAchievements(stats, []);
      expect(earned).toContain("first-friend");
      expect(earned).toContain("social-butterfly");
      expect(earned).toContain("quest-starter");
      expect(earned).toContain("quest-master");
    });

    it("detects economy achievements", () => {
      const stats = makeStats({
        tradeCount: 20,
        recipesUnlocked: 12,
        structuresPlaced: 10,
      });
      const earned = checkAchievements(stats, []);
      expect(earned).toContain("first-trade");
      expect(earned).toContain("merchant-class");
      expect(earned).toContain("first-craft");
      expect(earned).toContain("recipe-collector");
      expect(earned).toContain("builder");
      expect(earned).toContain("architect");
    });

    it("detects seasonal achievements", () => {
      const stats = makeStats({ festivalCount: 4 });
      const earned = checkAchievements(stats, []);
      expect(earned).toContain("festival-goer");
      expect(earned).toContain("season-veteran");
    });

    it("detects exploration achievements", () => {
      const stats = makeStats({
        discoveryCount: 8,
        totalDaysPlayed: 100,
      });
      const earned = checkAchievements(stats, []);
      expect(earned).toContain("first-discovery");
      expect(earned).toContain("codex-scholar");
      expect(earned).toContain("long-haul");
      expect(earned).toContain("century");
    });

    it("detects chunk exploration achievements (Spec §25.3)", () => {
      const stats = makeStats({ chunksVisited: 25 });
      const earned = checkAchievements(stats, []);
      expect(earned).toContain("first-chunk");
      expect(earned).toContain("zone-explorer");
      expect(earned).toContain("world-wanderer");
    });

    it("does not award chunk achievements when still in starting zone", () => {
      const stats = makeStats({ chunksVisited: 1 });
      const earned = checkAchievements(stats, []);
      expect(earned).not.toContain("first-chunk");
      expect(earned).not.toContain("zone-explorer");
      expect(earned).not.toContain("world-wanderer");
    });

    it("detects spirit discovery achievements (Spec §32.3)", () => {
      const stats = makeStats({ spiritsDiscovered: 8 });
      const earned = checkAchievements(stats, []);
      expect(earned).toContain("spirit-touched");
      expect(earned).toContain("spirit-seeker");
      expect(earned).toContain("world-dreamer");
    });

    it("awards spirit-touched on first spirit only", () => {
      const stats1 = makeStats({ spiritsDiscovered: 1 });
      const stats0 = makeStats({ spiritsDiscovered: 0 });
      expect(checkAchievements(stats1, [])).toContain("spirit-touched");
      expect(checkAchievements(stats0, [])).not.toContain("spirit-touched");
    });

    it("detects NG+ achievements (Spec §25.3)", () => {
      const stats = makeStats({ prestigeCount: 5 });
      const earned = checkAchievements(stats, []);
      expect(earned).toContain("twice-born");
      expect(earned).toContain("thrice-born");
      expect(earned).toContain("eternal-keeper");
    });

    it("awards NG+ achievements incrementally", () => {
      expect(checkAchievements(makeStats({ prestigeCount: 2 }), [])).toContain("twice-born");
      expect(checkAchievements(makeStats({ prestigeCount: 2 }), [])).not.toContain("thrice-born");
      expect(checkAchievements(makeStats({ prestigeCount: 3 }), [])).toContain("thrice-born");
      expect(checkAchievements(makeStats({ prestigeCount: 3 }), [])).not.toContain(
        "eternal-keeper",
      );
      expect(checkAchievements(makeStats({ prestigeCount: 5 }), [])).toContain("eternal-keeper");
    });

    it("first-prestige does not trigger twice-born", () => {
      const stats = makeStats({ prestigeCount: 1 });
      const earned = checkAchievements(stats, []);
      expect(earned).toContain("first-prestige");
      expect(earned).not.toContain("twice-born");
    });
  });

  describe("getAchievementById", () => {
    it("finds an achievement by ID", () => {
      const achievement = getAchievementById("first-seed");
      expect(achievement).toBeDefined();
      expect(achievement!.name).toBe("First Seed");
    });

    it("returns undefined for unknown ID", () => {
      expect(getAchievementById("nonexistent")).toBeUndefined();
    });

    it("finds new chunk exploration achievements", () => {
      expect(getAchievementById("first-chunk")).toBeDefined();
      expect(getAchievementById("zone-explorer")).toBeDefined();
      expect(getAchievementById("world-wanderer")).toBeDefined();
    });

    it("finds new spirit discovery achievements", () => {
      expect(getAchievementById("spirit-touched")).toBeDefined();
      expect(getAchievementById("spirit-seeker")).toBeDefined();
      expect(getAchievementById("world-dreamer")).toBeDefined();
    });

    it("finds new NG+ achievements", () => {
      expect(getAchievementById("twice-born")).toBeDefined();
      expect(getAchievementById("thrice-born")).toBeDefined();
      expect(getAchievementById("eternal-keeper")).toBeDefined();
    });
  });
});
