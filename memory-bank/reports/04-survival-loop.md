# Survival Loop Audit

**Date:** 2026-03-07
**Auditor:** QC Agent (Claude Sonnet 4.6)
**Branch:** feat/expo-migration

---

## Summary

The survival loop has a deep structural split: the **pure-function layer is real and well-tested**, but the **integration layer is almost entirely missing**. Hunger drains, heart loss from starvation and exposure, stamina exhaustion gating, death detection, and difficulty scaling all exist as correct, tested pure functions in `game/systems/survival.ts` and `game/systems/stamina.ts` — but **none of these functions are called from the game loop (`useGameLoop.ts`), the action dispatcher (`GameActions.ts`), or any component**. The game ships with the math but without the wiring.

The single survival mechanism that IS wired is stamina regeneration. Everything else — hunger, hearts, death, respawn, temperature, difficulty gating — is dead code relative to the running game.

---

## What Works

**Pure functions (tested, correct logic):**

- `tickHunger()` — drains hunger per dt, scales with difficulty `hungerDrainRate`, Explore mode returns unchanged value. Tests pass.
- `tickHeartsFromStarvation()` — drains 0.25 hearts/min when hunger is zero. Tests pass.
- `tickHeartsFromExposure()` — drains hearts at `exposureDriftRate/min` per difficulty tier. Tests pass.
- `isPlayerDead()` — returns true when `health.current <= 0`. Tests pass.
- `computeStaminaRegenMult()` — applies hunger-gated regen multiplier; zero hunger = zero regen; Well Fed (>80) = +10%. Tests pass.
- `tickStaminaDrain()` — drains stamina by `baseCost * staminaDrainMult`, blocks action when insufficient. Tests pass.
- `regenStamina()` in `stamina.ts` — regenerates at 2/sec * regenMult. Tests pass.

**Configuration (correct and detailed):**

- `config/game/difficulty.json` — 5 tiers (explore, normal, hard, brutal, ultra-brutal) with distinct `hungerDrainRate`, `staminaDrainMult`, `staminaRegenMult`, `exposureDriftRate`, `exposureEnabled`, `maxHearts`, `deathDropsInventory`, `permadeathForced`. The data is accurate and differentiated.

**Stamina regen (the one wired survival mechanism):**

- `useGameLoop.ts` step 4 calls `regenStamina()` each frame and syncs the value back to the store. Stamina does actually fill up over time in-game.

**Stamina cost on tool use:**

- `GameActions.ts:spendToolStamina()` reads `tool.staminaCost` and calls `store.spendStamina()`. This is called from the action dispatcher. Tool actions that use this path do deduct stamina from the store.

**Campfire fast travel (discovery only):**

- `fastTravel.ts` / `discoverCampfire()` — pure function for tracking campfire discovery points in the store. Wired into the store. Campfires are discovered but serve only as fast-travel waypoints; they have no respawn function.

**Base raids (pure functions, real logic):**

- `baseRaids.ts` — `calculateRaidProbability()`, `generateRaidWave()`, `getApproachDirections()`, `getRaidWarning()`, `calculateRaidLoot()` are all implemented with real probabilistic math and seeded RNG. Well tested.

**Combat math (pure functions):**

- `combat.ts` — `computePlayerDamage()`, `computeEnemyDamage()`, `applyDamageToHealth()`, `tickInvulnFrames()`, `computeKnockback()` all exist with correct logic and invulnerability windows.

**Loot system (pure functions):**

- `lootSystem.ts` — `rollLootForEnemy()`, `createLootDrop()`, `updateLootDespawn()` are real and tested.

**Cooking system (pure functions):**

- `cooking.ts` — `canCook()`, `advanceCooking()`, `collectCookedFood()` exist. Food items have `saturation` and `healing` fields. The cooking loop (campfire lit check, progress advance) is real.

---

## What Is Stubbed / Hollow

**Hunger is in the ECS component but never ticked:**

- `game/ecs/components/core.ts:28` — `PlayerComponent` has `hunger: number` and `maxHunger: number`.
- `game/ecs/archetypes.ts:83` — `createPlayerEntity()` initializes `hunger: 100, maxHunger: 100`.
- `game/hooks/useGameLoop.ts` — no call to `tickHunger()` anywhere. Hunger is initialized and then frozen at 100 for the entire game session.

**Death detection is defined but never checked:**

- `game/systems/survival.ts:103` — `isPlayerDead()` exists and is correct.
- It is called only in `survival.test.ts`. No component, hook, or game loop reads this function. There is no death handler, no death screen, no respawn logic anywhere.

**Starvation and exposure heart drain are never applied:**

- `tickHeartsFromStarvation()` and `tickHeartsFromExposure()` are called only in `survival.test.ts`.

**Hearts (player health) have no persistent store slot:**

- `game/stores/gameStore.ts` initial state (lines 173-272) — no `health`, `hearts`, `currentHearts`, or `maxHearts` field. The store tracks `stamina` and `maxStamina` but nothing for hearts.
- The `HealthComponent` (ECS, `game/ecs/components/combat.ts`) is defined for enemies and structures. No player entity in `createPlayerEntity()` (archetypes.ts) receives a `HealthComponent`.
- Hearts displayed in `NewGameModal.tsx` are decorative UI only — they show a count per tier but there is no backing state that tracks current hearts.

