# Finish Grovekeeper — Comprehensive Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Make Grovekeeper fully playable from start to finish — a complete survival RPG with dark forest aesthetic, 14 Grovekeeper labyrinths, and the entire economy/crafting/combat loop.

**Architecture:** Survival-only game (NO exploration mode). 4 difficulty tiers (Seedling/Sapling/Hardwood/Ironwood). Config-driven multipliers. Delta-only persistence. 14 Grovekeepers = game spine.

**Tech Stack:** Expo SDK 55, R3F 9 + drei 10, Miniplex 2.x ECS, Legend State 3.x (expo-sqlite), Tone.js, NativeWind 4, TypeScript 5.9 strict, pnpm, Biome 2.4, Jest

**Master Source Documents:**
- `docs/plans/2026-03-07-unified-game-design.md` — THE game design (12 phases)
- `docs/plans/2026-03-07-ux-brand-design.md` — Brand identity + 21st.dev research
- `components/ui/tokens.ts` — Design tokens (partially implemented)
- `docs/GAME_SPEC.md` — Spec sections (needs alignment with unified doc)

---

## Block 0: Spec Alignment (Foundation)

**Why first:** Everything references GAME_SPEC.md. It currently has Exploration mode in §37. Must align with unified doc.

### Task 0.1: Remove Exploration Mode from GAME_SPEC.md

**Files:**
- Modify: `docs/GAME_SPEC.md` — §37 game modes section

**Steps:**
1. Remove all references to "exploration mode" from §37
2. Replace with "Survival — The Only Mode" per unified doc §3
3. Update difficulty tiers: Seedling(7♥)/Sapling(5♥)/Hardwood(4♥)/Ironwood(3♥)
4. Update the difficulty key names: seedling/sapling/hardwood/ironwood (NOT gentle/standard/harsh)
5. Remove §39.3 stale gap list items that are already fixed
6. Update spec status markers for sections that are implemented

### Task 0.2: Update difficulty.json Config

**Files:**
- Modify: `config/game/difficulty.json`

**Steps:**
1. Ensure keys are `seedling`, `sapling`, `hardwood`, `ironwood` (NOT gentle/standard/harsh)
2. Match multipliers from unified doc §3:
   - Seedling: hearts=7, growth=1.0, yield=1.0, weather=0.5, stamina=1.0
   - Sapling: hearts=5, growth=0.8, yield=0.75, weather=1.0, stamina=1.3
   - Hardwood: hearts=4, growth=0.6, yield=0.5, weather=1.5, stamina=1.6
   - Ironwood: hearts=3, growth=0.4, yield=0.3, weather=2.0, stamina=2.0

---

## Block 1: Dark Forest Brand Foundation

**Why before UI:** All UI blocks depend on having the correct tokens/fonts available.

### Task 1.1: Complete Design Tokens

**Files:**
- Modify: `components/ui/tokens.ts` — Verify all tokens from UX brand doc §2-4 are present
- Modify: `config/theme.json` — Replace POC colors with dark forest palette

