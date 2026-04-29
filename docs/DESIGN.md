---
title: Grovekeeper — Game Design
updated: 2026-04-29
status: current
domain: product
---

# Grovekeeper — Game Design

This document describes *what the game IS*. The technical implementation
of these mechanics lives in `ARCHITECTURE.md`.

---

## Identity

You are **The Gardener** — singular, mythic, the only one. There is no
guild of Gardeners, no Gardener academy. There is *you*, alone, walking
through a world that holds groves, and the world remembers when you tend
them.

The tagline is *"Every forest begins with a single seed."*

The tone is **warm reverence**, not cute. The game leans into the contrast
between an open, sometimes hostile world and the small glowing pockets of
peace you can claim out of it. It is mobile-first, portrait, designed for
3–15-minute sessions on a phone, and works on desktop as a graceful
enhancement.

You see the world through your own eyes — first-person. There is no
player character visible in the world. You are the camera.

---

## The two-mode design

The entire emotional architecture is one tonal contrast played on a loop:

- **Outer world.** Infinite, biome-typed, procedurally chunk-streamed.
  Each biome has its own voxel palette, flora, fauna, weather, hostile
  creatures, and ambient audio. The wild is dangerous but not cruel.
  Light combat. No death — running out of stamina retreats you home.
  **Encounters only begin after you've crafted your first weapon.** Until
  then the wilderness is alive but not actively threatening.
- **Grove.** The special, fourth biome. Always glowing. Always peaceful.
  Always unmistakably different on sight. Inside a grove, nothing can hurt
  you. The Grove Spirit is present — a voxel presence of impossible
  materials — but does not speak. The silence is the peace.

The contrast is the design.

---

## The meta-loop

Eight verbs, in order, repeating forever:

1. **Discover.** Find the first grove, by following its glow.
2. **Gather.** Pick up materials. Note their traits.
3. **Combine.** Put materials together. See what names emerge.
4. **Craft weapon.** The first named weapon flips the encounter gate.
5. **Claim.** Craft a hearth, place it, light it. Grove becomes yours.
6. **Build.** Place crafted structures in your groves.
7. **Wander.** Step back into the wild with a weapon.
8. **Fight, gather, repeat.** New biomes, new materials, new compounds.

The tutorial is the first turn through this loop, taught entirely by the
world. No modal popups. No on-screen arrows. The Tracery narrator speaks
in your head.

---

## The narrator (Tracery)

The narrator is first-person. They are you — a version of you that
notices things and writes them down.

On first picking up a rock: *"Hard. Short. Useful, maybe."*
On combining rock + stick: *"You snap the rock against the stick. Oh.
It stays. You call it a Spear. Why not."*
On the first encounter: *"Something moved in the meadow. You notice
you're holding your Spear."*

Three registers:
- **Neutral** — observed and noted.
- **Impressed** — something unexpected.
- **Baffled** — makes no sense yet.

Narrator entries append to a **Journal** (PauseMenu → Journal tab). The
journal is not a quest log. It is prose. It is the hint system. It connects
dots: *"The softened stick and the Spear. Oh. OH. That's what the wet
stick was for."*

**Half-discovery hints:** if the player has item A but is missing item B
from a known compound structure: *"Your arm keeps reaching for something
that isn't there."*

---

## The outer world

### Biomes

**Three wilderness biomes (Meadow, Forest, Coast) + the Grove.** Locked
by asset inventory.

| Biome | Tonal note | Materials |
|---|---|---|
| Meadow | warm, open, golden | stone, oak-wood, clay, daisies |
| Forest | green, dappled, breathing | pine-wood, bark, mushroom, fern |
| Coast | sand, foam, sea-blue | driftwood, shell, kelp, sandstone |

Each biome:

- PNG voxel tileset (terrain blocks).
- Material set with trait assignments (stone → `hard, short`; kelp →
  `long, soft, wet`; etc.).
