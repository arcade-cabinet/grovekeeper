import { describe, expect, it } from "vitest";
import type { EventState } from "./types";
import {
  advanceFestivalChallenge,
  getActiveFestivalGrowthBoost,
  getActiveFestivalHarvestBoost,
  getEncounterDef,
  getFestivalDef,
  initializeEventState,
  isEncounterPending,
  isFestivalActive,
  resolveEncounter,
  updateEvents,
  type EventContext,
} from "./eventScheduler";

// ============================================
// Helpers
// ============================================

function makeContext(overrides: Partial<EventContext> = {}): EventContext {
  return {
    currentDay: 1,
    season: "spring",
    playerLevel: 10,
    rngSeed: 42,
    ...overrides,
  };
}

// ============================================
// initializeEventState
// ============================================

describe("initializeEventState", () => {
  it("returns a clean initial state", () => {
    const state = initializeEventState();

    expect(state.activeFestival).toBeNull();
    expect(state.activeEncounter).toBeNull();
    expect(state.completedFestivalIds).toEqual([]);
    expect(state.resolvedEncounterIds).toEqual([]);
    expect(state.lastFestivalDay).toBeLessThanOrEqual(0);
    expect(state.lastEncounterDay).toBeLessThanOrEqual(0);
  });

  it("allows festivals on the first day (cooldown satisfied by negative initial)", () => {
    const state = initializeEventState();
    const ctx = makeContext({ currentDay: 5, season: "spring" });
    const result = updateEvents(state, ctx);

    // Spring Bloom triggers on day 5 of spring
    expect(result.state.activeFestival).not.toBeNull();
    expect(result.festivalStarted).not.toBeNull();
    expect(result.festivalStarted?.id).toBe("spring-bloom");
  });
});

// ============================================
// Festival triggering
// ============================================

describe("Festival triggering", () => {
  it("Spring Bloom starts on day 5 of spring", () => {
    const state = initializeEventState();
    const ctx = makeContext({ currentDay: 5, season: "spring" });
    const result = updateEvents(state, ctx);

    expect(result.festivalStarted?.id).toBe("spring-bloom");
    expect(result.state.activeFestival?.definitionId).toBe("spring-bloom");
    expect(result.state.activeFestival?.startDay).toBe(5);
    expect(result.state.activeFestival?.completed).toBe(false);
  });

  it("Summer Solstice starts on day 10 of summer", () => {
    const state = initializeEventState();
    const ctx = makeContext({ currentDay: 10, season: "summer" });
    const result = updateEvents(state, ctx);

    expect(result.festivalStarted?.id).toBe("summer-solstice");
  });

  it("Harvest Moon starts on day 8 of autumn", () => {
    const state = initializeEventState();
    const ctx = makeContext({ currentDay: 8, season: "autumn" });
    const result = updateEvents(state, ctx);

    expect(result.festivalStarted?.id).toBe("autumn-harvest");
  });

  it("Frostweave starts on day 12 of winter", () => {
    const state = initializeEventState();
    const ctx = makeContext({ currentDay: 12, season: "winter" });
    const result = updateEvents(state, ctx);

    expect(result.festivalStarted?.id).toBe("winter-frost");
  });

  it("does not start festival on wrong day", () => {
    const state = initializeEventState();
    const ctx = makeContext({ currentDay: 6, season: "spring" });
    const result = updateEvents(state, ctx);

    expect(result.festivalStarted).toBeNull();
    expect(result.state.activeFestival).toBeNull();
  });

  it("does not start festival on wrong season", () => {
    const state = initializeEventState();
    const ctx = makeContext({ currentDay: 5, season: "summer" });
    const result = updateEvents(state, ctx);

    expect(result.festivalStarted).toBeNull();
  });

  it("does not start a second festival when one is already active", () => {
    const state = initializeEventState();
    // Start Spring Bloom on day 5
    const result1 = updateEvents(
      state,
      makeContext({ currentDay: 5, season: "spring" }),
    );
    expect(result1.state.activeFestival).not.toBeNull();

    // Try to start Summer Solstice on day 10 while Spring Bloom is still active
    const result2 = updateEvents(
      result1.state,
      makeContext({ currentDay: 10, season: "summer" }),
    );
    // Spring Bloom ended (5 + 7 = 12, but we're on day 10, so it's still active)
    expect(result2.state.activeFestival?.definitionId).toBe("spring-bloom");
  });

  it("initializes challenges with zero progress", () => {
    const state = initializeEventState();
    const ctx = makeContext({ currentDay: 5, season: "spring" });
    const result = updateEvents(state, ctx);

    const challenges = result.state.activeFestival?.challenges;
    expect(challenges).toBeDefined();
    expect(challenges!.length).toBe(3);
    for (const c of challenges!) {
      expect(c.currentProgress).toBe(0);
      expect(c.completed).toBe(false);
    }
  });
});

