# Active Context — Grovekeeper

> Updated 2026-04-24 as part of the RC redesign doc-cleanup wave.

## What is happening right now

Actively executing the **RC redesign** per
`docs/superpowers/specs/2026-04-24-grovekeeper-rc-redesign-design.md`.

The currently-deployed game (1.0.0-alpha.1) is a cozy 2.5D BabylonJS
tree-tender with 9 hardcoded JSON zones. It is being **replaced** by a
third-person voxel game on Jolly Pixel (`@jolly-pixel/engine` +
`voxel.renderer` + `runtime`) with biome-typed infinite outer-world chunks
and the special **Grove biome** scattered as discoverable claimable towns.

Active branch: `release/workflows-v2`.

## Current wave

**Wave 1 — doc cleanup.** Rewriting `CLAUDE.md`, `MEMORY.md`, all
top-level `docs/*.md`, and `memory-bank/*` so that every subsequent agent
in the task batch reads accurate context. No code changes in this wave.

## What is next

**Wave 2 — asset inventory.** Walk
`../voxel-realms/raw-assets/extracted/` and write
`docs/asset-inventory.md` covering both voxels and audio. The biome list
(currently planned: meadow / forest / wetland / alpine / coast / scrub +
the special grove biome) **adapts to the actual asset pool**, floor of
3, ceiling of 6 wilderness biomes.

After that the order is: asset pipeline → persistence → audio drop
(Tone.js out, engine audio in) → engine port scaffold → tilesets → voxel
terrain → biome registry → chunk streaming → grove biome → spirit + NPCs
→ crafting+building → hearth claim → fauna → combat → gathering →
journey → verification → polish. Full wave list in `docs/STATE.md`.

## What is out of scope

Quests, player death, permadeath, difficulty tiers, the 8-spirit
collection meta arc, multiplayer, cosmetics, prestige, full
Minecraft-scale tech tree. All cut from RC. See `docs/post-rc.md`.

## Things to keep in mind on every commit

- Pre-commit hook runs `pnpm check && pnpm tsc && pnpm test:run`.
- Mobile-first: test at 375px, touch targets ≥ 44px.
- Determinism: all randomness via `scopedRNG(scope, worldSeed, ...extra)`.
- Tuning numbers in `config/*.json`, not inline.
- WIP changes still on disk in `src/engine/scene/LightingManager.ts`,
  `src/input/pathFollowing.ts`, `src/systems/growth.ts`,
  `src/systems/npcMovement.ts`, `src/systems/time.ts` are pre-port and
  should not be staged with doc-only commits.
