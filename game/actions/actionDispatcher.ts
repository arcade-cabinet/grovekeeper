/**
 * actionDispatcher -- Action dispatch system (Spec §11, §22, §35).
 *
 * Maps tool type + target entity type to a game verb (DIG/CHOP/WATER/PLANT/PRUNE/FERTILIZE
 * plus crafting: COOK/FORGE/MINE/FISH/PLACE_TRAP/CHECK_TRAP/BUILD) and executes
 * the corresponding system function.
 *
 * Pure `resolveAction` is exported as a testable seam separate from side-effecting
 * `dispatchAction`, following the pattern established in TargetInfo.tsx and ToolViewModel.tsx.
 */

import combatConfig from "@/config/game/combat.json" with { type: "json" };
import {
  clearRock,
  fertilizeTree,
  harvestTree,
  plantTree,
  pruneTree,
  waterTree,
} from "@/game/actions";
import { getDifficultyById } from "@/game/config/difficulty";
import type { ResourceType } from "@/game/config/resources";
import type { CombatComponent } from "@/game/ecs/components/combat";
import type { RockComponent } from "@/game/ecs/components/terrain";
import type { Entity } from "@/game/ecs/world";
import { enemiesQuery } from "@/game/ecs/world";
import type { RaycastEntityType } from "@/game/hooks/useRaycast";
import { useGameStore } from "@/game/stores";
import { audioManager } from "@/game/systems/AudioManager";
import { resolveCampfireInteraction } from "@/game/systems/cooking";
import { isWaterFishable } from "@/game/systems/fishing";
import { resolveForgeInteraction } from "@/game/systems/forging";
import { type ToolAction, triggerActionHaptic } from "@/game/systems/haptics";
import { mineRock, resolveMiningInteraction } from "@/game/systems/mining";
import { executePlayerAttack, resolvePlayerAttack } from "@/game/systems/playerAttack";
import { createTrapComponent } from "@/game/systems/traps";
import { scopedRNG } from "@/game/utils/seedWords";
import type { BiomeType } from "@/game/world/biomeMapper";

// Re-export interaction resolvers so callers (useInteraction, TargetInfo) can import
// from a single dispatcher module rather than each crafting system file.
export { resolveCampfireInteraction } from "@/game/systems/cooking";
export { resolveForgeInteraction } from "@/game/systems/forging";
export { resolveMiningInteraction } from "@/game/systems/mining";

// ---------------------------------------------------------------------------
// Module-scope player attack cooldown tracker (Spec §34.4.4)
//
// The player entity may not have a CombatComponent in all scene configurations.
// This module-level CombatComponent is used as a session-local fallback for
// tracking player attack cooldown across dispatchAction calls.
// The game loop's tickAttackCooldown ticks enemy combat components via combatQuery;
// the player's cooldown is ticked separately via tickPlayerAttackCooldown() which
// callers invoke from the game loop.
// ---------------------------------------------------------------------------

/** Module-scope player combat component used for attack rate limiting. */
export const _playerCombatRef: CombatComponent = {
  attackPower: 5,
  defense: 0,
  attackRange: combatConfig.playerAttackRange,
  attackCooldown: combatConfig.playerAttackCooldown,
  cooldownRemaining: 0,
  blocking: false,
};

/**
 * Tick the player's module-level attack cooldown.
 * Call from useGameLoop each frame alongside tickAttackCooldown for enemies.
 * Spec §34.4.4.
 */
export function tickPlayerAttackCooldown(dt: number): void {
  _playerCombatRef.cooldownRemaining = Math.max(0, _playerCombatRef.cooldownRemaining - dt);
}

/**
 * Reset the module-scope player combat ref (used for tests and new game).
 */
export function resetPlayerAttackCooldown(): void {
  _playerCombatRef.cooldownRemaining = 0;
}

// ---------------------------------------------------------------------------
// Module-scope attack trigger counter (Spec §34.4.5)
//
// Increments each time dispatchAction succeeds for ATTACK.
// Consumed by ProceduralToolView via useAttackTrigger() to fire the swing
// animation. Uses the same useSyncExternalStore pattern as useTargetHit().
// ---------------------------------------------------------------------------

let _attackTriggerCount = 0;
const _attackTriggerListeners = new Set<() => void>();

function _getAttackTrigger(): number {
  return _attackTriggerCount;
}

function _subscribeAttackTrigger(listener: () => void): () => void {
  _attackTriggerListeners.add(listener);
  return () => _attackTriggerListeners.delete(listener);
}

