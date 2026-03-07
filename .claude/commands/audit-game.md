---
allowed-tools: Read, Bash, Glob, Grep
description: Audit the game for playability -- survival loop, Grovekeeper path, chunk world, code health
---

Run a full audit of Grovekeeper's current state.

## Audit Checklist

### 1. Can it start?
- Does `pnpm dev` launch without errors?
- Does the main menu render with seed phrase input?
- Does difficulty tier selection work (Seedling/Sapling/Hardwood/Ironwood)?
- Can you start a new game and reach the tutorial village?

### 2. Survival loop
- Do hearts display correctly for the selected difficulty tier?
- Does hunger drain over time (rate scales with difficulty)?
- Does stamina drain on tool use and regenerate when idle?
- Does eating food restore hunger and/or hearts?
- Does campfire proximity heal hearts?
- Does temperature respond to biome + weather + time-of-day?
- Does death drop resources and respawn at last campfire?

### 3. Core tool loop
- Can the player select and use tools (trowel, axe, watering can)?
- Does tool use drain stamina AND durability?
- Does exhaustion (0 stamina) block tool use?
- Do tools break at 0 durability?
- Can tools be repaired/upgraded at the Forge?

### 4. Chunk-based world
- Do new chunks generate seamlessly as the player walks?
- Does terrain noise stitch across chunk boundaries?
- Do biomes transition smoothly?
- Does delta persistence work (player changes survive chunk unload/reload)?
- Do procedural features appear at correct cadence (micro/minor/major)?

### 5. Grovekeeper path
- Does the compass hint toward labyrinths?
- Can the player enter and navigate a hedge labyrinth?
- Does the Grovekeeper encounter trigger at maze center?
- Does species unlock work?
- Is Birchmother reachable within ~2-3 hours?

### 6. Economy and crafting
- Does crafting work (recipes, resource costs, level gates)?
- Does forging work (smelting, tool upgrades)?
- Does cooking work (campfire + cooking pot recipes)?
- Does trading work (seasonal modifiers, supply/demand)?

### 7. Structures and base building
- Can essential structures be built (campfire, shelter, storage)?
- Do structure effects apply in correct radius?
- Does campfire fast travel work?
- Do base building unlocks progress with level?

### 8. Day/night, weather, seasons
- Does time advance (day/night cycle)?
- Do seasons change with 5-day transition blend?
- Do weather events have gameplay impact (rain growth, snow cold, wind damage)?
- Does Bramble warn before weather events?

### 9. Systems running
- Are trees growing (stage progression)?
- Are NPCs present with seeded appearance and quests?
- Is the quest system functional (main, world, procedural)?
- Is the codex tracking species discovery?

### 10. Spec coverage
- How many GAME_SPEC.md sections have matching implementations?
- How many implementations have NO spec section?
- How many spec sections have NO implementation?

### 11. Code health
- Files over 300 lines?
- Math.random() in game code?
- Inline tuning constants (should be in config JSON)?
- Tests passing? (`pnpm test`)
- TypeScript clean? (`npx tsc --noEmit`)
- Lint clean? (`pnpm lint`)

## Output Format

```
# Grovekeeper Audit Report -- [date]

## Summary
- Playable: YES/NO
- Survival loop complete: YES/NO
- Grovekeeper path functional: YES/NO
- Chunk world working: YES/NO
- Systems running: N/M
- Spec coverage: N/M sections implemented

## Critical Blockers
1. [description]

## Blocking Issues
1. [description]

## Degraded Systems
1. [description]

## Missing Systems (specced but not implemented)
1. [description]

## Code Health Issues
1. [description]
```
