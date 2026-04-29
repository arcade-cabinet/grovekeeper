import { beforeEach, describe, expect, it } from "vitest";
import { koota } from "@/koota";
import { SpeciesProgressTrait } from "@/traits";
import type { SpeciesProgress } from "./speciesDiscovery";
import {
  checkDiscoveryProgress,
  computeDiscoveryTier,
  createEmptyProgress,
  getVisibleCodexFields,
} from "./speciesDiscovery";
import {
  consumePendingCodexUnlock,
  trackSpeciesGrowth,
  trackSpeciesHarvest,
  trackSpeciesPlanting,
} from "./speciesTracking";

describe("speciesDiscovery", () => {
  // =========================================================================
  // computeDiscoveryTier
  // =========================================================================
  describe("computeDiscoveryTier", () => {
    it("returns tier 0 for empty progress", () => {
      expect(
        computeDiscoveryTier({
          timesPlanted: 0,
          maxStageReached: 0,
          timesHarvested: 0,
          totalYield: 0,
        }),
      ).toBe(0);
    });

    it("returns tier 1 when planted at least once", () => {
      expect(
        computeDiscoveryTier({
          timesPlanted: 1,
          maxStageReached: 0,
          timesHarvested: 0,
          totalYield: 0,
        }),
      ).toBe(1);
    });

    it("returns tier 1 when planted multiple times but not yet mature", () => {
      expect(
        computeDiscoveryTier({
          timesPlanted: 5,
          maxStageReached: 2,
          timesHarvested: 0,
          totalYield: 0,
        }),
      ).toBe(1);
    });

    it("returns tier 2 when max stage reaches Mature (3)", () => {
      expect(
        computeDiscoveryTier({
          timesPlanted: 1,
          maxStageReached: 3,
          timesHarvested: 0,
          totalYield: 0,
        }),
      ).toBe(2);
    });

    it("returns tier 3 when max stage reaches Old Growth (4)", () => {
      expect(
        computeDiscoveryTier({
          timesPlanted: 1,
          maxStageReached: 4,
          timesHarvested: 0,
          totalYield: 0,
        }),
      ).toBe(3);
    });

    it("returns tier 4 when harvested 10 times", () => {
      expect(
        computeDiscoveryTier({
          timesPlanted: 1,
          maxStageReached: 4,
          timesHarvested: 10,
          totalYield: 50,
        }),
      ).toBe(4);
    });

    it("returns tier 4 when harvested more than 10 times", () => {
      expect(
        computeDiscoveryTier({
          timesPlanted: 20,
          maxStageReached: 4,
          timesHarvested: 25,
          totalYield: 100,
        }),
      ).toBe(4);
    });

    it("tier 4 takes precedence over tier 3 even with lower stage", () => {
      // Edge case: if somehow harvested 10 times without reaching Old Growth
      expect(
        computeDiscoveryTier({
          timesPlanted: 10,
          maxStageReached: 3,
          timesHarvested: 10,
          totalYield: 30,
        }),
      ).toBe(4);
    });

    it("boundary: 9 harvests does not reach tier 4", () => {
      expect(
        computeDiscoveryTier({
          timesPlanted: 10,
          maxStageReached: 4,
          timesHarvested: 9,
          totalYield: 45,
        }),
      ).toBe(3);
    });

    it("boundary: stage 2 does not reach tier 2", () => {
      expect(
        computeDiscoveryTier({
          timesPlanted: 5,
          maxStageReached: 2,
          timesHarvested: 0,
          totalYield: 0,
        }),
      ).toBe(1);
    });
  });

  // =========================================================================
  // createEmptyProgress
  // =========================================================================
  describe("createEmptyProgress", () => {
    it("returns a progress object with all zeroes", () => {
      const progress = createEmptyProgress();
      expect(progress.timesPlanted).toBe(0);
      expect(progress.maxStageReached).toBe(0);
      expect(progress.timesHarvested).toBe(0);
      expect(progress.totalYield).toBe(0);
      expect(progress.discoveryTier).toBe(0);
    });

    it("returns a new object each call (no shared references)", () => {
      const a = createEmptyProgress();
      const b = createEmptyProgress();
      expect(a).toEqual(b);
      expect(a).not.toBe(b);
    });
  });

  // =========================================================================
  // checkDiscoveryProgress
  // =========================================================================
  describe("checkDiscoveryProgress", () => {
    it("returns zeroes for empty progress map", () => {
      const stats = checkDiscoveryProgress({});
      expect(stats.speciesDiscovered).toBe(0);
      expect(stats.speciesStudied).toBe(0);
      expect(stats.speciesMastered).toBe(0);
      expect(stats.speciesLegendary).toBe(0);
      expect(stats.completionPercent).toBe(0);
    });

    it("totalSpecies is 15 (12 base + 3 prestige)", () => {
      const stats = checkDiscoveryProgress({});
      expect(stats.totalSpecies).toBe(15);
    });

    it("counts discovered species (tier >= 1)", () => {
      const progress: Record<string, SpeciesProgress> = {
        "white-oak": { ...createEmptyProgress(), discoveryTier: 1 },
        "elder-pine": { ...createEmptyProgress(), discoveryTier: 0 },
        "cherry-blossom": { ...createEmptyProgress(), discoveryTier: 2 },
      };
      const stats = checkDiscoveryProgress(progress);
      expect(stats.speciesDiscovered).toBe(2);
    });

    it("counts studied species (tier >= 2)", () => {
      const progress: Record<string, SpeciesProgress> = {
        "white-oak": { ...createEmptyProgress(), discoveryTier: 2 },
        "elder-pine": { ...createEmptyProgress(), discoveryTier: 3 },
        "cherry-blossom": { ...createEmptyProgress(), discoveryTier: 1 },
      };
      const stats = checkDiscoveryProgress(progress);
      expect(stats.speciesStudied).toBe(2);
    });

    it("counts mastered species (tier >= 3)", () => {
      const progress: Record<string, SpeciesProgress> = {
        "white-oak": { ...createEmptyProgress(), discoveryTier: 3 },
        "elder-pine": { ...createEmptyProgress(), discoveryTier: 4 },
        "cherry-blossom": { ...createEmptyProgress(), discoveryTier: 2 },
      };
      const stats = checkDiscoveryProgress(progress);
      expect(stats.speciesMastered).toBe(2);
    });

    it("counts legendary species (tier >= 4)", () => {
      const progress: Record<string, SpeciesProgress> = {
        "white-oak": { ...createEmptyProgress(), discoveryTier: 4 },
        "elder-pine": { ...createEmptyProgress(), discoveryTier: 4 },
        "cherry-blossom": { ...createEmptyProgress(), discoveryTier: 3 },
      };
      const stats = checkDiscoveryProgress(progress);
      expect(stats.speciesLegendary).toBe(2);
    });

    it("completionPercent is based on legendary count / total species", () => {
      // 3 out of 15 legendary = 20%
      const progress: Record<string, SpeciesProgress> = {
        "white-oak": { ...createEmptyProgress(), discoveryTier: 4 },
        "elder-pine": { ...createEmptyProgress(), discoveryTier: 4 },
        "cherry-blossom": { ...createEmptyProgress(), discoveryTier: 4 },
      };
      const stats = checkDiscoveryProgress(progress);
      expect(stats.completionPercent).toBe(20);
    });

    it("completionPercent rounds to nearest integer", () => {
      // 1 out of 15 = 6.67% -> rounds to 7%
      const progress: Record<string, SpeciesProgress> = {
        "white-oak": { ...createEmptyProgress(), discoveryTier: 4 },
      };
      const stats = checkDiscoveryProgress(progress);
      expect(stats.completionPercent).toBe(7);
    });

    it("higher tiers also count for lower tier stats", () => {
      const progress: Record<string, SpeciesProgress> = {
        "white-oak": { ...createEmptyProgress(), discoveryTier: 4 },
      };
      const stats = checkDiscoveryProgress(progress);
      expect(stats.speciesDiscovered).toBe(1);
      expect(stats.speciesStudied).toBe(1);
      expect(stats.speciesMastered).toBe(1);
      expect(stats.speciesLegendary).toBe(1);
    });
  });

  // =========================================================================
  // getVisibleCodexFields
  // =========================================================================
  describe("getVisibleCodexFields", () => {
    it("tier 0 returns empty array", () => {
      expect(getVisibleCodexFields(0)).toEqual([]);
    });

    it("tier 1 returns name and tier1 lore", () => {
      const fields = getVisibleCodexFields(1);
      expect(fields).toContain("name");
      expect(fields).toContain("lore.tier1");
      expect(fields).not.toContain("habitat");
      expect(fields).not.toContain("lore.tier2");
    });

    it("tier 2 includes habitat and growthTip", () => {
      const fields = getVisibleCodexFields(2);
      expect(fields).toContain("name");
      expect(fields).toContain("lore.tier1");
      expect(fields).toContain("lore.tier2");
      expect(fields).toContain("habitat");
      expect(fields).toContain("growthTip");
      expect(fields).not.toContain("funFact");
      expect(fields).not.toContain("lore.tier3");
    });

    it("tier 3 includes funFact and tier3 lore", () => {
      const fields = getVisibleCodexFields(3);
      expect(fields).toContain("lore.tier3");
      expect(fields).toContain("funFact");
      expect(fields).not.toContain("lore.tier4");
    });

    it("tier 4 includes all fields", () => {
      const fields = getVisibleCodexFields(4);
      expect(fields).toContain("name");
      expect(fields).toContain("lore.tier1");
      expect(fields).toContain("lore.tier2");
      expect(fields).toContain("lore.tier3");
      expect(fields).toContain("lore.tier4");
      expect(fields).toContain("habitat");
      expect(fields).toContain("growthTip");
      expect(fields).toContain("funFact");
    });

    it("each tier returns at least as many fields as the tier below it", () => {
      const tiers = [0, 1, 2, 3, 4] as const;
      for (let i = 1; i < tiers.length; i++) {
        const current = getVisibleCodexFields(tiers[i]);
        const previous = getVisibleCodexFields(tiers[i - 1]);
        expect(current.length).toBeGreaterThanOrEqual(previous.length);
      }
    });

    it("higher tiers are supersets of lower tiers", () => {
      const tiers = [0, 1, 2, 3, 4] as const;
      for (let i = 1; i < tiers.length; i++) {
        const current = getVisibleCodexFields(tiers[i]);
        const previous = getVisibleCodexFields(tiers[i - 1]);
        for (const field of previous) {
          expect(
            current,
            `Tier ${tiers[i]} missing field ${field} from tier ${tiers[i - 1]}`,
          ).toContain(field);
        }
      }
    });
  });

  // =========================================================================
  // gameStore integration
  // =========================================================================
  describe("Koota integration", () => {
    beforeEach(() => {
      koota.set(SpeciesProgressTrait, {
        speciesProgress: {},
        pendingCodexUnlocks: [],
      });
    });

    const getCodex = () => koota.get(SpeciesProgressTrait);
    const getProgress = (id: string) => getCodex()?.speciesProgress[id];

    it("starts with empty speciesProgress", () => {
      expect(getCodex()?.speciesProgress).toEqual({});
    });

    it("starts with empty pendingCodexUnlocks", () => {
      expect(getCodex()?.pendingCodexUnlocks).toEqual([]);
    });

    it("trackSpeciesPlanting creates progress and sets tier 1", () => {
      trackSpeciesPlanting(koota, "white-oak");
      const progress = getProgress("white-oak");
      expect(progress).toBeDefined();
      expect(progress!.timesPlanted).toBe(1);
      expect(progress!.discoveryTier).toBe(1);
    });

    it("trackSpeciesPlanting adds to pendingCodexUnlocks on tier change", () => {
      trackSpeciesPlanting(koota, "white-oak");
      expect(getCodex()?.pendingCodexUnlocks).toContain("white-oak");
    });

    it("trackSpeciesPlanting does not duplicate pending on same-tier re-plant", () => {
      trackSpeciesPlanting(koota, "white-oak");
      trackSpeciesPlanting(koota, "white-oak");
      const pending = (getCodex()?.pendingCodexUnlocks ?? []).filter(
        (id) => id === "white-oak",
      );
      expect(pending.length).toBe(1);
    });

    it("trackSpeciesGrowth updates maxStageReached", () => {
      trackSpeciesPlanting(koota, "white-oak");
      trackSpeciesGrowth(koota, "white-oak", 2);
      expect(getProgress("white-oak")?.maxStageReached).toBe(2);
    });

    it("trackSpeciesGrowth does not decrease maxStageReached", () => {
      trackSpeciesPlanting(koota, "white-oak");
      trackSpeciesGrowth(koota, "white-oak", 3);
      trackSpeciesGrowth(koota, "white-oak", 1);
      expect(getProgress("white-oak")?.maxStageReached).toBe(3);
    });

    it("trackSpeciesGrowth to stage 3 sets tier 2", () => {
      trackSpeciesPlanting(koota, "white-oak");
      trackSpeciesGrowth(koota, "white-oak", 3);
      expect(getProgress("white-oak")?.discoveryTier).toBe(2);
    });

    it("trackSpeciesGrowth to stage 4 sets tier 3", () => {
      trackSpeciesPlanting(koota, "white-oak");
      trackSpeciesGrowth(koota, "white-oak", 4);
      expect(getProgress("white-oak")?.discoveryTier).toBe(3);
    });

    it("trackSpeciesHarvest increments harvest count and totalYield", () => {
      trackSpeciesPlanting(koota, "white-oak");
      trackSpeciesHarvest(koota, "white-oak", 5);
      const progress = getProgress("white-oak");
      expect(progress?.timesHarvested).toBe(1);
      expect(progress?.totalYield).toBe(5);
    });

    it("trackSpeciesHarvest accumulates yield across calls", () => {
      trackSpeciesPlanting(koota, "white-oak");
      trackSpeciesHarvest(koota, "white-oak", 3);
      trackSpeciesHarvest(koota, "white-oak", 7);
      const progress = getProgress("white-oak");
      expect(progress?.timesHarvested).toBe(2);
      expect(progress?.totalYield).toBe(10);
    });

    it("trackSpeciesHarvest 10 times reaches tier 4", () => {
      trackSpeciesPlanting(koota, "white-oak");
      trackSpeciesGrowth(koota, "white-oak", 4);
      for (let i = 0; i < 10; i++) {
        trackSpeciesHarvest(koota, "white-oak", 2);
      }
      expect(getProgress("white-oak")?.discoveryTier).toBe(4);
    });

    it("consumePendingCodexUnlock returns first unlock and removes it", () => {
      trackSpeciesPlanting(koota, "white-oak");
      trackSpeciesPlanting(koota, "elder-pine");
      const first = consumePendingCodexUnlock(koota);
      expect(first).toBe("white-oak");
      expect(getCodex()?.pendingCodexUnlocks).toEqual(["elder-pine"]);
    });

    it("consumePendingCodexUnlock returns null when empty", () => {
      const result = consumePendingCodexUnlock(koota);
      expect(result).toBeNull();
    });

    it("trackSpeciesGrowth creates progress for untracked species", () => {
      trackSpeciesGrowth(koota, "redwood", 2);
      const progress = getProgress("redwood");
      expect(progress).toBeDefined();
      expect(progress!.maxStageReached).toBe(2);
    });

    it("trackSpeciesHarvest creates progress for untracked species", () => {
      trackSpeciesHarvest(koota, "redwood", 5);
      const progress = getProgress("redwood");
      expect(progress).toBeDefined();
      expect(progress!.timesHarvested).toBe(1);
      expect(progress!.totalYield).toBe(5);
    });
  });
});
