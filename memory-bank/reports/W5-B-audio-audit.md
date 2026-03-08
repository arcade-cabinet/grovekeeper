# W5-B: Audio System Deep-Scrutiny Audit

**Date:** 2026-03-07
**Auditor:** Claude Sonnet 4.6
**Branch:** feat/expo-migration
**Scope:** Tone.js engine, AudioManager, NativeAudioManager, ambientAudio, audioZonePlacer, AmbientZoneComponent, weather audio, tool SFX, NPC audio

---

## Executive Summary

The audio system is in an architecturally sound but critically incomplete state. Strong foundations exist: a Tone.js Panner3D pool (`audioEngine.ts`), a synthesized SFX layer (`AudioManager.ts`), and a full 6-layer ambient mixing pipeline (`ambientAudio.ts`) that computes per-frame volumes from ECS zone entities. However, the synthesized ambient layers are never actually instantiated with real Tone.js nodes — `initAmbientLayers()` is never called with a production `nodeFactory`. `startAudio()` is never called from any UI gesture target. The game runs in complete silence. The higher-level features (weather audio, NPC footsteps, spatial tool impacts, music Transport, speech audio, combat audio) are entirely absent from implementation.

---

## System-by-System Findings

---

### 1. Tone.js Engine (`game/systems/audioEngine.ts`)

**Verdict: REAL (isolated) / NOT WIRED**

**What was built:**
- `AudioEngineImpl` singleton creates a `Volume` master node via `Tone.js` and chains it `.toDestination()` (line 46).
- A Panner3D pool of `pannerPoolSize` (configured at 8 in `config/game/audio.json`) HRTF nodes is initialized at startup (lines 48–54).
- `acquirePanner()` / `releasePanner()` pool management is complete (lines 81–98).
- `setMasterVolume(db)` clamps to `[minVolumeDb, 0]` and applies immediately to the live node (lines 63–68).
- `startAudio()` (exported from `AudioManager.ts`, line 353) calls `audioEngine.initialize()` as the user-gesture gate.

**What is missing / broken:**
- `audioEngine.initialize()` is **never called** in any UI component, game screen, or game loop. `startAudio()` is exported but has zero call sites in `app/` or `components/` (confirmed: no matches for `startAudio` in those directories).
- No `Reverb` node in the signal chain. The Grok design doc shows `Tone.Reverb({ decay: 2.8, wet: 0.45 })` as a shared effect bus — this was not implemented (only `Volume` + raw `Panner3D` pool).
- No `Filter` nodes on the master chain.
- `Tone.Transport` is **not used at all**. The spec (§27.1) mandates Transport for musical scheduling (cricket chirps, wind gusts, owl hoots). There is no clock-based scheduling in any audio file.
- `PolySynth`, `FMSynth`, `NoiseSynth` are **not imported or instantiated** anywhere in the codebase. The Tone.js dependency is used only for `Panner3D`, `Volume`, and `start`.

**Config evidence:**
- `config/game/audio.json` (line 1–6): `{ masterVolumeDb: -6, minVolumeDb: -60, pannerPoolSize: 8, pannerModel: "HRTF" }` — pool size is correctly set but there is no config for Reverb, Filter, or Transport BPM.

**Tests:** `audioEngine.test.ts` — 30 tests, all mock Tone.js, all cover the pool and volume lifecycle. Tests are REAL and passing.

---

### 2. SFX Manager (`game/systems/AudioManager.ts`)

**Verdict: REAL (isolated) / NOT WIRED**

**What was built:**
- `AudioManagerImpl` uses raw `Web Audio API` (not Tone.js) for all SFX synthesis. This is a **divergence from the spec** (§27.1 mandates Tone.js as the backend for all audio). The comment in `fix-W2-B.md` acknowledges the recommendation was to keep raw Web Audio, but the spec and design doc (unified-design §11) both mandate "Existing AudioManager refactored to use Tone.js as backend."
- 12 synthesized sound IDs: `click`, `plant`, `water`, `harvest`, `chop`, `levelUp`, `achievement`, `toolSelect`, `seasonChange`, `build`, `error`, `success` (lines 19–31).
- Primitives: `playTone`, `playRisingTone`, `playChime`, `playArpeggio`, `playChord`, `playNoiseBurst` (lines 215–335).
- `playMusic()` and `stopMusic()` are **no-op stubs** (lines 163–169). Comment: "No-op until Tone.js music playback is wired — audio assets pending."
- `startAudio()` exported function exists (line 353) but is **never called** from any touch/click handler in the app (no `onTouchStart={startAudio}` on game screen root view).

