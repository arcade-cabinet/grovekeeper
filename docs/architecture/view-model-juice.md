# View Model Juice (Hand Sway, Bob, Sprint FOV)

> **STATUS (2026-03-07):** This document is current and aligned with the unified design. No changes needed. These values match Section 6 of the unified design doc exactly.

## Principle

The first-person tool view model isn't just a static mesh bolted to the camera. It responds to player movement with subtle physics-inspired motion that makes the game feel alive. These effects are purely cosmetic -- they don't affect gameplay.

All effects respect `prefers-reduced-motion` -- when enabled, sway and bob are disabled, only tool switch and use animations remain.

## Effects

### 1. Hand Sway (Camera Turn Response)

When the player turns, the held tool lags slightly behind, creating a natural weight feel.

```typescript
// Track camera rotation deltas between frames
let deltaYaw = camera.rotation.y - lastYaw;
let deltaPitch = camera.rotation.x - lastPitch;

// Wrap yaw delta
if (deltaYaw > Math.PI) deltaYaw -= Math.PI * 2;
if (deltaYaw < -Math.PI) deltaYaw += Math.PI * 2;

// Smooth sway (lerp toward clamped delta)
swayX = lerp(swayX, clamp(deltaYaw * 1.5, -0.2, 0.2), 10 * dt);
swayY = lerp(swayY, clamp(-deltaPitch * 1.5, -0.2, 0.2), 10 * dt);

// Apply to tool offset
toolOffset.x += swayX;
toolOffset.y += swayY;

lastYaw = camera.rotation.y;
lastPitch = camera.rotation.x;
```

| Parameter | Value | Notes |
|-----------|-------|-------|
| Sway multiplier | 1.5 | How much turn speed maps to offset |
| Sway clamp | +/- 0.2 | Maximum offset in either direction |
| Sway recovery | 10 * dt | How fast sway returns to center |

### 2. Walk Bob

While the player moves, the tool bobs vertically with a sinusoidal pattern.

```typescript
if (isMoving && onGround) {
  const freq = isSprinting ? 15 : 10;
  const amp = isSprinting ? 0.05 : 0.02;
  toolOffset.y += Math.sin(time * freq) * amp;
}
```

When standing still, a very subtle idle breath:

```typescript
if (!isMoving) {
  toolOffset.y += Math.sin(time * 2) * 0.005;
}
```

| Parameter | Walk | Sprint | Idle |
|-----------|------|--------|------|
| Frequency | 10 Hz | 15 Hz | 2 Hz |
| Amplitude | 0.02 | 0.05 | 0.005 |

### 3. Sprint FOV Shift

Sprinting subtly widens the field of view for a sense of speed.

```typescript
const targetFov = isSprinting ? 72 : 65;
camera.fov = lerp(camera.fov, targetFov, 8 * dt);
camera.updateProjectionMatrix();
```

| Parameter | Value | Notes |
|-----------|-------|-------|
| Normal FOV | 65 | From fps-camera.md spec |
| Sprint FOV | 72 | Subtle widening, not dramatic |
| Lerp speed | 8 * dt | Smooth transition |

Note: The reference code used 75/95 FOV which is too aggressive for a cozy game. Grovekeeper uses a tighter range.

### 4. Tool Offset Interpolation

All offset changes (sway, bob, switch animation) are applied via lerp, never snapped:

```typescript
// Module-scope temp vector
const _targetPos = new THREE.Vector3();

// In useFrame:
_targetPos.set(
  baseOffset.x + swayX + walkBobX,
  baseOffset.y + swayY + walkBobY,
  baseOffset.z,
);
toolMesh.position.lerp(_targetPos, 0.3);
```

The `0.3` lerp factor creates a soft, springy feel -- the tool "follows" the target position with slight delay.

## Integration with ToolViewModel

These effects layer ON TOP of the per-tool offset defined in `config/game/toolVisuals.json`. The base offset positions the tool correctly in view; juice effects add motion relative to that base.

```
Final tool position = base offset (from config)
                    + sway offset (from camera turn)
                    + bob offset (from movement)
                    + use animation offset (from tool action)
                    + switch animation offset (from tool change)
```

## Config

All juice parameters live in `config/game/viewModelJuice.json`:

```json
{
  "sway": {
    "multiplier": 1.5,
    "clamp": 0.2,
    "recovery": 10
  },
  "walkBob": {
    "walkFreq": 10,
    "walkAmp": 0.02,
    "sprintFreq": 15,
    "sprintAmp": 0.05,
    "idleFreq": 2,
    "idleAmp": 0.005
  },
  "sprintFov": {
    "normal": 65,
    "sprint": 72,
    "lerpSpeed": 8
  },
  "positionLerp": 0.3
}
```

## Reduced Motion

When `prefers-reduced-motion: reduce` is active:

- Sway: disabled (multiplier = 0)
- Walk bob: disabled (amplitude = 0)
- Sprint FOV: disabled (stays at normal FOV)
- Tool switch: instant swap (no drop/rise)
- Tool use: still plays (it's feedback, not decoration)

```typescript
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const juiceConfig = reducedMotion ? REDUCED_JUICE : FULL_JUICE;
```

## File

`components/player/ToolViewModel.tsx` -- all juice logic lives here, reading config from JSON.
