# Input System Architecture

> **STATUS (2026-03-07):** This document is current and aligned with the unified design. No changes needed. The InputFrame pattern, InputManager singleton, and provider architecture are the canonical input system spec.

## Principle

Game code NEVER reads raw events. It reads an `InputFrame` -- a per-tick snapshot of all input state, merged from multiple providers.

## InputFrame

```typescript
interface InputFrame {
  // Movement (normalized -1..1, clamped to unit circle)
  moveX: number;  // strafe: -1 = left, +1 = right
  moveZ: number;  // forward/back: -1 = backward, +1 = forward

  // Look deltas (radians this frame)
  lookDeltaX: number;  // yaw
  lookDeltaY: number;  // pitch

  // Tool actions
  useTool: boolean;    // primary action (dig, chop, water, plant, prune)
  altAction: boolean;  // secondary action (inspect, cancel, open seed select)

  // Navigation
  pause: boolean;
  interact: boolean;     // NPC talk, structure activate
  openInventory: boolean;

  // Tool selection
  toolSlot: number;    // 0 = no change, 1-N = specific slot
  toolCycle: number;   // -1 = prev, 0 = none, +1 = next
}
```

## InputManager

Singleton that orchestrates multiple providers into one InputFrame per tick.

```typescript
interface IInputProvider {
  readonly type: string;
  enabled: boolean;
  poll(dt: number): Partial<InputFrame>;
  postFrame(): void;
  isAvailable(): boolean;
  dispose(): void;
}

class InputManager {
  register(provider: IInputProvider): void;
  unregister(provider: IInputProvider): void;
  poll(dt: number): InputFrame;    // merge all providers
  postFrame(): void;               // reset accumulators
  dispose(): void;                 // cleanup all providers
}
```

### Merge rules

- **Movement:** sum all providers, clamp to unit circle
- **Look deltas:** sum all providers
- **Booleans (useTool, altAction, pause, interact):** OR across providers
- **Tool slot/cycle:** first non-zero wins

## Providers

### KeyboardMouseProvider (desktop)

| Input | Action |
|-------|--------|
| W/S | moveZ +1/-1 |
| A/D | moveX -1/+1 |
| Mouse move | lookDeltaX/Y (pointer lock) |
| Left click | useTool |
| Right click | altAction |
| 1-9 | toolSlot |
| Scroll wheel | toolCycle |
| E | interact |
| ESC | pause |
| Tab | openInventory |

Pointer lock activates on canvas click, releases on ESC.

### TouchProvider (mobile)

```
+------------------------------------------+
|  [pause]                    [tool1][tool2]|
|                             [tool3][tool4]|
|                                           |
|                                           |
|                    +                      |  <- crosshair
|                                           |
|                          [LOOK ZONE 50%]  |
|                                           |
|  [JOYSTICK]              [ALT]   [USE]   |
|  120px                    60px    90px    |
+------------------------------------------+
```

- **Left:** Virtual joystick (PanResponder, 120px, bottom-left)
- **Right half:** Look zone (touch drag -> lookDeltaX/Y)
- **USE button:** Primary action (bottom-right, 90px, label changes: "DIG", "CHOP", "WATER")
- **ALT button:** Secondary action (above USE, 60px)
- **Tool slots:** Top-right corner, 44px each

Sensitivity: `LOOK_SENSITIVITY_BASE = 0.004 radians/pixel`.

### GamepadProvider

Standard gamepad mapping. Left stick = movement, right stick = look, triggers = useTool/altAction.

### AIProvider

For PlayerGovernor autoplay and testing. Programmatically sets InputFrame fields.

## File Structure

```
game/input/
  InputActions.ts        -- InputFrame interface + emptyInputFrame()
  InputManager.ts        -- Singleton manager
  providers/
    KeyboardMouseProvider.ts
    TouchProvider.tsx     -- React component + provider
    GamepadProvider.ts
    AIProvider.ts
    index.ts
```

## Integration

PlayerController calls `inputManager.poll(dt)` every frame in `useFrame()`, then `inputManager.postFrame()` after consuming the frame.
