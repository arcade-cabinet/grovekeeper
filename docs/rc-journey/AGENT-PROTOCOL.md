---
title: RC Journey — Agent Protocol
updated: 2026-04-24
status: current
domain: quality
---

# RC Journey — Agent Protocol

This document is binding for any agent working on a journey surface (one of
the 16 screenshot gates). The spec calls out:

> The task-batch agents responsible for each surface MUST take Playwright
> screenshots, view them, and self-grade against the rubric before marking
> the task complete. Agents that mark complete without a committed
> screenshot in `docs/rc-journey/` fail the task gate.

This file makes that contract concrete.

## Mandatory protocol per surface

Before marking a task complete on any of the 16 surfaces, the responsible
agent MUST do the following, in order:

### 1. Run the gate

```bash
pnpm test:e2e -- e2e/rc-journey.spec.ts --update-snapshots --grep "rc-journey"
```

This regenerates the screenshot baseline and the
`docs/rc-journey/<NN>-<surface>.png` review copy. The `--update-snapshots` flag is mandatory only on first
capture or when the surface intentionally changes — re-runs without flag
must pass on the existing baseline.

### 2. View the screenshot

Open `docs/rc-journey/<NN>-<surface>.png`. Look at the actual rendered
image. Do **not** trust the diff alone. The point is visual verification —
the screenshot is what a player would see at this beat in the journey.

### 3. Self-score against the rubric

Open `docs/rc-journey/REVIEW.md` and fill in the row for your surface. Score
0–3 on each of:

- **Tone** — does it feel like one game?
- **Diegesis** — is the player taught by the world rather than UI?
- **Polish** — animation, lighting, audio, transitions feel finished?
- **Performance** — meets budgets?

Be honest. A 1 means below bar; 2 means it ships; 3 is exemplary. If the
total is < 10, **do not mark the task complete**. Iterate.

### 4. Performance check

If the surface affects a biome's FPS:

```bash
pnpm test:e2e -- e2e/perf.spec.ts --grep "<biome>"
```

Then update `docs/rc-journey/perf.md` from `perf.json` and confirm the
biome row is still passing on both reference rigs.

### 5. Commit the artifacts

The PR for the surface MUST include:

- The updated `docs/rc-journey/<NN>-<surface>.png`.
- The updated row in `docs/rc-journey/REVIEW.md` with score ≥ 10/12.
- The updated row in `docs/rc-journey/perf.md` (if perf-affecting).
- The updated baseline in `e2e/rc-journey-baselines/<NN>-<surface>.png`.

A commit that touches a surface but not its screenshot baseline is a
violation of this protocol. The pre-commit hook does not currently
enforce this (it would require running Playwright in the hook, which
is too expensive); enforcement is by review and by CI's screenshot diff.

## When does a surface ship?

A surface ships when:

1. Its screenshot baseline is committed.
2. Its rubric score is ≥ 10/12.
3. Its biome's FPS budget is met (if applicable).
4. CI's screenshot-diff suite passes against the committed baseline.

Anything below that is a polish-wave loop, not a ship.

## Anti-patterns

- Marking a task complete without committing the screenshot. **Hard fail.**
- Self-scoring a surface 11/12 with three "polish issues" listed in notes.
  Either fix the polish issues now or score it honestly at 8/12 and accept
  the polish-wave loop.
- Updating the baseline because "the diff was noisy" without verifying the
  visual change is intentional. The whole point of the suite is to catch
  unintended visual regressions.
- Skipping the perf measurement because "my surface is UI". Most surfaces
  *do* affect framerate in the biome they live in (panels suspend the game
  loop, animations leak, etc.). When in doubt, measure.
