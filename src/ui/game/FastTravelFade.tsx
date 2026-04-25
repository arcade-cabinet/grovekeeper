/**
 * FastTravelFade — Sub-wave D.
 *
 * Black-fade overlay driven by `eventBus.fastTravelFadeOpacity()`.
 * The runtime's `FastTravelController` ticks the signal between 0 and
 * 1 to fade out, hold black during the teleport, and fade back in.
 *
 * Mounted unconditionally; opacity 0 with `pointer-events: none` makes
 * it invisible and click-through when idle.
 */

import { eventBus } from "@/runtime/eventBus";

export function FastTravelFade() {
  return (
    <div
      data-testid="fast-travel-fade"
      aria-hidden="true"
      style={{
        position: "fixed",
        inset: "0",
        "background-color": "#000",
        "pointer-events": "none",
        "z-index": "40",
        get opacity() {
          return String(eventBus.fastTravelFadeOpacity());
        },
        transition: "opacity 60ms linear",
      }}
    />
  );
}
