**Historical -- superseded by [`docs/plans/2026-03-07-unified-game-design.md`](2026-03-07-unified-game-design.md)**
*Gap analysis performed before the unified design was created. Retained for historical reference.*

---

# Grovekeeper: Comprehensive Gap Analysis

**R3F/Expo Migration vs BabylonJS Archive**
**Date:** 2026-03-06
**Status:** Superseded (2026-03-07)
**Method:** Deep source-file reads of both codebases, line-by-line comparison

---

## Executive Summary

The migration successfully ported the **visual layer** (scene, camera, lighting, sky, ground, tree geometry, entity meshes) and the **data layer** (game systems as pure functions, ECS world, Zustand store, config JSONs). However, the **integration layer** — the glue that makes these parts a playable game — is almost entirely missing.

**By the numbers:**

| Metric | BabylonJS Archive | R3F/Expo | Delta |
|--------|-------------------|----------|-------|
| Source files (non-test) | 184 | 94 | -49% |
| UI components | 38 | 12 | -68% |
| Scene managers/components | 11 | 8 | -27% |
| Game loop lines | ~350 (in GameScene) | 0 | -100% |
| Player interactions | 12 types | 0 | -100% |
| Test files | ~21 | 49 | +133% |
| Tests passing | ~755 | 963 | +28% |
| Config JSON files | 9 | 18 | +100% |
| Store actions | ~50 | 60+ | +20% |

**Core diagnosis:** The game looks beautiful but doesn't play. You can move a player capsule around a rendered grove with trees, NPCs, lighting, and sky — but you cannot plant, water, harvest, build, trade, or interact with anything.

---

## MACRO Level: Critical Gaps

### M1. No Game Loop / System Runner (SEVERITY: CRITICAL)

**What the BabylonJS version does:** `GameScene.tsx` lines 729-930 run a 200-line game loop every frame via `SceneManager.startRenderLoop()`:
- `updateTime(deltaMs)` — advances microsecond clock
- `updateWeather(state, time, season, seed)` — weather state machine
- `movementSystem(direction, dt)` — player position updates
- `growthSystem(dt, season, weatherMult)` — tree growth progression
- `staminaSystem(dt)` — stamina regeneration
- `harvestSystem(dt)` — harvest cooldown timers
- `checkAchievements(stats)` — achievement condition checks
- `updateNpcMovement(id, x, z, dt)` — NPC AI pathing
- `playerGovernor.update(dt)` — autopilot governor
- `inputManager.update()` — path following tick
- Weather visual sync, cherry blossom petal toggle, player tile detection

**What the R3F version does:** `useFrame` hooks exist in 9 components but ONLY for visual interpolation (camera follow, mesh position lerp, sky uniform updates). No game systems are called. Time never advances. Trees never grow. Weather never changes. Stamina never regenerates.

**What's needed:** A `useGameLoop` hook that calls all game systems per frame inside the R3F Canvas, or a `useEffect` + `setInterval` outside Canvas for non-visual systems.

### M2. No Player Interaction (SEVERITY: CRITICAL)

**What the BabylonJS version does:** ~400 lines of interaction logic:
- Tap-to-plant (seed selection → grid placement → ECS entity creation → mesh spawn)
- Tap-to-water (stamina drain → watered flag → visual feedback)
- Tap-to-harvest (harvest check → yield calculation → resource collection → floating particle)
- Tap-to-prune (stamina drain → pruned flag → harvest multiplier)
- Tap-to-build (structure placement → grid validation → mesh spawn)
- Tap-to-interact-NPC (proximity check → dialogue system → trade/quest)
- Radial action menu (context-sensitive per tile state)
- Walk-to-act (pathfind → walk → arrive → show radial)

**What the R3F version does:** Nothing. The Canvas renders entities but has no raycasting, no tap detection, no interaction handlers. The `ActionButton` component exists in the HUD but `onOpenTools` is `() => {}` (empty callback, line 104 of app/game/index.tsx).

**What's needed:** R3F raycaster integration (`useThree` + `pointer` events on meshes), or a `Raycaster` component wrapping the canvas for tap-to-select. Plus all the game action handlers.

### M3. No Persistence Pipeline (SEVERITY: CRITICAL)

