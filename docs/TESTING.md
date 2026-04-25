---
title: Grovekeeper — Testing & Verification
updated: 2026-04-24
status: current
domain: quality
---

# Grovekeeper — Testing & Verification

This document defines the verification protocol for RC. The full
specification it derives from is at
`superpowers/specs/2026-04-24-grovekeeper-rc-redesign-design.md`.

Velocity is tied to objectivity. The user said "tested and tested and
visually confirmed with screenshots." The protocol here makes that
concrete enough that task-batch can self-grade.

## Test layers

### Unit / integration

- All ported pure-function systems (growth, weather, time, stamina,
  harvest, encounters, biome lookup, grove state machine, crafting
  consumption/production math, fast-travel rules) keep or extend their
  existing tests.
- New systems get tests adjacent to source: `*.test.ts`.
- **Determinism tests:** `scopedRNG` for chunk generation must produce
  identical chunks for identical inputs. The screenshot suite depends on
  this.

Run with:

```bash
pnpm test                 # vitest, node project (default)
pnpm test:run             # single run
pnpm test:coverage        # with coverage
```

### Browser tests

Vitest + Playwright (existing setup). Run with:

```bash
pnpm test:browser         # vitest browser project
```

Cover at least:

- Boot to MainMenu under 3s.
- New Game → spawn in starter grove. Player visible. Camera tracking.
- Movement input → player moves. WASD and mobile joystick.
- Interaction with first ripe tree → fruit collected.
- Cross grove threshold → biome change visible (palette delta detected
  via screenshot diff).
- Encounter triggers within a tuned distance budget.
- Discovery of second grove changes UI state (map node added).
- Hearth placement + lighting → claim state changes; fast-travel UI shows
  two nodes.

### Playwright e2e + journey

```bash
pnpm test:e2e             # build + Playwright e2e
pnpm test:playthrough     # the journey screenshot suite (RC gate)
```

The journey suite (`tests/rc-journey.spec.ts`) walks the deterministic
playthrough end-to-end and produces the 16 committed PNGs under
`docs/rc-journey/`. CI fails if any screenshot diverges materially from
its committed baseline (tolerance per shot — landing strict, in-world
shots lenient).

## Screenshot gates

`docs/rc-journey/` contains one committed PNG per gate:

```
docs/rc-journey/
  01-landing.png
  02-mainmenu.png
  03-newgame.png
  04-firstspawn-unclaimed-grove.png
  05-spirit-greets.png
  06-gather-logs.png
  07-craft-hearth.png
  08-place-hearth.png
  09-light-hearth-cinematic.png
  10-fasttravel-first-node.png
  11-villagers-arrive.png
  12-craft-first-weapon.png
  13-grove-threshold.png
  14-wilderness-first.png
  15-first-encounter.png
  16-second-grove-discovery.png
```

These are the canonical 16 RC gates. They map 1:1 to the journey steps in
`DESIGN.md` ("the journey").

### Visual verification by agent

Task-batch agents responsible for any of these surfaces **MUST**:

1. Drive the surface to its gate state via Playwright.
2. Take the screenshot.
3. View the screenshot themselves.
4. Self-grade against the rubric (below).
5. Commit the PNG to `docs/rc-journey/`.

An agent that marks a task complete without a committed screenshot in
`docs/rc-journey/` for the gate that surface owns **fails the task gate**.

## Rubric

`docs/rc-journey/REVIEW.md` is the master scoring sheet. Each surface (a
"surface" is roughly one screen + its interactions: MainMenu, first
spawn, gather, craft hearth, place hearth, claim cinematic, fast-travel
UI, villager arrival, weapon craft, threshold, wilderness, encounter,
second-grove discovery, etc.) is graded on four axes:

| Axis | 0 | 1 | 2 | 3 |
|---|---|---|---|---|
| Tone coherence | feels like a different game | jarring elements | mostly cohesive | feels like one game |
| Diegesis | UI is teaching | mixed UI + world | mostly diegetic | taught entirely by the world |
| Polish | unfinished | rough | acceptable | finished |
| Performance | misses budgets | borderline | meets | exceeds |

A surface ships at score **≥ 10/12**. Below that, the task batch keeps
iterating on it.

## Performance budgets

| Metric | Target |
|---|---|
| Lighthouse Performance (landing, mobile) | ≥ 90 |
| Lighthouse Best Practices (landing) | ≥ 95 |
| FPS (mobile) | ≥ 55 |
| FPS (desktop) | ≥ 60 |
| Initial bundle (gz) | < 500 KB |
| Total asset budget | < 20 MB at RC |
| Time to interactive | < 3s |
| Memory (mobile) | < 100 MB |

Runtime FPS is measured on a fixed test rig over a 30-second walk in each
of the wilderness biomes plus the grove biome. Numbers committed to
`docs/rc-journey/perf.md`.

Bundle size is gated by `pnpm size` (size-limit, configured per build
artifact).

## Failure modes the protocol exists to prevent

- Agents marking a UI task complete because the test fixtures pass, but
  the surface looks broken when actually rendered. → Screenshot + agent
  visual self-grade.
- Agents declaring "feature done" without verifying the loop end-to-end.
  → Journey suite is the integration test.
- Performance regressions sneaking in over many small commits. → Per-
  biome perf measurement in the verification wave + size-limit on every
  PR.
- Stale tests passing while the system underneath has drifted. → Pre-
  commit hook runs `pnpm check && pnpm tsc && pnpm test:run` before any
  commit.

## Pre-commit gate

`.claude/hooks/pre-commit-quality.sh` runs:

- `pnpm check` (Biome lint + format)
- `pnpm tsc` (typecheck)
- `pnpm test:run` (vitest node project)

Failure blocks the commit. Do **not** bypass with `--no-verify` unless
the user has explicitly authorized it for that operation.

## CI gates

GitHub Actions:

- `ci.yml` (on `pull_request`): lint, typecheck, unit + browser tests,
  journey screenshot suite (against committed baselines), build,
  Lighthouse audit on landing, size-limit, Android debug APK build,
  uploaded as PR artifact.
- `release.yml` (on release-please tag): versioned builds + publish.
- `cd.yml` (on `push: main`): deploy what release.yml produced (Pages,
  APK, etc.).

Order is `ci → release → cd`. `release.yml` produces artifacts;
`cd.yml` deploys them.
