---
title: Grovekeeper — Build State
updated: 2026-04-29
status: current
domain: context
---

# Grovekeeper — Build State

## Current status

**RC complete. Voxel pivot in progress.**

- **RC shipped:** v1.5.0-alpha.1 at `https://arcade-cabinet.github.io/grovekeeper/`
- **Active pivot spec:** `docs/superpowers/specs/2026-04-29-grovekeeper-voxel-pivot-design.md`
- **Active branch:** `main`
- **PRQ queue:** PRQ-01 → PRQ-02 → PRQ-03 (in dependency order)

---

## RC snapshot (as-shipped)

All 20 RC waves complete. 1163 vitest tests pass. TypeScript clean.
Lighthouse Performance 99, Best Practices 100, Accessibility 93, SEO 100.
All 16 screenshot gates baselined and CI-passing.

| # | Wave | Status |
|---|------|--------|
| 1–20 | RC waves | DONE |

RC success criteria: all 7 met. See git tag `v1.5.0-alpha.1` for the
frozen state.

---

## Post-RC runtime wiring (merged, 2026-04-29)

After RC, gap analysis found gameplay systems not connected to the tick
loop. All fixed and merged (PR #69, follow-up). Details in previous
STATE.md version under git history.

---

## Voxel pivot — PRQ status

### PRQ-01: Voxel Creatures + First-Person Camera

**Status: PENDING**

- Switch camera to first-person
- Remove PlayerActor (Gardener GLB)
- VoxelCreatureActor base class
- Wolf (hostile), rabbit (peaceful) as voxel assemblies
- Grove Spirit as voxel assembly (no dialogue)
- NPC villagers as voxel assemblies
- Remove all ModelRenderer production usage
- Re-baseline screenshot gates

Full task list: `docs/plans/prq-01-voxel-creatures-first-person.md`

### PRQ-02: Compound Trait System + Tracery Narrator

**Status: PENDING** (depends on PRQ-01)

- Trait bitmask system
- Compound resolution engine (declarative table)
- Crafting interaction wiring (replaces known-recipes unlock)
- Durability system
- Time-based transforms (wet → soft stick)
- Tracery grammar + narrator
- Journal system + PauseMenu Journal tab
- Partial-discovery hints
- Encounter gate update (hasCraftedNamedWeapon)

Full task list: `docs/plans/prq-02-compound-traits-tracery.md`

### PRQ-03: Spawn Model + Golden-Path E2E Tests

**Status: PENDING** (depends on PRQ-01 + PRQ-02)

- Spawn outside grove; first grove within 32 voxels
- Encounter gate wiring end-to-end
- First-weapon audio sting
- E2E test infrastructure (real keyboard input, no warp actions)
- Golden-path test: claim first grove
- Golden-path test: harvest + encounter cycle

Full task list: `docs/plans/prq-03-spawn-model-e2e-tests.md`

---

## Open issues

| Issue | Notes |
|-------|-------|
| Screenshot gates need re-baselining | First-person camera changes every gate |
| `window.__grove.actions` warp helpers in RC journey tests | PRQ-03 removes these from golden-path tests |
| GLB model files still in `public/assets/models/creatures/` etc. | PRQ-01 cleans up |
| `CLAUDE.md` references Howler for audio | Fixed in this doc pass; CLAUDE.md updated |
