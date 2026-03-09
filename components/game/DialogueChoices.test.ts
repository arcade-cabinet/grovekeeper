/**
 * Tests for DialogueChoices — dialogue branch choice UI (Spec §33.5).
 *
 * Tests exported pure functions without React Native rendering:
 *   - computeAutoAdvanceProgress — countdown timer progress math
 *
 * Auto-advance duration constant and component export are also verified.
 */

// ── Mocks (must precede all imports) ─────────────────────────────────────────

jest.mock("@/components/ui/text", () => ({
  Text: jest.fn().mockReturnValue(null),
}));

// ── Imports ───────────────────────────────────────────────────────────────────

import {
  AUTO_ADVANCE_DURATION,
  computeAutoAdvanceProgress,
  DialogueChoices,
} from "./DialogueChoices.tsx";

// ---------------------------------------------------------------------------
// computeAutoAdvanceProgress
// ---------------------------------------------------------------------------

describe("computeAutoAdvanceProgress (Spec §33.5)", () => {
  it("returns 0 at elapsed=0", () => {
    expect(computeAutoAdvanceProgress(0, 3)).toBe(0);
  });

  it("returns 1 at elapsed=duration", () => {
    expect(computeAutoAdvanceProgress(3, 3)).toBe(1);
  });

  it("returns 0.5 at elapsed=half duration", () => {
    expect(computeAutoAdvanceProgress(1.5, 3)).toBeCloseTo(0.5);
  });

  it("clamps to 1 when elapsed exceeds duration", () => {
    expect(computeAutoAdvanceProgress(10, 3)).toBe(1);
  });

  it("clamps to 0 when elapsed is negative", () => {
    expect(computeAutoAdvanceProgress(-1, 3)).toBe(0);
  });

  it("returns 1 when duration is 0 (no wait)", () => {
    expect(computeAutoAdvanceProgress(0, 0)).toBe(1);
  });

  it("returns proportional progress at 1/3 elapsed", () => {
    expect(computeAutoAdvanceProgress(1, 3)).toBeCloseTo(1 / 3);
  });

  it("returns proportional progress at 2/3 elapsed", () => {
    expect(computeAutoAdvanceProgress(2, 3)).toBeCloseTo(2 / 3);
  });

  it("progress is always in [0, 1] for arbitrary inputs", () => {
    for (const elapsed of [0, 0.5, 1, 2, 3, 4, 100]) {
      const p = computeAutoAdvanceProgress(elapsed, 3);
      expect(p).toBeGreaterThanOrEqual(0);
      expect(p).toBeLessThanOrEqual(1);
    }
  });

  it("is linear: progress at 1s equals progress at 0.5s doubled", () => {
    const half = computeAutoAdvanceProgress(0.5, 3);
    const full = computeAutoAdvanceProgress(1, 3);
    expect(full).toBeCloseTo(half * 2);
  });
});

// ---------------------------------------------------------------------------
// AUTO_ADVANCE_DURATION
// ---------------------------------------------------------------------------

describe("AUTO_ADVANCE_DURATION (Spec §33.5)", () => {
  it("is 3 seconds", () => {
    expect(AUTO_ADVANCE_DURATION).toBe(3);
  });
});

// ---------------------------------------------------------------------------
// Component export
// ---------------------------------------------------------------------------

describe("DialogueChoices component (Spec §33.5)", () => {
  it("exports DialogueChoices as a named function", () => {
    expect(typeof DialogueChoices).toBe("function");
  });

  it("has component name DialogueChoices", () => {
    expect(DialogueChoices.name).toBe("DialogueChoices");
  });
});
