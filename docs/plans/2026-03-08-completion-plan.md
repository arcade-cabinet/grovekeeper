# Grovekeeper Completion Plan

**Date:** 2026-03-08 (updated evening)
**Goal:** Feature-complete per GAME_SPEC.md (46 sections), all systems wired, all UI mounted, all tests passing, all lint clean.
**Method:** Parallel agent teams in git worktrees to avoid context exhaustion.

---

## Current State (updated 2026-03-08 evening)

- **4,105 tests passing, 0 failing** across 178 suites (up from 4,019 at session start)
- FPS perspective: **complete** (FPSCamera, PlayerCapsule, ProceduralToolView, TouchLookZone, TargetInfo all mounted)
- Core game loop: fully operational (time, weather, growth, stamina, harvest, NPC, achievement, events)
- Survival systems: hearts, hunger, death/respawn, difficulty multipliers all wired
- Combat: enemy AI, pathfinding, loot tables, ProceduralEnemies all operational + mounted
- Audio: Tone.js ambient + tool SFX live (audio test failures now resolved)
- Persistence: Legend State + expo-sqlite functional
- Procedural world: terrain, water, buildings, vegetation, fences, grass, hedges all generating + mounted
- **CookingPanel, ForgingPanel, BuildPanel: NOW MOUNTED** in `app/game/index.tsx` (was P0 gap, resolved)
- Dialogue branching: complete, NpcDialogue mounted, dialogueBridge active

## Resolved Since Plan Creation

### P0: UI Panels Not Mounted -- RESOLVED
- `CookingPanel.tsx` -- **MOUNTED** via `resolvePanelState(activeCraftingStation)` in game screen
- `ForgingPanel.tsx` -- **MOUNTED** via same mechanism
- `BuildPanel.tsx` -- **MOUNTED** via same mechanism
- Trigger: `actionDispatcher` sets `activeCraftingStation` on campfire/forge/build interaction

### P1: Code Quality -- PARTIALLY RESOLVED
- Biome lint errors reduced (exact count TBD, many fixed by agent runs)
- Files over 300 lines decomposed during system work (useGameLoop/, useInteraction/, buildingGeometry/, etc.)

### P5: Spec Sync -- RESOLVED
- §39 updated with accurate test counts, wiring status, and gap list
- Priority phases marked with current completion status
- Config file references corrected (dialogue-trees.json, not dialogues.json)

## Remaining Gaps

### P1-B: Unmounted UI Components (20+)
These components exist in `components/game/` with full implementations but are NOT rendered by any mounted parent:
- **Gameplay-blocking:** FastTravelMenu, QuestPanel, FishingPanel, MiniMap, ToolWheel, WeatherOverlay
- **Polish-level:** AchievementPopup, HungerBar, StaminaGauge (bar), ToolBelt, XPBar, StatsDashboard, RulesModal, FloatingParticles, ErrorBoundary, WeatherForecast, VirtualJoystick, MobileActionButtons, RadialActionMenu, BatchHarvestButton, ActionButton
- **GameUI orchestrator** (`components/game/GameUI/`) was designed to consolidate these but is not imported by `app/game/index.tsx`

### P2: UI Dark RPG Restyle
- PauseMenu has dark forest RPG aesthetic (completed)
- SeedSelect, ToolWheel, QuestPanel, LoadingScreen, Settings still need matching restyle
- HUD elements: VirtualJoystick, ActionButton, AchievementPopup styling

### P3: Orphaned Systems (12)
Tested but not imported by any non-test production code:
- recipes/, seasonalMarket, discovery, seasonalEffects, baseRaids, spatialHash, zoneBonuses, gridGeneration, lootSystem, NativeAudioManager, weatherParticles, ambientParticles
- Also: treeScaleSystem.ts (not wired)

### P3-B: Missing UI for Existing Systems
- **No codex/discovery UI** -- species discovery tracked in store but no player panel
- **No quest chain UI** -- QuestPanel exists but not mounted
- **SpeechBubble not mounted** -- R3F component exists but not used by ChibiNpc

### P4: Polish
- FPS camera head bob
- Number key (1-9) tool slot selection via InputManager
- AIProvider for automated testing
- Legacy scene components (Camera.tsx, Ground.tsx, SelectionRing.tsx, Player.tsx) to be deleted

### P4-B: Config/Code Mismatches
- `config/game/achievements.json` exists but never loaded (achievements hardcoded in `game/systems/achievements/core.ts`)
- `config/game/npcs.json` exists but NpcManager loads from `game/npcs/data/npcs.json`

---

## Agent Team Tracks

### Track 1: UI Mounting & Game Flow Wiring -- PARTIALLY COMPLETE
**Completed:** CookingPanel, ForgingPanel, BuildPanel mounted. Action dispatch wired.
**Remaining:** Mount FastTravelMenu, QuestPanel, FishingPanel, MiniMap, ToolWheel, WeatherOverlay. Consider mounting GameUI orchestrator to consolidate.
**Worktree:** `track-1-ui-mounting`

### Track 2: Biome Lint Cleanup -- IN PROGRESS
**Scope:** Fix remaining Biome errors. Run `pnpm check --write` then verify no imports stripped.
**Worktree:** `track-2-lint-cleanup`

### Track 3: UI Dark RPG Restyle
**Scope:** Apply dark forest RPG aesthetic (matching PauseMenu style) to remaining UI components.
**Worktree:** `track-3-ui-restyle`

### Track 4: Missing Features -- PARTIALLY COMPLETE
**Completed:** Fishing system (`fishing.ts` + `FishingPanel.tsx`), Mining system (`mining.ts`), Base building system (`kitbashing/` + `BuildPanel.tsx`). All have tests.
**Remaining:** Wire FishingPanel mount trigger. Wire orphaned systems (lootSystem, weatherParticles, ambientParticles, baseRaids). Build codex/discovery UI.
**Worktree:** `track-4-features`

### Track 5: FPS Polish
**Scope:** Head bob, number-key tool select, AIProvider, config/game/input.json.
**Worktree:** `track-5-fps-polish`

### Track 6: Spec Sync & Integration Audit -- COMPLETE
**Completed:** §39 updated, all test counts verified, config file references fixed, documentation catch-up done.

---

## Merge Strategy

Tracks merge in dependency order:
1. Track 2 (lint) -- no conflicts, merge first
2. Track 5 (FPS polish) -- independent, merge second
3. Track 1 (UI mounting) -- may touch game screen, merge third
4. Track 3 (UI restyle) -- touches UI components, merge fourth
5. Track 4 (features) -- new features, merge fifth

All merges to `feat/expo-migration` branch.
