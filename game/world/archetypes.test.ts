import { getArchetype, ZONE_ARCHETYPES } from "./archetypes";

describe("ZONE_ARCHETYPES", () => {
  it("defines 5 archetypes", () => {
    expect(ZONE_ARCHETYPES).toHaveLength(5);
  });

  it("each archetype has a unique id", () => {
    const ids = ZONE_ARCHETYPES.map((a) => a.id);
    const unique = new Set(ids);
    expect(unique.size).toBe(ids.length);
  });

  it("each archetype has required fields", () => {
    for (const arch of ZONE_ARCHETYPES) {
      expect(arch.id).toBeTruthy();
      expect(arch.type).toBeTruthy();
      expect(arch.name).toBeTruthy();
      expect(arch.sizeRange).toBeDefined();
      expect(arch.groundMaterial).toBeTruthy();
      expect(arch.tileRules).toBeDefined();
      expect(arch.possibleProps.length).toBeGreaterThan(0);
      expect(typeof arch.plantable).toBe("boolean");
    }
  });

  it("grove archetype has soil ground and is plantable", () => {
    const grove = ZONE_ARCHETYPES.find((a) => a.id === "grove");
    expect(grove).toBeDefined();
    expect(grove!.groundMaterial).toBe("soil");
    expect(grove!.plantable).toBe(true);
  });

  it("wild-forest archetype has wild trees defined", () => {
    const forest = ZONE_ARCHETYPES.find((a) => a.id === "wild-forest");
    expect(forest).toBeDefined();
    expect(forest!.wildTrees).toBeDefined();
    expect(forest!.wildTrees!.length).toBeGreaterThan(0);
    expect(forest!.wildTreeDensity).toBeGreaterThan(0);
  });

  it("trail archetype has high path percentage", () => {
    const trail = ZONE_ARCHETYPES.find((a) => a.id === "trail");
    expect(trail).toBeDefined();
    expect(trail!.tileRules.pathPct).toBe(0.6);
    expect(trail!.plantable).toBe(false);
  });

  it("settlement archetype has stone ground", () => {
    const settlement = ZONE_ARCHETYPES.find((a) => a.id === "settlement");
    expect(settlement).toBeDefined();
    expect(settlement!.groundMaterial).toBe("stone");
  });

  it("sizeRange has valid min <= max for all archetypes", () => {
    for (const arch of ZONE_ARCHETYPES) {
      expect(arch.sizeRange.minWidth).toBeLessThanOrEqual(arch.sizeRange.maxWidth);
      expect(arch.sizeRange.minHeight).toBeLessThanOrEqual(arch.sizeRange.maxHeight);
    }
  });

  it("tile rule percentages are between 0 and 1", () => {
    for (const arch of ZONE_ARCHETYPES) {
      expect(arch.tileRules.waterPct).toBeGreaterThanOrEqual(0);
      expect(arch.tileRules.waterPct).toBeLessThanOrEqual(1);
      expect(arch.tileRules.rockPct).toBeGreaterThanOrEqual(0);
      expect(arch.tileRules.rockPct).toBeLessThanOrEqual(1);
      expect(arch.tileRules.pathPct).toBeGreaterThanOrEqual(0);
      expect(arch.tileRules.pathPct).toBeLessThanOrEqual(1);
    }
  });

  it("prop weights are positive", () => {
    for (const arch of ZONE_ARCHETYPES) {
      for (const prop of arch.possibleProps) {
        expect(prop.weight).toBeGreaterThan(0);
        expect(prop.value).toBeTruthy();
      }
    }
  });
});

describe("getArchetype", () => {
  it("returns grove archetype by id", () => {
    const arch = getArchetype("grove");
    expect(arch).toBeDefined();
    expect(arch!.id).toBe("grove");
    expect(arch!.type).toBe("grove");
  });

  it("returns wild-forest archetype by id", () => {
    const arch = getArchetype("wild-forest");
    expect(arch).toBeDefined();
    expect(arch!.type).toBe("forest");
  });

  it("returns clearing archetype by id", () => {
    const arch = getArchetype("clearing");
    expect(arch).toBeDefined();
    expect(arch!.plantable).toBe(true);
  });

  it("returns trail archetype by id", () => {
    const arch = getArchetype("trail");
    expect(arch).toBeDefined();
    expect(arch!.type).toBe("path");
  });

  it("returns settlement archetype by id", () => {
    const arch = getArchetype("settlement");
    expect(arch).toBeDefined();
    expect(arch!.type).toBe("settlement");
  });

  it("returns undefined for unknown id", () => {
    expect(getArchetype("nonexistent")).toBeUndefined();
  });
});
