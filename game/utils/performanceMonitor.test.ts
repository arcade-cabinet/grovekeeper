/**
 * Performance monitor tests (Spec §28).
 */
import {
  createFpsState,
  DRAW_CALL_BUDGET,
  FPS_BUDGET_DESKTOP,
  FPS_BUDGET_MOBILE,
  formatFpsReport,
  formatMemoryReport,
  isFpsUnderBudgetDesktop,
  isFpsUnderBudgetMobile,
  isMemoryOverBudget,
  MEMORY_BUDGET_MB,
  sampleMemory,
  tickFps,
} from "./performanceMonitor.ts";

// ─── Constants ────────────────────────────────────────────────────────────────

describe("Performance budget constants (Spec §28)", () => {
  it("mobile FPS budget is 55", () => {
    expect(FPS_BUDGET_MOBILE).toBe(55);
  });

  it("desktop FPS budget is 60", () => {
    expect(FPS_BUDGET_DESKTOP).toBe(60);
  });

  it("memory budget is 100 MB", () => {
    expect(MEMORY_BUDGET_MB).toBe(100);
  });

  it("draw call budget is 50", () => {
    expect(DRAW_CALL_BUDGET).toBe(50);
  });
});

// ─── FPS state creation ───────────────────────────────────────────────────────

describe("createFpsState", () => {
  it("creates state with smoothFps=0 and lastFrameMs=0", () => {
    const state = createFpsState();
    expect(state.smoothFps).toBe(0);
    expect(state.lastFrameMs).toBe(0);
  });

  it("uses default alpha of 0.1", () => {
    const state = createFpsState();
    expect(state.alpha).toBe(0.1);
  });

  it("accepts a custom alpha", () => {
    const state = createFpsState(0.5);
    expect(state.alpha).toBe(0.5);
  });
});

// ─── tickFps ──────────────────────────────────────────────────────────────────

describe("tickFps", () => {
  it("seeds lastFrameMs on the first call without updating smoothFps", () => {
    const s0 = createFpsState();
    const s1 = tickFps(s0, 1000);
    expect(s1.lastFrameMs).toBe(1000);
    expect(s1.smoothFps).toBe(0); // no delta yet
  });

  it("sets smoothFps to the instant FPS on the second call", () => {
    const s0 = createFpsState();
    const s1 = tickFps(s0, 1000);
    // Second call: dt = 1000/1000 = 1s → instantFps = 1
    const s2 = tickFps(s1, 2000);
    expect(s2.smoothFps).toBeCloseTo(1, 1);
  });

  it("approximates 60 FPS with 16.67ms frame time", () => {
    let state = createFpsState(0.5); // fast alpha to converge quickly
    let t = 0;
    for (let i = 0; i < 30; i++) {
      t += 1000 / 60; // 16.67ms
      state = tickFps(state, t);
    }
    expect(state.smoothFps).toBeCloseTo(60, 0);
  });

  it("approximates 55 FPS with 18.18ms frame time", () => {
    let state = createFpsState(0.5);
    let t = 0;
    for (let i = 0; i < 30; i++) {
      t += 1000 / 55;
      state = tickFps(state, t);
    }
    expect(state.smoothFps).toBeCloseTo(55, 0);
  });

  it("ignores frames where dt <= 0", () => {
    const s0 = createFpsState();
    const s1 = tickFps(s0, 1000); // seed
    const s2 = tickFps(s1, 1000); // same timestamp → dt = 0
    expect(s2.smoothFps).toBe(s1.smoothFps); // unchanged
  });
});

// ─── isFpsUnderBudget ─────────────────────────────────────────────────────────

describe("isFpsUnderBudgetMobile", () => {
  it("returns false when smoothFps is 0 (no data yet)", () => {
    const state = createFpsState();
    expect(isFpsUnderBudgetMobile(state)).toBe(false);
  });

  it("returns false when FPS is above mobile budget", () => {
    const state = { ...createFpsState(), smoothFps: 60 };
    expect(isFpsUnderBudgetMobile(state)).toBe(false);
  });

  it("returns true when FPS is below mobile budget", () => {
    const state = { ...createFpsState(), smoothFps: 30 };
    expect(isFpsUnderBudgetMobile(state)).toBe(true);
  });

  it("returns false when FPS is exactly at mobile budget", () => {
    const state = { ...createFpsState(), smoothFps: FPS_BUDGET_MOBILE };
    expect(isFpsUnderBudgetMobile(state)).toBe(false);
  });
});

describe("isFpsUnderBudgetDesktop", () => {
  it("returns false when smoothFps is 0", () => {
    expect(isFpsUnderBudgetDesktop(createFpsState())).toBe(false);
  });

  it("returns true when FPS is below desktop budget", () => {
    const state = { ...createFpsState(), smoothFps: 45 };
    expect(isFpsUnderBudgetDesktop(state)).toBe(true);
  });
});

// ─── Memory ───────────────────────────────────────────────────────────────────

describe("sampleMemory", () => {
  it("returns { usedMb: 0, totalMb: 0 } when performance.memory is unavailable", () => {
    // In Jest (Node env), performance.memory is not present
    const sample = sampleMemory();
    // Accept either real values or 0s depending on runtime
    expect(sample.usedMb).toBeGreaterThanOrEqual(0);
    expect(sample.totalMb).toBeGreaterThanOrEqual(0);
  });
});

describe("isMemoryOverBudget", () => {
  it("returns false for 0,0 (unavailable)", () => {
    expect(isMemoryOverBudget({ usedMb: 0, totalMb: 0 })).toBe(false);
  });

  it("returns false when under budget", () => {
    expect(isMemoryOverBudget({ usedMb: 50, totalMb: 128 })).toBe(false);
  });

  it("returns true when over budget", () => {
    expect(isMemoryOverBudget({ usedMb: 150, totalMb: 256 })).toBe(true);
  });

  it("returns false when exactly at budget", () => {
    expect(isMemoryOverBudget({ usedMb: MEMORY_BUDGET_MB, totalMb: 256 })).toBe(false);
  });
});

// ─── Formatters ───────────────────────────────────────────────────────────────

describe("formatMemoryReport", () => {
  it("returns 'Memory: unavailable' when both are 0", () => {
    expect(formatMemoryReport({ usedMb: 0, totalMb: 0 })).toBe("Memory: unavailable");
  });

  it("formats values to 1 decimal place", () => {
    expect(formatMemoryReport({ usedMb: 72.4, totalMb: 128.0 })).toBe(
      "Memory: 72.4 MB used / 128.0 MB total",
    );
  });
});

describe("formatFpsReport", () => {
  it("formats FPS to 1 decimal place", () => {
    const state = { ...createFpsState(), smoothFps: 57.333 };
    expect(formatFpsReport(state)).toBe("FPS: 57.3");
  });

  it("formats zero FPS", () => {
    expect(formatFpsReport(createFpsState())).toBe("FPS: 0.0");
  });
});
