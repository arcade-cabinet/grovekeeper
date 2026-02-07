# Controls

Grovekeeper is mobile-first. The virtual joystick is the primary input method;
keyboard and mouse are secondary desktop enhancements.

---

## Mobile Input (Primary)

### Virtual Joystick

**File:** `src/game/ui/Joystick.tsx`
**Library:** nipplejs 0.10.x

The joystick is created in `static` mode, anchored at the center of a circular
container in the bottom-left of the screen.

```typescript
nipplejs.create({
  zone: containerRef.current,
  mode: "static",
  position: { left: "50%", top: "50%" },
  size: 100,
  color: COLORS.forestGreen,
  restOpacity: 0.7,
  fadeTime: 100,
});
```

**Container sizing** scales with the viewport:
- Mobile: `w-20 h-20` (80 px)
- Small screens (`sm:`): `w-24 h-24` (96 px)
- Tablets (`md:`): `w-28 h-28` (112 px)
- Desktop (`lg:`): `w-32 h-32` (128 px)

**Isometric rotation:** Raw joystick vectors are rotated 45 degrees to align
with the isometric camera angle:

```typescript
const angle = Math.PI / 4; // 45 degrees
const x = rawX * Math.cos(angle) - rawY * Math.sin(angle);
const z = -(rawX * Math.sin(angle) + rawY * Math.cos(angle));
```

**Data flow:** `Joystick.onMove(x, z)` writes to a `movementRef` (React ref)
in `GameScene.tsx`. The movement system reads this ref every frame to update
the player entity's position. On `end`, the ref is zeroed to stop movement.

**Styling:** The joystick container has a radial gradient background, a bark-
brown border, and an inner decorative dashed ring. The nipplejs handle uses
`forestGreen` as its color.

### Touch-to-Act

Tapping directly on the 3D canvas triggers a raycast from the camera through
the tap point to the ground plane. The hit position is snapped to the nearest
grid cell. If the player is standing on or near that cell, the context action
fires (plant, water, harvest, etc.).

### Sacred Zone

The bottom-left **200 x 200 px** area is exclusively reserved for the joystick.
No other interactive element may overlap this region. This ensures the player's
thumb has room to sweep without accidentally hitting other UI.

---

## Desktop Input (Secondary, 768px+)

### Keyboard Movement

On desktop viewports (`md:` breakpoint and above), the joystick is hidden. A
keyboard input hook listens for `WASD` and arrow keys.

**Isometric conversion** mirrors the joystick math:

```text
worldX = inputX - inputY
worldZ = -(inputX + inputY)
```

Where `inputX` is +1 for D/Right, -1 for A/Left, and `inputY` is +1 for
W/Up, -1 for S/Down.

The result is written to the same `movementRef` that the joystick uses, so the
movement system is input-agnostic.

### Keyboard Shortcuts

| Key     | Action                          |
|---------|---------------------------------|
| W / Up  | Move forward (isometric NW)     |
| A / Left| Move left (isometric SW)        |
| S / Down| Move backward (isometric SE)    |
| D / Right| Move right (isometric NE)      |
| 1-8     | Select tool (matches ToolBelt order) |
| Space   | Context action (same as action button) |
| Escape  | Open/close pause menu           |

Keyboard shortcut badges appear on the ToolBelt buttons at `md:` breakpoint as
small 14 px circles showing the number key.

### Mouse

Mouse click on the canvas triggers the same raycast-to-grid-cell logic as a
touch tap. No additional mouse-specific controls are implemented.

---

## Context Actions

The action system is context-sensitive, determined by the combination of the
currently selected tool and the state of the tile the player is standing on.
This logic lives in `ActionButton.tsx` (`getActionLabel` function).

| Selected Tool    | Tile State                   | Action Label | Effect               |
|------------------|------------------------------|--------------|----------------------|
| Trowel           | Empty soil tile              | PLANT        | Opens SeedSelect, then plants selected species |
| Watering Can     | Tree at stage 0-2            | WATER        | Applies water, accelerates growth |
| Pruning Shears   | Tree at stage 3-4            | PRUNE        | Yields bonus resources |
| Axe              | Tree at stage 3+             | CHOP         | Harvests tree for resources + XP |
| Shovel           | Rock tile                    | CLEAR        | Removes obstacle, converts to soil |
| Compost Bin      | Any tile with a tree         | COMPOST      | Applies fertilizer, speeds growth |
| Almanac          | Any tile with a tree         | INSPECT      | Shows tree info       |

When no valid action is available for the current tool + tile combination, the
action button is greyed out (`opacity: 0.55`) and disabled.

**ActionButton** (`src/game/ui/ActionButton.tsx`) has a minimum touch target of
**72 x 48 px**, with 16 px horizontal padding.

---

## Canvas Configuration

The BabylonJS canvas is configured for mobile-first touch handling:

```css
.grove-game-container {
  width: 100vw;
  height: 100dvh;  /* Dynamic viewport height for mobile notch safety */
  overflow: hidden;
  position: relative;
}
```

Additional mobile settings:
- `touch-action: none` on the joystick container prevents browser gestures
- `overscroll-behavior: none` on `html` and `body` prevents pull-to-refresh
- `position: fixed` on `html` and `body` prevents scroll bounce
- All touch event listeners are passive where possible
- `touch-manipulation` class applied to interactive buttons for 300ms tap delay removal
- Viewport meta tag includes `viewport-fit=cover` and `user-scalable=no`

---

## Haptic Feedback

On devices that support it (via Capacitor), certain actions trigger haptic
feedback through `@capacitor/haptics`. The platform bridge
(`src/game/systems/platform.ts`) wraps the native API and silently no-ops on
unsupported platforms.

Haptic triggers include:
- Planting a tree
- Harvesting a tree
- Level up
- Achievement unlocked
