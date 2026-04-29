import { beforeEach, describe, expect, it } from "vitest";
import { koota } from "@/koota";
import { SpeciesProgressTrait } from "@/traits";
import {
  consumePendingCodexUnlock,
  trackSpeciesGrowth,
  trackSpeciesHarvest,
  trackSpeciesPlanting,
} from "./speciesTracking";

describe("speciesTracking — Koota integration", () => {
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

  it("pending unlock deduplicates across successive tier changes before consume", () => {
    trackSpeciesPlanting(koota, "white-oak");
    consumePendingCodexUnlock(koota);
    trackSpeciesGrowth(koota, "white-oak", 3);
    trackSpeciesGrowth(koota, "white-oak", 4);
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

  it("trackSpeciesPlanting returns CodexEvent on tier change", () => {
    const event = trackSpeciesPlanting(koota, "white-oak");
    expect(event).not.toBeNull();
    expect(event!.speciesId).toBe("white-oak");
    expect(event!.tier).toBe(1);
    expect(event!.tierName).toBe("Discovered");
  });

  it("trackSpeciesPlanting returns null when no tier change", () => {
    trackSpeciesPlanting(koota, "white-oak");
    const event = trackSpeciesPlanting(koota, "white-oak");
    expect(event).toBeNull();
  });

  it("trackSpeciesGrowth returns CodexEvent on tier change", () => {
    trackSpeciesPlanting(koota, "white-oak");
    const event = trackSpeciesGrowth(koota, "white-oak", 3);
    expect(event).not.toBeNull();
    expect(event!.tier).toBe(2);
    expect(event!.tierName).toBe("Studied");
  });

  it("trackSpeciesHarvest returns CodexEvent when reaching tier 4", () => {
    trackSpeciesPlanting(koota, "white-oak");
    trackSpeciesGrowth(koota, "white-oak", 4);
    for (let i = 0; i < 9; i++) trackSpeciesHarvest(koota, "white-oak", 1);
    const event = trackSpeciesHarvest(koota, "white-oak", 1);
    expect(event).not.toBeNull();
    expect(event!.tier).toBe(4);
    expect(event!.tierName).toBe("Legendary");
  });
});
