import { describe, expect, it } from "vitest";
import type { MarketEventState } from "./marketEvents";
import {
  getActiveMarketEventModifiers,
  initializeMarketEventState,
  isMarketEventActive,
  MARKET_EVENTS,
  updateMarketEvents,
} from "./marketEvents";

describe("marketEvents", () => {
  describe("MARKET_EVENTS", () => {
    it("defines exactly 6 events", () => {
      expect(MARKET_EVENTS).toHaveLength(6);
    });

    it("all events have required fields", () => {
      for (const event of MARKET_EVENTS) {
        expect(event.id).toBeTruthy();
        expect(event.name).toBeTruthy();
        expect(event.icon).toBeTruthy();
        expect(event.description).toBeTruthy();
        expect(event.durationDays).toBeGreaterThan(0);
        expect(Object.keys(event.effects).length).toBeGreaterThan(0);
      }
    });

    it("timber-boom doubles timber price for 5 days", () => {
      const event = MARKET_EVENTS.find((e) => e.id === "timber-boom");
      expect(event).toBeDefined();
      expect(event!.durationDays).toBe(5);
      expect(event!.effects.timber).toBe(2.0);
    });

    it("sap-shortage multiplies sap by 2.5 for 4 days", () => {
      const event = MARKET_EVENTS.find((e) => e.id === "sap-shortage");
      expect(event).toBeDefined();
      expect(event!.durationDays).toBe(4);
      expect(event!.effects.sap).toBe(2.5);
    });

    it("merchant-holiday reduces all prices for 5 days", () => {
      const event = MARKET_EVENTS.find((e) => e.id === "merchant-holiday");
      expect(event).toBeDefined();
      expect(event!.durationDays).toBe(5);
      expect(event!.effects.timber).toBe(0.7);
      expect(event!.effects.sap).toBe(0.7);
      expect(event!.effects.fruit).toBe(0.7);
      expect(event!.effects.acorns).toBe(0.7);
    });
  });

  describe("initializeMarketEventState", () => {
    it("starts with no active event", () => {
      const state = initializeMarketEventState();
      expect(state.activeEvent).toBeNull();
      expect(state.eventHistory).toEqual([]);
    });

    it("sets lastEventDay so first event can trigger immediately", () => {
      const state = initializeMarketEventState();
      // lastEventDay should be -10 (negative cooldown) so cooldown is already elapsed at day 0
      expect(state.lastEventDay).toBeLessThanOrEqual(0);
    });
  });

  describe("isMarketEventActive", () => {
    it("returns false when no event is active", () => {
      const state = initializeMarketEventState();
      expect(isMarketEventActive(state, 5)).toBe(false);
    });

    it("returns true during an active event", () => {
      const state: MarketEventState = {
        activeEvent: { definitionId: "timber-boom", startDay: 10 },
        eventHistory: [{ id: "timber-boom", day: 10 }],
        lastEventDay: 10,
      };
      // timber-boom lasts 5 days: day 10, 11, 12, 13, 14
      expect(isMarketEventActive(state, 10)).toBe(true);
      expect(isMarketEventActive(state, 14)).toBe(true);
    });

    it("returns false after event expires", () => {
      const state: MarketEventState = {
        activeEvent: { definitionId: "timber-boom", startDay: 10 },
        eventHistory: [{ id: "timber-boom", day: 10 }],
        lastEventDay: 10,
      };
      // timber-boom lasts 5 days, expires at day 15
      expect(isMarketEventActive(state, 15)).toBe(false);
      expect(isMarketEventActive(state, 20)).toBe(false);
    });

    it("returns false for unknown event id", () => {
      const state: MarketEventState = {
        activeEvent: { definitionId: "nonexistent", startDay: 10 },
        eventHistory: [],
        lastEventDay: 10,
      };
      expect(isMarketEventActive(state, 10)).toBe(false);
    });
  });

  describe("getActiveMarketEventModifiers", () => {
    it("returns empty object when no event is active", () => {
      const state = initializeMarketEventState();
      const mods = getActiveMarketEventModifiers(state, 5);
      expect(mods).toEqual({});
    });

    it("returns correct modifiers for active event", () => {
      const state: MarketEventState = {
        activeEvent: { definitionId: "rare-influx", startDay: 10 },
        eventHistory: [{ id: "rare-influx", day: 10 }],
        lastEventDay: 10,
      };
      const mods = getActiveMarketEventModifiers(state, 12);
      expect(mods.timber).toBe(1.5);
      expect(mods.sap).toBe(1.5);
      expect(mods.fruit).toBe(1.5);
      expect(mods.acorns).toBe(1.5);
    });

    it("returns empty object after event expires", () => {
      const state: MarketEventState = {
        activeEvent: { definitionId: "acorn-rush", startDay: 10 },
        eventHistory: [{ id: "acorn-rush", day: 10 }],
        lastEventDay: 10,
      };
      // acorn-rush lasts 3 days, expires at day 13
      const mods = getActiveMarketEventModifiers(state, 13);
      expect(mods).toEqual({});
    });
  });

  describe("updateMarketEvents", () => {
    it("does not trigger events during cooldown", () => {
      const state: MarketEventState = {
        activeEvent: null,
        eventHistory: [{ id: "timber-boom", day: 5 }],
        lastEventDay: 5,
      };
      // Cooldown is 10 days. Day 10 is still within cooldown.
      const result = updateMarketEvents(state, 10, "test-seed");
      expect(result.newEventTriggered).toBe(false);
      expect(result.state.activeEvent).toBeNull();
    });

    it("expires an active event when duration is reached", () => {
      const state: MarketEventState = {
        activeEvent: { definitionId: "acorn-rush", startDay: 10 },
        eventHistory: [{ id: "acorn-rush", day: 10 }],
        lastEventDay: 10,
      };
      // acorn-rush lasts 3 days, expires at day 13
      const result = updateMarketEvents(state, 13, "test-seed");
      expect(result.eventExpired).toBe(true);
      expect(result.state.activeEvent).toBeNull();
    });

    it("does not expire an active event before its duration", () => {
      const state: MarketEventState = {
        activeEvent: { definitionId: "timber-boom", startDay: 10 },
        eventHistory: [{ id: "timber-boom", day: 10 }],
        lastEventDay: 10,
      };
      // timber-boom lasts 5 days, still active at day 14
      const result = updateMarketEvents(state, 14, "test-seed");
      expect(result.eventExpired).toBe(false);
      expect(result.state.activeEvent).not.toBeNull();
    });

    it("does not trigger a new event while one is active", () => {
      const state: MarketEventState = {
        activeEvent: { definitionId: "timber-boom", startDay: 10 },
        eventHistory: [{ id: "timber-boom", day: 10 }],
        lastEventDay: 10,
      };
      const result = updateMarketEvents(state, 12, "test-seed");
      expect(result.newEventTriggered).toBe(false);
      expect(result.state.activeEvent!.definitionId).toBe("timber-boom");
    });

    it("triggers event deterministically based on seed", () => {
      // Run many attempts with different seeds to verify some trigger and some don't
      const state = initializeMarketEventState();
      let triggered = 0;
      const totalAttempts = 100;

      for (let i = 0; i < totalAttempts; i++) {
        // Day 100 ensures cooldown is always satisfied
        const result = updateMarketEvents(state, 100, `seed-${i}`);
        if (result.newEventTriggered) {
          triggered++;
          // Verify the event is a valid market event
          const eventId = result.state.activeEvent!.definitionId;
          const eventDef = MARKET_EVENTS.find((e) => e.id === eventId);
          expect(eventDef).toBeDefined();
        }
      }

      // With 15% chance, we expect roughly 15 triggers out of 100
      // Allow a wide range for randomness
      expect(triggered).toBeGreaterThan(0);
      expect(triggered).toBeLessThan(totalAttempts);
    });

    it("produces same result for same seed and day", () => {
      const state = initializeMarketEventState();
      const result1 = updateMarketEvents(state, 100, "deterministic-seed");
      const result2 = updateMarketEvents(state, 100, "deterministic-seed");

      expect(result1.newEventTriggered).toBe(result2.newEventTriggered);
      if (result1.newEventTriggered) {
        expect(result1.state.activeEvent!.definitionId).toBe(
          result2.state.activeEvent!.definitionId,
        );
      }
    });

    it("adds triggered event to history", () => {
      // Find a seed that triggers an event at day 100
      const baseState = initializeMarketEventState();
      let triggeringSeed = "";

      for (let i = 0; i < 200; i++) {
        const seed = `find-trigger-${i}`;
        const result = updateMarketEvents(baseState, 100, seed);
        if (result.newEventTriggered) {
          triggeringSeed = seed;
          break;
        }
      }

      // If no seed triggered, skip (very unlikely with 200 attempts at 15%)
      if (!triggeringSeed) return;

      const result = updateMarketEvents(baseState, 100, triggeringSeed);
      expect(result.state.eventHistory.length).toBeGreaterThan(0);
      const last =
        result.state.eventHistory[result.state.eventHistory.length - 1];
      expect(last.day).toBe(100);
      expect(last.id).toBe(result.state.activeEvent!.definitionId);
    });
  });
});
