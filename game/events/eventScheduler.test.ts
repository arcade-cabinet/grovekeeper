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
} from "./eventScheduler";
import type { EventState } from "./types";

describe("eventScheduler", () => {
  describe("initializeEventState", () => {
    it("returns empty state with no active events", () => {
      const state = initializeEventState();
      expect(state.activeFestival).toBeNull();
      expect(state.activeEncounter).toBeNull();
      expect(state.completedFestivalIds).toEqual([]);
      expect(state.resolvedEncounterIds).toEqual([]);
    });

    it("sets negative cooldown days so first events can trigger immediately", () => {
      const state = initializeEventState();
      expect(state.lastFestivalDay).toBeLessThan(0);
      expect(state.lastEncounterDay).toBeLessThan(0);
    });
  });

  describe("getFestivalDef / getEncounterDef", () => {
    it("returns the spring-bloom festival definition", () => {
      const def = getFestivalDef("spring-bloom");
      expect(def).toBeDefined();
      expect(def!.name).toBe("Spring Bloom Festival");
      expect(def!.season).toBe("spring");
    });

    it("returns undefined for unknown festival ID", () => {
      expect(getFestivalDef("nonexistent")).toBeUndefined();
    });

    it("returns the mysterious-traveler encounter definition", () => {
      const def = getEncounterDef("mysterious-traveler");
      expect(def).toBeDefined();
      expect(def!.minLevel).toBe(3);
    });

    it("returns undefined for unknown encounter ID", () => {
      expect(getEncounterDef("nonexistent")).toBeUndefined();
    });
  });

  describe("updateEvents -- festival lifecycle", () => {
    it("starts a festival when season and day match", () => {
      const state = initializeEventState();
      const result = updateEvents(state, {
        currentDay: 5,
        season: "spring",
        playerLevel: 1,
        rngSeed: 42,
      });

      expect(result.festivalStarted).not.toBeNull();
      expect(result.festivalStarted!.id).toBe("spring-bloom");
      expect(result.state.activeFestival).not.toBeNull();
      expect(result.state.activeFestival!.definitionId).toBe("spring-bloom");
      expect(result.state.activeFestival!.startDay).toBe(5);
    });

    it("does not start a festival when day does not match trigger", () => {
      const state = initializeEventState();
      const result = updateEvents(state, {
        currentDay: 3,
        season: "spring",
        playerLevel: 1,
        rngSeed: 42,
      });
      expect(result.festivalStarted).toBeNull();
      expect(result.state.activeFestival).toBeNull();
    });

    it("does not start a festival when season does not match", () => {
      const state = initializeEventState();
      const result = updateEvents(state, {
        currentDay: 5,
        season: "winter",
        playerLevel: 1,
        rngSeed: 42,
      });
      // spring-bloom triggers on day 5 spring, should not trigger in winter
      expect(result.festivalStarted).toBeNull();
    });

    it("ends a festival after its duration expires", () => {
      const state = initializeEventState();
      // Start the spring bloom (day 5, duration 7)
      const started = updateEvents(state, {
        currentDay: 5,
        season: "spring",
        playerLevel: 1,
        rngSeed: 42,
      });
      expect(started.state.activeFestival).not.toBeNull();

      // Advance to day 12 (5 + 7 = 12, exactly at end)
      const ended = updateEvents(started.state, {
        currentDay: 12,
        season: "spring",
        playerLevel: 1,
        rngSeed: 42,
      });
      expect(ended.festivalEnded).toBe("spring-bloom");
      expect(ended.state.activeFestival).toBeNull();
    });

    it("adds completed festival to completedFestivalIds when all challenges done", () => {
      const state = initializeEventState();
      const started = updateEvents(state, {
        currentDay: 5,
        season: "spring",
        playerLevel: 1,
        rngSeed: 42,
      });

      // Mark all challenges complete
      let s = started.state;
      s = advanceFestivalChallenge(s, "plant", 10);
      s = advanceFestivalChallenge(s, "water", 20);
      s = advanceFestivalChallenge(s, "grow_mature", 3);
      expect(s.activeFestival!.completed).toBe(true);

      // Now end the festival
      const ended = updateEvents(s, {
        currentDay: 12,
        season: "spring",
        playerLevel: 1,
        rngSeed: 42,
      });
      expect(ended.state.completedFestivalIds).toContain("spring-bloom");
    });

    it("does not add to completedFestivalIds if festival challenges were not finished", () => {
      const state = initializeEventState();
      const started = updateEvents(state, {
        currentDay: 5,
        season: "spring",
        playerLevel: 1,
        rngSeed: 42,
      });

      // End without completing challenges
      const ended = updateEvents(started.state, {
        currentDay: 12,
        season: "spring",
        playerLevel: 1,
        rngSeed: 42,
      });
      expect(ended.state.completedFestivalIds).not.toContain("spring-bloom");
    });

    it("initializes festival challenges with zero progress", () => {
      const state = initializeEventState();
      const result = updateEvents(state, {
        currentDay: 5,
        season: "spring",
        playerLevel: 1,
        rngSeed: 42,
      });
      const challenges = result.state.activeFestival!.challenges;
      expect(challenges.length).toBe(3);
      for (const c of challenges) {
        expect(c.currentProgress).toBe(0);
        expect(c.completed).toBe(false);
      }
    });
  });

  describe("advanceFestivalChallenge", () => {
    function stateWithFestival(): EventState {
      const state = initializeEventState();
      const result = updateEvents(state, {
        currentDay: 5,
        season: "spring",
        playerLevel: 1,
        rngSeed: 42,
      });
      return result.state;
    }

    it("increments progress for matching challenge type", () => {
      const state = stateWithFestival();
      const updated = advanceFestivalChallenge(state, "plant", 3);
      const plantChallenge = updated.activeFestival!.challenges.find(
        (c) => c.targetType === "plant",
      );
      expect(plantChallenge!.currentProgress).toBe(3);
    });

    it("does not exceed target amount", () => {
      const state = stateWithFestival();
      const updated = advanceFestivalChallenge(state, "plant", 100);
      const plantChallenge = updated.activeFestival!.challenges.find(
        (c) => c.targetType === "plant",
      );
      expect(plantChallenge!.currentProgress).toBe(10); // target is 10
      expect(plantChallenge!.completed).toBe(true);
    });

    it("marks challenge completed when target is met", () => {
      const state = stateWithFestival();
      const updated = advanceFestivalChallenge(state, "plant", 10);
      const plantChallenge = updated.activeFestival!.challenges.find(
        (c) => c.targetType === "plant",
      );
      expect(plantChallenge!.completed).toBe(true);
    });

    it("marks festival completed when all challenges are done", () => {
      let state = stateWithFestival();
      state = advanceFestivalChallenge(state, "plant", 10);
      state = advanceFestivalChallenge(state, "water", 20);
      state = advanceFestivalChallenge(state, "grow_mature", 3);
      expect(state.activeFestival!.completed).toBe(true);
    });

    it("returns same state when no active festival", () => {
      const state = initializeEventState();
      const result = advanceFestivalChallenge(state, "plant", 5);
      expect(result).toBe(state);
    });

    it("does not advance already completed challenges", () => {
      let state = stateWithFestival();
      state = advanceFestivalChallenge(state, "plant", 10);
      const before = state.activeFestival!.challenges.find(
        (c) => c.targetType === "plant",
      );
      expect(before!.completed).toBe(true);

      state = advanceFestivalChallenge(state, "plant", 5);
      const after = state.activeFestival!.challenges.find(
        (c) => c.targetType === "plant",
      );
      expect(after!.currentProgress).toBe(10);
    });
  });

  describe("resolveEncounter", () => {
    it("marks encounter as resolved and adds to resolvedEncounterIds", () => {
      const state: EventState = {
        ...initializeEventState(),
        activeEncounter: {
          definitionId: "mysterious-traveler",
          day: 10,
          resolved: false,
        },
      };

      const result = resolveEncounter(state, "mysterious-traveler");
      expect(result.activeEncounter!.resolved).toBe(true);
      expect(result.resolvedEncounterIds).toContain("mysterious-traveler");
    });

    it("returns same state when no active encounter", () => {
      const state = initializeEventState();
      const result = resolveEncounter(state, "mysterious-traveler");
      expect(result).toBe(state);
    });

    it("returns same state when definitionId does not match", () => {
      const state: EventState = {
        ...initializeEventState(),
        activeEncounter: {
          definitionId: "mysterious-traveler",
          day: 10,
          resolved: false,
        },
      };
      const result = resolveEncounter(state, "golden-rain");
      expect(result).toBe(state);
    });
  });

  describe("boost getters", () => {
    it("returns 1.0 growth boost when no festival active", () => {
      const state = initializeEventState();
      expect(getActiveFestivalGrowthBoost(state)).toBe(1.0);
    });

    it("returns festival growth boost when festival is active", () => {
      const state = initializeEventState();
      const result = updateEvents(state, {
        currentDay: 5,
        season: "spring",
        playerLevel: 1,
        rngSeed: 42,
      });
      // spring-bloom has growthBoost: 1.5
      expect(getActiveFestivalGrowthBoost(result.state)).toBe(1.5);
    });

    it("returns 1.0 harvest boost when no festival active", () => {
      const state = initializeEventState();
      expect(getActiveFestivalHarvestBoost(state)).toBe(1.0);
    });

    it("returns festival harvest boost when festival is active", () => {
      const state = initializeEventState();
      // summer-solstice has harvestBoost: 2.0, triggers on day 10 summer
      const result = updateEvents(state, {
        currentDay: 10,
        season: "summer",
        playerLevel: 1,
        rngSeed: 42,
      });
      expect(getActiveFestivalHarvestBoost(result.state)).toBe(2.0);
    });
  });

  describe("state queries", () => {
    it("isFestivalActive returns false with no festival", () => {
      expect(isFestivalActive(initializeEventState())).toBe(false);
    });

    it("isFestivalActive returns true with active festival", () => {
      const state = initializeEventState();
      const result = updateEvents(state, {
        currentDay: 5,
        season: "spring",
        playerLevel: 1,
        rngSeed: 42,
      });
      expect(isFestivalActive(result.state)).toBe(true);
    });

    it("isEncounterPending returns false with no encounter", () => {
      expect(isEncounterPending(initializeEventState())).toBe(false);
    });

    it("isEncounterPending returns true with unresolved encounter", () => {
      const state: EventState = {
        ...initializeEventState(),
        activeEncounter: {
          definitionId: "test",
          day: 1,
          resolved: false,
        },
      };
      expect(isEncounterPending(state)).toBe(true);
    });

    it("isEncounterPending returns false when encounter is resolved", () => {
      const state: EventState = {
        ...initializeEventState(),
        activeEncounter: {
          definitionId: "test",
          day: 1,
          resolved: true,
        },
      };
      expect(isEncounterPending(state)).toBe(false);
    });
  });
});
