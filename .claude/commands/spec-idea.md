---
allowed-tools: Read, Write, Edit, Glob, Grep
description: Turn a gameplay concept or story into a spec section in GAME_SPEC.md
---

Document this gameplay concept: $ARGUMENTS

## Process

1. Read `docs/plans/2026-03-07-unified-game-design.md` for canonical design context
2. Read `docs/GAME_SPEC.md` to understand current spec structure
3. Verify the concept is consistent with the unified design:
   - Survival-only (no exploration/creative mode)
   - Chunk-based infinite world (not fixed zones)
   - 14 Grovekeepers as game spine
   - 3DPSX GLB models as visual foundation
   - Tool upgrade tiers (Basic/Iron/Grovekeeper)
   - Difficulty tier scaling (Seedling/Sapling/Hardwood/Ironwood)
4. Find the right section (or create a new one) for this concept
5. Write a precise, implementable spec section:
   - Purpose (1 sentence)
   - Data model (interfaces)
   - Rules and formulas (every variable defined)
   - Config schema (reference JSON files)
   - UI behavior (mobile-first, survival HUD integration)
   - Integration points with other systems
6. Update the Table of Contents if adding a new section
7. Update the Implementation Status section to mark as "specced"

Use the `@spec-writer` agent for implementation.

## DO NOT write any code. Spec only.
