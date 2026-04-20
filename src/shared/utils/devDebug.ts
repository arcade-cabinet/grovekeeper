/**
 * Dev-debug frame-profiling helpers.
 *
 * Enabled by `?perf=1` in the URL. When enabled, `frameMark()` records
 * performance.mark entries around named slices of the render loop, and
 * `frameReport()` logs a ~1Hz breakdown of how much time each slice took
 * in the most recent window. Zero cost when the flag is off.
 *
 * Usage:
 *   if (perfEnabled) frameMark("system:growth:start");
 *   ...growthSystem(...)...
 *   if (perfEnabled) frameMark("system:growth:end");
 *   if (perfEnabled) frameMeasure("system:growth", "system:growth:start", "system:growth:end");
 *
 * At end-of-frame, call `frameReport(dt)`. Every ~1s it prints a table
 * with the cumulative wall time per slice over the last second.
 */

export const perfEnabled: boolean =
  typeof window !== "undefined" &&
  new URLSearchParams(window.location.search).has("perf");

/** Running totals per named slice, reset every 1s by frameReport. */
const sliceTotals = new Map<string, number>();
let lastReportMs = 0;
let frameCount = 0;

export function frameMark(name: string): void {
  if (!perfEnabled) return;
  performance.mark(name);
}

export function frameMeasure(
  name: string,
  startMark: string,
  endMark: string,
): void {
  if (!perfEnabled) return;
  try {
    const entry = performance.measure(name, startMark, endMark);
    sliceTotals.set(name, (sliceTotals.get(name) ?? 0) + entry.duration);
    // Clean up marks so they don't accumulate indefinitely.
    performance.clearMarks(startMark);
    performance.clearMarks(endMark);
    performance.clearMeasures(name);
  } catch {
    // Marks missing — silent, normal on first frame.
  }
}

/**
 * Call once per frame with the frame's dt (seconds). Every ~1s emits a
 * console.table of cumulative slice durations.
 */
export function frameReport(dtSec: number): void {
  if (!perfEnabled) return;
  frameCount++;
  const now = performance.now();
  if (lastReportMs === 0) {
    lastReportMs = now;
    return;
  }
  if (now - lastReportMs < 1000) return;

  const rows: Record<string, { totalMs: string; perFrameMs: string }> = {};
  for (const [name, total] of sliceTotals) {
    rows[name] = {
      totalMs: total.toFixed(2),
      perFrameMs: (total / frameCount).toFixed(3),
    };
  }
  console.table({
    __window: {
      totalMs: (now - lastReportMs).toFixed(1),
      perFrameMs: ((now - lastReportMs) / frameCount).toFixed(3),
    },
    __frames: {
      totalMs: String(frameCount),
      perFrameMs: `dt_avg=${(dtSec * 1000).toFixed(1)}ms`,
    },
    ...rows,
  });
  sliceTotals.clear();
  frameCount = 0;
  lastReportMs = now;
}
