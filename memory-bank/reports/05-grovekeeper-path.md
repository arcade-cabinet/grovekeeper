# Grovekeeper Path + Narrative Audit

## Summary

The Grovekeeper path infrastructure is substantially real. The component stack —
spirit ECS component, maze generator, spirit renderer, dialogue branching engine,
quest chain engine, speech bubble, dialogue choices UI, quest panel, and compass
hint — all exist with real logic and tests. However, the system has two critical
gaps that prevent it from functioning end-to-end:

1. **Spirit proximity detection is never called** — `discoverSpirit()` exists in
   the store but nothing in the game loop or any hook calls it when the player
   stands near a spirit.
2. **Spirit-specific dialogue trees are missing** — every spirit ECS entity is
   assigned `dialogueTreeId: "spirit-dialogue-0"` through `"spirit-dialogue-7"`,
   but only one spirit tree (`spirit-worldroot`) exists in `dialogue-trees.json`.
   The other 7 are referenced but not written.

The "Birchmother" figure from the memory doc does not appear anywhere in the
codebase — neither as a character, NPC, location, nor quest target. The final
quest terminates at "the Worldroot's sanctum" (`worldroot_reached`) but this
location/trigger is also not wired.

---

## What Works

- **GrovekeeperSpiritComponent** (`game/ecs/components/procedural/spirits.ts`)
  is fully specified with all required fields: `spiritId`, `emissiveColor`,
  `emissiveIntensity`, `orbRadius`, `bobAmplitude`, `bobSpeed`, `bobPhase`,
  `spawned`, `spawnProgress`, `hoverHeight`, `trailColor`, `discovered`,
  `dialogueTreeId`.

- **Maze generation** (`game/world/mazeGenerator.ts`) is real and complete:
  12x12 recursive-backtracker algorithm, seeded from `worldSeed + chunkX + chunkZ`,
  produces navigable hedge wall placements. `isLabyrinthChunk()` fires at ~3%
  probability (one per ~33 chunks). Chunk (0,0) is protected. `centerPosition`
  and `entrancePosition` are correctly computed. `mazeIndex` is stable and bounded
  to `[0, 7]`.

- **Spirits are spawned in ChunkManager** (`game/world/ChunkManager.ts:504-534`).
  Every labyrinth chunk spawns a `grovekeeperSpirit` ECS entity at `centerPosition`
  with seeded `emissiveColor` (from `SPIRIT_COLORS` palette), randomized `orbRadius`,
  `bobAmplitude`, `bobSpeed`, `bobPhase`, and `hoverHeight`. All parameters are
  seeded via `scopedRNG("spirit", worldSeed, mazeIndex)`.

- **GrovekeeperSpirit renderer** (`components/entities/GrovekeeperSpirit.tsx`)
  is real: IcosahedronGeometry orbs with emissive material, spawn-rise animation
  over 2 seconds, per-frame bobbing (`computeBobY`), pulsing emissive intensity
  (`computeEmissiveIntensity`), and 12-particle upward trail. All driven by
  `grovekeeperSpiritsQuery` from ECS. Pure functions exported for testing.

- **Spirit color palette** (`game/utils/spiritColors.ts`) defines 8 grove-aligned
  colors (warm green, teal, gold, violet, mint, soft yellow, sky blue, soft rose)
  resolved deterministically via `scopedRNG("spirit", worldSeed, mazeIndex)`.

- **Dialogue branching** (`game/systems/dialogueBranch.ts`) is fully implemented:
  `selectDefaultBranch()` uses weighted roulette-wheel selection with
  `scopedRNG("dialogue-branch", worldSeed, entityId, nodeIndex)`. Branch
  conditions (`has_item`, `has_level`, `quest_complete`, `season`, `time_of_day`,
  `spirit_discovered`, `has_relationship`) are all implemented. `filterAvailableBranches`
  gates choices by condition.

- **Dialogue loader** (`game/systems/dialogueLoader.ts`) loads from
  `config/game/dialogue-trees.json` and validates graph integrity: every
  `targetNodeId` in every branch must exist as a `nodeId` in the same tree.
  `loadAndValidateDialogueTrees()` throws on violation — hard error, no silent
  fallback.

- **Dialogue tree format** (`config/game/dialogue-trees.json`) uses the correct
  `DialogueTree` schema with `seedBias`-weighted branches. The one spirit tree
  (`spirit-worldroot`) has proper branching: `spirit-intro` -> `spirit-reveal`
  (fires `reveal_location: worldroot-anchor` + 50 XP) or `spirit-dismiss`.

- **Quest chain engine** (`game/quests/questChainEngine.ts`) is a complete pure
  state machine: `startChain`, `advanceObjectives`, `claimStepReward`, level
  gates, prerequisite chain enforcement. Reads from
  `game/quests/data/questChains.json`.

