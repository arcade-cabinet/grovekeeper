# Composite GLBs Needing Blender Split

These GLBs contain multiple meshes packed into a single file. They must be split in Blender before use in the game.

## Priority 1: Village Buildings

- **Source:** `/Volumes/home/assets/3DPSX/Fantasy/Village Buildings/Buildings.glb`
- **Size:** 4.0 MB
- **Expected meshes:** Individual building models (houses, shops, inn, church, etc.)
- **Target:** `assets/models/buildings/village/`
- **Notes:** Already referenced in MEMORY.md as needing split. High priority for procedural village generation.

## Priority 2: Villager NPCs

- **Source:** `/Volumes/home/assets/3DPSX/Fantasy/Villager NPCs/Villager_NPCs.glb`
- **Size:** 3.8 MB
- **Expected meshes:** Individual villager character models
- **Target:** `assets/models/npcs/villagers/`
- **Notes:** ChibiCharacter pack is preferred for main NPCs. These villagers supplement as background/crowd NPCs.

## Priority 3: MEGA Nature Pack

- **Source:** `/Volumes/home/assets/3DPSX/Fantasy/PSX MEGA Nature Pack/Mega_Nature.glb`
- **Size:** 231 KB (small -- may be a single combined mesh)
- **Target:** `assets/models/props/nature/`
- **Notes:** Small file size suggests fewer meshes. May contain trees, rocks, bushes combined.

## Priority 4: Skeleton Warrior All

- **Source:** `/Volumes/home/assets/3DPSX/Fantasy/PSX Dungeon Skeleton Warrior/All.glb`
- **Size:** 1.6 MB
- **Expected meshes:** Skeleton warrior + loose bones + weapon variants combined
- **Target:** `assets/models/enemies/`
- **Notes:** Individual `Skeleton_warrior.glb` (1.3 MB) and `loose_bones.glb` (189 KB) already copied. This "All" file likely duplicates them.

## Blender Split Workflow

```bash
BLENDER=/opt/homebrew/bin/blender

# 1. Open GLB in Blender headless, list all root objects
$BLENDER --background --python-expr "
import bpy
bpy.ops.import_scene.gltf(filepath='INPUT.glb')
for obj in bpy.context.scene.objects:
    if obj.parent is None:
        print(f'ROOT: {obj.name} ({obj.type})')
"

# 2. Export each root object as individual GLB
# (Use the batch_convert script or a custom split script)
```