**What the BabylonJS version does:**
- `saveGroveToStorage()` serializes ECS trees + player position to localStorage
- `loadGroveFromStorage()` deserializes on app start
- Debounced auto-save every 1 second after changes
- `visibilitychange` event triggers emergency save
- Offline growth calculated on restore (`calculateAllOfflineGrowth`)

**What the R3F version does:**
- `saveLoad.ts` still uses `localStorage` directly (lines 145, 152) — **does not work on React Native**
- `db/schema.ts` defines `saves` + `settings` tables in expo-sqlite
- `db/client.ts` creates drizzle connection
- `hydrateFromDb()` action exists in gameStore but is **never called**
- No auto-save logic
- No offline growth on resume

**What's needed:** Replace localStorage calls with expo-sqlite queries, wire `hydrateFromDb` into app startup, add auto-save on state changes + AppState background event.

### M4. Missing Audio for Native (SEVERITY: HIGH)

**What the BabylonJS version does:**
- `AudioManager.ts` uses Web Audio API (`AudioContext`, `OscillatorNode`, `GainNode`)
- Procedural SFX: plant, water, harvest, achievement, click, level-up
- Called from GameScene on every interaction

**What the R3F version does:**
- Same `AudioManager.ts` exists (Web Audio API) — **won't work on React Native** (no AudioContext)
- Never called from any component or hook
- No `expo-av` or `expo-audio` in dependencies
- No Tone.js (user explicitly mentioned wanting evaluation)

**What's needed:** Either (a) `expo-av` for preloaded sound assets, or (b) Tone.js for procedural audio synthesis on native. The Web Audio API approach only works on web.

---

## MESO Level: Subsystem Gaps

### MS1. Missing UI Components (26 of 38)

| Component | BabylonJS | R3F | Status |
|-----------|-----------|-----|--------|
| AchievementPopup | Yes | Yes | Exists, not triggered |
| ActionButton | Yes | Yes | Exists, empty onPress |
| HUD | Yes | Yes | Simplified version |
| MainMenu | Yes | Yes | Minimal (Play button only) |
| PauseMenu | Yes | Yes | Works, not opened from game |
| ResourceBar | Yes | Yes | Works |
| StaminaGauge | Yes | Yes | Exists, not wired |
| TimeDisplay | Yes | Yes | Exists, time never advances |
| Toast | Yes | Yes | Module exists, never called |
| ToolBelt | Yes | Yes | Exists, not wired |
| XPBar | Yes | Yes | Works |
| **BatchHarvestButton** | Yes | **No** | Missing |
| **BuildPanel** | Yes | **No** | Missing |
| **ErrorBoundary** | Yes | **No** | Missing (Expo Router has one) |
| **FarmerMascot** | Yes | **No** | Missing (SVG mascot "Fern") |
| **FloatingParticles** | Yes | **No** | Missing (+XP, +Timber overlays) |
| **GameUI** | Yes | **No** | Missing (orchestrator wrapping HUD + overlays) |
| **Logo** | Yes | **No** | Missing (SVG logo) |
| **MiniMap** | Yes | **No** | Missing (canvas mini-map) |
| **MiniMapOverlay** | Yes | **No** | Missing |
| **MobileActionButtons** | Yes | **No** | Missing (plant/water/harvest) |
| **NewGameModal** | Yes | **No** | Missing (new grove dialog) |
| **NpcDialogue** | Yes | **No** | Missing (NPC conversation UI) |
| **PlacementGhost** | Yes | **No** | Missing (structure preview) |
| **QuestPanel** | Yes | **No** | Missing (active quest tracker) |
| **RadialActionMenu** | Yes | **No** | Missing (context menu on tap) |
| **RulesModal** | Yes | **No** | Missing (first-time tutorial) |
| **SeedSelect** | Yes | **No** | Missing (species picker) |
| **StatsDashboard** | Yes | **No** | Missing |
| **ToolWheel** | Yes | **No** | Missing (tool picker dialog) |
| **TradeDialog** | Yes | **No** | Missing (NPC trading) |
| **TutorialOverlay** | Yes | **No** | Missing (tutorial highlights) |
| **VirtualJoystick** | Yes | **No** | Missing (mobile movement) |
| **WeatherForecast** | Yes | **No** | Missing (weather HUD widget) |
| **WeatherOverlay** | Yes | **No** | Missing (CSS rain/drought effects) |

