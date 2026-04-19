import { describe, expect, it } from "vitest";
import { getSpeciesById, TREE_SPECIES } from "./trees";

describe("Tree Species Catalog", () => {
  it("has exactly 12 base species", () => {
    expect(TREE_SPECIES).toHaveLength(12);
  });

  it("every species has required fields", () => {
    for (const species of TREE_SPECIES) {
      expect(species.id).toBeTruthy();
      expect(species.name).toBeTruthy();
      expect(species.difficulty).toBeGreaterThanOrEqual(1);
      expect(species.difficulty).toBeLessThanOrEqual(5);
      expect(species.unlockLevel).toBeGreaterThanOrEqual(1);
      expect(species.baseGrowthTimes).toHaveLength(5);
      expect(species.yield.length).toBeGreaterThan(0);
      expect(species.harvestCycleSec).toBeGreaterThan(0);
      expect(typeof species.evergreen).toBe("boolean");
      expect(species.meshParams.trunkHeight).toBeGreaterThan(0);
      expect(species.meshParams.canopyRadius).toBeGreaterThan(0);
    }
  });

  it("includes white-oak as starter species", () => {
    const oak = getSpeciesById("white-oak");
    expect(oak).toBeDefined();
    expect(oak!.difficulty).toBe(1);
    expect(oak!.unlockLevel).toBe(1);
  });

  it("includes all 12 spec species", () => {
    const ids = TREE_SPECIES.map((s) => s.id);
    expect(ids).toContain("white-oak");
    expect(ids).toContain("weeping-willow");
    expect(ids).toContain("elder-pine");
    expect(ids).toContain("cherry-blossom");
    expect(ids).toContain("ghost-birch");
    expect(ids).toContain("redwood");
    expect(ids).toContain("flame-maple");
    expect(ids).toContain("baobab");
    expect(ids).toContain("silver-birch");
    expect(ids).toContain("ironbark");
    expect(ids).toContain("golden-apple");
    expect(ids).toContain("mystic-fern");
  });

  it("elder-pine and redwood are evergreen", () => {
    expect(getSpeciesById("elder-pine")!.evergreen).toBe(true);
    expect(getSpeciesById("redwood")!.evergreen).toBe(true);
  });

  it("non-evergreen species are not marked evergreen", () => {
    expect(getSpeciesById("white-oak")!.evergreen).toBe(false);
    expect(getSpeciesById("cherry-blossom")!.evergreen).toBe(false);
  });

  it("getSpeciesById returns undefined for unknown id", () => {
    expect(getSpeciesById("nonexistent")).toBeUndefined();
  });

  it("white-oak has free seed cost", () => {
    const oak = getSpeciesById("white-oak")!;
    const totalCost = Object.values(oak.seedCost).reduce((a, b) => a + b, 0);
    expect(totalCost).toBe(0);
  });
});
