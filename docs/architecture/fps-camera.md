# First-Person Camera & Player Controller

> **STATUS (2026-03-07):** This document is current and aligned with the unified design. No changes needed. Note: "zone transitions" below should be read as "chunk streaming" -- there are no zone boundaries or fade-to-black transitions in the infinite world. Chunks stream seamlessly.

## Principle

The player IS the camera. No visible player mesh. A Rapier KinematicCharacterController capsule handles collision. The camera is at eye height inside the capsule.

## Camera Parameters

| Parameter | Value | Notes |
|-----------|-------|-------|
| Eye height | 1.6 | Units above ground |
| Capsule radius | 0.35 | Collision body |
| FOV | 65 | Wider than old 55 for immersion |
| Near clip | 0.1 | See tool model up close |
| Far clip | 100 | - |
| Pitch clamp | +/- 72 deg | Can look down at ground, up at canopy |

## Movement

| Parameter | Value | Notes |
|-----------|-------|-------|
| Walk speed | 4 units/sec | Cozy pace (slower than FPS games) |
| Sprint multiplier | 1.3x | Gentle jog |
| Ground plane | Y = 0 | Player stays on ground, no jump, no gravity |
| Collision | KinematicCharacterController | Capsule collider |

## PlayerController Component

R3F component that:

1. Creates Rapier capsule collider (invisible)
2. On mount: registers input providers (KeyboardMouseProvider, TouchProvider, etc.)
3. Every frame (`useFrame`):
   - `inputManager.poll(dt)` -> get InputFrame
   - Apply look (yaw/pitch with clamping)
   - Compute movement vector from forward/right basis vectors
   - Apply movement via character controller
   - Sync camera position to capsule
   - `inputManager.postFrame()`
4. On unmount: dispose providers

## Head Bob (optional, respects `prefers-reduced-motion`)

Subtle sine bob while walking: `bobY = sin(time * 8) * 0.03`.

## Zone Transitions

Fade-to-black (0.5s), teleport player to new zone entrance, fade-in. No seamless streaming.

## ECS Entity

The player ECS entity still tracks position for:
- Stamina regen (proximity to structures)
- Zone detection (which zone are you in?)
- NPC interaction range
- Quest progress (zones visited)

## File Structure

```
components/player/
  PlayerController.tsx   -- FPS camera + movement + Rapier collider
  ToolViewModel.tsx      -- First-person held tool model
  Crosshair.tsx          -- Screen-center crosshair overlay
  TargetInfo.tsx         -- "Looking at X / action available" HUD element
```
