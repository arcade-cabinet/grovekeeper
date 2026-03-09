# Touch Controls

> **STATUS (2026-03-07):** This document is current and aligned with the unified design. No changes needed. The custom virtual joystick, viewport swipe-to-look, and action button patterns are canonical.

## Principle

Mobile-first. Touch controls must feel native and responsive on a 375px-wide phone screen. The virtual joystick and action buttons are custom implementations -- no external dependencies (nipplejs is removed).

All touch targets are minimum 44x44px. All touch handlers use passive event listeners where possible.

## Layout

```
+----------------------------------+
|  [HUD: resources, stamina, XP]   |
|                                  |
|                                  |
|          3D VIEWPORT             |
|          (touch-action: none)    |
|                                  |
|                                  |
|  (O)                      [USE] |
|  joystick               [CYCLE] |
|  zone                          |
+----------------------------------+
```

| Element | Position | Size | Function |
|---------|----------|------|----------|
| Joystick zone | Bottom-left | 128x128px | Movement + look (see below) |
| Joystick knob | Center of zone | 48x48px | Visual indicator |
| USE button | Bottom-right | 64x64px | Use current tool on target |
| CYCLE button | Above USE | 56x56px | Cycle to next tool |
| Viewport | Full screen | - | Swipe-to-look (right half) |

## Virtual Joystick

Custom implementation -- no library dependency. The joystick captures touch in a circular dead zone, normalizes displacement to [-1, 1] on both axes, and writes directly to InputFrame.

```typescript
// src/game/input/providers/TouchProvider.ts

export class TouchProvider implements IInputProvider {
  private joystickCenter = { x: 0, y: 0 };
  private isDragging = false;
  private readonly maxRadius = 40; // pixels

  onTouchStart(touch: Touch, zoneRect: DOMRect): void {
    this.isDragging = true;
    this.joystickCenter.x = zoneRect.left + zoneRect.width / 2;
    this.joystickCenter.y = zoneRect.top + zoneRect.height / 2;
    this.updateFromTouch(touch);
  }

  onTouchMove(touch: Touch): void {
    if (!this.isDragging) return;
    this.updateFromTouch(touch);
  }

  onTouchEnd(): void {
    this.isDragging = false;
    this.moveX = 0;
    this.moveZ = 0;
    // Reset knob visual position
  }

  private updateFromTouch(touch: Touch): void {
    let dx = touch.clientX - this.joystickCenter.x;
    let dy = touch.clientY - this.joystickCenter.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    // Clamp to max radius
    if (dist > this.maxRadius) {
      dx = (dx / dist) * this.maxRadius;
      dy = (dy / dist) * this.maxRadius;
    }

    // Normalize to [-1, 1]
    this.moveX = dx / this.maxRadius;  // left/right
    this.moveZ = -(dy / this.maxRadius); // forward/back (inverted Y)
  }

  // Visual: update knob element transform
  updateKnobVisual(knobElement: HTMLElement, dx: number, dy: number): void {
    knobElement.style.transform =
      `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;
  }
}
```

### Joystick Rendering

The joystick is a CSS overlay, NOT a Three.js element:

```tsx
// src/game/ui/VirtualJoystick.tsx

export const VirtualJoystick = ({ provider }: Props) => {
  const zoneRef = useRef<HTMLDivElement>(null);
  const knobRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const zone = zoneRef.current;
    if (!zone) return;

    const onStart = (e: TouchEvent) => {
      e.preventDefault();
      const rect = zone.getBoundingClientRect();
      provider.onTouchStart(e.touches[0], rect);
    };
    const onMove = (e: TouchEvent) => {
      e.preventDefault();
      provider.onTouchMove(e.touches[0]);
    };
    const onEnd = () => provider.onTouchEnd();

    zone.addEventListener('touchstart', onStart, { passive: false });
    zone.addEventListener('touchmove', onMove, { passive: false });
    zone.addEventListener('touchend', onEnd);

    return () => {
      zone.removeEventListener('touchstart', onStart);
      zone.removeEventListener('touchmove', onMove);
      zone.removeEventListener('touchend', onEnd);
    };
  }, [provider]);

  return (
    <div
      ref={zoneRef}
      className="absolute bottom-8 left-8 w-32 h-32 rounded-full
                 border-2 border-amber-600/30 bg-stone-900/40
                 shadow-[inset_0_0_20px_rgba(0,0,0,0.5)]
                 flex items-center justify-center"
    >
      <div
        ref={knobRef}
        className="w-12 h-12 rounded-full bg-amber-600/80
                   border-2 border-stone-900 shadow-lg
                   transition-transform duration-75"
      />
    </div>
  );
};
```

## Look Controls (Viewport Swipe)

The right half of the screen (or any area outside the joystick zone) handles look input via swipe gestures. Touch delta is mapped to `lookDeltaX` / `lookDeltaY` on the InputFrame.

```typescript
// In TouchProvider

