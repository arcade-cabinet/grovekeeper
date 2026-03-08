/**
 * Performance monitor utilities — FPS tracking and memory budget checks.
 *
 * Spec §28 performance targets:
 *   FPS: >= 55 mobile, >= 60 desktop
 *   Memory: < 100 MB mobile
 *   Draw calls: < 50
 *
 * Uses exponential moving average (EMA) for FPS — cheaper than a rolling window
 * (no array allocation) and naturally de-noises single-frame spikes.
 */

import perfConfig from "@/config/game/performance.json" with { type: "json" };

// ─── Types ────────────────────────────────────────────────────────────────────

export interface FpsState {
  /** Smoothed FPS value (EMA). Starts at 0 until the first frame. */
  smoothFps: number;
  /** Timestamp of the last frame (ms from performance.now()). */
  lastFrameMs: number;
  /** EMA smoothing factor: how much weight to give the latest sample. */
  alpha: number;
}

export interface MemorySample {
  /** JS heap used in MB (best-effort; 0 if not available). */
  usedMb: number;
  /** JS heap total in MB (best-effort; 0 if not available). */
  totalMb: number;
}

// ─── Constants ────────────────────────────────────────────────────────────────

/** FPS below this triggers a "below budget" flag on mobile. */
export const FPS_BUDGET_MOBILE: number = perfConfig.fpsBudgetMobile;
/** FPS below this triggers a "below budget" flag on desktop. */
export const FPS_BUDGET_DESKTOP: number = perfConfig.fpsBudgetDesktop;
/** Maximum allowed JS heap in MB on mobile before flagging memory pressure. */
export const MEMORY_BUDGET_MB: number = perfConfig.memoryBudgetMb;
/** Draw-call budget. */
export const DRAW_CALL_BUDGET: number = perfConfig.drawCallBudget;

// ─── FPS tracking (pure functions) ────────────────────────────────────────────

/**
 * Create an initial FPS state with the given EMA alpha.
 *
 * Alpha = 0.1 → slow smoothing (stable, lags behind rapid changes).
 * Alpha = 0.5 → fast smoothing (responsive but noisier).
 */
export function createFpsState(alpha = 0.1): FpsState {
  return { smoothFps: 0, lastFrameMs: 0, alpha };
}

/**
 * Advance the FPS EMA by one frame.
 *
 * Call this at the top of each frame with `performance.now()` as `nowMs`.
 * Returns a new state object (immutable update pattern — safe to store in a ref
 * without triggering React re-renders if you read `.smoothFps` imperatively).
 *
 * @param state   Previous FPS state
 * @param nowMs   Current timestamp from performance.now()
 */
export function tickFps(state: FpsState, nowMs: number): FpsState {
  if (state.lastFrameMs === 0) {
    // First frame — seed lastFrameMs without updating smoothFps
    return { ...state, lastFrameMs: nowMs };
  }
  const dt = (nowMs - state.lastFrameMs) / 1000; // seconds
  if (dt <= 0) return state; // guard against clock resets
  const instantFps = 1 / dt;
  const smoothFps = state.smoothFps === 0
    ? instantFps // first real sample
    : state.alpha * instantFps + (1 - state.alpha) * state.smoothFps;
  return { ...state, smoothFps, lastFrameMs: nowMs };
}

/**
 * Returns true if the smoothed FPS is below the mobile budget.
 * Only meaningful after several frames (smoothFps > 0).
 */
export function isFpsUnderBudgetMobile(state: FpsState): boolean {
  return state.smoothFps > 0 && state.smoothFps < FPS_BUDGET_MOBILE;
}

/**
 * Returns true if the smoothed FPS is below the desktop budget.
 */
export function isFpsUnderBudgetDesktop(state: FpsState): boolean {
  return state.smoothFps > 0 && state.smoothFps < FPS_BUDGET_DESKTOP;
}

// ─── Memory sampling (pure functions) ─────────────────────────────────────────

/**
 * Read the current JS heap memory usage.
 *
 * Uses `performance.memory` (available in Chrome / React Native JSC/Hermes).
 * Returns `{ usedMb: 0, totalMb: 0 }` on platforms that don't expose it.
 *
 * Call infrequently (e.g. every 5 seconds) — reading memory is not free.
 */
export function sampleMemory(): MemorySample {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mem = (performance as any).memory as
    | { usedJSHeapSize: number; totalJSHeapSize: number }
    | undefined;
  if (!mem) return { usedMb: 0, totalMb: 0 };
  return {
    usedMb: mem.usedJSHeapSize / (1024 * 1024),
    totalMb: mem.totalJSHeapSize / (1024 * 1024),
  };
}

/**
 * Returns true if the sampled memory exceeds the mobile budget.
 */
export function isMemoryOverBudget(sample: MemorySample): boolean {
  return sample.usedMb > 0 && sample.usedMb > MEMORY_BUDGET_MB;
}

/**
 * Format a memory sample as a human-readable string.
 * e.g. "72.4 MB used / 128.0 MB total"
 */
export function formatMemoryReport(sample: MemorySample): string {
  if (sample.usedMb === 0 && sample.totalMb === 0) {
    return "Memory: unavailable";
  }
  return `Memory: ${sample.usedMb.toFixed(1)} MB used / ${sample.totalMb.toFixed(1)} MB total`;
}

/**
 * Format a FPS state as a human-readable string.
 * e.g. "FPS: 57.3"
 */
export function formatFpsReport(state: FpsState): string {
  return `FPS: ${state.smoothFps.toFixed(1)}`;
}
