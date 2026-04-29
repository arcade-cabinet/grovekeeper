# Continuous Work Directive — Grovekeeper Voxel Pivot

**Status:** ACTIVE
**Owner:** Claude (this agent)
**Updated:** 2026-04-29

## Context

RC is complete (shipped v1.5.0-alpha.1). We are executing the **voxel
pivot**: first-person camera, voxel creature assemblies, compound trait
crafting system, Tracery narrator, revised spawn model, real E2E tests.

Design spec: `docs/superpowers/specs/2026-04-29-grovekeeper-voxel-pivot-design.md`

## Operating rules (hard)

1. Never stop for status reports the user didn't ask for.
2. Never stop for scope caution.
3. Never stop to summarize. Git log and commit messages are the record.
4. Fix errors before moving. `pnpm check && pnpm tsc && pnpm test:run` green before commit.
5. Dispatch review agents in background after each commit.
6. Only stop for: explicit user stop / CI red AND blocking / genuine deadlock.

## PRQ Queue

Execute in order. PRQ-02 depends on PRQ-01 completion. PRQ-03 depends on
both.

---

### PRQ-01: Voxel Creatures + First-Person Camera
**Full task list:** `docs/plans/prq-01-voxel-creatures-first-person.md`

- [ ] T1: Switch camera to first-person; remove PlayerActor
- [ ] T2: VoxelCreatureActor base class
- [ ] T3: Wolf creature (hostile) — voxel assembly + AI state machine
- [ ] T4: Rabbit creature (peaceful) — voxel assembly + wander AI
- [ ] T5: Grove Spirit voxel assembly (no dialogue)
- [ ] T6: NPC villager voxel assemblies
- [ ] T7: Remove ModelRenderer from all production code
- [ ] T8: Re-baseline screenshot gates

---

### PRQ-02: Compound Trait System + Tracery Narrator
**Full task list:** `docs/plans/prq-02-compound-traits-tracery.md`
**Depends on:** PRQ-01 complete

- [ ] T1: Trait type system (Trait enum + bitmask + traitOf table)
- [ ] T2: Compound resolution engine (CompoundRule table + resolver)
- [ ] T3: Crafting interaction wiring (replace known-recipes with compound discovery)
- [ ] T4: Durability system
- [ ] T5: Time-based transforms (wet stick → soft stick)
- [ ] T6: Tracery grammar + narrator.generate()
- [ ] T7: Journal system (DB table + append + read)
- [ ] T8: PauseMenu Journal tab (replaces Stats)
- [ ] T9: Partial-discovery hints
- [ ] T10: Encounter gate update (hasCraftedNamedWeapon)

---

### PRQ-03: Spawn Model + Golden-Path E2E Tests
**Full task list:** `docs/plans/prq-03-spawn-model-e2e-tests.md`
**Depends on:** PRQ-01 + PRQ-02 complete

- [ ] T1: Spawn outside grove; first grove within 32 voxels
- [ ] T2: Encounter gate wiring integration test
- [ ] T3: First-weapon sting (audio + narrator + Koota flag)
- [ ] T4: E2E test infrastructure (helpers; read-only `window.__grove.state`)
- [ ] T5: Golden-path test: claim first grove (real keyboard input)
- [ ] T6: Golden-path test: harvest + encounter cycle
- [ ] T7: E2E test data cleanup (remove warp helpers from non-visual tests)

---

## After PRQ-03

Tag release. Then post-pivot content additions (see `docs/post-rc.md`).
