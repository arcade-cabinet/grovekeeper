# Tutorial & User Flow System -- Complete Design Document

This document specifies every screen, modal, transition, and tutorial step in
Grovekeeper's first-time user experience and ongoing player flow. All layouts
target 375px portrait (iPhone SE) as the minimum viewport. Desktop (768px+) is
a graceful enhancement.

**Canonical spec:** [`docs/plans/2026-03-07-unified-game-design.md`](../plans/2026-03-07-unified-game-design.md) Section 12.

**Key design changes (2026-03-07):**
- Survival-only (no exploration mode). 4 difficulty tiers: Seedling/Sapling/Hardwood/Ironwood.
- Tutorial is now a Pokemon-style in-world village departure (not grid-based step sequence).
- Tutorial Village is handcrafted at chunk (0,0), not a separate mode.
- Player wakes up, learns tools from Elder Rowan, meets Blossom, departs through village gate.
- 20+ progressive hints replace the old post-tutorial system.

**Platform:** React Native (Expo) with react-three-fiber, NativeWind, Legend
State. All wireframes use React Native primitives (`View`, `Text`, `Pressable`,
`Modal`, `ScrollView`). No web-only APIs.

---

## Table of Contents

1. [Main Menu](#1-main-menu)
2. [New Game Modal](#2-new-game-modal)
3. [Loading Screen](#3-loading-screen)
4. [Interactive Tutorial](#4-interactive-tutorial)
5. [Post-Tutorial Progressive Hints](#5-post-tutorial-progressive-hints)
6. [Pause Menu Flow](#6-pause-menu-flow)
7. [Prestige Flow](#7-prestige-flow)
8. [Error States](#8-error-states)
9. [Seed Word Lists](#9-seed-word-lists)
10. [Loading Screen Flavor Text](#10-loading-screen-flavor-text)
11. [Config Schemas](#11-config-schemas)
12. [Component List](#12-component-list)
13. [Accessibility](#13-accessibility)

---

## 1. Main Menu

### 1.1 Current State

`components/game/MainMenu.tsx` (315 lines) renders a card-based menu over a
`LinearGradient` background. It includes `Logo`, `FarmerMascot`, floating leaf
particles, and tree silhouette SVGs. Buttons: "Continue Grove" (if save exists)
and "Start Growing" / "New Grove".

### 1.2 Revised Layout

The existing MainMenu is well-built. Changes are additive, not replacement.

#### Mobile (375px portrait)

```
+---------------------------------------+
|                                       |
|  [Left Tree SVG]     [Right Tree SVG] |
|        (floating leaf particles)      |
|                                       |
|   +-------------------------------+   |
|   |         (gradient bg)         |   |
|   |                               |   |
|   |       [Logo SVG, 160px]       |   |
|   |                               |   |
|   |    [FarmerMascot, 80px]       |   |
|   |       (shadow ellipse)        |   |
|   |                               |   |
|   |  "Every forest begins with    |   |
|   |      a single seed."          |   |
|   |                               |   |
|   |  [=== Continue Grove ===]  *  |   |
|   |  [--- New Grove ---]       *  |   |
|   |  [--- Settings ---]          |   |
|   |                               |   |
|   |  "42 trees planted so far"    |   |
|   +-------------------------------+   |
|                                       |
|         Grovekeeper v0.1.0            |
+---------------------------------------+

* "Continue Grove" only shown if save exists (treesPlanted > 0)
* If no save, "New Grove" is styled as primary (filled green)
```

#### Desktop (768px+)

Same card layout, centered. Card maxWidth remains 340px. The surrounding
gradient area is larger, allowing more space for the tree silhouettes and
floating particles. No layout changes needed -- the card pattern scales
gracefully.

### 1.3 New Elements

#### Settings Button

Add a third button below "New Grove":

```typescript
<Button
  className="min-h-[48px] w-full rounded-xl"
  variant="outline"
  style={{
    borderColor: `${C.barkBrown}60`,
    borderWidth: 1,
    backgroundColor: "transparent",
  }}
  onPress={onSettings}
>
  <Text className="text-sm font-medium" style={{ color: C.barkBrown }}>
    Settings
  </Text>
</Button>
```

Settings opens a lightweight modal with sound/haptics toggles and a "Credits"
section. This reuses the Settings tab content from `PauseMenu.tsx`.

#### Background

The existing `LinearGradient` with `skyMist -> leafLight -> forestGreen` plus
the SVG tree silhouettes and floating leaf particles is sufficient. No 3D scene
on the main menu -- it would increase load time and battery drain for a screen
the player sees for 2-5 seconds.

#### Audio

On menu mount, if `soundEnabled` is true, begin playing a looping ambient
nature soundscape (birds chirping, gentle wind, distant water). Volume: 30%.
Crossfade into in-game music on scene transition. Implementation via the
existing `AudioManager` system.

### 1.4 Button Behavior

| Button          | Condition            | Action                                          |
|-----------------|----------------------|--------------------------------------------------|
| Continue Grove  | `treesPlanted > 0`   | `setScreen("playing")`, navigate to `/game`      |
| New Grove       | Always visible       | Opens `NewGameModal`                             |
| Settings        | Always visible       | Opens `SettingsModal` (sound, haptics, credits)  |

### 1.5 Animation

- **Floating leaves**: 5 leaf particles (existing), looping drift with opacity
  fade. Respects `reduceMotion`.
- **Mascot bounce**: Existing 2-second `ease-in-out` vertical bounce on Fern.
  Respects `reduceMotion`.
- **Card entrance**: On mount, the card slides up from 20px below with 300ms
  ease-out opacity fade. Uses `react-native-reanimated` `FadeInUp`.

### 1.6 Props Changes to MainMenu

```typescript
export interface MainMenuProps {
  treesPlanted: number;
  onContinue: () => void;
  onNewGrove: () => void;
  onSettings: () => void;  // NEW
}
```

---

## 2. New Game Modal

### 2.1 Current State

`components/game/NewGameModal.tsx` (274 lines) exists with a 5-tier difficulty
selector. Needs update to 4-tier survival system (Seedling/Sapling/Hardwood/Ironwood).
Not yet wired into the main menu flow.

### 2.2 Revised Design

The New Game Modal needs: seed phrase section, 4-tier survival difficulty
(replaces old 5-tier explore/normal/hard/brutal/ultra-brutal), and wiring
into the main menu.

#### Difficulty Tiers (Survival Only -- No Exploration Mode)

| Tier | Hearts | Growth | Yield | Weather | Permadeath | Target |
|------|--------|--------|-------|---------|-----------|--------|
| Seedling | 7 | 1.0x | 1.0x | 0.5x | No | First playthrough |
| Sapling | 5 | 0.8x | 0.75x | 1.0x | Optional | Standard |
| Hardwood | 4 | 0.6x | 0.5x | 1.5x | Optional | Experienced |
| Ironwood | 3 | 0.4x | 0.3x | 2.0x | Forced | One life |

"Sapling" has a "Recommended" badge.

#### Mobile Layout (375px portrait)

```
+---------------------------------------+
|           (50% black overlay)         |
|   +-------------------------------+   |
|   |     bg-sky-mist, rounded-2xl  |   |
|   |                               |   |
|   |     "Plant Your First Seed"   |   |
|   |    (Fredoka, lg, bold, soil)  |   |
|   |                               |   |
|   | -- World Seed ---------------  |   |
|   | +---------------------------+ |   |
|   | | "Gentle Mossy Hollow"     | |   |
|   | | [Shuffle btn]  [Edit btn] | |   |
|   | +---------------------------+ |   |
|   |  (text-xs: "This phrase      |   |
|   |   shapes your world")        |   |
|   |                               |   |
|   | -- Difficulty ---------------  |   |
|   | [Seedling] [Sapling*]        |   |
|   | [Hardwood] [Ironwood]        |   |
|   |                               |   |
|   | -- Description Panel --------  |   |
|   | | (icon) Sapling             | |   |
|   | | The standard experience... | |   |
|   | | Hearts: 5 | Growth: 0.8x  | |   |
|   | | Yield: 0.75x| Weather: 1x | |   |
|   | +---------------------------+ |   |
|   |                               |   |
|   | -- Permadeath Toggle --------  |   |
|   | | Permadeath     [toggle]    | |   |
|   | | (forced on for Ironwood)   | |   |
|   | +---------------------------+ |   |
|   |                               |   |
|   | [Cancel]  [Begin Your Grove]  |   |
|   +-------------------------------+   |
+---------------------------------------+

* = "Recommended" badge on Normal
```

### 2.3 Seed Phrase Section

#### Visual Design

A rounded white card within the modal, containing:
- The generated seed phrase in Fredoka Medium, 16px, soil-dark color
- A shuffle button (dice icon) on the right side
- An edit button (pencil icon) that switches to a `TextInput`
- Helper text below: "This phrase shapes your world"

#### Shuffle Button

```typescript
<Pressable
  className="min-h-[44px] min-w-[44px] items-center justify-center rounded-full"
  style={{ backgroundColor: `${FOREST_GREEN}15` }}
  onPress={() => setSeedPhrase(generateSeedPhrase())}
  accessibilityLabel="Generate new world seed"
>
  <Icon as={DicesIcon} size={18} className="text-forest-green" />
</Pressable>
```

Each press calls `generateSeedPhrase()` from `game/utils/seedWords.ts`, which
produces a new "Adjective Adjective Noun" phrase. The display animates with a
brief 150ms crossfade.

#### Manual Input Mode

Tapping the edit button replaces the display text with a `TextInput`:

```typescript
<TextInput
  value={seedPhrase}
  onChangeText={setSeedPhrase}
  placeholder="Type a custom seed..."
  maxLength={60}
  className="flex-1 text-base font-medium text-soil-dark"
  style={{ fontFamily: "Fredoka" }}
  returnKeyType="done"
  autoCorrect={false}
  autoCapitalize="words"
/>
```

A "Done" button or pressing Return closes the input and confirms the custom
seed. Any string works -- the hash function in `seedWords.ts` handles arbitrary
input.

#### Initial State

On modal open, generate a seed phrase with `generateSeedPhrase()`. Store it in
local component state. The seed is passed to `onStart(difficulty, permadeath,
seedPhrase)`.

### 2.4 Props Changes to NewGameModal

```typescript
export interface NewGameModalProps {
  open: boolean;
  difficultyTiers: DifficultyTier[];
  initialSeedPhrase: string;              // NEW
  onClose: () => void;
  onStart: (
    difficulty: string,
    permadeath: boolean,
    seedPhrase: string,                    // NEW
  ) => void;
}
```

### 2.5 Wiring into Main Menu Flow

In `app/index.tsx`:

```typescript
const handleNewGrove = useCallback(() => {
  setNewGameModalOpen(true);
}, []);

const handleStartGame = useCallback((difficulty: string, permadeath: boolean, seed: string) => {
  setNewGameModalOpen(false);
  const store = useGameStore.getState();
  store.resetGame(seed);
  store.setWorldSeed(seed);
  // Store difficulty in game state (requires adding difficulty field)
  setScreen("playing");
  router.push("/game");
}, [router]);
```

---

## 3. Loading Screen

### 3.1 Rationale

World generation and asset loading typically complete in under 2 seconds on
modern devices. However, first-time loads may take longer due to font loading,
asset caching, and zone hydration. A loading screen provides visual continuity
between the menu and the game.

### 3.2 Implementation Strategy

The loading screen is NOT a separate route. It is a full-screen overlay
rendered by the game screen (`app/game/index.tsx`) while the R3F Canvas and
world systems initialize. Once the first frame renders and `useWorldLoader`
signals readiness, the overlay fades out.

### 3.3 Visual Design

#### Mobile Layout (375px portrait)

```
+---------------------------------------+
|                                       |
|         bg: LinearGradient            |
|         skyMist -> forestGreen/30     |
|                                       |
|                                       |
|           [Logo SVG, 120px]           |
|                                       |
|        [FarmerMascot, 60px]           |
|         (gentle bounce anim)          |
|                                       |
|                                       |
|    "Preparing your grove..."          |
|    (Fredoka, sm, barkBrown)           |
|                                       |
|   +-------------------------------+   |
|   |  [=========>          ]  60%  |   |
|   +-------------------------------+   |
|   progress bar: h-2, rounded-full     |
|   track: forestGreen/20               |
|   fill: forestGreen, animated         |
|                                       |
|                                       |
|   "Tip: Watered trees grow           |
|    30% faster!"                       |
|   (Nunito, xs, barkBrown/70)          |
|                                       |
|                                       |
|        Grovekeeper v0.1.0             |
+---------------------------------------+
```

### 3.4 Progress Tracking

The loading screen tracks 4 phases:

| Phase | Weight | Description                              |
|-------|--------|------------------------------------------|
| 1     | 20%    | Fonts loaded (`useFonts` complete)        |
| 2     | 30%    | Store hydrated (persistence ready)        |
| 3     | 30%    | Zone loaded (`useWorldLoader` complete)   |
| 4     | 20%    | First R3F frame rendered                  |

Progress is smoothed with lerp interpolation to prevent jumpy visual updates:

```typescript
const displayProgress = useRef(0);
// Each frame: displayProgress += (targetProgress - displayProgress) * 0.1
```

### 3.5 Flavor Text Rotation

A random tip from the flavor text pool (see Section 10) is selected on mount.
The tip rotates every 4 seconds if loading takes longer than expected. Text
transitions use a 200ms crossfade.

### 3.6 Transition Out

When all 4 phases complete (progress = 100%):

1. Hold at 100% for 300ms (satisfying completion feel)
2. Fade the overlay opacity from 1 to 0 over 400ms (`withTiming`)
3. Set overlay `display: none` / unmount after fade completes
4. If this is a new game AND `hasSeenRules` is false, show `RulesModal`

### 3.7 Component: `LoadingOverlay`

```typescript
// New file: components/game/LoadingOverlay.tsx

export interface LoadingOverlayProps {
  visible: boolean;
  progress: number;       // 0-1
  seedPhrase?: string;    // Show "Generating: Gentle Mossy Hollow"
}
```

Estimated size: ~120 lines.

---

## 4. Tutorial Village (Pokemon-Style Departure)

The tutorial IS the opening of the game. No modal overlays, no separate "tutorial
mode." The player wakes up in a handcrafted village at chunk (0,0) and learns by
doing. All gameplay. Zero modal screens.

**Total tutorial time: ~8-10 minutes.** Skip option available for experienced players.

### 4.1 Architecture

The tutorial is a state machine driven by `TutorialManager`. Tutorial state
lives in the game store:

```typescript
tutorialAct: -1,               // -1 = not started, 0-3 = active act, 4+ = departed
tutorialComplete: false,
```

Integration points:
- `TutorialOverlay.tsx` provides pulsing highlight ring for HUD targets
- `NpcDialogue.tsx` supports scripted dialogue sequences
- Toast system for non-blocking instruction delivery (toast-style callouts)
- Tutorial Village is handcrafted world data at chunk (0,0), not procedural

### 4.2 Tutorial Acts

#### Act 1: Waking Up (~2 minutes)

| # | What Happens | Player Action | Completion |
|---|-------------|---------------|------------|
| 1 | Fade in. Player is lying by a campfire. Elder Rowan stands nearby. | Wait for fade | Auto-advance |
| 2 | Elder Rowan: "Ah, you're awake. The forest brought you to us." | Watch dialogue | Dismiss dialogue |
| 3 | Camera control tutorial: "Look around" prompt | Swipe/mouse look (mobile) or mouse move (desktop) | Camera rotated 45+ degrees |
| 4 | Movement tutorial: "Walk to Elder Rowan" prompt | Move via joystick/WASD | Within 2 tiles of Elder Rowan |

#### Act 2: Learning Tools (~3 minutes)

| # | What Happens | Player Action | Completion |
|---|-------------|---------------|------------|
| 5 | Elder Rowan: "Every villager earns their keep. Here -- take these." Receive Basic Axe + Basic Trowel + Watering Can | Watch dialogue | Dismiss dialogue |
| 6 | "See that old oak? Show me you can fell it." Marked tree has golden ring. | Select Axe, approach tree, use action | Tree harvested (treesHarvested + 1) |
| 7 | Collect the timber. Resource bar in HUD lights up. | Pick up resources | Resources in inventory |
| 8 | "Good. Now plant something new in its place." | Select Trowel, plant White Oak seed | treesPlanted + 1 |
| 9 | "Water it. A thirsty tree grows slow." | Select Watering Can, water the seedling | treesWatered + 1 |

#### Act 3: Village Life (~2 minutes)

| # | What Happens | Player Action | Completion |
|---|-------------|---------------|------------|
| 10 | "Go speak with Blossom at the seed stall." NPC marker shown. | Walk to Blossom, interact | Dialogue with Blossom started |
| 11 | Blossom gives 2 extra seeds + teaches species info. | Watch dialogue | Dismiss dialogue |
| 12 | Quick HUD tour: stamina, hearts, XP bar, tool belt. Toast-style callouts, not blocking modals. | Observe | Auto-advance after 6s |

#### Act 4: The Departure (~2 minutes)

| # | What Happens | Player Action | Completion |
|---|-------------|---------------|------------|
| 13 | Return to Elder Rowan. He gives Leather Satchel + Worn Compass. | Walk to Elder Rowan, interact | Dismiss dialogue |
| 14 | "The forest is vast. There are... others out there. Older than this village. Older than memory." (first Grovekeeper hint, cryptic) | Watch dialogue | Dismiss dialogue |
| 15 | "Make camp before nightfall. The cold doesn't forgive." (survival hint) | Watch dialogue | Dismiss dialogue |
| 16 | Elder Rowan gestures toward village gate. Path leads to procedural wilderness. | Walk through the village gate | Player crosses gate boundary |
| 17 | Camera pulls back slightly. Village shrinks behind. Title card: "Every forest begins with a single seed." | Watch | Auto-advance after 4s, `tutorialComplete = true` |

### 4.3 Starting Gear (Received During Tutorial)

| Item | Given At | Purpose |
|------|----------|---------|
| Basic Axe | Act 2, step 5 | Chop trees (slow, low yield) |
| Basic Trowel | Act 2, step 5 | Plant seeds, dig |
| Watering Can | Act 2, step 5 | Water plants |
| 3 White Oak seeds | Act 2, step 5 | Starter species (only one you begin with) |
| 2 extra seeds | Act 3, step 11 | From Blossom |
| Leather Satchel | Act 4, step 13 | Inventory (small, upgradeable) |
| Worn Compass | Act 4, step 13 | Points home + nearest campfire |

### 4.4 Tutorial Village Layout (Handcrafted)

The Tutorial Village is always at chunk (0,0) with a forced Starting Grove biome
override in a 2-chunk radius. NOT procedurally generated.

- 4-5 buildings (GLB Farm structures): Elder Rowan's house, Blossom's seed stall,
  small barn, storage shed, well
- Campfire at village center (pre-built, serves as first fast travel point)
- Garden area with 2-3 pre-planted White Oak trees (one harvestable for tutorial)
- Village gate leading out to procedural wilderness
- Fences around perimeter (3DPSX fence GLBs)
- 3-4 NPCs with day/night schedules (Elder Rowan, Blossom, Bramble, Oakley)
- Notice board near village center

### 4.5 Skip Option

A "Skip Tutorial" button appears in the pause menu during the tutorial. Pressing
it:
1. Dumps all starter gear into inventory (Axe, Trowel, Watering Can, 5 seeds,
   Satchel, Compass)
2. Teleports player to village gate
3. Sets `tutorialComplete = true`
4. No confirmation needed -- experienced players know what they want

### 4.6 Visual Highlighting

Tutorial uses two highlighting systems:
- **Gold ring** (TutorialOverlay): pulsing ring on HUD elements or world targets
- **NPC markers**: floating icon above NPCs the player needs to visit

For world-space targets, project entity position to screen coordinates via R3F
camera and pass to TutorialOverlay.

### 4.7 Instruction Delivery

Instructions are delivered via NPC dialogue (primary) and toast-style callouts
(secondary). NOT modal overlays. The game is always playable during the tutorial.

Toast callouts appear as bottom-center pills:
- Background: `bg-[#3E2723]/90` (soil-dark at 90% opacity)
- Border: `border border-[#FFB74D]/30` (autumn-gold hint)
- Text: `Nunito`, `text-sm`, white
- Position: above bottom controls
- "Skip Tutorial" link: `text-xs`, `text-[#FFB74D]`

---

## 5. Post-Tutorial Progressive Hints

### 5.1 Hint System Design

After the tutorial completes, contextual hints appear as bottom-center toasts
when the player encounters a feature for the first time. Hints use the
existing `showToast()` system with type `"info"`.

### 5.2 Hint Triggers (20+ One-Time Tips)

Fire when player encounters features for the first time. 30-second global cooldown.

| Hint ID               | Trigger Condition                                    | Message                                                    |
|-----------------------|-----------------------------------------------------|------------------------------------------------------------|
| `first-night`         | `timeState.hour >= 20` first time                    | "Build a campfire before dark. Cold drains your hearts."   |
| `first-rain`          | Weather becomes `rain` first time                    | "Rain helps trees grow faster -- but stay warm."           |
| `first-drought`       | Weather becomes `drought` first time                 | "Drought! Water your trees to protect them."                |
| `first-windstorm`     | Weather becomes `windstorm` first time               | "Windstorm! Young trees may be damaged."                    |
| `first-level-up`      | Player reaches level 2                               | "New level! Check what you've unlocked."                    |
| `first-hunger-warn`   | `hunger < 30` first time                             | "Eat fruit or fish to keep your stamina regenerating."      |
| `first-species`       | New species discovered                               | "New species discovered! Check your codex."                 |
| `first-ore`           | Player near ore deposit first time                   | "You'll need a forge to work with ore. Craft one with stone." |
| `near-labyrinth`      | Player within 2 chunks of labyrinth entrance         | "Something ancient lies within..."                          |
| `first-npc-gift`      | Player gives gift to NPC first time                  | "Gifts build friendships. Friends offer better trades."     |
| `first-structure`     | Player places first structure                        | "Structures degrade over time. Maintain them with resources." |
| `first-death`         | Player dies first time                               | "You respawn at your last campfire. Dropped resources are recoverable." |
| `first-night-creature`| Night creature appears nearby                        | "Stay near light sources at night. The dark has teeth."     |
| `biome-border`        | Player approaching biome boundary                    | "The landscape changes ahead. Prepare for different conditions." |
| `first-campfire`      | Player places first campfire                         | "Campfires are fast travel points. Place them wisely."      |
| `first-weather-warn`  | Bramble warning triggers                             | "Bramble's warnings mean severe weather is coming -- find shelter." |
| `first-fishing-spot`  | Player near pond/water first time                    | "Craft a fishing rod to fish here. Ponds have rare materials too." |
| `first-grovekeeper`   | Player finds first Grovekeeper                       | "A dormant guardian... its trees are yours now."            |
| `compass-hint`        | Player uses compass first time                       | "Your compass points to the nearest campfire."              |
| `storage-built`       | Player builds Storage Chest                          | "Items in storage chests survive death."                     |
| `10-trees`            | `treesPlanted >= 10`                                 | "You're shaping the landscape. Keep going."                  |
| `first-village`       | Player discovers first procedural village            | "Villages have traders and quest-givers. Worth returning to." |
| `first-season-change` | `currentSeason` changes first time                   | "A new season! Each season affects growth differently."      |
| `first-mature-tree`   | Tree reaches stage 3 (Mature) first time             | "Your tree is mature! You can harvest it now."              |
| `first-old-growth`    | Tree reaches stage 4 (Old Growth) first time         | "Old Growth! This ancient tree gives the best yields."      |

All hints show once only (tracked in `seenHints` store array).

### 5.3 Tracking

Seen hints are stored in game state:

```typescript
// Added to gameStore initial state:
seenHints: [] as string[],
```

Each hint ID is appended to `seenHints` when displayed. The hint system checks
`!seenHints.includes(hintId)` before showing.

### 5.4 Frequency Control

- Maximum 1 hint per 30 seconds (global cooldown)
- Hints queue if multiple trigger simultaneously; only the first fires
- No hints during the tutorial (`tutorialComplete === false`)
- No hints during pause menu or modal overlays

### 5.5 Dismissal

Hints use the existing toast system and auto-dismiss after 2500ms. No "Don't
show again" button is needed because each hint only fires once.

### 5.6 Component: `HintManager`

```typescript
// New file: game/systems/hintManager.ts

export interface HintDefinition {
  id: string;
  message: string;
  condition: (state: GameState, prev: GameState) => boolean;
}

export const HINTS: HintDefinition[] = [
  // ... 14 hints as defined in the table above
];

export function checkHints(
  state: GameState,
  prevState: GameState,
  seenHints: string[],
  lastHintTime: number,
): string | null {
  if (Date.now() - lastHintTime < 30_000) return null;
  if (!state.tutorialComplete) return null;

  for (const hint of HINTS) {
    if (seenHints.includes(hint.id)) continue;
    if (hint.condition(state, prevState)) return hint.id;
  }
  return null;
}
```

Estimated size: ~100 lines.

---

## 6. Pause Menu Flow

### 6.1 Current State

`components/game/PauseMenu.tsx` (756 lines) has 3 tabs: Stats, Progress,
Settings. It includes achievements list, grid expansion, border cosmetics,
prestige, sound/haptics toggles, save export/import, how-to-play button,
and reset game.

### 6.2 Revised Tab Structure

Expand from 3 tabs to 4 tabs for better organization:

| Tab       | Contents                                                          |
|-----------|-------------------------------------------------------------------|
| Stats     | Level, XP, coins, trees, grid size, species/tools counts, difficulty badge, full stats dashboard link |
| Progress  | Achievements list, grid expansion, border cosmetics, prestige     |
| Settings  | Sound, haptics, reduced motion, save management (export/import)   |
| Help      | Tutorial replay, control reference, about/credits, version        |

#### Tab Bar Layout

```
+------------------------------------------+
| [Stats]  [Progress]  [Settings]  [Help]  |
+------------------------------------------+
```

Each tab label is `text-xs`, minimum 44px tap target. Active tab has a
`border-b-2 border-forest-green` indicator.

### 6.3 Help Tab Content

```
+------------------------------------------+
|  Help                                     |
|                                           |
|  +--------------------------------------+ |
|  | [BookOpen icon]  How to Play         | |
|  | Review the tutorial and tips.        | |
|  | [Replay Tutorial]                    | |
|  +--------------------------------------+ |
|                                           |
|  +--------------------------------------+ |
|  | Controls Reference                   | |
|  | Mobile: Joystick to move, tap to act | |
|  | Desktop: WASD to move, Space to act  | |
|  | 1-8: Select tools                    | |
|  | Esc: Open/close menu                 | |
|  +--------------------------------------+ |
|                                           |
|  +--------------------------------------+ |
|  | About Grovekeeper                    | |
|  | A cozy grove-tending sim.            | |
|  | "Every forest begins with a          | |
|  |  single seed."                       | |
|  |                                      | |
|  | Version: 0.1.0                       | |
|  | Made with care by [team]             | |
|  +--------------------------------------+ |
+------------------------------------------+
```

#### "Replay Tutorial" Button

Pressing this button:
1. Closes the pause menu
2. Sets `tutorialStep = 0` and `tutorialComplete = false`
3. The tutorial state machine begins from step 0

```typescript
const handleReplayTutorial = () => {
  const store = useGameStore.getState();
  store.setTutorialStep(0);
  store.setTutorialComplete(false);
  onClose(); // Close pause menu
};
```

### 6.4 Quick-Access Buttons

At the bottom of the pause menu, above "Continue Playing":

```
+------------------------------------------+
|                                           |
|  [Expand Grid (16->20)]     [Prestige]   |
|  (only if available)     (only if Lv25+) |
|                                           |
|  [====== Continue Playing ======]        |
|  [------ Return to Menu ------]          |
+------------------------------------------+
```

These are condensed versions of the Progress tab actions, providing 1-tap
access to the most common progression actions.

### 6.5 Stats Dashboard

The existing `StatsDashboard.tsx` component (linked from the Stats tab via
"Full Stats Dashboard" button) provides extended statistics. Content:

- Lifetime resources collected (timber, sap, fruit, acorns)
- Time played (derived from game time microseconds)
- Trees by species (using `speciesProgress` data)
- Discovery codex progress
- Quest chain completion stats
- Economy stats (trades made, merchant purchases)

---

## 7. Prestige Flow

### 7.1 Trigger

When the player reaches level 25, a golden toast appears:
"Prestige is unlocked! Reset for permanent bonuses."

The prestige option appears in:
1. The Progress tab of the Pause Menu (existing)
2. The quick-access buttons at the bottom of the Pause Menu (new)

### 7.2 Confirmation Flow

The existing 2-step confirmation in `PauseMenu.tsx` is well-designed:

**Step 1 -- Initial tap:**
Button shows "Prestige (Reset for Bonuses)"

**Step 2 -- Confirmation panel replaces the button:**
```
+----------------------------------------------+
| Prestige will reset your level, resources,    |
| seeds, and grove to start fresh. You keep     |
| achievements, lifetime stats, and gain        |
| permanent bonuses. Are you sure?              |
|                                               |
| [Confirm Prestige]  [Cancel]                  |
+----------------------------------------------+
```

### 7.3 Prestige Celebration Screen

After confirming prestige, before the world reloads, show a celebration
overlay (new component: `PrestigeCelebration.tsx`):

```
+---------------------------------------+
|                                       |
|      bg: black/80 overlay             |
|                                       |
|    [Sparkle animation ring]           |
|                                       |
|       "Prestige 2"                    |
|    (Fredoka, 3xl, prestige-gold)      |
|                                       |
|    +-----------------------------+    |
|    | Your Accomplishments:       |    |
|    | Trees Planted: 342          |    |
|    | Trees Harvested: 128        |    |
|    | Resources Gathered: 1,847   |    |
|    | Achievements: 12/15         |    |
|    | Zones Discovered: 4         |    |
|    +-----------------------------+    |
|                                       |
|    +-----------------------------+    |
|    | Bonuses Applied:            |    |
|    | +5% Growth Speed            |    |
|    | +10 Max Stamina              |    |
|    | Unlocked: Ghost Birch        |    |
|    +-----------------------------+    |
|                                       |
|    [Begin Anew]                       |
|    (forest-green, bold, rounded-xl)   |
|                                       |
+---------------------------------------+
```

### 7.4 Props

```typescript
// New file: components/game/PrestigeCelebration.tsx

export interface PrestigeCelebrationProps {
  visible: boolean;
  prestigeCount: number;
  stats: {
    treesPlanted: number;
    treesHarvested: number;
    totalResources: number;
    achievementsUnlocked: number;
    achievementsTotal: number;
    zonesDiscovered: number;
  };
  bonuses: {
    growthSpeedPct: number;
    staminaBonus: number;
    unlockedSpecies: string[];
  };
  onContinue: () => void;
}
```

Estimated size: ~150 lines.

### 7.5 Post-Prestige Flow

After tapping "Begin Anew":
1. `performPrestige()` executes (already implemented in gameStore)
2. Navigate to `/game` (or re-initialize the game screen)
3. Show loading overlay with seed preserved ("Regenerating your grove...")
4. World regenerates with the same seed but new procedural generation
5. Tutorial does NOT replay (player is experienced)

---

## 8. Error States

### 8.1 Current State

`GameErrorBoundary` (100 lines) catches React render errors and displays a
recovery UI. This is the foundation for all error handling.

### 8.2 Error State Designs

#### Save Corruption Recovery

Detected when store hydration fails (persistence throws) or when critical
state fields are `undefined`/`NaN`.

```
+---------------------------------------+
|         bg: #1a0e0a                   |
|                                       |
|    "Save Data Issue"                  |
|    (text-2xl, bold, white)            |
|                                       |
|    "Your save data couldn't be        |
|     loaded properly. You can try      |
|     to recover or start fresh."       |
|    (text-gray-400)                    |
|                                       |
|    [Try to Recover]                   |
|    (bg-forest-green)                  |
|                                       |
|    [Start Fresh]                      |
|    (bg-red-400, with confirmation)    |
|                                       |
|    "Your progress may be partially    |
|     restored from auto-save."         |
|    (text-xs, text-gray-600)           |
+---------------------------------------+
```

Implementation: In `usePersistence.ts`, wrap the hydration in a try-catch.
On failure, set a `saveCorrupted` flag. The game screen checks this flag and
renders the recovery UI instead of the game canvas.

"Try to Recover" resets only the corrupted fields to defaults while preserving
valid data. "Start Fresh" calls `resetGame()`.

#### Low Storage Warning

Triggered when `expo-sqlite` write fails or when the device reports low
storage via `FileSystem.getFreeDiskStorageAsync()`.

```
Toast: "Storage is running low. Your progress may not save properly."
Type: "warning"
```

This is a non-blocking toast. The game continues normally.

#### Performance Warning (Low FPS)

Tracked in the game loop. If average FPS drops below 20 for 5+ seconds:

```
Toast: "Performance is low. Try closing other apps."
Type: "warning"
```

Shown once per session. The game loop can optionally reduce quality (disable
shadows, reduce tree detail) if FPS stays below 25.

#### Network Error

Not currently applicable (offline-first game). Reserved for future online
features (leaderboards, cloud saves). When implemented:

```
Toast: "Couldn't connect to the server. Playing offline."
Type: "info"
```

### 8.3 Error Recovery Component

```typescript
// New file: components/game/SaveRecovery.tsx

export interface SaveRecoveryProps {
  onRecover: () => void;
  onReset: () => void;
  errorMessage?: string;
}
```

Estimated size: ~80 lines.

---

## 9. Seed Word Lists

The seed word system is already implemented in `game/utils/seedWords.ts` with
comprehensive word lists. The existing lists contain:

### 9.1 Adjectives (70 words, grouped by category)

**Texture & feel:** Mossy, Dewy, Misty, Silken, Velvety, Fuzzy, Downy,
Feathery, Woolly, Pebbly

**Light & color:** Golden, Silver, Amber, Rosy, Copper, Tawny, Dusky, Moonlit,
Sunlit, Dappled

**Temperature & season:** Warm, Cool, Frosty, Balmy, Crisp, Breezy, Gentle,
Mild, Brisk, Toasty

**Age & feeling:** Ancient, Young, Timeless, Sleepy, Dreamy, Quiet, Hushed,
Peaceful, Tranquil, Serene

**Nature-specific:** Verdant, Leafy, Blooming, Budding, Flowering, Tangled,
Winding, Climbing, Trailing, Whispering

**Sound & movement:** Rustling, Humming, Chirping, Murmuring, Babbling,
Swaying, Dancing, Drifting, Floating, Gliding

**Size & shape:** Tiny, Little, Hidden, Towering, Sprawling, Winding, Curling,
Round, Tall, Deep

### 9.2 Nouns (60 words, grouped by category)

**Trees & plants:** Oak, Birch, Pine, Willow, Maple, Cedar, Elm, Fern, Ivy,
Moss

**Forest features:** Grove, Hollow, Glen, Thicket, Glade, Copse, Dell, Meadow,
Clearing, Canopy

**Water features:** Brook, Creek, Pond, Spring, Rivulet, Pool, Falls, Mist,
Dew, Rain

**Earth features:** Stone, Pebble, Root, Bark, Stump, Log, Ridge, Knoll,
Hillock, Burrow

**Creatures:** Robin, Wren, Finch, Owl, Fox, Hare, Badger, Hedgehog, Squirrel,
Moth

**Magical/cozy:** Lantern, Ember, Hearth, Acorn, Seedling, Blossom, Petal,
Mushroom, Toadstool, Lichen

### 9.3 Generation

`generateSeedPhrase(entropy?)` uses a seeded Mulberry32 PRNG to pick two
distinct adjectives and one noun, producing phrases like:

- "Gentle Mossy Hollow"
- "Ancient Whispering Canopy"
- "Moonlit Babbling Brook"
- "Sleepy Golden Meadow"
- "Crisp Dappled Glade"

Total combinations: 70 x 69 x 60 = 289,800 unique seed phrases.

---

## 10. Loading Screen Flavor Text

Rotating tips shown during world generation. Each tip is a single sentence,
max 60 characters, in the game's cozy voice.

```typescript
export const LOADING_TIPS: string[] = [
  // Gameplay tips
  "Watered trees grow 30% faster.",
  "Pruning before harvest gives 1.5x yield.",
  "Each species has a favorite season.",
  "Evergreens keep growing through winter.",
  "Rain boosts growth for all your trees.",
  "Stamina regenerates while you rest.",
  "Old Growth trees give the best resources.",

  // Discovery tips
  "There are 15 tree species to discover.",
  "Explore new zones to find rare species.",
  "The seasonal market has rotating deals.",

  // Cozy lore
  "Every forest begins with a single seed.",
  "Fern always carries a spare seedling.",
  "The oldest oak remembers every season.",
  "Mushrooms grow best in dappled shade.",
  "Listen closely -- the grove hums at dawn.",

  // Mechanical tips
  "Tap objects to see what you can do.",
  "Structures boost nearby trees.",
  "Check the codex to learn about species.",
  "Your grove grows even while you're away.",
  "The traveling merchant visits regularly.",
];
```

Total: 20 tips. Displayed as:

```
"Tip: Watered trees grow 30% faster."
```

Font: Nunito, text-xs, barkBrown at 70% opacity. Italic.

---

## 11. Config Schemas

### 11.1 Tutorial Step Config

```typescript
interface TutorialStepConfig {
  id: string;
  instruction: string;
  instructionDesktop?: string;
  highlightType: "none" | "hud" | "world";
  highlightHudId?: string;
  highlightEntityQuery?:
    | "nearest-wild-tree"
    | "nearest-empty-soil"
    | "nearest-planted-tree"
    | "player-planted-tree";
  completionEvent?: string;        // Game event that completes this step
  completionThreshold?: number;    // How many times the event must fire
  autoAdvanceMs?: number;          // Auto-complete after N ms
  fallbackTimeoutMs: number;       // Show fallback message after N ms
  fallbackMessage?: string;
}
```

### 11.2 Hint Config

```typescript
interface HintConfig {
  id: string;
  message: string;
  toastType: "info" | "success" | "warning";
  triggerEvent: string;            // Game event that triggers this hint
  triggerThreshold?: number;       // e.g. stamina < 20
  showOnce: boolean;
  cooldownMs: number;              // Minimum time before showing again
}
```

### 11.3 Loading Tip Config

```typescript
interface LoadingTipConfig {
  text: string;
  category: "gameplay" | "discovery" | "lore" | "mechanical";
  minLevel?: number;               // Only show if player is at least this level
}
```

### 11.4 Difficulty Tier Config

Already defined in `NewGameModal.tsx` as `DifficultyTier`:

```typescript
interface DifficultyTier {
  id: string;
  name: string;
  tagline: string;
  description: string;
  color: string;
  icon: string;
  permadeathForced: "on" | "off" | "optional";
  growthSpeedMult: number;
  resourceYieldMult: number;
  exposureEnabled: boolean;
  disasterFrequency: number;
  buildingDegradationRate: number;
  cropDiseaseEnabled: boolean;
}
```

### 11.5 Game Store Additions

```typescript
// Fields to add to gameStore initialState:
tutorialStep: -1,                    // -1 = inactive, 0-10 = active step
tutorialComplete: false,
seenHints: [] as string[],
lastHintTimestamp: 0,
```

---

## 12. Component List

### 12.1 New Components

| Component                 | File Path                                    | Est. Lines | Description                          |
|---------------------------|----------------------------------------------|------------|--------------------------------------|
| `LoadingOverlay`          | `components/game/LoadingOverlay.tsx`          | 120        | Full-screen loading with progress bar and tips |
| `TutorialPill`            | `components/game/TutorialPill.tsx`            | 65         | Bottom-center instruction overlay    |
| `PrestigeCelebration`     | `components/game/PrestigeCelebration.tsx`     | 150        | Post-prestige stats + bonuses modal  |
| `SaveRecovery`            | `components/game/SaveRecovery.tsx`            | 80         | Save corruption recovery screen      |
| `SettingsModal`           | `components/game/SettingsModal.tsx`           | 100        | Main menu settings (sound, haptics, credits) |

### 12.2 New Systems

| Module                    | File Path                                    | Est. Lines | Description                          |
|---------------------------|----------------------------------------------|------------|--------------------------------------|
| `tutorialManager`         | `game/systems/tutorialManager.ts`            | 180        | Tutorial state machine + step defs   |
| `hintManager`             | `game/systems/hintManager.ts`                | 100        | Progressive hint trigger system      |
| `loadingTips`             | `game/constants/loadingTips.ts`              | 40         | Loading screen flavor text array     |

### 12.3 Modified Components

| Component                 | File Path                                    | Changes                               |
|---------------------------|----------------------------------------------|---------------------------------------|
| `MainMenu`                | `components/game/MainMenu.tsx`               | Add `onSettings` prop, Settings button |
| `NewGameModal`            | `components/game/NewGameModal.tsx`            | Add seed phrase section, update `onStart` signature |
| `PauseMenu`               | `components/game/PauseMenu.tsx`              | Add Help tab, quick-access buttons, replay tutorial |
| `GameUI`                  | `components/game/GameUI.tsx`                 | Wire TutorialPill, pass tutorial state |
| `gameStore`               | `game/stores/gameStore.ts`                   | Add tutorial/hint state fields + actions |
| `app/index.tsx`           | `app/index.tsx`                              | Wire NewGameModal, pass seed to game   |
| `app/game/index.tsx`      | `app/game/index.tsx`                         | Add LoadingOverlay, tutorial integration |
| `index.ts` (barrel)       | `components/game/index.ts`                   | Export new components                  |

### 12.4 Total New Code Estimate

| Category            | Lines    |
|---------------------|----------|
| New components      | ~515     |
| New systems         | ~320     |
| Modifications       | ~200     |
| Tests               | ~400     |
| **Total**           | **~1,435** |

---

## 13. Accessibility

### 13.1 Screen Reader Support

- All tutorial instructions have `accessibilityRole="text"` and
  `accessibilityLiveRegion="polite"` so screen readers announce them
- The tutorial pill has `accessibilityRole="alert"` for step changes
- Loading progress is announced: `accessibilityLabel="Loading, 60 percent"`
- "Skip All" button has `accessibilityLabel="Skip tutorial"`
- Prestige celebration uses `accessibilityRole="summary"`

### 13.2 Reduced Motion

All new components check `AccessibilityInfo.isReduceMotionEnabled()`:

- `LoadingOverlay`: Progress bar fill uses no animation; instant width changes
- `TutorialPill`: No slide-in/slide-out; instant appear/disappear
- `PrestigeCelebration`: No sparkle animation; static gold dots
- `TutorialOverlay`: Already respects reduced motion (no pulsing ring)

### 13.3 Touch Targets

All interactive elements maintain 44x44px minimum:

- "Skip All" link in TutorialPill: `minHeight: 44, minWidth: 44`
- Seed phrase shuffle button: `minHeight: 44, minWidth: 44`
- Seed phrase edit button: `minHeight: 44, minWidth: 44`
- All tab buttons in PauseMenu: `minHeight: 44` (existing)
- "Begin Anew" in PrestigeCelebration: `minHeight: 48`

### 13.4 Text Sizing

- All body text: minimum 14px (`text-sm`)
- Tutorial pill instruction: 14px (`text-sm`)
- Loading tip text: 12px (`text-xs`) -- non-essential, decorative
- Button text: 14px+ (`text-sm` or `text-base`)
- Headings: 18px+ (`text-lg` or larger)

### 13.5 Color Contrast

All text/background combinations meet WCAG 2.1 AA contrast ratio (4.5:1):

| Text Color    | Background         | Ratio  | Pass? |
|---------------|---------------------|--------|-------|
| White         | `#3E2723` (soil)    | 10.6:1 | Yes   |
| White         | `#2D5A27` (forest)  | 7.3:1  | Yes   |
| `#3E2723`     | `#E8F5E9` (mist)    | 9.8:1  | Yes   |
| `#FFB74D`     | `#3E2723` (soil)    | 5.2:1  | Yes   |
| `#5D4037`     | White               | 7.5:1  | Yes   |

### 13.6 Focus Management

- When the tutorial pill appears, it does NOT steal focus from the game
- When modals open (NewGame, Pause, Settings), focus traps inside the modal
  (handled by React Native `Modal` component)
- On modal close, focus returns to the trigger element
- Tab order in Help tab: Tutorial button -> Controls -> About -> Close

---

## Appendix A: Complete User Flow Diagram

```
[App Launch]
    |
    v
[_layout.tsx: Load fonts, init persistence]
    |
    +--> [Fonts/persistence loading?] --> [ActivityIndicator spinner]
    |
    v
[Fonts + persistence ready]
    |
    v
[app/index.tsx: MainMenu screen]
    |
    +---> [Continue Grove] --> [app/game/index.tsx]
    |                              |
    |                              v
    |                         [LoadingOverlay]
    |                              |
    |                              v
    |                         [Zone loaded, first frame]
    |                              |
    |                              v
    |                         [LoadingOverlay fades out]
    |                              |
    |                              v
    |                         [Game playing]
    |
    +---> [New Grove] --> [NewGameModal]
    |                         |
    |                         +--> [Select seed phrase]
    |                         +--> [Select difficulty]
    |                         +--> [Toggle permadeath]
    |                         |
    |                         v
    |                    [Begin Your Grove]
    |                         |
    |                         v
    |                    [resetGame(seed)]
    |                         |
    |                         v
    |                    [app/game/index.tsx]
    |                         |
    |                         v
    |                    [LoadingOverlay]
    |                         |
    |                         v
    |                    [Zone loaded, first frame]
    |                         |
    |                         v
    |                    [LoadingOverlay fades out]
    |                         |
    |                         +--> [hasSeenRules === false?]
    |                         |        |
    |                         |        v
    |                         |   [RulesModal (8 slides)]
    |                         |        |
    |                         |        +--> [Skip] --> set hasSeenRules,
    |                         |        |               tutorialComplete = true
    |                         |        |
    |                         |        +--> [Let's Grow!] --> set hasSeenRules
    |                         |                               tutorialStep = 0
    |                         |                               |
    |                         |                               v
    |                         |                    [Interactive Tutorial]
    |                         |                    [Steps 0-10, in-game]
    |                         |                         |
    |                         |                         v
    |                         |                    [Tutorial complete]
    |                         |                    tutorialComplete = true
    |                         |
    |                         v
    |                    [Game playing]
    |                         |
    |                         +--> [Progressive hints fire as needed]
    |                         |
    |                         +--> [Pause] --> [PauseMenu]
    |                         |                    |
    |                         |                    +--> [Help > Replay Tutorial]
    |                         |                    +--> [Progress > Prestige]
    |                         |                              |
    |                         |                              v
    |                         |                    [PrestigeCelebration]
    |                         |                              |
    |                         |                              v
    |                         |                    [Begin Anew]
    |                         |                              |
    |                         |                              v
    |                         |                    [performPrestige()]
    |                         |                    [LoadingOverlay: "Regenerating..."]
    |                         |                    [Game restarts at Lv.1]
    |
    +---> [Settings] --> [SettingsModal]
                              |
                              +--> [Sound toggle]
                              +--> [Haptics toggle]
                              +--> [Credits]
                              +--> [Close]
```

---

## Appendix B: Timing Reference

| Transition                        | Duration  | Easing                     |
|-----------------------------------|-----------|----------------------------|
| Card entrance (MainMenu)          | 300ms     | `Easing.out(Easing.ease)`  |
| Modal backdrop fade in            | 250ms     | `linear` (React Native Modal default) |
| Loading overlay fade out          | 400ms     | `Easing.out(Easing.ease)`  |
| Tutorial pill slide in            | 250ms     | `SlideInUp` (reanimated)   |
| Tutorial pill slide out           | 200ms     | `SlideOutDown` (reanimated)|
| Seed phrase crossfade (shuffle)   | 150ms     | `linear`                   |
| Progress bar lerp                 | per-frame | `current += (target - current) * 0.1` |
| Prestige celebration entrance     | 400ms     | `Easing.out(Easing.back)`  |
| Sparkle animation cycle           | 1000ms    | `Easing.inOut(Easing.ease)` |
| Hint toast auto-dismiss           | 2500ms    | (existing toast system)    |
| Loading tip rotation              | 4000ms    | (swap with 200ms crossfade)|

---

## Appendix C: File Manifest

All file paths are relative to the project root
(`/Users/jbogaty/src/arcade-cabinet/grovekeeper/`).

### New Files

```
components/game/LoadingOverlay.tsx        ~120 lines
components/game/TutorialPill.tsx          ~65 lines
components/game/PrestigeCelebration.tsx   ~150 lines
components/game/SaveRecovery.tsx          ~80 lines
components/game/SettingsModal.tsx         ~100 lines
game/systems/tutorialManager.ts          ~180 lines
game/systems/tutorialManager.test.ts     ~150 lines
game/systems/hintManager.ts              ~100 lines
game/systems/hintManager.test.ts         ~80 lines
game/constants/loadingTips.ts            ~40 lines
```

### Modified Files

```
components/game/MainMenu.tsx             Add onSettings prop + button
components/game/NewGameModal.tsx          Add seed phrase section
components/game/PauseMenu.tsx            Add Help tab + replay tutorial
components/game/GameUI.tsx               Wire TutorialPill
components/game/index.ts                 Export new components
game/stores/gameStore.ts                 Add tutorial/hint state + actions
app/index.tsx                            Wire NewGameModal flow
app/game/index.tsx                       Add LoadingOverlay + tutorial hooks
```
