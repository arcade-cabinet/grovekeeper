# HUD Overlay Architecture

> **NOTE (2026-03-07):** HUD principles remain accurate. Updates from `docs/plans/2026-03-07-unified-game-design.md` Sections 3 and 12:
>
> - **New HUD elements:** Hearts bar (3-7 hearts, difficulty-scaled), hunger bar (100 max), temperature indicator, tool durability bar, compass (always visible), mini-map (explored chunks).
> - **ResourceBar expanded:** Now shows Timber, Stone, Ore, Sap, Fruit, Berries, Herbs, Meat, Hide, Fish, Acorns (not just 4 resources).
> - **No coins.** Removed from HUD.
> - **Difficulty tier display** during game (Seedling/Sapling/Hardwood/Ironwood).
> - **Grovekeeper discovery counter** (X/14 found).
> - **Codex completion tracker** (unlocked at L17).

## Principle

The HUD is pure HTML/CSS layered on top of the 3D canvas. It is NOT rendered in Three.js. This keeps draw calls at zero for all UI elements and allows standard React rendering, Tailwind styling, and accessibility tooling.

The HUD container has `pointer-events: none` -- only specific interactive elements (buttons, joystick) have `pointer-events: auto`.

## Layout (Portrait Mobile, 375px)

```
+----------------------------------+
| [Resources]        [Time/Season] |  <- top bar, 48px
|                                  |
|          [Toast area]            |  <- top-center, ephemeral
|                                  |
|                                  |
|            [ + ]                 |  <- crosshair, center
|     [Target: Oak Tree]           |  <- target info, below center
|     [Chop -- 5 stamina]         |
|                                  |
| [Stamina ====----]              |  <- bottom-left area
| [XP ========---]                |
|                                  |
|  (O)                      [USE] |  <- controls
|  joystick               [NEXT] |
|  128x128               [PAUSE] |
+----------------------------------+
```

## Component Hierarchy

```tsx
<div className="absolute inset-0 pointer-events-none z-10">
  {/* Top bar */}
  <ResourceBar />
  <TimeDisplay />

  {/* Center */}
  <Crosshair />
  <TargetInfo />

  {/* Notifications */}
  <Toast />
  <FloatingParticles />
  <AchievementPopup />

  {/* Bottom-left: status */}
  <StaminaGauge />
  <XPBar />

  {/* Bottom: controls (mobile only) */}
  {isMobile && (
    <>
      <VirtualJoystick />
      <ActionButtons />
    </>
  )}

  {/* Tool belt */}
  <ToolBelt />

  {/* Overlays */}
  <PauseMenu />
  <QuestPanel />
  <WeatherOverlay />
</div>
```

## Component Specifications

### ResourceBar

Top-left. Shows Timber, Sap, Fruit, Acorns with icons and counts.

```
[wood] 42  [drop] 18  [apple] 7  [acorn] 23
```

- Icons: inline SVGs from `assets/icons/`
- Font: Nunito, 14px, semibold
- Background: semi-transparent dark panel
- Updates: reactive from Zustand store

### TimeDisplay

Top-right. Shows current day, time of day icon, and season.

```
Day 14  [sun]  Spring
```

- Season name color matches season palette
- Day/night icon rotates based on game hour

### Crosshair

Screen center. Small dot or cross.

```tsx
<div className="absolute top-1/2 left-1/2 w-1 h-1 bg-white rounded-full
                -translate-x-1/2 -translate-y-1/2
                shadow-[0_0_4px_rgba(0,0,0,0.8)]" />
```

### TargetInfo

Below crosshair. Shows what the player is looking at and available action.

```
[Oak Tree -- Stage 3]
[Chop -- 5 stamina]
```

- Only visible when raycast hits an interactable
- Font: Fredoka, 13px
- Background: semi-transparent pill shape

### StaminaGauge

Bottom-left stack. Horizontal bar showing current / max stamina.

