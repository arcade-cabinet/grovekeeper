# Controls

Grovekeeper is mobile-first, portrait-primary. The virtual joystick is the primary
input method; keyboard and mouse are secondary desktop enhancements.

**Canonical spec:** [`docs/plans/2026-03-07-unified-game-design.md`](../plans/2026-03-07-unified-game-design.md) Sections 6 and 12.

---

## Mobile Input (Primary)

### Virtual Joystick

**File:** `components/game/VirtualJoystick.tsx`
**Library:** Custom implementation (no nipplejs dependency)

The joystick is rendered as a circular touch zone in the bottom-left of the screen.
Touch start creates the joystick at the touch point; drag sets direction and magnitude.

**Container sizing** scales with the viewport:
- Mobile: 80px
- Small screens (`sm:`): 96px
- Tablets (`md:`): 112px
- Desktop (`lg:`): 128px

**Data flow:** Joystick writes movement vector to a ref consumed by the movement
system every frame. On touch end, the ref is zeroed to stop movement.

### Look Zone (FPS Pivot -- Planned)

Swipe-to-look on the right half of the screen for FPS camera rotation.
See `docs/architecture/touch-controls.md` for full spec.

### Action Buttons

**File:** `components/game/MobileActionButtons.tsx`

Quick tool select + action execution. Bottom-right of viewport. Minimum 44px
touch targets per CLAUDE.md mobile-first requirements.

### Sacred Zone

The bottom-left **200 x 200 px** area is exclusively reserved for the joystick.
No other interactive element may overlap this region. This ensures the player's
thumb has room to sweep without accidentally hitting other UI.

---

## Desktop Input (Secondary, 768px+)

### Keyboard Movement

On desktop viewports (`md:` breakpoint and above), the joystick is hidden. The
`useInput` hook listens for `WASD` and arrow keys.

The movement vector is written to the same ref that the joystick uses, so the
movement system is input-agnostic.

### Keyboard Shortcuts

| Key      | Action                               |
|----------|--------------------------------------|
| W / Up   | Move forward                         |
| A / Left | Move left                            |
| S / Down | Move backward                        |
| D / Right| Move right                           |
| 1-8      | Select tool (matches ToolBelt order) |
| Space    | Context action (same as action button)|
| Escape   | Open/close pause menu                |

Keyboard shortcut badges appear on the ToolBelt buttons at `md:` breakpoint as
small 14px circles showing the number key.

### Mouse

Mouse click on the canvas triggers raycast-to-target logic. Desktop mouse look
planned for FPS camera pivot (see `docs/plans/2026-03-06-fps-perspective-design.md`).

---

## Context Actions

The action system is context-sensitive, determined by the combination of the
currently selected tool and the target the player is looking at (raycast from
camera center, per-tool range). Logic lives in `ActionButton.tsx` and will move
to a raycast-based interaction system in the FPS pivot.

| Selected Tool    | Target                       | Action Label | Effect                     |
|------------------|------------------------------|--------------|----------------------------|
| Trowel           | Empty soil tile              | PLANT        | Opens SeedSelect, plants   |
| Watering Can     | Tree at stage 0-2            | WATER        | Applies water, +1.5x growth|
| Pruning Shears   | Tree at stage 3-4            | PRUNE        | Yields bonus resources     |
| Axe              | Tree at stage 3+             | CHOP         | Harvests tree for resources + XP |
| Shovel           | Rock tile / blocked tile     | DIG          | Removes obstacle, converts to soil |
| Pickaxe          | Rock formation               | MINE         | Extract stone, ore         |
| Fishing Rod      | Water tile (pond/river)      | FISH         | Catch fish + rare drops    |
| Hammer           | Structure (damaged)          | REPAIR       | Restore structure durability|
| Almanac          | Any tree / NPC               | INSPECT      | Shows info                 |

When no valid action is available, the action button is greyed out and disabled.

### Crosshair Feedback (FPS Pivot -- Planned)

- Crosshair color: green (valid target), amber (out-of-range), red (invalid)
- Context label below crosshair: "Chop" / "Plant" / "Mine" etc.
- Per-tool range: 3.0 / 4.0 / 6.0 units

---

## Canvas Configuration

The R3F Canvas is configured for PSX aesthetic and mobile-first touch handling:

```tsx
<Canvas
  gl={{
    antialias: false,
    pixelRatio: 1,
    toneMapping: NoToneMapping,
    outputColorSpace: LinearSRGBColorSpace,
  }}
/>
```

Additional mobile settings:
- `touch-action: none` on the joystick container prevents browser gestures
- `overscroll-behavior: none` prevents pull-to-refresh
- All touch event listeners are passive where possible
- Viewport uses `100dvh` (dynamic viewport height) for mobile notch safety

---

## Haptic Feedback

On devices that support it (via Capacitor), certain actions trigger haptic
feedback. The haptics system (`game/systems/haptics.ts`) wraps the native API
and silently no-ops on unsupported platforms.

Haptic triggers include:
- Planting a tree
- Harvesting a tree
- Tool impact on target
- Level up
- Achievement unlocked
- Growth stage transition
