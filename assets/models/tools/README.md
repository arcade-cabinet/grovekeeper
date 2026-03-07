# Tool Models

PSX-style low-poly tool models for the first-person ToolViewModel.

## Source

PS1 Style Tools pack from `/Volumes/home/assets/3DPSX/Props/Tools/`.
Converted to GLB via Blender 5.0.1 batch script.

## Assets

| Model | File | Verts | Faces | Size | Game Tool Mapping |
|-------|------|-------|-------|------|-------------------|
| Axe | Axe.glb | 56 | 24 | 13 KB | axe (chopping) |
| Hatchet | Hatchet.glb | 56 | 24 | 13 KB | pruning-shears (alt model) |
| Hoe | Hoe.glb | 70 | 30 | 13 KB | trowel (planting/digging) |
| Pickaxe | Pickaxe.glb | 94 | 40 | 14 KB | shovel (alt model) |
| Shovel | Shovel.glb | 127 | 63 | 15 KB | shovel (digging) |

All models share `Tools_Texture.png` (128x128px, PSX pixel interpolation).

## Tool Mapping

Every tool that exists in the game MUST have a GLB model. No placeholders, no fallbacks. If a tool has no model, it hard-errors — this forces us to either source the model or remove the tool from the game.

The 5 available GLBs map to the core tool actions:

| Game Tool | GLB Model | Action |
|-----------|-----------|--------|
| trowel | Hoe.glb | Planting seeds, tilling soil |
| axe | Axe.glb | Chopping trees, harvesting timber |
| pruning-shears | Hatchet.glb | Pruning branches, shaping growth |
| shovel | Shovel.glb | Digging, clearing, transplanting |
| pickaxe | Pickaxe.glb | Mining rocks, clearing stone tiles |

### Tools that need models sourced (or get cut from the game)

| Game Tool | Status | Resolution |
|-----------|--------|------------|
| watering-can | NO MODEL | Source from asset library or Blender |
| seed-pouch | NO MODEL | Source or cut (merge into trowel action) |
| almanac | NO MODEL | Source or make it UI-only (no 3D model needed) |
| compost-bin | NO MODEL | Source or cut |
| rain-catcher | NO MODEL | Source or cut (structure, not hand tool) |
| fertilizer-spreader | NO MODEL | Source or cut |
| scarecrow | NO MODEL | Source or cut (structure, not hand tool) |
| grafting-tool | NO MODEL | Source or cut |

### Rule: NO PLACEHOLDERS

Do NOT create colored box fallbacks. If a tool appears in the player's hand, it MUST be a real GLB model. Placeholder boxes mask incomplete work and prevent us from knowing what's actually finished.
