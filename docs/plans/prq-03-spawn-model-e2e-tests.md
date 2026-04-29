---
title: PRQ-03 — Spawn Model + Golden-Path E2E Tests
priority: P0
status: pending
updated: 2026-04-29
blocks: []
blocked_by: [prq-01, prq-02]
---

# PRQ-03: Spawn Model + Golden-Path E2E Tests

## Goal

1. Revise the spawn model: player starts OUTSIDE the first grove (not
   inside it). First grove is placed within sight-line distance.
   Encounters are off until first named weapon crafted.
2. Replace all `window.__grove.actions` warp-based screenshot tests
   with real golden-path Playwright tests that use actual keyboard/touch
   input to drive gameplay.

## Spec reference

`docs/superpowers/specs/2026-04-29-grovekeeper-voxel-pivot-design.md`
— sections "Spawn model (Ecco / first-grove flow)", "Encounter gate".

## Success criteria

1. Player spawns in wilderness, not inside a grove.
2. First grove always within 32 voxels of spawn for the default starter
   seed (deterministic via `scopedRNG`).
3. No encounters spawn until `hasCraftedNamedWeapon` is true.
4. On first named weapon crafted: audio sting + narrator entry.
5. At least one golden-path Playwright test that drives real keyboard
   input through: spawn → walk to grove → gather → combine (craft
   spear) → walk to workbench → craft hearth → place → light → claim.
6. E2E test does NOT use `window.__grove.actions` warp helpers for any
   part of the path being tested.
7. All tests pass. TypeScript clean.

## Task breakdown

### T1: Spawn outside grove
- `src/world/chunkGen.ts` (or runtime.ts spawn logic):
  - On new game: spawn the player at a wilderness position, not inside
    the starter grove.
  - The wilderness spawn point is 30–40 voxels from the edge of the
    nearest grove.
  - The grove is always in the +X direction from spawn so the player
    has an instinctive "walk forward into the glow" on first open.
- Starter grove placement: biased within 32 voxels of spawn for seed
  `default` and any seed that triggers the starter-grove placement rule.
- Unit test: spawn position is outside grove bounds; grove is within 40
  voxels.

### T2: Encounter gate wiring (depends on PRQ-02 T10)
- Confirm `encounters.ts` gate is active end-to-end: no hostile spawns
  in a fresh game until weapon crafted.
- Integration test: run 1000 simulated ticks on a fresh world; zero
  hostiles spawned; craft spear; run 1000 more; at least one hostile
  spawn.

### T3: First-weapon sting
- When `hasCraftedNamedWeapon` flips true:
  - Audio: play `sfx/moments/first-weapon.ogg` (already in asset tree).
  - Narrator: generate `encounter.first` grammar entry; append to journal.
  - Koota flag: write `HasCraftedWeapon` trait on player entity.
- Unit test: sting fires exactly once; Koota flag set; journal entry appended.

### T4: E2E test infrastructure
- Create `e2e/golden-path.spec.ts`.
- Helper: `walkTowards(page, targetX, targetZ, maxSteps)` — holds W key
  and checks position each 200ms until within 2 units of target or
  maxSteps exceeded.
- Helper: `pressAction(page, action)` — maps action name to key code and
  fires a single keydown+keyup.
- Helper: `waitForJournalEntry(page, pattern)` — polls journal endpoint
  until an entry matching the pattern appears.
- Helper: `getPlayerPosition(page): {x, y, z}` — reads from a
  `window.__grove.state.playerPosition` (read-only diagnostic, NOT a
  warp action; always available).
- No `window.__grove.actions.teleportPlayer` calls in golden-path tests.

### T5: Golden-path test — claim first grove
```typescript
test("player can claim first grove from spawn", async ({ page }) => {
  await page.goto("/");
  // Start new game with deterministic seed
  await page.click("[data-testid=begin-button]");
  await page.fill("[data-testid=seed-input]", "golden-path-1");
  await page.click("[data-testid=start-game-button]");

  // Walk toward grove (first grove is always in +X from spawn)
  await walkTowards(page, 32, 0, 300);

  // Gather rock (pick up first material near spawn)
  await pressAction(page, "interact");
  await waitForJournalEntry(page, /pick.*rock|rock.*pick/i);

  // Gather stick
  await pressAction(page, "interact");

  // Combine: rock + stick → spear
  await pressAction(page, "combine");
  await waitForJournalEntry(page, /spear/i);

  // Verify encounter gate flipped
  const hasWeapon = await page.evaluate(() =>
    window.__grove.state.hasCraftedNamedWeapon
  );
  expect(hasWeapon).toBe(true);

  // Walk to flat-rock workbench area inside grove
  await walkTowards(page, 32, 0, 200); // into grove
  await pressAction(page, "interact"); // open craft surface

  // Craft hearth blueprint
  await page.click("[data-testid=recipe-hearth]");
  await page.click("[data-testid=craft-button]");

  // Place hearth
  await pressAction(page, "place");

  // Light hearth
  await pressAction(page, "interact");

  // Verify claim
  const claimed = await page.evaluate(() =>
    window.__grove.state.groveCount
  );
  expect(claimed).toBeGreaterThan(0);
});
```

### T6: Golden-path test — harvest + encounter cycle
```typescript
test("harvest cycle completes; encounter spawns after weapon", async
  ({ page }) => {
  // ... navigate to wilderness with weapon crafted
  // Walk around, verify encounter spawns
  // Resolve encounter (swing), verify retreat or win
  // Walk back into grove, verify HP restores
});
```

### T7: E2E test data cleanup
- Review `tests/rc-journey.spec.ts`: remove any remaining
  `window.__grove.actions.teleportPlayer` calls from tests that can
  reasonably use real input.
- Keep warp helpers ONLY for screenshot-baseline capture (where exact
  scene position matters for visual regression, not gameplay).
- Document the distinction: "warp OK for visual gates, not for
  gameplay paths."

## Notes

- The `window.__grove.state` diagnostic surface exposes read-only game
  state for E2E assertion: `playerPosition`, `hasCraftedNamedWeapon`,
  `groveCount`, `currentBiome`, `inventoryJson`, `journalCount`. It does
  NOT expose write actions.
- The `window.__grove.actions` surface is retained only for screenshot
  baselines and must not appear in golden-path tests.
- Golden-path tests run in `pnpm test:e2e`; they require the dev server
  or a built preview. CI runs `pnpm build && pnpm preview &` before
  `playwright test`.
