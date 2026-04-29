/**
 * CraftingPanel — the production half of the production/consumption
 * loop, *and* the entry point for the placement half. One surface,
 * one mental model.
 *
 * The panel is a SolidJS overlay opened by the `open-craft` action
 * when the player is near a `CraftingStationActor`. It lists every
 * known recipe whose `station` matches the open station and shows
 * each recipe's craftable status (green/red border, missing-input
 * tooltip). Clicking a craftable recipe consumes the inputs, adds the
 * output to inventory, and — for blueprints — kicks the player into
 * place mode (the panel closes itself and the runtime takes over the
 * ghost preview).
 *
 * Wired-up surface area:
 *   - `open` / `onClose` — visibility state, owned by the runtime.
 *   - `stationId` — which station the player is at.
 *   - `worldId` — current save slot, needed for inventory + known
 *                 recipes lookups.
 *   - `onPickBlueprint(blueprintId)` — runtime-supplied callback that
 *                                      transitions place mode to the
 *                                      newly produced blueprint.
 *
 * No reactivity tricks beyond `createSignal` + a `refresh` counter.
 * The DB is the source of truth; the panel re-reads on every craft +
 * every open.
 */

import { createMemo, createSignal, For, onMount, Show } from "solid-js";
import { playSound } from "@/audio";
import { COLORS } from "@/config/config";
import { type AppDatabase, getDb } from "@/db/client";
import { inventoryRepo, recipesRepo } from "@/db/repos";
import {
  type CraftableStatus,
  craftRecipe,
  evaluateRecipe,
  type InventorySnapshot,
  listRecipesForStation,
  type Recipe,
} from "@/game/crafting";

export interface CraftingPanelProps {
  /** Whether the panel is mounted as visible. */
  open: boolean;
  /** Called when the panel should close (X button, Escape). */
  onClose: () => void;
  /** Station id the player is currently next to. */
  stationId: string;
  /** Current save's world id, for `inventoryRepo` + `recipesRepo` calls. */
  worldId: string;
  /**
   * Called after a successful craft whose output is a blueprint. The
   * runtime kicks off place mode in response. Item-output crafts do
   * not call this.
   */
  onPickBlueprint?: (blueprintId: string) => void;
}

/** Read inventory rows out of the DB and shape them into the pure-fn snapshot. */
function snapshotInventory(
  db: AppDatabase,
  worldId: string,
): InventorySnapshot {
  const rows = inventoryRepo.listItems(db, worldId);
  const counts: Record<string, number> = {};
  for (const row of rows) counts[row.itemId] = row.count;
  return { counts };
}

/** Format the input list as "3× material.log + 2× material.stone". */
function formatInputs(recipe: Recipe, inv: InventorySnapshot): string {
  return recipe.inputs
    .map((i) => {
      const have = inv.counts[i.itemId] ?? 0;
      return `${i.count}× ${i.itemId} (have ${have})`;
    })
    .join(" + ");
}

const STATUS_COLOR: Record<CraftableStatus, string> = {
  craftable: COLORS.leafLight,
  "missing-inputs": COLORS.earthRed,
  "unknown-recipe": COLORS.silver,
  "wrong-station": COLORS.silver,
};

