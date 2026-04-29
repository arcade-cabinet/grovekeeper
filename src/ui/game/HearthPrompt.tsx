/**
 * HearthPrompt.
 *
 * Tiny diegetic overlay that surfaces "Press E to light" / "Press E for
 * fast travel" when the player walks within range of a placed hearth.
 * Reads `eventBus.hearthPrompt()` directly; the runtime emits or
 * clears the signal each frame via `pickHearthPrompt(...)`.
 *
 * No modal. No focus trap. The player ignores it by walking away — the
 * prompt clears itself on the next out-of-range tick.
 */

import { Show } from "solid-js";
import { COLORS } from "@/config/config";
import { eventBus } from "@/runtime/eventBus";

const COPY: Readonly<Record<"light" | "fast-travel", string>> = {
  light: "Press E to light the hearth",
  "fast-travel": "Press E for fast travel",
};

export function HearthPrompt() {
  return (
    <Show when={eventBus.hearthPrompt()}>
      {(ev) => (
        <div
          data-testid="hearth-prompt"
          aria-live="polite"
          style={{
            position: "fixed",
            left: "50%",
            bottom: "8rem",
            transform: "translateX(-50%)",
            background: `${COLORS.parchment}f0`,
            color: COLORS.soilDark,
            padding: "0.5rem 0.875rem",
            "border-radius": "0.5rem",
            "font-size": "0.95rem",
            "font-weight": "600",
            "font-family": "Nunito, ui-sans-serif, system-ui, sans-serif",
            "pointer-events": "none",
            border: `2px solid ${COLORS.barkBrown}`,
            "box-shadow": `0 4px 20px ${COLORS.soilDark}40, 0 0 16px ${COLORS.autumnGold}30`,
            "z-index": "30",
          }}
        >
          {COPY[ev().variant]}
        </div>
      )}
    </Show>
  );
}
