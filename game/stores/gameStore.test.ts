/**
 * gameStore.test.ts -- Decomposed into domain-specific test files.
 *
 * Tests have been moved to:
 *   - playerState.test.ts  (player state, XP, stamina, grove, prestige, survival)
 *   - inventory.test.ts    (resources, seeds, lifetime tracking)
 *   - questState.test.ts   (quest actions, quest chains)
 *   - settings.test.ts     (settings, spirits, tutorial, NPC)
 */

// Barrel shim: confirm all public exports are still accessible via gameStore
import { useGameStore, xpToNext, levelFromXp } from "./index";

it("gameStore barrel re-exports useGameStore and XP helpers", () => {
  expect(typeof useGameStore).toBe("function");
  expect(typeof xpToNext).toBe("function");
  expect(typeof levelFromXp).toBe("function");
});
