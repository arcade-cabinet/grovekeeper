---
title: Grovekeeper — Voxel Pivot Design
updated: 2026-04-29
status: supersedes-rc
domain: spec
---

# Grovekeeper — Voxel Pivot Design

This document supersedes the relevant sections of
`docs/superpowers/specs/2026-04-24-grovekeeper-rc-redesign-design.md`
for all topics listed here. The RC spec remains useful for context on
what was built, but this document governs what we are building next.

## What changed and why

The RC shipped a working game using two rendering pipelines:
VoxelRenderer for terrain and GLB ModelRenderer for animated characters
(Gardener, NPCs, creatures). After the RC, several things became clear:

1. **First-person view.** The Gardener player character is removed. The
   camera is first-person — you ARE the Gardener, you don't watch one.
   No player GLB needed.

2. **Voxel creatures.** `@jolly-pixel/voxel.renderer`'s layer system
   (`setLayerOffset` / `translateLayer`) can animate voxel assemblies by
   translating layers per-frame. This is the Minecraft model for mob
   animation. Creatures are assembled from voxel blocks and animated by
   per-limb layers. No GLB pipeline needed for creatures.

3. **Everything is voxels.** With first-person camera and voxel creatures,
   the GLB ModelRenderer pipeline is retired. The entire world — terrain,
   structures, creatures, the Grove Spirit, ambient animals — is rendered
   by VoxelRenderer. This is a single-renderer architecture.

4. **Unified material language.** Because creatures are assembled from
   voxel blocks, the blocks a creature is made of are the materials it
   drops when defeated. A coast crab made of `shell-block` and
   `kelp-strand` drops shell and kelp. Biome identity propagates from
   terrain through fauna through drops into crafting. The material graph
   is coherent rather than hand-authored per creature.

5. **Audio is Web Audio, not Howler.** The JollyPixel engine wraps
   `THREE.Audio` and the Web Audio API. The CLAUDE.md Howler claim was
   incorrect.

---

## Rendering architecture

### Single pipeline

Everything renders through `@jolly-pixel/voxel.renderer`.

| Entity type | VoxelRenderer approach |
|---|---|
| Terrain | Standard chunk layers per biome |
| Structures (hearth, workbench, buildings) | Placed voxel blocks committed to chunk data |
| Creatures (hostile + peaceful) | Multi-layer voxel assemblies; limb layers translated per frame |
| Grove Spirit | Voxel assembly of impossible grove-only materials (bioluminescent vine-block, heartwood) |
| Ambient animals | Minimal voxel assemblies (2–4 blocks), wander routines |
| Weather particles | Thin `poleY` voxel layer, translated each frame |
| Player hands | Optional HUD layer showing held tool as voxel block |

The `@jolly-pixel/engine` `ModelRenderer` is no longer used. The
`Actor`/`ActorComponent` ECS from the engine is retained for entity
lifecycle management; only the GLB rendering component is dropped.

**Layer animation pattern:**

```ts
// Each creature body part is a named VoxelLayer
// The creature actor translates limb layers per frame to animate
const creature = world.addLayer("creature-wolf-left-leg");
// Each frame in update():
world.translateLayer("creature-wolf-left-leg", {
  x: 0, y: Math.sin(time * WALK_FREQ) * LEG_AMP, z: 0
});
```

### Layer naming convention

Creature layers follow: `{entityId}-{partName}` (e.g.
`wolf-42-left-leg`, `wolf-42-right-leg`, `wolf-42-body`). All layers for
an entity are removed when the entity despawns.

---

## First-person camera

The camera is first-person. The player has no visible body in the world
(unless we later add a tool/hand HUD layer). `Camera3DControls` is used
in its native first-person mode — no custom follow behavior needed.

Mouse-look on desktop. Touch-drag to look on mobile. The virtual joystick
moves; looking is handled separately.

---

## Compound trait + crafting system

### Traits are atoms

Every placeable object in the world has a set of traits (bit flags or
small integer set). Traits: `hard`, `long`, `pointy`, `sharp`, `soft`,
`short`, `tied`, `throwable`, `burning`, `wet`, `dry`, `hollow`.

