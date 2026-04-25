/**
 * MeadowTilesetLoader — thin helper around `VoxelRenderer.loadTileset`
 * that resolves the meadow PNG path against `import.meta.env.BASE_URL`
 * (so the same call works under `vite dev`, GitHub Pages, and Capacitor
 * `file://`). Mirrors voxel-realms' `tilesetBaseUrl()` helper in
 * `terrain-behavior.ts`.
 *
 * Intentionally tiny: a single async function rather than a class, so
 * the SingleChunkActor can `await loadMeadowTileset(renderer)` without
 * orchestrating any state of its own.
 */

import type { TilesetDefinition } from "@jolly-pixel/voxel.renderer";
import { MEADOW_TILESET_ID } from "./blockRegistry";

/** Resolves the project base URL with a guaranteed trailing slash. */
function tilesetBaseUrl(): string {
  const base =
    typeof import.meta !== "undefined" && import.meta.env?.BASE_URL
      ? import.meta.env.BASE_URL
      : "/";
  return base.endsWith("/") ? base : `${base}/`;
}

/**
 * Build the `TilesetDefinition` the renderer needs. Public so tests can
 * assert on it without spinning up a real renderer.
 */
export function meadowTilesetDefinition(): TilesetDefinition {
  return {
    id: MEADOW_TILESET_ID,
    src: `${tilesetBaseUrl()}assets/tilesets/biomes/meadow.png`,
    tileSize: 32,
  };
}

/**
 * Load the meadow tileset onto a renderer. The promise resolves once
 * the PNG is decoded and the atlas UV table is built; safe to call
 * multiple times because `TilesetManager` is idempotent on duplicate
 * ids.
 */
export async function loadMeadowTileset(renderer: {
  loadTileset(def: TilesetDefinition): Promise<void>;
}): Promise<void> {
  await renderer.loadTileset(meadowTilesetDefinition());
}
