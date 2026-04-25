/**
 * HearthPrompt — Sub-wave D.
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
            "background-color": "rgba(20, 30, 20, 0.85)",
            color: "#f3eed1",
            padding: "0.5rem 0.875rem",
            "border-radius": "0.5rem",
            "font-size": "0.95rem",
            "font-family": "Nunito, ui-sans-serif, system-ui, sans-serif",
            "pointer-events": "none",
            border: "1px solid rgba(243, 238, 209, 0.25)",
            "box-shadow": "0 4px 20px rgba(0, 0, 0, 0.35)",
            "z-index": "30",
          }}
        >
          {COPY[ev().variant]}
        </div>
      )}
    </Show>
  );
}