Gathered materials carry intrinsic traits: a stone is `hard` + `short`;
a stick is `long` + `soft`; a vine is `long` + `soft` + `tied` (if
knotted). Time-based transforms: a wet stick becomes `soft` + `wet`
after enough time; a dried stick becomes `dry` + `hard`.

### Compound resolution

Combining objects (place two on a surface, in inventory, near a fire)
checks the combined trait set against a declarative compound table.
When the combined traits cross a naming threshold, the system names the
result.

```ts
// Discovery text is Tracery-generated (see Tracery narrator section)
// The compound table is pure data
const COMPOUNDS: CompoundRule[] = [
  { requires: ["hard", "long", "pointy"], yields: "spear", name: "Spear" },
  { requires: ["hard", "long"], yields: "staff", name: "Staff" },
  { requires: ["hard", "short", "pointy"], yields: "knife", name: "Knife" },
  { requires: ["long", "soft", "tied"], yields: "rope", name: "Rope" },
  { requires: ["hard", "hollow"], yields: "cup", name: "Cup" },
  // ...
];
```

First time a compound is resolved, the narrator names it and records it
in `known_recipes`. After that, the player can craft it directly from the
recipe name without re-deriving traits.

### Durability

Items have finite use counts. A pointy rock has 3 uses. A flint knife
has 8. A steel axe has 50. Use count is tracked in inventory per item
instance.

### Campfire as process ingredient

The campfire is a proximity ingredient — standing near a fire while
combining items that require `burning` applies the fire trait. The fire
is not consumed; it is the context. This models the first tier of
"cooking" without a complex crafting-station UI.

### First recipe chain (diegetic tutorial)

The first grove has one resource available before the player can craft
anything: a rock. Picking it up surfaces its traits: `hard`, `short`.
The narrator comments neutrally.

Walking further, sticks. Traits: `long`, `soft`. The narrator notes the
stick's flexibility.

Combining a rock and a stick: `hard + long + pointy` → Spear. The
narrator is surprised. "You snap the rock against the stick. Oh. It
stays."

The Spear is the first weapon. Crafting the first weapon (or more
precisely: the moment the player first *holds* a named compound) flips
the encounter gate.

### Encounter gate

Encounters spawn when ALL of:
1. Player is in a wilderness biome (not a grove)
2. Time-of-day weight for this biome is non-zero
3. `hasCraftedNamedWeapon === true`

Until the player has crafted a named weapon, encounters are off. The
wilderness is quiet — present, alive with peaceful fauna, but not
actively threatening. This is the Ecco the Dolphin model: you learn to
swim before the sharks arrive.

---

## Spawn model (Ecco / first-grove flow)

The player spawns OUTSIDE the first grove, not inside it.

1. **Spawn point.** Edge of the wilderness, biome chosen by world seed.
   No creatures (encounter gate off). Peaceful fauna visible. Resources
   nearby.
2. **First grove.** Always placed within sight-line distance of spawn
   (~32 voxels). The glow is visible from spawn. No instruction says
   "walk toward the glow" — the glow is enough.
3. **Grove entry.** Entering the grove triggers discovery. The Grove
   Spirit appears. No scripted lines in the new model — the Spirit is a
   voxel presence, ambient. Its animation cycle is `idle` near the great
   central tree.
4. **First workbench.** A flat rock is present near the grove center.
   Close enough to the "primitive workbench" concept to be believable; a
   flat, smooth-surfaced boulder that reads as "you could work here."
5. **Recipe chain.** The player carries whatever they gathered before
   finding the grove. The compound table is always active. First
   combination near the flat rock surfaces the first named compound.
6. **Tacit tutorial agreement.** The grove provides a safe space to
   experiment. No modal teaches this. The player figures it out.
7. **First weapon → encounter gate flips.** On crafting the first named
   weapon, a quiet audio sting plays. Somewhere in the wilderness, a
   howl. Encounters are now live.
8. **Hearth chain.** The hearth recipe unlocks after the first weapon
   (not before — the weapon is the rite of readiness). Gather, craft
   hearth, place it, light it. Claim.

---

## Grove Spirit — revised

The Grove Spirit is a voxel assembly. It is made of materials that do
not appear anywhere else in the game:

- `bioluminescent-vine-block` (emissive; pale green pulse)
- `heartwood-block` (deep amber; refracts the glow shader)
- `spore-block` (semi-transparent; drifts upward slowly)