**Key absence — tool SFX not wired:**
- `audioManager.playSound()` has **zero callers** outside `NativeAudioManager.ts` and test files. No game action (plant, chop, harvest, dig, water, prune, level up) calls `playSound()`. The wiring between game actions and audio is completely absent.
- `SoundId` includes `"chop"` and `"plant"` and `"water"` but the interaction hook (`useInteraction`) and action dispatcher do not import or call `audioManager`.

**Tests:** `AudioManager.test.ts` — 19 tests, all passing. They verify synthesis does not throw and startAudio delegates to audioEngine.

---

### 3. Native Audio Manager (`game/systems/NativeAudioManager.ts`)

**Verdict: STUB**

**What was built:**
- Wraps `AudioManager` on all platforms (line 52: `audioManager.playSound(soundId)`).
- `preload()` attempts to `import("expo-audio")` but falls through silently on failure (lines 37–43). No audio files are bundled.
- The comment at line 50–51: "Always use Web Audio synthesizer (works on all platforms with AudioContext) // expo-av would require bundled audio files which we don't have yet."
- `nativeAudioManager` is never imported or called from any component or hook. It is instantiated as a singleton but orphaned.

**Tests:** `NativeAudioManager.test.ts` — 6 tests, all mock `audioManager`, all passing.

---

### 4. Ambient Audio System (`game/systems/ambientAudio.ts`)

**Verdict: REAL (pure math layer) / PARTIALLY WIRED / SYNTHESIS MISSING**

**What was built:**
- Full 6-layer system: `wind`, `birds`, `insects`, `crickets`, `water`, `vegetation` (lines 34–37).
- `computeZoneGain(dist, radius, volume)` — linear crossfade (line 79).
- `layersForBiome(soundscape)` — reads from `config/game/ambientAudio.json` (line 89).
- `applyTimeGate(layers, timeOfDay)` — zeros out layers not in their active time window (line 97).
- `computeAmbientMix(zones, playerPos, timeOfDay)` — full pipeline: multi-zone accumulation, time gate, clamp (lines 115–143).
- `initAmbientLayers(nodeFactory)` — injectable factory pattern, correct design (lines 155–163).
- `tickAmbientAudio(state, mix)` — applies computed volumes to 6 nodes (lines 169–173).

**The wiring gap:**
- `tickAmbientAudio` IS called in `useGameLoop/index.ts` (line 188), guarded by `ambientAudioRef.current !== null` (line 163).
- `ambientAudioRef` is initialized to `null` (line 103) and is **never set to a real `AmbientAudioState`**. `initAmbientLayers()` is never called with a production `nodeFactory` anywhere in the codebase.
- The tick code runs every frame but always skips execution silently because the guard is `null`.
- There is **no `createToneLayerNode(layer)` function** anywhere in the codebase. The comment in `ambientAudio.ts` line 152 says "In production, pass `() => createToneLayerNode(layer)`" but this function was never written.
- This means the 6 ambient synthesis nodes (Brown noise wind, FM synth birds, White noise insects, Pulse osc crickets, Brown noise water, Pink noise vegetation) **do not exist at runtime**.

**Config:** `config/game/ambientAudio.json` (73 lines) — fully populated with per-biome layer weights and time gates. Config is REAL.

**Tests:** `ambientAudio.test.ts` — 31 tests covering pure math functions (computeZoneGain, layersForBiome, applyTimeGate, computeAmbientMix). All passing. Runtime layer management (initAmbientLayers, tickAmbientAudio) is not exercised with real Tone.js nodes in tests — factory is always mocked.

---

### 5. ECS Audio Component (`game/ecs/components/procedural/audio.ts`)

