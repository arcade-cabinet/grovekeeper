---
title: Grovekeeper — Build State
updated: 2026-04-24
status: current
domain: context
---

# Grovekeeper — Build State

This is a living doc of the current build state. Update it as waves
progress.

## Snapshot

- **Spec:** `docs/superpowers/specs/2026-04-24-grovekeeper-rc-redesign-design.md`
- **Active branch:** `release/workflows-v2`
- **Currently deployed (1.0.0-alpha.1):** cozy 2.5D BabylonJS tree-tender
  with 9 hardcoded JSON zones at
  `https://arcade-cabinet.github.io/grovekeeper/`. Being replaced.
- **Redesign target:** voxel third-person on Jolly Pixel
  (`@jolly-pixel/engine` + `voxel.renderer` + `runtime`) with biome-typed
  infinite outer-world chunks and the special Grove biome.

## Wave status

| # | Wave | Status |
|---|------|--------|
| 1 | Doc cleanup | IN PROGRESS — this commit |
| 2 | Asset inventory (`voxel-realms/raw-assets/extracted/` → `docs/asset-inventory.md`) | pending |
| 3 | Asset pipeline scripts + `public/assets/` tree | pending |
| 4 | Persistence (drizzle schema + Capacitor SQLite + Preferences) | pending |
| 5 | Audio (drop Tone.js, wire engine audio stack) | pending |
| 6 | Engine port scaffold (install Jolly Pixel pkgs, runtime boot, replace BabylonJS) | pending |
| 7 | Tileset generation (per-biome PNGs + tile-id maps) | pending |
| 8 | Voxel terrain (block registry, tileset load, single test chunk, player Actor on it) | pending |
| 9 | Biome registry (six biomes wired with tileset + flora + audio + music) | pending |
| 10 | Chunk streaming (infinite wandering) | pending |
| 11 | Grove biome (glow shader, discovery placement logic, starter grove pre-set) | pending |
| 12 | Grove Spirit + NPCs (animated GLB + scripted lines + phrase pools + arrival animation) | pending |
| 13 | Crafting + Building (recipes, station Actor, surface UI, ghost preview, place commit) | pending |
| 14 | Hearth + claim (claim state machine, cinematic, fast-travel registration + UI) | pending |
| 15 | Outer-world fauna (peaceful + hostile creatures, encounter table) | pending |
| 16 | Combat (swings, stamina gating, hostile state machines, retreat-to-grove fallback) | pending |
| 17 | Resource gathering (voxel mining/chopping/digging in outer world) | pending |
| 18 | Journey (landing → MainMenu → newgame → step-4-through-step-13 cinematic) | pending |
| 19 | Verification (Playwright journey suite, 16 screenshot baselines, Lighthouse, perf per biome, rubric) | pending |
| 20 | Polish (anything below rubric threshold gets re-passed) | pending |

Each wave has acceptance criteria in the implementation plan that follows
this spec. Wave 1 lands first so all subsequent agents read accurate
context.

## Open items (cross-wave)

- WIP changes still on disk in `src/engine/scene/LightingManager.ts`,
  `src/input/pathFollowing.ts`, `src/systems/growth.ts`,
  `src/systems/npcMovement.ts`, `src/systems/time.ts`. These are pre-port
  modifications that will either be carried into the port or deleted
  during the port wave; do not stage them with the doc-cleanup commit.

## Success criteria for RC

Lifted directly from the spec's Success Criteria section:

1. Every screenshot gate in `docs/rc-journey/` is committed and matches a
   Playwright baseline.
2. Every surface scores ≥ 10/12 on the rubric.
3. Lighthouse landing performance ≥ 90 mobile.
4. Runtime FPS budgets hit in all wilderness biomes + the grove biome.
5. Bundle and asset budgets met.
6. Internal docs describe the actual game.
7. **A new player who lands cold can play through landing → MainMenu →
   first spawn → gather → craft hearth → place hearth → light hearth
   (claim starter grove) → craft first weapon → cross threshold → first
   encounter → discover second grove, *without ever reading a tutorial
   popup*, and emerge with the full meta-loop in their head.**

The seventh criterion is the one that matters. The screenshots, the
rubric, and the budgets all exist to serve it.
