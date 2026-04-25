---
title: Grovekeeper — Roadmap
updated: 2026-04-24
status: current
domain: context
---

# Grovekeeper — Roadmap (RC)

This roadmap covers **only the RC scope**. Anything beyond RC is parked in
`docs/post-rc.md`.

## Source of truth

The full design and ordering live in
`docs/superpowers/specs/2026-04-24-grovekeeper-rc-redesign-design.md`. The
20 waves below are summarized from that spec's Implementation Ordering
section.

## RC waves

1. **Doc cleanup.** Rewrite `MEMORY.md`, `CLAUDE.md`, `docs/DESIGN.md`,
   `docs/ARCHITECTURE.md`, `docs/STATE.md`, `memory-bank/*`. No code
   changes.
2. **Asset inventory.** Walk `voxel-realms/raw-assets/extracted/` and
   write `docs/asset-inventory.md` covering voxels and audio. No code.
3. **Asset pipeline.** `.env`, `raw-assets/`, `scripts/fetch-itch.mjs`,
   `scripts/import-from-voxel-realms.mjs`, `scripts/curate-assets.mjs`,
   `scripts/build-asset-manifest.mjs`, `public/assets/` layout,
   `asset-curation.json`.
4. **Persistence.** Drizzle schema for chunks, biomes, groves, claim
   state, inventory, recipes-known, dialogue history. Wire
   `@capacitor-community/sqlite` (sql.js web adapter) and
   `@capacitor/preferences`.
5. **Audio.** Drop Tone.js. Wire `AudioManager`/`AudioLibrary`/
   `AudioBackground`/`GlobalAudio`. Build `BiomeMusicCoordinator` for
   biome-change crossfade.
6. **Engine port scaffold.** Install `@jolly-pixel/engine`,
   `voxel.renderer`, `runtime`, Rapier. New game-scene Actor. Wire
   `loadRuntime` for boot. Replace BabylonJS imports.
7. **Tileset generation.** Per-biome PNG atlases + JSON tile-id maps.
8. **Voxel terrain.** Block registry, tileset load, single test chunk,
   player Actor (`ModelRenderer`), camera follow.
9. **Biome registry.** Six biomes with tilesets + voxel block sets +
   flora + ambient + music. Biome change → tileset swap + crossfade.
10. **Chunk streaming.** Infinite world wandering.
11. **Grove biome.** Special seventh biome. Glow shader. Discovery
    placement logic. Starter grove pre-set with workbench, log pile,
    stone cairn, Grove Spirit.
12. **Grove Spirit + NPCs.** Animated GLB characters. Spirit's three
    scripted lines. Villager phrase pools. Villager arrival animation
    on first claim.
13. **Crafting + Building.** Recipe data, crafting station Actor, surface
    UI, ghost preview, place commit. Hearth + starter weapon recipes
    pre-unlocked at the primitive workbench.
14. **Hearth + claim.** Claim state machine, claim cinematic, fast-travel
    node registration, fast-travel UI.
15. **Outer-world fauna.** Peaceful + hostile creatures via
    `ModelRenderer`. Encounter table.
16. **Combat.** Crafted-weapon swings, stamina gating, hostile state
    machines, retreat-to-grove fallback.
17. **Resource gathering.** Voxel mining/chopping/digging in the outer
    world. Drops feed crafting.
18. **Journey.** Landing → MainMenu → newgame → step-4-through-step-13
    cinematic.
19. **Verification.** Playwright journey suite, 16 screenshot baselines,
    Lighthouse, perf per biome, rubric scoring.
20. **Polish.** Anything below rubric threshold gets re-passed.

## Done = RC ships

RC ships when all seven success criteria from the spec are met (see
`docs/STATE.md`).
