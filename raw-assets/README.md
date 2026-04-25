---
title: Raw Assets
updated: 2026-04-24
status: current
domain: ops
---

# raw-assets/

Local-only working tree for asset pipeline source files. **Never committed** — re-fetched on demand.

## Layout

```
raw-assets/
├── archives/       # Downloaded itch.io zip files (one per pack)
└── extracted/      # Unzipped pack contents (one directory per pack)
```

Both subdirectories are gitignored (see `.gitignore`). The `raw-assets/.gitkeep` exists
solely so pipeline scripts can rely on the directory being present after a fresh clone.

## How content gets here

Two complementary scripts populate `extracted/`:

| Script | Purpose |
|--------|---------|
| `pnpm assets:fetch` (`scripts/fetch-itch.mjs`) | Downloads packs in `scripts/itch-packs.json` from itch.io into `archives/`, then unzips into `extracted/`. Requires `ITCH_API_KEY` in `.env`. |
| `pnpm assets:import` (`scripts/import-from-voxel-realms.mjs`) | Bootstraps from a sibling `voxel-realms/raw-assets/extracted/` checkout. Skips packs already present. Override the source root via `VOXEL_REALMS_PATH=/path/to/voxel-realms`. |

Both scripts are idempotent — safe to re-run.

## Then what?

Curate into `public/assets/` via:

```bash
pnpm assets:curate     # copies a curated subset per scripts/asset-curation.json
pnpm assets:manifest   # generates src/assets/manifest.generated.ts
```

`public/assets/` IS committed (it ships with the game). `raw-assets/` is not.

## Reference

- Curation map: `scripts/asset-curation.json`
- Source-of-truth inventory: `docs/asset-inventory.md`
- Wave 3 spec: `docs/superpowers/specs/2026-04-24-grovekeeper-rc-redesign-design.md`