**Verdict: REAL**

- `AmbientSoundscape` union type: `"forest" | "meadow" | "water" | "cave" | "village" | "night" | "storm" | "wind"` (lines 8–16).
- `SoundscapeComponent` interface: `soundscape`, `radius`, `volume`, optional `secondarySoundscape` / `secondaryVolume` (lines 18–30).
- This component type is correctly designed and referenced by `ambientAudio.ts` and `audioZonePlacer.ts`.
- The `ambientZonesQuery` in `game/ecs/world.ts` queries for entities with `ambientZone` — these are populated by `audioZonePlacer.ts`.

---

### 6. Audio Zone Placer (`game/world/audioZonePlacer.ts`)

**Verdict: REAL (isolated)**

- `placeAudioZones(waterPlacements)` derives one `SoundscapeComponent` per water body (lines 43–56).
- Zone radius scales from water body dimensions: `max(width, depth) * waterRadiusScale` (line 46).
- Soundscape is hardcoded to `"water"` — only water bodies generate audio zones. Forest, village, meadow, cave zones are NOT auto-placed.
- Config: `proceduralConfig.ambientZones.soundscapeVolumes.water` and `.waterRadiusScale` (lines 16–17).
- The function produces correct `AudioZonePlacement[]` output, but its return value is only wired into ECS if `ChunkManager` calls it and adds entities — this is contingent on the full open-world chunk system which is also not implemented.

**Tests:** `audioZonePlacer.test.ts` exists and passes.

---

### 7. Ambient Particles (`game/systems/ambientParticles.ts`)

**Verdict: REAL (particle ECS only) / NO AUDIO SYNC**

- Manages firefly, pollen, leaf particle emitters per chunk (lines 198–272).
- Fireflies active at night near water, pollen in spring/summer, leaves in autumn with wind.
- **No audio connection.** Fireflies in the design are a visual-only effect. There is no "ambient particles trigger audio" wiring, and none is specified in the spec. This file is correctly scoped.

---

### 8. Weather Audio

**Verdict: MISSING**

- `game/ecs/components/procedural/atmosphere.ts` line 60: `WeatherComponent` interface has comment "drives particle emission, audio, gameplay effects."
- `game/systems/weatherParticles.ts` handles visual particles for rain, snow, windstorm.
- **No weather audio system exists.** There is no file that: triggers a rain loop on `weather.type === "rain"`, plays wind noise on `"windstorm"`, plays thunder on `"thunderstorm"`, or transitions ambient to `storm` soundscape on weather change.
- The `AmbientSoundscape` type includes `"storm"` (with wind=1.0, water=0.7 weights in config) and this would work if audio zones were updated on weather change — but no system bridges `WeatherComponent` changes to ambient zone soundscape updates.
- The design doc (`unified-game-design.md` line 396): "Fog thickens deeper into the maze (reduced visibility, Tone.js eerie ambient shift)" — this contextual audio shift is also absent.

---

### 9. Tool SFX

**Verdict: STUB (SoundIds exist, nothing calls them)**

- `SoundId` union includes `"chop"`, `"plant"`, `"water"`, `"harvest"` (relevant to tool use).
- Tool actions are dispatched through `useInteraction` hook and `GameActions` module.
- Neither `useInteraction.ts` nor `GameActions.ts` imports `audioManager` or `nativeAudioManager`.
- No tool action triggers `audioManager.playSound("chop")` etc.
- The design doc (unified-design line 543): "Sound trigger via AudioManager" as step 4 of the impact effect pipeline — not implemented.
- `"dig"` and `"prune"` are **not in the `SoundId` union** at all — only `"chop"` covers tool impacts. Dig and prune have no dedicated SFX even in the type definition.

---

### 10. NPC Audio (Footsteps, Voice)

**Verdict: MISSING**

