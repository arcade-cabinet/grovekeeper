---
title: Grovekeeper — Game Design
updated: 2026-04-24
status: current
domain: product
---

# Grovekeeper — Game Design

This document describes *what the game IS*. The technical implementation
of these mechanics lives in `ARCHITECTURE.md`. The full source-of-truth
spec from which both are derived is at
`superpowers/specs/2026-04-24-grovekeeper-rc-redesign-design.md`.

## Identity

You are **The Gardener** — singular, mythic, the only one. There is not a
guild of Gardeners. There is not a Gardener academy. There is *you*, alone,
walking through a world that holds groves, and the world remembers when you
tend them.

The tagline is *"Every forest begins with a single seed."*

The tone is **warm reverence**, not cute. The game leans into the contrast
between an open, sometimes hostile world and the small, glowing pockets of
peace you can claim out of it. It is mobile-first, portrait, designed for
3–15-minute sessions on a phone, and works on desktop as a graceful
enhancement.

## The two-mode design

The entire emotional architecture of the game is one tonal contrast played
on a loop:

- **Outer world.** Infinite, biome-typed, procedurally chunk-streamed. Each
  biome has its own palette, voxel block set, flora, fauna, weather,
  hostile creatures, hazards, and ambient audio bed. The wild is dangerous
  but not cruel. Light combat. No death state — running out of stamina or
  HP teleports you back to your nearest claimed grove.
- **Grove.** The special, fourth biome. Always glowing. Always peaceful.
  Always unmistakable on sight against any wilderness biome it sits inside.
  Soft light, warm gold-green palette, ambient peaceful creatures, NPCs
  with random-pool flavor dialogue, a single Grove Spirit at the center.
  Inside a grove, nothing can hurt you.

The contrast is the design. Walking out of a grove and feeling the audio
shift, the palette shift, the threat tables come online — that's the game
announcing itself. Walking back into a claimed grove after a hard wilderness
leg and feeling all of that lift — that's the reward.

## The meta-loop

Eight verbs, in order, repeating forever:

1. **Gather.** Mine, chop, dig voxel materials in the wild.
2. **Craft.** Inputs in, outputs out. Items (tools, weapons, consumables)
   or place-able blueprints (structural blocks, prefabs, decorative).
3. **Build.** Place blueprints in your claimed groves. Free-form voxel
   building over the grove surface.
4. **Claim.** Find an unclaimed grove. Build, place, and light a Hearth
   inside it. The grove is now part of your fast-travel network.
5. **Arm.** Craft your next weapon, or your next tool tier, in the grove.
6. **Wander.** Step back out into the wild.
7. **Fight.** Resolve encounters with crafted weapons. Stamina-gated.
   Retreat is always an option.
8. **Discover.** Find the next grove. Loop.

The full tutorial is the first turn through this loop, taught diegetically
without modal popups. By the time the player has discovered their second
grove, they have done all eight verbs and have the loop in their head.

## The Gardener (player)

Voxel-chibi character, animated GLB through `@jolly-pixel/engine`'s
`ModelRenderer`. Required animation cycles: idle, walk, run, swing,
place, gather, sit. Third-person follow camera.

Movement is direct:

- **Desktop:** WASD + mouse-look (or just keyboard for accessibility).
- **Mobile:** virtual joystick (`nipplejs`) on the left, contextual action
  buttons on the right. Touch-to-look in any non-UI region.

Rebindable action map: `move`, `interact`, `swing`, `place`, `open-craft`.

There is no tap-to-move pathfinding. Movement is direct against voxel
collision; the path is whatever the player walks.

## The outer world

### Biomes

**Three wilderness biomes (Meadow, Forest, Coast) plus the special Grove biome.** Locked at this size by the Wave 2 asset inventory; Wetland, Alpine, and Scrub were cut and parked in `docs/post-rc.md`.

| Biome | Tonal note | What you find |
|---|---|---|
| Meadow | warm, open, golden | grass, daisies, oak; rabbits, deer, foxes; wolves at dusk |
| Forest | green, dappled, breathing | pine, fern, mushroom; squirrels, owls; bears, falling logs |
| Coast | sand, foam, sea-blue | palm, dune grass, kelp; crabs, gulls, turtles; rogue waves, jellyfish |

