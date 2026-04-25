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

import { createMemo, createSignal, For, Show } from "solid-js";
import { playSound } from "@/audio";
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
  craftable: "#7BB661",
  "missing-inputs": "#A35A3F",
  "unknown-recipe": "#888",
  "wrong-station": "#888",
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
          background: "rgba(0,0,0,0.5)",
          "z-index": "100",
        }}
        onClick={(event) => {
          // Click on the backdrop closes; clicks on the panel itself
          // bubble up to here but `event.target === event.currentTarget`
          // discriminates the backdrop.
          if (event.target === event.currentTarget) props.onClose();
        }}
        onKeyDown={(event) => {
          if (event.key === "Escape") props.onClose();
        }}
      >
        <div
          style={{
            "min-width": "360px",
            "max-width": "560px",
            width: "90vw",
            "max-height": "80vh",
            overflow: "auto",
            background: "#F5EBD7",
            border: "3px solid #5C3A1E",
            "border-radius": "12px",
            padding: "16px",
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
                color: "#3F6B3A",
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
                color: "#5C3A1E",
              }}
              aria-label="Close crafting"
            >
              ×
            </button>
          </header>

          <Show
            when={recipes().length > 0}
            fallback={
              <p style={{ color: "#5C3A1E" }}>
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
                          <strong style={{ color: "#3F6B3A" }}>
                            {recipe.name}
                          </strong>
                          <button
                            type="button"
                            onClick={() => onCraft(recipe)}
                            disabled={recipeStatus() !== "craftable"}
                            style={{
                              background:
                                recipeStatus() === "craftable"
                                  ? "#7BB661"
                                  : "#cccccc",
                              color: "white",
                              border: "none",
                              "border-radius": "6px",
                              padding: "6px 14px",
                              cursor:
                                recipeStatus() === "craftable"
                                  ? "pointer"
                                  : "not-allowed",
                              "font-weight": "bold",
                              "min-height": "44px",
                              "min-width": "60px",
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
                              color: "#5C3A1E",
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
                            color: "#5C3A1E",
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
