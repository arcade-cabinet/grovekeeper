---
allowed-tools: Read, Write, Edit, Bash, Glob, Grep
description: Add a new game system following docs > tests > code workflow
---

Add or redesign the game system: $ARGUMENTS

## Process (STRICT ORDER -- do not skip steps)

### Step 1: Check the unified design
Read `docs/plans/2026-03-07-unified-game-design.md` for the canonical design of this system.
Then read `docs/GAME_SPEC.md` and find the section for this system.
- If the spec section exists, read it carefully -- it defines what you build.
- If it doesn't exist, STOP and write the spec section FIRST using the `@spec-writer` agent.

### Step 2: Check existing implementation
Search for existing files related to this system:
```
game/systems/*
game/hooks/*
game/actions/*
config/game/*
```
Understand what already exists before creating anything new.

### Step 3: Write tests
Create or update `game/systems/<name>.test.ts`:
- Each test references a GAME_SPEC.md section number
- Test the formulas and rules from the spec
- Test edge cases
- Test difficulty tier scaling (Seedling/Sapling/Hardwood/Ironwood)
- Test chunk-awareness if applicable

### Step 4: Write implementation
Create or update `game/systems/<name>.ts`:
- Pure function system: `(world, dt, ...context) => void`
- Config from `config/game/*.json`
- Randomness via `scopedRNG`
- Difficulty scaling via `getDifficultyConfig(tier)` multipliers -- never `if (tier === 'x')`
- Delta-only persistence for world state
- No file over 300 lines

### Step 5: Wire it up
- Add to game loop in `game/hooks/useGameLoop.ts`
- Connect to UI if needed (survival HUD, crafting menu, etc.)
- Update GAME_SPEC.md Implementation Status section

### Step 6: Verify
```bash
pnpm test
npx tsc --noEmit
pnpm lint
```