// ============================================
// Festival ending
// ============================================

describe("Festival ending", () => {
  it("festival ends after durationDays", () => {
    const state = initializeEventState();
    // Start Spring Bloom (day 5, duration 7)
    const started = updateEvents(
      state,
      makeContext({ currentDay: 5, season: "spring" }),
    );
    expect(started.state.activeFestival).not.toBeNull();

    // Advance to day 12 (5 + 7 = 12)
    const ended = updateEvents(
      started.state,
      makeContext({ currentDay: 12, season: "spring" }),
    );
    expect(ended.festivalEnded).toBe("spring-bloom");
    expect(ended.state.activeFestival).toBeNull();
    expect(ended.state.lastFestivalDay).toBe(12);
  });

  it("completed festival is added to completedFestivalIds", () => {
    const state = initializeEventState();
    const started = updateEvents(
      state,
      makeContext({ currentDay: 5, season: "spring" }),
    );

    // Complete all challenges
    let withProgress = started.state;
    withProgress = advanceFestivalChallenge(withProgress, "plant", 10);
    withProgress = advanceFestivalChallenge(withProgress, "water", 20);
    withProgress = advanceFestivalChallenge(withProgress, "grow_mature", 3);
    expect(withProgress.activeFestival?.completed).toBe(true);

    // End the festival
    const ended = updateEvents(
      withProgress,
      makeContext({ currentDay: 12, season: "spring" }),
    );
    expect(ended.state.completedFestivalIds).toContain("spring-bloom");
  });

  it("incomplete festival is NOT added to completedFestivalIds", () => {
    const state = initializeEventState();
    const started = updateEvents(
      state,
      makeContext({ currentDay: 5, season: "spring" }),
    );

    // End without completing challenges
    const ended = updateEvents(
      started.state,
      makeContext({ currentDay: 12, season: "spring" }),
    );
    expect(ended.state.completedFestivalIds).not.toContain("spring-bloom");
  });
});

// ============================================
// Festival cooldown
// ============================================

describe("Festival cooldown", () => {
  it("prevents back-to-back festivals within 15 days", () => {
    const state = initializeEventState();
    // Start and end Spring Bloom (day 5-12)
    const started = updateEvents(
      state,
      makeContext({ currentDay: 5, season: "spring" }),
    );
    const ended = updateEvents(
      started.state,
      makeContext({ currentDay: 12, season: "spring" }),
    );
    expect(ended.state.lastFestivalDay).toBe(12);

    // Try to trigger another festival at day 20 (only 8 days later)
    // Even if there was a festival defined for this day, it should be blocked
    const tooSoon = updateEvents(
      ended.state,
      makeContext({ currentDay: 20, season: "summer" }),
    );
    expect(tooSoon.festivalStarted).toBeNull();
  });

  it("allows a new festival after 15-day cooldown", () => {
    // Manually set lastFestivalDay so cooldown is met
    const state: EventState = {
      ...initializeEventState(),
      lastFestivalDay: 1,
    };
    // Day 1 + 15 = 16, so day 10 of summer at day >= 16 works
    // We need season day match: Summer Solstice triggers on day 10
    const ctx = makeContext({ currentDay: 10, season: "summer" });
    // But lastFestivalDay is 1, so 10 - 1 = 9 < 15 -- still blocked
    const result = updateEvents(state, ctx);
    expect(result.festivalStarted).toBeNull();

    // Now set lastFestivalDay far enough back
    const readyState: EventState = {
      ...initializeEventState(),
      lastFestivalDay: -10,
    };
    const readyResult = updateEvents(readyState, ctx);
    expect(readyResult.festivalStarted?.id).toBe("summer-solstice");
  });
});

