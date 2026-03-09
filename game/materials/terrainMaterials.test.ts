/**
 * Terrain material mapping tests (Spec §47)
 *
 * Covers:
 * - Every named biome maps to a key that exists in the texture registry
 * - Unknown biomes fall back to grass_green
 * - Season overlay returns snow_ground for winter only
 */

import { getBiomeMaterialKey, getSeasonOverlay, TERRAIN_TEXTURE_KEYS } from "./terrainMaterials.ts";

describe("Terrain Materials — biome mapping (Spec §47.4)", () => {
  it("maps forest biome to terrain/forest_floor", () => {
    expect(getBiomeMaterialKey("forest")).toBe("terrain/forest_floor");
  });

  it("maps village biome to terrain/cobblestone", () => {
    expect(getBiomeMaterialKey("village")).toBe("terrain/cobblestone");
  });

  it("maps path biome to terrain/dirt_path", () => {
    expect(getBiomeMaterialKey("path")).toBe("terrain/dirt_path");
  });

  it("maps beach biome to terrain/sand_beach", () => {
    expect(getBiomeMaterialKey("beach")).toBe("terrain/sand_beach");
  });

  it("maps tundra biome to terrain/snow_ground", () => {
    expect(getBiomeMaterialKey("tundra")).toBe("terrain/snow_ground");
  });

  it("maps unknown biome to terrain/grass_green (default)", () => {
    expect(getBiomeMaterialKey("enchanted")).toBe("terrain/grass_green");
    expect(getBiomeMaterialKey("savanna")).toBe("terrain/grass_green");
    expect(getBiomeMaterialKey("")).toBe("terrain/grass_green");
  });

  it("meadow falls back to grass_green", () => {
    expect(getBiomeMaterialKey("meadow")).toBe("terrain/grass_green");
  });

  it("all returned keys exist in TERRAIN_TEXTURE_KEYS", () => {
    const biomes = [
      "forest",
      "village",
      "path",
      "beach",
      "tundra",
      "meadow",
      "wetland",
      "highland",
      "unknown_biome",
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
    // biome-safe: overlay is always a terrain key
    expect(TERRAIN_TEXTURE_KEYS).toContain(overlay);
  });
});