- **Main quest chain** (`game/quests/data/questChains.json:641-668`) — `"main-quest-spirits"`:
  "The Grovekeeper Path", category `main_story`, one step with objective
  `targetType: "spirit_discovered"`, `targetAmount: 8`. Correct.

- **Final quest** (`game/quests/data/questChains.json:669-697`) — `"worldroots-dream"`:
  "The Worldroot's Dream", requires `main-quest-spirits` completed, objective
  `targetType: "worldroot_reached"`, `targetAmount: 1`. Correct prerequisite chain.

- **`mainQuestSystem.ts`** (`game/quests/mainQuestSystem.ts`) exposes
  `getSpiritDiscoveryCount`, `isMainQuestComplete`, `isWorldrootsDreamAvailable` —
  all read from `questChainEngine`. Clean, correct.

- **`discoverSpirit()` in gameStore** (`game/stores/gameStore.ts:1207-1222`)
  correctly guards against duplicates, appends to `discoveredSpiritIds`, and calls
  `actions.advanceQuestObjective("spirit_discovered", 1)` — which drives
  `main-quest-spirits` forward.

- **World quest system** (`game/quests/worldQuestSystem.ts`) defines 8 procedural
  world quests with `prerequisiteSpirits` gating and `scopedRNG("world-quest", ...)`
  variant selection. Unlocks are checked against both chunk distance AND spirit
  count.

- **SpeechBubble** (`components/entities/SpeechBubble.tsx`) is real: world-space
  Billboard, Fredoka font via drei `<Text>`, fade in/out via `computeOpacity`
  driven imperatively in `useFrame`. Ref-based opacity to avoid 60fps React
  re-renders.

- **DialogueChoices** (`components/game/DialogueChoices.tsx`) is real: 44px
  touch targets, 3-second auto-advance via `setTimeout`, auto-advance fires
  `selectDefaultBranchNode` — the seed-keyed branch. Timer resets on node change.

- **QuestPanel** (`components/game/QuestPanel.tsx`) is real: `ConnectedQuestPanel`
  reads `questBranchQuery` from ECS + `questChainState` from Legend State,
  maps to display objects, fires step-complete toasts, renders progress bars and
  Claim Reward buttons. Tests in `QuestPanel.test.ts` cover `main-quest-spirits`
  with 3 and 8 spirit advances.

- **Compass hint** (`components/game/HUD.tsx:35-111`) is implemented:
  `findNearestUndiscoveredSpirit()` scans `grovekeeperSpiritsQuery` for undiscovered
  spirits, `resolveCompassBearing()` computes 0-360 degree bearing. The `<Compass>`
  component renders a rotating arrow above the HUD. Hides when all spirits are found.

- **Spirit discovery count in achievements** (`game/hooks/useGameLoop.ts:382`):
  `spiritsDiscovered: store.discoveredSpiritIds.length` is included in `PlayerStats`
  and passed to `checkAchievements` every 5 seconds.

- **Discovery system** (`game/systems/discovery.ts`) tracks visited zones; species
  discovery (`game/systems/speciesDiscovery.ts`) tracks codex progress via
  `encounterWildSpecies`. Wild species discovery fires in ChunkManager for visible
  chunks but is independent of spirit discovery (separate concern, correct).

---

## What Is Stubbed / Incomplete

- **Spirit dialogue trees 1-7 are missing.** `ChunkManager.ts:531` assigns
  `dialogueTreeId: "spirit-dialogue-${mazeIndex}"` (values `"spirit-dialogue-0"`
  through `"spirit-dialogue-7"`), but `config/game/dialogue-trees.json` contains
  only 3 trees: `"rowan-greeting"`, `"spirit-worldroot"`, and `"merchant-hazel"`.
  None match `"spirit-dialogue-0"` through `"spirit-dialogue-7"`. When the
  dialogue loader tries to look up any of these, `getDialogueTreeById()` will
  return `undefined`. There is no fallback — the loader throws on validation
  failure. This means spirit dialogue is completely broken at runtime.

- **`config/game/dialogues.json` is an orphan legacy file.** It uses a flat node
  array with `choices[].next` format, not the `DialogueTree` schema with
  `branches[].targetNodeId + seedBias`. The dialogue loader does NOT read this
  file — it reads `dialogue-trees.json`. The `dialogues.json` file contains NPC
  dialogue for Elder Rowan, Hazel, Fern, Blossom, Bramble, Oakley, and Sage, but
  none of it is wired to the runtime dialogue system.

- **`config/game/quests.json` is also an orphan legacy file.** It duplicates
  `game/quests/data/questChains.json` exactly. `questChainEngine.ts` imports from
  `./data/questChains.json`. Nothing imports `config/game/quests.json`. This file
  is dead weight.