// ============================================
// Festival challenge tracking
// ============================================

describe("advanceFestivalChallenge", () => {
  function stateWithActiveFestival(): EventState {
    const state = initializeEventState();
    const result = updateEvents(
      state,
      makeContext({ currentDay: 5, season: "spring" }),
    );
    return result.state;
  }

  it("increments progress for matching challenge type", () => {
    const state = stateWithActiveFestival();
    const updated = advanceFestivalChallenge(state, "plant", 3);

    const plantChallenge = updated.activeFestival?.challenges.find(
      (c) => c.targetType === "plant",
    );
    expect(plantChallenge?.currentProgress).toBe(3);
  });

  it("marks challenge as completed when target reached", () => {
    const state = stateWithActiveFestival();
    const updated = advanceFestivalChallenge(state, "plant", 10);

    const plantChallenge = updated.activeFestival?.challenges.find(
      (c) => c.targetType === "plant",
    );
    expect(plantChallenge?.completed).toBe(true);
    expect(plantChallenge?.currentProgress).toBe(10);
  });

  it("caps progress at targetAmount", () => {
    const state = stateWithActiveFestival();
    const updated = advanceFestivalChallenge(state, "plant", 50);

    const plantChallenge = updated.activeFestival?.challenges.find(
      (c) => c.targetType === "plant",
    );
    expect(plantChallenge?.currentProgress).toBe(10);
  });

  it("does not affect unrelated challenge types", () => {
    const state = stateWithActiveFestival();
    const updated = advanceFestivalChallenge(state, "plant", 5);

    const waterChallenge = updated.activeFestival?.challenges.find(
      (c) => c.targetType === "water",
    );
    expect(waterChallenge?.currentProgress).toBe(0);
  });

  it("does not advance already-completed challenges", () => {
    let state = stateWithActiveFestival();
    state = advanceFestivalChallenge(state, "plant", 10);
    // Plant is now completed at 10

    state = advanceFestivalChallenge(state, "plant", 5);
    const plantChallenge = state.activeFestival?.challenges.find(
      (c) => c.targetType === "plant",
    );
    expect(plantChallenge?.currentProgress).toBe(10);
  });

  it("marks festival as completed when ALL challenges are done", () => {
    let state = stateWithActiveFestival();
    state = advanceFestivalChallenge(state, "plant", 10);
    state = advanceFestivalChallenge(state, "water", 20);
    expect(state.activeFestival?.completed).toBe(false);

    state = advanceFestivalChallenge(state, "grow_mature", 3);
    expect(state.activeFestival?.completed).toBe(true);
  });

  it("returns same state if no active festival", () => {
    const state = initializeEventState();
    const result = advanceFestivalChallenge(state, "plant", 5);
    expect(result).toBe(state);
  });

  it("accumulates progress across multiple calls", () => {
    let state = stateWithActiveFestival();
    state = advanceFestivalChallenge(state, "plant", 3);
    state = advanceFestivalChallenge(state, "plant", 4);
    state = advanceFestivalChallenge(state, "plant", 2);

    const plantChallenge = state.activeFestival?.challenges.find(
      (c) => c.targetType === "plant",
    );
    expect(plantChallenge?.currentProgress).toBe(9);
    expect(plantChallenge?.completed).toBe(false);
  });

  it("defaults amount to 1 when not specified", () => {
    const state = stateWithActiveFestival();
    const updated = advanceFestivalChallenge(state, "plant");

    const plantChallenge = updated.activeFestival?.challenges.find(
      (c) => c.targetType === "plant",
    );
    expect(plantChallenge?.currentProgress).toBe(1);
  });
});

// ============================================
// Encounter triggering
// ============================================

