# Fix Report: W1-G — FPS Camera + Physics Player Mount

**Date:** 2026-03-07
**Branch:** feat/expo-migration
**Agent:** Fix Agent (Claude Sonnet 4.6)

---

## What Was Done

### FIX-09: Swapped Camera → FPSCamera in app/game/index.tsx

**File:** `app/game/index.tsx`

- Removed import of `Camera` from `@/components/scene/Camera` (line 14, was)
- Removed import of `Player` from `@/components/entities/Player` (line 8, was)
- Added import of `FPSCamera` from `@/components/player/FPSCamera` (line 13)
- Added import of `PlayerCapsule` from `@/components/player/PlayerCapsule` (line 14)
- Changed `useInput()` (return discarded) → `const { moveDirection } = useInput()` (line 171) so keyboard WASD input is captured and passed forward
- Replaced `<Camera />` JSX with `<FPSCamera />` (line 203)

### FIX-10: Mounted PlayerCapsule instead of Player mesh

**File:** `app/game/index.tsx`

- Replaced `<Player />` with `<PlayerCapsule moveDirection={moveDirection} />` (line 223)
- `moveDirection` flows from `useInput()` → `PlayerCapsule` → `usePhysicsMovement` → `body.setLinvel()`

### FIX-11: Added Rapier-to-ECS position sync

**File:** `components/player/PlayerCapsule.tsx`

Added imports:
- `useFrame` from `@react-three/fiber` (line 11)
- `playerQuery` from `@/game/ecs/world` (line 16)

Added `useFrame` callback inside `PlayerCapsule` (lines 44–52):
```typescript
useFrame(() => {
  const body = rigidBodyRef.current;
  const playerEntity = playerQuery.entities[0];
  if (!body || !playerEntity) return;
  const translation = body.translation();
  playerEntity.position.x = translation.x;
  playerEntity.position.y = translation.y;
  playerEntity.position.z = translation.z;
});
```

This writes the Rapier RigidBody's world-space translation back to the ECS `playerQuery` entity each frame. `FPSCamera` reads `playerQuery.entities[0].position` — without this sync, the camera would never move.

---

## Physics Wrapper

`<Physics>` from `@react-three/rapier` was already present in `app/game/index.tsx` wrapping all Canvas content. `@react-three/rapier@^2.2.0` is in `dependencies`. No change needed.

---

## Tests Added

**File:** `components/player/PlayerCapsule.test.ts`

Three new tests added to `"PlayerCapsule Rapier-to-ECS sync (Spec §9)"` describe block:

1. `writes Rapier body translation to ECS player position when both exist` — verifies x/y/z are written from `body.translation()` to `playerEntity.position`
2. `does not mutate ECS position when no playerEntity exists` — verifies guard `if (!body || !playerEntity) return` prevents mutation when entity is absent
3. `does not mutate ECS position when body is null` — verifies guard prevents mutation when body ref is null

All 7 PlayerCapsule tests pass. All 8 FPSCamera tests pass.

---

## Test Results

```
PASS components/player/PlayerCapsule.test.ts  (7 tests)
PASS components/player/FPSCamera.test.ts       (8 tests)
```

Full suite: 3558 passing, 10 failing.

The 10 failures are all pre-existing and unrelated to FPS changes:
- `game/config/species.test.ts` — stale count (12 expected, 17 actual — config expanded by US-149)
- `game/systems/speciesDiscovery.test.ts` — stale total (15 expected, 20 actual)
- `game/config/resources.test.ts` — config updated by prior session
- `game/config/difficulty.test.ts` — stale count (5 expected, 4 actual)
- `game/systems/survival.test.ts` — survival system changes by prior session
- `game/ui/Toast.test.ts` — `subscribeToasts` missing from `game/ui/Toast.ts`

None of these touch `components/player/`, `game/ecs/`, or `app/game/` in the FPS subsystem.

---

## TypeScript

Running `npx tsc --noEmit`:

- 0 errors from FPS changes
- 1 pre-existing error: `game/hooks/useSpiritProximity.ts(217,58)` — untracked file added by prior session (US-154), not in my scope

---

## Complications

None. All components were fully implemented and tested — only the wiring was missing, exactly as described in the audit report (`memory-bank/reports/02-fps-camera-input-physics.md`).

The sync loop frame order is correct: `usePhysicsMovement` writes linvel → Rapier advances simulation → Rapier-to-ECS sync reads `body.translation()` → `FPSCamera` reads ECS position. All three hooks run in the same `useFrame` pass, but the physics step is owned by `<Physics>` — Rapier resolves before `useFrame` callbacks fire at default priority, so the position read is up-to-date each frame.
