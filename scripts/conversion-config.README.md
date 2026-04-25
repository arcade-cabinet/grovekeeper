---
title: DAE to GLB Conversion Config
updated: 2026-04-24
status: current
domain: ops
---

# DAE → GLB conversion (Wave 3b)

This is the Wave 3b sub-pipeline: convert curated DAE files from
`raw-assets/extracted/` into GLBs in `raw-assets/converted/`, preserving
animation tracks. The downstream **Wave 3 asset pipeline** consumes the converted
GLBs via `scripts/asset-curation.json` and copies them into
`public/assets/models/...` for the runtime.

## Scripts

| Script | Purpose |
|---|---|
| `scripts/convert-dae-to-glb.mjs` | Batch converter. Reads `conversion-config.json`, picks Blender (preferred) or assimp, converts each entry, mirrors directory structure under `raw-assets/converted/`. Idempotent. |
| `scripts/sample-animations.mjs` | Diagnostic. Prints animation clip names + frame ranges for any DAE/GLB/dir. |
| `scripts/blender/dae-to-glb.py` | Invoked headless by the converter. Imports DAE, promotes active actions to NLA strips, exports GLB with `export_animations=True`. |
| `scripts/blender/sample-animations.py` | Invoked headless by the sampler. Reports actions, frame ranges, NLA strips, armatures, skinned meshes. |

## Path convention

Source: `raw-assets/extracted/{pack-id}/.../{character-or-creature}.dae`
Dest:   `raw-assets/converted/{pack-id}/.../{character-or-creature}.glb`

Directory structure mirrors source exactly with `.dae` → `.glb`. Whitespace and
mixed-case names (e.g. `Beekeeer Upload/Dae Files/Beekeeper.dae`) are preserved
in the output path. The asset pipeline's curation map references the converted
paths verbatim.

## Commands

```bash
# Sample animations on a single DAE or directory
pnpm assets:sample raw-assets/extracted/voxel-forest-animals-pack/Wolf

# Run the batch conversion (Blender or assimp must be installed)
pnpm assets:convert
```

## Config format

`scripts/conversion-config.json` shape:

```jsonc
{
  "sourceRoot": "raw-assets/extracted",
  "destRoot":   "raw-assets/converted",
  "entries": [
    { "_role": "Wolf idle", "src": "voxel-forest-animals-pack/Wolf/Dae Files/Wolf Idle.dae" },
    ...
  ]
}
```

`_role` is a free-form note; the converter only reads `src`.

## Constraints

- ESM only (`.mjs`).
- `node:child_process` `execFile` (NOT `exec`) for safety.
- Idempotent: skips files where source mtime ≤ dest mtime.
- Per-file failures are logged but do not abort the batch.
- DAEs with no animation export as static GLB with a warning.
- DAEs with multiple actions / NLA tracks export every track.

## Converter selection

1. **Blender CLI** (preferred *if available*): `/opt/homebrew/bin/blender --background --python scripts/blender/dae-to-glb.py`. Best animation handling — NLA-aware multi-clip export. **Note:** Blender 5.x dropped its built-in `collada_import` operator (verified 2026-04-24 with Blender 5.1.1) and ships no replacement addon. The detector probes `bpy.ops.wm.collada_import` before selecting Blender; on Blender 5.x it falls through to assimp.
2. **assimp CLI** (actual primary path on this machine): `assimp export <input.dae> <output.glb>`. Assimp 6.x preserves rig animations and writes valid binary GLB. Per-clip DAE → single-animation GLB matches the Chaos-Slice voxel pack convention (one clip per file: `Wolf Idle.dae`, `Wolf Walk.dae`, etc.) which `ModelRenderer` expects.

The converter prints which one it picked at startup. Spot-check verification: `Beekeeper.dae` (34 animation nodes in source) → `beekeeper.glb` with 1 animation, 99 channels (all bone tracks preserved).
