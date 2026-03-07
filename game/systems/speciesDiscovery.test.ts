import {
  checkDiscoveryProgress,
  computeDiscoveryTier,
  createEmptyProgress,
  encounterWildSpecies,
  getVisibleCodexFields,
  type SpeciesProgress,
} from "./speciesDiscovery.ts";

describe("computeDiscoveryTier (Spec §8, §25)", () => {
  it("returns tier 0 for never-seen species", () => {
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

  it("returns tier 1 when seenInWild is true even if never planted", () => {
    expect(
      computeDiscoveryTier({
        timesPlanted: 0,
        maxStageReached: 0,
        timesHarvested: 0,
        totalYield: 0,
        seenInWild: true,
      }),
    ).toBe(1);
  });

  it("returns tier 0 when seenInWild is false and never planted", () => {
    expect(
      computeDiscoveryTier({
        timesPlanted: 0,
        maxStageReached: 0,
        timesHarvested: 0,
        totalYield: 0,
        seenInWild: false,
      }),
    ).toBe(0);
  });

  it("returns tier 2 when max stage >= 3 (Mature)", () => {
    expect(
      computeDiscoveryTier({
        timesPlanted: 5,
        maxStageReached: 3,
        timesHarvested: 0,
        totalYield: 0,
      }),
    ).toBe(2);
  });

  it("returns tier 3 when max stage >= 4 (Old Growth)", () => {
    expect(
      computeDiscoveryTier({
        timesPlanted: 10,
        maxStageReached: 4,
        timesHarvested: 5,
        totalYield: 50,
      }),
    ).toBe(3);
  });

  it("returns tier 4 when harvested >= 10 times", () => {
    expect(
      computeDiscoveryTier({
        timesPlanted: 20,
        maxStageReached: 4,
        timesHarvested: 10,
        totalYield: 100,
      }),
    ).toBe(4);
  });

  it("tier 4 takes priority over tier 3", () => {
    expect(
      computeDiscoveryTier({
        timesPlanted: 1,
        maxStageReached: 4,
        timesHarvested: 15,
        totalYield: 200,
      }),
    ).toBe(4);
  });

  it("tier 3 takes priority over tier 2", () => {
    expect(
      computeDiscoveryTier({
        timesPlanted: 1,
        maxStageReached: 4,
        timesHarvested: 5,
        totalYield: 0,
      }),
    ).toBe(3);
  });
});

describe("createEmptyProgress", () => {
  it("returns zeroed progress with tier 0 and seenInWild false", () => {
    const progress = createEmptyProgress();
    expect(progress).toEqual({
      timesPlanted: 0,
      maxStageReached: 0,
      timesHarvested: 0,
      totalYield: 0,
      discoveryTier: 0,
      seenInWild: false,
    });
  });
});

describe("encounterWildSpecies (Spec §8, §25)", () => {
  it("returns isNew=true and sets seenInWild on first encounter", () => {
    const progress = createEmptyProgress();
    const result = encounterWildSpecies(progress);
    expect(result.isNew).toBe(true);
    expect(result.updated.seenInWild).toBe(true);
  });

  it("sets discoveryTier to 1 on first encounter when never planted", () => {
    const progress = createEmptyProgress();
    const result = encounterWildSpecies(progress);
    expect(result.updated.discoveryTier).toBe(1);
  });

  it("returns isNew=false when already seen in wild", () => {
    const progress: SpeciesProgress = {
      ...createEmptyProgress(),
      seenInWild: true,
      discoveryTier: 1,
    };
    const result = encounterWildSpecies(progress);
    expect(result.isNew).toBe(false);
    expect(result.updated).toBe(progress); // same reference -- no copy
  });

  it("is idempotent -- repeated calls yield isNew=false after first", () => {
    const first = encounterWildSpecies(createEmptyProgress());
    const second = encounterWildSpecies(first.updated);
    expect(second.isNew).toBe(false);
  });

  it("does not downgrade discoveryTier if already planted (tier >= 1)", () => {
    const progress: SpeciesProgress = {
      ...createEmptyProgress(),
      timesPlanted: 3,
      maxStageReached: 2,
      discoveryTier: 1,
    };
    const result = encounterWildSpecies(progress);
    expect(result.updated.discoveryTier).toBe(1); // still tier 1, not reset
  });

  it("does not downgrade higher tiers (tier 2+) on wild encounter", () => {
    const progress: SpeciesProgress = {
      ...createEmptyProgress(),
      timesPlanted: 5,
      maxStageReached: 3,
      discoveryTier: 2,
    };
    const result = encounterWildSpecies(progress);
    expect(result.updated.discoveryTier).toBe(2); // stays at tier 2
  });
});

describe("checkDiscoveryProgress", () => {
  it("returns zero stats for empty progress", () => {
    const stats = checkDiscoveryProgress({});
    expect(stats.speciesDiscovered).toBe(0);
    expect(stats.speciesStudied).toBe(0);
    expect(stats.speciesMastered).toBe(0);
    expect(stats.speciesLegendary).toBe(0);
    expect(stats.completionPercent).toBe(0);
  });

  it("counts discovered species (tier >= 1)", () => {
    const allProgress: Record<string, SpeciesProgress> = {
      "white-oak": { ...createEmptyProgress(), discoveryTier: 1 },
      "elder-pine": { ...createEmptyProgress(), discoveryTier: 0 },
    };
    const stats = checkDiscoveryProgress(allProgress);
    expect(stats.speciesDiscovered).toBe(1);
  });

  it("counts studied species (tier >= 2)", () => {
    const allProgress: Record<string, SpeciesProgress> = {
      "white-oak": { ...createEmptyProgress(), discoveryTier: 2 },
      "elder-pine": { ...createEmptyProgress(), discoveryTier: 1 },
    };
    const stats = checkDiscoveryProgress(allProgress);
    expect(stats.speciesStudied).toBe(1);
    expect(stats.speciesDiscovered).toBe(2); // tier 2 also counts as discovered
  });

  it("counts mastered species (tier >= 3)", () => {
    const allProgress: Record<string, SpeciesProgress> = {
      "white-oak": { ...createEmptyProgress(), discoveryTier: 3 },
    };
    const stats = checkDiscoveryProgress(allProgress);
    expect(stats.speciesMastered).toBe(1);
    expect(stats.speciesStudied).toBe(1);
    expect(stats.speciesDiscovered).toBe(1);
  });

  it("counts legendary species (tier >= 4)", () => {
    const allProgress: Record<string, SpeciesProgress> = {
      "white-oak": { ...createEmptyProgress(), discoveryTier: 4 },
    };
    const stats = checkDiscoveryProgress(allProgress);
    expect(stats.speciesLegendary).toBe(1);
  });

  it("computes completion percent based on legendary / total", () => {
    // Total species = 17 base (12 spec-canonical + 5 legacy code-referenced) + 3 prestige = 20
    const allProgress: Record<string, SpeciesProgress> = {
      "white-oak": { ...createEmptyProgress(), discoveryTier: 4 },
      "elder-pine": { ...createEmptyProgress(), discoveryTier: 4 },
      "cherry-blossom": { ...createEmptyProgress(), discoveryTier: 4 },
    };
    const stats = checkDiscoveryProgress(allProgress);
    expect(stats.totalSpecies).toBe(20);
    expect(stats.speciesLegendary).toBe(3);
    expect(stats.completionPercent).toBe(Math.round((3 / 20) * 100));
  });
});

describe("getVisibleCodexFields", () => {
  it("returns empty array for tier 0", () => {
    expect(getVisibleCodexFields(0)).toEqual([]);
  });

  it("returns name and tier1 lore for tier 1", () => {
    const fields = getVisibleCodexFields(1);
    expect(fields).toContain("name");
    expect(fields).toContain("lore.tier1");
    expect(fields).toHaveLength(2);
  });

  it("adds habitat and growthTip at tier 2", () => {
    const fields = getVisibleCodexFields(2);
    expect(fields).toContain("habitat");
    expect(fields).toContain("growthTip");
    expect(fields).toContain("lore.tier2");
  });

  it("adds funFact and tier3 lore at tier 3", () => {
    const fields = getVisibleCodexFields(3);
    expect(fields).toContain("funFact");
    expect(fields).toContain("lore.tier3");
  });

  it("adds tier4 lore at tier 4", () => {
    const fields = getVisibleCodexFields(4);
    expect(fields).toContain("lore.tier4");
    expect(fields).toHaveLength(8);
  });

  it("each higher tier includes all fields from lower tiers", () => {
    const tier1 = getVisibleCodexFields(1);
    const tier2 = getVisibleCodexFields(2);
    const tier3 = getVisibleCodexFields(3);
    const tier4 = getVisibleCodexFields(4);

    for (const field of tier1) expect(tier2).toContain(field);
    for (const field of tier2) expect(tier3).toContain(field);
    for (const field of tier3) expect(tier4).toContain(field);
  });
});
