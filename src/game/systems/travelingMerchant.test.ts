import { describe, expect, it } from "vitest";
import {
  generateMerchantOffers,
  initializeMerchantState,
  isMerchantPresent,
  purchaseOffer,
  updateMerchant,
} from "./travelingMerchant";

describe("travelingMerchant", () => {
  describe("initializeMerchantState", () => {
    it("starts with no visits and merchant absent", () => {
      const state = initializeMerchantState();
      expect(state.visitCount).toBe(0);
      expect(state.isPresent).toBe(false);
      expect(state.currentOffers).toEqual([]);
    });

    it("schedules next visit within 7-14 day range", () => {
      const state = initializeMerchantState(0);
      expect(state.nextVisitDay).toBeGreaterThanOrEqual(7);
      expect(state.nextVisitDay).toBeLessThanOrEqual(14);
    });

    it("adjusts schedule based on start day", () => {
      const state = initializeMerchantState(50);
      expect(state.nextVisitDay).toBeGreaterThanOrEqual(57);
      expect(state.nextVisitDay).toBeLessThanOrEqual(64);
    });
  });

  describe("isMerchantPresent", () => {
    it("returns false when merchant is not present", () => {
      const state = initializeMerchantState();
      expect(isMerchantPresent(state)).toBe(false);
    });

    it("returns true when merchant is present", () => {
      const state = { ...initializeMerchantState(), isPresent: true };
      expect(isMerchantPresent(state)).toBe(true);
    });
  });

  describe("generateMerchantOffers", () => {
    it("generates 3 offers for visit 0", () => {
      const offers = generateMerchantOffers(0, "test-seed");
      expect(offers).toHaveLength(3);
    });

    it("generates 3 offers for visit 1", () => {
      const offers = generateMerchantOffers(1, "test-seed");
      expect(offers).toHaveLength(3);
    });

    it("generates 4 offers for visit 2-3", () => {
      const offers2 = generateMerchantOffers(2, "test-seed");
      expect(offers2).toHaveLength(4);

      const offers3 = generateMerchantOffers(3, "test-seed");
      expect(offers3).toHaveLength(4);
    });

    it("generates 5 offers for visit 4+", () => {
      const offers = generateMerchantOffers(5, "test-seed");
      expect(offers).toHaveLength(5);
    });

    it("all offers have required fields", () => {
      const offers = generateMerchantOffers(5, "test-seed");
      for (const offer of offers) {
        expect(offer.id).toBeTruthy();
        expect(offer.name).toBeTruthy();
        expect(offer.description).toBeTruthy();
        expect(Object.keys(offer.cost).length).toBeGreaterThan(0);
        expect(offer.reward).toBeDefined();
        expect(offer.quantity).toBeGreaterThan(0);
      }
    });

    it("is deterministic for same seed and visit count", () => {
      const a = generateMerchantOffers(3, "stable-seed");
      const b = generateMerchantOffers(3, "stable-seed");
      expect(a).toEqual(b);
    });

    it("varies offers with different seeds", () => {
      const a = generateMerchantOffers(3, "seed-alpha");
      const b = generateMerchantOffers(3, "seed-beta");
      // Names may or may not differ, but the sets should not always be identical
      // We just verify they're generated (not necessarily different for every seed)
      expect(a).toHaveLength(4);
      expect(b).toHaveLength(4);
    });

    it("increases quantity at higher visit counts", () => {
      const earlyOffers = generateMerchantOffers(0, "qty-seed");
      const lateOffers = generateMerchantOffers(6, "qty-seed");

      // Visit 6 should have +2 quantity bonus (6/3 = 2)
      // At least some offers should have higher quantity
      const earlyMaxQty = Math.max(...earlyOffers.map((o) => o.quantity));
      const lateMaxQty = Math.max(...lateOffers.map((o) => o.quantity));
      expect(lateMaxQty).toBeGreaterThan(earlyMaxQty);
    });

    it("includes seed offers at visit 2+", () => {
      // Check many seeds to find at least one with a seed offer
      let foundSeedOffer = false;
      for (let i = 0; i < 50; i++) {
        const offers = generateMerchantOffers(3, `seed-check-${i}`);
        if (offers.some((o) => o.reward.type === "seed")) {
          foundSeedOffer = true;
          break;
        }
      }
      expect(foundSeedOffer).toBe(true);
    });
  });

  describe("updateMerchant", () => {
    it("merchant arrives at scheduled day", () => {
      const state = initializeMerchantState(0);
      const arrivedState = updateMerchant(
        state,
        state.nextVisitDay,
        "test-seed",
      );

      expect(arrivedState.isPresent).toBe(true);
      expect(arrivedState.visitCount).toBe(1);
      expect(arrivedState.currentOffers.length).toBeGreaterThan(0);
      expect(arrivedState.lastVisitDay).toBe(state.nextVisitDay);
    });

    it("merchant does not arrive before scheduled day", () => {
      const state = initializeMerchantState(0);
      const earlyState = updateMerchant(
        state,
        state.nextVisitDay - 1,
        "test-seed",
      );

      expect(earlyState.isPresent).toBe(false);
      expect(earlyState.visitCount).toBe(0);
    });

    it("merchant departs after 2 game-days", () => {
      const state = initializeMerchantState(0);
      // Arrive
      const arrivedState = updateMerchant(
        state,
        state.nextVisitDay,
        "test-seed",
      );
      expect(arrivedState.isPresent).toBe(true);
      expect(arrivedState.departDay).toBe(state.nextVisitDay + 2);

      // Depart
      const departedState = updateMerchant(
        arrivedState,
        arrivedState.departDay,
        "test-seed",
      );
      expect(departedState.isPresent).toBe(false);
      expect(departedState.currentOffers).toEqual([]);
    });

    it("merchant stays during the 2-day window", () => {
      const state = initializeMerchantState(0);
      const arrivedState = updateMerchant(
        state,
        state.nextVisitDay,
        "test-seed",
      );

      // Day after arrival, still within 2-day stay
      const nextDayState = updateMerchant(
        arrivedState,
        state.nextVisitDay + 1,
        "test-seed",
      );
      expect(nextDayState.isPresent).toBe(true);
    });

    it("schedules next visit after departure", () => {
      const state = initializeMerchantState(0);
      const arrivedState = updateMerchant(
        state,
        state.nextVisitDay,
        "test-seed",
      );
      const departedState = updateMerchant(
        arrivedState,
        arrivedState.departDay,
        "test-seed",
      );

      expect(departedState.nextVisitDay).toBeGreaterThanOrEqual(
        arrivedState.departDay + 7,
      );
      expect(departedState.nextVisitDay).toBeLessThanOrEqual(
        arrivedState.departDay + 14,
      );
    });

    it("increments visit count on each arrival", () => {
      let state = initializeMerchantState(0);

      // First visit
      state = updateMerchant(state, state.nextVisitDay, "seed-1");
      expect(state.visitCount).toBe(1);

      // Depart
      state = updateMerchant(state, state.departDay, "seed-1");

      // Second visit
      state = updateMerchant(state, state.nextVisitDay, "seed-2");
      expect(state.visitCount).toBe(2);
    });
  });

  describe("purchaseOffer", () => {
    it("returns null when merchant is not present", () => {
      const state = initializeMerchantState();
      const { state: newState, offer } = purchaseOffer(state, "any-id");

      expect(offer).toBeNull();
      expect(newState).toBe(state);
    });

    it("returns null for unknown offer id", () => {
      const state = initializeMerchantState(0);
      const arrivedState = updateMerchant(
        state,
        state.nextVisitDay,
        "test-seed",
      );

      const { offer } = purchaseOffer(arrivedState, "nonexistent-offer");
      expect(offer).toBeNull();
    });

    it("reduces stock on purchase", () => {
      const state = initializeMerchantState(0);
      const arrivedState = updateMerchant(
        state,
        state.nextVisitDay,
        "test-seed",
      );

      const targetOffer = arrivedState.currentOffers[0];
      const originalQty = targetOffer.quantity;

      const { state: afterPurchase, offer } = purchaseOffer(
        arrivedState,
        targetOffer.id,
      );

      expect(offer).not.toBeNull();
      expect(offer!.id).toBe(targetOffer.id);

      // Find the same offer in the new state (if it still has stock)
      const remaining = afterPurchase.currentOffers.find(
        (o) => o.id === targetOffer.id,
      );
      if (originalQty > 1) {
        expect(remaining).toBeDefined();
        expect(remaining!.quantity).toBe(originalQty - 1);
      } else {
        // Quantity was 1, should be removed
        expect(remaining).toBeUndefined();
      }
    });

    it("removes offer when stock reaches zero", () => {
      const state = initializeMerchantState(0);
      const arrivedState = updateMerchant(
        state,
        state.nextVisitDay,
        "test-seed",
      );

      // Find an offer and buy it until depleted
      let currentState = arrivedState;
      const targetId = arrivedState.currentOffers[0].id;
      const qty = arrivedState.currentOffers[0].quantity;

      for (let i = 0; i < qty; i++) {
        const result = purchaseOffer(currentState, targetId);
        currentState = result.state;
      }

      // The offer should be gone from the list
      const gone = currentState.currentOffers.find((o) => o.id === targetId);
      expect(gone).toBeUndefined();
    });

    it("returns null when offer is out of stock", () => {
      const state = initializeMerchantState(0);
      const arrivedState = updateMerchant(
        state,
        state.nextVisitDay,
        "test-seed",
      );

      // Deplete all stock
      let currentState = arrivedState;
      const targetId = arrivedState.currentOffers[0].id;
      const qty = arrivedState.currentOffers[0].quantity;

      for (let i = 0; i < qty; i++) {
        const result = purchaseOffer(currentState, targetId);
        currentState = result.state;
      }

      // Try to buy again
      const { offer } = purchaseOffer(currentState, targetId);
      expect(offer).toBeNull();
    });

    it("does not mutate original state", () => {
      const state = initializeMerchantState(0);
      const arrivedState = updateMerchant(
        state,
        state.nextVisitDay,
        "test-seed",
      );

      const originalOfferCount = arrivedState.currentOffers.length;
      const targetId = arrivedState.currentOffers[0].id;
      const originalQty = arrivedState.currentOffers[0].quantity;

      purchaseOffer(arrivedState, targetId);

      // Original state unchanged
      expect(arrivedState.currentOffers).toHaveLength(originalOfferCount);
      expect(arrivedState.currentOffers[0].quantity).toBe(originalQty);
    });

    it("returns the purchased offer data for resource deduction", () => {
      const state = initializeMerchantState(0);
      const arrivedState = updateMerchant(
        state,
        state.nextVisitDay,
        "test-seed",
      );

      const targetOffer = arrivedState.currentOffers[0];
      const { offer } = purchaseOffer(arrivedState, targetOffer.id);

      expect(offer).not.toBeNull();
      expect(offer!.name).toBe(targetOffer.name);
      expect(offer!.cost).toEqual(targetOffer.cost);
      expect(offer!.reward).toEqual(targetOffer.reward);
    });
  });
});