describe("Encounter triggering", () => {
  it("rolls for encounters when cooldown is satisfied", () => {
    // Run many seeds to find one that triggers an encounter
    let triggered = false;
    for (let seed = 0; seed < 200; seed++) {
      const state = initializeEventState();
      const ctx = makeContext({
        currentDay: 50,
        season: "spring",
        playerLevel: 10,
        rngSeed: seed,
      });
      const result = updateEvents(state, ctx);
      if (result.encounterTriggered) {
        triggered = true;
        expect(result.state.activeEncounter).not.toBeNull();
        expect(result.state.activeEncounter?.resolved).toBe(false);
        break;
      }
    }
    expect(triggered).toBe(true);
  });

  it("does not trigger encounters during cooldown", () => {
    const state: EventState = {
      ...initializeEventState(),
      lastEncounterDay: 48,
    };
    // Day 50 - 48 = 2 < 7 cooldown
    const ctx = makeContext({
      currentDay: 50,
      season: "spring",
      playerLevel: 10,
    });
    const result = updateEvents(state, ctx);
    expect(result.encounterTriggered).toBeNull();
  });

  it("respects minLevel gate", () => {
    // "ancient-spirit" requires minLevel 8, "lost-seedling" requires 5
    // At level 1, only "golden-rain" (minLevel 1) should be eligible in spring
    let anyTriggered = false;
    for (let seed = 0; seed < 500; seed++) {
      const state = initializeEventState();
      const ctx = makeContext({
        currentDay: 50,
        season: "spring",
        playerLevel: 1,
        rngSeed: seed,
      });
      const result = updateEvents(state, ctx);
      if (result.encounterTriggered) {
        anyTriggered = true;
        // At level 1, should never get encounters with minLevel > 1
        const enc = result.encounterTriggered;
        expect(enc.minLevel).toBeLessThanOrEqual(1);
      }
    }
    // golden-rain (spring, minLevel 1) should eventually trigger
    expect(anyTriggered).toBe(true);
  });

  it("respects season gate", () => {
    // "wandering-bees" is summer-only, "aurora-display" is winter-only
    // In spring, neither should appear
    for (let seed = 0; seed < 300; seed++) {
      const state = initializeEventState();
      const ctx = makeContext({
        currentDay: 50,
        season: "spring",
        playerLevel: 20,
        rngSeed: seed,
      });
      const result = updateEvents(state, ctx);
      if (result.encounterTriggered) {
        const enc = result.encounterTriggered;
        expect(enc.season === "any" || enc.season === "spring").toBe(true);
      }
    }
  });

  it("does not trigger encounter when one is already active", () => {
    const state: EventState = {
      ...initializeEventState(),
      activeEncounter: {
        definitionId: "golden-rain",
        day: 40,
        resolved: false,
      },
      lastEncounterDay: 40,
    };
    const ctx = makeContext({
      currentDay: 50,
      season: "spring",
      playerLevel: 10,
    });
    const result = updateEvents(state, ctx);
    // Should not trigger a new encounter
    expect(result.encounterTriggered).toBeNull();
    expect(result.state.activeEncounter?.definitionId).toBe("golden-rain");
  });

  it("clears resolved encounter before rolling new one", () => {
    const state: EventState = {
      ...initializeEventState(),
      activeEncounter: {
        definitionId: "golden-rain",
        day: 40,
        resolved: true,
      },
      lastEncounterDay: 40,
    };
    // Day 50 - 40 = 10 >= 7, cooldown satisfied
    const ctx = makeContext({
      currentDay: 50,
      season: "spring",
      playerLevel: 10,
    });
    const result = updateEvents(state, ctx);
    // The resolved encounter should be cleared
    // A new one may or may not trigger depending on RNG
    if (result.state.activeEncounter) {
      // If triggered, it should be a different encounter or same with new day
      expect(result.state.activeEncounter.resolved).toBe(false);
    }
  });
});

// ============================================
// Encounter cooldown (7 days)
// ============================================

describe("Encounter cooldown", () => {
  it("enforces 7-day minimum between encounters", () => {
    const state: EventState = {
      ...initializeEventState(),
      lastEncounterDay: 46,
    };
    // Day 50 - 46 = 4 < 7
    const ctx = makeContext({ currentDay: 50, season: "spring" });
    const result = updateEvents(state, ctx);
    expect(result.encounterTriggered).toBeNull();
  });

  it("allows encounter after exactly 7 days", () => {
    const state: EventState = {
      ...initializeEventState(),
      lastEncounterDay: 43,
    };
    // Day 50 - 43 = 7, should be allowed
    // Whether one actually triggers depends on RNG, but the check should pass
    let attempted = false;
    for (let seed = 0; seed < 500; seed++) {
      const ctx = makeContext({
        currentDay: 50,
        season: "spring",
        playerLevel: 10,
        rngSeed: seed,
      });
      const result = updateEvents(state, ctx);
      if (result.encounterTriggered) {
        attempted = true;
        break;
      }
    }
    expect(attempted).toBe(true);
  });
});

