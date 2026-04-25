/**
 * RetreatOverlay — Wave 14/15.
 *
 * Full-viewport black fade panel driven by the retreat phase signal
 * on `eventBus`. Mounted unconditionally; opacity goes 0 → 1 → 0
 * across `fade-out → hold → fade-in`. While opacity is below ~5%, the
 * overlay disables pointer-events so it never blocks input on idle.
 *
 * Spec ref: `docs/superpowers/specs/2026-04-24-grovekeeper-rc-redesign-design.md`
 *   §"Combat and encounters" — out-of-stamina or out-of-HP forces
 *   retreat with a faded screen transition.
 */

import { eventBus } from "@/runtime/eventBus";

export function RetreatOverlay() {
  const opacity = eventBus.retreatOpacity;
  return (
    <div
      aria-hidden="true"
      style={{
        position: "fixed",
        inset: "0",
        "background-color": "#000",
        opacity: String(opacity()),
        "pointer-events": opacity() > 0.05 ? "all" : "none",
        transition: "opacity 16ms linear",
        "z-index": "9000",
      }}
    />
  );
}
