/**
 * Tests for drawCallAudit — draw call counting and budget utilities (Spec §28).
 *
 * All functions are pure — no mocking required.
 */

import {
  DRAW_CALL_BUDGET,
  drawCallHeadroom,
  formatDrawCallReport,
  isOverBudget,
  readDrawCalls,
} from "./drawCallAudit";

// ---------------------------------------------------------------------------
// readDrawCalls
// ---------------------------------------------------------------------------

describe("readDrawCalls (Spec §28)", () => {
  it("returns the calls field from the info object", () => {
    expect(readDrawCalls({ calls: 23 })).toBe(23);
  });

  it("returns 0 when no draw calls have been issued", () => {
    expect(readDrawCalls({ calls: 0 })).toBe(0);
  });

  it("returns the exact value without modification", () => {
    expect(readDrawCalls({ calls: 49 })).toBe(49);
    expect(readDrawCalls({ calls: 50 })).toBe(50);
    expect(readDrawCalls({ calls: 51 })).toBe(51);
  });

  it("handles large draw call counts correctly", () => {
    expect(readDrawCalls({ calls: 1000 })).toBe(1000);
  });
});

// ---------------------------------------------------------------------------
// isOverBudget
// ---------------------------------------------------------------------------

describe("isOverBudget (Spec §28)", () => {
  it("returns false when calls equal the budget", () => {
    expect(isOverBudget(50, 50)).toBe(false);
  });

  it("returns false when calls are below the budget", () => {
    expect(isOverBudget(23, 50)).toBe(false);
    expect(isOverBudget(0, 50)).toBe(false);
  });

  it("returns true when calls exceed the budget", () => {
    expect(isOverBudget(51, 50)).toBe(true);
    expect(isOverBudget(100, 50)).toBe(true);
  });

  it("uses DRAW_CALL_BUDGET as default when no budget is provided", () => {
    expect(isOverBudget(DRAW_CALL_BUDGET)).toBe(false);
    expect(isOverBudget(DRAW_CALL_BUDGET + 1)).toBe(true);
  });

  it("works with custom budget values", () => {
    expect(isOverBudget(10, 10)).toBe(false);
    expect(isOverBudget(11, 10)).toBe(true);
    expect(isOverBudget(9, 10)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// formatDrawCallReport
// ---------------------------------------------------------------------------

describe("formatDrawCallReport (Spec §28)", () => {
  it("includes draw call count and budget in the output", () => {
    const report = formatDrawCallReport(23, 50);
    expect(report).toContain("23");
    expect(report).toContain("50");
  });

  it("indicates budget OK when within budget", () => {
    expect(formatDrawCallReport(23, 50)).toContain("budget OK");
  });

  it("indicates OVER BUDGET when exceeding budget", () => {
    expect(formatDrawCallReport(78, 50)).toContain("OVER BUDGET");
  });

  it("includes overage amount when over budget", () => {
    const report = formatDrawCallReport(78, 50);
    expect(report).toContain("28"); // 78 - 50 = 28
  });

  it("uses DRAW_CALL_BUDGET as default", () => {
    const report = formatDrawCallReport(10);
    expect(report).toContain(String(DRAW_CALL_BUDGET));
  });

  it("boundary: exactly at budget shows OK", () => {
    expect(formatDrawCallReport(50, 50)).toContain("budget OK");
  });

  it("boundary: one over budget shows OVER BUDGET", () => {
    expect(formatDrawCallReport(51, 50)).toContain("OVER BUDGET");
  });

  it("returns a non-empty string for all valid inputs", () => {
    expect(formatDrawCallReport(0, 50).length).toBeGreaterThan(0);
    expect(formatDrawCallReport(100, 50).length).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// drawCallHeadroom
// ---------------------------------------------------------------------------

describe("drawCallHeadroom (Spec §28)", () => {
  it("returns positive headroom when within budget", () => {
    expect(drawCallHeadroom(23, 50)).toBe(27);
  });

  it("returns zero when exactly at budget", () => {
    expect(drawCallHeadroom(50, 50)).toBe(0);
  });

  it("returns negative headroom when over budget", () => {
    expect(drawCallHeadroom(78, 50)).toBe(-28);
  });

  it("returns full budget when no draw calls have been issued", () => {
    expect(drawCallHeadroom(0, 50)).toBe(50);
  });

  it("uses DRAW_CALL_BUDGET as default", () => {
    expect(drawCallHeadroom(0)).toBe(DRAW_CALL_BUDGET);
  });
});

// ---------------------------------------------------------------------------
// DRAW_CALL_BUDGET constant
// ---------------------------------------------------------------------------

describe("DRAW_CALL_BUDGET constant (Spec §28)", () => {
  it("is exactly 50 — the spec target for a 3x3 active chunk scene", () => {
    expect(DRAW_CALL_BUDGET).toBe(50);
  });
});