- **No spirit-species unlock connection.** The memory doc specifies spirits unlock
  new species. There is no code path where `discoverSpirit()` triggers a species
  unlock. The `dialogueEffects.ts` system handles `start_quest` and `advance_quest`
  effect types only. `unlock_species` is mentioned in `GAME_SPEC.md` as a dialogue
  effect type but is not implemented in `dialogueEffects.ts` and does not appear
  in any `dialogue-trees.json` entry.

---

## Missing Entirely

- **Spirit proximity detection trigger.** Nothing calls `store.discoverSpirit()`
  anywhere in the game loop (`useGameLoop.ts`), any hook, or any interaction
  system. The store method is fully implemented but has no caller. A player can
  stand inside a maze center next to a spirit forever without triggering discovery.

- **`spirit-dialogue-0` through `spirit-dialogue-7` dialogue tree content.**
  These 8 trees are referenced by every spirit entity but do not exist in
  `config/game/dialogue-trees.json`.

- **`worldroot_reached` event trigger.** The final quest step requires
  `targetType: "worldroot_reached"` to advance. No code emits this event. There
  is no worldroot location, landmark, or trigger zone defined in any world
  generator, chunk system, or game loop.

- **Birchmother.** This character/encounter referenced in the memory doc does not
  appear anywhere in the codebase — no NPC template, no dialogue tree, no quest
  step, no location.

- **Spirit dialogue displayed in-world.** The `SpeechBubble` and `DialogueChoices`
  components exist, but there is no component or hook that connects a player's
  proximity to a spirit entity to opening a dialogue session (rendering
  `SpeechBubble` with the spirit's text, presenting `DialogueChoices`, advancing
  through the tree).

- **Minimap labyrinth markers.** `MinimapSnapshot` (`components/game/minimap/types.ts`)
  tracks `chunks`, `campfires`, `npcs`, and `player` — no spirit or labyrinth
  markers. The compass replaces this for spirits, but labyrinth entrances have no
  map indicator.

- **Spirit `discovered` flag mutation.** `GrovekeeperSpiritComponent.discovered`
  is set to `false` on creation and never mutated — because `discoverSpirit()` is
  never called and has no ECS write-back. The compass's `findNearestUndiscoveredSpirit()`
  reads `grovekeeperSpirit.discovered` from ECS, so it would never update even if
  the store were triggered.

- **`unlock_species` dialogue effect.** Listed in `GAME_SPEC.md` §33 conditions/
  effects but absent from `dialogueEffects.ts` and from all dialogue tree data.

---

## Spirit System Reality Check

**Are 8 spirits defined?**
The ECS component interface (`GrovekeeperSpiritComponent`) supports 8 spirits.
`TOTAL_MAZES = 8` in `mazeGenerator.ts`. `SPIRIT_COLORS` has 8 entries. However,
only ONE spirit dialogue tree (`spirit-worldroot`) is written. The other 7 are
assigned IDs (`spirit-dialogue-0` through `spirit-dialogue-7`) that resolve to
nothing.

**Are they placed in maze centers?**
Yes. ChunkManager correctly calls `generateLabyrinth()`, checks the result, and
spawns a `grovekeeperSpirit` entity at `labyrinthResult.centerPosition`.

**Is their spawn animation real?**
Yes. `GrovekeeperSpirit.tsx` implements the rise-from-floor animation via
`spawnProgress` lerp over 2 seconds, transitioning to idle bob. The spawn
animation runs correctly in R3F's `useFrame`.

---

## Maze Reality Check

**Are labyrinths real navigable structures?**
Yes. `hedgePlacement.ts` implements a 12x12 recursive-backtracker algorithm with
a seeded RNG. It correctly removes walls to create passages, marks a 2x2 center
room (`isCenter = true`), and removes center walls to create an open clearing.
`mazeToHedgePieces()` converts wall cells to positioned hedge GLB placements.
Dead-end decorations (flowers, vases), intersection columns, and center fountain +
benches are placed via `placeMazeDecorations()`.

**Are they placed in world generation?**
Yes. ChunkManager integrates `generateLabyrinth()` for every chunk, placing hedge
wall entities, decoration entities, and the spirit entity. The 3% probability
gives roughly one labyrinth per 33 chunks (~every 528 world-space units with
chunk size 16). The tutorial chunk (0,0) is explicitly excluded.

---

## Dialogue Reality Check

**Is seed-keyed branching real?**
Yes. `dialogueBranch.ts` implements weighted roulette-wheel branch selection with
`scopedRNG("dialogue-branch", worldSeed, entityId, nodeIndex)`. Same seed +
entity + node always produces the same branch. `normalizeSeedBias()` handles zero-
weight edge cases. This is fully unit-tested.

