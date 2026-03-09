# HUD Layout

The HUD (Heads-Up Display) overlays the R3F Canvas using absolute positioning.
All HUD elements live inside `GameUI.tsx`, which wraps the entire viewport with
`pointer-events-none` and selectively re-enables pointer events on interactive children.

Source files: `components/game/GameUI.tsx`, `components/game/HUD.tsx`, and the
individual component files listed below.

**Canonical spec:** [`docs/plans/2026-03-07-unified-game-design.md`](../plans/2026-03-07-unified-game-design.md) Section 12.

---

## Mobile Portrait Layout (Primary Target)

```text
+--------------------------------------------------+
|                                                    |
|  +--- Top HUD Bar (gradient bg) ---------------+  |
|  | ResourceBar | XPBar | Time | Quest | Hearts  |  |
|  | Compass                              Menu btn|  |
|  +----------------------------------------------+  |
|                                                    |
|         (R3F 3D Canvas -- Zelda-style)             |
|                                                    |
|              WeatherOverlay                        |
|              FloatingParticles                     |
|              Toast notifications                   |
|                                                    |
|                         StaminaGauge (right)        |
|                         Hunger bar (right)          |
|                         ToolBelt (right, 2x4)       |
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
| Left group  | `ResourceBar`      | ResourceBar.tsx    | 2x2 grid: Timber, Sap, Fruit, Acorns (expandable for Stone, Ore, etc.) |
| Left group  | `XPBar`            | XPBar.tsx          | Level badge + gold fill progress bar  |
| Left group  | `TimeDisplay`      | TimeDisplay.tsx    | Day number, season, time-of-day icon  |
| Right group | `Hearts`           | (planned)          | Heart icons (3-7 based on difficulty tier) |
| Right group | `QuestPanel`       | QuestPanel.tsx     | Active quest tracker with claim button|
| Right group | `Compass`          | (planned)          | Cardinal directions + home marker     |
| Right group | Menu button        | (inline in HUD)   | Opens PauseMenu dialog                |

On small screens (`< 640px`), `TimeDisplayCompact` replaces the full time
display to save horizontal space.

Resource labels (text like "Timber") are hidden on mobile (`hidden md:inline`)
and only shown on desktop. Mobile shows icon + number only.

### Right Side

| Position         | Component       | File             | Notes                               |
|------------------|-----------------|------------------|--------------------------------------|
| Right, upper     | `StaminaGauge`  | StaminaGauge.tsx  | Vertical bar, 28px wide, 100px tall |
| Right, middle    | `Hunger bar`    | (planned)         | Hunger gauge, 0-100                 |
| Right, lower     | `ToolBelt`      | ToolBelt.tsx      | 4-column x 2-row grid of 8 tools   |

**StaminaGauge** fills bottom-to-top. Color shifts green (>50%) to orange
(25-50%) to red (<25%). Pulses via `animate-pulse` when critically low.
Displays `current/max` text below the bar.

**ToolBelt** renders tools as 44x44px buttons in a `grid-cols-4` layout.
Locked tools appear greyed out. The active tool has a gold border and slight
scale boost. On desktop (`md:` breakpoint), keyboard shortcut badges (1-8)
appear on each tool button. Tool durability shown as small bar under each icon
(green >50%, yellow 25-50%, red <25%).

### Bottom Control Area

Background is a vertical gradient from `soilDark` (bottom) to transparent.
Respects safe area insets for notched devices via `env(safe-area-inset-bottom)`.

| Position     | Component              | Notes                                     |
|--------------|------------------------|-------------------------------------------|
| Left         | `VirtualJoystick`      | Custom joystick, 80-128px depending on breakpoint |
| Center       | Status text            | Hidden on mobile, shows selected tool name on `md:` |
| Right        | Action button          | 64-96px circle, tool-specific icon + label |

The action button icon and label change dynamically based on `selectedTool`:
trowel shows a seedling ("Plant"), watering-can shows a droplet ("Water"), axe
shows a hatchet ("Chop"), pickaxe shows a pick ("Mine"), and so on.

### Floating Elements

| Layer        | Component                   | File                  | Z-Index | Position     |
|--------------|-----------------------------|-----------------------|---------|--------------|
| Weather      | `WeatherOverlay`            | WeatherOverlay.tsx     | 5       | Full viewport|
| Particles    | `FloatingParticlesContainer`| FloatingParticles.tsx  | 9998    | Top center   |
| Toasts       | `ToastContainer`            | Toast.tsx              | 9999    | Top center   |
| Achievement  | `AchievementPopup`          | AchievementPopup.tsx   | modal   | Center       |

**WeatherOverlay** renders CSS-animated rain drops, drought shimmer,
windstorm sway, snow flakes, or cherry blossom petals depending on the active
weather state. All are `pointer-events-none`.

**FloatingParticles** shows "+XP", "+Timber", etc. text that floats upward and
fades out over 1200ms. Maximum 5 visible simultaneously.

**ToastContainer** displays up to 3 pill-shaped notifications. Types: success
(green), warning (amber), info (blue), achievement (gold). Auto-dismiss after
2500ms with enter/exit CSS transitions.

---

## Desktop Adaptations (768px+)

| Change                    | Details                                           |
|---------------------------|---------------------------------------------------|
| Joystick hidden           | WASD keyboard input replaces the virtual joystick |
| Keyboard badges           | Number keys 1-8 shown on each ToolBelt button     |
| MiniMap shown             | SVG-based minimap in bottom-left corner            |
| Resource labels           | Full text labels appear next to resource icons     |
| Center status text        | Selected tool name shown between joystick zone and action button |

**MiniMap** (`MiniMap.tsx`) renders an SVG-based overhead view of explored chunks
with biome colors and feature icons. Player is a yellow marker. Fog-of-war on
unexplored chunks. On mobile, a fullscreen `MiniMapOverlay` is available via
a toggle button.

---

## Dialogs (Modals)

All dialogs use React Native `Modal` primitives. Max width constrained,
max height `80-85vh` with scroll. Background is `skyMist` (#E8F5E9).

| Dialog         | File           | Trigger                     | Contents                          |
|----------------|----------------|-----------------------------|-----------------------------------|
| `SeedSelect`   | SeedSelect.tsx | Trowel action on empty tile | Species grid, seed counts, costs  |
| `ToolWheel`    | ToolWheel.tsx  | Tool selector button in HUD | Quick tool selection               |
| `PauseMenu`    | PauseMenu.tsx  | Menu button in HUD          | Stats, achievements, codex, map, settings |
| `NpcDialogue`  | NpcDialogue.tsx| Interact with NPC           | Dialogue tree, choices, trade     |
| `TradeDialog`  | TradeDialog.tsx| Trade with NPC/merchant     | Buy/sell interface, prices        |
| `BuildPanel`   | BuildPanel.tsx | Builder's Kit tool          | Structure placement grid          |

### PauseMenu Sections
1. **Grove Stats** -- Level, XP, Trees Planted, Grovekeepers Found, Hearts, Hunger
2. **Achievements** -- Scrollable list of 45 achievements (unlocked/locked/secret)
3. **Codex** -- Species discovery tiers (Unknown through Legendary)
4. **World Map** -- Explored chunks, biome colors, feature icons, campfire markers
5. **Border Cosmetics** -- Prestige-unlocked frame themes (if any unlocked)
6. **Settings** -- Sound, haptics, difficulty display
7. **Navigation** -- Continue Playing / Return to Menu

---

## Sacred Zones

The **bottom-left 200x200px** area is reserved for the joystick on mobile.
No HUD element, tooltip, or overlay should intrude into this region. The
joystick container itself sizes responsively (80-128px) but the exclusion zone
remains 200x200px to accommodate finger movement around the joystick.

---

## Touch and Accessibility

- All interactive touch targets are at minimum **44x44px**.
- All readable text is at minimum **14px**.
- The game canvas has `touch-action: none` to prevent browser gestures.
- `overscroll-behavior: none` on root prevents pull-to-refresh.
- Viewport uses `100dvh` (dynamic viewport height) for mobile notch safety.
- Safe area padding applied via `env(safe-area-inset-*)` on top and bottom bars.
- Toast notifications use `role="status"` and `aria-live="polite"`.
- Action buttons have `aria-label` attributes describing the current action.
- `prefers-reduced-motion`: disables sway, bob, shake, FOV effects, particle arcs.