// ============================================
// resolveEncounter
// ============================================

describe("resolveEncounter", () => {
  it("marks the active encounter as resolved", () => {
    const state: EventState = {
      ...initializeEventState(),
      activeEncounter: {
        definitionId: "golden-rain",
        day: 5,
        resolved: false,
      },
    };
    const result = resolveEncounter(state, "golden-rain");
    expect(result.activeEncounter?.resolved).toBe(true);
    expect(result.resolvedEncounterIds).toContain("golden-rain");
  });

  it("returns same state if no active encounter", () => {
    const state = initializeEventState();
    const result = resolveEncounter(state, "golden-rain");
    expect(result).toBe(state);
  });

  it("returns same state if definitionId does not match", () => {
    const state: EventState = {
      ...initializeEventState(),
      activeEncounter: {
        definitionId: "golden-rain",
        day: 5,
        resolved: false,
      },
    };
    const result = resolveEncounter(state, "wandering-bees");
    expect(result).toBe(state);
  });

  it("adds encounter to resolvedEncounterIds", () => {
    const state: EventState = {
      ...initializeEventState(),
      activeEncounter: {
        definitionId: "mysterious-traveler",
        day: 10,
        resolved: false,
      },
      resolvedEncounterIds: ["golden-rain"],
    };
    const result = resolveEncounter(state, "mysterious-traveler");
    expect(result.resolvedEncounterIds).toEqual([
      "golden-rain",
      "mysterious-traveler",
    ]);
  });
});

// ============================================
// Growth/harvest boost getters
// ============================================

describe("getActiveFestivalGrowthBoost", () => {
  it("returns 1.0 when no festival is active", () => {
    const state = initializeEventState();
    expect(getActiveFestivalGrowthBoost(state)).toBe(1.0);
  });

  it("returns Spring Bloom growth boost (1.5)", () => {
    const state = initializeEventState();
    const result = updateEvents(
      state,
      makeContext({ currentDay: 5, season: "spring" }),
    );
    expect(getActiveFestivalGrowthBoost(result.state)).toBe(1.5);
  });

  it("returns Summer Solstice growth boost (1.0)", () => {
    const state = initializeEventState();
    const result = updateEvents(
      state,
      makeContext({ currentDay: 10, season: "summer" }),
    );
    expect(getActiveFestivalGrowthBoost(result.state)).toBe(1.0);
  });

  it("returns Harvest Moon growth boost (1.25)", () => {
    const state = initializeEventState();
    const result = updateEvents(
      state,
      makeContext({ currentDay: 8, season: "autumn" }),
    );
    expect(getActiveFestivalGrowthBoost(result.state)).toBe(1.25);
  });

  it("returns Frostweave growth boost (1.0)", () => {
    const state = initializeEventState();
    const result = updateEvents(
      state,
      makeContext({ currentDay: 12, season: "winter" }),
    );
    expect(getActiveFestivalGrowthBoost(result.state)).toBe(1.0);
  });
});

describe("getActiveFestivalHarvestBoost", () => {
  it("returns 1.0 when no festival is active", () => {
    const state = initializeEventState();
    expect(getActiveFestivalHarvestBoost(state)).toBe(1.0);
  });

  it("returns Spring Bloom harvest boost (1.0)", () => {
    const state = initializeEventState();
    const result = updateEvents(
      state,
      makeContext({ currentDay: 5, season: "spring" }),
    );
    expect(getActiveFestivalHarvestBoost(result.state)).toBe(1.0);
  });

  it("returns Summer Solstice harvest boost (2.0)", () => {
    const state = initializeEventState();
    const result = updateEvents(
      state,
      makeContext({ currentDay: 10, season: "summer" }),
    );
    expect(getActiveFestivalHarvestBoost(result.state)).toBe(2.0);
  });

  it("returns Harvest Moon harvest boost (1.75)", () => {
    const state = initializeEventState();
    const result = updateEvents(
      state,
      makeContext({ currentDay: 8, season: "autumn" }),
    );
    expect(getActiveFestivalHarvestBoost(result.state)).toBe(1.75);
  });

  it("returns Frostweave harvest boost (1.25)", () => {
    const state = initializeEventState();
    const result = updateEvents(
      state,
      makeContext({ currentDay: 12, season: "winter" }),
    );
    expect(getActiveFestivalHarvestBoost(result.state)).toBe(1.25);
  });
});