/** Increment the attack trigger counter. Called by dispatchAction on ATTACK success. */
function _bumpAttackTrigger(): void {
  _attackTriggerCount += 1;
  for (const l of _attackTriggerListeners) l();
}

/**
 * Returns a counter that increments each time the player successfully swings a melee weapon.
 * Pass as `attackTrigger` to ProceduralToolView (Spec §34.4.5).
 *
 * Must be called from a React component (uses useSyncExternalStore).
 */
export { _getAttackTrigger, _subscribeAttackTrigger };

/** Reset attack trigger count (used for tests). */
export function resetAttackTrigger(): void {
  _attackTriggerCount = 0;
}

/** The full set of game verbs mapped by the dispatcher (Spec §11, §22, §34.4, §35). */
export type GameAction =
  | "DIG"
  | "CHOP"
  | "WATER"
  | "PLANT"
  | "PRUNE"
  | "COOK"
  | "FORGE"
  | "MINE"
  | "FISH"
  | "FERTILIZE"
  | "PLACE_TRAP"
  | "CHECK_TRAP"
  | "BUILD"
  | "ATTACK";

/**
 * Superset of RaycastEntityType — includes terrain surface types for ground
 * interactions (DIG/PLANT) that are resolved from hit point grid coordinates,
 * plus crafting station and resource node types.
 */
export type TargetEntityType =
  | RaycastEntityType
  | "soil"
  | "rock"
  | "campfire"
  | "forge"
  | "water"
  | "trap"
  | "enemy";

/** Full context for a dispatched action. */
export interface DispatchContext {
  /** The currently equipped tool. */
  toolId: string;
  /** Category of the thing the player is looking at. null = empty ground. */
  targetType: TargetEntityType | null;
  /** The ECS entity at the crosshair — required for tree/npc/structure/crafting targets. */
  entity?: Entity;
  /** Grid X coordinate — required for PLANT, DIG, MINE, PLACE_TRAP. */
  gridX?: number;
  /** Grid Z coordinate — required for PLANT, DIG, MINE, PLACE_TRAP. */
  gridZ?: number;
  /** Species to plant — required for PLANT. */
  speciesId?: string;
  /**
   * Water body type string (e.g. "ocean", "river", "pond") — required for FISH.
   * Resolved from the WaterBodyComponent of the targeted water entity.
   */
  waterBodyType?: string;
  /**
   * Biome of the chunk containing the target — required for MINE.
   * Resolved from the chunk's BiomeType at dispatch time.
   */
  biome?: string;
  /**
   * Trap type string (e.g. "spike", "net") — required for PLACE_TRAP.
   * Resolved from the player's selected trap item.
   */
  trapType?: string;
}

/**
 * Resolves the game verb for a given tool + target type combination.
 *
 * Returns null when the combination is not a valid interaction
 * (e.g. axe + npc, almanac + tree).
 *
 * Priority order (core grove-tending):
 *   axe          + tree     -> CHOP
 *   watering-can + tree     -> WATER
 *   pruning-shears + tree   -> PRUNE
 *   compost-bin  + tree     -> FERTILIZE
 *   trowel       + soil     -> PLANT
 *   trowel       + null     -> PLANT  (empty ground)
 *   shovel       + rock     -> DIG
 *
 * Crafting / resource (Spec §22):
 *   any          + campfire -> COOK
 *   any          + forge    -> FORGE
 *   pick         + rock     -> MINE
 *   fishing-rod  + water    -> FISH
 *   trap         + soil     -> PLACE_TRAP  (deploy from inventory)
 *   any          + trap     -> CHECK_TRAP  (collect or inspect placed trap)
 *
 * Build mode (Spec §35):
 *   hammer       + null     -> BUILD  (open kitbash panel on empty ground)
 */
export function resolveAction(
  toolId: string,
  targetType: TargetEntityType | null,
): GameAction | null {
  // Melee attack — any melee-capable tool against an enemy entity (Spec §34.4.6)
  if (targetType === "enemy") {
    const attackAction = resolvePlayerAttack(toolId, "enemy");
    if (attackAction) return "ATTACK";
  }

  // Core grove verbs
  if (toolId === "axe" && targetType === "tree") return "CHOP";
  if (toolId === "watering-can" && targetType === "tree") return "WATER";
  if (toolId === "pruning-shears" && targetType === "tree") return "PRUNE";
  if (toolId === "compost-bin" && targetType === "tree") return "FERTILIZE";
  if (toolId === "trowel" && (targetType === "soil" || targetType === null)) return "PLANT";
  if (toolId === "shovel" && targetType === "rock") return "DIG";

  // Crafting station verbs (Spec §22.1, §22.2)
  if (targetType === "campfire") return "COOK";
  if (targetType === "forge") return "FORGE";

  // Mining — pick on rock (Spec §22, distinct from shovel+rock=DIG)
  if (toolId === "pick" && targetType === "rock") return "MINE";

  // Fishing — fishing-rod on water (Spec §22)
  if (toolId === "fishing-rod" && targetType === "water") return "FISH";

  // Traps — deploy from inventory on ground; collect placed trap (Spec §22)
  if (toolId === "trap" && (targetType === "soil" || targetType === null)) return "PLACE_TRAP";
  if (targetType === "trap") return "CHECK_TRAP";

  // Kitbash build mode — hammer on empty ground (Spec §35)
  if (toolId === "hammer" && (targetType === null || targetType === "soil")) return "BUILD";

  return null;
}