Each biome carries:

- A PNG voxel tileset (ground, walls, accents, foliage edges).
- A flora table (what voxel-vegetation populates the chunk).
- A fauna table (peaceful + hostile, weighted by time-of-day and weather).
- A weather variant (e.g. coast squall, forest canopy haze) that overlays
  the global weather system.
- An ambient audio bed (looped via `AudioBackground`).
- A music bed (also looped, crossfaded on biome change).
- A structural style for the **hearth prefab** (timber cottage / log lodge
  / driftwood shack). The hearth style the player crafts is determined by
  the wilderness biome *surrounding* the grove they're claiming — diegetic
  continuity with where they walked in from.

### Encounters

Encounters are biome- and time-of-day-driven. Each biome has an
`EncounterTable` of creatures and weights. Movement + dice + cooldown
triggers a spawn near the player. Hostile creatures have simple state
machines (idle / chase / attack / flee at low health). Peaceful creatures
also spawn — wandering past on their own routines — to signal that the wild
is alive, not just hostile.

### Combat (light)

Tools double as weapons (axe chops trees and wolves; staff harvests bark
and bonks scorpions). Crafted-weapon swings are stamina-gated. The player
has a small HP pool that regenerates inside groves and slowly outside.

**No death.** Running out of stamina or HP triggers a forced retreat — the
screen fades, the player is teleported to their nearest claimed grove, HP
restores. This keeps the cozy spirit while still making wilderness *feel*
dangerous. The player must craft their first weapon *before* their first
wilderness leg, so combat is always armed combat.

### Resource gathering

Voxel blocks are mined / chopped / dug from the outer world. Each biome
has its signature material set. Carry inventory is capped (cozy-tier
limits, not survival-tier punishment). Materials are spent in groves on
hearth, structures, tools, weapons.

### Weather

The existing weather system (rain, drought, windstorm) is preserved and
extended per-biome. Weather is biome-aware and affects encounter tables —
some creatures only spawn in rain, coastal squalls reduce visibility on
beaches, forest weather softens sightlines under canopy.

## The grove

### Visual signature

A grove is **a special, consistent, glowing meadow biome**. Always
luminous green-gold. Always softly humming with ambient audio. Always
visually unmistakable against the wilderness around it. Flowering grasses,
blossom trees, and a single great central tree. Rabbits hop, butterflies
drift, fireflies spawn at dusk.

The Grove biome is *the* signature visual moment of the game. Every grove
looks like a grove. The contrast against the wilderness biome the player
just walked out of is the diegetic announcement of safety.

### Three states

Each grove progresses through three states in a player's save data:

1. **Undiscovered.** Exists in the world's PRNG but not in the save. Not
   on the map. Visible only by walking near it (the glow draws the eye
   from a distance).
2. **Discovered.** Player has entered the grove chunk. Marker added to
   map. Grove Spirit greets the player. Building disabled. Fast-travel
   disabled. The player can hang out, talk to NPCs, watch creatures, but
   cannot yet make it home.
3. **Claimed.** Player has placed and lit a Hearth. Building enabled.
   Fast-travel enabled. Tree planting enabled. Grove Spirit transitions
   from greeter to ambient resident. 1–4 villagers move in over the next
   several seconds.

### The Grove Spirit

One per grove. Voxel character with idle and greet animation cycles. Speaks
**three** scripted lines during the first-claim sequence:

1. On first arrival in the unclaimed starter grove: *"Light a hearth here,
   and this place is yours."*
2. On hearth ignition: a biome-flavored acknowledgement.
3. After ignition, gesturing toward the grove edge: *"Beyond the glow it's
   wild. Take a tool you can swing."*

After the first claim, the spirit is ambient. They idle near the central
tree. They don't give quests. They don't gate progression. They are a
**presence**, not a vendor.

### Villagers (NPCs)

