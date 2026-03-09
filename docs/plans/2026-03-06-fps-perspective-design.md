# Design: First-Person Perspective Pivot

**Status:** Draft
**Date:** 2026-03-06
**Mandate:** The game ONLY makes sense if the player can DIG, CHOP, SMASH, etc. A third-person camera removes the player from the physicality of tending a grove. First-person with a held tool model makes every action feel direct and embodied.

---

## 1. Why This Change

The current third-person over-the-shoulder camera treats the player as an observer directing a character. That's wrong for Grovekeeper. This game is about the **tactile satisfaction** of working the land:

- **Digging** into soil to plant a seed
- **Chopping** into old growth timber
- **Pouring** water from a can onto a sprout
- **Snipping** branches with pruning shears
- **Spreading** compost around a tree's base

You need to SEE the tool in your hands. You need to AIM at the tree. The action must feel physical. An isometric/third-person view abstracts all of this away into "tap tile, press button." First-person makes it real.

**Reference implementation:** `../goats-in-hell` (FPS dungeon crawler using the exact same stack: Expo + R3F + Miniplex + Rapier)

---

## 2. Camera System

### 2.1 First-Person Camera

Replace the current `Camera.tsx` (third-person spherical follower) with a first-person camera attached to a Rapier KinematicCharacterController capsule.

| Parameter | Value | Notes |
|-----------|-------|-------|
| Eye height | 1.6 | Units above ground |
| Capsule radius | 0.35 | Collision body |
| FOV | 65 | Wider than current 55 for immersion |
| Near clip | 0.1 | See tool model up close |
| Far clip | 100 | Same as current |
| Pitch clamp | +/- 72 deg | Can look down at ground, up at canopy |

### 2.2 No Pointer Lock on Mobile

- **Desktop:** Pointer lock on canvas click (like goats-in-hell). Mouse controls look.
- **Mobile:** Touch look zone (right half of screen). No pointer lock needed.

---

## 3. Input System

### 3.1 Architecture

Port the goats-in-hell InputManager pattern exactly. Game code NEVER reads raw events.

```
InputManager (singleton)
  -> KeyboardMouseProvider  (desktop: WASD + mouse look)
  -> TouchProvider          (mobile: joystick + look zone + buttons)
  -> GamepadProvider        (controller support)
  -> AIProvider             (autoplay/testing governor)
```

Each provider implements `IInputProvider`:
- `poll(dt)` -> partial `InputFrame`
- `postFrame()` -> clear accumulators
- `isAvailable()` -> platform check
- `dispose()` -> cleanup

### 3.2 InputFrame (Grovekeeper-specific)

```typescript
interface InputFrame {
  // Movement (normalized -1..1)
  moveX: number;  // strafe
  moveZ: number;  // forward/back

  // Look deltas (radians this frame)
  lookDeltaX: number;  // yaw
  lookDeltaY: number;  // pitch

  // Tool actions
  useTool: boolean;    // primary action (dig, chop, water, plant, etc.)
  altAction: boolean;  // secondary action (inspect, cancel, etc.)

  // Navigation
  pause: boolean;
  interact: boolean;   // NPC talk, structure activate
  openInventory: boolean;

  // Tool selection
  toolSlot: number;    // 0 = no change, 1-N = specific slot
  toolCycle: number;   // -1 = prev, 0 = none, +1 = next
}
```

Key difference from goats-in-hell: `fire` -> `useTool`, `reload` -> `altAction`. No weapon-specific actions (jump is irrelevant for a gardening sim on flat terrain).

### 3.3 Touch Layout (Mobile)

```
+------------------------------------------+
|  [pause]                    [tool1][tool2]|  <- top bar
|                             [tool3][tool4]|
|                                           |
|                                           |
|                                           |
|                    +                      |  <- crosshair (center)
|                                           |
|                                           |
|                          [LOOK ZONE 50%]  |  <- right half
|                                           |
|  [JOYSTICK]              [ALT]   [USE]   |  <- bottom corners
|  120px                    60px    90px    |
+------------------------------------------+
```

- **Left:** Virtual joystick (120px, bottom-left corner)
- **Right half:** Look zone (touch drag to look around)
- **USE button:** Primary tool action (bottom-right, 90px, labeled dynamically: "DIG", "CHOP", "WATER", "PLANT", etc.)
- **ALT button:** Secondary action (above USE, 60px) -- inspect, open seed select, cancel
- **Tool slots:** Top-right corner, 44px each, shows currently equipped tools

