/**
 * craftingStationLogic tests (Spec §7.3, §22.2, §35)
 *
 * Verifies that the pure panel state resolver correctly maps
 * activeCraftingStation values to panel open/close booleans.
 */

import { resolvePanelState } from "./craftingStationLogic.ts";

describe("resolvePanelState (Spec §7.3, §22.2, §35)", () => {
  it("returns all panels closed when station is null", () => {
    const state = resolvePanelState(null);
    expect(state.cookingOpen).toBe(false);
    expect(state.forgingOpen).toBe(false);
    expect(state.buildOpen).toBe(false);
    expect(state.fishingOpen).toBe(false);
  });

  it("opens cooking panel for cooking station type", () => {
    const state = resolvePanelState({ type: "cooking", entityId: "cf-1" });
    expect(state.cookingOpen).toBe(true);
    expect(state.forgingOpen).toBe(false);
    expect(state.buildOpen).toBe(false);
  });

  it("opens forging panel for forging station type", () => {
    const state = resolvePanelState({ type: "forging", entityId: "forge-1" });
    expect(state.cookingOpen).toBe(false);
    expect(state.forgingOpen).toBe(true);
    expect(state.buildOpen).toBe(false);
  });

  it("opens build panel for kitbash station type", () => {
    const state = resolvePanelState({ type: "kitbash", entityId: "" });
    expect(state.cookingOpen).toBe(false);
    expect(state.forgingOpen).toBe(false);
    expect(state.buildOpen).toBe(true);
  });

  it("opens fishing panel for fishing station type", () => {
    const state = resolvePanelState({ type: "fishing", entityId: "w-1" });
    expect(state.cookingOpen).toBe(false);
    expect(state.forgingOpen).toBe(false);
    expect(state.buildOpen).toBe(false);
    expect(state.fishingOpen).toBe(true);
  });

  it("returns all panels closed for unknown station type", () => {
    const state = resolvePanelState({ type: "unknown-type", entityId: "x-1" });
    expect(state.cookingOpen).toBe(false);
    expect(state.forgingOpen).toBe(false);
    expect(state.buildOpen).toBe(false);
    expect(state.fishingOpen).toBe(false);
  });

  it("close cooking panel clears when station set to null", () => {
    // Simulate open -> close
    const openState = resolvePanelState({ type: "cooking", entityId: "cf-1" });
    expect(openState.cookingOpen).toBe(true);

    const closedState = resolvePanelState(null);
    expect(closedState.cookingOpen).toBe(false);
  });

  it("switching station type closes previous panel and opens new one", () => {
    const cooking = resolvePanelState({ type: "cooking", entityId: "cf-1" });
    expect(cooking.cookingOpen).toBe(true);

    const forging = resolvePanelState({ type: "forging", entityId: "forge-1" });
    expect(forging.cookingOpen).toBe(false);
    expect(forging.forgingOpen).toBe(true);
  });
});
