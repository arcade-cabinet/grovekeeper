import { describe, expect, it, vi } from "vitest";
import {
  _resetBiomeTilesetCacheFor,
  biomeTilesetDefinition,
  loadBiomeTileset,
} from "./BiomeTilesetLoader";
import { BIOME_IDS, getBiome } from "./biomes";

describe("biomeTilesetDefinition", () => {
  it("builds a TilesetDefinition for every biome with the right id and PNG path", () => {
    for (const id of BIOME_IDS) {
      const def = biomeTilesetDefinition(id);
      expect(def.id).toBe(id);
      expect(def.tileSize).toBe(32);
      expect(def.src.endsWith(`/assets/tilesets/biomes/${id}.png`)).toBe(
        true,
      );
    }
  });

  it("accepts a BiomeDefinition object directly", () => {
    const meadow = getBiome("meadow");
    const def = biomeTilesetDefinition(meadow);
    expect(def.id).toBe("meadow");
  });
});

describe("loadBiomeTileset", () => {
  it("calls renderer.loadTileset once per biome", async () => {
    const loadTileset = vi.fn().mockResolvedValue(undefined);
    const renderer = { loadTileset };
    await loadBiomeTileset(renderer, "forest");
    expect(loadTileset).toHaveBeenCalledTimes(1);
    const arg = loadTileset.mock.calls[0]?.[0];
    expect(arg?.id).toBe("forest");
  });

  it("is idempotent — calling twice for the same biome only loads once", async () => {
    const loadTileset = vi.fn().mockResolvedValue(undefined);
    const renderer = { loadTileset };
    await loadBiomeTileset(renderer, "coast");
    await loadBiomeTileset(renderer, "coast");
    expect(loadTileset).toHaveBeenCalledTimes(1);
  });

  it("loads each biome separately when multiple are requested", async () => {
    const loadTileset = vi.fn().mockResolvedValue(undefined);
    const renderer = { loadTileset };
    await loadBiomeTileset(renderer, "meadow");
    await loadBiomeTileset(renderer, "grove");
    expect(loadTileset).toHaveBeenCalledTimes(2);
    const ids = loadTileset.mock.calls.map((c) => c[0]?.id);
    expect(ids).toEqual(["meadow", "grove"]);
  });

  it("the per-renderer cache is independent", async () => {
    const loadA = vi.fn().mockResolvedValue(undefined);
    const loadB = vi.fn().mockResolvedValue(undefined);
    const rendererA = { loadTileset: loadA };
    const rendererB = { loadTileset: loadB };
    await loadBiomeTileset(rendererA, "meadow");
    await loadBiomeTileset(rendererB, "meadow");
    expect(loadA).toHaveBeenCalledTimes(1);
    expect(loadB).toHaveBeenCalledTimes(1);
  });

  it("reset helper drops the cache so subsequent calls reload", async () => {
    const loadTileset = vi.fn().mockResolvedValue(undefined);
    const renderer = { loadTileset };
    await loadBiomeTileset(renderer, "meadow");
    _resetBiomeTilesetCacheFor(renderer);
    await loadBiomeTileset(renderer, "meadow");
    expect(loadTileset).toHaveBeenCalledTimes(2);
  });
});
