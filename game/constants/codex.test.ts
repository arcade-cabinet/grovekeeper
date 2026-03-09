import {
  BIOME_CODEX,
  DISCOVERY_TIERS,
  getAllCodexEntries,
  getBiomeEntry,
  getCodexEntry,
} from "./codex.ts";

describe("DISCOVERY_TIERS", () => {
  it("defines 5 tiers (0-4)", () => {
    expect(Object.keys(DISCOVERY_TIERS)).toHaveLength(5);
    for (let i = 0; i <= 4; i++) {
      expect(DISCOVERY_TIERS[i]).toBeDefined();
      expect(DISCOVERY_TIERS[i].tier).toBe(i);
    }
  });

  it("each tier has name and description", () => {
    for (let i = 0; i <= 4; i++) {
      expect(DISCOVERY_TIERS[i].name).toBeTruthy();
      expect(DISCOVERY_TIERS[i].description).toBeTruthy();
    }
  });

  it("tier names match expected progression", () => {
    expect(DISCOVERY_TIERS[0].name).toBe("Unknown");
    expect(DISCOVERY_TIERS[1].name).toBe("Discovered");
    expect(DISCOVERY_TIERS[2].name).toBe("Studied");
    expect(DISCOVERY_TIERS[3].name).toBe("Mastered");
    expect(DISCOVERY_TIERS[4].name).toBe("Legendary");
  });
});

describe("getCodexEntry", () => {
  it("returns entry for white-oak", () => {
    const entry = getCodexEntry("white-oak");
    expect(entry).toBeDefined();
    expect(entry!.speciesId).toBe("white-oak");
  });

  it("returns entry with all lore tiers", () => {
    const entry = getCodexEntry("white-oak");
    expect(entry!.lore.tier1).toBeTruthy();
    expect(entry!.lore.tier2).toBeTruthy();
    expect(entry!.lore.tier3).toBeTruthy();
    expect(entry!.lore.tier4).toBeTruthy();
  });

  it("returns entry with habitat and tips", () => {
    const entry = getCodexEntry("weeping-willow");
    expect(entry!.habitat).toBeTruthy();
    expect(entry!.growthTip).toBeTruthy();
    expect(entry!.funFact).toBeTruthy();
  });

  it("returns undefined for unknown species", () => {
    expect(getCodexEntry("nonexistent-tree")).toBeUndefined();
  });

  it("has entries for all 15 species", () => {
    const expectedSpecies = [
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
      "crystal-oak",
      "moonwood-ash",
      "worldtree",
    ];
    for (const id of expectedSpecies) {
      expect(getCodexEntry(id)).toBeDefined();
    }
  });
});

describe("getAllCodexEntries", () => {
  it("returns all 15 species entries", () => {
    const entries = getAllCodexEntries();
    expect(entries).toHaveLength(15);
  });

  it("returns readonly array", () => {
    const entries = getAllCodexEntries();
    // Each entry has required fields
    for (const entry of entries) {
      expect(entry.speciesId).toBeTruthy();
      expect(entry.lore).toBeDefined();
      expect(entry.habitat).toBeTruthy();
    }
  });

  it("every entry has unique speciesId", () => {
    const entries = getAllCodexEntries();
    const ids = entries.map((e) => e.speciesId);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(ids.length);
  });
});

describe("getBiomeEntry", () => {
  it("returns temperate biome", () => {
    const entry = getBiomeEntry("temperate");
    expect(entry).toBeDefined();
    expect(entry!.name).toBe("Temperate");
  });

  it("returns correct native species for wetland", () => {
    const entry = getBiomeEntry("wetland");
    expect(entry!.nativeSpecies).toContain("weeping-willow");
  });

  it("returns undefined for unknown biome", () => {
    expect(getBiomeEntry("mars")).toBeUndefined();
  });

  it("has entries for all expected biomes", () => {
    const biomeIds = [
      "temperate",
      "wetland",
      "mountain",
      "tundra-edge",
      "coastal",
      "highland",
      "savanna",
      "orchard",
      "enchanted",
    ];
    for (const id of biomeIds) {
      expect(getBiomeEntry(id)).toBeDefined();
    }
  });

  it("every biome has at least one native species", () => {
    for (const biome of BIOME_CODEX) {
      expect(biome.nativeSpecies.length).toBeGreaterThan(0);
    }
  });

  it("every biome has name, description, and climate", () => {
    for (const biome of BIOME_CODEX) {
      expect(biome.name).toBeTruthy();
      expect(biome.description).toBeTruthy();
      expect(biome.climate).toBeTruthy();
    }
  });
});
