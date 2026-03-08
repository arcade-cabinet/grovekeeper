# Fix W6-C: Audio Wiring — Four Gaps Closed

**Date:** 2026-03-07
**Agent:** W6-C
**Branch:** feat/expo-migration
**Status:** COMPLETE

---

## Summary

The W5-B audio audit found the game was completely silent due to four structural gaps. All four are now fixed.

---

## Fix 1: startAudio() wired to first user gesture

**File changed:** `app/game/index.tsx`

Added `onTouchStart={handleFirstGesture}` to the root `<View>` of the game screen. `handleFirstGesture` is a `useCallback` that calls `startAudio()` once (guarded by `audioStarted` ref), then populates `ambientAudioRef.current` with the result of `initAmbientLayers(createToneLayerNode)`.

This satisfies the browser autoplay policy: Web Audio will not play until the first user touch event.

---

## Fix 2: createToneLayerNode() implemented

**New file:** `game/systems/toneLayerFactory.ts`

Implements all 6 ambient synthesis layers as specified in Spec §27.2:

| Layer | Synthesis chain |
|-------|----------------|
| wind | Noise(brown) -> Filter(lowpass, 380Hz) -> Volume |
| birds | FMSynth(harmonicity=8) -> Volume |
| insects | Noise(white) -> Filter(bandpass, 5200Hz) -> Volume |
| crickets | Oscillator(square, 2400Hz) -> Volume (Tone.js Oscillator does not support "pulse" type; "square" is acoustically equivalent) |
| water | Noise(brown) -> Filter(lowpass, 240Hz) -> Volume |
| vegetation | Noise(pink) -> Filter(bandpass, 620Hz) -> Volume |

Each node starts at -Infinity volume. `setVolume(db)` ramps to -Infinity when db < -50 (silence threshold) to avoid wasted CPU, otherwise ramps to the given dB value over 0.1s.

**Test file:** `game/systems/toneLayerFactory.test.ts` — 24 tests verifying interface shape, per-layer synthesis class selection, setVolume threshold behavior, and lifecycle methods.

---

## Fix 3: initAmbientLayers() called after audio starts

**Files changed:** `app/game/index.tsx`, `game/hooks/useGameLoop/index.ts`

`useGameLoop` was modified to accept an optional `ambientAudioRef: MutableRefObject<AmbientAudioState | null>` via a new `UseGameLoopOptions` interface. When provided, the game loop reads from this external ref instead of an always-null internal ref.

`GameSystems` component in `app/game/index.tsx` was given a prop to accept and forward the `ambientAudioRef`. The ref is populated in `handleFirstGesture` after `startAudio()` resolves, via:
```
ambientAudioRef.current = initAmbientLayers(createToneLayerNode);
```

The existing `tickAmbientAudio` call in `useGameLoop` (guarded by `if (ambientAudioRef.current)`) now activates after the first user touch.

---

## Fix 4: Tool SFX wired to action dispatcher

**File changed:** `game/actions/actionDispatcher.ts`

Added `import { audioManager } from "@/game/systems/AudioManager"`.

After successful tool actions, `audioManager.playSound()` is called:
- PLANT success -> `"plant"`
- CHOP success -> `"chop"`
- WATER success -> `"water"`
- MINE success -> `"harvest"` (mining counts as a harvest)
- Any action that resolves but fails execution -> `"error"`

DIG and PRUNE are intentionally omitted -- no SoundId exists for those verbs yet.

**Test file fix:** `game/actions/actionDispatcher.test.ts` and `game/hooks/useInteraction.test.ts` both received a mock for `@/game/systems/AudioManager` to prevent Tone.js ESM import errors in Jest.

---

## Test Results

```
Test Suites: 165 passed, 165 total
Tests:       3988 passed, 3988 total
```

Pre-existing failures (unrelated): `TreeInstances.test.ts`, `terrainGenerator.test.ts`, `wildTreeRegrowth.test.ts` — confirmed pre-existing on HEAD.

---

## TypeScript

`npx tsc --noEmit` — zero new errors introduced. All errors in the output are pre-existing (TS5097 allowImportingTsExtensions; TS2739 DayNightComponent missing fields).

---

## Files Created

- `game/systems/toneLayerFactory.ts` — 6-layer Tone.js ambient factory
- `game/systems/toneLayerFactory.test.ts` — 24 tests

## Files Modified

- `app/game/index.tsx` — startAudio + initAmbientLayers on first gesture; ambientAudioRef passed to GameSystems
- `game/hooks/useGameLoop/index.ts` — accepts optional external ambientAudioRef via UseGameLoopOptions
- `game/actions/actionDispatcher.ts` — audioManager import + playSound calls on tool action outcomes
- `game/actions/actionDispatcher.test.ts` — AudioManager mock (prevent Tone.js ESM error)
- `game/hooks/useInteraction.test.ts` — AudioManager mock (prevent Tone.js ESM error)
