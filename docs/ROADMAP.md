---
title: Grovekeeper — Roadmap
updated: 2026-04-29
status: current
domain: context
---

# Grovekeeper — Roadmap

## Phase 1: RC (DONE)

All 20 waves complete. Shipped v1.5.0-alpha.1. See git history.

## Phase 2: Voxel Pivot (ACTIVE)

Three PRQs executed in dependency order.

| PRQ | Title | Status |
|-----|-------|--------|
| PRQ-01 | Voxel Creatures + First-Person Camera | PENDING |
| PRQ-02 | Compound Trait System + Tracery Narrator | PENDING (after PRQ-01) |
| PRQ-03 | Spawn Model + Golden-Path E2E Tests | PENDING (after PRQ-01 + PRQ-02) |

Full task breakdowns: `docs/plans/prq-0{1,2,3}-*.md`

Design spec: `docs/superpowers/specs/2026-04-29-grovekeeper-voxel-pivot-design.md`

## Phase 3: Post-Pivot content

After all three PRQs are complete and the golden-path E2E test passes:

- Additional creature types per biome
- More compound recipes (biome-specific production lines)
- Biome-specific crafting stations (coast salt-press, forest carpenter bench)
- More structural prefabs for building
- Seasonal events
- Music expansion
- Additional wilderness biomes (Wetland, Alpine, Scrub) — each requires
  asset work; see `docs/post-rc.md` for what each needs