### MS2. Store Actions: Wired vs Orphaned

The store has 60+ actions. Here's their integration status:

**Wired (called from UI or systems):**
- `setScreen` — called from game screen (onOpenMenu)
- `setSelectedTool` — unused in R3F
- XP/level display — read by HUD

**Orphaned (exist but never called from running code):**
- `addXp`, `addCoins`, `addResource`, `spendResource` — no interaction triggers these
- `incrementTreesPlanted/Harvested/Watered/Matured` — no planting/harvesting
- `saveGrove`, `loadGrove` — no save/load pipeline
- `expandGrid` — no grid expansion UI
- `performPrestige` — no prestige UI
- `unlockTool`, `unlockSpecies` — called from `addXp` chain but XP never added
- `trackSpeciesPlanted/Growth/Harvest` — never called
- `tickEvents`, `advanceEventChallenge`, `resolveEncounter` — never called
- `refreshAvailableChains`, `startQuestChain`, `advanceQuestObjective` — never called
- `updateEconomy`, `recordMarketTrade`, `purchaseMerchantOffer` — never called
- `upgradeToolTier` — never called
- `setBuildMode`, `addPlacedStructure` — never called
- `discoverZone`, `setCurrentZoneId` — never called
- `hydrateFromDb` — never called

**This means ~95% of the store's business logic is dead code in production.**

### MS3. Scene Components: Present vs Missing

**Present and functional:**
- Camera.tsx — over-the-shoulder perspective, smooth follow
- Lighting.tsx — ambient + directional, day/night intensity
- Sky.tsx — custom ShaderMaterial with hemispherical gradient
- Ground.tsx — biome-colored plane with grid overlay
- Player.tsx — capsule mesh, position from ECS
- TreeInstances.tsx — full SPS geometry, caching, scale lerp
- NpcMeshes.tsx — capsule per NPC, function-type colors
- SelectionRing.tsx — breathing pulse torus (exists but not triggered)

**Missing from BabylonJS:**
- **BorderTreeManager** — decorative trees outside playable grid
- **BlockMeshFactory** — Daggerfall-style structure meshes
- **PlacementGhost** — transparent preview mesh during build mode
- **ModelLoader** — GLTF model loading pipeline
- **GroundBuilder biome blending** — BabylonJS used DynamicTexture for multi-biome blending; R3F uses flat color

### MS4. World/Zone System: Not Connected

- `WorldGenerator.ts` — 432 lines of procedural generation, tested (12 tests), **never called**
- `WorldManager.ts` — zone loading/unloading, **never called**
- `ZoneLoader.ts` — ECS entity hydration from JSON, tested (10 tests), **never called**
- `starting-world.json` — zone definitions exist, **never loaded**
- Zone transitions, multi-zone gameplay — **completely missing**

The game screen hardcodes a single `gridSize` from the store with no zone awareness.

### MS5. NPC System: Visually Present, Logically Dead

- NPCs render as colored capsules (NpcMeshes.tsx reads from ECS)
- `NpcBrain.ts` (Yuka AI) exists with GoalEvaluator-based decision making — **never ticked**
- `NpcManager.ts` has spawning and adjacency logic — **never called**
- `npcMovement.ts` has movement system — **never called**
- No NPC dialogue, trading, or quest-giving UI
- `npcs.json` and `dialogues.json` config files exist but are disconnected

---

## MICRO Level: Per-File Analysis

### Scene Components (Micro)

| File | Lines | Quality | Issues |
|------|-------|---------|--------|
| Camera.tsx | 109 | Good | No orbit controls for desktop; no pinch-to-zoom for mobile |
| Lighting.tsx | 72 | Good | Shadow map resolution not responsive; no shadow bias tuning |
| Sky.tsx | 129 | Good | Custom shader works; no star rendering for night |
| Ground.tsx | 127 | Fair | Flat color plane; no biome texture blending like BabylonJS DynamicTexture |
| Player.tsx | 56 | Fair | Capsule only; no character model; no rotation to face movement direction |
| TreeInstances.tsx | 106 | Good | Geometry caching works; no LOD; no instance mesh batching |
| NpcMeshes.tsx | 67 | Fair | Capsule only; no distinct NPC models |
| SelectionRing.tsx | 55 | Good | Visual works; not connected to any interaction |

