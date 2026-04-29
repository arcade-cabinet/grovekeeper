/**
 * BiomeTilesetLoader — resolves a biome's PNG path against
 * `import.meta.env.BASE_URL` so the same code works under `vite dev`,
 * GitHub Pages, and Capacitor `file://`. Mirrors voxel-realms'
 * `tilesetBaseUrl()` helper in `terrain-behavior.ts`.
 *
 * Caches loaded biome ids per renderer instance so calling
 * `loadBiomeTileset` twice for the same biome on the same renderer is
 * a no-op. (TilesetManager itself is also idempotent on duplicate ids,
 * so the cache is just an early-exit — semantics are identical.)
 */

import type { TilesetDefinition } from "@jolly-pixel/voxel.renderer";
import type { BiomeDefinition, BiomeId } from "./biomes";
import { getBiome } from "./biomes";

/** Resolves the project base URL with a guaranteed trailing slash. */
function tilesetBaseUrl(): string {
  const base =
    typeof import.meta !== "undefined" && import.meta.env?.BASE_URL
      ? import.meta.env.BASE_URL
      : "/";
  return base.endsWith("/") ? base : `${base}/`;
}

/**
 * Build the `TilesetDefinition` the renderer needs for a biome. Public
 * so tests can assert on the URL/id without spinning up a real
 * renderer.
 */
export function biomeTilesetDefinition(
  biome: BiomeDefinition | BiomeId,
): TilesetDefinition {
  const def = typeof biome === "string" ? getBiome(biome) : biome;
  return {
    id: def.id,
    src: `${tilesetBaseUrl()}${def.tilesetPath}`,
    tileSize: 32,
  };
}

/** Renderer-keyed cache of "tilesets we've already asked to load". */
const loadedByRenderer = new WeakMap<object, Set<BiomeId>>();

/**
 * Load a biome tileset onto a renderer. Returns immediately if the same
 * biome was previously loaded onto the same renderer instance.
 */
export async function loadBiomeTileset(
  renderer: { loadTileset(def: TilesetDefinition): Promise<void> },
  biome: BiomeDefinition | BiomeId,
): Promise<void> {
  const def = typeof biome === "string" ? getBiome(biome) : biome;
  let loaded = loadedByRenderer.get(renderer);
  if (!loaded) {
    loaded = new Set();
    loadedByRenderer.set(renderer, loaded);
  }
  if (loaded.has(def.id)) return;
  await renderer.loadTileset(biomeTilesetDefinition(def));
  loaded.add(def.id);
}

/** Test-only: drop a renderer's cached set so reloads can be observed. */
export function _resetBiomeTilesetCacheFor(renderer: object): void {
  loadedByRenderer.delete(renderer);
}
