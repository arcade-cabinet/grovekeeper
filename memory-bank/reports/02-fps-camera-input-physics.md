# FPS Camera + Input + Physics Audit

**Audited:** 2026-03-07
**Branch:** feat/expo-migration
**Auditor:** QC Agent (Claude Sonnet 4.6)

---

## Summary

The FPS subsystem is **PARTIALLY implemented** — all the individual components and hooks are well-written and internally correct, but they are **not wired into the live game screen**. The running game uses a legacy third-person orbiting camera (`components/scene/Camera.tsx`) and a visual-only capsule placeholder (`components/entities/Player.tsx`). `FPSCamera`, `PlayerCapsule`, and `ToolViewModel` exist as complete, tested code but are **dead — never imported by `app/game/index.tsx`**.

The `InputManager` multi-provider architecture also exists as dead code: no provider is ever registered to the `inputManager` singleton, and the running game calls `useInput()` but discards its return value entirely.

---

## What Works

### FPSCamera (`components/player/FPSCamera.tsx`)
- Real implementation. Uses `PerspectiveCamera` from drei with `makeDefault`, FOV 65.
- Reads ECS `playerQuery` each frame and sets camera position to `pos.y + 1.6` (eye height).
- Calls `useMouseLook()` to attach pointer lock + yaw/pitch control.
- `getCameraPosition()` is a pure exported function — testable seam exists.

### PlayerCapsule (`components/player/PlayerCapsule.tsx`)
- Real Rapier physics body. Imports `CapsuleCollider` and `RigidBody` from `@react-three/rapier`.
- Correct capsule dimensions: 1.8m total, 0.3m radius, 0.6m half-height.
- Calls `usePhysicsMovement` and `useJump` — both are real implementations.
- `lockRotations` is set correctly to prevent capsule from tipping.

### usePhysicsMovement (`game/hooks/usePhysicsMovement.ts`)
- Real physics driver. Reads camera yaw via `camera.getWorldDirection`, projects input to world space using `rotateByYaw`, calls `body.setLinvel()` each frame.
- Preserves Y velocity so Rapier gravity acts normally.
- Speed comes from `config/game/grid.json` (`playerSpeed: 3`) — no inline constants.
- `rotateByYaw()` is a pure exported function with correct math derivation documented.

### useMouseLook (`game/hooks/useMouseLook.ts`)
- Real pointer lock implementation. Calls `canvas.requestPointerLock()` on click.
- Mouse deltas accumulate into `yawRef`/`pitchRef`, applied to `camera.rotation` each frame.
- Rotation order `"YXZ"` is correct for FPS (prevents gimbal lock).
- Pitch clamped to ±85° (from config). MOUSE_SENSITIVITY from config.

### useJump (`game/hooks/useJump.ts`)
- Real Rapier ground check using `world.castRay()` downward from capsule bottom.
- Applies `body.applyImpulse({ x: 0, y: JUMP_IMPULSE, z: 0 })` when grounded.
- Uses `useRapier()` — requires a real `<Physics>` context.