- Design doc (`unified-game-design.md` lines 1329): "NPC footsteps (surface-aware: grass/path/wet)" — not implemented.
- Design doc (line 1331): "Structure ambient (campfire crackle)" — not implemented.
- `game/systems/npcAnimation.ts` advances limb rotations for walk cycle but has no audio trigger.
- `game/systems/npcMovement.ts` updates NPC position but does not trigger footstep sounds.
- Dialogue speech sounds: The design doc (unified-game §11 spatial sounds) does not explicitly specify NPC speech sounds, but the Grok reference code included voice synthesis. No speech audio exists in the implementation.
- `SoundId` has no `"footstep"`, `"voice"`, or `"dialogue"` entries.

---

### 11. Spatial Audio (Player Listener Sync)

**Verdict: MISSING**

- Design doc (unified-game line 1313): "AudioListener synced to camera at 60fps."
- Tone.js `Panner3D` nodes are in the pool, but the `AudioListener` position is never updated to match player/camera position.
- `useGameLoop` does not call any `audioEngine` method to sync listener position.
- `FPSCamera` component (`components/player/FPSCamera.tsx`) has no audio listener update.
- The spatial positioning of any sound source (tool impact at hit point, NPC footsteps, campfire crackle) is never performed because no code ever calls `panner.setPosition(x, y, z)` on an acquired Panner3D node.

---

### 12. Music System

**Verdict: MISSING**

- `playMusic()` and `stopMusic()` are empty stubs (AudioManager.ts lines 163–169).
- No background music tracks, no Tone.js Transport scheduling, no music layer.
- Design doc references `/Volumes/home/assets/Audio/Music Loops/` (29 loops) as supplementary music. These are not bundled.
- Spec §27.3 ("Audio Assets") references `/Volumes/home/assets/Audio/` for supplementary SFX and ambient files — none are bundled into the project `assets/` directory.

---

### 13. Combat Audio

**Verdict: MISSING**

- Design doc (unified-design Phase 8 task list, line 1592): "Combat audio (hit impacts, enemy cries, death sounds, raid horn)" — not implemented.
- `game/systems/combat.ts` handles damage calculation but no audio trigger.
- `game/systems/baseRaids.ts` handles raid logic but no horn sound trigger.
- `SoundId` has no `"hit"`, `"death"`, `"raid"`, or `"enemy"` entries.

---

### 14. Heavy Breathing / Stamina Audio

**Verdict: MISSING**

- Design doc (unified-design line 569): "Heavy breathing audio below 20%" stamina.
- `game/systems/stamina.ts` tracks stamina but triggers no audio.
- No `"heavyBreathing"` in `SoundId`.

---

## Summary Table

| System | Verdict | Evidence |
|--------|---------|----------|
| Tone.js `audioEngine.ts` (Panner3D pool, Volume) | REAL / NOT WIRED | `audioEngine.ts:41–57`; `startAudio()` has no call site in app |
| Tone.js PolySynth / FMSynth / NoiseSynth | MISSING | Not imported anywhere in codebase |
| Tone.js Transport (musical scheduling) | MISSING | Not imported anywhere; no BPM/clock usage |
| Tone.js Reverb / Filter shared bus | MISSING | Only `Volume` + `Panner3D` in engine |
| Web Audio SFX synthesizer (AudioManager) | REAL / NOT WIRED | `AudioManager.ts:61–156`; zero callers in game code |
| `startAudio()` user-gesture gate | REAL / NOT CALLED | `AudioManager.ts:353`; missing from `app/game/index.tsx` |
| NativeAudioManager | STUB | Always delegates to web audio; no native assets; never called |
| 6-layer ambient math (computeAmbientMix etc.) | REAL + TESTED | `ambientAudio.ts:79–143`; 31 passing tests |
| `createToneLayerNode` factory | MISSING | Referenced in comment at `ambientAudio.ts:152` but file does not exist |
| `initAmbientLayers()` with real nodes | MISSING | `useGameLoop/index.ts:103`; `ambientAudioRef` always null |
| Ambient tick in game loop | PARTIAL | `useGameLoop/index.ts:161–189`; runs but always skips (null guard) |
| `ambientAudio.json` config | REAL | 73 lines, all 8 soundscapes + time gates defined |
| `audio.json` config (engine) | REAL | `config/game/audio.json:1–6`; pool size 8, HRTF |
| `SoundscapeComponent` ECS type | REAL | `procedural/audio.ts:18–30` |
| `audioZonePlacer.ts` (water zones only) | REAL / NOT WIRED INTO CHUNKS | `audioZonePlacer.ts:43–56` |
| Weather audio (rain loop, thunder, wind) | MISSING | No implementation; `WeatherComponent` comment says it "drives audio" but nothing does |
| Tool SFX (chop, plant, water, harvest) | STUB | SoundIds exist in type, zero callers in action pipeline |
| Tool SFX (dig, prune) | MISSING | Not in `SoundId` union at all |
| NPC footsteps | MISSING | Not in any system file or `SoundId` |
| NPC voice / speech sounds | MISSING | Not in any system file or `SoundId` |
| Campfire / structure ambient | MISSING | Not in any system file |
| AudioListener sync to camera | MISSING | No listener position update in `FPSCamera` or game loop |
| Music system / background tracks | MISSING | `playMusic()` is a no-op stub |
| Audio asset files (retro SFX, ambient, music) | MISSING | Not bundled; `/Volumes/home/assets/Audio/` not integrated |
| Combat audio (hit, death, raid horn) | MISSING | Not in any system file or `SoundId` |
| Heavy breathing (low stamina) | MISSING | Not implemented; not in `SoundId` |
| Eerie ambient shift (maze fog) | MISSING | Design doc only; no implementation |

