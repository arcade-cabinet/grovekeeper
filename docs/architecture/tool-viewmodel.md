# Tool View Model

> **STATUS (2026-03-07):** This document is current and aligned with the unified design. Note: tool upgrade tiers (Basic/Iron/Grovekeeper) add visual changes per tier -- see `docs/plans/2026-03-07-unified-game-design.md` Section 6 for upgrade visuals (metal head for Iron, glowing vine-wrapped handle for Grovekeeper tier).

## Principle

A 3D model of the currently held tool, rendered in camera space (parented to camera, high render order). This is the player's primary visual feedback for what they're holding.

## GLB Models

Every held tool MUST have a GLB model. No placeholders. No fallbacks. If a tool has no model, it hard-errors at load time. See `assets/models/tools/README.md` for the full inventory.

Available in `assets/models/tools/`:

| Game Tool | GLB Model | Action |
|-----------|-----------|--------|
| trowel | Hoe.glb | Planting, tilling |
| axe | Axe.glb | Chopping, harvesting timber |
| pruning-shears | Hatchet.glb | Pruning, shaping |
| shovel | Shovel.glb | Digging, clearing |
| pickaxe | Pickaxe.glb | Mining rocks, clearing stone |

Tools without models (watering-can, seed-pouch, almanac, etc.) need GLBs sourced before they can appear in-game. Until then, they are excluded from the tool belt.

All GLBs share `Tools_Texture.png` (128x128, PSX pixel interpolation).

## Per-Tool Visual Config

Defined in `config/game/toolVisuals.json`:

```json
{
  "trowel": {
    "modelKey": "Hoe",
    "offset": [0.35, -0.3, -0.5],
    "scale": 0.4,
    "modelRotation": [0, 0, 0],
    "useAnimation": "stab",
    "useDuration": 0.4
  }
}
```

## Use Animations

Keyframe-driven in the per-frame loop (parametric curves, not AnimationMixer).

| Animation | Motion | Tools |
|-----------|--------|-------|
| stab | Quick forward thrust, spring back | Trowel |
| tilt | Rotate forward to pour, return upright | Watering Can |
| chop | Arc overhead then strike down, spring back | Axe |
| dig | Push down into ground, lever up, return | Shovel |
| snip | Quick squeeze motion (scale X briefly) | Pruning Shears |
| spread | Tilt and sweep side to side | Compost Bin, Fertilizer Spreader |
| flip | Open book motion (rotate around Y) | Almanac |
| place | Lower to ground, release, rise | Rain Catcher, Scarecrow |

## Tool Switch Animation

1. Current tool drops down (0.25s lerp)
2. Swap mesh reference
3. New tool rises up (0.25s lerp)

## Interaction Model

Every frame, raycast from camera center into the scene:

1. Hit detection: ground tile, tree, NPC, structure, or nothing
2. Range check per tool category:
   - Hand tools: 3.0 units (trowel, shears, watering can)
   - Long tools: 4.0 units (axe, shovel)
   - Placement: 5.0 units (rain catcher, scarecrow)
   - Inspection: 6.0 units (almanac)
3. Context display below crosshair: `[target name] / [action] -- [stamina cost]`
4. On USE press: check compatibility + range + stamina, play animation, execute action

## File

`components/player/ToolViewModel.tsx`
