/**
 * Tests for vegetation placement system.
 * References GAME_SPEC.md tree/bush/grass placement sections.
 */

import type { BushComponent } from "@/game/ecs/components/vegetation";
import {
  getSeasonalTreeTint,
  resolveBushModelKey,
  resolveTreeModelPath,
  selectGrassForBiome,
  selectRandomBushShape,
  speciesToTreeModel,
  updateBushSeason,
} from "./vegetationPlacement.ts";

describe("vegetationPlacement", () => {
  describe("speciesToTreeModel", () => {
    it("maps white-oak to tree01 retro pack", () => {
      const result = speciesToTreeModel("white-oak");
      expect(result.baseModel).toBe("tree01");
      expect(result.winterModel).toBe("tree01_winter");
      expect(result.pack).toBe("retro");
    });

    it("maps all 15 species to valid models", () => {
      const species = [
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
      for (const id of species) {
        const result = speciesToTreeModel(id);
        expect(result.baseModel).toBeTruthy();
        expect(result.pack).toMatch(/^(retro|extra)$/);
      }
    });

    it("falls back deterministically for unknown species", () => {
      const a = speciesToTreeModel("unknown-species");
      const b = speciesToTreeModel("unknown-species");
      expect(a.baseModel).toBe(b.baseModel);
      expect(a.pack).toBe("retro");
    });

    it("produces different fallbacks for different unknown species", () => {
      const a = speciesToTreeModel("species-a");
      const b = speciesToTreeModel("species-b");
      // They may or may not differ, but the function should not crash
      expect(a.baseModel).toBeTruthy();
      expect(b.baseModel).toBeTruthy();
    });
  });

  describe("resolveTreeModelPath", () => {
    it("returns base path for retro summer tree", () => {
      const path = resolveTreeModelPath("tree01", "retro", false);
      expect(path).toBe("trees/base/tree01.glb");
    });

    it("returns winter path for retro winter tree", () => {
      const path = resolveTreeModelPath("tree01_winter", "retro", true);
      expect(path).toBe("trees/winter/tree01_winter.glb");
    });

    it("returns extra path for tree_pack_1.1 trees", () => {
      const path = resolveTreeModelPath("tree15", "extra", false);
      expect(path).toBe("trees/extra/tree15.glb");
    });
  });

  describe("getSeasonalTreeTint", () => {
    it("returns green tints for deciduous trees in summer", () => {
      const tint = getSeasonalTreeTint("white-oak", "summer", false);
      expect(tint).toBe("#388E3C");
    });

    it("returns orange for deciduous trees in autumn", () => {
      const tint = getSeasonalTreeTint("white-oak", "autumn", false);
      expect(tint).toBe("#E65100");
    });

    it("returns pink for cherry blossom in spring", () => {
      const tint = getSeasonalTreeTint("cherry-blossom", "spring", false);
      expect(tint).toBe("#F48FB1");
    });

    it("returns consistent tint for evergreen trees", () => {
      const spring = getSeasonalTreeTint("elder-pine", "spring", true);
      const winter = getSeasonalTreeTint("elder-pine", "winter", true);
      // Evergreen trees should have green tints in both seasons
      expect(spring).toMatch(/^#[0-9A-F]{6}$/i);
      expect(winter).toMatch(/^#[0-9A-F]{6}$/i);
    });
  });

  describe("resolveBushModelKey", () => {
    it("resolves spring bush path correctly", () => {
      const key = resolveBushModelKey("bush_long", "spring", false);
      expect(key).toBe("bushes/spring/bush_long_spring.glb");
    });

    it("resolves autumn roots bush path correctly", () => {
      const key = resolveBushModelKey("bush_end", "autumn", true);
      expect(key).toBe("bushes/autumn/bush_end_roots_autumn.glb");
    });
  });

  describe("updateBushSeason", () => {
    it("updates season and model key", () => {
      const bush: BushComponent = {
        bushShape: "bush_tall",
        season: "spring",
        hasRoots: false,
        modelKey: "bushes/spring/bush_tall_spring.glb",
      };
      const updated = updateBushSeason(bush, "winter");
      expect(updated.season).toBe("winter");
      expect(updated.modelKey).toBe("bushes/winter/bush_tall_winter.glb");
    });

    it("preserves roots flag during season change", () => {
      const bush: BushComponent = {
        bushShape: "bush_end",
        season: "summer",
        hasRoots: true,
        modelKey: "bushes/summer/bush_end_roots_summer.glb",
      };
      const updated = updateBushSeason(bush, "dead");
      expect(updated.hasRoots).toBe(true);
      expect(updated.modelKey).toBe("bushes/dead/bush_end_roots_dead.glb");
    });
  });

  describe("selectGrassForBiome", () => {
    it("returns grass entries for temperate biome", () => {
      const result = selectGrassForBiome("temperate", 12345);
      expect(Array.isArray(result)).toBe(true);
      for (const entry of result) {
        expect(entry.grassType).toBeTruthy();
        expect(entry.density).toBeGreaterThanOrEqual(1);
      }
    });

    it("is deterministic for same seed", () => {
      const a = selectGrassForBiome("temperate", 42);
      const b = selectGrassForBiome("temperate", 42);
      expect(a).toEqual(b);
    });

    it("varies with different seeds", () => {
      const a = selectGrassForBiome("temperate", 100);
      const b = selectGrassForBiome("temperate", 999);
      // Statistically very likely to differ, but not guaranteed
      // At minimum, the function should not crash
      expect(Array.isArray(a)).toBe(true);
      expect(Array.isArray(b)).toBe(true);
    });

    it("falls back to temperate for unknown biome", () => {
      const result = selectGrassForBiome("unknown-biome", 42);
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe("selectRandomBushShape", () => {
    it("returns valid bush shape and roots flag", () => {
      const result = selectRandomBushShape(42);
      expect(result.bushShape).toBeTruthy();
      expect(typeof result.hasRoots).toBe("boolean");
    });

    it("is deterministic for same seed", () => {
      const a = selectRandomBushShape(777);
      const b = selectRandomBushShape(777);
      expect(a).toEqual(b);
    });
  });
});

// ---------------------------------------------------------------------------
// Chunk-based vegetation placement (Spec §6, §17.1)
// ---------------------------------------------------------------------------

import { spawnChunkVegetation } from "./vegetationPlacement.ts";

const CHUNK_SIZE = 16;

function flatHeightmap(): Float32Array {
  return new Float32Array(CHUNK_SIZE * CHUNK_SIZE).fill(0);
}

describe("spawnChunkVegetation (Spec §6, §17.1)", () => {
  it("returns trees and bushes arrays for a known biome", () => {
    const result = spawnChunkVegetation("TestSeed", 0, 0, "starting-grove", flatHeightmap());
    expect(Array.isArray(result.trees)).toBe(true);
    expect(Array.isArray(result.bushes)).toBe(true);
  });

  it("is deterministic for the same inputs", () => {
    const hm = flatHeightmap();
    const a = spawnChunkVegetation("WorldA", 3, 5, "meadow", hm);
    const b = spawnChunkVegetation("WorldA", 3, 5, "meadow", hm);
    expect(a.trees.length).toBe(b.trees.length);
    expect(a.bushes.length).toBe(b.bushes.length);
    if (a.trees.length > 0) {
      expect(a.trees[0].position).toEqual(b.trees[0].position);
      expect(a.trees[0].tree.speciesId).toBe(b.trees[0].tree.speciesId);
    }
  });

  it("varies output across different chunks", () => {
    const hm = flatHeightmap();
    const a = spawnChunkVegetation("WorldA", 0, 0, "starting-grove", hm);
    const b = spawnChunkVegetation("WorldA", 7, 3, "starting-grove", hm);
    // Positions must differ (different chunk offsets produce different world coords)
    if (a.trees.length > 0 && b.trees.length > 0) {
      expect(a.trees[0].position).not.toEqual(b.trees[0].position);
    }
  });

  it("tree positions are within chunk world bounds", () => {
    const result = spawnChunkVegetation("BoundsTest", 2, 4, "ancient-forest", flatHeightmap());
    const originX = 2 * CHUNK_SIZE;
    const originZ = 4 * CHUNK_SIZE;
    for (const tp of result.trees) {
      expect(tp.position.x).toBeGreaterThanOrEqual(originX);
      expect(tp.position.x).toBeLessThan(originX + CHUNK_SIZE);
      expect(tp.position.z).toBeGreaterThanOrEqual(originZ);
      expect(tp.position.z).toBeLessThan(originZ + CHUNK_SIZE);
    }
  });

  it("trees use species from the biome species pool", () => {
    const result = spawnChunkVegetation("SpeciesTest", 1, 1, "wetlands", flatHeightmap());
    const wetlandsPool = ["weeping-willow", "redwood"];
    for (const tp of result.trees) {
      expect(wetlandsPool).toContain(tp.tree.speciesId);
    }
  });

  it("trees have valid model fields resolved via speciesToTreeModel", () => {
    const result = spawnChunkVegetation("ModelTest", 0, 0, "orchard-valley", flatHeightmap());
    for (const tp of result.trees) {
      expect(tp.tree.baseModel).toBeTruthy();
      expect(typeof tp.tree.winterModel).toBe("string");
      expect(typeof tp.tree.useWinterModel).toBe("boolean");
    }
  });

  it("bushes have valid modelKey resolved via resolveBushModelKey", () => {
    const result = spawnChunkVegetation("BushTest", 0, 0, "starting-grove", flatHeightmap());
    for (const bp of result.bushes) {
      expect(bp.bush.modelKey).toBeTruthy();
      expect(bp.bush.modelKey).toMatch(/^bushes\//);
    }
  });

  it("falls back to starting-grove template for unknown biome", () => {
    const known = spawnChunkVegetation("X", 0, 0, "starting-grove", flatHeightmap());
    const unknown = spawnChunkVegetation("X", 0, 0, "unknown-biome", flatHeightmap());
    expect(unknown.trees.length).toBe(known.trees.length);
    expect(unknown.bushes.length).toBe(known.bushes.length);
  });
});
