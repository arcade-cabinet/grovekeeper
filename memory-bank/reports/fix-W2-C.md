# FIX-W2-C: TouchLookZone Component

**Date:** 2026-03-07
**Branch:** feat/expo-migration
**Status:** COMPLETE

---

## What Was Done

Created the `TouchLookZone` component — the right-half-screen swipe area that drives FPS camera look on mobile. Wrote 30 passing tests and mounted the component in the live game screen.

---

## Component Architecture

**File:** `components/player/TouchLookZone.tsx`

Three exported layers:

1. **`computeLookDelta(dx, dy, sensitivity, deadZone)`** — pure function. Given raw pixel displacement, returns scaled radian deltas or `null` if within dead zone. No side effects, fully testable.

2. **`buildLookZoneHandlers(refs, provider)`** — pure factory. Takes mutable refs and a `LookZoneProvider` instance, returns the five PanResponder handler callbacks. Extracted from the component so tests can exercise forwarding logic without hooks or React rendering context.

3. **`TouchLookZone`** — React Native component. Creates `useRef` for `activeTouchId` and `prevPos`, calls `buildLookZoneHandlers` inside `useMemo`, renders a transparent `<View>` covering the right 50% of the screen.

### Provider connection

The component drives `TouchProvider` via its call-based API: `onViewportTouchStart`, `onViewportTouchMove`, `onViewportTouchEnd`. The `TouchProvider` accumulates look deltas internally and resets them in `postFrame()`. The component only pushes events — it never reads from the provider.

A module-level singleton `touchLookZoneProvider` (a `TouchProvider` instance) is exported for registration in `InputManager` at app init.

---

## Sensitivity Value

```
LOOK_SENSITIVITY = 0.003  (radians per pixel)
```

Matches `LOOK_SENSITIVITY` in `TouchProvider.ts` so both code paths produce identical camera speed. A 100px horizontal swipe = 0.3 radians ≈ 17.2° of yaw.

This constant is defined in `TouchLookZone.tsx` with a comment noting it should be moved to `config/game/controls.json` when that config loader exists.

---

## Dead Zone Value

```
LOOK_DEAD_ZONE = 2  (pixels)
```

Minimum displacement magnitude required before a move event is forwarded to `TouchProvider`. Movements with `sqrt(dx²+dy²) < 2` are discarded. `prevPos` is only updated when a move is accepted, so the dead zone resets on each accepted move rather than accumulating.

---

## Where It's Mounted

`app/game/index.tsx` — added after the `<HUD>` overlay and before the action button overlay:

```tsx
{/* Touch look zone — right-half swipe area driving FPS camera look on mobile (Spec §23). */}
<TouchLookZone />
```

The z-order (rendered after HUD) means the HUD touch targets (top bar, left-side elements) are accessible, while the right half of the screen captures look swipes transparently.

---

## Test Results

**File:** `components/player/TouchLookZone.test.ts`
**Command:** `pnpm test components/player/TouchLookZone --no-coverage`

```
PASS components/player/TouchLookZone.test.ts
  computeLookDelta (Spec §23)          — 16 tests
  TouchLookZone constants (Spec §23)   — 3 tests
  buildLookZoneHandlers (Spec §23)     — 11 tests

Tests: 30 passed, 30 total
```

TypeScript check (`npx tsc --noEmit`) — 0 errors in new files. Pre-existing errors in `actionDispatcher.ts`, `useGameLoop.ts`, `useInteraction.ts`, and `GamepadProvider.test.ts` are unrelated to this work.

---

## Key Design Decisions

- **Handler extraction pattern** (`buildLookZoneHandlers`): The PanResponder config is not tested by spying on `PanResponder.create` or by calling the component outside a React tree. Instead, the handler logic is extracted into a pure factory function that tests can invoke directly. This is consistent with the project's established pattern of exporting pure testable seams (same as `computeLookDelta`, `getCameraPosition`, `rotateByYaw`, etc.).

- **Dead zone gate on prevPos update**: `prevPos` is only updated when a move clears the dead zone. This means consecutive sub-threshold micro-movements do not accumulate. Each accepted move establishes a new baseline.

- **Provider raw coords, not scaled coords**: The component forwards raw `pageX/pageY` pixel coords to `TouchProvider.onViewportTouchMove`. `TouchProvider` applies `LOOK_SENSITIVITY` internally. The dead zone check in `computeLookDelta` uses sensitivity to compute the radian delta for verification in tests, but the actual provider accumulation remains in `TouchProvider` as the single source of truth.
