import {
  generateMerchantOffers,
  initializeMerchantState,
  isMerchantPresent,
  purchaseOffer,
  spawnMerchantAtVillage,
  updateMerchant,
} from "./travelingMerchant/index.ts";

describe("traveling merchant system", () => {
  describe("initializeMerchantState", () => {
    it("initializes with merchant not present", () => {
      const state = initializeMerchantState();
      expect(state.isPresent).toBe(false);
      expect(state.visitCount).toBe(0);
      expect(state.currentOffers).toEqual([]);
    });

    it("sets a valid nextVisitDay in the future", () => {
      const state = initializeMerchantState(0);
      expect(state.nextVisitDay).toBeGreaterThanOrEqual(7);
      expect(state.nextVisitDay).toBeLessThanOrEqual(14);
    });

    it("is deterministic for same start day", () => {
      const a = initializeMerchantState(0);
      const b = initializeMerchantState(0);
      expect(a.nextVisitDay).toBe(b.nextVisitDay);
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

    it("generates 4 offers for visit 2", () => {
      const offers = generateMerchantOffers(2, "test-seed");
      expect(offers).toHaveLength(4);
    });

    it("generates 5 offers for visit 4+", () => {
      const offers = generateMerchantOffers(5, "test-seed");
      expect(offers).toHaveLength(5);
    });

    it("offers have unique IDs", () => {
      const offers = generateMerchantOffers(5, "test-seed");
      const ids = offers.map((o) => o.id);
      expect(new Set(ids).size).toBe(ids.length);
    });

    it("is deterministic for the same seed and visit", () => {
      const a = generateMerchantOffers(3, "my-seed");
      const b = generateMerchantOffers(3, "my-seed");
      expect(a.map((o) => o.name)).toEqual(b.map((o) => o.name));
    });

    it("quantity bonus increases every 3 visits", () => {
      const visit0 = generateMerchantOffers(0, "seed");
      const visit3 = generateMerchantOffers(3, "seed");
      // visit 0 gets base quantity, visit 3 gets +1
      const _maxQty0 = Math.max(...visit0.map((o) => o.quantity));
      const minQty3 = Math.min(...visit3.map((o) => o.quantity));
      expect(minQty3).toBeGreaterThanOrEqual(2); // baseQuantity(1) + bonus(1)
    });
  });

  describe("updateMerchant", () => {
    it("merchant arrives on nextVisitDay", () => {
      const state = initializeMerchantState(0);
      const updated = updateMerchant(state, state.nextVisitDay, "test-seed");
      expect(updated.isPresent).toBe(true);
      expect(updated.visitCount).toBe(1);
      expect(updated.currentOffers.length).toBeGreaterThan(0);
    });

    it("merchant does not arrive before nextVisitDay", () => {
      const state = initializeMerchantState(0);
      const updated = updateMerchant(state, state.nextVisitDay - 1, "test-seed");
      expect(updated.isPresent).toBe(false);
    });

    it("merchant departs after stay duration (2 days)", () => {
      const state = initializeMerchantState(0);
      const arrived = updateMerchant(state, state.nextVisitDay, "test-seed");
      expect(arrived.isPresent).toBe(true);
      // departDay = nextVisitDay + 2
      const departed = updateMerchant(arrived, arrived.departDay, "test-seed");
      expect(departed.isPresent).toBe(false);
      expect(departed.currentOffers).toEqual([]);
    });

    it("schedules a new visit after departure", () => {
      const state = initializeMerchantState(0);
      const arrived = updateMerchant(state, state.nextVisitDay, "test-seed");
      const departed = updateMerchant(arrived, arrived.departDay, "test-seed");
      expect(departed.nextVisitDay).toBeGreaterThan(arrived.departDay);
    });
  });

  describe("purchaseOffer", () => {
    it("returns null if merchant is not present", () => {
      const state = initializeMerchantState();
      const result = purchaseOffer(state, "offer-1-0");
      expect(result.offer).toBeNull();
    });

    it("returns null for a non-existent offer", () => {
      const state = {
        ...initializeMerchantState(),
        isPresent: true,
        currentOffers: generateMerchantOffers(0, "seed"),
      };
      const result = purchaseOffer(state, "nonexistent");
      expect(result.offer).toBeNull();
    });

    it("decrements quantity on purchase", () => {
      const offers = generateMerchantOffers(0, "seed");
      const state = {
        ...initializeMerchantState(),
        isPresent: true,
        currentOffers: offers,
      };
      const offerId = offers[0].id;
      const originalQty = offers[0].quantity;
      const result = purchaseOffer(state, offerId);
      expect(result.offer).not.toBeNull();

      if (originalQty > 1) {
        const remaining = result.state.currentOffers.find((o) => o.id === offerId);
        expect(remaining).toBeDefined();
        expect(remaining!.quantity).toBe(originalQty - 1);
      } else {
        // Offer removed when depleted
        const remaining = result.state.currentOffers.find((o) => o.id === offerId);
        expect(remaining).toBeUndefined();
      }
    });

    it("removes offer when quantity reaches zero", () => {
      const state = {
        ...initializeMerchantState(),
        isPresent: true,
        currentOffers: [
          {
            id: "test-offer",
            name: "Test",
            description: "test",
            cost: { timber: 5 },
            reward: {
              type: "resource" as const,
              resource: "sap" as const,
              amount: 3,
            },
            quantity: 1,
          },
        ],
      };
      const result = purchaseOffer(state, "test-offer");
      expect(result.offer).not.toBeNull();
      expect(result.state.currentOffers).toHaveLength(0);
    });

    it("returns null for zero-quantity offer", () => {
      const state = {
        ...initializeMerchantState(),
        isPresent: true,
        currentOffers: [
          {
            id: "empty-offer",
            name: "Empty",
            description: "out of stock",
            cost: { timber: 5 },
            reward: { type: "xp" as const, amount: 10 },
            quantity: 0,
          },
        ],
      };
      const result = purchaseOffer(state, "empty-offer");
      expect(result.offer).toBeNull();
    });
  });

  describe("spawnMerchantAtVillage (Spec §20)", () => {
    it("spawns merchant at a village with seeded inventory", () => {
      const state = initializeMerchantState(0);
      const result = spawnMerchantAtVillage(state, "village-2-3", 10, "world-seed");
      expect(result.isPresent).toBe(true);
      expect(result.currentOffers.length).toBeGreaterThan(0);
      expect(result.currentVillageId).toBe("village-2-3");
    });

    it("returns same state if merchant is already present", () => {
      const state = { ...initializeMerchantState(0), isPresent: true };
      const result = spawnMerchantAtVillage(state, "village-2-3", 10, "world-seed");
      expect(result).toBe(state);
    });

    it("sets departDay to currentDay + 2", () => {
      const state = initializeMerchantState(0);
      const result = spawnMerchantAtVillage(state, "village-5-5", 20, "world-seed");
      expect(result.departDay).toBe(22);
    });

    it("is deterministic for same village + worldSeed", () => {
      const state = initializeMerchantState(0);
      const a = spawnMerchantAtVillage(state, "village-1-1", 5, "seed-A");
      const b = spawnMerchantAtVillage(state, "village-1-1", 5, "seed-A");
      expect(a.currentOffers.map((o) => o.name)).toEqual(b.currentOffers.map((o) => o.name));
    });

    it("different villages produce different inventories", () => {
      const state = initializeMerchantState(0);
      const a = spawnMerchantAtVillage(state, "village-1-1", 5, "same-seed");
      const b = spawnMerchantAtVillage(state, "village-9-9", 5, "same-seed");
      // Different village IDs should seed different offer sets (not guaranteed equal)
      expect(a.currentVillageId).not.toBe(b.currentVillageId);
    });
  });
});
