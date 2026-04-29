import { createMemo, For, Show } from "solid-js";
import { COLORS } from "@/config/config";
import { getDb, isDbInitialized } from "@/db/client";
import { inventoryRepo } from "@/db/repos";
import { eventBus } from "@/runtime/eventBus";

const ITEM_META: Record<string, { icon: string; label: string }> = {
  "material.log": { icon: "\u{1FAB5}", label: "Log" },
  "material.stone": { icon: "\u{1FAA8}", label: "Stone" },
  "material.plank": { icon: "\u{1F4E6}", label: "Plank" },
  "material.fiber": { icon: "\u{1F33F}", label: "Fiber" },
  "material.fern": { icon: "\u{1F343}", label: "Fern" },
  "material.sand": { icon: "\u{23F3}", label: "Sand" },
  "material.shell": { icon: "\u{1F41A}", label: "Shell" },
  "material.coral": { icon: "\u{1FAB8}", label: "Coral" },
  "material.seagrass": { icon: "\u{1F33E}", label: "Seagrass" },
  "material.mushroom": { icon: "\u{1F344}", label: "Mushroom" },
  "material.wildflower": { icon: "\u{1F338}", label: "Wildflower" },
  "material.dirt": { icon: "\u{1F7EB}", label: "Dirt" },
};

const WORLD_ID = "rc-world-default";

export const InventoryHUD = () => {
  // Track inventoryVersion as a reactive dependency so we re-query on change.
  const items = createMemo(() => {
    void eventBus.inventoryVersion();
    if (!isDbInitialized()) return [];
    try {
      const rows = inventoryRepo.listItems(getDb().db, WORLD_ID);
      return rows
        .filter((r) => r.count > 0 && r.itemId in ITEM_META)
        .sort((a, b) => a.itemId.localeCompare(b.itemId));
    } catch {
      return [];
    }
  });

  return (
    <Show when={items().length > 0}>
      <div
        role="region"
        aria-label="Inventory"
        class="flex flex-wrap gap-1 pointer-events-none"
        style={{
          background: `${COLORS.parchment}e0`,
          border: `2px solid ${COLORS.barkBrown}55`,
          "border-radius": "12px",
          padding: "4px 8px",
          "box-shadow": "0 2px 8px rgba(26, 58, 42, 0.18)",
          "max-width": "200px",
        }}
      >
        <For each={items()}>
          {(row) => {
            const meta = ITEM_META[row.itemId];
            return (
              <div
                role="img"
                class="flex items-center gap-0.5 text-xs font-bold tabular-nums"
                aria-label={`${meta.label}: ${row.count}`}
                style={{ color: COLORS.soilDark }}
              >
                <span aria-hidden="true" style={{ "font-size": "0.85rem" }}>
                  {meta.icon}
                </span>
                <span>{row.count}</span>
              </div>
            );
          }}
        </For>
      </div>
    </Show>
  );
};