**Are actual dialogue trees written?**
Partially. `dialogue-trees.json` has 3 real trees with proper `seedBias` branching:
- `rowan-greeting` — 7 nodes, Worldtree lore, fires `start_quest: worldtree-restoration`
- `spirit-worldroot` — 3 nodes, the final convergence reveal, fires `reveal_location: worldroot-anchor`
- `merchant-hazel` — 3 nodes, trading intro

The 8 spirit-specific trees (`spirit-dialogue-0` through `spirit-dialogue-7`)
assigned in ChunkManager do not exist. The flat `dialogues.json` is a legacy
artifact not connected to the runtime system.

---

## Quest Chain Reality Check

**Is the main quest chain defined?**
Yes. `main-quest-spirits` ("The Grovekeeper Path") is in `questChains.json` with
a single step, objective `spirit_discovered`, target 8. It is correctly structured
and readable by `questChainEngine.ts`.

**Does it track progression to Birchmother?**
No. The main quest terminates at all-8-spirits discovered, then unlocks
`worldroots-dream` which requires `worldroot_reached`. There is no Birchmother.
The `worldroot_reached` event has no emitter anywhere in the codebase.

**Is the quest engine wired?**
Partially. `discoverSpirit()` in the store correctly calls
`advanceQuestObjective("spirit_discovered", 1)`. But since `discoverSpirit()` is
never called from the game loop, the quest never advances in practice. The quest
panel reads from `questBranchQuery` (ECS) + `questChainState` (Legend State) and
renders correctly — it is waiting for data that never arrives.

---

## Critical Issues (numbered)

1. **Spirit proximity detection is missing.** No code calls `store.discoverSpirit(spiritId)`
   when a player enters a maze center. The full discovery chain — ECS flag mutation,
   store update, quest advancement, compass update — is blocked at the first step.
   File: `game/hooks/useGameLoop.ts` (no spirit proximity check present).

2. **8 spirit dialogue trees do not exist.** `ChunkManager.ts:531` assigns
   `dialogueTreeId: "spirit-dialogue-${mazeIndex}"` to every spirit ECS entity.
   `config/game/dialogue-trees.json` has only `rowan-greeting`, `spirit-worldroot`,
   and `merchant-hazel`. Trees `spirit-dialogue-0` through `spirit-dialogue-7` are
   absent. Any attempt to open spirit dialogue will fail at tree lookup.

3. **No spirit dialogue session initiator.** Even if the trees existed, no component
   or hook connects a player's proximity to a spirit to rendering `SpeechBubble` +
   `DialogueChoices`. The UI components exist; the glue code does not.

4. **`spirit.discovered` ECS flag is never mutated.** The compass reads ECS
   `grovekeeperSpirit.discovered` to find the nearest undiscovered spirit. Since
   `discoverSpirit()` is never called and has no ECS write-back path, the flag
   remains `false` forever, and the compass never clears.

5. **`worldroot_reached` event has no emitter.** The final quest's completion
   objective will never fire. There is no worldroot location, no proximity trigger,
   and no action that emits this event type.

6. **`config/game/dialogues.json` is a dead file.** It is never imported by the
   runtime dialogue system. Contains 40+ dialogue nodes for NPCs (Rowan, Hazel,
   Fern, Blossom, Bramble, Oakley, Sage) that are inaccessible. The runtime reads
   only `config/game/dialogue-trees.json`.

7. **`config/game/quests.json` is a dead file.** Identical content to
   `game/quests/data/questChains.json`. Nothing imports it.

8. **`unlock_species` dialogue effect is unimplemented.** Dialogue trees cannot
   currently unlock new species as a narrative reward. The condition `spirit_discovered`
   is correctly implemented in `evaluateCondition` but the effect `unlock_species`
   is absent from `applyDialogueEffects()`.

9. **Birchmother does not exist.** Referenced in the project memory doc as the
   final narrative encounter but absent from all code, config, and data files.

10. **Labyrinth entrance not shown on minimap.** The minimap system does not
    include spirit or labyrinth markers, making labyrinths impossible to find
    without the compass — which only shows after a spirit is within the loaded
    5x5 buffer ring.

---

## Verdict: Grovekeeper Path Is PARTIAL

The structural scaffolding is real and well-built. Spirits spawn correctly,
the maze generator produces navigable structures, the quest chain data is
correctly defined, the dialogue branching engine works, the compass renders,
and the quest panel displays. But the system cannot complete a single end-to-end
interaction: a player who enters a maze center will find a visually animated spirit
orb that they cannot interact with, that never triggers discovery, that has no
dialogue tree to load, and that never advances the main quest. The finish line
(`worldroot_reached`) has no trigger. The Grovekeeper Path exists as infrastructure
without activation.
