# HUD Layout

The HUD (Heads-Up Display) overlays the BabylonJS canvas using absolute and
fixed CSS positioning. All HUD elements live inside `GameUI.tsx`, which wraps
the entire viewport with `pointer-events-none` and selectively re-enables
pointer events on interactive children.

Source files: `src/game/ui/GameUI.tsx`, `src/game/ui/HUD.tsx`, and the
individual component files listed below.

---

## Mobile Portrait Layout (Primary Target)

```text
+--------------------------------------------------+
|  [Wood Frame Left]                [Wood Frame Right]|
|                                                    |
|  +--- Top HUD Bar (gradient bg) ---------------+  |
|  | ResourceBar | XPBar | Time | QuestPanel |Menu|  |
|  +----------------------------------------------+  |
|                                                    |
|                                                    |
|         (BabylonJS 3D canvas)                      |
|                                                    |
|                WeatherOverlay                      |
|                FloatingParticles                   |
|                Toast notifications                 |
|                                                    |
|                           StaminaGauge (right)     |
|                           ToolBelt (right, 2x4)    |
|                                                    |
|  +--- Bottom Bar (gradient bg) ----------------+  |
|  | Joystick (left)    [status]   ActionBtn (R)  |  |
|  +----------------------------------------------+  |
|                                                    |
|  MiniMap (desktop only, bottom-left)               |
+--------------------------------------------------+
```

### Top HUD Bar

Rendered by `HUD.tsx`. Background is a vertical gradient from `soilDark` to
transparent, so it fades into the 3D scene.

| Position    | Component          | File              | Contents                              |
|-------------|--------------------|-------------------|---------------------------------------|
| Left group  | `ResourceBar`      | ResourceBar.tsx    | 2x2 grid: Timber, Sap, Fruit, Acorns |
| Left group  | `XPBar`            | XPBar.tsx          | Level badge + gold fill progress bar  |
| Left group  | `TimeDisplay`      | TimeDisplay.tsx    | Day number, season, time-of-day icon  |
| Right group | `QuestPanel`       | QuestPanel.tsx     | Active quest tracker with claim button|
| Right group | Tool selector btn  | (inline in HUD)   | Opens ToolWheel dialog                |
| Right group | Menu button        | (inline in HUD)   | Opens PauseMenu dialog                |

On small screens (`< 640px`), `TimeDisplayCompact` replaces the full time
display to save horizontal space.

Resource labels (text like "Timber") are hidden on mobile (`hidden md:inline`)
and only shown on desktop. Mobile shows icon + number only.

### Side Frames

Decorative vertical strips on the left and right edges of the viewport.
Width scales responsively: `w-3` mobile, `w-4` tablet, `w-6` desktop.
Background is a horizontal gradient of bark brown to soil dark, with
simulated wood grain lines. When a prestige cosmetic is active, the border
style, color, and optional glow are applied via the cosmetic definition.

### Right Side

| Position         | Component       | File             | Notes                               |
|------------------|-----------------|------------------|--------------------------------------|
| Right, y=180px up| `StaminaGauge`  | StaminaGauge.tsx  | Vertical bar, 28px wide, 100px tall |
| Right, y=140px up| `ToolBelt`      | ToolBelt.tsx      | 4-column x 2-row grid of 8 tools   |

**StaminaGauge** fills bottom-to-top. Color shifts green (>50%) to orange
(25-50%) to red (<25%). Pulses via `animate-pulse` when critically low.
Displays `current/max` text below the bar.

**ToolBelt** renders all 8 tools as 44x44 px buttons in a `grid-cols-4`
layout. Locked tools appear greyed out. The active tool has a gold border and
slight scale boost. On desktop (`md:` breakpoint), keyboard shortcut badges
(1-8) appear on each tool button. When the trowel is selected, the active
seed species and count are shown below the grid.

### Bottom Control Area

Background is a vertical gradient from `soilDark` (bottom) to transparent.
Respects safe area insets for notched devices via `env(safe-area-inset-bottom)`.

| Position     | Component         | Notes                                     |
|--------------|-------------------|-------------------------------------------|
| Left         | `Joystick`        | nipplejs wrapper, 80-128 px depending on breakpoint |
| Center       | Status text       | Hidden on mobile, shows selected tool name on `md:` |
| Right        | Action button     | 64-96 px circle, tool-specific icon + label |

The action button icon and label change dynamically based on `selectedTool`:
trowel shows a seedling ("Plant"), watering-can shows a droplet ("Water"), axe
shows a hatchet ("Harvest"), and so on.

