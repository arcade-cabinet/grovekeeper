import { describe, expect, it } from "vitest";
import {
  getPrestigeMilestone,
  getPrestigeStartingResources,
  getPrestigeStartingSeeds,
  shouldUnlockAllTools,
} from "./prestige";

// ---------------------------------------------------------------------------
// getPrestigeMilestone
// ---------------------------------------------------------------------------

describe("getPrestigeMilestone", () => {
  it("returns null for prestige 0", () => {
    expect(getPrestigeMilestone(0)).toBeNull();
  });

  it("returns level 1 milestone for prestige 1", () => {
    const m = getPrestigeMilestone(1);
    expect(m).not.toBeNull();
    expect(m?.prestigeLevel).toBe(1);
    expect(m?.bonusSeeds).toBe(20);
  });

  it("returns level 3 milestone for prestige 3", () => {
    const m = getPrestigeMilestone(3);
    expect(m).not.toBeNull();
    expect(m?.prestigeLevel).toBe(3);
    expect(m?.allToolsUnlocked).toBe(true);
  });

  it("returns level 4 milestone for prestige 4", () => {
    const m = getPrestigeMilestone(4);
    expect(m).not.toBeNull();
    expect(m?.prestigeLevel).toBe(4);
  });

  it("returns level 4 milestone for prestige 10 (highest applicable)", () => {
    const m = getPrestigeMilestone(10);
    expect(m).not.toBeNull();
    expect(m?.prestigeLevel).toBe(4);
  });

  it("returns null for negative prestige count", () => {
    expect(getPrestigeMilestone(-1)).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// getPrestigeStartingSeeds
// ---------------------------------------------------------------------------

describe("getPrestigeStartingSeeds", () => {
  it("returns 10 for prestige 0", () => {
    expect(getPrestigeStartingSeeds(0)).toBe(10);
  });

  it("returns 20 for prestige 1", () => {
    expect(getPrestigeStartingSeeds(1)).toBe(20);
  });

  it("returns 20 for prestige 2", () => {
    expect(getPrestigeStartingSeeds(2)).toBe(20);
  });

  it("returns 20 for prestige 5", () => {
    expect(getPrestigeStartingSeeds(5)).toBe(20);
  });
});

// ---------------------------------------------------------------------------
// getPrestigeStartingResources
// ---------------------------------------------------------------------------

describe("getPrestigeStartingResources", () => {
  it("returns empty for prestige 0", () => {
    expect(getPrestigeStartingResources(0)).toEqual({});
  });

  it("returns empty for prestige 1", () => {
    expect(getPrestigeStartingResources(1)).toEqual({});
  });

  it("returns empty for prestige 3", () => {
    expect(getPrestigeStartingResources(3)).toEqual({});
  });

  it("returns 50 per resource for prestige 4 (overflow = 1)", () => {
    const result = getPrestigeStartingResources(4);
    expect(result).toEqual({
      timber: 50,
      sap: 50,
      fruit: 50,
      acorns: 50,
    });
  });

  it("returns 100 per resource for prestige 5 (overflow = 2)", () => {
    const result = getPrestigeStartingResources(5);
    expect(result).toEqual({
      timber: 100,
      sap: 100,
      fruit: 100,
      acorns: 100,
    });
  });

  it("returns 350 per resource for prestige 10 (overflow = 7)", () => {
    const result = getPrestigeStartingResources(10);
    expect(result).toEqual({
      timber: 350,
      sap: 350,
      fruit: 350,
      acorns: 350,
    });
  });
});

// ---------------------------------------------------------------------------
// shouldUnlockAllTools
// ---------------------------------------------------------------------------

describe("shouldUnlockAllTools", () => {
  it("returns false for prestige 0", () => {
    expect(shouldUnlockAllTools(0)).toBe(false);
  });

  it("returns false for prestige 1", () => {
    expect(shouldUnlockAllTools(1)).toBe(false);
  });

  it("returns false for prestige 2", () => {
    expect(shouldUnlockAllTools(2)).toBe(false);
  });

  it("returns true for prestige 3", () => {
    expect(shouldUnlockAllTools(3)).toBe(true);
  });

  it("returns true for prestige 4", () => {
    expect(shouldUnlockAllTools(4)).toBe(true);
  });

  it("returns true for prestige 10", () => {
    expect(shouldUnlockAllTools(10)).toBe(true);
  });
});
