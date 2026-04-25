---
title: RC Journey Verification
updated: 2026-04-24
status: current
domain: quality
---

# RC Journey Verification

This directory is the **screenshot-gate contract** and **rubric scoring sheet**
for the Grovekeeper RC redesign. It is the objective gate the redesign is
held to — every surface ships only when its screenshot baseline is committed,
its rubric score is ≥ 10/12, and its biome FPS budget is met.

Spec reference:
`docs/superpowers/specs/2026-04-24-grovekeeper-rc-redesign-design.md`
§ "Testing & verification".

## Files

| File | Purpose |
|------|---------|
| `01-landing.png` … `16-second-grove-discovery.png` | The 16 committed screenshot baselines for the journey arc. |
| `REVIEW.md` | The 12-point rubric, scored per surface. A surface ships at score ≥ 10/12. |
| `perf.md` | FPS budget table per biome × per device. Filled in from `perf.json`. |
| `perf.json` | Machine-readable FPS measurements produced by `e2e/perf.spec.ts`. |
| `AGENT-PROTOCOL.md` | Mandatory protocol for agents working on individual journey surfaces. |

## How the suite is exercised

```bash
# Run the journey suite — captures all 16 gates and runs Playwright snapshot diff.
pnpm test:e2e -- e2e/rc-journey.spec.ts

# First run after Wave 18 lands: write the baselines, then commit.
pnpm test:e2e -- e2e/rc-journey.spec.ts --update-snapshots

# Run the perf suite — 30s walk per biome, writes perf.json.
pnpm test:e2e -- e2e/perf.spec.ts

# Run the Lighthouse audit — checks Performance ≥ 90 mobile, BP ≥ 95.
pnpm audit:lighthouse
```

## Gating behavior

- The screenshot diff is per-gate-tolerant:
  - Landing/menu surfaces: `maxDiffPixelRatio: 0.001` (strict)
  - UI surfaces (craft, fasttravel): `maxDiffPixelRatio: 0.02`
  - In-world / cinematic surfaces: `maxDiffPixelRatio: 0.05` (lenient)
- The Lighthouse audit fails CI if Performance < 90 or Best Practices < 95.
- The perf suite emits `perf.json`; a regression PR may require updating
  `perf.md` to explain the change.

## Wave 19 status (2026-04-24)

- **Suite scaffold:** complete (`e2e/rc-journey.spec.ts`, `e2e/perf.spec.ts`).
- **Lighthouse:** wired via `@lhci/cli` and `lighthouserc.cjs`.
- **Baselines:** NOT yet committed. The journey wave (Wave 18) is in flight in
  parallel; once it lands, the next pass will run the suite with
  `--update-snapshots`, review the captured PNGs against the rubric, and commit
  the approved baselines.
- **Rubric:** template populated in `REVIEW.md` with empty scores; agents
  working on each surface fill in their row per `AGENT-PROTOCOL.md`.