private lookTouchId: number | null = null;
private lastLookPos = { x: 0, y: 0 };

onViewportTouchStart(touch: Touch): void {
  this.lookTouchId = touch.identifier;
  this.lastLookPos.x = touch.clientX;
  this.lastLookPos.y = touch.clientY;
}

onViewportTouchMove(touch: Touch): void {
  if (touch.identifier !== this.lookTouchId) return;

  this.lookDeltaX = (touch.clientX - this.lastLookPos.x) * 0.003;
  this.lookDeltaY = (touch.clientY - this.lastLookPos.y) * 0.003;

  this.lastLookPos.x = touch.clientX;
  this.lastLookPos.y = touch.clientY;
}

onViewportTouchEnd(touch: Touch): void {
  if (touch.identifier !== this.lookTouchId) return;
  this.lookTouchId = null;
  this.lookDeltaX = 0;
  this.lookDeltaY = 0;
}
```

The `0.003` sensitivity factor is configurable in `config/game/input.json`.

## Action Buttons

Two buttons on the right side of the screen:

```tsx
<button
  onTouchStart={(e) => { e.preventDefault(); inputFrame.useTool = true; }}
  onTouchEnd={() => { inputFrame.useTool = false; }}
  className="absolute bottom-10 right-10 w-16 h-16 rounded-full
             bg-stone-800 border-2 border-amber-200 text-amber-100
             font-bold shadow-lg active:scale-90
             flex items-center justify-center"
>
  USE
</button>

<button
  onTouchStart={(e) => { e.preventDefault(); inputFrame.toolCycle = 1; }}
  onTouchEnd={() => { inputFrame.toolCycle = 0; }}
  className="absolute bottom-28 right-14 w-14 h-14 rounded-full
             bg-green-900 border-2 border-amber-400 text-white
             font-bold shadow-lg active:scale-90
             flex items-center justify-center"
>
  NEXT
</button>
```

## Multi-Touch Handling

The system supports simultaneous joystick + look + button via touch identifier tracking:

1. Joystick touch: captured by joystick zone element
2. Look touch: any touch on the viewport NOT in joystick zone
3. Button touch: captured by button elements (pointer-events-auto)

Each touch is tracked by its `identifier` to prevent cross-contamination.

## Desktop Fallback

On desktop, the joystick and buttons are hidden. Pointer lock captures mouse for look. WASD for movement. Left-click for USE. Mouse wheel for tool cycle.

Detection:

```typescript
const isMobile = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
```

## Config: input.json

```json
{
  "touch": {
    "joystickMaxRadius": 40,
    "lookSensitivity": 0.003,
    "deadZone": 0.1
  },
  "mouse": {
    "lookSensitivity": 0.002,
    "invertY": false
  },
  "keyboard": {
    "moveSpeed": 1.0,
    "sprintMultiplier": 1.3
  }
}
```

## File Structure

```
src/game/input/
  InputManager.ts                -- Singleton, merges all providers
  InputActions.ts                -- InputFrame interface
  providers/
    KeyboardMouseProvider.ts     -- WASD + mouse look + pointer lock
    TouchProvider.ts             -- Joystick + viewport swipe + buttons
    GamepadProvider.ts           -- Controller support (future)

src/game/ui/
  VirtualJoystick.tsx            -- Joystick overlay (CSS)
  ActionButtons.tsx              -- USE + CYCLE buttons (CSS)
  TouchOverlay.tsx               -- Container for all touch UI
```

## Accessibility

- Joystick zone has `aria-label="Movement joystick"`
- Buttons have clear labels (USE, NEXT)
- All interactive elements meet 44px minimum
- `touch-action: none` on the 3D canvas only, NOT on UI overlays
- Haptic feedback via Capacitor on button press (if available)