### Game Systems (Micro)

| File | Lines | Tested | Called from game loop | Called from store | Called from UI |
|------|-------|--------|----------------------|-------------------|----------------|
| growth.ts | 95 | Yes (20 tests) | No | No | No |
| harvest.ts | 115 | Yes (28 tests) | No | No | No |
| stamina.ts | 39 | Yes (16 tests) | No | set/spend in store | No |
| time.ts | 190 | Yes (21 tests) | No | setGameTime in store | Read for visuals |
| weather.ts | 160 | Yes (21 tests) | No | No | No |
| achievements.ts | 420 | Yes (20 tests) | No | unlockAchievement | No |
| prestige.ts | 130 | Yes (24 tests) | No | performPrestige | No |
| gridExpansion.ts | 65 | Yes (20 tests) | No | expandGrid | No |
| levelUnlocks.ts | 55 | Yes (17 tests) | No | Called from addXp | No |
| offlineGrowth.ts | 60 | Yes (15 tests) | No | No | No |
| saveLoad.ts | 175 | Yes (18 tests) | No | No | No |
| pathfinding.ts | 100 | Yes (19 tests) | No | No | No |
| pathFollowing.ts | 55 | Yes (11 tests) | No | No | No |
| discovery.ts | 45 | Yes (10 tests) | No | No | No |
| recipes.ts | 85 | Yes (24 tests) | No | No | No |
| trading.ts | 70 | Yes (18 tests) | No | No | No |
| seasonalMarket.ts | 55 | Yes (16 tests) | No | No | No |
| toolUpgrades.ts | 70 | Yes (22 tests) | No | upgradeToolTier | No |
| wildTreeRegrowth.ts | 50 | Yes (14 tests) | No | No | No |
| zoneBonuses.ts | 55 | Yes (19 tests) | No | No | No |
| npcMovement.ts | 50 | Yes (15 tests) | No | No | No |
| supplyDemand.ts | 65 | Yes (16 tests) | No | recordMarketTrade | No |
| marketEvents.ts | 60 | Yes (16 tests) | No | updateEconomy | No |
| travelingMerchant.ts | 75 | Yes (20 tests) | No | purchaseMerchantOffer | No |
| AudioManager.ts | 350 | Yes (14 tests) | No | No | No |

**Summary: 25 systems exist as tested pure functions. Zero are called from any running code path.**

### UI Components (Micro)

| File | Lines | Accessibility | Touch Targets | Animation |
|------|-------|---------------|---------------|-----------|
| HUD.tsx | 77 | accessibilityLabel on buttons | 44x44 min | None |
| PauseMenu.tsx | 263 | accessibilityRole="switch" on toggle | 44x44 min | Modal fade |
| ResourceBar.tsx | ~60 | Labels present | N/A (display only) | Reanimated shared values |
| XPBar.tsx | ~40 | None | N/A (display only) | None |
| StaminaGauge.tsx | ~30 | None | N/A (display only) | None |
| TimeDisplay.tsx | ~45 | None | N/A (display only) | None |
| ActionButton.tsx | ~35 | accessibilityLabel | 44x44 | None |
| AchievementPopup.tsx | ~50 | None | Close button 44x44 | None (should have gold sparkle) |
| Toast.tsx | ~40 | None | N/A | None (should slide in/out) |
| ToolBelt.tsx | ~55 | accessibilityLabel | 44x44 buttons | None |
| MainMenu.tsx (app/index.tsx) | 32 | None | 44px min-height | None (should have enter animation) |

### Database Layer (Micro)

| File | Lines | Status | Issues |
|------|-------|--------|--------|
| db/schema.ts | 14 | Exists | Only 2 tables (saves, settings); no migration runner |
| db/client.ts | 7 | Exists | Connection works; no error handling |
| db/index.ts | 2 | Exists | Re-exports only |
| drizzle.config.ts | exists | Exists | Config for drizzle-kit |

**Missing:** Query functions (insertSave, getSave, upsertSetting, getSetting), migration runner, startup hydration, auto-save middleware.

---

## Library Gap Analysis

### Currently Missing Libraries

