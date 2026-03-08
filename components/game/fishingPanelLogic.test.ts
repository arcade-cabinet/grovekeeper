/**
 * FishingPanel display logic tests — Spec §44.
 *
 * Covers:
 * - getPhaseText: human-readable label per phase
 * - isTimingBarVisible: only during minigame
 * - isActionEnabled: biting + minigame
 * - isSessionComplete: caught or escaped
 * - computeWaitProgress: fill percentage during waiting
 * - computeBiteUrgency: urgency fill during biting
 */

import type { FishingPhase } from "@/game/systems/fishing";
import {
  computeBiteUrgency,
  computeWaitProgress,
  getPhaseText,
  isActionEnabled,
  isSessionComplete,
  isTimingBarVisible,
} from "./fishingPanelLogic.ts";

// ---------------------------------------------------------------------------
// getPhaseText
// ---------------------------------------------------------------------------

describe("getPhaseText (Spec §44)", () => {
  it("returns 'Cast your line!' for idle", () => {
    expect(getPhaseText("idle")).toBe("Cast your line!");
  });

  it("returns 'Casting...' for casting", () => {
    expect(getPhaseText("casting")).toBe("Casting...");
  });

  it("returns 'Waiting for a bite...' for waiting", () => {
    expect(getPhaseText("waiting")).toBe("Waiting for a bite...");
  });

  it("returns bite prompt for biting", () => {
    expect(getPhaseText("biting")).toBe("A fish is biting! Tap now!");
  });

  it("returns 'Hit the zone!' for minigame", () => {
    expect(getPhaseText("minigame")).toBe("Hit the zone!");
  });

  it("returns success text for caught", () => {
    expect(getPhaseText("caught")).toBe("Caught a fish!");
  });

  it("returns failure text for escaped", () => {
    expect(getPhaseText("escaped")).toBe("The fish escaped!");
  });
});

// ---------------------------------------------------------------------------
// isTimingBarVisible
// ---------------------------------------------------------------------------

describe("isTimingBarVisible (Spec §44)", () => {
  it("returns true only for minigame phase", () => {
    expect(isTimingBarVisible("minigame")).toBe(true);
  });

  const otherPhases: FishingPhase[] = ["idle", "casting", "waiting", "biting", "caught", "escaped"];
  for (const phase of otherPhases) {
    it(`returns false for ${phase}`, () => {
      expect(isTimingBarVisible(phase)).toBe(false);
    });
  }
});

// ---------------------------------------------------------------------------
// isActionEnabled
// ---------------------------------------------------------------------------

describe("isActionEnabled (Spec §44)", () => {
  it("returns true for biting (respond to bite)", () => {
    expect(isActionEnabled("biting")).toBe(true);
  });

  it("returns true for minigame (hit zone)", () => {
    expect(isActionEnabled("minigame")).toBe(true);
  });

  const disabledPhases: FishingPhase[] = ["idle", "casting", "waiting", "caught", "escaped"];
  for (const phase of disabledPhases) {
    it(`returns false for ${phase}`, () => {
      expect(isActionEnabled(phase)).toBe(false);
    });
  }
});

// ---------------------------------------------------------------------------
// isSessionComplete
// ---------------------------------------------------------------------------

describe("isSessionComplete (Spec §44)", () => {
  it("returns true for caught", () => {
    expect(isSessionComplete("caught")).toBe(true);
  });

  it("returns true for escaped", () => {
    expect(isSessionComplete("escaped")).toBe(true);
  });

  const activePhases: FishingPhase[] = ["idle", "casting", "waiting", "biting", "minigame"];
  for (const phase of activePhases) {
    it(`returns false for ${phase}`, () => {
      expect(isSessionComplete(phase)).toBe(false);
    });
  }
});

// ---------------------------------------------------------------------------
// computeWaitProgress
// ---------------------------------------------------------------------------

describe("computeWaitProgress (Spec §44)", () => {
  it("returns 0 when not in waiting phase", () => {
    expect(computeWaitProgress("casting", 5, 10)).toBe(0);
  });

  it("returns 0 when waitDuration is 0", () => {
    expect(computeWaitProgress("waiting", 5, 0)).toBe(0);
  });

  it("returns 0.5 at halfway through wait", () => {
    expect(computeWaitProgress("waiting", 5, 10)).toBeCloseTo(0.5);
  });

  it("clamps to 1 when elapsed exceeds waitDuration", () => {
    expect(computeWaitProgress("waiting", 15, 10)).toBe(1);
  });

  it("returns 0 at start of wait", () => {
    expect(computeWaitProgress("waiting", 0, 10)).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// computeBiteUrgency
// ---------------------------------------------------------------------------

describe("computeBiteUrgency (Spec §44)", () => {
  it("returns 0 when not in biting phase", () => {
    expect(computeBiteUrgency("minigame", 2, 4)).toBe(0);
  });

  it("returns 0 when biteDuration is 0", () => {
    expect(computeBiteUrgency("biting", 2, 0)).toBe(0);
  });

  it("returns 0.5 at halfway through bite window", () => {
    expect(computeBiteUrgency("biting", 2, 4)).toBeCloseTo(0.5);
  });

  it("clamps to 1 when elapsed exceeds biteDuration", () => {
    expect(computeBiteUrgency("biting", 5, 4)).toBe(1);
  });

  it("returns 0 at start of bite", () => {
    expect(computeBiteUrgency("biting", 0, 4)).toBe(0);
  });
});
