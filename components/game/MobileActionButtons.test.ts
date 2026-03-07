/**
 * Tests for MobileActionButtons helper functions.
 *
 * Uses the pure helper module (no React Native dependencies).
 */

import { getDefaultMobileActions } from "./mobileActionHelpers.ts";

describe("getDefaultMobileActions", () => {
  it("enables plant when empty tile exists", () => {
    const actions = getDefaultMobileActions("trowel", true, false, false);
    const plant = actions.find((a) => a.id === "plant");
    expect(plant?.enabled).toBe(true);
  });

  it("disables plant when no empty tile", () => {
    const actions = getDefaultMobileActions("trowel", false, false, false);
    const plant = actions.find((a) => a.id === "plant");
    expect(plant?.enabled).toBe(false);
  });

  it("enables water when young tree exists", () => {
    const actions = getDefaultMobileActions("watering-can", false, true, false);
    const water = actions.find((a) => a.id === "water");
    expect(water?.enabled).toBe(true);
  });

  it("disables water when no young tree", () => {
    const actions = getDefaultMobileActions("watering-can", false, false, false);
    const water = actions.find((a) => a.id === "water");
    expect(water?.enabled).toBe(false);
  });

  it("enables harvest and prune when mature tree exists", () => {
    const actions = getDefaultMobileActions("axe", false, false, true);
    const harvest = actions.find((a) => a.id === "harvest");
    const prune = actions.find((a) => a.id === "prune");
    expect(harvest?.enabled).toBe(true);
    expect(prune?.enabled).toBe(true);
  });

  it("returns all 4 actions", () => {
    const actions = getDefaultMobileActions("trowel", true, true, true);
    expect(actions).toHaveLength(4);
    expect(actions.map((a) => a.id)).toEqual(["plant", "water", "prune", "harvest"]);
  });

  it("maps correct toolIds", () => {
    const actions = getDefaultMobileActions("trowel", true, true, true);
    expect(actions.find((a) => a.id === "plant")?.toolId).toBe("trowel");
    expect(actions.find((a) => a.id === "water")?.toolId).toBe("watering-can");
    expect(actions.find((a) => a.id === "prune")?.toolId).toBe("pruning-shears");
    expect(actions.find((a) => a.id === "harvest")?.toolId).toBe("axe");
  });
});