These materials are not in any crafting compound table. They cannot be
harvested. They are purely aesthetic — the game visually communicating
"this entity is of a different kind."

The Spirit has one animation: a slow oscillation of its upper half
(two layers: `spirit-upper` and `spirit-lower`) with `translateLayer`
applying a sin-wave translation each frame.

**No dialogue.** The Spirit does not speak. It is a presence. Its
"communication" is the glow intensification when the player claims the
grove.

---

## Tracery narrator and journal

### Narrator

A Tracery grammar handles all discovery text, recipe unlock text, and
journal entries. The narrator speaks in first person. Three registers
keyed by emotional context:

- **neutral** — observed something, noted it without judgment
- **impressed** — something unexpected happened
- **baffled** — something makes no sense yet

Grammar keys (abbreviated):

```json
{
  "discovery.neutral": [
    "You pick up #object#. It has a #trait# quality.",
    "#Object# — #trait#, #trait2#. Useful, maybe."
  ],
  "discovery.impressed": [
    "#Object# snaps against #object2#. Oh. #Result# holds.",
    "You hadn't expected that. #Result#. It has a name now."
  ],
  "compound.named": [
    "You call it a #name#. Why not.",
    "#Name#. That's what it is."
  ],
  "encounter.first": [
    "Something moved in the #biome#. You notice you're holding your #weapon#.",
    "The #biome# went quiet. #Creature# at the edge of sight."
  ],
  "hint.partial": [
    "Your #hand# keeps reaching for something that isn't there.",
    "You have #item#. You're missing something #missing_trait#."
  ]
}
```

The narrator is woven into discovery events (first time picking up a
material), compound resolution (naming), encounter triggers, and journal
entries.

### Journal

A stream-of-consciousness first-person log. Appended on:
- First pick-up of any material type
- First compound resolution (naming event)
- First grove discovery
- First claim
- First encounter
- Anything the narrator marks as `register: "impressed"`

The journal is not a quest log. It does not have checkboxes. It is
flavor — but it is THE hint system. The narrator makes connections:
"The softened stick and the spear. Oh. OH. That's what the wet stick
was for." Half-discovery hints surface when the player has item A but
is missing item B from a known compound: "Your arm keeps reaching for
something that isn't there."

Journal is persisted in the `dialogue_history` table repurposed as
`journal_entries`. Or a new table if that feels wrong to retrofit.

---

## Audio correction

The engine's audio stack wraps `THREE.Audio` and the Web Audio API.
**It is NOT Howler-backed.** All CLAUDE.md / AGENTS.md / ARCHITECTURE.md
references to "Howler" are incorrect and must be updated to "Web Audio
(THREE.Audio)".

The audio API surface is unchanged — `AudioManager`, `AudioLibrary`,
`AudioBackground`, `GlobalAudio` — only the backing technology claim
was wrong.

---

## What stays from the RC

- Voxel terrain rendering (VoxelRenderer, blockRegistry, tileset loading)
- Biome system (Meadow, Forest, Coast + Grove)
- Chunk streaming and deterministic generation
- Persistence stack (drizzle + Capacitor SQLite)
- SolidJS UI (HUD, crafting surface, fast-travel map)
- Koota game state
- Input layer (WASD + nipplejs)
- Grove claim state machine
- Fast travel
- Recipe JSON data format (extended for compound system)
- Screenshot test infrastructure (gates need re-baselining)

## What changes from the RC

- **Camera:** follow → first-person
- **Gardener GLB:** removed (no player character model)
- **Creature rendering:** GLB → voxel layer assemblies
- **Grove Spirit:** GLB → voxel assembly; no dialogue
- **NPC villagers:** GLB → voxel assemblies (simpler; 3–4 blocks each)
- **Crafting:** station UI + known-recipes filter → compound trait table +
  Tracery narrator; station still exists as a place (flat rock / workbench)
  but recipes are discovered not unlocked
- **Encounter gate:** biome + time → biome + time + hasCraftedNamedWeapon
- **Spawn:** inside grove → outside grove, near grove
- **Audio docs:** Howler → Web Audio (THREE.Audio)
- **ModelRenderer imports:** removed from all non-test files