| Library | Purpose | Current Alternative | Recommendation |
|---------|---------|--------------------|----------------|
| **@react-three/rapier** | Physics (tree falling, wind sway, leaf particles) | None | ADD — gives free wind animation, harvest physics, particle systems |
| **@react-three/postprocessing** | Bloom, vignette, depth-of-field | None | ADD — bloom on Ghost Birch glow, vignette for cozy mood, DOF for tilt-shift |
| **anime.js** | Complex UI animations (menus, popups, transitions) | react-native-reanimated only | ADD — better for sequenced UI animations (achievement sparkle, level-up fanfare) |
| **Tone.js** | Procedural audio synthesis | Web Audio API (broken on native) | ADD — replaces AudioManager.ts with native-compatible synthesis |
| **expo-haptics** | Haptic feedback on plant/water/harvest | None (Capacitor removed) | ADD — trivial integration, huge mobile feel improvement |
| **expo-av** | Sound file playback | None | ADD as fallback — preloaded SFX assets alongside Tone.js |
| **expo-font** | Custom font loading (Fredoka, Nunito) | None | ADD — fonts referenced in Tailwind config but never loaded |
| **expo-linear-gradient** | Gradient backgrounds | None | NICE-TO-HAVE — sunset sky, menu backgrounds |
| **lottie-react-native** | Complex vector animations | None | NICE-TO-HAVE — achievement celebration, loading screen |
| **react-native-gesture-handler** | Advanced gestures (pinch zoom, pan) | Basic Pressable | Already in expo; need explicit config for pinch-to-zoom on camera |
| **moti** | Declarative Reanimated animations | Raw Reanimated | NICE-TO-HAVE — cleaner animation API for UI |
| **@shopify/react-native-skia** | 2D canvas (mini-map, weather overlays) | None | EVALUATE — could replace SVG mini-map with GPU-accelerated 2D |

### Libraries Present but Underutilized

| Library | Current Usage | Potential |
|---------|--------------|-----------|
| **react-native-reanimated** | ResourceBar shared values | Should drive ALL UI animations (toast slide, menu transitions, XP pop) |
| **react-native-svg** | In deps, unused | Mini-map, logo, mascot SVG |
| **@react-three/drei** | In deps, unused | OrbitControls, Stars, Float, useTexture, Billboard, Text |
| **yuka** | NpcBrain.ts exists | Never ticked; needs game loop integration |
| **miniplex-react** | react.ts hooks exist | Entity components could use useEntities for reactive rendering |
| **drizzle-orm** | Schema defined | No queries, no migration, no hydration |
| **expo-sqlite** | Client created | Never read or written |

---

## Player Experience Paper Playtest

### Flow 1: App Launch → Main Menu

**Current experience:**
1. App opens → green screen with "Grovekeeper" title, tagline, "Play" button
2. Tap "Play" → navigates to `/game`

**Gaps:**
- No loading screen or splash animation
- No "Continue" vs "New Game" distinction (always starts fresh)
- No save slot selection
- No settings access from main menu
- No version/credits
- No FarmerMascot "Fern" character (existed in BabylonJS)
- No logo SVG
- No music on menu screen
- No entry animation (should fade in or slide up)
- Button is a `View` inside `Link`, not a proper `Pressable` — no press feedback

### Flow 2: Game Screen (Current State)

**Current experience:**
1. Canvas renders with trees, ground, sky, NPCs, player capsule
2. WASD (web) or touch drag (native via useInput) moves the player
3. HUD shows: ResourceBar (all zeros), XPBar (Level 1, 0%), tool selector (empty callback), menu button
4. That's it. Nothing else happens.

**Gaps:**
- Time never advances (clock frozen)
- Trees never grow (no growth system running)
- Weather never changes (no weather system running)
- No tool interaction (plant/water/harvest/prune buttons do nothing)
- No seed selection dialog
- No stamina display in game
- No quest panel
- No mini-map
- No weather overlay
- No floating particles on actions
- No achievement popups (achievements never checked)
- No NPC interaction (walk up to NPC — nothing happens)
- No joystick for mobile (only keyboard or raw touch drag)
- No save/load (progress lost on close)
- No tutorial for first-time players
- No pause menu access (menu button sets screen to "paused" but PauseMenu not rendered)
- No build mode
- No zone transitions

