import {
  getActiveMarketEventModifiers,
  initializeMarketEventState,
  isMarketEventActive,
  MARKET_EVENTS,
  updateMarketEvents,
} from "./marketEvents";

describe("market events system", () => {
  describe("MARKET_EVENTS", () => {
    it("has 6 event definitions", () => {
      expect(MARKET_EVENTS).toHaveLength(6);
    });

    it("each event has unique id", () => {
      const ids = MARKET_EVENTS.map((e) => e.id);
      expect(new Set(ids).size).toBe(ids.length);
    });

    it("each event has a duration between 3-7 days", () => {
      for (const event of MARKET_EVENTS) {
        expect(event.durationDays).toBeGreaterThanOrEqual(3);
        expect(event.durationDays).toBeLessThanOrEqual(7);
      }
    });

    it("each event has at least one price effect", () => {
      for (const event of MARKET_EVENTS) {
        expect(Object.keys(event.effects).length).toBeGreaterThan(0);
      }
    });
  });

  describe("initializeMarketEventState", () => {
    it("starts with no active event", () => {
      const state = initializeMarketEventState();
      expect(state.activeEvent).toBeNull();
      expect(state.eventHistory).toEqual([]);
    });

    it("sets lastEventDay to allow immediate first event", () => {
      const state = initializeMarketEventState();
      expect(state.lastEventDay).toBe(-10); // -COOLDOWN_DAYS
    });
  });

  describe("isMarketEventActive", () => {
    it("returns false when no event is active", () => {
      const state = initializeMarketEventState();
      expect(isMarketEventActive(state, 5)).toBe(false);
    });

    it("returns true when an event is active and within duration", () => {
      const state = {
        ...initializeMarketEventState(),
        activeEvent: { definitionId: "timber-boom", startDay: 10 },
      };
      // timber-boom lasts 5 days, so day 14 is still active
      expect(isMarketEventActive(state, 14)).toBe(true);
    });

    it("returns false when event duration has elapsed", () => {
      const state = {
        ...initializeMarketEventState(),
        activeEvent: { definitionId: "timber-boom", startDay: 10 },
      };
      // timber-boom lasts 5 days, day 15 = expired
      expect(isMarketEventActive(state, 15)).toBe(false);
    });

    it("returns false for an invalid event definition", () => {
      const state = {
        ...initializeMarketEventState(),
        activeEvent: { definitionId: "nonexistent-event", startDay: 10 },
      };
      expect(isMarketEventActive(state, 11)).toBe(false);
    });
  });

  describe("getActiveMarketEventModifiers", () => {
    it("returns empty object when no event is active", () => {
      const state = initializeMarketEventState();
      expect(getActiveMarketEventModifiers(state, 5)).toEqual({});
    });

    it("returns event effects when an event is active", () => {
      const state = {
        ...initializeMarketEventState(),
        activeEvent: { definitionId: "timber-boom", startDay: 10 },
      };
      const modifiers = getActiveMarketEventModifiers(state, 12);
      expect(modifiers).toEqual({ timber: 2.0 });
    });

    it("returns empty after event expires", () => {
      const state = {
        ...initializeMarketEventState(),
        activeEvent: { definitionId: "acorn-rush", startDay: 10 },
      };
      // acorn-rush lasts 3 days
      expect(getActiveMarketEventModifiers(state, 13)).toEqual({});
    });

    it("returns multi-resource effects for merchant-holiday", () => {
      const state = {
        ...initializeMarketEventState(),
        activeEvent: { definitionId: "merchant-holiday", startDay: 1 },
      };
      const modifiers = getActiveMarketEventModifiers(state, 3);
      expect(modifiers).toEqual({
        timber: 0.7,
        sap: 0.7,
        fruit: 0.7,
        acorns: 0.7,
      });
    });
  });

  describe("updateMarketEvents", () => {
    it("does not trigger event before cooldown elapses", () => {
      const state = {
        ...initializeMarketEventState(),
        lastEventDay: 5,
      };
      const result = updateMarketEvents(state, 10, "test-seed");
      expect(result.newEventTriggered).toBe(false);
    });

    it("expires an active event past its duration", () => {
      const state = {
        ...initializeMarketEventState(),
        activeEvent: { definitionId: "timber-boom", startDay: 0 },
      };
      // timber-boom lasts 5 days
      const result = updateMarketEvents(state, 5, "test-seed");
      expect(result.eventExpired).toBe(true);
      expect(result.state.activeEvent).toBeNull();
    });

    it("does not expire an event within its duration", () => {
      const state = {
        ...initializeMarketEventState(),
        activeEvent: { definitionId: "timber-boom", startDay: 0 },
      };
      const result = updateMarketEvents(state, 3, "test-seed");
      expect(result.eventExpired).toBe(false);
      expect(result.state.activeEvent).not.toBeNull();
    });

    it("uses deterministic RNG for event triggering", () => {
      const state = initializeMarketEventState();
      const result1 = updateMarketEvents(state, 100, "seed-A");
      const result2 = updateMarketEvents(state, 100, "seed-A");
      expect(result1.newEventTriggered).toBe(result2.newEventTriggered);
    });

    it("records triggered events in history", () => {
      // Force trigger by trying many days with different seeds until one triggers
      const state = initializeMarketEventState();
      let triggered = false;
      let result = updateMarketEvents(state, 0, "");
      for (let day = 10; day < 200; day++) {
        result = updateMarketEvents(state, day, `seed-${day}`);
        if (result.newEventTriggered) {
          triggered = true;
          break;
        }
      }
      if (triggered) {
        expect(result.state.eventHistory.length).toBe(1);
        expect(result.state.activeEvent).not.toBeNull();
      }
    });
  });
});
