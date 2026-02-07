# Core Game Loop

Grovekeeper is a cozy 2.5D isometric tree-planting simulation with idle tending mechanics. The core loop follows five repeating phases:

```text
EXPLORE --> PLANT --> TEND --> HARVEST --> EXPAND & UNLOCK
                         ^                         |
                         |_________________________|
```

## Session Design

Target session length: 3--15 minutes (commute-friendly). The game never punishes the player for being away. Trees grow while the app is closed via the offline growth calculator.

A typical session flows like this:

1. **Load save** -- instant on mount, restored from `localStorage` via Zustand `persist` middleware (key: `grove-keeper-save`).
2. **Offline growth catch-up** -- `calculateAllOfflineGrowth()` advances every tree based on elapsed real time (capped at 24 hours). Season multiplier is averaged to 1.0 and water state resets to `false`.
3. **Harvest-ready trees** -- any tree at stage 3 (Mature) or 4 (Old Growth) can be harvested for species-specific resource yields.
4. **Plant new seeds** -- select Trowel, pick a species from SeedSelect, tap an empty soil tile.
5. **Water thirsty saplings** -- Watering Can on stage 0--2 trees grants a 1.3x growth multiplier until next stage transition.
6. **Check progress** -- quest panel tracks active goals; achievement popups fire automatically.
7. **Auto-save on exit** -- grove is serialized to `localStorage` on `visibilitychange` (tab hidden) and on pause.

## One-Handed Play

The game is designed for one-handed mobile play:

- **Left thumb** controls the virtual joystick (nipplejs, bottom-left 200x200px zone).
- **Right thumb** taps the context action button, tool belt, or HUD elements.
- All touch targets are at least 44x44px.
- No simultaneous multi-finger gestures required.

There is no urgency. No timers penalize the player. No resources decay. Growth is always positive or zero (winter halts non-evergreen trees but does not regress them).

## Screen Flow

```text
App.tsx
  +-- Game.tsx (screen router)
        |
        +-- screen === "menu"    --> MainMenu.tsx
        |                             | onStartGame()
        |                             v
        |                         RulesModal (first time only)
        |
        +-- screen === "playing" --> GameScene.tsx (lazy-loaded)
                                      |
                                      +-- BabylonJS Engine + Scene (via SceneManager)
                                      +-- Game loop (engine.runRenderLoop)
                                      +-- 8 scene managers (Camera, Lighting, Ground, Sky, Player, Tree, Border)
                                      +-- GameUI overlay (HUD, joystick, dialogs)
```

`Game.tsx` manages the screen state (`"menu" | "playing"`) from the Zustand store. `GameScene` is dynamically imported via `React.lazy()` to keep the initial bundle under 110 KB (gzipped). The full game bundle loads at approximately 500 KB total.

## Game Loop (per frame)

Inside `GameScene.tsx`, the BabylonJS render loop executes these systems each frame:

| Order | System | Description |
|-------|--------|-------------|
| 1 | `updateTime(dt)` | Advance game clock, compute season, time of day, light values |
| 2 | `updateWeather(...)` | Roll for weather events using seeded RNG when check interval elapses |
| 3 | `growthSystem(dt, season, weatherMult)` | Advance tree growth progress, handle stage transitions |
| 4 | `staminaSystem(dt)` | Regenerate stamina at 2/sec when idle |
| 5 | `harvestSystem(...)` | Track harvest cooldowns, mark trees as harvestable |
| 6 | `movementSystem(dt)` | Move player entity based on joystick / WASD input |
| 7 | Achievement check | Compare player stats against 15 achievement triggers |
| 8 | Mesh sync | Update tree mesh scales, positions, and materials from ECS state |
| 9 | Sky + lighting | Apply time-of-day and seasonal colors to scene clearColor, lights |

All systems are pure functions that operate on the Miniplex ECS world. Side effects (toast notifications, achievement popups) are deferred via `queueMicrotask()` to avoid mutations during Zustand `set()` calls.

## State Architecture

| Store | Technology | Contents | Lifecycle |
|-------|-----------|----------|-----------|
| ECS (Miniplex) | `world` singleton | Entity positions, growth progress, tile states, mesh refs | In-memory; serialized to Zustand on save |
| Zustand (`gameStore`) | `persist` middleware | Level, XP, coins, resources, unlocks, settings, grove snapshot | Auto-persisted to `localStorage` |

**Rule of thumb:** if it changes every frame, it lives in ECS. If it persists across sessions, it lives in Zustand.

## Save / Load

- **Save trigger:** `visibilitychange` event (app backgrounded), pause menu, or manual save.
- **Save format:** `groveData` in Zustand contains serialized trees (species, grid position, stage, progress, watered, meshSeed) and player position.
- **Load flow:** On `GameScene` mount, check `groveData` in store. If present, call `deserializeGrove()` to recreate ECS entities and meshes from the snapshot.
- **Offline growth:** Elapsed real-time seconds since last save are computed, then `calculateAllOfflineGrowth()` advances each tree. Capped at 86,400 seconds (24 hours).

## Source Files

| File | Role |
|------|------|
| `src/game/Game.tsx` | Screen router, quest refresh, rules modal |
| `src/game/scenes/GameScene.tsx` | BabylonJS scene orchestrator, game loop (~400 lines, delegates to scene managers) |
| `src/game/stores/gameStore.ts` | Zustand persistent state and actions |
| `src/game/systems/offlineGrowth.ts` | Offline growth calculator |
| `src/game/systems/growth.ts` | Per-frame growth system |
