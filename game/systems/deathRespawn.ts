/**
 * Death/Respawn system — handles death screen routing, resource loss, and
 * respawn position computation.
 *
 * Pure functions + one side-effectful integration (applyDeathPenalty).
 * All tuning values from config/game/survival.json and config/game/difficulty.json.
 *
 * Spec §12.3 (death trigger), §12.5 (respawn at campfire), §2.1 (difficulty tiers).
 */

import { batch } from "@legendapp/state";
import difficultyConfig from "@/config/game/difficulty.json" with { type: "json" };
import survivalConfig from "@/config/game/survival.json" with { type: "json" };
import type { ResourceType } from "@/game/config/resources";
import { emptyResources } from "@/game/config/resources";
import type { GameScreen } from "@/game/stores/core";
import { gameState$, getState } from "@/game/stores/core";

// ---------------------------------------------------------------------------
// Config values from survival.json (Spec §12.3, §12.5)
// ---------------------------------------------------------------------------

const DEATH_RESOURCE_LOSS_FRACTION: number = survivalConfig.deathResourceLossFraction;
const DEATH_HUNGER_RESET_FRACTION: number = survivalConfig.deathHungerResetFraction;
const DEATH_RESPAWN_HEARTS: number = survivalConfig.deathRespawnHearts;
const DEATH_RESPAWN_BODY_TEMP: number = survivalConfig.deathRespawnBodyTemp;
const DEFAULT_RESPAWN: { x: number; y: number; z: number } = survivalConfig.defaultRespawnPosition;

// ---------------------------------------------------------------------------
// Difficulty lookup
// ---------------------------------------------------------------------------

interface DiffEntry {
  id: string;
  permadeathForced: string;
}

const difficulties = difficultyConfig as DiffEntry[];

// ---------------------------------------------------------------------------
// Pure functions
// ---------------------------------------------------------------------------

/**
 * Determine which screen to show on player death.
 *
 * Ironwood always permadeath. Hardwood/Sapling respect the permadeath flag.
 * Seedling permadeathForced === "off", so always normal death.
 *
 * Spec §2.1, §12.3.
 */
export function computeDeathScreen(difficultyId: string, permadeathFlag: boolean): GameScreen {
  const diff = difficulties.find((d) => d.id === difficultyId);

  // Ironwood: forced permadeath regardless of flag
  if (diff?.permadeathForced === "on") return "permadeath";

  // Seedling: forced off regardless of flag
  if (diff?.permadeathForced === "off") return "death";

  // Optional tiers (sapling, hardwood): respect player choice
  if (permadeathFlag) return "permadeath";

  return "death";
}

/**
 * Compute how many of each resource the player loses on death.
 * Returns a new resource record with the loss amounts (always >= 0, floored).
 *
 * Spec §12.3: "Drop carried resources" — we lose a configurable fraction.
 */
export function computeResourceLoss(
  resources: Record<ResourceType, number>,
  lossFraction: number,
): Record<ResourceType, number> {
  const result = emptyResources();
  for (const key of Object.keys(resources) as ResourceType[]) {
    result[key] = Math.floor(resources[key] * lossFraction);
  }
  return result;
}

/**
 * Compute the respawn position — last campfire or default spawn.
 * Spec §12.5: respawn at last campfire.
 */
export function computeRespawnPosition(
  lastCampfirePosition: { x: number; y: number; z: number } | null,
): { x: number; y: number; z: number } {
  if (lastCampfirePosition) return { ...lastCampfirePosition };
  return { ...DEFAULT_RESPAWN };
}

// ---------------------------------------------------------------------------
// Side-effectful: apply full death penalty to store
// ---------------------------------------------------------------------------

/**
 * Apply the full death penalty to the game store.
 *
 * For non-permadeath: reset vitals, deduct resources, set screen to "death".
 * For permadeath: reset vitals + level/XP + campfire, set screen to "permadeath".
 *
 * Spec §12.3, §12.5, §2.1.
 */
export function applyDeathPenalty(): void {
  const state = getState();
  const screen = computeDeathScreen(state.difficulty, state.permadeath);
  const isPermadeath = screen === "permadeath";

  // Compute resource loss
  const loss = computeResourceLoss(state.resources, DEATH_RESOURCE_LOSS_FRACTION);
  const newResources = { ...state.resources };
  for (const key of Object.keys(loss) as ResourceType[]) {
    newResources[key] = Math.max(0, newResources[key] - loss[key]);
  }

  batch(() => {
    // Reset vitals
    gameState$.hearts.set(DEATH_RESPAWN_HEARTS);
    gameState$.hunger.set(state.maxHunger * DEATH_HUNGER_RESET_FRACTION);
    gameState$.bodyTemp.set(DEATH_RESPAWN_BODY_TEMP);

    // Apply resource loss
    gameState$.resources.set(newResources);

    // Set death/permadeath screen
    gameState$.screen.set(screen);

    // Permadeath extra penalties
    if (isPermadeath) {
      gameState$.level.set(1);
      gameState$.xp.set(0);
      gameState$.lastCampfireId.set(null);
      gameState$.lastCampfirePosition.set(null);
    }
  });
}
