/**
 * drawCallAudit — Pure utilities for auditing Three.js draw call counts.
 *
 * Reads from `renderer.info.render.calls` (the WebGLRenderer stat Three.js
 * maintains per-frame). All functions are pure — no Three.js import needed,
 * allowing full unit test coverage without a WebGL context.
 *
 * Target: < 50 draw calls for a typical 3x3 active chunk scene (Spec §28).
 *
 * Usage (inside a useFrame hook with useThree):
 *   const { gl } = useThree();
 *   const calls = readDrawCalls(gl.info);
 *   if (isOverBudget(calls, DRAW_CALL_BUDGET)) {
 *     console.warn(formatDrawCallReport(calls, DRAW_CALL_BUDGET));
 *   }
 *
 * See GAME_SPEC.md §28.
 */

/** Target draw call budget for a 3x3 active chunk scene (Spec §28). */
export const DRAW_CALL_BUDGET = 50;

/**
 * Minimal shape of Three.js WebGLRenderer.info.render.
 * Avoids importing Three.js so this module stays testable in Node.js.
 */
export interface RendererRenderInfo {
  calls: number;
}

/**
 * Read the current draw call count from a WebGLRenderer info snapshot.
 *
 * Three.js resets `info.render.calls` to 0 at the start of each frame and
 * increments it for every draw call issued to the GPU.
 *
 * @param info  `renderer.info.render` from `useThree().gl.info.render`
 * @returns     Current draw call count for this frame
 */
export function readDrawCalls(info: RendererRenderInfo): number {
  return info.calls;
}

/**
 * Returns true when the draw call count exceeds the given budget.
 *
 * @param calls   Current frame draw call count (from `readDrawCalls`)
 * @param budget  Maximum allowed draw calls (default: DRAW_CALL_BUDGET)
 */
export function isOverBudget(calls: number, budget: number = DRAW_CALL_BUDGET): boolean {
  return calls > budget;
}

/**
 * Format a human-readable draw call report string for console output.
 *
 * Example:
 *   "DrawCalls: 23 / 50 ✓ (budget OK)"
 *   "DrawCalls: 78 / 50 ✗ (OVER BUDGET by 28)"
 *
 * @param calls   Current frame draw call count
 * @param budget  Maximum allowed draw calls
 */
export function formatDrawCallReport(calls: number, budget: number = DRAW_CALL_BUDGET): string {
  if (calls > budget) {
    return `DrawCalls: ${calls} / ${budget} ✗ (OVER BUDGET by ${calls - budget})`;
  }
  return `DrawCalls: ${calls} / ${budget} ✓ (budget OK)`;
}

/**
 * Compute the draw call headroom remaining before the budget is exceeded.
 *
 * A positive value means the scene is within budget.
 * A zero or negative value means the scene is at or over budget.
 *
 * @param calls   Current frame draw call count
 * @param budget  Maximum allowed draw calls
 */
export function drawCallHeadroom(calls: number, budget: number = DRAW_CALL_BUDGET): number {
  return budget - calls;
}