### 3.4 Desktop Controls

| Input | Action |
|-------|--------|
| WASD | Move |
| Mouse move | Look |
| Left click | Use tool |
| Right click | Alt action (inspect) |
| 1-9 | Tool slot select |
| Scroll wheel | Cycle tools |
| E | Interact (NPC, structure) |
| ESC | Pause |
| Tab | Inventory/Seed select |

---

## 4. Tool View Model

### 4.1 Concept

A 3D model of the currently held tool, rendered in camera space (parented to camera, rendered on top). This is the player's primary visual feedback for what they're holding.

Directly modeled on goats-in-hell's `WeaponViewModel.tsx`.

### 4.2 Tool Visual Config (JSON)

`config/game/toolVisuals.json`:

```json
{
  "trowel": {
    "offset": [0.35, -0.3, -0.5],
    "scale": 0.4,
    "color": "#8B7355",
    "emissive": "#3E2723",
    "useAnimation": "stab",
    "useDuration": 0.4
  },
  "watering-can": {
    "offset": [0.3, -0.25, -0.5],
    "scale": 0.5,
    "color": "#4A90D9",
    "emissive": "#1565C0",
    "useAnimation": "tilt",
    "useDuration": 0.8
  },
  "axe": {
    "offset": [0.4, -0.35, -0.55],
    "scale": 0.5,
    "color": "#757575",
    "emissive": "#424242",
    "useAnimation": "chop",
    "useDuration": 0.5
  },
  "shovel": {
    "offset": [0.35, -0.3, -0.6],
    "scale": 0.55,
    "color": "#A0A0A0",
    "emissive": "#616161",
    "useAnimation": "dig",
    "useDuration": 0.6
  },
  "pruning-shears": {
    "offset": [0.3, -0.25, -0.45],
    "scale": 0.35,
    "color": "#E53935",
    "emissive": "#B71C1C",
    "useAnimation": "snip",
    "useDuration": 0.3
  },
  "compost-bin": {
    "offset": [0.3, -0.3, -0.5],
    "scale": 0.45,
    "color": "#795548",
    "emissive": "#4E342E",
    "useAnimation": "spread",
    "useDuration": 0.6
  },
  "almanac": {
    "offset": [0.25, -0.2, -0.4],
    "scale": 0.4,
    "color": "#F5DEB3",
    "emissive": "#8D6E63",
    "useAnimation": "flip",
    "useDuration": 0.3
  }
}
```

### 4.3 Animations

Each tool has a `useAnimation` type that plays when the player presses USE:

| Animation | Motion | Tools |
|-----------|--------|-------|
| `stab` | Quick forward thrust, spring back | Trowel |
| `tilt` | Rotate forward to pour, return upright | Watering Can |
| `chop` | Arc overhead then strike down, spring back | Axe |
| `dig` | Push down into ground, lever up, return | Shovel |
| `snip` | Quick squeeze motion (scale X briefly) | Pruning Shears |
| `spread` | Tilt and sweep side to side | Compost Bin, Fertilizer Spreader |
| `flip` | Open book motion (rotate around Y) | Almanac |
| `place` | Lower to ground, release, rise | Rain Catcher, Scarecrow |

All animations are keyframe-driven in the per-frame loop (like goats-in-hell recoil), not Three.js AnimationMixer. They're simple parametric curves (sine bobs, lerps).

### 4.4 Tool Switch Animation

Same pattern as goats-in-hell weapon switch:
1. Current tool drops down (0.25s)
2. Swap mesh
3. New tool rises up (0.25s)

---

## 5. Interaction Model

### 5.1 Raycast from Camera Center

Replace the current tap-to-select model. Instead:

1. A **crosshair** is always at screen center (subtle, brand-colored)
2. Every frame, cast a ray from camera center into the scene
3. The ray hits: ground tile, tree, NPC, structure, or nothing
4. The HUD shows what you're looking at and what your current tool can do to it

### 5.2 Interaction Range

Tools have a maximum reach distance. If the raycast hit is beyond reach, the action is grayed out.