export const CraftingPanel = (props: CraftingPanelProps) => {
  const [refresh, setRefresh] = createSignal(0);

  const db = createMemo(() => {
    try {
      return getDb().db;
    } catch {
      return null;
    }
  });

  const knownRecipeIds = createMemo<ReadonlySet<string>>(() => {
    // Re-evaluate whenever `refresh` ticks or the panel reopens.
    refresh();
    if (!props.open) return new Set();
    const handle = db();
    if (!handle) return new Set();
    return new Set(
      recipesRepo
        .listKnownRecipes(handle, props.worldId)
        .map((r) => r.recipeId),
    );
  });

  const inventory = createMemo<InventorySnapshot>(() => {
    refresh();
    if (!props.open) return { counts: {} };
    const handle = db();
    if (!handle) return { counts: {} };
    return snapshotInventory(handle, props.worldId);
  });

  const recipes = createMemo<Recipe[]>(() => {
    if (!props.open) return [];
    return listRecipesForStation(props.stationId).slice();
  });

  const status = (recipe: Recipe): CraftableStatus =>
    evaluateRecipe(recipe, inventory(), {
      currentStation: props.stationId,
      isKnown: knownRecipeIds().has(recipe.id),
    });

  const onCraft = (recipe: Recipe) => {
    const handle = db();
    if (!handle) return;
    const ctx = {
      currentStation: props.stationId,
      isKnown: knownRecipeIds().has(recipe.id),
    };
    const evalStatus = evaluateRecipe(recipe, inventory(), ctx);
    if (evalStatus !== "craftable") {
      playSound("ui.cancel");
      return;
    }
    const result = craftRecipe(recipe, inventory(), ctx);
    // Persist the inventory delta. We don't compute it from the
    // CraftResult diff — instead we re-apply the recipe's known
    // inputs/output against the repo so the SQL row math matches
    // exactly what the pure function did.
    for (const input of recipe.inputs) {
      inventoryRepo.removeItem(
        handle,
        props.worldId,
        input.itemId,
        input.count,
      );
    }
    inventoryRepo.addItem(
      handle,
      props.worldId,
      recipe.output.id,
      recipe.output.count,
    );
    playSound("ui.confirm");
    setRefresh((n) => n + 1);

    if (result.produced.kind === "blueprint" && props.onPickBlueprint) {
      props.onPickBlueprint(result.produced.id);
      props.onClose();
    }
  };

  return (
    <Show when={props.open}>
      <div
        ref={(el) => onMount(() => el?.focus())}
        role="dialog"
        aria-modal="true"
        aria-label="Crafting"
        tabIndex={-1}
        style={{
          position: "fixed",
          inset: "0",
          display: "flex",
          "align-items": "center",
          "justify-content": "center",
          "z-index": "100",
        }}
        onKeyDown={(event) => {
          if (event.key === "Escape") {
            props.onClose();
            return;
          }
          if (event.key === "Tab") {
            const focusable = Array.from(
              event.currentTarget.querySelectorAll<HTMLElement>(
                'button:not([disabled]), [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
              ),
            ).filter((el) => el.tabIndex >= 0);
            if (focusable.length === 0) return;
            const first = focusable[0];
            const last = focusable[focusable.length - 1];
            const atFirst =
              document.activeElement === first ||
              document.activeElement === event.currentTarget;
            if (event.shiftKey && atFirst) {
              event.preventDefault();
              last.focus();
            } else if (!event.shiftKey && document.activeElement === last) {
              event.preventDefault();
              first.focus();
            }
          }
        }}
      >
        {/* Backdrop is a real button so accessibility tooling treats it as
            interactive (keyboard + click both natively supported). */}
        <button
          type="button"
          aria-label="Close crafting panel"
          tabIndex={-1}
          onClick={props.onClose}
          style={{
            position: "absolute",
            inset: "0",
            background: `${COLORS.soilDark}88`,
            border: "none",
            padding: "0",
            cursor: "default",
          }}
        />
        <div
          style={{
            position: "relative",
            "z-index": "1",
            "min-width": "360px",
            "max-width": "560px",
            width: "90vw",
            "max-height": "80vh",
            overflow: "auto",
            background: COLORS.parchment,
            border: `3px solid ${COLORS.barkBrown}`,
            "border-radius": "16px",
            padding: "16px",
            "box-shadow": "0 8px 32px rgba(26, 58, 42, 0.25)",
            "font-family": "Nunito, sans-serif",
          }}
        >
          <header
            style={{
              display: "flex",
              "justify-content": "space-between",
              "align-items": "center",
              "margin-bottom": "12px",
            }}
          >
            <h2
              style={{
                margin: "0",
                "font-family": "Fredoka, sans-serif",
                color: COLORS.forestGreen,
              }}
            >
              Crafting — {props.stationId}
            </h2>
            <button
              type="button"
              onClick={() => props.onClose()}
              style={{
                background: "transparent",
                border: "none",
                "font-size": "24px",
                cursor: "pointer",
                color: COLORS.barkBrown,
              }}
              aria-label="Close crafting"
            >
              ×
            </button>
          </header>

          <Show
            when={recipes().length > 0}
            fallback={
              <p style={{ color: COLORS.soilDark }}>
                No recipes registered for this station.
              </p>
            }
          >
            <ul style={{ "list-style": "none", padding: "0", margin: "0" }}>
              <For each={recipes()}>
                {(recipe) => {
                  const recipeStatus = () => status(recipe);
                  const known = () => knownRecipeIds().has(recipe.id);
                  return (
                    <Show when={known()}>
                      <li
                        style={{
                          border: `2px solid ${STATUS_COLOR[recipeStatus()]}`,
                          "border-radius": "8px",
                          padding: "10px",
                          "margin-bottom": "8px",
                          background: "white",
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            "justify-content": "space-between",
                            "align-items": "center",
                          }}
                        >
                          <strong style={{ color: COLORS.forestGreen }}>
                            {recipe.name}
                          </strong>
                          <button
                            type="button"
                            onClick={() => onCraft(recipe)}
                            disabled={recipeStatus() !== "craftable"}
                            style={{
                              background:
                                recipeStatus() === "craftable"
                                  ? `linear-gradient(180deg, ${COLORS.leafLight} 0%, ${COLORS.forestGreen} 100%)`
                                  : COLORS.silver,
                              color: COLORS.parchment,
                              border:
                                recipeStatus() === "craftable"
                                  ? `2px solid ${COLORS.soilDark}`
                                  : "2px solid transparent",
                              "border-radius": "8px",
                              padding: "6px 14px",
                              cursor:
                                recipeStatus() === "craftable"
                                  ? "pointer"
                                  : "not-allowed",
                              "font-weight": "bold",
                              "min-height": "44px",
                              "min-width": "60px",
                              "box-shadow":
                                recipeStatus() === "craftable"
                                  ? `0 4px 12px ${COLORS.forestGreen}60`
                                  : "none",
                            }}
                            aria-label={`Craft ${recipe.name}`}
                          >
                            Craft
                          </button>
                        </div>
                        <Show when={recipe.description}>
                          <p
                            style={{
                              margin: "4px 0",
                              color: COLORS.soilDark,
                              "font-size": "14px",
                            }}
                          >
                            {recipe.description}
                          </p>
                        </Show>
                        <p
                          style={{
                            margin: "4px 0 0",
                            "font-size": "12px",
                            color: COLORS.soilDark,
                          }}
                        >
                          {formatInputs(recipe, inventory())} →{" "}
                          {recipe.output.count}× {recipe.output.id}
                        </p>
                      </li>
                    </Show>
                  );
                }}
              </For>
            </ul>
          </Show>
        </div>
      </div>
    </Show>
  );
};