**Raids are never triggered:**

- `baseRaids.ts` functions are pure math. They are not called from `useGameLoop.ts`, any schedule, or any game event. `calculateRaidProbability()` is never evaluated at runtime. The raid warning system, wave generation, and loot multiplier calculations are dead code.

**Combat is never invoked on the player:**

- `combatQuery = world.with("combat", "health", "position")` exists in `world.ts` but is never iterated in the game loop. No enemy deals damage to the player entity. No player `HealthComponent` exists to receive it.

**Staminadrainmult from difficulty is read by nobody:**

- `difficulty.json` has `staminaDrainMult` per tier. `spendToolStamina()` in `GameActions.ts` reads only the raw `tool.staminaCost` and passes it directly to `store.spendStamina()`. The difficulty multiplier is never applied at the call site.

**Food consumption restores nothing:**

- `FoodComponent.saturation` and `FoodComponent.healing` are defined. `cooking.ts` produces `FoodComponent` objects. There is no `eatFood()` action, no handler that applies saturation to the player's hunger, and no handler that applies healing to player hearts.

**Permadeath is a toggle but has no consequence:**

- `NewGameModal.tsx` captures a `permadeath: boolean` and passes it to `onStart()`. `gameStore.ts` stores `permadeath: false` in initial state. No game logic branches on `permadeath` — death never fires, so the distinction is irrelevant.

**Temperature system is absent:**

- `game/db/schema.ts:35` has a `bodyTemp` column (`// Forward-compatible: PR 2 exposure system`) initialized to 37.
- There is no temperature computation, no biome-to-temperature mapping for player body temp, no time-of-day heat/cold effect. The `exposureDriftRate` in difficulty config is a flat drain unrelated to any computed temperature.

**The staminaDrainMult is not applied at the `spendToolStamina()` call site (`GameActions.ts:391-397`).** It reads `tool.staminaCost` raw without loading the difficulty config multiplier.

---

## Missing Entirely

1. **Player HealthComponent** — player entity has no health/hearts component in ECS. No `{ current, max }` for the player.
2. **Hunger game loop tick** — `tickHunger()` is never called from any frame loop.
3. **Hearts game loop tick** — `tickHeartsFromStarvation()` and `tickHeartsFromExposure()` are never called.
4. **Death handler** — no function that responds to `isPlayerDead()` returning true.
5. **Respawn at last campfire** — `lastCampfire` field does not exist in the store. There is no respawn position stored or used. Campfires are fast-travel waypoints only.
6. **Inventory drop on death** — `difficulty.json` has `deathDropsInventory: true` for brutal/ultra-brutal tiers. No code implements this.
7. **Death screen / UI** — no `DeathScreen`, no game-over state, no modal triggered by player death.
8. **Food eating mechanic** — no `eatFood()` action, no hunger restoration on food consumption.
9. **Difficulty multiplier applied to stamina drain** — `staminaDrainMult` from difficulty config is loaded but never passed to `spendToolStamina()`.
10. **Temperature computation** — no player body temperature system beyond a DB column placeholder.
11. **Raid scheduler / trigger** — `calculateRaidProbability()` is never evaluated at runtime. Raids never fire.
12. **Combat loop** — `combatQuery` is declared but never iterated. Enemies never attack players; players never deal damage to enemies through the game loop.
13. **Permadeath branch** — `permadeath` boolean is stored but no behavior differs based on its value.
14. **Well Fed stamina bonus in game loop** — `computeStaminaRegenMult()` computes a hunger-gated regen multiplier, but `useGameLoop.ts` calls `regenStamina()` without the multiplier argument (uses default 1.0 always).

---

## Hunger System Reality Check

**Does it drain over time?**
No. `tickHunger()` is a correct pure function that never executes in the running game. Hunger is initialized to 100 in the player ECS archetype and never changes.

**Does difficulty scale the rate?**
The data exists in `difficulty.json` (`hungerDrainRate: 0 / 1.0 / 1.5 / 2.0 / 2.0` across tiers). The function accepts and correctly uses the rate. But since the function is never called from the game loop, the scaling has no runtime effect.

---

## Stamina Reality Check

**Does tool use cost stamina?**
Partially. `spendToolStamina(toolId)` in `GameActions.ts` reads `tool.staminaCost` and calls `store.spendStamina()`. This path works for tool actions that invoke `spendToolStamina()`. However:
- The difficulty `staminaDrainMult` is never applied to the cost.
- The hunger gating of stamina regen (`computeStaminaRegenMult()`) is not used — regen always runs at the base rate regardless of hunger.

**Does exhaustion block actions?**
Partially. `store.spendStamina()` returns false when stamina < cost, which `spendToolStamina()` propagates. Whether callers actually gate the action on this return value depends on each individual action.

**Does stamina regenerate?**
Yes. This is the one survival mechanic fully wired. `useGameLoop.ts` calls `regenStamina()` each frame at base rate (2/sec), syncing the result to the store.

---

