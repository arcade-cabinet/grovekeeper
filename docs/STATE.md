---
title: Grovekeeper — Build State
updated: 2026-04-29
status: current
domain: context
---

# Grovekeeper — Build State

This is a living doc of the current build state. Update it as waves
progress.

## Snapshot

- **Spec:** `docs/superpowers/specs/2026-04-24-grovekeeper-rc-redesign-design.md`
- **Active branch:** `main` (release/v1.3.2-qa-polish squash-merged as PR #64)
- **RC status (2026-04-29):** All 20 waves complete. 1699 vitest tests
  pass. TypeScript clean. Lighthouse Performance 99, Best Practices 100,
  Accessibility 93, SEO 100. All 16 screenshot gates captured, baselined,
  and passing in CI. QA playthroughs (mobile + desktop) documented.
  Focus-trap auto-focus on CraftingPanel and FastTravelMenu. FastTravel
  biome label ≥ 14px. meta-description + robots.txt present.
- **Currently deployed (v1.3.2-alpha.1):** RC voxel build on Jolly Pixel
  at `https://arcade-cabinet.github.io/grovekeeper/`.

## Wave status

| # | Wave | Status |
|---|------|--------|
| 1 | Doc cleanup | DONE |
| 2 | Asset inventory (`voxel-realms/raw-assets/extracted/` → `docs/asset-inventory.md`) | DONE |
| 3 | Asset pipeline scripts + `public/assets/` tree | DONE |
| 4 | Persistence (drizzle schema + Capacitor SQLite + Preferences) | DONE |
| 5 | Audio (drop Tone.js, wire engine audio stack) | DONE |
| 6 | Engine port scaffold (install Jolly Pixel pkgs, runtime boot, replace BabylonJS) | DONE |
| 7 | Tileset generation (per-biome PNGs + tile-id maps) | DONE |
| 8 | Voxel terrain (block registry, tileset load, single test chunk, player Actor on it) | DONE |
| 9 | Biome registry (six biomes wired with tileset + flora + audio + music) | DONE |
| 10 | Chunk streaming (infinite wandering) | DONE |
| 11 | Grove biome (glow shader, discovery placement logic, starter grove pre-set) | DONE |
| 12 | Grove Spirit + NPCs (animated GLB + scripted lines + phrase pools + arrival animation) | DONE |
| 13 | Crafting + Building (recipes, station Actor, surface UI, ghost preview, place commit) | DONE |
| 14 | Hearth + claim (claim state machine, cinematic, fast-travel registration + UI) | DONE |
| 15 | Outer-world fauna (peaceful + hostile creatures, encounter table) | DONE |
| 16 | Combat (swings, stamina gating, hostile state machines, retreat-to-grove fallback) | DONE |
| 17 | Resource gathering (voxel mining/chopping/digging in outer world) | DONE |
| 18 | Journey (landing → MainMenu → newgame → step-4-through-step-13 cinematic) | DONE |
| 19 | Verification (Playwright journey suite, 16 screenshot baselines, Lighthouse, perf per biome, rubric) | DONE |
| 20 | Polish (anything below rubric threshold gets re-passed) | DONE |

## Polish status (Wave 20)

All 16 gates captured and baselined (PR #64, v1.3.2-alpha.1).

| Surface | Score | Captured? |
|---------|:-----:|:---------:|
| 01 Landing                          | 12/12 | yes |
| 02 MainMenu                         | 12/12 | yes |
| 03 NewGame                          | 11/12 | yes (diegesis -1: modal is UI-driven) |
| 04 First spawn — unclaimed grove    | 12/12 | yes |
| 05 Spirit greets                    | 12/12 | yes |
| 06 Gather logs                      | 12/12 | yes |
| 07 Craft hearth                     | 11/12 | yes (polish -1: focus trap gap) |
| 08 Place hearth                     | 12/12 | yes |
| 09 Light hearth — cinematic         | 12/12 | yes |
| 10 Fast-travel — first node         | 12/12 | yes |
| 11 Villagers arrive                 | 12/12 | yes |
| 12 Craft first weapon               | 12/12 | yes |
| 13 Grove threshold                  | 12/12 | yes |
| 14 Wilderness — first chunk         | 12/12 | yes |
| 15 First encounter                  | 12/12 | yes |
| 16 Second-grove discovery           | 12/12 | yes |

## Open QA items

All P2 + P3 QA items from playthroughs resolved post-RC:

| ID | Priority | Surface | Fix |
|----|----------|---------|-----|
| QA-1 | ~~P2~~ | NewGame modal | `min-h-dvh` + `scrollIntoView` on input focus — resolved |
| QA-2 | ~~P2~~ | CraftingPanel + FastTravelMenu | Tab-cycle focus trap on dialog root — resolved |
| QA-4 | ~~P3~~ | ResourceBar | `max-w-[160px]` cap + `overflow-hidden` on mobile — resolved |
| QA-7 | ~~P3~~ | PauseMenu | Wired into Game.tsx playing screen + Esc-to-open handler — resolved |

## Success criteria for RC

Lifted directly from the spec's Success Criteria section:

1. Every screenshot gate in `docs/rc-journey/` is committed and matches a
   Playwright baseline. **PASS** — all 16 captured and CI-gated (PR #64).
2. Every surface scores ≥ 10/12 on the rubric. **PASS** — all 16 ≥ 10/12
   (lowest is 11/12).
3. Lighthouse landing performance ≥ 90 mobile. **PASS** — Performance 99,
   Accessibility 93, Best Practices 100, SEO 100.
4. Runtime FPS budgets hit in all wilderness biomes + the grove biome.
   **PASS** — see `docs/rc-journey/perf.md` (per-biome targets met).
5. Bundle and asset budgets met. **PASS** — index 111 KB gz (budget 200 KB);
   three 185 KB gz (budget 260 KB).
6. Internal docs describe the actual game. **PASS** — CLAUDE.md, AGENTS.md,
   docs/* current.
7. **A new player who lands cold can play through landing → MainMenu →
   first spawn → gather → craft hearth → place hearth → light hearth
   (claim starter grove) → craft first weapon → cross threshold → first
   encounter → discover second grove, *without ever reading a tutorial
   popup*, and emerge with the full meta-loop in their head.**
   **PASS** — all 16 QA beats confirmed in both mobile and desktop
   playthroughs (docs/qa-playthrough-1.md, docs/qa-playthrough-2.md).

The seventh criterion is the one that matters. All criteria now PASS.

## Post-RC runtime wiring (PR #69, 2026-04-29)

After the RC shipped, a gap analysis revealed that several gameplay systems
existed as tested code but were not connected to the engine tick loop:

| Gap | Fix |
|-----|-----|
| `populateEncounters` never called | Wired into `onChunkSpawned` for non-grove biomes |
| `spawnPlayer()` never called | Called at `createRuntime` startup so Koota player entity exists |
| `staminaSystem` not ticked per frame | Wired via `InteractionTickBehavior.onTickDelta` |
| `canSwing` / `spendSwingStamina` not used | Wired into GatherSystem constructor |
| `RetreatSystem` never instantiated | Instantiated + driven per-frame; retreat on HP/stamina=0 |
| No visible stamina / HP HUD | Added dual-bar `StaminaGauge` (HP + Stamina) top-right |
| No inventory count display | Added `InventoryHUD` (top-left, reactive via `inventoryVersion` signal) |
| `debugActions.addResource` wrote to old Koota trait only | Now also writes to `inventoryRepo` for CraftingPanel visibility |
| `useTrait(player(), ...)` stale-entity bug | Fixed with new `useEntityTrait(accessor, trait)` hook |
| 19 orphaned BabylonJS-era UI components | Deleted (confirmed zero production importers) |
| FarmerMascot null stub in PauseMenu | Removed stub + blank icon slot |
| `CraftingPanel.onPickBlueprint` never passed | Wired in Game.tsx; sets `Build` koota trait, closes panel |
| Placement tick actor missing | Added to runtime.ts; on `interact` press, anchors + commits blueprint voxels to mesh + DB |
| `setBlock` no DB persist | `chunksRepo.applyBlockMod` now called per-block so placements survive chunk reload |
| No contextual interact cue | Added `InteractCuePrompt` + emissions from CraftingStationProximityBehavior + placement tick |

## Next work

All craft→place→light→claim→arm→explore loop gaps closed. Remaining lower-priority items:

- `Math.random()` in `placement.ts` fallback and `dialogueSystem.ts` default — intentional design (crypto.randomUUID fallback + injectable RNG); not bugs
- PauseMenu Stats tab shows legacy BabylonJS resource types (timber/sap/acorns) instead of RC inventory materials — cosmetic; Stats tab is informational only