---

## Critical Structural Problems

### Problem 1: Dual Audio Backends — Spec vs Implementation

The spec (§27.1) and design doc (unified-design §11) mandate Tone.js as the backend for **all** audio. The implementation uses **raw Web Audio API** in `AudioManager.ts` for SFX synthesis, and uses Tone.js only for `Panner3D` pool management. `fix-W2-B.md` (the decision log) notes "keep raw Web Audio, port the spatial patterns" — contradicting the spec. This needs a spec update or a refactor decision.

### Problem 2: initAmbientLayers Never Called

`ambientAudio.ts:155` requires a `nodeFactory` to produce Tone.js layer nodes. The factory function `createToneLayerNode(layer: LayerName)` is referenced in comments but never written. Until this function is implemented and `initAmbientLayers` is called from the game screen initialization (after user gesture), `ambientAudioRef.current` remains `null` and the ambient tick block at `useGameLoop/index.ts:163` silently no-ops every frame.

### Problem 3: startAudio() Has No Call Site

`fix-W2-B.md` (lines 50–57) explicitly documents where `startAudio()` should be called:

```tsx
<View onTouchStart={startAudio} style={styles.container}>
```

This was **not applied** to `app/game/index.tsx`. The game screen's root `<View>` has no `onTouchStart` handler for audio initialization.

### Problem 4: No SFX → Action Bridge

Every game action (plant, harvest, chop, level up, tool switch) should call `audioManager.playSound()`. Zero callers exist. The `GameActions` dispatcher and `useInteraction` hook have no audio imports. This is an entire wiring layer that was never built.

---

## What Is NOT Implemented (Full List)

Per spec §27 and design doc §11:

1. Tone.js PolySynth for music/bells
2. Tone.js FMSynth for bird calls
3. Tone.js NoiseSynth for noise-based ambient layers (6 synthesis nodes)
4. Tone.js Transport for scheduled events (cricket chirps at night, owl hoots, etc.)
5. Reverb shared effect bus
6. `createToneLayerNode()` production factory
7. `startAudio()` wired to UI gesture
8. `initAmbientLayers()` called with real nodes
9. AudioListener position sync to camera
10. Panner3D positioning for any sound source
11. Tool SFX triggered by game actions
12. Dig/prune SoundId entries
13. NPC footsteps (surface-aware)
14. NPC voice/speech audio
15. Campfire crackle / structure ambient
16. Weather audio (rain loop, thunder, wind noise)
17. Weather-triggered soundscape zone transitions
18. Heavy breathing below 20% stamina
19. Combat audio (hit, death, raid horn)
20. Background music system
21. Audio asset file integration from `/Volumes/home/assets/Audio/`
22. Maze eerie ambient shift
23. Lore stone sound-on-approach (World Quest 4)