## Health + Death Reality Check

**Is death real?**
No. The player has no `HealthComponent` in ECS. `isPlayerDead()` exists as a pure function but is never evaluated against any runtime state. The game has no concept of "the player's current hearts" during play — only a hardcoded initial count displayed in the new game UI.

**Is respawn at campfire implemented?**
No. There is no `lastCampfireId`, `respawnPosition`, or equivalent in `gameStore.ts` initial state. Campfire discovery stores a `FastTravelPoint[]` list for navigation, not for death respawn. No code moves the player to a campfire location on death because death never fires.

---

## Temperature Reality Check

**Does temperature respond to world state?**
No. The `biomeMapper.ts` uses a `temperature` noise axis to classify biomes (frozen-peaks, meadow, etc.) — this is terrain generation only, it does not feed into player body temperature. The `exposureDriftRate` in difficulty config is a flat drain applied uniformly regardless of the player's biome, current weather, time of day, or shelter status. The DB schema has a `bodyTemp` column with `// Forward-compatible: PR 2 exposure system` comment, explicitly acknowledging this is unimplemented.

---

## Difficulty Scaling Reality Check

**Do the 4 tiers actually differ in gameplay?**

| Mechanic | Explore | Normal | Hard | Brutal | Ultra-Brutal |
|---|---|---|---|---|---|
| Hunger drains | No (0 rate) | Never called | Never called | Never called | Never called |
| Stamina drain mult applied | No | No | No | No | No |
| Stamina regen (base) | Yes | Yes | Yes | Yes | Yes |
| Exposure heart drain | Never called | Never called | Never called | Never called | Never called |
| Death triggers | Never | Never | Never | Never | Never |
| Permadeath enforced | N/A | Never fires | Never fires | Never fires | Never fires |
| Growth speed | Yes (config loaded) | Yes | Yes | Yes | Yes |
| Resource yield | Yes (in harvest) | Yes | Yes | Yes | Yes |

The only actual gameplay differences between difficulty tiers at runtime are growth speed multipliers and resource yield multipliers (applied in the growth and harvest systems). All survival-specific differences — hunger rate, stamina multiplier, exposure, death consequences — are data that exists but is never applied.

---

## Critical Issues (numbered)

1. **`tickHunger()` is never called from `useGameLoop.ts`.** Hunger is initialized to 100 and permanently frozen. The survival loop's most fundamental mechanic does not run.

2. **Player has no `HealthComponent` in ECS.** `createPlayerEntity()` in `archetypes.ts` does not include a `health` field. Hearts are cosmetic only.

3. **`isPlayerDead()` is never evaluated in production code.** There is no death trigger, no death screen, no consequence for health reaching zero.

4. **No respawn position is stored.** `gameStore.ts` has no `lastCampfireId` or respawn coordinates. Campfire discovery is wired for fast-travel only.

5. **Difficulty `staminaDrainMult` is not applied at the action call site.** `spendToolStamina()` uses raw tool cost. Hard/Brutal modes feel identical to Normal for stamina.

6. **`computeStaminaRegenMult()` is unused in the game loop.** `regenStamina()` is called with default `regenMult = 1.0` always, ignoring hunger state and difficulty `staminaRegenMult`.

7. **Raids never trigger.** `baseRaids.ts` is complete math code that is never invoked. No scheduler calls `shouldTriggerRaid()`.

8. **Combat loop is never run.** `combatQuery` exists but is not iterated in `useGameLoop.ts`. Enemies do not deal damage.

9. **Food has no eat action.** `FoodComponent.saturation` and `.healing` are defined but no code path applies them to the player's hunger or hearts.

10. **Temperature system is a DB column placeholder only.** No runtime computation of player body temperature exists. `exposureDriftRate` is a flat drain with no environmental feedback.

11. **`deathDropsInventory` logic is missing.** The brutal/ultra-brutal config flag exists but no inventory-drop-on-death code exists anywhere.

12. **Permadeath has no behavioral branch.** The toggle is captured and stored but never read by any game system.

---

## Verdict: Survival Loop Is STUB

The survival loop is a well-designed, well-tested pure-function library sitting completely disconnected from the running game. The math is correct. The config is rich and differentiated. The tests pass. But no survival pressure reaches the player at runtime. Hunger does not drain. Hearts do not exist. Death cannot occur. Difficulty tiers are identical for all survival mechanics. The game as it runs today is effectively a permanent Explore mode regardless of what difficulty is selected.

**Integration debt summary:**
- `useGameLoop.ts` needs: `tickHunger()`, `tickHeartsFromStarvation()`, `tickHeartsFromExposure()`, `isPlayerDead()` evaluation, `computeStaminaRegenMult()` passed to `regenStamina()`.
- `GameActions.ts` needs: difficulty multiplier applied in `spendToolStamina()`.
- `archetypes.ts` / `createPlayerEntity()` needs: `health: HealthComponent` field.
- `gameStore.ts` needs: `hunger`, `maxHunger`, `hearts`, `maxHearts`, `lastCampfireId` in initial state.
- New code needed: death handler, respawn logic, inventory drop, food eat action, raid scheduler, player combat loop integration, temperature computation.
