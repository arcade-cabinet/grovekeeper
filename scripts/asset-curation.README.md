---
title: Asset Curation Map Conventions
updated: 2026-04-24
status: current
domain: ops
---

# `scripts/asset-curation.json` conventions

Human-edited map from `raw-assets/extracted/...` source paths to `public/assets/...`
destination paths. `scripts/curate-assets.mjs` reads it; nothing generates it.

## Schema

Top-level keys: `models`, `audio`. Each is an array of entries:

```jsonc
{
  "source": "raw-assets/extracted/<pack>/<path>",
  "dest":   "public/assets/<category>/<subpath>",
  "category": "model" | "model_dir" | "audio" | "audio_dir",
  "biome":  "meadow" | "forest" | "coast" | "grove" | "all" | "ui" | "menu"
}
```

- `category: "model"` / `"audio"` — single file copy. `dest` is a file path.
- `category: "model_dir"` / `"audio_dir"` — directory copy. `dest` ends in `/`. Every file inside the source directory copies into the destination directory.

All paths are **relative to the repo root** (`grovekeeper/`).

## Comments / TODOs

JSON has no comment syntax. Use these reserved keys, which the script ignores at runtime:

- `_comment` — top-level pack documentation
- `_NOTE` — per-entry rationale (kept long-term)
- `_TODO` — per-entry placeholder needing human resolution. The curate script logs every `_TODO` it encounters so we can track them.

A `_TODO` entry still copies its source if both `source` and `dest` are present — the TODO marks "this choice is provisional" rather than "skip this entry."

## Adding a new entry

1. Pick a source file in `raw-assets/extracted/`. Verify it exists locally (run `pnpm assets:import` first if missing).
2. Choose a `dest` under `public/assets/`. Group by domain — `models/{characters,npcs,creatures,props}/`, `audio/{music,sfx,ambient}/`.
3. Pick the right `category`. Use `_dir` variants when you need every file in a folder, single-file otherwise.
4. Tag the `biome` so the manifest can route assets at runtime.
5. Run `pnpm assets:curate && pnpm assets:manifest`. Both are idempotent.

## When sources don't exist yet

Some sources are produced by parallel waves (Wave 3b for DAE→GLB, Wave 3c for tilesets). The curate script logs `MISSING SOURCE` and continues; once those waves land, the next curate run picks up the new files.

## Forbidden

- Symlinks. We always copy.
- Hand-editing files inside `public/assets/`. They get clobbered by curate.