| Category | Max Reach | Notes |
|----------|-----------|-------|
| Hand tools | 3.0 | Trowel, shears, watering can |
| Long tools | 4.0 | Axe, shovel |
| Placement | 5.0 | Rain catcher, scarecrow |
| Inspection | 6.0 | Almanac |

### 5.3 Context Display

A small HUD element below the crosshair shows:

```
[target name]
[action verb] -- [stamina cost]
```

Examples:
- Looking at empty soil tile with trowel: `"Soil Tile" / PLANT -- 5 stamina`
- Looking at sprout with watering can: `"Oak Sprout (Stage 1)" / WATER -- 3 stamina`
- Looking at mature tree with axe: `"Pine (Old Growth)" / CHOP -- 10 stamina`
- Looking at tree out of range: `"Oak (Sapling)" / Too far` (grayed)
- Looking at nothing: no display

### 5.4 Action Execution

When the player presses USE:
1. Raycast to get target
2. Check tool + target compatibility (same logic as current `useInteraction.executeAction`)
3. Check range
4. Check stamina
5. Play tool animation
6. Execute action (plant, water, harvest, etc.)
7. Show floating particle feedback (+Timber, +XP, etc.)

---

## 6. Player Controller

### 6.1 Movement

Port from goats-in-hell's `PlayerController.tsx`, simplified:

- **No jump** (flat terrain gardening sim)
- **No gravity** (player stays on ground plane, Y = eye height)
- **Walk speed:** 4 units/sec (slower than goats-in-hell's 6 -- cozy pace)
- **Sprint:** Hold shift for 1.3x speed (vs goats-in-hell's 1.5x -- gentle jog)
- **Collision:** Rapier KinematicCharacterController with capsule collider

### 6.2 What the Player Entity Becomes

The current `Player.tsx` renders a visible capsule mesh. In first-person, the player body is invisible (you ARE the player). The capsule is still there for collision, but `visible = false`.

The player's ECS entity still tracks position for:
- Stamina regen (proximity to structures)
- Zone detection (which zone are you in?)
- NPC interaction range
- Quest progress (zones visited, distance walked)

---

## 7. HUD Redesign

### 7.1 Minimal FPS HUD

The current HUD has a top bar with resources, XP, time, and tool/action overlays in corners. For FPS, simplify:

```
+------------------------------------------+
|  [Time/Season]              [Pause icon]  |
|  [Weather icon]                           |
|                                           |
|  [Resource bar - compact]                 |  <- left side, vertical
|  [Timber: 42]                             |
|  [Sap: 18]                               |
|  [Fruit: 7]                              |
|  [Acorns: 3]                             |
|                                           |
|                    +                      |  <- crosshair
|              [target info]                |
|                                           |
|  [XP bar]                                 |  <- bottom-left
|  [Stamina bar]                            |
|                                           |
|                          [current tool]   |  <- bottom-right tool indicator
+------------------------------------------+
```

### 7.2 Tool Indicator

Bottom-right corner shows:
- Current tool icon + name
- If tool is trowel/seed-pouch: also shows selected species + seed count
- Quick-switch hint: "Scroll / 1-9 to switch" (desktop) or tool slot buttons (mobile)

---

## 8. File Structure

### 8.1 New Files (subpackage: `game/input/`)

```
game/input/
  InputActions.ts        -- InputFrame interface + emptyInputFrame()
  InputManager.ts        -- Singleton manager, merges providers
  providers/
    KeyboardMouseProvider.ts  -- WASD + mouse look + pointer lock
    TouchProvider.tsx         -- Joystick + look zone + action buttons
    GamepadProvider.ts        -- Controller support
    AIProvider.ts             -- Autoplay/testing governor
    index.ts                  -- Re-exports
```

### 8.2 New Files (subpackage: `components/player/`)

```
components/player/
  PlayerController.tsx   -- FPS camera, movement, Rapier collider
  ToolViewModel.tsx      -- First-person held tool model + animations
  Crosshair.tsx          -- Screen-center crosshair overlay
  TargetInfo.tsx         -- "Looking at X / action available" HUD element
```

### 8.3 Modified Files

| File | Change |
|------|--------|
| `components/scene/Camera.tsx` | DELETE (replaced by PlayerController) |
| `components/entities/Player.tsx` | DELETE (player mesh invisible in FPS) |
| `app/game/index.tsx` | Replace Camera+Player with PlayerController+ToolViewModel |
| `game/hooks/useInput.ts` | DELETE (replaced by InputManager) |
| `game/hooks/useInteraction.ts` | Refactor to use raycast instead of tap-select |
| `components/game/ActionButton.tsx` | Refactor to USE button in touch overlay |
| `components/game/ToolBelt.tsx` | Refactor to tool slot buttons in touch overlay |
| `components/game/HUD.tsx` | Redesign for FPS layout |

### 8.4 New Config Files

| File | Purpose |
|------|---------|
| `config/game/toolVisuals.json` | Per-tool view model config (offset, scale, color, animation) |
| `config/game/input.json` | Sensitivity defaults, deadzone, reach distances |

---

## 9. What Stays the Same

This pivot changes the camera, input, and interaction model. These systems are UNCHANGED:

- Growth system (5-stage formula)
- Weather system (rain/drought/windstorm)
- Season system (4 seasons, day/night cycle)
- Economy (resources, seeds, coins)
- Quest system (goals, daily quests)
- Achievement system (15 achievements)
- Prestige system (level 25+, cosmetics)
- World/zone system (multi-zone, zone transitions)
- Structure system (placement, effect radii)
- NPC system (dialogue, trading)
- Save/persistence (Legend State -> SQLite)
- Species catalog (15 species)
- Tool definitions (12 tools -- unchanged data, new visual config added)
- Stamina system (drain + regen)
- Harvest system (yields, multipliers)
- Time system (microsecond precision day/night)
- Seeded RNG (scopedRNG, seed phrases)

The ECS entity model, Zustand store, and all game logic systems are unaffected. Only the rendering/input/interaction layer changes.

---

## 10. Migration Path

### Phase 1: Input System (no visual change yet)
1. Create `game/input/` subpackage with InputManager + InputActions
2. Create KeyboardMouseProvider (WASD only, no mouse look yet)
3. Create TouchProvider (joystick only, no look zone yet)
4. Wire into `app/game/index.tsx` replacing `useInput`
5. Tests: InputFrame merging, provider registration, movement normalization

### Phase 2: First-Person Camera
1. Create `PlayerController.tsx` with FPS camera + Rapier capsule
2. Add mouse look (desktop) + look zone (mobile) to providers
3. Replace `Camera.tsx` and `Player.tsx` in game screen
4. Tests: Camera pitch/yaw clamping, movement speed, collision

### Phase 3: Tool View Model
1. Create `config/game/toolVisuals.json`
2. Create `ToolViewModel.tsx` (placeholder boxes first, models later)
3. Implement use animations (stab, tilt, chop, dig, snip, spread)
4. Implement tool switch animation
5. Tests: Animation timing, tool swap, config loading

### Phase 4: Raycast Interaction
1. Refactor `useInteraction.ts` to use center-screen raycast
2. Create `Crosshair.tsx` and `TargetInfo.tsx`
3. Wire USE button to raycast-based action execution
4. Remove tap-to-select code paths
5. Tests: Raycast target detection, range checking, action execution

### Phase 5: HUD Adaptation
1. Redesign `HUD.tsx` for FPS layout
2. Move tool indicators to new positions
3. Integrate touch overlay buttons
4. Polish crosshair + target info styling
5. Tests: HUD visibility, responsive layout

---

## 11. Open Questions

1. **GLB tool models:** Do we create/source 3D models for each tool, or start with colored box placeholders (like goats-in-hell's fallback)?
   - Recommendation: Start with placeholders, source models later. Gameplay first.

2. **Head bob:** Should the camera bob slightly while walking for immersion?
   - Recommendation: Yes, subtle sine bob. Respect `prefers-reduced-motion`.

3. **Zone transitions:** Currently zones are separate grids. In FPS, does the player walk seamlessly between zones or is there a transition screen?
   - Recommendation: Fade-to-black transition (0.5s), teleport player to new zone entrance. Seamless streaming is overengineered for this scope.

4. **Ground interaction visualization:** When holding the trowel and looking at valid soil, should the crosshair change or should there be a "ghost" preview of where the tree would go?
   - Recommendation: Crosshair changes to a green "+" and ground tile highlights with a subtle glow ring. Same idea as Minecraft block highlight.
