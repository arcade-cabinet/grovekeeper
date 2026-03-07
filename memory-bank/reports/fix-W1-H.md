# Fix Report: FIX-13 — Spirit Proximity Detection (useSpiritProximity)

## Summary

Implemented `useSpiritProximity` hook to detect when the player is within 2m of
an undiscovered Grovekeeper spirit. This was the missing activation trigger for
the entire Grovekeeper narrative path — `discoverSpirit()` existed in the store
but was never called from any game loop or hook.

---

## Hook Architecture

**Pattern:** `useFrame` inside the R3F Canvas context, identical to `useRaycast`
and `useGameLoop`. The hook is mounted inside the `GameSystems` null-rendering
component in `app/game/index.tsx`, which runs inside `<Physics>` inside
`<Canvas>`.

**Pure functions exported for testability:**
- `computeDistance3D(ax, ay, az, bx, by, bz)` — 3D Euclidean distance
- `checkSpiritProximity(player, spirits, cooldowns, now, radius, cooldownMs)` —
  returns array of spirit IDs that should trigger this tick. No side effects.

**Frame loop logic (inside `useSpiritProximity`):**
1. Resolve player position from `playerQuery.first`
2. Snapshot all `grovekeeperSpiritsQuery` entities into `SpiritSnapshot[]`
3. Call `checkSpiritProximity()` with module-level `_spiritCooldowns` map
4. For each triggered `spiritId`:
   - Record cooldown in `_spiritCooldowns`
   - Call `store.discoverSpirit(spiritId)` — marks discovered, advances quest
   - Mutate `entity.grovekeeperSpirit.discovered = true` — compass clears immediately
   - Call `world.addComponent(entity, "dialogue", makeDialogueComponent(treeId))` —
     opens dialogue session (sets `activeTreeId`, `bubbleVisible: true`, `inConversation: true`)
   - Call `showToast("A Grovekeeper spirit stirs...", "info")` on first discovery

---

## Distance Threshold

`SPIRIT_DETECTION_RADIUS = 2.0` meters (strict less-than, boundary excluded).

Distance is 3D Euclidean — accounts for Y differences, not XZ-only.

---

## Cooldown

`SPIRIT_COOLDOWN_MS = 5000` ms (5 seconds). Per-spirit. Prevents re-trigger
during the discovery animation / dialogue opening. Stored in a module-level Map
that persists across re-renders but resets on app restart.

---

## Where It Is Mounted

`app/game/index.tsx` — inside `GameSystems` component, alongside `useGameLoop()`
and `useRaycast()`:

```
function GameSystems() {
  useGameLoop();
  useRaycast();
  useSpiritProximity();   // <-- added
  return <ChunkStreamer />;
}
```

`GameSystems` is rendered inside `<Canvas><Physics>`, giving `useSpiritProximity`
the R3F frame context it needs.

---

## Files Created / Modified

- **Created:** `game/hooks/useSpiritProximity.ts`
- **Created:** `game/hooks/useSpiritProximity.test.ts`
- **Modified:** `app/game/index.tsx` — import + `useSpiritProximity()` call

---

## ECS Write-Back

The audit (`05-grovekeeper-path.md` issue #4) noted that `GrovekeeperSpiritComponent.discovered`
was never mutated, causing the compass to never clear. The hook now directly
mutates `entity.grovekeeperSpirit.discovered = true` after calling `discoverSpirit()`.

---

## Test Results

```
Tests: 18 passed, 18 total
```

All 18 tests pass in `game/hooks/useSpiritProximity.test.ts`:

- `computeDistance3D` — 6 tests (zero distance, axis-aligned, 3D diagonal,
  symmetry, negatives, Y-axis distance)
- `checkSpiritProximity` — 8 tests:
  - Player at 1.9m → triggers (PASS)
  - Player at 2.1m → NOT triggered (PASS)
  - Player at exactly 2.0m → NOT triggered (PASS)
  - Already-discovered spirit → NOT triggered (PASS)
  - Cooldown within 5s → NOT triggered (PASS)
  - Cooldown expired after 6s → triggers (PASS)
  - Empty spirits list → empty result (PASS)
  - Multiple spirits, only in-range triggers (PASS)
- Constants — 2 tests (SPIRIT_DETECTION_RADIUS = 2.0, SPIRIT_COOLDOWN_MS = 5000)
- Smoke test — 1 test (useSpiritProximity is a function)
- Bonus: both-in-range triggers both (1 test)

**Full suite (150 test suites):** 6 pre-existing failures unchanged, 144 passing.
Zero new failures introduced by this change.

---

## Pre-existing Failures (not caused by this change)

These 6 suites fail without my changes and are outside this fix's scope:
- `game/ui/Toast.test.ts` — export mismatch in Toast module
- `game/config/species.test.ts` — species count mismatch (12 vs 17 expected)
- `game/config/difficulty.test.ts` — config value mismatch
- `game/systems/speciesDiscovery.test.ts` — depends on species config
- `game/systems/survival.test.ts` — depends on config values
- `game/config/resources.test.ts` — resource config mismatch