### InputManager (`game/input/InputManager.ts`)
- Well-designed multi-provider architecture with correct merge semantics (movement summed + clamped to unit circle, booleans OR'd, toolSwap first-non-zero).
- `InputFrame` interface covers all required fields: moveX/Z, lookDeltaX/Y, jump, interact, toolSwap, sprint.
- Singleton `inputManager` is exported.

### KeyboardMouseProvider (`game/input/KeyboardMouseProvider.ts`)
- Real WASD + pointer-locked mouse implementation.
- Handles keydown/keyup, mousemove (gated on `document.pointerLockElement`), scroll wheel for tool swap.
- Correct `dispose()` removes all event listeners.

### TouchProvider (`game/input/TouchProvider.ts`)
- Real touch joystick backend. Implements left-zone joystick (with radius clamping, screen-Y inversion for world-Z) and right-zone swipe-to-look.
- Uses call-based API (React components call `onTouchStart`, `onViewportTouchMove`, etc.) — no window event listeners needed.
- `isAvailable()` correctly detects touch hardware.
- Edge-triggered actions (`interactPressed`, `toolSwapAccum`) reset in `postFrame()`.

### VirtualJoystick (`components/game/VirtualJoystick.tsx`)
- Real native PanResponder joystick with dead zone (~15%), spring-back animation, knob clamped to outer ring.
- Writes to a `movementRef: React.RefObject<{ x: number; z: number }>` — ref-based for zero-overhead game loop reads.
- Correct screen-Y inversion (`z = -(ny * magnitude)`).

### ToolViewModel (`components/player/ToolViewModel.tsx`)
- Real implementation. Uses R3F `createPortal(group, camera)` to render the tool GLB fixed to the camera — correct FPS foreground technique.
- Sway (velocity-based lerp) and walk bob (sin wave) computed via pure exported functions.
- Swap animation via anime.js (lower → swap → raise). No placeholder boxes.
- Resolves GLB paths from `config/game/toolVisuals.json` — file exists with all major tools mapped.

### useRaycast (`game/hooks/useRaycast.ts`)
- Real Three.js `Raycaster.setFromCamera()` at screen center each frame.
- Resolves hits to ECS entities via `userData.entityId` (primary) or spatial proximity to `structuresQuery` (fallback for InstancedMesh).
- Shared hit store (`useSyncExternalStore`) bridges Canvas raycast to React Native HUD — architectural seam is correct.

### TargetInfo (`components/player/TargetInfo.tsx`)
- Real HUD overlay. Subscribes to `useTargetHit()`, resolves entity name and action prompt, renders `View` outside Canvas.

### Crosshair (inside `components/game/HUD.tsx`, lines 84–91)
- Real center crosshair rendered as two `View` elements. Included in the live HUD (HUD is mounted in `app/game/index.tsx`).

### Rapier `<Physics>` wrapper
- `app/game/index.tsx` wraps the entire Canvas content in `<Physics>` from `@react-three/rapier`. The package is in `dependencies` at version `^2.2.0`.
- `TerrainChunk.tsx` uses `useRapier()` to create `RigidBodyDesc.fixed()` + `ColliderDesc.trimesh()` per loaded chunk — terrain collision is real.

---

## What Is Stubbed / Broken

### `Player.tsx` — visual-only capsule, no physics
**File:** `components/entities/Player.tsx`

The component mounted in the live game is a pure visual mesh:
```tsx
<mesh ref={meshRef} castShadow>
  <capsuleGeometry args={[CAPSULE_RADIUS, CAPSULE_LENGTH, CAP_SEGMENTS, RADIAL_SEGMENTS]} />
  <meshStandardMaterial color={PLAYER_COLOR} ... />
</mesh>
```
It lerps a `THREE.Mesh` to match the ECS `playerQuery` position. There is no Rapier `RigidBody`, no `CapsuleCollider`, no physics body. The player has no collision with terrain, trees, or anything else.

### `Camera.tsx` — third-person orbiting camera, not FPS
**File:** `components/scene/Camera.tsx`

This is the camera actually mounted in the game (`<Camera />` in `app/game/index.tsx`). It is a **third-person, fixed-orbit, over-the-shoulder camera**:
- Fixed `CAMERA_ALPHA = -Math.PI / 2`, `CAMERA_BETA = 1.35` (spherical coordinates)
- Smooth lerp tracking of the player ECS entity
- `cam.lookAt(target)` — the camera always looks at the player from behind
- No pointer lock, no yaw/pitch, no first-person perspective

### `useInput()` return value discarded
**File:** `app/game/index.tsx`, line 169

```ts
useInput();
```

The hook is called but its return value (`{ moveDirection, setTouchDirection, clearTouch, ... }`) is not used. No movement state from `useInput` is passed to any game component.

### InputManager never populated
**File:** `game/input/InputManager.ts`, line 139

The singleton `inputManager` is exported but no `KeyboardMouseProvider` or `TouchProvider` is ever instantiated or registered via `inputManager.register()` anywhere in the non-test codebase. The `inputManager.poll()` method is never called from the game loop.

### VirtualJoystick not mounted in live game
**File:** `app/game/index.tsx`

`VirtualJoystick` is never imported or rendered in the live game screen. It exists in `GameUI.tsx` (a separate orchestrator component), but `GameUI` itself is never used in `app/game/index.tsx`. The live screen mounts only `HUD`, `ActionButton`, `PauseMenu`, `TutorialOverlay`, and `SeedSelect`.

### TouchProvider not connected to joystick
Even if VirtualJoystick were mounted, the `VirtualJoystick` component writes to a `movementRef` directly — it does NOT call `TouchProvider.onTouchStart/onTouchMove`. The two systems are architecturally disconnected from each other. `TouchProvider` can only be driven by a component that explicitly calls its methods, and no such component exists in the live game.

### `FPSCamera` never mounted
**File:** `components/player/FPSCamera.tsx`

Never imported in `app/game/index.tsx`. Not referenced anywhere outside its own file and test file.

### `PlayerCapsule` never mounted
**File:** `components/player/PlayerCapsule.tsx`

Never imported in `app/game/index.tsx`. Not referenced anywhere outside its own file and test file.

### `ToolViewModel` never mounted
**File:** `components/player/ToolViewModel.tsx`

Never imported or rendered anywhere in the live game screen. The FPS held-tool model is not visible to the player.

### `TargetInfo` not in game screen
**File:** `components/player/TargetInfo.tsx`

`TargetInfo` is imported in `components/game/HUD.tsx` (line 17) and rendered inside the HUD. The HUD IS mounted in the live game, so `TargetInfo` IS reachable — but `useRaycast()` is the source of truth. `useRaycast` is called inside `GameSystems` which is inside `<Physics>`, so the raycast hit store IS being updated. This path works.

---

## Missing Entirely

### GamepadProvider
The spec (`docs/architecture/input-system.md`) calls for a `GamepadProvider`. No such file exists at `game/input/GamepadProvider.ts`. The `InputFrame` has no gamepad-specific fields either.

### AIProvider / PlayerGovernor
The spec calls for an `AIProvider` for autoplay/testing. Not implemented.

### Touch look zone UI component
The `TouchProvider` has a real `onViewportTouchStart/Move/End` API for swipe-to-look, but there is no React Native component that implements the right-half touch zone and calls those methods. The look-zone overlay described in the spec does not exist.

### FPS crosshair for pointer lock state
The current crosshair is two static `View` lines in the HUD. There is no visual state change when pointer lock is acquired/released, and no feedback to the user to click the canvas to enable mouse look.

### ECS player entity sync from Rapier
When `PlayerCapsule` (if it were mounted) moves its RigidBody, there is no system that reads `rigidBody.translation()` and writes back to the ECS `playerQuery` position. `FPSCamera` reads `playerQuery.entities[0].position` — that position would never update from physics without this sync step.

---

## Physics Reality Check

**Is Rapier actually used?**
- YES, partially. `@react-three/rapier` v2.2.0 is installed. `<Physics>` wraps the Canvas. `TerrainChunk.tsx` creates real fixed rigid bodies + trimesh colliders for terrain.

**Is the player a real physics body?**
- NO. The mounted player is `components/entities/Player.tsx` — a `THREE.Mesh` with a `<capsuleGeometry>`. It is not a Rapier body. It has no collider. It passes through terrain. The real Rapier player capsule (`components/player/PlayerCapsule.tsx`) is dead code.

---

## Mobile Input Reality Check

**Is touch joystick real?**
- The `VirtualJoystick` component itself is real and well-implemented (PanResponder, dead zone, spring-back, movementRef). However it is **not mounted in the live game screen**. The player cannot use it.

**Is look zone implemented?**
- The `TouchProvider` has the API surface for a right-half swipe-to-look zone. No React Native component implements that zone or calls the TouchProvider methods. The look zone **does not exist** as a rendered UI.

---

## Critical Issues (numbered)

1. **`FPSCamera` is never mounted.** The live game uses the legacy third-person `Camera` component. The player sees a behind-the-player orbit camera, not first-person perspective.

2. **`PlayerCapsule` is never mounted.** The live player entity is a visual mesh with no physics. It falls through the floor if gravity were applied and collides with nothing.

3. **`ToolViewModel` is never mounted.** The player sees no held tool in their hand — a core spec requirement is invisible.

4. **`useInput()` return value is discarded.** Keyboard WASD input is captured but the resulting `moveDirection` is passed to nothing. No movement is driven by keyboard input.

5. **`InputManager` is unpopulated.** The multi-provider architecture (`KeyboardMouseProvider`, `TouchProvider`, `GamepadProvider`) is never bootstrapped. `inputManager.register()` is never called outside tests.

6. **`VirtualJoystick` is not in the game screen.** Mobile players have no joystick to move with.

7. **No touch look zone component exists.** Even if `TouchProvider` were registered, there is no UI to drive `onViewportTouchStart/Move`.

8. **ECS position is not synced from Rapier.** Even if `PlayerCapsule` were mounted, its physics body translation would never propagate back to the ECS entity, breaking `FPSCamera`'s position tracking and all other systems that read `playerQuery`.

9. **`GameUI` is dead code.** The `GameUI` orchestrator (which wires `VirtualJoystick`, the full HUD, mobile action buttons, stamina gauge, etc.) is never mounted in `app/game/index.tsx`. It is a parallel, competing implementation of the game screen.

10. **No GamepadProvider.** Gamepad input specified in the architecture is entirely missing.

---

## Verdict: FPS Is PARTIAL

All individual FPS components are implemented to a high standard — real Rapier physics, real pointer lock, real touch joystick, real GLB tool rendering. The code quality of each piece is solid.

However, **none of the FPS components are wired into the live game**. The running game is still operating on its pre-FPS-pivot architecture: third-person orbit camera, visual-only player mesh, discarded input state, and an unpopulated InputManager.

The gap is entirely in assembly, not in component quality. Connecting the wires would require:
- Replacing `<Camera />` with `<FPSCamera />` in the Canvas
- Replacing `<Player />` with `<PlayerCapsule moveDirection={...} />` in the Canvas
- Mounting `<ToolViewModel moveDirection={...} />` in the Canvas
- Bootstrapping `inputManager` with `KeyboardMouseProvider` and `TouchProvider` at app init
- Mounting `VirtualJoystick` + a look-zone overlay in the HUD
- Adding an ECS sync system to write Rapier body translation back to `playerQuery` entities