### Flow 3: Planting a Tree (COMPLETELY MISSING)

**BabylonJS flow:**
1. Select trowel tool → tool belt highlights
2. Tap tile → radial menu appears with "Plant" option
3. Select "Plant" → seed selection dialog opens
4. Pick species → tree entity created in ECS, mesh spawns with growth animation
5. XP awarded, floating "+10 XP" particle, haptic feedback, audio SFX
6. Achievement check (First Seed planted?)

**R3F flow:** None of these steps exist.

### Flow 4: Harvesting (COMPLETELY MISSING)

**BabylonJS flow:**
1. Walk near mature tree (stage 3-4)
2. Tap tree → radial menu with "Harvest" option
3. Harvest → yield calculated with late-binding multipliers (season, structure bonuses, pruned state)
4. Resources added to inventory, floating particle "+3 Timber"
5. Harvest cooldown starts, tree shows "not ready" indicator
6. Audio SFX, haptic feedback

**R3F flow:** None of these steps exist.

### Flow 5: NPC Trading (COMPLETELY MISSING)

**BabylonJS flow:**
1. Walk near NPC (proximity detection)
2. Action button changes to "Talk"
3. Tap → NPC dialogue opens with greeting
4. Trade option → TradeDialog with buy/sell interface
5. Quest option → accept quest, QuestPanel updates

**R3F flow:** NPCs render as capsules but cannot be interacted with.

### Flow 6: Prestige (COMPLETELY MISSING)

**BabylonJS flow:**
1. Reach level 25+ → prestige option appears in PauseMenu
2. Confirm → store resets with prestige bonus applied
3. WorldGenerator creates new procedural world
4. Cosmetic border unlocked
5. 3 prestige species become available

**R3F flow:** PauseMenu exists but prestige UI is not implemented. Store has `performPrestige()` but it's never callable.

### Flow 7: Grid Expansion (PARTIALLY WIRED)

**BabylonJS flow:**
1. Reach required level → "Expand" option in PauseMenu
2. Spend coins → grid expands (16→20→24→32)
3. Ground mesh rebuilds, new tiles created

**R3F flow:** Store has `expandGrid()` which works. No UI to trigger it. No ground mesh update on expansion.

---

## Shader & Visual Polish Opportunities

### Current Shaders
- **Sky.tsx**: Single custom ShaderMaterial — hemispherical gradient with season tinting. Works well.

### Missing Visual Effects

| Effect | BabylonJS Status | R3F Status | Library Recommendation |
|--------|-----------------|------------|----------------------|
| Ghost Birch night glow | Implemented (emissive material) | Not implemented | Custom ShaderMaterial with emissive + time uniform |
| Crystal Oak prismatic tints | Implemented (seasonal color shift) | Not implemented | MeshPhysicalMaterial with iridescence |
| Cherry blossom petals | CSS overlay | Not implemented | @react-three/postprocessing or RN Skia |
| Weather rain effect | CSS overlay | Not implemented | Particle system in R3F or RN overlay |
| Weather drought haze | CSS overlay | Not implemented | Postprocessing vignette + color shift |
| Windstorm effect | CSS overlay | Not implemented | Camera shake + tree sway via @react-three/rapier |
| Bloom on achievements | None | Not implemented | @react-three/postprocessing EffectComposer |
| Tilt-shift DOF | None | Not implemented | @react-three/postprocessing DOF |
| Shadow quality | 1024/512px | Default | drei SoftShadows or PCF tuning |
| Ambient occlusion | None | Not implemented | @react-three/postprocessing SSAO |
| Day/night sky stars | None | Not implemented | drei Stars component |
| Fog transitions | None | Basic (Lighting.tsx) | Three.js FogExp2 with seasonal density |
| Tree wind sway | None | Not implemented | Vertex shader animation or @react-three/rapier |

### R3F Ecosystem Components (drei) Not Used

These are available in `@react-three/drei` (already in deps) but unused:

| Component | Use Case |
|-----------|----------|
| `Stars` | Night sky star field |
| `Float` | Gentle bobbing on NPCs or selection ring |
| `Billboard` | Floating text labels on trees/NPCs |
| `Text` | 3D text for damage numbers / resource gains |
| `useTexture` | PBR texture loading (bark, leaf) |
| `OrbitControls` | Desktop camera orbit |
| `ContactShadows` | Soft ground shadows without shadow maps |
| `Environment` | HDRI environment lighting |
| `Sparkles` | Achievement/prestige particle effects |
| `Cloud` | Weather cloud rendering |
| `useAnimations` | GLTF animation playback |
| `Instances` | Instanced mesh rendering (more efficient than current approach) |
| `Bvh` | Bounding volume hierarchy for faster raycasting |

---

## Comparative Strengths

### Where R3F Version is BETTER

1. **Test coverage** — 963 tests vs ~755. Every system has comprehensive tests.
2. **Pure function architecture** — All systems are engine-agnostic. Can switch renderers without touching game logic.
3. **Config externalization** — 18 JSON config files vs 9. More data-driven.
4. **Type safety** — Stricter TypeScript, comprehensive interfaces.
5. **Declarative scene** — React components instead of imperative manager classes. Easier to reason about.
6. **Cross-platform potential** — Expo runs web + iOS + Android from one codebase.
7. **Store completeness** — 60+ actions covering every game system including new systems (events, quest chains, supply/demand, species discovery).
8. **Tree geometry** — 980-line SPS port is a complete, tested Three.js implementation.
9. **Modern deps** — React 19, Expo 55, Three.js 0.183, latest everything.

### Where BabylonJS Version is BETTER

1. **Actually playable** — Complete game loop, all interactions work.
2. **Rich UI** — 38 components covering every game screen and dialog.
3. **Audio** — Procedural SFX on every interaction.
4. **Haptics** — Capacitor bridge for native feedback.
5. **Save/load** — Working persistence with offline growth.
6. **Weather visuals** — CSS overlays for rain, drought, windstorm.
7. **NPC system** — Dialogue, trading, quest-giving all functional.
8. **Zone transitions** — Multi-zone world navigation works.
9. **Prestige loop** — Full prestige → world regeneration → cosmetic unlock flow.
10. **Tutorial** — RulesModal for first-time players.

---

## Priority Recommendations

### P0: Make It Playable (Blocks Everything Else)

1. **Create `useGameLoop` hook** — Runs inside `<Canvas>` via `useFrame`, calls all game systems each frame
2. **Create `useInteraction` hook** — R3F raycasting for tap-to-select tiles/trees/NPCs
3. **Wire persistence** — Replace localStorage with expo-sqlite queries, add auto-save, add startup hydration
4. **Add mobile joystick** — nipplejs or custom gesture handler for touch movement

### P1: Core Gameplay UI

5. **SeedSelect dialog** — Species picker for planting
6. **ToolWheel/ToolBelt interaction** — Tool selection UI
7. **RadialActionMenu** — Context-sensitive actions on tap
8. **FloatingParticles** — +XP, +Timber feedback
9. **QuestPanel** — Active quest tracker
10. **WeatherOverlay** — Rain/drought/wind visual effects

### P2: Enrichment Libraries

11. **expo-haptics** — Haptic feedback on actions
12. **expo-font** — Load Fredoka + Nunito
13. **@react-three/postprocessing** — Bloom, vignette, DOF
14. **@react-three/rapier** — Physics for wind sway, falling trees, particles
15. **Tone.js** — Native-compatible procedural audio
16. **anime.js** — Sequenced UI animations

### P3: Polish

17. **drei components** — Stars, Float, Billboard, Sparkles, ContactShadows
18. **NPC dialogue + trading UI**
19. **Tutorial/onboarding flow**
20. **Mini-map**
21. **Build mode UI**
22. **Prestige UI in PauseMenu**

---

## Conclusion

The R3F/Expo migration successfully decomposed the BabylonJS monolith into clean, testable, declarative layers. The pure function game systems are excellent — better tested and more maintainable than the original. The Three.js tree geometry port is complete and correct.

However, the migration stopped at the **visual and data layers**. The critical **integration layer** — the game loop, player interactions, persistence, and gameplay UI — was never built. The result is a well-architected, well-tested codebase that renders a beautiful scene but isn't a game yet.

**The path forward is clear:** Wire the existing systems together. The hard work (pure function systems, ECS, store, tree geometry, scene components) is done. What remains is plumbing — a game loop hook, interaction handlers, persistence queries, and UI dialogs that call the store actions that already exist.
