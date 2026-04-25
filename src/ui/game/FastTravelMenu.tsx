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

import { For, Show } from "solid-js";
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
        role="dialog"
        aria-modal="true"
        aria-label="Fast Travel"
        data-testid="fast-travel-menu"
        tabIndex={-1}
        style={{
          position: "fixed",
          inset: "0",
          "background-color": "rgba(0, 0, 0, 0.55)",
          display: "flex",
          "align-items": "center",
          "justify-content": "center",
          "z-index": "8000",
        }}
        onClick={(e) => {
          // Click-outside dismiss — only if the click is on the
          // backdrop (this exact div) and not a child.
          if (e.target === e.currentTarget) props.onClose();
        }}
        onKeyDown={(e) => {
          if (e.key === "Escape") props.onClose();
        }}
      >
        <div
          style={{
            "background-color": "#1f2a1f",
            color: "#f3eed1",
            padding: "1.25rem",
            "border-radius": "0.75rem",
            "min-width": "20rem",
            "max-width": "32rem",
            "max-height": "70vh",
            overflow: "auto",
            "box-shadow": "0 8px 32px rgba(0, 0, 0, 0.6)",
            font: "16px/1.4 system-ui, -apple-system, sans-serif",
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
            <h2 style={{ margin: "0", "font-size": "1.25rem" }}>Fast Travel</h2>
            <button
              type="button"
              onClick={() => props.onClose()}
              aria-label="Close fast travel menu"
              style={{
                background: "transparent",
                color: "#f3eed1",
                border: "1px solid #f3eed1",
                padding: "0.25rem 0.6rem",
                "border-radius": "0.4rem",
                cursor: "pointer",
                "min-width": "44px",
                "min-height": "44px",
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
                        "background-color": "#2c3a2c",
                        color: "#f3eed1",
                        border: "1px solid #4a5a4a",
                        "border-radius": "0.5rem",
                        cursor: "pointer",
                        "min-height": "44px",
                        "text-align": "left",
                        font: "inherit",
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
                        <small style={{ opacity: "0.75" }}>{grove.biome}</small>
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
