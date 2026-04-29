---
title: Grovekeeper — Post-Pivot Parking Lot
updated: 2026-04-29
status: current
domain: context
---

# Grovekeeper — Post-Pivot

Things explicitly **deferred** from the voxel pivot scope that may
return as content or engine work. These are not commitments.

> **Note:** The "8-spirit collection meta arc" from older specs is
> permanently retired. It contradicts the design. The game is about
> what you build, not what you collect.

---

## Deferred content

### More creatures per biome
Each wilderness biome currently has one peaceful type and one hostile
type. Adding variety (rabbits + deer + foxes in Meadow; owls + squirrels
in Forest; crabs + gulls in Coast) improves the feeling that the wild is
alive. Each creature is a small voxel assembly — cost is low per type.

### More compound recipes
The pivot ships a scope-locked compound table. Post-pivot content
additions are recipe expansions: new biome-specific materials → new
compounds. Examples:
- Coast: kelp + shell → fishing net; shell + flint → blade
- Forest: bark strip + vine → rope; pine-resin + wick → torch
- Meadow: clay + fire → pottery; grass-seed + earth → garden plot

### Biome-specific crafting stations
The pivot ships a single "flat-rock workbench." Post-pivot:
- Coast: salt-press (preserved goods recipes)
- Forest: carpenter's bench (joined timber structures)
- Meadow: clay kiln (fired pottery, brick)

These stations are themselves crafted compounds; placing them in a
claimed grove is the reason to claim multiple groves.

### Seasonal events
A game-time seasonal cycle (day/night exists; seasons would be longer).
Each season changes flora, fauna weights, and weather probabilities.
Summer: fireflies; Autumn: falling-leaf particle layer; Winter: snow
tileset overlay; Spring: blossom burst.

### Music expansion
One music bed per biome at pivot scope. Post-pivot: time-of-day variants
(dawn/day/dusk/night), weather variants (rain bed, storm bed), and
additional moment stings (second grove discovery, first combat win,
first compound-chain completion).

---

## Deferred wilderness biomes

RC locked three wilderness biomes. Each deferred biome needs asset work
before it can ship.

- **Wetland.** Needs: water-surface shader (refraction, ripple), wetland
  fauna pack, reed/lily/willow flora set, stilt-hut hearth prefab, wetland
  ambient + music.
- **Alpine.** Needs: snow + ice tilesets, snow-footstep SFX, snow-fall
  particle layer, blizzard weather variant, alpine fauna pack, spruce/
  snow-flower flora, stone-cabin hearth prefab.
- **Scrub.** Needs: cozy-tone scrub fauna pack, cactus/sage/juniper flora,
  dust-storm weather variant, dust-footstep SFX, scorpion creature type,
  adobe hearth prefab.

Each biome is a content addition, not engine work. The engine handles
biomes generically.

---

## Deferred engine work

- **Greedy meshing** in voxel.renderer — perf optimization for dense
  chunks. Mitigation is tunable chunk radius.
- **VoxelRenderer shader plumbing** — the grove glow currently uses
  custom shader passes owned locally. Contributing upstream would be
  cleaner.
- **Per-creature VoxelWorld performance** — each creature has its own
  VoxelRenderer to isolate dirty-marking. If creature counts scale up,
  a shared "entity world" with careful dirty management may be needed.

---

## Permanently cut

- **8-spirit collection meta arc.** Contradicts the design frame.
  The game is about what you build, not what you collect. Tombstoned.
- **Quest log, fetch chains, escort missions.** No NPC goals. Ever.
- **Permadeath / difficulty tiers.** Out-of-HP retreats you home.
  That's the worst outcome. Difficulty is not a feature of this game.
- **Multiplayer.** Post-pivot, if ever.
- **Cosmetics, prestige, skins.** Post-pivot content, not pivot scope.