// ============================================
// State query helpers
// ============================================

describe("isFestivalActive", () => {
  it("returns false when no festival is active", () => {
    expect(isFestivalActive(initializeEventState())).toBe(false);
  });

  it("returns true when a festival is active", () => {
    const state = initializeEventState();
    const result = updateEvents(
      state,
      makeContext({ currentDay: 5, season: "spring" }),
    );
    expect(isFestivalActive(result.state)).toBe(true);
  });
});

describe("isEncounterPending", () => {
  it("returns false when no encounter is active", () => {
    expect(isEncounterPending(initializeEventState())).toBe(false);
  });

  it("returns true when an unresolved encounter is active", () => {
    const state: EventState = {
      ...initializeEventState(),
      activeEncounter: {
        definitionId: "golden-rain",
        day: 5,
        resolved: false,
      },
    };
    expect(isEncounterPending(state)).toBe(true);
  });

  it("returns false when encounter is resolved", () => {
    const state: EventState = {
      ...initializeEventState(),
      activeEncounter: {
        definitionId: "golden-rain",
        day: 5,
        resolved: true,
      },
    };
    expect(isEncounterPending(state)).toBe(false);
  });
});

// ============================================
// Data access helpers
// ============================================

describe("getFestivalDef", () => {
  it("returns festival definition by id", () => {
    const def = getFestivalDef("spring-bloom");
    expect(def).toBeDefined();
    expect(def?.name).toBe("Spring Bloom Festival");
    expect(def?.season).toBe("spring");
    expect(def?.triggerDay).toBe(5);
    expect(def?.durationDays).toBe(7);
  });

  it("returns undefined for unknown id", () => {
    expect(getFestivalDef("nonexistent")).toBeUndefined();
  });

  it("all four seasonal festivals are defined", () => {
    expect(getFestivalDef("spring-bloom")).toBeDefined();
    expect(getFestivalDef("summer-solstice")).toBeDefined();
    expect(getFestivalDef("autumn-harvest")).toBeDefined();
    expect(getFestivalDef("winter-frost")).toBeDefined();
  });
});

describe("getEncounterDef", () => {
  it("returns encounter definition by id", () => {
    const def = getEncounterDef("mysterious-traveler");
    expect(def).toBeDefined();
    expect(def?.name).toBe("Mysterious Traveler");
    expect(def?.season).toBe("any");
    expect(def?.minLevel).toBe(3);
  });

  it("returns undefined for unknown id", () => {
    expect(getEncounterDef("nonexistent")).toBeUndefined();
  });

  it("all six encounters are defined", () => {
    expect(getEncounterDef("mysterious-traveler")).toBeDefined();
    expect(getEncounterDef("golden-rain")).toBeDefined();
    expect(getEncounterDef("lost-seedling")).toBeDefined();
    expect(getEncounterDef("ancient-spirit")).toBeDefined();
    expect(getEncounterDef("wandering-bees")).toBeDefined();
    expect(getEncounterDef("aurora-display")).toBeDefined();
  });
});

// ============================================
// Deterministic RNG
// ============================================

describe("Deterministic encounter rolls", () => {
  it("same inputs produce same encounter result", () => {
    const state = initializeEventState();
    const ctx = makeContext({
      currentDay: 50,
      season: "spring",
      playerLevel: 10,
      rngSeed: 42,
    });

    const result1 = updateEvents(state, ctx);
    const result2 = updateEvents(state, ctx);

    expect(result1.encounterTriggered?.id).toBe(result2.encounterTriggered?.id);
  });

  it("different seeds can produce different encounter results", () => {
    const encounters = new Set<string | null>();
    for (let seed = 0; seed < 200; seed++) {
      const state = initializeEventState();
      const ctx = makeContext({
        currentDay: 50,
        season: "spring",
        playerLevel: 10,
        rngSeed: seed,
      });
      const result = updateEvents(state, ctx);
      encounters.add(result.encounterTriggered?.id ?? null);
    }
    // Should get at least a null (no trigger) and one encounter type
    expect(encounters.size).toBeGreaterThan(1);
  });
});

