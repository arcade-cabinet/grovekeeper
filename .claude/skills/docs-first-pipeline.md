---
name: docs-first-pipeline
description: The mandatory workflow for all Grovekeeper development. Docs define the game. Tests verify the docs. Code implements the docs. The unified game design is the canonical reference.
---

# Docs-First Development Pipeline

## The Rule

```
unified-game-design.md  ->  GAME_SPEC.md  ->  *.test.ts  ->  *.ts  ->  wire to game loop  ->  update spec status
```

**Nothing is implemented without a spec section. Nothing is specced without tests. Nothing is tested without implementation. Nothing is implemented without being wired up.**

## Canonical Reference

`docs/plans/2026-03-07-unified-game-design.md` is the **master synthesis** -- the forward vision for all game systems. When writing spec sections or implementing systems, this document is THE authority on how the game works.

Key design facts every agent must know:
- **Survival-only.** No exploration mode. No creative mode. Hearts, hunger, stamina, temperature.
- **Chunk-based infinite world.** 16x16 tiles per chunk, 3x3 active, delta-only persistence.
- **14 Grovekeepers** in hedge labyrinths are the game spine. Each unlocks a tree species.
- **Stylized GLB models** are the visual foundation (trees, NPCs, structures, props, fences, bushes).
- **Tone.js** for audio (PolySynth, FMSynth, Panner3D HRTF). Never raw Web Audio.
- **anime.js** for NPC animation (Lego-style rigid body part rotation, no skeletal rigs).
- **Tool upgrade tiers:** Basic -> Iron (Forge + Iron Ingots) -> Grovekeeper (Grove Essence).
- **Forging:** Smelt ore into Iron Ingots, upgrade tools, craft advanced materials.
- **Cooking:** Raw food -> cooked meals at Campfire/Cooking Pot. Better stats.
- **Base building:** Modular kitbashing with Mega Pack assets. Progressive unlock L5-L20.
- **Base raids:** Defend settlements from corrupted creatures. Scales with base value.
- **New Game+:** After all 14 Grovekeepers + Worldroot. Carries over achievements/codex/relationships.
- **Difficulty tiers:** Seedling (easy) / Sapling (standard) / Hardwood (hard) / Ironwood (permadeath).
- **Tutorial:** Pokemon-style, in the Starting Grove tutorial village with Elder Rowan.

## When the User Gives You a Concept

1. **Check the unified design.** Does this concept already exist? Is it consistent with the design pillars?
2. **Translate to spec.** Open GAME_SPEC.md, find or create the section. Write precise, implementable specs with formulas, data models, config schemas, and integration points.
3. **Do NOT write code.** The concept is documented. Implementation comes later.

## When You're Implementing a Spec Section

1. **Read the unified design.** Understand the broader context.
2. **Read the spec section.** Understand exactly what it defines.
3. **Write tests first.** Each test references the spec section number.
4. **Write implementation.** Pure function, config from JSON, scopedRNG for randomness, difficulty scaling via multipliers.
5. **Wire it up.** Add to game loop, connect to UI.
6. **Update spec status.** Mark as implemented.

## When You're Fixing a Bug

1. **Find the spec section.** What does the spec say should happen?
2. **Check the unified design.** Is the spec correct per the master design?
3. **Write a failing test.** Reproduce the bug as a test case.
4. **Fix the code.** Make the test pass.
5. **If the spec was wrong, fix the spec too.**

## Anti-Patterns (things that cause spot-welding)

- Writing code without checking the spec AND the unified design
- Creating a system without a test file
- Hardcoding tuning values instead of using config JSON
- Using Math.random() instead of scopedRNG
- Making files over 300 lines instead of decomposing
- Implementing a feature across multiple sessions without updating the spec
- Assuming a system works because code exists (it might not be wired up)
- Using fixed zones instead of chunk-based world
- Ignoring difficulty tier scaling (hardcoding behavior per tier instead of using multipliers)
- Building exploration/creative mode features (the game is survival-only)
- Using raw Web Audio instead of Tone.js
- Procedural geometry for things that should be GLB models (trees, NPCs, structures)
