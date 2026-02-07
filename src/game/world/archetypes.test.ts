import { describe, it, expect } from "vitest";
import { ZONE_ARCHETYPES, getArchetype } from "./archetypes";

describe("zone archetypes", () => {
  it("has all expected archetype IDs", () => {
    const ids = ZONE_ARCHETYPES.map((a) => a.id);
    expect(ids).toContain("grove");
    expect(ids).toContain("wild-forest");
    expect(ids).toContain("clearing");
    expect(ids).toContain("trail");
    expect(ids).toContain("settlement");
  });

  it("every archetype has valid size ranges (min <= max)", () => {
    for (const arch of ZONE_ARCHETYPES) {
      expect(arch.sizeRange.minWidth).toBeLessThanOrEqual(arch.sizeRange.maxWidth);
      expect(arch.sizeRange.minHeight).toBeLessThanOrEqual(arch.sizeRange.maxHeight);
      expect(arch.sizeRange.minWidth).toBeGreaterThan(0);
      expect(arch.sizeRange.minHeight).toBeGreaterThan(0);
    }
  });

  it("tile rule percentages sum to at most 1.0", () => {
    for (const arch of ZONE_ARCHETYPES) {
      const sum = arch.tileRules.waterPct + arch.tileRules.rockPct + arch.tileRules.pathPct;
      expect(sum).toBeLessThanOrEqual(1.0);
    }
  });

  it("tile rule percentages are non-negative", () => {
    for (const arch of ZONE_ARCHETYPES) {
      expect(arch.tileRules.waterPct).toBeGreaterThanOrEqual(0);
      expect(arch.tileRules.rockPct).toBeGreaterThanOrEqual(0);
      expect(arch.tileRules.pathPct).toBeGreaterThanOrEqual(0);
    }
  });

  it("wild-forest has wild trees defined", () => {
    const forest = getArchetype("wild-forest");
    expect(forest).toBeDefined();
    expect(forest!.wildTrees).toBeDefined();
    expect(forest!.wildTrees!.length).toBeGreaterThan(0);
    expect(forest!.wildTreeDensity).toBeGreaterThan(0);
  });

  it("grove is plantable, settlement is not", () => {
    expect(getArchetype("grove")!.plantable).toBe(true);
    expect(getArchetype("settlement")!.plantable).toBe(false);
  });

  it("prop weights are positive", () => {
    for (const arch of ZONE_ARCHETYPES) {
      for (const prop of arch.possibleProps) {
        expect(prop.weight).toBeGreaterThan(0);
        expect(prop.value).toBeTruthy();
      }
    }
  });

  describe("getArchetype", () => {
    it("returns correct archetype by id", () => {
      const grove = getArchetype("grove");
      expect(grove).toBeDefined();
      expect(grove!.name).toBe("Grove");
    });

    it("returns undefined for unknown id", () => {
      expect(getArchetype("nonexistent")).toBeUndefined();
    });
  });
});