// ============================================
// Edge cases
// ============================================

describe("Edge cases", () => {
  it("simultaneous festival end and new festival trigger on same day", () => {
    // Set up a state where a festival just ended and another triggers the same day
    // This should not happen because of the 15-day cooldown
    const state: EventState = {
      ...initializeEventState(),
      activeFestival: {
        definitionId: "spring-bloom",
        startDay: 3,
        challenges: [],
        completed: false,
      },
    };
    // Spring Bloom ends at day 10 (3 + 7). Summer Solstice triggers on day 10 of summer.
    const result = updateEvents(
      state,
      makeContext({ currentDay: 10, season: "summer" }),
    );
    // Festival should have ended
    expect(result.festivalEnded).toBe("spring-bloom");
    // But new one should NOT start (cooldown: lastFestivalDay=10, 10-10=0 < 15)
    expect(result.festivalStarted).toBeNull();
  });

  it("handles state with unknown festival definition gracefully", () => {
    const state: EventState = {
      ...initializeEventState(),
      activeFestival: {
        definitionId: "nonexistent-festival",
        startDay: 1,
        challenges: [],
        completed: false,
      },
    };
    // Should not throw
    expect(getActiveFestivalGrowthBoost(state)).toBe(1.0);
    expect(getActiveFestivalHarvestBoost(state)).toBe(1.0);
  });

  it("updateEvents with no matching events returns unchanged active state", () => {
    const state = initializeEventState();
    const ctx = makeContext({ currentDay: 1, season: "spring", playerLevel: 1 });
    const result = updateEvents(state, ctx);
    // No festival triggers on day 1 of spring
    expect(result.festivalStarted).toBeNull();
    expect(result.festivalEnded).toBeNull();
    // Encounter may or may not trigger depending on RNG
  });

  it("festival with all challenges pre-completed stays completed", () => {
    const state: EventState = {
      ...initializeEventState(),
      activeFestival: {
        definitionId: "spring-bloom",
        startDay: 5,
        challenges: [
          {
            id: "bloom-plant-10",
            description: "Plant 10 trees",
            targetType: "plant",
            targetAmount: 10,
            currentProgress: 10,
            completed: true,
          },
          {
            id: "bloom-water-20",
            description: "Water 20 trees",
            targetType: "water",
            targetAmount: 20,
            currentProgress: 20,
            completed: true,
          },
          {
            id: "bloom-mature-3",
            description: "Grow 3 trees to Mature",
            targetType: "grow_mature",
            targetAmount: 3,
            currentProgress: 3,
            completed: true,
          },
        ],
        completed: true,
      },
    };
    // Advancing should not regress anything
    const result = advanceFestivalChallenge(state, "plant", 5);
    expect(result.activeFestival?.completed).toBe(true);
    const plant = result.activeFestival?.challenges.find(
      (c) => c.targetType === "plant",
    );
    expect(plant?.currentProgress).toBe(10); // unchanged
  });
});

// ============================================
// Full lifecycle integration
// ============================================

describe("Full lifecycle", () => {
  it("complete festival flow: start -> progress -> complete -> end", () => {
    // Start
    let state = initializeEventState();
    const started = updateEvents(
      state,
      makeContext({ currentDay: 5, season: "spring" }),
    );
    state = started.state;
    expect(started.festivalStarted?.id).toBe("spring-bloom");

    // Progress
    state = advanceFestivalChallenge(state, "plant", 10);
    state = advanceFestivalChallenge(state, "water", 20);
    state = advanceFestivalChallenge(state, "grow_mature", 3);
    expect(state.activeFestival?.completed).toBe(true);

    // End
    const ended = updateEvents(
      state,
      makeContext({ currentDay: 12, season: "spring" }),
    );
    state = ended.state;
    expect(ended.festivalEnded).toBe("spring-bloom");
    expect(state.completedFestivalIds).toContain("spring-bloom");
    expect(state.activeFestival).toBeNull();

    // Cooldown prevents immediate new festival
    const blocked = updateEvents(
      state,
      makeContext({ currentDay: 12, season: "winter" }),
    );
    expect(blocked.festivalStarted).toBeNull();
  });
});