/**
 * Dispatches the action resolved from `ctx.toolId` + `ctx.targetType`,
 * calling the correct system function.
 *
 * Returns true on success, false if the combo has no mapping or required
 * context fields are missing (entity id, grid coords, speciesId, etc.).
 *
 * Side effects:
 *   COOK / FORGE / BUILD  — sets store.activeCraftingStation to open the UI panel.
 *   FISH                  — sets store.activeCraftingStation with type "fishing".
 *   PLACE_TRAP            — creates a trap ECS entity via store.placeTrap (if available).
 *   MINE                  — deducts stamina + credits ore to inventory via store.
 *   All successes          — fires triggerActionHaptic.
 */
export function dispatchAction(ctx: DispatchContext): boolean {
  const action = resolveAction(ctx.toolId, ctx.targetType);
  if (!action) return false;

  let success = false;
  const store = useGameStore.getState();

  switch (action) {
    // ── Core grove verbs ───────────────────────────────────────────────────

    case "CHOP": {
      if (!ctx.entity?.id) return false;
      success = harvestTree(ctx.entity.id) !== null;
      if (success) store.advanceTutorial("action:harvest");
      break;
    }
    case "WATER": {
      if (!ctx.entity?.id) return false;
      success = waterTree(ctx.entity.id);
      if (success) store.advanceTutorial("action:water");
      break;
    }
    case "PRUNE": {
      if (!ctx.entity?.id) return false;
      success = pruneTree(ctx.entity.id);
      break;
    }
    case "PLANT": {
      if (ctx.gridX === undefined || ctx.gridZ === undefined || !ctx.speciesId) return false;
      success = plantTree(ctx.speciesId, ctx.gridX, ctx.gridZ);
      if (success) store.advanceTutorial("action:plant");
      break;
    }
    case "DIG": {
      if (ctx.gridX === undefined || ctx.gridZ === undefined) return false;
      success = clearRock(ctx.gridX, ctx.gridZ);
      break;
    }
    case "FERTILIZE": {
      if (!ctx.entity?.id) return false;
      success = fertilizeTree(ctx.entity.id);
      break;
    }

    // ── Crafting station verbs (Spec §22.1, §22.2) ─────────────────────────

    case "COOK": {
      // Verify the entity is a valid, lit campfire before opening UI.
      const campfireCheck = resolveCampfireInteraction(ctx.entity as unknown);
      if (!campfireCheck.isCampfire) return false;
      if (!campfireCheck.canCookNow) {
        // Campfire is unlit — still "succeed" so the caller shows "Light Campfire"
        store.setActiveCraftingStation(null);
        success = true;
        break;
      }
      store.setActiveCraftingStation({
        type: "cooking",
        entityId: ctx.entity?.id ?? "",
      });
      success = true;
      break;
    }

    case "FORGE": {
      // Verify the entity is a valid, active forge before opening UI.
      const forgeCheck = resolveForgeInteraction(ctx.entity as unknown);
      if (!forgeCheck.isForge) return false;
      if (!forgeCheck.canForgeNow) {
        store.setActiveCraftingStation(null);
        success = true;
        break;
      }
      store.setActiveCraftingStation({
        type: "forging",
        entityId: ctx.entity?.id ?? "",
      });
      success = true;
      break;
    }

    // ── Mining (Spec §22) ──────────────────────────────────────────────────

    case "MINE": {
      if (!ctx.entity) return false;
      const miningCheck = resolveMiningInteraction(ctx.entity as unknown);
      if (!miningCheck.isRock) return false;

      // Deduct stamina for the mine hit
      const staminaCost = miningCheck.staminaCost;
      if (store.stamina < staminaCost) return false;
      store.setStamina(store.stamina - staminaCost);

      // Determine ore yield using seeded RNG
      const biome = (ctx.biome ?? "starting-grove") as BiomeType;
      const rngFn = scopedRNG("mine", store.worldSeed, ctx.entity.id ?? "");
      const result = mineRock({ rockType: miningCheck.rockType } as RockComponent, biome, rngFn());

      // Credit ore to inventory
      store.addResource(result.oreType as ResourceType, result.amount);
      store.incrementToolUse("pick");
      success = true;
      break;
    }

    // ── Fishing (Spec §22) ─────────────────────────────────────────────────

    case "FISH": {
      // Verify the targeted water body is fishable
      const waterType = ctx.waterBodyType ?? "";
      if (!isWaterFishable(waterType)) return false;

      // Open the fishing minigame panel in the store
      store.setActiveCraftingStation({
        type: "fishing",
        entityId: ctx.entity?.id ?? "",
      });
      success = true;
      break;
    }

    // ── Traps (Spec §22) ───────────────────────────────────────────────────

    case "PLACE_TRAP": {
      if (ctx.gridX === undefined || ctx.gridZ === undefined || !ctx.trapType) return false;

      // Create the trap component (pure function validates trapType)
      try {
        createTrapComponent(ctx.trapType);
      } catch {
        return false;
      }

      // Signal the store/ECS to spawn a trap entity at this position.
      // The store action is injected here; ECS entity creation happens in the
      // game loop's structure placement handler.
      (store as unknown as { placeTrap?: (t: string, x: number, z: number) => void }).placeTrap?.(
        ctx.trapType,
        ctx.gridX,
        ctx.gridZ,
      );
      success = true;
      break;
    }

    case "CHECK_TRAP": {
      if (!ctx.entity?.id) return false;
      // Signal the store to collect/inspect this trap entity.
      (store as unknown as { collectTrap?: (id: string) => void }).collectTrap?.(ctx.entity.id);
      success = true;
      break;
    }

    // ── Kitbash build mode (Spec §35) ──────────────────────────────────────

    case "BUILD": {
      store.setActiveCraftingStation({
        type: "kitbash",
        entityId: "",
      });
      success = true;
      break;
    }

    // ── Player melee attack (Spec §34.4) ───────────────────────────────────

    case "ATTACK": {
      if (!ctx.entity?.id) return false;

      // Find the target enemy entity in ECS
      let targetEnemy: Entity | null = null;
      for (const e of enemiesQuery) {
        if (e.id === ctx.entity.id) {
          targetEnemy = e;
          break;
        }
      }
      if (!targetEnemy?.health) return false;

      // Resolve difficulty multiplier for damage scaling (Spec §34.4.3)
      const diffConfig = getDifficultyById(store.difficulty);
      const damageMultiplier = diffConfig?.damageMultiplier ?? 1.0;

      // Build a minimal player CombatComponent from ECS playerQuery, or use a
      // session-local fallback ref if the player entity has no combat component yet.
      // This ref is managed by the dispatchAction module scope.
      const activeCombat = _playerCombatRef;

      const result = executePlayerAttack({
        toolId: ctx.toolId,
        damageMultiplier,
        stamina: store.stamina,
        maxStamina: store.maxStamina,
        targetHealth: targetEnemy.health,
        playerCombat: activeCombat,
      });

      if (!result.hit) return false;

      // Deduct stamina from store (executePlayerAttack validated it; deduct here)
      if (result.staminaCost > 0) {
        store.setStamina(Math.max(0, store.stamina - result.staminaCost));
      }

      // Signal the swing animation counter (Spec §34.4.5).
      _bumpAttackTrigger();

      success = true;
      break;
    }
  }

  if (success) {
    void triggerActionHaptic(action as unknown as ToolAction);
    // Play tool SFX for each action (Spec §27, §11).
    switch (action) {
      case "PLANT":
        audioManager.playSound("plant");
        break;
      case "CHOP":
        audioManager.playSound("chop");
        audioManager.playSound("harvest");
        break;
      case "WATER":
        audioManager.playSound("water");
        break;
      case "DIG":
        audioManager.playSound("dig");
        break;
      case "PRUNE":
        audioManager.playSound("prune");
        break;
      case "FERTILIZE":
        audioManager.playSound("plant");
        break;
      case "MINE":
        audioManager.playSound("harvest");
        break;
      case "BUILD":
        audioManager.playSound("build");
        break;
      case "ATTACK":
        audioManager.playSound("chop");
        break;
    }
  } else if (action !== null) {
    // Notify the player that the action was resolved but failed execution.
    audioManager.playSound("error");
  }

  return success;
}
