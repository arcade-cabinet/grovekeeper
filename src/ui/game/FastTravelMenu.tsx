/**
 * FastTravelMenu — Sub-wave A.
 *
 * Solid overlay that lists every claimed grove as a clickable card.
 * Selecting a card asks the host to teleport. The list is supplied
 * by the host (it owns the DB handle); this component is purely
 * presentational.
 *
 * Spec ref: `docs/superpowers/specs/2026-04-24-grovekeeper-rc-redesign-design.md`
 *   §"Fast travel" — claimed groves are nodes; selecting one warps
 *   the player to that grove's centre.
 */

import { For, onMount, Show } from "solid-js";
import { COLORS } from "@/config/config";
import type { ClaimedGroveNode } from "@/game/scene/fastTravel";

const BIOME_ICON: Record<string, string> = {
  meadow: "🌾",
  forest: "🌲",
  coast: "🌊",
  grove: "🌳",
};

export interface FastTravelMenuProps {
  /** Whether the menu is mounted. The host controls visibility. */
  open: boolean;
  /** All claimed groves the player can teleport to. */
  groves: readonly ClaimedGroveNode[];
  /** Player picks a grove. */
  onSelect: (grove: ClaimedGroveNode) => void;
  /** Player closes the menu without picking. */
  onClose: () => void;
}

export function FastTravelMenu(props: Readonly<FastTravelMenuProps>) {
  return (
    <Show when={props.open}>
      <div
        ref={(el) => onMount(() => el?.focus())}
        role="dialog"
        aria-modal="true"
        aria-label="Fast Travel"
        data-testid="fast-travel-menu"
        tabIndex={-1}
        style={{
          position: "fixed",
          inset: "0",
          display: "flex",
          "align-items": "center",
          "justify-content": "center",
          "z-index": "8000",
        }}
        onKeyDown={(e) => {
          if (e.key === "Escape") {
            props.onClose();
            return;
          }
          if (e.key === "Tab") {
            const focusable = Array.from(
              e.currentTarget.querySelectorAll<HTMLElement>(
                'button:not([disabled]), [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
              ),
            ).filter((el) => el.tabIndex >= 0);
            if (focusable.length === 0) return;
            const first = focusable[0];
            const last = focusable[focusable.length - 1];
            if (e.shiftKey && document.activeElement === first) {
              e.preventDefault();
              last.focus();
            } else if (!e.shiftKey && document.activeElement === last) {
              e.preventDefault();
              first.focus();
            }
          }
        }}
      >
        {/* Backdrop is a real button so accessibility tooling treats it as
            interactive (keyboard + click both natively supported). */}
        <button
          type="button"
          aria-label="Dismiss fast travel menu backdrop"
          tabIndex={-1}
          data-testid="fast-travel-backdrop"
          onClick={props.onClose}
          style={{
            position: "absolute",
            inset: "0",
            background: `${COLORS.soilDark}99`,
            border: "none",
            padding: "0",
            cursor: "default",
          }}
        />
        <div
          style={{
            position: "relative",
            "z-index": "1",
            background: COLORS.parchment,
            color: COLORS.soilDark,
            padding: "1.25rem",
            "border-radius": "1rem",
            border: `3px solid ${COLORS.barkBrown}`,
            "min-width": "20rem",
            "max-width": "32rem",
            "max-height": "70vh",
            overflow: "auto",
            "box-shadow": `0 8px 32px ${COLORS.soilDark}60`,
            font: "16px/1.4 Nunito, system-ui, -apple-system, sans-serif",
          }}
        >
          <header
            style={{
              display: "flex",
              "justify-content": "space-between",
              "align-items": "baseline",
              "margin-bottom": "0.75rem",
            }}
          >
            <h2
              style={{
                margin: "0",
                "font-size": "1.25rem",
                "font-family": "Fredoka, var(--font-heading), sans-serif",
                color: COLORS.forestGreen,
              }}
            >
              Fast Travel
            </h2>
            <button
              type="button"
              onClick={() => props.onClose()}
              aria-label="Close fast travel menu"
              style={{
                background: "transparent",
                color: COLORS.barkBrown,
                border: `2px solid ${COLORS.barkBrown}`,
                padding: "0.25rem 0.6rem",
                "border-radius": "0.4rem",
                cursor: "pointer",
                "min-width": "44px",
                "min-height": "44px",
                "font-size": "1.25rem",
              }}
            >
              ×
            </button>
          </header>

          <Show
            when={props.groves.length > 0}
            fallback={
              <p style={{ opacity: "0.75", margin: "0" }}>
                No groves claimed yet. Light a hearth to add one.
              </p>
            }
          >
            <ul
              style={{
                "list-style": "none",
                margin: "0",
                padding: "0",
                display: "flex",
                "flex-direction": "column",
                gap: "0.5rem",
              }}
            >
              <For each={props.groves}>
                {(grove) => (
                  <li>
                    <button
                      type="button"
                      data-testid={`fast-travel-grove-${grove.groveId}`}
                      onClick={() => props.onSelect(grove)}
                      style={{
                        display: "flex",
                        "align-items": "center",
                        gap: "0.75rem",
                        width: "100%",
                        padding: "0.75rem",
                        background: `${COLORS.parchmentDark}`,
                        color: COLORS.soilDark,
                        border: `2px solid ${COLORS.forestGreen}`,
                        "border-radius": "0.5rem",
                        cursor: "pointer",
                        "min-height": "44px",
                        "text-align": "left",
                        font: "inherit",
                        "box-shadow": `0 2px 8px ${COLORS.forestGreen}30`,
                      }}
                    >
                      <span
                        aria-hidden="true"
                        style={{ "font-size": "1.5rem" }}
                      >
                        {BIOME_ICON[grove.biome] ?? "📍"}
                      </span>
                      <span
                        style={{
                          display: "flex",
                          "flex-direction": "column",
                          gap: "0.125rem",
                        }}
                      >
                        <strong>{grove.name}</strong>
                        <span style={{ opacity: "0.75", "font-size": "14px" }}>
                          {grove.biome}
                        </span>
                      </span>
                    </button>
                  </li>
                )}
              </For>
            </ul>
          </Show>
        </div>
      </div>
    </Show>
  );
}