**Steps:**
1. Verify tokens.ts has: DARK colors, ACCENT colors, SEASONAL overrides, FONTS, TYPE scale, SPACE, RADIUS, HUD_PANEL
2. If any are missing, add them per UX brand doc §2-4
3. Update config/theme.json to use dark forest palette (bgDeep=#0D1F0F, bgCanopy=#1A3A1E, etc.)

### Task 1.2: Install Fonts

**Files:**
- Modify: `package.json` — Add expo-google-fonts for Cinzel, Cabin, JetBrains Mono
- Modify: `app/_layout.tsx` — Load fonts at app root

**Steps:**
1. `pnpm add @expo-google-fonts/cinzel @expo-google-fonts/cinzel-decorative @expo-google-fonts/cabin @expo-google-fonts/jetbrains-mono`
2. Wire font loading in _layout.tsx with useFonts()
3. Remove Fredoka references

---

## Block 2: Core UI Rewrites (Parallel — 4 agents)

### Task 2.1: Rewrite NewGameModal (SURVIVAL ONLY)

**Files:**
- Rewrite: `components/game/NewGameModal.tsx`

**Design (from unified doc §3 + UX brand doc §9):**
- Remove `GameMode` type entirely — no exploration/survival toggle
- Remove `ModeButton` component entirely
- Difficulty type: `"seedling" | "sapling" | "hardwood" | "ironwood"` (NOT gentle/standard/harsh)
- Flow: Seed Phrase → Difficulty Tier → Start
- Dark background: `bgDeep` (#0D1F0F)
- Cinzel for "New Grove" heading
- 2x2 grid of tier cards with heart icons
- Permadeath toggle for Hardwood (optional) and Ironwood (forced)
- Config: `NewGameConfig = { worldSeed, difficulty, permadeath }`

**21st.dev patterns (from UX brand doc §12):**
- HudStatus pattern for tier cards (gradient border + variant colors)
- Dark panel with corner notch

### Task 2.2: Rewrite MainMenu (Dark Forest RPG)

**Files:**
- Rewrite: `components/game/MainMenu.tsx`
- Remove: `components/game/FarmerMascot.tsx` (cute POC element)
- Modify: `components/game/Logo.tsx` — Cinzel Decorative wordmark

**Design (from UX brand doc §8):**
- Dark background: bgDeep (#0D1F0F)
- "GROVEKEEPER" in Cinzel Decorative, text-primary (#E8F0E9)
- Tagline in Cabin italic, text-secondary (#9CB89F)
- Buttons: primary (accent-sap gradient), ghost (border-branch)
- Save preview card when save exists (seed phrase, level, day, season, trees, species)
- No farmer mascot. No cute green gradient. DARK FOREST RPG.
- Version text in text-muted at bottom

### Task 2.3: Add Hearts + Hunger to HUD

**Files:**
- Modify: `components/game/HUD.tsx`
- Create: `components/game/HeartsDisplay.tsx`
- Create: `components/game/HungerBar.tsx`

**Design (from UX brand doc §7c + unified doc §3):**
- Hearts: Row of heart icons below resource bar. Count from difficulty tier (3-7).
  - Filled = current, empty = missing
  - Critical (<2): pulse red, shadow-glow-ember
  - Read from survivalState store (hearts field)
- Hunger: Thin horizontal bar (12px) under hearts
  - Color: accent-amber → accent-ember as emptying
  - 10 visible segments
  - Read from survivalState store (hunger field)

### Task 2.4: Create Death Screen

**Files:**
- Create: `components/game/DeathScreen.tsx`
- Create: `components/game/PermadeathScreen.tsx`
- Modify: `app/game/index.tsx` — Mount death screens

**Design (from UX brand doc §11):**
- DeathScreen: Dark overlay 80%, "YOU HAVE FALLEN" in Cinzel accent-ember
  - Cause of death, day, stats, resources lost
  - [Return to Fire] primary button → respawn at last campfire
- PermadeathScreen: Full black, slow particle fall
  - "The forest reclaims what was lost."
  - Seed phrase, full session stats
  - [Share Your Grove] + [Begin New Grove]

---

## Block 3: Missing UI Panels (Parallel — 3 agents)

### Task 3.1: Create CookingPanel

**Files:**
- Create: `components/game/CookingPanel.tsx`
- Modify: `app/game/index.tsx` — Mount it

**Design:**
- Panel shows available recipes (campfire recipes first, cooking pot recipes if structure built)
- Each recipe: icon, name, ingredients with counts, effect description
- Cook button: enabled only if player has ingredients + is near campfire/cooking pot
- Dark forest panel styling (tokens from UX brand doc §5)
- Read recipes from `game/systems/recipes/catalog.ts`

### Task 3.2: Create ForgingPanel

**Files:**
- Create: `components/game/ForgingPanel.tsx`
- Modify: `app/game/index.tsx` — Mount it

**Design:**
- Panel shows available smelting + tool upgrade recipes
- Tab system: Smelt | Upgrade
- Smelt tab: Iron Ingot, Charcoal, Refined Stone, Grove Essence Infusion
- Upgrade tab: current tool → next tier (Basic → Iron → Grovekeeper)
- Requirements shown: materials + structure requirement (must be near Forge)
- Dark forest panel styling

### Task 3.3: Mount NpcDialogue + TradeDialog

**Files:**
- Modify: `app/game/index.tsx` — Import and mount NpcDialogue, TradeDialog

**Steps:**
1. Import NpcDialogue from `components/game/NpcDialogue.tsx`
2. Mount it in the overlay layer (after HUD, before PauseMenu)
3. Import TradeDialog from `components/game/TradeDialog.tsx`
4. Mount TradeDialog in overlay layer
5. Wire NPC interaction to show dialogue (from useInteraction onNpcTap)

---

## Block 4: Camera, Spawn, and Terrain Fixes (1 agent)

### Task 4.1: Fix Camera Look (Keyboard Fallback)

**Files:**
- Modify: `game/hooks/useMouseLook.ts`

**Steps:**
1. Add arrow key support (Left/Right for yaw, Up/Down for pitch)
2. Add Q/E keys for horizontal rotation
3. Export a `setLookDirection(yaw, pitch)` function for debug bridge
4. Keep pointer lock as primary, keyboard as fallback
5. Both write to the same camera.rotation target

### Task 4.2: Fix Player Spawn Position

**Files:**
- Modify: `components/player/PlayerCapsule.tsx`

**Steps:**
1. Spawn at `[8, 15, 8]` (higher Y to ensure clear of terrain)
2. Add ECS position sync on first frame (PlayerCapsule → ECS entity)

### Task 4.3: Fix Terrain Visibility

**Files:**
- Modify: `components/scene/Lighting.tsx` — Increase ambient minimum
- Modify: `components/scene/TerrainChunk.tsx` — Verify vertex colors aren't too dark

**Steps:**
1. In Lighting.tsx, set ambient minimum to 0.25 (was 0.15)
2. In TerrainChunk.tsx, ensure vertex colors have a minimum brightness floor
3. Check fog near distance — if too close, terrain right under camera is fogged out

---

## Block 5: Debug Bridge + E2E Testing (1 agent)

### Task 5.1: Enhance Debug Bridge

**Files:**
- Modify: `game/debug/useDebugBridge.ts`
- Modify: `game/debug/bridgeActions.ts`
- Modify: `game/debug/bridgeQueries.ts`

**Steps:**
1. Add `teleport(x, y, z)` — moves Rapier body + ECS position
2. Add `setTime(hour)` — sets gameTimeMicroseconds
3. Add `lookAt(yaw, pitch)` — calls setLookDirection from useMouseLook
4. Add `queryEntities(type)` — returns entity arrays by type (trees, npcs, structures, etc.)
5. Add `executeAction(actionId, params)` — dispatches game actions programmatically
6. Add `getStructureDetails(entityId)` — returns full structure info

### Task 5.2: Create Playwright E2E Test

**Files:**
- Create: `e2e/governor-playtest.spec.ts`
- Modify: `playwright.config.ts`

**Steps:**
1. Launch game via Playwright (web build)
2. Wait for `window.__GROVEKEEPER__` to be available
3. Use bridge to: verify ECS stats, teleport, set time, check survival state
4. Validate: terrain chunks > 0, player entity exists, survival bars functional
5. No pointer lock needed — all via bridge API

---

## Block 6: System Wiring (Sequential after Block 0)

### Task 6.1: Wire Difficulty Multipliers Throughout

**Files:**
- Modify: `game/hooks/useGameLoop/tickSurvival.ts`
- Modify: `game/systems/weather.ts`
- Modify: `game/systems/offlineGrowth.ts`
- Modify: `game/actions/treeActions.ts`

**Steps:**
1. Read difficulty from store (set at game start by NewGameModal)
2. Load multipliers from `getDifficultyConfig(difficulty)` (from `config/game/difficulty.json`)
3. Apply to: hunger drain rate, heart count, growth speed, harvest yield, weather severity, stamina costs

### Task 6.2: Wire Death/Respawn Flow

**Files:**
- Modify: `game/hooks/useGameLoop/tickSurvival.ts`
- Modify: `game/stores/survivalState.ts`
- Modify: `game/stores/core.ts`

**Steps:**
1. When isPlayerDead() returns true, set store `screen` to "death"
2. DeathScreen reads cause from store, shows stats
3. "Return to Fire" button calls handleDeath() which resets health/hunger, teleports to last campfire
4. Ironwood death: set screen to "permadeath", show permanent stats, [Begin New Grove] → main menu

### Task 6.3: Wire Cooking/Forging Actions

**Files:**
- Modify: `game/actions/actionDispatcher.ts`
- Modify: `game/hooks/useInteraction/actionHandlers.ts`

**Steps:**
1. COOK action: check player near campfire/cooking pot, deduct ingredients, apply food effects
2. FORGE action: check player near forge, deduct materials, create item
3. SMELT action: check player near forge, deduct ore+fuel, create ingot
4. UPGRADE_TOOL action: check player near forge, deduct materials, upgrade tool tier

---

## Execution Order

```
Block 0 (Spec Alignment) ──► immediately, first
Block 1 (Brand Foundation) ──► immediately, parallel with Block 0
Block 2 (UI Rewrites) ──► after Block 1 completes (needs tokens/fonts)
Block 3 (UI Panels) ──► parallel with Block 2
Block 4 (Camera/Terrain) ──► immediately, independent
Block 5 (Debug/E2E) ──► immediately, independent
Block 6 (System Wiring) ──► after Block 0 (needs correct difficulty keys)
```

**Agents dispatched in parallel:**
1. **spec-agent** — Block 0 (spec alignment + difficulty config)
2. **brand-agent** — Block 1 (tokens, fonts, theme)
3. **newgame-agent** — Block 2.1 (NewGameModal rewrite)
4. **mainmenu-agent** — Block 2.2 (MainMenu rewrite)
5. **hud-agent** — Block 2.3 (Hearts + Hunger in HUD)
6. **death-agent** — Block 2.4 (Death screens)
7. **cooking-agent** — Block 3.1 (CookingPanel)
8. **forging-agent** — Block 3.2 (ForgingPanel)
9. **dialogue-agent** — Block 3.3 (Mount NpcDialogue + TradeDialog)
10. **camera-agent** — Block 4 (Camera, spawn, terrain fixes)
11. **debug-agent** — Block 5 (Debug bridge + E2E)
12. **wiring-agent** — Block 6 (System wiring)

---

## What "Finished" Means

Per unified doc §14, the FULL game requires phases 0-11. This plan covers the **critical path to playable**:

- [x] Player can start new game (survival-only, 4 tiers)
- [ ] Player sees dark forest RPG aesthetic (not POC green)
- [ ] Player has hearts + hunger display
- [ ] Player can die and respawn (or permadeath)
- [ ] Player can cook food at campfire
- [ ] Player can forge tools at forge
- [ ] Player can talk to NPCs
- [ ] Player can trade with NPCs
- [ ] Camera works with keyboard (no pointer lock needed)
- [ ] Terrain is visible (not dark)
- [ ] E2E test validates full loop
- [ ] All systems wire to difficulty multipliers

This gets the game from "tech demo" to "playable RPG." Subsequent phases (Phase 4-11 of unified doc) build on this foundation.