Peaceful, voxel-chibi, animated GLB. 1–4 per claimed grove. They walk, idle,
and talk. Talking pulls one phrase from a small array keyed by **biome ×
tag** (biome flavor, weather flavor, time-of-day flavor, grove flavor).

Phrases live in `src/content/dialogue/phrase-pools.ts`.

**This is the entire NPC system.** No quest log. No fetch tasks. No escort
missions. No goals from NPCs. The reward for talking is the texture, not a
checkbox. The reward for the player's effort overall is *what they build*.

### Ambient creatures

Always peaceful in groves. Rabbits, butterflies, fireflies, the occasional
deer. Deterministic AI on simple wander / flee-from-player-at-distance
routines. No combat against grove creatures.

### The Hearth and the claim ritual

The Hearth is the player's first crafted structure. It is a prefab voxel
structure (4–6 blocks tall, biome-themed in style chosen by the surrounding
wilderness biome) that the player crafts, places, and lights.

Full chain:

1. **Gather** a small starter set of materials in the discovered grove
   itself. The grove generator places a fallen-log pile and a stone cairn
   in the starter grove specifically so the player never has to leave it
   to claim it.
2. **Craft** the Hearth at the **primitive workbench** that the Grove
   Spirit has set up in the starter grove before the player arrives. The
   Hearth recipe is pre-unlocked. Inputs are consumed; the Hearth blueprint
   enters the place-able list.
3. **Place** the Hearth on the grove ground (player chooses the spot — that
   choice is the first act of authorship).
4. **Light** the Hearth (single interaction). Cinematic moment: flame
   ignites, grove glow intensifies, Grove Spirit acknowledges with their
   second line, ambient music swells, the fast-travel UI unlocks for this
   grove (one node — *yours*), and 1–4 villagers begin to enter the grove
   over the next several seconds. The save state writes.

After the claim, the player crafts their **first weapon** at the same
workbench (also pre-unlocked at this point). The weapon is biome-flavored:

| Starter biome | Starter weapon |
|---|---|
| Meadow / Forest | Axe |
| Coast | Spear |

Then the player walks to the grove threshold. The wilderness biome is
visibly different on the other side. A soft chime sounds at the edge —
warning *and* invitation.

This sequence (steps 4–14 of the journey in the spec) is the entire RC
tutorial, and no part of it is a modal popup.

## The crafting + building loop

Crafting is the **production half** of a Minecraft-style production /
consumption loop. Building is the **consumption half**. They share one
surface, one menu, and one mental model.

### One surface

A crafting station, when interacted with, opens a single overlay. That
overlay shows recipes the player has unlocked at *this* station type (a
primitive workbench shows what a primitive workbench can make; a coast
salt-press shows preserved goods; a forest carpenter's bench shows joined
timber structures).
Each recipe has inputs, station type, output, and unlock condition.

The output of a recipe is either an **item** (tool, weapon, consumable —
goes into the inventory) or a **place-able blueprint** (structural block,
prefab, decorative — goes into the place-able list and is dropped into the
world via the building system).

### One mental model

Building is *placing* what crafting produced. There is no "build menu" that
is separate from the "craft menu". The cycle is:

```
material → recipe → output → (item OR placement) → world state changes
```

### Stations and biome economic identity

Crafting stations are themselves crafted and placed. Each grove the player
claims can host its own production setup. Biome-specific stations unlock
biome-specific recipes — coast salt-presses unlock preserved goods,
forest carpenter benches unlock joined timber structures, and so on.
**This is the long-tail reason to claim multiple groves: each one is a
different production capability.**

Recipes are scope-locked to assets in the RC inventory. No recipes for
items without voxel models. No phantom tech tree. The full recipe set
expands post-RC as content additions, not engine work.

## Fast travel

The map UI shows all claimed groves as nodes. Selecting a node fast-travels
the player there.

Rules:

- **Travel from a claimed grove → outer world** spawns the player at the
  grove's edge.
- **Travel from outer world → only to claimed groves**, and only when the
  player is on solid ground and not in an active combat encounter.

