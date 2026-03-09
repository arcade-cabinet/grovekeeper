/**
 * tickAchievements tests -- verifies toast notifications on achievement unlock.
 * Spec §25
 */

import { useGameStore } from "@/game/stores";
import { _resetToastsForTesting, getToasts } from "@/game/ui/Toast.ts";
import { tickAchievements } from "./tickAchievements.ts";

// We need a minimal TimeState for the function signature.
const makeTimeState = () =>
  ({
    totalMicroseconds: 0,
    dayNumber: 1,
    hour: 8,
    season: "spring" as const,
    phase: "day" as const,
  }) as Parameters<typeof tickAchievements>[1];

beforeEach(() => {
  _resetToastsForTesting();
  useGameStore.getState().resetGame();
});

describe("tickAchievements toast notifications (Spec §25)", () => {
  it("shows a toast when a new achievement is earned", () => {
    // Set up store so "first-seed" achievement will trigger
    const store = useGameStore.getState();
    store.incrementTreesPlanted();

    // Force the check to run by exceeding the 5s interval
    const ref = { current: 10 };
    tickAchievements(ref, makeTimeState(), 0);

    const toasts = getToasts();
    expect(toasts.length).toBeGreaterThanOrEqual(1);
    const achievementToast = toasts.find((t) => t.message.includes("First Seed"));
    expect(achievementToast).toBeDefined();
    expect(achievementToast?.type).toBe("achievement");
  });

  it("does not show a toast for already-earned achievements", () => {
    const store = useGameStore.getState();
    store.incrementTreesPlanted();
    // Pre-earn the achievement
    store.unlockAchievement("first-seed");

    const ref = { current: 10 };
    tickAchievements(ref, makeTimeState(), 0);

    const toasts = getToasts();
    const achievementToast = toasts.find((t) => t.message.includes("First Seed"));
    expect(achievementToast).toBeUndefined();
  });

  it("does not show a toast when interval has not elapsed", () => {
    const store = useGameStore.getState();
    store.incrementTreesPlanted();

    // Interval not yet reached
    const ref = { current: 0 };
    tickAchievements(ref, makeTimeState(), 1);

    const toasts = getToasts();
    expect(toasts).toHaveLength(0);
  });

  it("shows multiple toasts when multiple achievements earned at once", () => {
    const store = useGameStore.getState();
    // Plant 25+ trees to trigger both "first-seed" and "green-thumb"
    for (let i = 0; i < 25; i++) {
      store.incrementTreesPlanted();
    }

    const ref = { current: 10 };
    tickAchievements(ref, makeTimeState(), 0);

    const toasts = getToasts();
    const firstSeed = toasts.find((t) => t.message.includes("First Seed"));
    const greenThumb = toasts.find((t) => t.message.includes("Green Thumb"));
    expect(firstSeed).toBeDefined();
    expect(greenThumb).toBeDefined();
  });
});