### Floating Elements

| Layer        | Component                   | File                  | Z-Index | Position     |
|--------------|-----------------------------|-----------------------|---------|--------------|
| Weather      | `WeatherOverlay`            | WeatherOverlay.tsx     | 5       | Full viewport|
| Particles    | `FloatingParticlesContainer`| FloatingParticles.tsx  | 9998    | Top center   |
| Toasts       | `ToastContainer`            | Toast.tsx              | 9999    | Top center   |
| Achievement  | `AchievementPopup`          | AchievementPopup.tsx   | modal   | Center       |

**WeatherOverlay** renders CSS-animated rain drops (40 drops), drought shimmer,
windstorm sway, or cherry blossom petals (25 petals) depending on the active
weather state. All are `pointer-events-none`.

**FloatingParticles** shows "+XP", "+Timber", etc. text that floats upward and
fades out over 1200 ms. Color is auto-detected from the text content. Maximum
5 visible simultaneously.

**ToastContainer** displays up to 3 pill-shaped notifications. Types: success
(green), warning (amber), info (blue), achievement (gold). Auto-dismiss after
2500 ms with enter/exit CSS transitions.

---

## Desktop Adaptations (768px+)

| Change                    | Details                                           |
|---------------------------|---------------------------------------------------|
| Joystick hidden           | WASD keyboard input replaces the virtual joystick |
| Keyboard badges           | Number keys 1-8 shown on each ToolBelt button     |
| MiniMap shown             | SVG-based minimap in bottom-left corner            |
| Resource labels           | Full text labels appear next to resource icons     |
| Wider side frames         | `w-6` (24 px) instead of `w-3` (12 px)           |
| Center status text        | Selected tool name shown between joystick zone and action button |

**MiniMap** (`MiniMap.tsx`) renders an SVG-based overhead view of the grid using
miniplex-react's `ECS.Entities` for reactive rendering. Soil tiles are brown,
occupied tiles are green, water is blue, rock is grey. Trees appear as small
green circles. The player is a yellow circle. On mobile, a fullscreen
`MiniMapOverlay` is available via a toggle button.

---

## Dialogs (Modals)

All dialogs use shadcn/ui `Dialog` + `DialogContent`. Max width `max-w-sm`,
max height `80-85vh` with `overflow-y-auto`. Background is `skyMist` (#E8F5E9).

| Dialog         | File           | Trigger                | Contents                          |
|----------------|----------------|------------------------|-----------------------------------|
| `SeedSelect`   | SeedSelect.tsx  | Trowel action on empty tile | 2-column species grid, seed counts, costs |
| `ToolWheel`    | ToolWheel.tsx   | Tool selector button in HUD | Quick tool selection              |
| `PauseMenu`    | PauseMenu.tsx   | Menu button in HUD     | Stats, achievements, grid expansion, prestige, cosmetics |
| `RulesModal`   | RulesModal.tsx  | First-time launch      | Tutorial walkthrough              |

### PauseMenu Sections
1. **Grove Stats** -- Level, XP, Coins, Trees Planted, Trees Matured, Grid Size
2. **Achievements** -- Scrollable list of 15 achievements (unlocked/locked)
3. **Grid Expansion** -- Current size, next tier cost and level requirement
4. **Border Cosmetics** -- Prestige-unlocked frame themes (if any unlocked)
5. **Prestige** -- Reset-for-bonuses button (requires level 25+), confirmation step
6. **Navigation** -- Continue Playing / Return to Menu

---

## Sacred Zones

The **bottom-left 200x200 px** area is reserved for the joystick on mobile.
No HUD element, tooltip, or overlay should intrude into this region. The
joystick container itself sizes responsively (80-128 px) but the exclusion zone
remains 200x200 px to accommodate finger movement around the joystick.

---

## Touch and Accessibility

- All interactive touch targets are at minimum **44x44 px**.
- All readable text is at minimum **14 px** (except non-essential secondary
  labels at 10 px).
- The game canvas has `touch-action: none` to prevent browser gestures.
- `overscroll-behavior: none` on `html` and `body` prevents pull-to-refresh.
- Viewport uses `100dvh` (dynamic viewport height) for mobile notch safety.
- Safe area padding applied via `env(safe-area-inset-*)` on top and bottom bars.
- Toast notifications use `role="status"` and `aria-live="polite"`.
- Action buttons have `aria-label` attributes describing the current action.