- Green when > 50%, yellow 20-50%, red < 20%
- Smooth transition on drain/regen
- Width: 120px on mobile

### XPBar

Below stamina. Shows level + XP progress.

```
Lv. 7  [========----]
```

### ToolBelt

Bottom-right (above action buttons on mobile, standalone on desktop). Shows current tool icon + name.

- Current tool highlighted with amber border
- Desktop: shows all 5 tools with number key badges
- Mobile: shows current tool only (cycle via NEXT button)

### Toast

Top-center. Ephemeral notifications that auto-dismiss.

```
+Timber x3       (slides in from top, fades after 2s)
```

- Queue: max 3 visible, oldest dismissed first
- Animation: slide down + fade in, fade out after duration

### FloatingParticles

World-space text that floats upward from harvest/action point.

```
+15 XP    (floats up from tree, fades)
+3 Timber
```

- Rendered as CSS `position: absolute` elements positioned via world-to-screen projection
- Float speed: 40px/sec upward
- Fade: linear over 1.5s

### WeatherOverlay

Full-screen CSS effects layered on the viewport.

| Weather | Effect |
|---------|--------|
| Rain | Animated falling droplet elements (CSS animation) |
| Drought | Warm color filter overlay (sepia + opacity) |
| Windstorm | Diagonal streak animation |
| Cherry Petals | Floating petal sprites (when Cherry Blossom >= stage 3) |

All weather animations respect `prefers-reduced-motion`.

### AchievementPopup

Modal overlay for achievement unlock. Gold border + sparkle animation.

- Auto-dismiss after 4s
- Tap to dismiss early
- Shows achievement icon, title, description

## Styling Standards

### Design Tokens

All colors come from CSS custom properties defined in `src/styles/tokens.css`:

```css
--gk-bg-panel: rgba(42, 27, 21, 0.85);
--gk-border-gold: #d4af37;
--gk-text-primary: #eaddc5;
--gk-text-accent: #4a6b8c;
--gk-bar-green: #2d6b1e;
--gk-bar-yellow: #c2a02e;
--gk-bar-red: #8a1c1c;
```

### Typography

| Use | Font | Size | Weight |
|-----|------|------|--------|
| Headings, labels | Fredoka | 16-20px | Bold |
| Body, values | Nunito | 13-14px | SemiBold |
| Tiny labels | Nunito | 11px | Regular |

### Panel Style

Common panel background pattern:

```tsx
className="rounded-lg bg-stone-900/85 border border-amber-700/30
           shadow-[4px_4px_15px_rgba(0,0,0,0.8)]
           backdrop-blur-sm p-3"
```

## Responsive Breakpoints

| Breakpoint | Layout Changes |
|-----------|----------------|
| < 375px | Stack resource icons vertically, shrink tool belt |
| 375-768px | Default mobile layout (portrait) |
| > 768px | Show mini-map, expand resource labels, show keyboard badges |

## File Structure

```
src/game/ui/
  GameUI.tsx              -- HUD container (pointer-events-none wrapper)
  ResourceBar.tsx         -- Timber/Sap/Fruit/Acorn display
  TimeDisplay.tsx         -- Day/night/season indicator
  StaminaGauge.tsx        -- Stamina bar
  XPBar.tsx               -- XP + level display
  ToolBelt.tsx            -- Tool belt HUD
  Toast.tsx               -- Toast notification system
  FloatingParticles.tsx   -- +XP / +Timber floating numbers
  AchievementPopup.tsx    -- Gold border achievement modal
  WeatherOverlay.tsx      -- CSS weather effects
  QuestPanel.tsx          -- Active quest tracker
  PauseMenu.tsx           -- Pause overlay + settings
  VirtualJoystick.tsx     -- Touch joystick (mobile)
  ActionButtons.tsx       -- USE + CYCLE buttons (mobile)
  Crosshair.tsx           -- Screen-center dot
  TargetInfo.tsx          -- "Looking at X" below crosshair
  MiniMap.tsx             -- Desktop-only minimap
```
