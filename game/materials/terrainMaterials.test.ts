/**
 * Terrain material mapping tests (Spec §47)
 *
 * Covers:
 * - All 8 BiomeType values map to valid texture keys
 * - Legacy biome aliases work
 * - Unknown biomes throw (no fallbacks)
 * - Season overlay returns snow_ground for winter only
 */

import { getBiomeMaterialKey, getSeasonOverlay, TERRAIN_TEXTURE_KEYS } from "./terrainMaterials.ts";

describe("Terrain Materials — biome mapping (Spec §47.4)", () => {
  it("maps starting-grove to terrain/grass_green", () => {
    expect(getBiomeMaterialKey("starting-grove")).toBe("terrain/grass_green");
  });

  it("maps meadow to terrain/grass_green", () => {
    expect(getBiomeMaterialKey("meadow")).toBe("terrain/grass_green");
  });

  it("maps ancient-forest to terrain/forest_floor", () => {
    expect(getBiomeMaterialKey("ancient-forest")).toBe("terrain/forest_floor");
  });

  it("maps wetlands to terrain/forest_floor", () => {
    expect(getBiomeMaterialKey("wetlands")).toBe("terrain/forest_floor");
  });

  it("maps rocky-highlands to terrain/dirt_path", () => {
    expect(getBiomeMaterialKey("rocky-highlands")).toBe("terrain/dirt_path");
  });

  it("maps orchard-valley to terrain/grass_green", () => {
    expect(getBiomeMaterialKey("orchard-valley")).toBe("terrain/grass_green");
  });

  it("maps frozen-peaks to terrain/snow_ground", () => {
    expect(getBiomeMaterialKey("frozen-peaks")).toBe("terrain/snow_ground");
  });

  it("maps twilight-glade to terrain/forest_floor", () => {
    expect(getBiomeMaterialKey("twilight-glade")).toBe("terrain/forest_floor");
  });

  it("legacy alias: forest → terrain/forest_floor", () => {
    expect(getBiomeMaterialKey("forest")).toBe("terrain/forest_floor");
  });

  it("legacy alias: village → terrain/cobblestone", () => {
    expect(getBiomeMaterialKey("village")).toBe("terrain/cobblestone");
  });

  it("legacy alias: grassland → terrain/grass_green", () => {
    expect(getBiomeMaterialKey("grassland")).toBe("terrain/grass_green");
  });

  it("throws on unknown biome — no fallback", () => {
    expect(() => getBiomeMaterialKey("enchanted")).toThrow("unknown biome 'enchanted'");
    expect(() => getBiomeMaterialKey("savanna")).toThrow("unknown biome 'savanna'");
    expect(() => getBiomeMaterialKey("")).toThrow("unknown biome ''");
  });

  it("all mapped biomes resolve to keys that exist in TERRAIN_TEXTURE_KEYS", () => {
    const biomes = [
      "starting-grove",
      "meadow",
      "ancient-forest",
      "wetlands",
      "rocky-highlands",
      "orchard-valley",
      "frozen-peaks",
      "twilight-glade",
      "forest",
      "village",
      "path",
      "beach",
      "tundra",
      "grassland",
    ];
    for (const biome of biomes) {
      const key = getBiomeMaterialKey(biome);
      expect(TERRAIN_TEXTURE_KEYS).toContain(key);
    }
  });
});

describe("Terrain Materials — season overlay (Spec §47.4)", () => {
  it("returns snow_ground for winter", () => {
    expect(getSeasonOverlay("winter")).toBe("terrain/snow_ground");
  });

  it("returns null for spring", () => {
    expect(getSeasonOverlay("spring")).toBeNull();
  });

  it("returns null for summer", () => {
    expect(getSeasonOverlay("summer")).toBeNull();
  });

  it("returns null for autumn", () => {
    expect(getSeasonOverlay("autumn")).toBeNull();
  });

  it("returns null for unknown season", () => {
    expect(getSeasonOverlay("monsoon")).toBeNull();
  });

  it("overlay key exists in TERRAIN_TEXTURE_KEYS when non-null", () => {
    const overlay = getSeasonOverlay("winter");
    expect(overlay).not.toBeNull();
    expect(TERRAIN_TEXTURE_KEYS).toContain(overlay);
  });
});