The fast-travel network is the long-arc reward of the game. Every grove
claimed adds a node. The map is the visible record of a player's journey.

## The journey (landing → first wilderness)

The game's introduction is treated as one cinematic. Every step is
diegetic; no step is a tutorial popup.

1. **Landing.** Static SVG/CSS Grove vignette in `index.html`, paints in
   under 200ms before JS hydrates. Wordmark and central blossom tree.
2. **Main menu.** Same Grove vignette as living motion. Voxel render of
   the central tree if the engine is up; static SVG fallback if not.
   Buttons: Begin / Continue. No mascot. Tone: warm reverence.
3. **New game.** Single screen: world seed (random by default,
   regenerable), Gardener name. One Begin button. **No difficulty
   selector** — cut from RC.
4. **First spawn — discovered, unclaimed starter grove.** Player wakes
   inside a glowing grove that has not yet been claimed. Grove Spirit at
   center. Primitive workbench placed. Fallen-log pile and stone cairn
   visible. Daytime, calm music. Spirit speaks: *"Light a hearth here, and
   this place is yours."*
5. **Diegetic move teaching.** Spirit gestures toward the log pile.
   Movement controls fade in on first input.
6. **Diegetic gather teaching.** Approaching the pile surfaces a single
   contextual interact prompt. Pressing harvests one log. Repeat at the
   stone cairn. After ~3 logs + 2 stones, Spirit speaks: *"The bench knows
   what to do."*
7. **Diegetic craft teaching — Hearth.** Approaching the workbench
   surfaces a craft interact prompt. Opening shows one pre-unlocked
   recipe. One press crafts; Hearth blueprint enters place-able list.
8. **Diegetic placement teaching.** With the Hearth selected, a ghost
   preview follows the player. Placing commits.
9. **Claim ritual.** Approaching the placed Hearth surfaces a "light"
   prompt. Cinematic. Music swells. Fast-travel UI appears (one node —
   *yours*). Villagers begin entering. Save writes.
10. **Diegetic craft teaching — first weapon.** Second recipe now unlocked
    at the workbench. Spirit's third line: *"Beyond the glow it's wild.
    Take a tool you can swing."* Player crafts. Equipped-tool slot fills.
11. **Threshold.** Edge of grove transitions to wilderness. Soft chime.
12. **First wilderness moment.** Gather-able material in sight. Peaceful
    fauna walks past. After a small wander distance, a non-lethal hostile
    encounter (a wolf pup or equivalent) — the combat tutorial. Stamina
    drains visibly. Resolution: win OR retreat — both are successful
    tutorials.
13. **Discovery of second grove.** Within walking distance — PRNG biased
    to place a second grove close to spawn for the starter seed. Player
    sees the glow, recognizes it. Spirit greets. Discovery state recorded.
14. **Open game.** From here the loop is the player's.

By step 14 the player has done all eight verbs of the meta-loop and has
the entire game in their head. **That is the success criterion.**

## What the game is not

- Not a quest game. NPCs do not give goals.
- Not a death game. Running out of stamina/HP retreats you home.
- Not a permadeath game. There is no permadeath at any tier.
- Not a difficulty-tier game. There are no difficulty tiers.
- Not an FPS. Camera is third-person.
- Not a hedge-maze game. There are no hedge mazes.
- Not a collection-meta game. There is no overarching 8-spirit arc.
  Each grove has *its* spirit and that's the unit of meaning.
- Not a survival sim. Carry caps are cozy, hunger does not exist, the
  player cannot starve or freeze to death.

## What rewards the player

- **The build.** Whatever the player crafts and places in their claimed
  groves stays. Coming home and seeing what they made is the reward.
- **The network.** Every claimed grove adds a node to the fast-travel map.
  The map's expansion over a save is the visible record of the player's
  journey.
- **The world's flavor.** New biomes, new creatures, new weather, new NPC
  phrases each time the player heads in a fresh direction.
- **The contrast.** Coming back from a hard wilderness leg into the warm,
  glowing safety of a claimed grove. The two-mode design is the pleasure.

That is the entire reward system. It is enough.
