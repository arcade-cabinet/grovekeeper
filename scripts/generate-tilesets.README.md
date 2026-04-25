---
title: Procedural Tileset Generator
updated: 2026-04-24
status: current
domain: technical
---

# Procedural Tileset Generator

Generates per-biome and structures PNG atlases consumed by `@jolly-pixel/voxel.renderer`'s
`loadTileset({ id, src, tileSize })`.

Run:

```bash
pnpm assets:tilesets
# or as part of the full pipeline:
pnpm assets:all
```

Outputs:

```
public/assets/tilesets/
  biomes/
    meadow.png    meadow.json
    forest.png    forest.json
    coast.png     coast.json
    grove.png     grove.json
  structures/
    common.png    common.json
    hearth.png    hearth.json
```

JSON shape (matches `@jolly-pixel/voxel.renderer`'s `TileRef = { col, row, tilesetId? }`):

```json
{
  "tileSize": 32,
  "atlas": { "cols": 8, "rows": 8, "width": 256, "height": 256 },
  "tiles": {
    "grass-flat": { "col": 0, "row": 0 },
    "grass-tall": { "col": 1, "row": 0 }
  }
}
```

## Why procedural

RC-defining choice: **option 4 (programmatic generator)** from the wave plan. Rationale:
- Hand-authored pixel art is the eventual goal but blocks RC by requiring an artist pass.
- Existing voxel packs in `raw-assets/` were not consistently tile-able.
- Programmatic generation is deterministic (seeded RNG), tunable per-palette, and fully scriptable.

A polish pass post-RC can replace specific tiles with hand-authored PNGs by overriding the
generator with an early-out for that tile id (see "Replacing a tile" below).

## Determinism

Every tile uses a per-tile sub-RNG seeded with
`${rngSeed}::${seedSuffix}::${tile.id}` (mulberry32 over a FNV-1a-hashed string).
Re-running the generator produces byte-identical PNGs and JSON.

`rngSeed` lives in `scripts/tileset-config.json` — bump it to force a re-roll of all tiles.

## Adding a new tile

1. Pick a biome or structures group in `scripts/tileset-config.json`.
2. Append `{ "id": "<name>", "kind": "<ground|foliage|structure>", "noise": "<algo>" }`
   to its `tiles` array. Keep array length under `atlasGrid.cols * atlasGrid.rows` (default 64).
3. Re-run `pnpm assets:tilesets`.

## Adding a new noise algorithm

Add a function `(palette, tileSize, rng) => Uint8Array` to `TILE_DRAWERS` in
`scripts/generate-tilesets.mjs`. Then reference its name from any tile's `noise` field.

`palette` keys: `primary`, `secondary`, `accent`, `deep`, `highlight`, `shadow`, `wet`, `dry`.

## Replacing a tile with hand-authored art

Eventually we want hand-authored variants for hero tiles (grass-flat, hearth-coals).
Approach: keep the PNG composition step the same but blit a hand-authored PNG into the
tile slot instead of running the algorithm. Sketch:

```js
if (tile.handAuthored) {
  const hand = await sharp(handPath).resize(tileSize, tileSize, { kernel: "nearest" })
    .raw().toBuffer({ resolveWithObject: true });
  data = new Uint8Array(hand.data);
}
```

Add `"handAuthored": "raw-assets/hand/grass-flat.png"` to the tile config. Tiles co-exist
naturally: per-tile sub-RNG isn't consumed if the data comes from disk, but slot positions
remain stable because we use the array index as `(col, row)`.

## Total atlas weight

Target: under 200 KB combined. Console output prints per-atlas + total bytes.