- Flora table (block-placed vegetation).
- Peaceful + hostile fauna (voxel assemblies; creatures drop the block
  types they're made of).
- Weather variant.
- Ambient audio bed + music bed.
- Hearth style (timber-cottage / log-lodge / driftwood-shack).

### Encounters

Encounters activate only after the first named weapon is crafted.
Triggered by biome + time-of-day weight + movement dice. Hostile
creatures have simple state machines (idle / chase / attack / flee).

No death. Out-of-stamina or out-of-HP triggers retreat — screen fades,
player appears at nearest claimed grove, stamina restores.

### Resource gathering

Materials are picked up from the world (or knocked loose from terrain
blocks by swinging). Each material type has a fixed trait set. Carry
cap is cozy (not punishing).

### Material decompositional harvesting

Creatures are assembled from voxel blocks. Defeating a creature yields
the block types it was made of. A coast crab drops shell-block and
kelp-strand. A meadow wolf drops grey-stone-block and dark-stone-block.
The material language is consistent: what you see is what you get.

---

## The compound trait system

Materials have traits (bitmask). Combining two materials unions their
traits. When the combined set matches a compound rule, the result is
named.

First discovery: narrator fires (impressed register); entry appended
to journal; compound name persists in save.

After discovery: the player can craft the compound by name directly
(shown in the crafting surface's known-compounds list).

**Durability:** crafted items have finite use counts. A pointy-rock
has 3. A spear has 12. A steel axe has 50.

**Time transforms:** some materials transform with time (wet stick →
soft stick after 60s game-time). Campfire proximity applies `burning`
trait as a context, not a consumed ingredient.

---

## The grove

### Visual signature

Always luminous green-gold. Flowering grasses, blossom trees, a single
great central tree. Rabbits hop, butterflies drift, fireflies at dusk.
Every grove looks like a grove — unmistakable.

### Three states

1. **Undiscovered.** In the world's PRNG but not in the save. Only visible
   by walking near it (the glow draws the eye).
2. **Discovered.** Player has entered the grove chunk. Marker on map.
   Building disabled. Fast travel disabled.
3. **Claimed.** Player has lit a Hearth. Building enabled. Fast travel
   enabled. Grove Spirit's glow intensifies. 1–4 villagers move in.

### The Grove Spirit

One per grove. A voxel assembly of impossible grove-only materials:
bioluminescent vine-block (emissive pale green), heartwood-block (deep
amber), spore-block (semi-transparent, drifts upward). These materials
do not appear in any compound table. They cannot be harvested.

The Spirit oscillates gently (upper half on a sin-wave layer translation).
It does not speak. It is a **presence**.

### Villagers

1–4 per claimed grove. Simple voxel assemblies (4 blocks). They wander,
idle, and turn toward the player. No phrase pools. No quest system. The
reward for talking (approaching) is their existence — they're here
because you claimed this grove.

### Hearth + claim ritual

1. Craft a hearth blueprint at the flat-rock workbench inside the grove.
2. Place it (player chooses the spot — first act of authorship).
3. Light it (single interact). Cinematic: flame ignites, grove glow
   intensifies, Spirit's glow ramps, fast-travel UI unlocks for this
   grove, villagers begin entering. Save writes.

After claiming, the player arms themselves (use the crafting surface
to upgrade or craft new compounds) and walks back into the wilderness.

---

## Spawn model (first-grove flow)

1. Player spawns in wilderness — outside the first grove, ~30 voxels
   from its edge. Encounters are off.
2. First grove is always within sight-line distance (~32 voxels), always
   in the +X direction from spawn for the starter seed.
3. Gathering and combining happen naturally before reaching the grove
   (rocks and sticks are near spawn).
4. First compound naming happens whenever it happens — no scripted timing.
5. Walking into the grove triggers discovery. The Spirit is present.
6. First named weapon → encounter gate flips → audio sting → narrator
   notes the change.
7. Hearth chain unlocks after first weapon.
8. Claim. Then: the loop is yours.

---

## Crafting + building

One surface. One mental model.

- **Flat-rock workbench** — primitive station in every grove. Shows
  the known-compounds list.
- **Combining** — inventory action (no station needed) resolves trait
  compounds.
- **Placement** — blueprints go into the place-able list; ghost preview
  in world; commit with `place` action.
- **Building** — placing crafted structures in claimed groves. Free-form
  voxel building.

The tech tree expands as content post-pivot. RC shipped a scope-locked
recipe set; the compound system makes extension natural.

---

## Fast travel

Claimed groves are nodes on the fast-travel map. Selecting a node
teleports the player to that grove's edge. Only from/to claimed groves;
not wilderness-to-wilderness. Blocked during active combat.

---

## What the game is not

- Not a quest game. No NPC goals.
- Not a death game. Retreat is the worst outcome.
- Not a permadeath game. No difficulty tiers.
- Not a collection meta-game. No 8-spirit arc.
- Not a survival sim. No hunger, no decay, no freeze death.
- Not a third-person game. First-person view.

## What rewards the player

- **The build.** What you place in your groves stays.
- **The network.** Every claimed grove adds a map node.
- **Discovery.** The narrator's reaction to every new compound.
- **The contrast.** Coming home to a grove's glow after a wilderness leg.

That is the entire reward system. It is enough.
