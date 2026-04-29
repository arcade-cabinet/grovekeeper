/**
 * InteractCuePrompt — diegetic teaching cue.
 *
 * Renders a small contextual label at the bottom of the screen when
 * `eventBus.interactCue()` is non-null. The runtime emits the signal
 * whenever the player is near an interactable thing (workbench, placement
 * anchor) and clears it when they walk away or act.
 *
 * No focus, no modal — the player ignores it by walking away.
 */

import { Show } from "solid-js";
import { COLORS } from "@/config/config";
import { eventBus } from "@/runtime/eventBus";

export function InteractCuePrompt() {
  return (
    <Show when={eventBus.interactCue()}>
      {(ev) => (
        <div
          data-testid="interact-cue"
          aria-live="polite"
          style={{
            position: "fixed",
            left: "50%",
            bottom: "5.5rem",
            transform: "translateX(-50%)",
            background: `${COLORS.parchment}f0`,
            color: COLORS.soilDark,
            padding: "0.4rem 0.75rem",
            "border-radius": "0.5rem",
            "font-size": "0.875rem",
            "font-weight": "600",
            "font-family": "Nunito, ui-sans-serif, system-ui, sans-serif",
            "pointer-events": "none",
            border: `2px solid ${COLORS.barkBrown}`,
            "box-shadow": `0 2px 12px ${COLORS.soilDark}30`,
            "z-index": "30",
          }}
        >
          {ev().label}
        </div>
      )}
    </Show>
  );
}
