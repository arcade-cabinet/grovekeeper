/**
 * Tests for MobileActionButtons helper functions (Spec §23).
 *
 * Uses the pure helper module (no React Native dependencies).
 * Tests both the tile-state computation helpers and the TouchProvider
 * wiring logic extracted into handleActionButtonPress.
 */

import {
  getDefaultMobileActions,
  handleActionButtonPress,
  type MobileActionProvider,
} from "./mobileActionHelpers.ts";

// ── MobileActionProvider interface ────────────────────────────────────────────

function makeProvider(): MobileActionProvider {
  return {
    onInteractStart: jest.fn(),
    onToolCycleStart: jest.fn(),
  };
}

// ── handleActionButtonPress ───────────────────────────────────────────────────

describe("handleActionButtonPress (Spec §23)", () => {
  it("calls provider.onInteractStart when the pressed button is active", () => {
    const provider = makeProvider();
    const onAction = jest.fn();
    const onSelectTool = jest.fn();

    handleActionButtonPress(true, provider, onAction, onSelectTool, "axe");

    expect(provider.onInteractStart).toHaveBeenCalledTimes(1);
  });

  it("calls onAction when the pressed button is active", () => {
    const provider = makeProvider();
    const onAction = jest.fn();
    const onSelectTool = jest.fn();

    handleActionButtonPress(true, provider, onAction, onSelectTool, "axe");

    expect(onAction).toHaveBeenCalledTimes(1);
  });

  it("does NOT call onSelectTool when the pressed button is active", () => {
    const provider = makeProvider();
    const onAction = jest.fn();
    const onSelectTool = jest.fn();

    handleActionButtonPress(true, provider, onAction, onSelectTool, "axe");

    expect(onSelectTool).not.toHaveBeenCalled();
  });

  it("calls onSelectTool with toolId when the button is NOT active", () => {
    const provider = makeProvider();
    const onAction = jest.fn();
    const onSelectTool = jest.fn();

    handleActionButtonPress(false, provider, onAction, onSelectTool, "watering-can");

    expect(onSelectTool).toHaveBeenCalledWith("watering-can");
  });

  it("does NOT call provider.onInteractStart when switching tools", () => {
    const provider = makeProvider();
    const onAction = jest.fn();
    const onSelectTool = jest.fn();

    handleActionButtonPress(false, provider, onAction, onSelectTool, "trowel");

    expect(provider.onInteractStart).not.toHaveBeenCalled();
  });

  it("does NOT call onAction when switching tools", () => {
    const provider = makeProvider();
    const onAction = jest.fn();
    const onSelectTool = jest.fn();

    handleActionButtonPress(false, provider, onAction, onSelectTool, "trowel");

    expect(onAction).not.toHaveBeenCalled();
  });

  it("provider.onToolCycleStart is independently callable on the provider", () => {
    const provider = makeProvider();
    provider.onToolCycleStart();
    expect(provider.onToolCycleStart).toHaveBeenCalledTimes(1);
  });
});

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
