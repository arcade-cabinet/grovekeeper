---
title: Changelog
updated: 2026-04-20
status: current
---

# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.1.0-alpha.1](https://github.com/arcade-cabinet/grovekeeper/compare/grove-keeper-v1.0.0-alpha.1...grove-keeper-v1.1.0-alpha.1) (2026-04-20)


### Features

* port to SolidJS + Koota + Tone.js (1.0.0-alpha.1) ([5e48c00](https://github.com/arcade-cabinet/grovekeeper/commit/5e48c0083bca7ea1096a4052d7403e06edc4cf99))
* T70+T73 — spirit config + dialogue UI (narrative spine foundation) ([#36](https://github.com/arcade-cabinet/grovekeeper/issues/36)) ([120e7fc](https://github.com/arcade-cabinet/grovekeeper/commit/120e7fc712e2ce1af5a29659fab7588e10966f0f))


### Performance Improvements

* T23 — consolidate PropFactory StandardMaterial into shared cache ([#34](https://github.com/arcade-cabinet/grovekeeper/issues/34)) ([afdfc36](https://github.com/arcade-cabinet/grovekeeper/commit/afdfc36edac26e262feffbff0be61027b0af0587))

## [Unreleased]

## [1.0.0-alpha.1] - 2026-04-20

First alpha of the 1.0 line. Complete framework port from React + Miniplex + Zustand + shadcn/Radix to SolidJS + Koota + Tone.js + hand-rolled Solid primitives. Babylon 8 and Capacitor 8 stay. All 1387+ tests green, zero type errors, zero lint errors.

### Changed

- **Framework:** React 19 → SolidJS 1.9. All 57 `.tsx` components ported to Solid (named exports, accessor-returning hooks, `onMount`/`onCleanup` lifecycle, `let ref: T | undefined` DOM refs).
- **State + ECS:** Miniplex 2 + Zustand 5 → **Koota 0.6 as a single system**. Runtime ECS and persistent player state are both Koota traits — world-level singleton traits for what was Zustand (`PlayerProgress`, `Resources`, `Quests`, `Settings`, `Achievements`, …), per-entity traits for what was Miniplex (`Position`, `Tree`, `Renderable`, `Npc`, `FarmerState`, `IsPlayer`, …).
- **Audio:** raw Web Audio API → Tone.js 15 throughout. `AudioManager` exports `startAudio()` wrapping `Tone.start()` for user-gesture unlock.
- **UI primitives:** 31 shadcn wrappers + 15 Radix packages → 9 hand-rolled Solid primitives under `src/ui/primitives/` (button, card, dialog, sheet, tabs, scroll-area, switch, slider, progress). Hand-rolled matches the public API of each shadcn primitive so call sites were mostly drop-in.
- **Testing:** `@testing-library/react` → `@solidjs/testing-library`. Vitest 4.x split into two projects: `node` (happy-dom) for logic + Solid component unit tests, and `browser` (Playwright Chromium) for real-DOM rendering tests.
- **Config extraction:** difficulty / tools / resources / codex / config / trees moved from TS source to JSON under `src/config/` behind thin typed accessors — drops ~1037 LOC of inline data tables from TS files.
- **Scene pipeline:** lighting `update()` reuses class-field `Color3`/`Vector3` buffers instead of allocating per frame (saves ~360 allocations/sec at 60 FPS). Tree meshes use `createInstance()` + shared template (was `.clone()`) — target 5× draw-call reduction.
- **Tree template CPU footprint:** hidden templates now `freezeWorldMatrix()` + `doNotSyncBoundingInfo = true` + `alwaysSelectAsActiveMesh = false` so they carry zero per-frame CPU while still keeping their instances renderable.
- **Perf (engine):** `engine.setHardwareScalingLevel(...)` clamped on touch devices; `scene.performancePriority = Intermediate`; `scene.skipPointerMovePicking = true`; `scene.autoClear = false`.
- **Perf (systems):** `growthSystem` uses numeric-packed spatial keys + module-scope `Map`/`Set` buffers (was `new Set<string>()` per frame with `${x},${z}` keys — 18,000 string allocations/sec).
- **Textures:** `public/textures/*.{jpg,png}` downsized from 1024×1024 → 512×512 (strip metadata) — 54 MB disk → ~6 MB, 160 MB VRAM → ~20 MB estimated.
- **Docs:** README / STANDARDS / `docs/architecture/state-management.md` / `docs/architecture/ecs-patterns.md` rewritten for Solid + Koota stack. No remaining React/Miniplex/Zustand references outside historical notes.

### Added

- `src/koota.ts` — world + spawn helpers + `destroyAllEntitiesExceptWorld()` test utility (workaround for the entity-0 world-singleton gotcha).
- `src/traits.ts` — central Koota trait catalog (~40 traits, factory-wrapped for mutable defaults).
- `src/actions.ts` — `createActions(world)` bundle of 63 action mutators; closure-captured world for sibling-action reuse; replaces Zustand `set`/`get` idiom.
- `src/ecs/solid.ts` — Solid adapter with `useQuery`, `useQueryFirst`, `useTrait`, `useHas`, `useWorld`. All subscriptions defer refresh to a microtask so reads observe post-mutation state (Koota fires `removeSubscriptions` before clearing the trait mask).
- `src/ecs/solid.test.ts` — 10 reactivity + cleanup tests covering all four hooks.
- `src/shared/utils/seedRNG.ts#scopedRNG` — scoped deterministic RNG combining a scope string with any number of keys; replaces non-deterministic `Math.random()` in `NpcMeshManager` (NPCs get stable phase offsets across reloads now).
- `src/config/trees.ts` runtime shape validator (`validateSpecies` / `validateSpeciesList`) — fails fast on malformed JSON instead of crashing deep in mesh generation.
- Vitest browser-mode project (`test:browser`): sample `HUD.browser.test.tsx` and `ToolBelt.browser.test.tsx` running in real Chromium via Playwright.
- `.claude/plans/grovekeeper-1.0-polish.prq.md` — 76-task PRQ driving the path from alpha.1 to 1.0 across 12 workstreams.
- `.claude/hooks/anti-stop-check.sh` + `.claude/hooks/task-batch-flush.sh` — infrastructure for long-running autonomous task-batch execution surviving context compaction.

### Removed

- `react`, `react-dom`, `@vitejs/plugin-react`, `@types/react*`, `@testing-library/react`.
- `miniplex`, `miniplex-react`.
- `zustand`.
- All 15 `@radix-ui/react-*` packages.
- `class-variance-authority`, `framer-motion` (+ `motion-dom`, `motion-utils`), `lucide-react`, `@remixicon/react`, `date-fns`, `recharts`, `react-icons`, `react-hook-form`, `@hookform/resolvers`, `zod`, `embla-carousel-react`, `react-day-picker`, `input-otp`, `react-resizable-panels`, `cmdk`, `sonner`, `vaul`, `reactylon`, `@typescript/native-preview`.
- 6 unused shadcn primitives (input, label, separator, skeleton, toggle, tooltip) and 31 unused shadcn wrappers.
- `src/stores/gameStore.ts`, `src/world.ts`, `src/archetypes.ts`, `src/shared/miniplex-react.ts` (obsolete after the Koota migration).

### Fixed

- Vitest 4.x root `test.environment` defaulted to `jsdom` → `MISSING DEPENDENCY Cannot find dependency 'jsdom'` + non-zero exit in CI despite 1387+ tests passing. Pinned root to `happy-dom` so `prepareVitest()` resolves against the installed environment.
- `biome.json` override paths restored post-restructure (`src/components/ui/**` → `src/ui/primitives/**`, `src/game/ui/**` → `src/ui/**`, `src/game/scenes/**` → `src/engine/scenes/**`).
- Solid adapter stale-read bug: `onRemove` callbacks fired before Koota cleared the entity mask, so `entity.has(trait)` returned `true` from inside remove handlers. All four hooks now `queueMicrotask` the refresh so post-mutation state is observed.

## [0.1.0] - 2026-01-01

### Added
- Initial release.
